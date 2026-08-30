import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Copy, Upload, ImageIcon, CheckCircle,
  XCircle, AlertTriangle, Info, Loader2, Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { COUNTRIES, OPERATORS } from "@/pages/Activation";

// ─── Formulaire de paiement pour la mise à jour DNS ──────────────────────────
// Reprend exactement le même principe que le formulaire d'activation de
// compte : sélection pays/opérateur, numéro de dépôt lu en direct depuis les
// réglages admin, puis nom du payeur + ID de transaction + capture d'écran.
type DnsFormStep = "country" | "operator" | "phone" | "manual";

interface DepositInfo {
  depositNumber: string;
  amount: number;
  isInternational: boolean;
  alertText: string;
  depositLabel: string;
  instruction: string;
  showInstruction: boolean;
  internationalNote: string;
}

export default function DnsPaymentForm({
  onSubmitted, onCancel,
}: { onSubmitted: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<DnsFormStep>("country");
  const [country, setCountry] = useState("");
  const [operator, setOperator] = useState("");
  const [phone, setPhone] = useState("");
  const [payerName, setPayerName] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const selectedOp = OPERATORS[operator];

  const phonePlaceholder = country === "BJ" ? "01 23 45 67 89"
    : country === "CM" ? "6 12 34 56 78"
    : country === "CI" ? "05 12 34 56 78"
    : "01 23 45 67";

  useEffect(() => {
    if (step !== "manual" || !country || !operator) return;
    setDepositLoading(true);
    fetch(`/api/withdrawal/dns-manual-deposit-info?country=${country}&operator=${operator}`, { credentials: "include" })
      .then(r => r.json()).then(d => setDepositInfo(d)).catch(() => setDepositInfo(null)).finally(() => setDepositLoading(false));
  }, [step, country, operator]);

  useEffect(() => {
    if (!screenshotFile) { setScreenshotPreview(null); return; }
    const url = URL.createObjectURL(screenshotFile);
    setScreenshotPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshotFile]);

  const copyDepositNumber = async () => {
    if (!depositInfo?.depositNumber) return;
    try { await navigator.clipboard.writeText(depositInfo.depositNumber); toast({ title: "Numéro copié !" }); }
    catch { toast({ title: "Copié", description: depositInfo.depositNumber }); }
  };

  const handleSubmit = async () => {
    if (!payerName.trim() || payerName.trim().length < 3) {
      toast({ title: "Nom requis", description: "Veuillez saisir le nom et prénom de la carte SIM.", variant: "destructive" }); return;
    }
    if (!transactionId.trim()) {
      toast({ title: "Champ requis", description: "Veuillez saisir l'ID de transaction.", variant: "destructive" }); return;
    }
    if (!screenshotFile) {
      toast({ title: "Capture requise", description: "Veuillez joindre la capture d'écran.", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("country", country);
      form.append("operator", operator);
      form.append("phone", `+${selectedCountry?.prefix}${phone.replace(/\s/g, "")}`);
      form.append("payerName", payerName.trim());
      form.append("transactionId", transactionId.trim());
      form.append("screenshot", screenshotFile);
      const res = await fetch("/api/withdrawal/dns-manual-submit", { method: "POST", credentials: "include", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur de soumission");
      onSubmitted();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const HeaderBar = ({ onBack }: { onBack: () => void }) => (
    <div className="flex items-center gap-3 mb-5">
      <button onClick={onBack}
        className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 bg-white text-slate-600 shadow-sm active:scale-90 transition-all">
        <ChevronLeft size={18} />
      </button>
      <p className="text-slate-900 font-black text-sm">Mise à jour DNS — Paiement</p>
    </div>
  );

  // ── Étape 1 : Pays ──────────────────────────────────────────────────────
  if (step === "country") {
    return (
      <div className="space-y-3">
        <HeaderBar onBack={onCancel} />
        <p className="text-slate-600 text-xs font-bold uppercase tracking-widest mb-1">Choisissez votre pays</p>
        <div className="space-y-2.5">
          {COUNTRIES.map(c => (
            <button key={c.code} data-testid={`button-dns-country-${c.code}`}
              onClick={() => { setCountry(c.code); setOperator(""); setStep("operator"); }}
               className="w-full flex items-center justify-between rounded-2xl p-4 border border-slate-200 bg-white shadow-sm hover:border-teal-300 hover:bg-teal-50/50 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.flag}</span>
                 <span className="text-slate-800 font-bold text-sm">{c.name}</span>
              </div>
               <ChevronRight size={16} className="text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Étape 2 : Opérateur ─────────────────────────────────────────────────
  if (step === "operator") {
    return (
      <div className="space-y-3">
        <HeaderBar onBack={() => setStep("country")} />
        <p className="text-slate-600 text-xs font-bold uppercase tracking-widest mb-1">
          Choisissez votre opérateur — {selectedCountry?.flag} {selectedCountry?.name}
        </p>
        <div className="space-y-2.5">
          {selectedCountry?.operators.map(opCode => {
            const op = OPERATORS[opCode];
            if (!op) return null;
            return (
              <button key={opCode} data-testid={`button-dns-operator-${opCode}`}
                onClick={() => { setOperator(opCode); setStep("phone"); }}
                 className="w-full flex items-center justify-between rounded-2xl p-4 border border-slate-200 bg-white shadow-sm hover:border-teal-300 hover:bg-teal-50/50 active:scale-[0.98] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs"
                    style={{ backgroundColor: op.bg, color: op.text }}>
                    {op.initials}
                  </div>
                   <span className="text-slate-800 font-bold text-sm">{op.full}</span>
                </div>
                 <ChevronRight size={16} className="text-slate-400" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Étape 3 : Numéro utilisé pour le paiement ──────────────────────────
  if (step === "phone") {
    const canContinue = phone.replace(/\s/g, "").length >= 6;
    return (
      <div className="space-y-4">
        <HeaderBar onBack={() => setStep("operator")} />
        <p className="text-slate-600 text-xs font-bold uppercase tracking-widest mb-1">
          Numéro {selectedOp?.name} utilisé pour le paiement
        </p>
        <div className="rounded-2xl p-4 flex items-center gap-3 border border-slate-200 bg-white shadow-sm">
          <span className="text-slate-800 font-bold text-sm">+{selectedCountry?.prefix}</span>
          <input
            data-testid="input-dns-phone"
            type="tel" inputMode="numeric" placeholder={phonePlaceholder} value={phone}
            onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
            className="flex-1 bg-transparent text-slate-800 font-bold text-sm placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <button
          data-testid="button-dns-phone-continue"
          onClick={() => canContinue && setStep("manual")}
          disabled={!canContinue}
          className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 6px 24px rgba(16,185,129,0.4)" }}
        >
          Continuer <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  // ── Étape 4 : Dépôt + confirmation de paiement ─────────────────────────
  const canSubmit = payerName.trim().length >= 3 && transactionId.trim().length >= 3 && !!screenshotFile;
  const fullPhone = `+${selectedCountry?.prefix}${phone.replace(/\s/g, "")}`;

  return (
    <div className="space-y-4 pb-4">
      <HeaderBar onBack={() => setStep("phone")} />

      {depositLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
        </div>
      ) : depositInfo ? (
        <>
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
            <div className="px-4 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                {selectedOp && (
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs"
                    style={{ backgroundColor: selectedOp.bg, color: selectedOp.text }}>
                    {selectedOp.initials}
                  </div>
                )}
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Dépôt Mobile Money</p>
                  <p className="text-slate-900 font-black text-sm">{selectedOp?.name}</p>
                </div>
              </div>
                <div className="rounded-lg px-2 py-1 bg-teal-50 border border-teal-100">
                <p className="text-teal-800 text-[10px] font-bold">{selectedCountry?.flag} {selectedCountry?.name}</p>
              </div>
            </div>
            <div className="px-4 py-4 bg-white">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Numéro de dépôt</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-slate-900 font-black text-2xl font-mono tracking-wide leading-none">
                  {depositInfo.depositNumber || "— — — — —"}
                </p>
                {depositInfo.depositNumber && (
                  <button onClick={copyDepositNumber}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-bold text-xs transition-all flex-shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Copy size={12} /> Copier
                  </button>
                )}
              </div>
            </div>
            <div className="px-4 py-3 flex items-center justify-between bg-slate-50 border-t border-slate-200">
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Montant exact</p>
                <p className="text-slate-900 font-black text-xl leading-none">
                  {depositInfo.amount?.toLocaleString("fr-FR")} <span className="text-slate-500 text-xs font-bold">FCFA</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Depuis</p>
                <p className="text-slate-700 font-mono text-xs font-semibold">{fullPhone}</p>
              </div>
            </div>
          </div>

          {depositInfo.isInternational && depositInfo.internationalNote && (
            <div className="rounded-2xl p-3.5 flex gap-3 bg-amber-50 border border-amber-200">
              <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{depositInfo.internationalNote}</p>
            </div>
          )}

          {depositInfo.showInstruction && depositInfo.instruction && (
            <div className="rounded-2xl p-3.5 flex gap-3 bg-blue-50 border border-blue-200">
              <Info size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-blue-800 text-xs whitespace-pre-line leading-relaxed">{depositInfo.instruction}</p>
            </div>
          )}

          <div className="rounded-2xl p-4 space-y-4 border border-slate-200 bg-white shadow-sm">
            <div>
               <p className="text-slate-600 text-[11px] font-black uppercase tracking-wider mb-2">
                 Nom &amp; Prénom du payeur <span className="text-red-500">*</span>
              </p>
              <input
                data-testid="input-dns-payer-name"
                type="text" placeholder="Ex : KOUASSI Jean" value={payerName}
                onChange={e => setPayerName(e.target.value)}
                 className="w-full rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-colors"
              />
              <p className="text-slate-500 text-[10px] mt-1.5 pl-1">Nom enregistré sur la carte SIM utilisée</p>
            </div>
            <div>
               <p className="text-slate-600 text-[11px] font-black uppercase tracking-wider mb-2">
                 ID de transaction <span className="text-red-500">*</span>
              </p>
              <input
                data-testid="input-dns-transaction-id"
                type="text" placeholder="Ex : TXN1234567890" value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
                 className="w-full rounded-2xl px-4 py-3.5 text-sm font-semibold font-mono text-slate-800 placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-colors"
              />
              <p className="text-slate-500 text-[10px] mt-1.5 pl-1">ID reçu par SMS après votre paiement</p>
            </div>
            <div>
               <p className="text-slate-600 text-[11px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                 <ImageIcon size={11} /> Capture d'écran <span className="text-red-500">*</span>
              </p>
              <input ref={fileInputRef} type="file" accept="image/*,image/heic,image/heif,.heic,.heif,.pdf,.webp" className="hidden"
                data-testid="input-dns-screenshot"
                onChange={e => { const f = e.target.files?.[0]; if (f) setScreenshotFile(f); }} />
              {screenshotFile ? (
                 <div className="relative rounded-2xl overflow-hidden bg-emerald-50 border border-emerald-200">
                  {screenshotFile.type.startsWith("image/") && screenshotPreview ? (
                    <img src={screenshotPreview} alt="Capture" className="w-full max-h-44 object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 px-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-500/20">
                        <CheckCircle size={22} className="text-emerald-400" />
                      </div>
                       <p className="text-slate-800 font-semibold text-sm text-center">{screenshotFile.name}</p>
                       <p className="text-slate-500 text-xs">{(screenshotFile.size / 1024 / 1024).toFixed(1)} Mo</p>
                    </div>
                  )}
                  <button onClick={() => { setScreenshotFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <XCircle size={14} />
                  </button>
                </div>
              ) : (
                 <button onClick={() => fileInputRef.current?.click()}
                   className="w-full rounded-2xl p-5 flex flex-col items-center gap-2.5 transition-colors bg-slate-50 border-2 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/50">
                   <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-100">
                     <Upload size={20} className="text-emerald-600" />
                  </div>
                   <p className="text-slate-700 text-sm font-semibold">Ajouter une capture d'écran</p>
                  <p className="text-slate-500 text-xs">JPG, PNG, HEIC, PDF, WebP — Max 20 Mo</p>
                </button>
              )}
            </div>
          </div>

          <button
            data-testid="button-dns-submit"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 6px 24px rgba(16,185,129,0.4)" }}
          >
            {submitting ? "Envoi en cours..." : <><Zap size={18} /> Envoyer la demande</>}
          </button>
        </>
      ) : (
         <div className="rounded-2xl p-4 text-center bg-red-50 border border-red-200">
           <p className="text-red-700 font-semibold text-sm">Impossible de charger les informations. Veuillez réessayer.</p>
        </div>
      )}
    </div>
  );
}
