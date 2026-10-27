export type SwipeAxis = "pending" | "horizontal" | "ignored";
export const REPLY_SWIPE_THRESHOLD = 64;

export function replySwipe(axis: SwipeAxis, dx: number, dy: number) {
  if (axis === "pending" && Math.max(Math.abs(dx), Math.abs(dy)) >= 10) {
    axis = dx > 0 && dx > Math.abs(dy) * 1.3 ? "horizontal" : "ignored";
  }
  if (axis === "horizontal" && Math.abs(dy) > Math.max(24, Math.abs(dx))) axis = "ignored";
  const offset = axis === "horizontal" ? Math.max(0, Math.min(88, dx * 0.72)) : 0;
  return { axis, offset, ready: axis === "horizontal" && offset >= REPLY_SWIPE_THRESHOLD };
}
