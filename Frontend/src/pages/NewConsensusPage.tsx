import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import './ConsensusPage.css';
import './NewConsensusPage.css';

const FAMOUS_COMPANIES = [
  { company: 'Adobe', ticker: 'ADBE' },
  { company: 'Airbus', ticker: 'AIR' },
  { company: 'Alphabet', ticker: 'GOOGL' },
  { company: 'Amazon', ticker: 'AMZN' },
  { company: 'AMD', ticker: 'AMD' },
  { company: 'Apple', ticker: 'AAPL' },
  { company: 'ASML', ticker: 'ASML' },
  { company: 'Berkshire Hathaway', ticker: 'BRK.B' },
  { company: 'Boeing', ticker: 'BA' },
  { company: 'Broadcom', ticker: 'AVGO' },
  { company: 'Coca-Cola', ticker: 'KO' },
  { company: 'Disney', ticker: 'DIS' },
  { company: 'Intel', ticker: 'INTC' },
  { company: 'JPMorgan Chase', ticker: 'JPM' },
  { company: 'LVMH', ticker: 'MC' },
  { company: 'Mastercard', ticker: 'MA' },
  { company: 'Meta', ticker: 'META' },
  { company: 'Microsoft', ticker: 'MSFT' },
  { company: 'Netflix', ticker: 'NFLX' },
  { company: 'Novo Nordisk', ticker: 'NVO' },
  { company: 'NVIDIA', ticker: 'NVDA' },
  { company: 'PepsiCo', ticker: 'PEP' },
  { company: 'Salesforce', ticker: 'CRM' },
  { company: 'Shopify', ticker: 'SHOP' },
  { company: 'Tesla', ticker: 'TSLA' },
  { company: 'Visa', ticker: 'V' },
  { company: 'Walmart', ticker: 'WMT' },
];

const OTHER_VALUE = '__other__';

