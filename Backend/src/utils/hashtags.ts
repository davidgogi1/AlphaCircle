const HASHTAG_RE = /#(\w+)/g;

export function extractHashtags(text: string): string[] {
  const tags = new Set<string>();
  for (const match of text.matchAll(HASHTAG_RE)) {
    tags.add(match[1].toLowerCase());
  }
  return [...tags];
}
