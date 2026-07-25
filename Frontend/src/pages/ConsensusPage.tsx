import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import ConsensusEventCard, { daysUntil, type ConsensusEvent } from "../components/consensus/ConsensusEventCard";
import "./ConsensusPage.css";

export default function ConsensusPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<ConsensusEvent[]>([]);
  const [loading, setLoading] = useState(true);

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

  const upcoming = events.filter((ev) => daysUntil(ev.eventDate) >= 0);
  const pastCount = events.filter((ev) => daysUntil(ev.eventDate) < 0).length;

  return (
    <div className="csp-page">
      <div className="csp-header csp-header-row">
        <div>
          <h2 className="csp-title">BuySide Consensus</h2>
          <p className="csp-subtitle">
            Submit your earnings forecasts and see where the community stands
          </p>
        </div>
        <button type="button" className="csp-new-btn" onClick={() => navigate("/consensus/new")}>
          + New Consensus
        </button>
      </div>

      {pastCount > 0 && (
        <button
          type="button"
          className="csp-past-toggle"
          onClick={() => navigate("/consensus/past")}
        >
          Past Events ({pastCount})
        </button>
      )}

      <div className="csp-list">
        {upcoming.map((ev) => (
          <ConsensusEventCard key={ev._id} ev={ev} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
