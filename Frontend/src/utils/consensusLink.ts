const CONSENSUS_LINK_RE = /^https?:\/\/[^\s/]+\/consensus\/([a-f0-9]{24})$/;

export function buildConsensusLink(eventId: string): string {
  return `${window.location.origin}/consensus/${eventId}`;
}

// Only matches when the ENTIRE line is a consensus link (as produced by
// buildConsensusLink), so ordinary chat text can never be misdetected.
export function extractConsensusLinkId(line: string): string | null {
  const match = CONSENSUS_LINK_RE.exec(line.trim());
  return match ? match[1] : null;
}