// endQuarter = the calendar quarter by which this period has fully concluded —
// used to filter out periods that have already passed (H1 ends alongside Q2,
// H2 ends alongside Q4).
const PERIODS = [
  { value: 'Q1', endQuarter: 1 },
  { value: 'Q2', endQuarter: 2 },
  { value: 'Q3', endQuarter: 3 },
  { value: 'Q4', endQuarter: 4 },
  { value: 'H1', endQuarter: 2 },
  { value: 'H2', endQuarter: 4 },
];
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_QUARTER = Math.ceil((new Date().getMonth() + 1) / 3);
const YEARS = [CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

const TODAY = new Date().toISOString().slice(0, 10);

const DEFAULT_METRICS = [
  { label: 'Revenue', unit: '$B' },
  { label: 'EPS', unit: '$' },
  { label: 'Gross Margin', unit: '%' },
];

interface MetricRow {
  label: string;
  unit: string;
}

export default function NewConsensusPage() {
  const navigate = useNavigate();

  const [companyChoice, setCompanyChoice] = useState(FAMOUS_COMPANIES[0].company);
  const [customCompany, setCustomCompany] = useState('');
  const [customTicker,  setCustomTicker]  = useState('');
  const [periodChoice, setPeriodChoice] = useState(`Q${CURRENT_QUARTER}`);
  const [year,    setYear]    = useState(String(CURRENT_YEAR));
  const [eventDate, setEventDate] = useState('');
  const [metrics, setMetrics] = useState<MetricRow[]>(DEFAULT_METRICS.map(m => ({ ...m })));
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const isOther = companyChoice === OTHER_VALUE;

  const handleMetricChange = (i: number, field: keyof MetricRow, value: string) => {
    setMetrics(prev => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  };

  const addMetric = () => setMetrics(prev => [...prev, { label: '', unit: '' }]);
  const removeMetric = (i: number) => setMetrics(prev => prev.filter((_, idx) => idx !== i));

  const minQuarterFor = (y: number) => (y === CURRENT_YEAR ? CURRENT_QUARTER : 1);
  const availablePeriods = PERIODS.filter(p => p.endQuarter >= minQuarterFor(Number(year)));

  const handleYearChange = (v: string) => {
    setYear(v);
    setPeriodChoice(`Q${minQuarterFor(Number(v))}`);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const company = isOther ? customCompany.trim() : companyChoice;
    const ticker  = isOther ? customTicker.trim().toUpperCase() : FAMOUS_COMPANIES.find(c => c.company === companyChoice)!.ticker;

    if (!company || !ticker) { setError('Company and ticker are required.'); return; }
    if (!eventDate) { setError('Please pick an expected report date.'); return; }
    if (eventDate < TODAY) { setError('Expected report date cannot be in the past.'); return; }

    // The report date should land within a realistic window after the period
    // actually concludes — catches mismatches like picking "Q3 2026" but
    // leaving the date picker on some day in 2027.
    const endQuarter = PERIODS.find(p => p.value === periodChoice)!.endQuarter;
    const periodEnd = new Date(Date.UTC(Number(year), endQuarter * 3, 0));
    const maxReportDate = new Date(periodEnd.getTime() + 120 * 86400000);
    const eventDateObj = new Date(eventDate);
    if (eventDateObj < periodEnd || eventDateObj > maxReportDate) {
      const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
      setError(
        `The expected report date doesn't line up with ${periodChoice} ${year}. That period concludes on ${fmt(periodEnd)}, and results are typically reported within a few months afterward — not on ${fmt(eventDateObj)}. Please adjust the period or the report date so they're consistent.`,
      );
      return;
    }

    const cleanMetrics = metrics
      .map(m => ({ label: m.label.trim(), unit: m.unit.trim() }))
      .filter(m => m.label && m.unit);
    if (cleanMetrics.length === 0) { setError('At least one metric (label + unit) is required.'); return; }

    setLoading(true);
    try {
      await api.post('/consensus', {
        company,
        ticker,
        period: `${periodChoice} ${year}`,
        eventDate,
        metrics: cleanMetrics,
      });
      navigate('/consensus');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create consensus');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="csp-page">
      <button type="button" className="csp-back-link" onClick={() => navigate('/consensus')}>
        ← Back to Consensus
      </button>

      <div className="csp-header">
        <h2 className="csp-title">New Consensus</h2>
        <p className="csp-subtitle">Create a forecast event for the community to weigh in on</p>
      </div>

      <form className="ncp-form" onSubmit={handleSubmit}>
        <div className="ncp-field">
          <label className="ncp-label">Company</label>
          <select
            className="ncp-select"
            value={companyChoice}
            onChange={e => setCompanyChoice(e.target.value)}
          >
            {FAMOUS_COMPANIES.map(c => (
              <option key={c.company} value={c.company}>{c.company} ({c.ticker})</option>
            ))}
            <option value={OTHER_VALUE}>Other (not listed)…</option>
          </select>
        </div>

        {isOther && (
          <div className="ncp-row">
            <div className="ncp-field">
              <label className="ncp-label">Company name</label>
              <input
                className="ncp-input"
                value={customCompany}
                onChange={e => setCustomCompany(e.target.value)}
                placeholder="e.g. Palantir"
              />
            </div>
            <div className="ncp-field">
              <label className="ncp-label">Ticker</label>
              <input
                className="ncp-input"
                value={customTicker}
                onChange={e => setCustomTicker(e.target.value)}
                placeholder="e.g. PLTR"
              />
            </div>
          </div>
        )}

        <div className="ncp-row">
          <div className="ncp-field">
            <label className="ncp-label">Period</label>
            <select className="ncp-select" value={periodChoice} onChange={e => setPeriodChoice(e.target.value)}>
              {availablePeriods.map(p => <option key={p.value} value={p.value}>{p.value}</option>)}
            </select>
          </div>
          <div className="ncp-field">
            <label className="ncp-label">Year</label>
            <select className="ncp-select" value={year} onChange={e => handleYearChange(e.target.value)}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="ncp-field">
            <label className="ncp-label">Expected report date</label>
            <input
              type="date"
              className="ncp-input"
              value={eventDate}
              min={TODAY}
              onChange={e => setEventDate(e.target.value)}
            />
          </div>
        </div>

        <div className="ncp-field">
          <label className="ncp-label">Metrics to forecast</label>
          <div className="ncp-metrics">
            {metrics.map((m, i) => (
              <div key={i} className="ncp-metric-row">
                <input
                  className="ncp-input"
                  placeholder="Label, e.g. Revenue"
                  value={m.label}
                  onChange={e => handleMetricChange(i, 'label', e.target.value)}
                />
                <input
                  className="ncp-input ncp-input-unit"
                  placeholder="Unit, e.g. $B"
                  value={m.unit}
                  onChange={e => handleMetricChange(i, 'unit', e.target.value)}
                />
                <button
                  type="button"
                  className="ncp-metric-remove"
                  onClick={() => removeMetric(i)}
                  disabled={metrics.length === 1}
                  title="Remove metric"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="ncp-add-metric" onClick={addMetric}>
            + Add metric
          </button>
        </div>

        {error && <div className="ncp-error">{error}</div>}

        <button type="submit" className="ncp-submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create Consensus'}
        </button>
      </form>
    </div>
  );
}
