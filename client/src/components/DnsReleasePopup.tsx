import { useEffect, useRef } from "react";
import { AlertTriangle, ArrowUpRight, X } from "lucide-react";
import type { DnsRelease } from "@shared/dns-version";

interface DnsReleasePopupProps {
  release: DnsRelease;
  installedVersion?: string | null;
  onDismiss: () => void;
  onUpdate: () => void;
}

export default function DnsReleasePopup({ release, installedVersion, onDismiss, onUpdate }: DnsReleasePopupProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const updateRef = useRef<HTMLButtonElement>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissRef.current();
      }
      if (event.key === "Tab" && event.shiftKey && document.activeElement === closeRef.current) {
        event.preventDefault();
        updateRef.current?.focus();
      } else if (event.key === "Tab" && !event.shiftKey && document.activeElement === updateRef.current) {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-[3px] sm:items-center sm:p-6"
      role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="dns-release-title" aria-describedby="dns-release-copy"
        className="w-full max-w-md animate-in fade-in slide-in-from-bottom-3 rounded-[26px] border border-amber-200 bg-[#fffdf7] p-5 shadow-[0_24px_80px_rgba(15,23,42,.28)] duration-300 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800">
            <AlertTriangle size={21} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-amber-800">Mise à jour requise</p>
            <h2 id="dns-release-title" className="mt-1 text-lg font-black leading-tight text-slate-950">Votre DNS a une nouvelle version</h2>
          </div>
          <button ref={closeRef} type="button" aria-label="Fermer l’annonce" onClick={onDismiss}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-amber-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Installée</p>
            <p className="mt-1 font-mono text-sm font-black text-amber-950">{installedVersion || "Version antérieure"}</p>
          </div>
          <div className="rounded-xl border border-teal-200 bg-teal-50/80 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Disponible</p>
            <p className="mt-1 font-mono text-sm font-black text-teal-950">{release.version}</p>
          </div>
        </div>
        <p id="dns-release-copy" className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">{release.message}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onDismiss}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
            OK, compris
          </button>
          <button ref={updateRef} type="button" onClick={onUpdate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
            Mettre à jour le DNS <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
