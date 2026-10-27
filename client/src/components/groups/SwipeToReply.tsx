import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Reply } from "lucide-react";
import { replySwipe, REPLY_SWIPE_THRESHOLD, type SwipeAxis } from "@/lib/swipe-reply";

type Props = {
  children: ReactNode;
  className: string;
  bubbleClassName: string;
  disabled: boolean;
  onReply: () => void;
};

export default function SwipeToReply({ children, className, bubbleClassName, disabled, onReply }: Props) {
  const gesture = useRef<{ id: number; x: number; y: number; axis: SwipeAxis } | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const reset = () => { gesture.current = null; setOffset(0); setDragging(false); };
  useEffect(() => { if (disabled) reset(); }, [disabled]);

  const start = (event: PointerEvent<HTMLElement>) => {
    // Preserve desktop text selection, browser scrolling and all message controls.
    if (disabled || event.pointerType === "mouse" || !event.isPrimary ||
      (event.target as Element).closest("button,a,input,textarea,[role=button]")) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: "pending" };
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const next = replySwipe(current.axis, event.clientX - current.x, event.clientY - current.y);
    current.axis = next.axis;
    if (next.axis !== "horizontal") return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    if (event.cancelable) event.preventDefault();
    setDragging(true);
    setOffset(next.offset);
  };
  const finish = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const next = replySwipe(current.axis, event.clientX - current.x, event.clientY - current.y);
    reset();
    if (next.ready && !disabled) onReply();
  };

  return (
    <div className={`relative ${className}`}>
      <div aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-2 flex items-center ${offset >= REPLY_SWIPE_THRESHOLD ? "text-teal-700" : "text-slate-400"}`}
        style={{ opacity: Math.min(1, offset / REPLY_SWIPE_THRESHOLD) }}>
        <span className={`grid h-9 w-9 place-items-center rounded-full ${offset >= REPLY_SWIPE_THRESHOLD ? "bg-teal-100" : "bg-slate-100"}`}><Reply className="h-5 w-5" /></span>
      </div>
      <article className={`group relative transition-transform duration-200 ease-out motion-reduce:transition-none ${bubbleClassName}`}
        style={{ touchAction: "pan-y pinch-zoom", transform: `translate3d(${offset}px,0,0)`, transition: dragging ? "none" : undefined }}
        onPointerDown={start} onPointerMove={move} onPointerUp={finish}
        onPointerCancel={reset} onLostPointerCapture={reset}>
        {children}
      </article>
    </div>
  );
}
