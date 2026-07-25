import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import ConsensusEventCard, { type EventDetail } from "../components/consensus/ConsensusEventCard";
import "./ConsensusPage.css";

export default function ConsensusDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/consensus/${eventId}`)
      .then((d: EventDetail) => setDetail(d))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <div className="csp-status">Loading…</div>;

  if (notFound || !detail) {
    return (
      <div className="csp-page">
        <button type="button" className="csp-back-link" onClick={() => navigate("/consensus")}>
          ← Back to Consensus
        </button>
        <div className="csp-status">This consensus poll doesn't exist or was deleted.</div>
      </div>
    );
  }

  return (
    <div className="csp-page">
      <button type="button" className="csp-back-link" onClick={() => navigate("/consensus")}>
        ← Back to Consensus
      </button>

      <div className="csp-list">
        <ConsensusEventCard
          ev={detail.event}
          initialOpen
          initialDetail={detail}
          onDelete={() => navigate("/consensus")}
        />
      </div>
    </div>
  );
}
