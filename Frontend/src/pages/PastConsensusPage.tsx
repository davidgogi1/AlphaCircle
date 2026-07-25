import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import ConsensusEventCard, { daysUntil, type ConsensusEvent } from "../components/consensus/ConsensusEventCard";
import "./ConsensusPage.css";

const PAGE_SIZE = 10;

export default function PastConsensusPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<ConsensusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api
      .get("/consensus")
      .then((d) => setEvents(d.events))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e._id !== eventId));
  };

  if (loading) return <div className="csp-status">Loading…</div>;

  const past = events
    .filter((ev) => daysUntil(ev.eventDate) < 0)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  const totalPages = Math.max(1, Math.ceil(past.length / PAGE_SIZE));
  const paged = past.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="csp-page">
      <button type="button" className="csp-back-link" onClick={() => navigate("/consensus")}>
        ← Back to Consensus
      </button>

      <div className="csp-header">
        <h2 className="csp-title">Past Events</h2>
        <p className="csp-subtitle">Consensus events whose due date has already passed</p>
      </div>

      {past.length === 0 ? (
        <div className="csp-status">No past events yet.</div>
      ) : (
        <>
          <div className="csp-list">
            {paged.map((ev) => (
              <ConsensusEventCard key={ev._id} ev={ev} onDelete={handleDelete} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="csp-pagination">
              <button
                type="button"
                className="csp-page-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹ Prev
              </button>
              <span className="csp-page-info">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="csp-page-btn"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
