export const GROUP_REACTIONS = ["❤️", "🎉", "✅", "💰", "😍", "🤕", "🔥"] as const;
export type GroupReaction = typeof GROUP_REACTIONS[number];

export const GROUP_REACTION_LABELS: Record<GroupReaction, string> = {
  "❤️": "J’aime", "🎉": "Félicitations", "✅": "Validé", "💰": "Argent",
  "😍": "J’adore", "🤕": "Blessé", "🔥": "Excellent",
};

export function isGroupReaction(value: unknown): value is GroupReaction {
  return typeof value === "string" && (GROUP_REACTIONS as readonly string[]).includes(value);
}
