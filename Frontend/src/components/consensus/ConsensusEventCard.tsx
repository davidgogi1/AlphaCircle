import { useState, type MouseEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../api";
import ShareConsensusModal from "./ShareConsensusModal";
import { buildConsensusLink } from "../../utils/consensusLink";
import "./ConsensusEventCard.css";

export interface MetricDef {
  key: string;
  label: string;
  unit: string;
  description?: string;
}

export interface ConsensusEvent {
  _id: string;
  company: string;
  ticker: string;
  period: string;
  eventType: string;
  eventDate: string;
  metrics: MetricDef[];
  forecasterCount: number;
  author?: { _id: string; username: string };
}

export interface MetricStat {
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface EventDetail {
  event: ConsensusEvent;
  consensus: Record<string, MetricStat>;
  myValues: Record<string, number>;
  forecasterCount: number;
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Event dates are stored as UTC midnight for a plain calendar date (no real
  // time-of-day meaning) — read the UTC Y/M/D back out and rebuild it as a
  // *local* midnight so the comparison is stable across viewer timezones.
  // Naively new Date(dateStr) + setHours(0,0,0,0) shifts the calendar day
  // backward by one for anyone west of UTC (e.g. all of the Americas).
  const d = new Date(dateStr);
  const target = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days}d`;
}

interface Props {
  ev: ConsensusEvent;
  onForecasterCountChange?: (eventId: string, count: number) => void;
  onDelete?: (eventId: string) => void;
  initialOpen?: boolean;
  initialDetail?: EventDetail;
}

export default function ConsensusEventCard({ ev, onForecasterCountChange, onDelete, initialOpen, initialDetail }: Props) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(!!initialOpen);
  const [detail, setDetail] = useState<EventDetail | null>(initialDetail ?? null);
  const [inputs, setInputs] = useState<Record<string, string>>(
    initialDetail && Object.keys(initialDetail.myValues).length > 0
      ? Object.fromEntries(Object.entries(initialDetail.myValues).map(([k, v]) => [k, String(v)]))
      : {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async (e: MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(buildConsensusLink(ev._id));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const days = daysUntil(ev.eventDate);
  const isClosed = days < 0;
  const hasMyForecast = detail != null && Object.keys(detail.myValues).length > 0;
  const isAuthor = !!user && !!ev.author && user.id === ev.author._id;

  const handleExpand = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    if (!detail) {
      api.get(`/consensus/${ev._id}`).then((d: EventDetail) => {
        setDetail(d);
        if (Object.keys(d.myValues).length > 0) {
          setInputs(Object.fromEntries(Object.entries(d.myValues).map(([k, v]) => [k, String(v)])));
        }
      });
    }
  };

  const handleInput = (key: string, val: string) => {
    setInputs((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async () => {
    const values: Record<string, number> = {};
    for (const m of ev.metrics) {
      const v = parseFloat(inputs[m.key] ?? "");
      if (!isNaN(v)) values[m.key] = v;
    }
    if (Object.keys(values).length === 0) return;

    setSubmitting(true);
    try {
      await api.post(`/consensus/${ev._id}`, { values });
      const d: EventDetail = await api.get(`/consensus/${ev._id}`);
      setDetail(d);
      onForecasterCountChange?.(ev._id, d.forecasterCount);
      setSubmitMsg("Forecast saved.");
      setTimeout(() => setSubmitMsg(""), 3000);
    } catch {
      setSubmitMsg("Failed to save.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/consensus/${ev._id}`);
      onDelete?.(ev._id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`csp-card${isOpen ? " csp-card--open" : ""}`}>
      <div
        className="csp-card-header"
        role="button"
        tabIndex={0}
        onClick={handleExpand}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleExpand(); }}
      >
        <span className="csp-ticker">{ev.ticker}</span>

        <div className="csp-card-info">
          <div className="csp-card-top">
            <span className="csp-company">{ev.company}</span>
            <span className="csp-period">{ev.period}</span>
            <span className="csp-event-type">{ev.eventType}</span>
            {ev.author && <span className="csp-author">by {ev.author.username}</span>}
          </div>
          <div className="csp-card-bottom">
            <span className="csp-date">{formatDate(ev.eventDate)}</span>
            <span className={`csp-days${days < 0 ? " csp-days--past" : days <= 7 ? " csp-days--soon" : ""}`}>
              {daysLabel(days)}
            </span>
            <span className="csp-forecasters">
              {ev.forecasterCount} analyst
              {ev.forecasterCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="csp-copy-btn"
          title="Copy link to this consensus poll"
          onClick={handleCopyLink}
        >
          {copied ? "✓ Copied" : "🔗"}
        </button>

        <button
          type="button"
          className="csp-share-btn"
          title="Share this consensus poll"
          onClick={(e) => { e.stopPropagation(); setShowShare(true); }}
        >
          📤
        </button>

        {isAuthor && (
          confirmDelete ? (
            <div className="csp-confirm-row" onClick={(e) => e.stopPropagation()}>
              <span className="csp-confirm-text">Delete?</span>
              <button type="button" className="csp-confirm-yes" disabled={deleting} onClick={handleDelete}>
                {deleting ? "…" : "Yes"}
              </button>
              <button type="button" className="csp-confirm-no" onClick={() => setConfirmDelete(false)}>No</button>
            </div>
          ) : (
            <button
              type="button"
              className="csp-delete-btn"
              title="Delete consensus"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            >
              ✕
            </button>
          )
        )}

        <span className={`csp-chevron${isOpen ? " csp-chevron--open" : ""}`}>›</span>
      </div>

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
                        <span className="csp-metric-name">{m.label}</span>
                        <span className="csp-metric-unit">{m.unit}</span>
                      </div>

                      <span className="csp-col-num csp-stat-dim">{hasData ? stat.min : "—"}</span>
                      <span className="csp-col-num csp-stat-avg">{hasData ? stat.avg : "—"}</span>
                      <span className="csp-col-num csp-stat-dim">{hasData ? stat.max : "—"}</span>
                      <span className="csp-col-num csp-stat-dim">{hasData ? stat.count : "—"}</span>

                      <div className="csp-col-input csp-input-wrap">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="csp-input"
                          placeholder="—"
                          value={inputs[m.key] ?? ""}
                          onChange={(e) => handleInput(m.key, e.target.value)}
                          disabled={isClosed}
                        />
                        <span className="csp-input-unit">{m.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {isClosed ? (
                <div className="csp-closed-notice">
                  🔒 Forecasting is closed for this event. Its reporting date has passed, so new predictions can no
                  longer be accepted — consensus estimates are only meaningful before the outcome is known.
                </div>
              ) : (
                <div className="csp-submit-row">
                  {submitMsg && (
                    <span className={`csp-submit-msg${submitMsg.includes("Failed") ? " csp-submit-msg--err" : ""}`}>
                      {submitMsg}
                    </span>
                  )}
                  <button type="button" className="csp-submit-btn" disabled={submitting} onClick={handleSubmit}>
                    {submitting ? "Saving…" : hasMyForecast ? "Update Forecast" : "Submit Forecast"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showShare && <ShareConsensusModal ev={ev} onClose={() => setShowShare(false)} />}
    </div>
  );
}
