import { useEffect, useState } from "react";
import { api } from "../api";
import "./ConsensusPage.css";

interface MetricDef {
  key: string;
  label: string;
  unit: string;
  description?: string;
}

interface ConsensusEvent {
  _id: string;
  company: string;
  ticker: string;
  period: string;
  eventType: string;
  eventDate: string;
  metrics: MetricDef[];
  forecasterCount: number;
}

interface MetricStat {
  avg: number;
  min: number;
  max: number;
  count: number;
}

interface EventDetail {
  event: ConsensusEvent;
  consensus: Record<string, MetricStat>;
  myValues: Record<string, number>;
  forecasterCount: number;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days}d`;
}

export default function ConsensusPage() {
  const [events, setEvents] = useState<ConsensusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, EventDetail>>({});
  const [inputs, setInputs] = useState<Record<string, Record<string, string>>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitMsg, setSubmitMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .get("/consensus")
      .then((d) => setEvents(d.events))
      .finally(() => setLoading(false));
  }, []);

  const handleExpand = async (ev: ConsensusEvent) => {
    if (expanded === ev._id) {
      setExpanded(null);
      return;
    }
    setExpanded(ev._id);
    if (!details[ev._id]) {
      const d: EventDetail = await api.get(`/consensus/${ev._id}`);
      setDetails((prev) => ({ ...prev, [ev._id]: d }));
      if (Object.keys(d.myValues).length > 0) {
        setInputs((prev) => ({
          ...prev,
          [ev._id]: Object.fromEntries(
            Object.entries(d.myValues).map(([k, v]) => [k, String(v)])
          ),
        }));
      }
    }
  };

  const handleInput = (eventId: string, key: string, val: string) => {
    setInputs((prev) => ({
      ...prev,
      [eventId]: { ...(prev[eventId] ?? {}), [key]: val },
    }));
  };

  const handleSubmit = async (ev: ConsensusEvent) => {
    const rawInputs = inputs[ev._id] ?? {};
    const values: Record<string, number> = {};
    for (const m of ev.metrics) {
      const v = parseFloat(rawInputs[m.key] ?? "");
      if (!isNaN(v)) values[m.key] = v;
    }
    if (Object.keys(values).length === 0) return;

    setSubmitting(ev._id);
    try {
      await api.post(`/consensus/${ev._id}`, { values });
      const d: EventDetail = await api.get(`/consensus/${ev._id}`);
      setDetails((prev) => ({ ...prev, [ev._id]: d }));
      setEvents((prev) =>
        prev.map((e) =>
          e._id === ev._id ? { ...e, forecasterCount: d.forecasterCount } : e,
        ),
      );
      setSubmitMsg((prev) => ({ ...prev, [ev._id]: "Forecast saved." }));
      setTimeout(
        () => setSubmitMsg((prev) => ({ ...prev, [ev._id]: "" })),
        3000,
      );
    } catch {
      setSubmitMsg((prev) => ({ ...prev, [ev._id]: "Failed to save." }));
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <div className="csp-status">Loading…</div>;

  return (
    <div className="csp-page">
      <div className="csp-header">
        <h2 className="csp-title">BuySide Consensus</h2>
        <p className="csp-subtitle">
          Submit your earnings forecasts and see where the community stands
        </p>
      </div>

      <div className="csp-list">
        {events.map((ev) => {
          const days = daysUntil(ev.eventDate);
          const isOpen = expanded === ev._id;
          const detail = details[ev._id];
          const myInputs = inputs[ev._id] ?? {};
          const hasMyForecast =
            detail && Object.keys(detail.myValues).length > 0;

          return (
            <div
              key={ev._id}
              className={`csp-card${isOpen ? " csp-card--open" : ""}`}
            >
              <button
                type="button"
                className="csp-card-header"
                onClick={() => handleExpand(ev)}
              >
                <span className="csp-ticker">{ev.ticker}</span>

                <div className="csp-card-info">
                  <div className="csp-card-top">
                    <span className="csp-company">{ev.company}</span>
                    <span className="csp-period">{ev.period}</span>
                    <span className="csp-event-type">{ev.eventType}</span>
                  </div>
                  <div className="csp-card-bottom">
                    <span className="csp-date">{formatDate(ev.eventDate)}</span>
                    <span
                      className={`csp-days${days < 0 ? " csp-days--past" : days <= 7 ? " csp-days--soon" : ""}`}
                    >
                      {daysLabel(days)}
                    </span>
                    <span className="csp-forecasters">
                      {ev.forecasterCount} analyst
                      {ev.forecasterCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <span
                  className={`csp-chevron${isOpen ? " csp-chevron--open" : ""}`}
                >
                  ›
                </span>
              </button>

              {isOpen && (
                <div className="csp-detail">
                  {!detail ? (
                    <div className="csp-detail-loading">Loading…</div>
                  ) : (
                    <>
                      {hasMyForecast && (
                        <div className="csp-already-voted">
                          ✓ You have an existing forecast — your numbers are pre-filled below
                        </div>
                      )}
                      <div className="csp-metrics-table">
                        <div className="csp-metrics-head">
                          <span>Metric</span>
                          <span className="csp-col-num">Min</span>
                          <span className="csp-col-num csp-col-avg">Avg</span>
                          <span className="csp-col-num">Max</span>
                          <span className="csp-col-num">Analysts</span>
                          <span className="csp-col-input">Your Forecast</span>
                        </div>

                        {ev.metrics.map((m) => {
                          const stat = detail.consensus[m.key];
                          const hasData = stat && stat.count > 0;

                          return (
                            <div key={m.key} className="csp-metric-row">
                              <div className="csp-metric-label">
                                <span className="csp-metric-name">
                                  {m.label}
                                </span>
                                <span className="csp-metric-unit">{m.unit}</span>
                              </div>

                              <span className="csp-col-num csp-stat-dim">
                                {hasData ? stat.min : "—"}
                              </span>
                              <span className="csp-col-num csp-stat-avg">
                                {hasData ? stat.avg : "—"}
                              </span>
                              <span className="csp-col-num csp-stat-dim">
                                {hasData ? stat.max : "—"}
                              </span>
                              <span className="csp-col-num csp-stat-dim">
                                {hasData ? stat.count : "—"}
                              </span>

                              <div className="csp-col-input csp-input-wrap">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="csp-input"
                                  placeholder="—"
                                  value={myInputs[m.key] ?? ""}
                                  onChange={(e) =>
                                    handleInput(ev._id, m.key, e.target.value)
                                  }
                                />
                                <span className="csp-input-unit">{m.unit}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="csp-submit-row">
                        {submitMsg[ev._id] && (
                          <span
                            className={`csp-submit-msg${submitMsg[ev._id].includes("Failed") ? " csp-submit-msg--err" : ""}`}
                          >
                            {submitMsg[ev._id]}
                          </span>
                        )}
                        <button
                          type="button"
                          className="csp-submit-btn"
                          disabled={submitting === ev._id}
                          onClick={() => handleSubmit(ev)}
                        >
                          {submitting === ev._id
                            ? "Saving…"
                            : hasMyForecast
                              ? "Update Forecast"
                              : "Submit Forecast"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
