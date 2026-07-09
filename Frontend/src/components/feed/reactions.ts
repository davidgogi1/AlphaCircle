export const REACTIONS = [
  { type: 'like',  emoji: '👍', label: 'Like'  },
  { type: 'love',  emoji: '❤️', label: 'Love'  },
  { type: 'haha',  emoji: '😂', label: 'Haha'  },
  { type: 'wow',   emoji: '😮', label: 'Wow'   },
  { type: 'sad',   emoji: '😢', label: 'Sad'   },
  { type: 'angry', emoji: '😡', label: 'Angry' },
] as const;

export type ReactionType = typeof REACTIONS[number]['type'];

export const EMOJI: Record<string, string> = Object.fromEntries(
  REACTIONS.map(r => [r.type, r.emoji])
);
