import { Request, Response } from 'express';
import ConsensusEvent  from '../models/ConsensusEvent';
import ConsensusForecast from '../models/ConsensusForecast';

export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await ConsensusEvent.find()
      .populate('author', 'username')
      .sort({ eventDate: 1 })
      .lean();

    // Attach forecaster count to each event
    const counts = await ConsensusForecast.aggregate([
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.count; });

    const result = events.map(e => ({
      ...e,
      forecasterCount: countMap[e._id.toString()] ?? 0,
    }));

    res.json({ events: result });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getEventDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await ConsensusEvent.findById(req.params.id).populate('author', 'username').lean();
    if (!event) { res.status(404).json({ message: 'Event not found' }); return; }

    const forecasts = await ConsensusForecast.find({ event: event._id }).lean();

    // Build per-metric consensus stats
    const consensus: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    for (const metric of event.metrics) {
      const vals = forecasts
        .map(f => { const v = f.values as any; return v instanceof Map ? v.get(metric.key) : v?.[metric.key]; })
        .filter((v): v is number => v != null && !isNaN(v));

      if (vals.length === 0) {
        consensus[metric.key] = { avg: 0, min: 0, max: 0, count: 0 };
      } else {
        consensus[metric.key] = {
          avg:   Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100,
          min:   Math.round(Math.min(...vals) * 100) / 100,
          max:   Math.round(Math.max(...vals) * 100) / 100,
          count: vals.length,
        };
      }
    }

    // Current user's own forecast
    const myForecast = await ConsensusForecast.findOne({ event: event._id, user: req.userId }).lean();
    const myValues: Record<string, number> = {};
    if (myForecast) {
      const raw = myForecast.values as any;
      if (raw instanceof Map) {
        raw.forEach((v: number, k: string) => { myValues[k] = v; });
      } else {
        Object.assign(myValues, raw);
      }
    }

    res.json({ event, consensus, myValues, forecasterCount: forecasts.length });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { company, ticker, period, eventDate, metrics } = req.body;

    if (!company?.trim() || !ticker?.trim() || !period?.trim() || !eventDate) {
      res.status(400).json({ message: 'Company, ticker, period, and event date are required' });
      return;
    }
    const parsedDate = new Date(eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(parsedDate.getTime()) || parsedDate < today) {
      res.status(400).json({ message: 'Expected report date cannot be in the past' });
      return;
    }

    // Derive the event type from the period prefix rather than trusting
    // client-supplied eventType — Q-periods are quarterly earnings, H-periods
    // are half-year results (matches this app's existing data convention).
    const eventType = /^H[12]\b/i.test(period.trim()) ? 'Half-Year Results' : 'Earnings Release';

    const periodMatch = period.trim().match(/^([QH])([1-4])\s+(\d{4})$/i);
    if (periodMatch) {
      const letter = periodMatch[1].toUpperCase();
      const num    = Number(periodMatch[2]);
      const isValidCombo = letter === 'Q' || num === 1 || num === 2;
      if (isValidCombo) {
        // endQuarter = calendar quarter by which this period has concluded
        // (H1 ends alongside Q2, H2 ends alongside Q4).
        const endQuarter = letter === 'Q' ? num : (num === 1 ? 2 : 4);
        const periodYear = Number(periodMatch[3]);
        const nowMonth = today.getMonth() + 1;
        const currentQuarter = Math.ceil(nowMonth / 3);
        const currentYear = today.getFullYear();
        if (periodYear < currentYear || (periodYear === currentYear && endQuarter < currentQuarter)) {
          res.status(400).json({ message: 'Period cannot be in the past' });
          return;
        }

        // The report date should land within a realistic window after the
        // period actually concludes — companies report a few months out at
        // most (even Q4/H2, commonly reported early the following year).
        // Catches mismatches like "Q3 2026" paired with a report date in 2027.
        const endMonth = endQuarter * 3; // Q1→3(Mar), Q2→6(Jun), Q3→9(Sep), Q4→12(Dec)
        const periodEnd = new Date(Date.UTC(periodYear, endMonth, 0));
        const maxReportDate = new Date(periodEnd.getTime() + 120 * 86400000);
        if (parsedDate < periodEnd || parsedDate > maxReportDate) {
          const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
          res.status(400).json({
            message: `The expected report date doesn't line up with ${period.trim()}. That period concludes on ${fmt(periodEnd)}, and results are typically reported within a few months afterward — not on ${fmt(parsedDate)}. Please adjust the period or the report date so they're consistent.`,
          });
          return;
        }
      }
    }

    if (!Array.isArray(metrics)) {
      res.status(400).json({ message: 'At least one metric is required' });
      return;
    }

    const cleanMetrics: { key: string; label: string; unit: string }[] = [];
    const seenKeys = new Set<string>();
    for (const m of metrics) {
      const label = typeof m?.label === 'string' ? m.label.trim() : '';
      const unit  = typeof m?.unit  === 'string' ? m.unit.trim()  : '';
      if (!label || !unit) continue;

      let key = label.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'metric';
      let candidate = key;
      let i = 1;
      while (seenKeys.has(candidate)) candidate = `${key}${++i}`;
      seenKeys.add(candidate);

      cleanMetrics.push({ key: candidate, label, unit });
    }

    if (cleanMetrics.length === 0) {
      res.status(400).json({ message: 'At least one valid metric (label + unit) is required' });
      return;
    }

    const event = await ConsensusEvent.create({
      company:   company.trim(),
      ticker:    ticker.trim().toUpperCase(),
      period:    period.trim(),
      eventType,
      eventDate: new Date(eventDate),
      metrics:   cleanMetrics,
      author:    req.userId,
    });
    await event.populate('author', 'username');

    res.status(201).json({ event });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await ConsensusEvent.findById(req.params.id);
    if (!event) { res.status(404).json({ message: 'Event not found' }); return; }

    if (!event.author || event.author.toString() !== req.userId) {
      res.status(403).json({ message: 'Not authorised' });
      return;
    }

    await ConsensusForecast.deleteMany({ event: event._id });
    await event.deleteOne();

    res.json({ message: 'Consensus deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const submitForecast = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await ConsensusEvent.findById(req.params.id).lean();
    if (!event) { res.status(404).json({ message: 'Event not found' }); return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(event.eventDate) < today) {
      res.status(400).json({
        message: 'Forecasting is closed for this event. Its reporting date has passed, so new predictions can no longer be accepted — consensus estimates are only meaningful before the outcome is known.',
      });
      return;
    }

    const { values } = req.body as { values: Record<string, number> };
    if (!values || typeof values !== 'object') {
      res.status(400).json({ message: 'values object required' }); return;
    }

    // Validate keys match event metrics
    const validKeys = new Set(event.metrics.map(m => m.key));
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(values)) {
      if (validKeys.has(k) && typeof v === 'number' && !isNaN(v)) clean[k] = v;
    }

    await ConsensusForecast.findOneAndUpdate(
      { event: event._id, user: req.userId },
      { $set: { values: clean } },
      { upsert: true, new: true },
    );

    res.json({ message: 'Forecast saved' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
