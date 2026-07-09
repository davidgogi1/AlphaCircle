import { Request, Response } from 'express';
import ConsensusEvent  from '../models/ConsensusEvent';
import ConsensusForecast from '../models/ConsensusForecast';

export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await ConsensusEvent.find().sort({ eventDate: 1 }).lean();

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
    const event = await ConsensusEvent.findById(req.params.id).lean();
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

export const submitForecast = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await ConsensusEvent.findById(req.params.id).lean();
    if (!event) { res.status(404).json({ message: 'Event not found' }); return; }

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
