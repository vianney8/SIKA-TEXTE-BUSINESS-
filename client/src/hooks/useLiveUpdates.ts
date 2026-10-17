import { useEffect, useState } from "react";
import { queryClient } from "@/lib/queryClient";

export function refreshSite(configuration = false) {
  void queryClient.invalidateQueries({
    predicate: query => {
      const key = String(query.queryKey[0]);
      // Do not reset administrator edits after unrelated customer payments.
      if (key.startsWith("/api/admin/settings") || key.startsWith("/api/admin/payment-links")) return configuration;
      return !key.includes("/api/live-updates");
    },
  });
  window.dispatchEvent(new CustomEvent("sika:refresh", { detail: { configuration } }));
}

export function usePaymentRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const update = (event: Event) => {
      if ((event as CustomEvent).detail?.configuration) setRevision(value => value + 1);
    };
    window.addEventListener("sika:refresh", update);
    return () => window.removeEventListener("sika:refresh", update);
  }, []);
  return revision;
}

export default function useLiveUpdates() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let configuration = false;
    const updates = new EventSource("/api/live-updates");
    const receive = (event: MessageEvent) => {
      try { configuration ||= JSON.parse(event.data).scope === "configuration"; } catch { return; }
      clearTimeout(timer);
      timer = setTimeout(() => { refreshSite(configuration); configuration = false; }, 350);
    };
    const restore = () => refreshSite(true);
    const visible = () => { if (document.visibilityState === "visible") restore(); };
    updates.addEventListener("refresh", receive as EventListener);
    // Also reconcile after reconnect, including changes missed while offline.
    updates.addEventListener("open", restore);
    window.addEventListener("pageshow", restore);
    window.addEventListener("popstate", restore);
    document.addEventListener("visibilitychange", visible);
    // Cross-instance / unavailable SSE fallback; no polling hidden tabs.
    const fallback = setInterval(() => { if (!document.hidden) restore(); }, 30000);
    return () => {
      updates.close();
      clearTimeout(timer);
      clearInterval(fallback);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("popstate", restore);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
}
