import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, ArrowRight, Eye, EyeOff, ArrowLeft, ShieldCheck, RefreshCw, AlertTriangle } from "lucide-react";
import logoPath from "@assets/1764438802465_1773510898637.jpg";

type Step = "email" | "code" | "newPassword" | "success";

export default function ForgotPassword() {
  const [step, setStep]                   = useState<Step>("email");
  const [email, setEmail]                 = useState("");
  const [digits, setDigits]               = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [isLoading, setIsLoading]         = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const { toast }                         = useToast();
  const [, setLocation]                   = useLocation();
  const digitRefs                         = useRef<(HTMLInputElement | null)[]>([]);
  const code                              = digits.join("");

  const handleDigitChange = useCallback((index: number, value: string) => {
    const v = value.replace(/\D/g, "").slice(-1);
    setDigits(prev => { const next = [...prev]; next[index] = v; return next; });
    if (v && index < 5) digitRefs.current[index + 1]?.focus();
  }, []);

  const handleDigitKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) digitRefs.current[index - 1]?.focus();
  }, [digits]);

  const handleDigitPaste = useCallback((e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { setDigits(pasted.split("")); digitRefs.current[5]?.focus(); }
  }, []);

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.status === 429) {
        toast({ title: "Trop de demandes", description: data.message, variant: "destructive" });
        return;
      }
      if (!res.ok) {
        toast({ title: "Erreur", description: data.message, variant: "destructive" });
        return;
      }
      toast({ title: "Code envoyé !", description: "Vérifiez votre boîte mail (et vos spams)" });
      setStep("code");
    } catch {
      toast({ title: "Erreur", description: "Erreur de connexion", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6) {
      toast({ title: "Erreur", description: "Le code doit contenir 6 chiffres", variant: "destructive" });
      return;
    }
    setStep("newPassword");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      toast({ title: "Erreur", description: "Au moins 4 caractères requis", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erreur", description: data.message, variant: "destructive" });
        return;
      }
      toast({ title: "Mot de passe mis à jour !", description: "Vous êtes connecté automatiquement." });
      setLocation("/");
    } catch {
      toast({ title: "Erreur", description: "Erreur de connexion", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all";

  const goBack = () => {
    if (step === "email") setLocation("/simple-login");
    else if (step === "code") setStep("email");
    else if (step === "newPassword") setStep("code");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f4f8" }}>

      {/* Header */}
      <div
        className="relative flex flex-col items-center justify-end px-6 pt-14 pb-10 flex-shrink-0"
        style={{
          background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 60%, #1a4fa0 100%)",
          borderRadius: "0 0 36px 36px",
          minHeight: "28vh",
        }}
      >
        {step !== "success" && (
          <div className="absolute top-6 left-5">
            <button onClick={goBack} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <ArrowLeft size={18} className="text-white" />
            </button>
          </div>
        )}
        <div className="absolute top-6 right-8 w-24 h-24 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />
        <div className="flex flex-col items-center z-10">
          <div className="w-14 h-14 rounded-[16px] overflow-hidden shadow-xl ring-4 ring-white/20 mb-3">
            <img src={logoPath} alt="SIKA TEXTE" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-white font-black text-xl">Mot de passe oublié</h1>
          <p className="text-blue-200 text-sm mt-0.5">
            {step === "email" && "Entrez votre adresse email"}
            {step === "code" && "Vérifiez votre boîte mail"}
            {step === "newPassword" && "Choisissez un nouveau mot de passe"}
          </p>
        </div>
      </div>

      {/* Progress dots */}
      {step !== "success" && (
        <div className="flex justify-center gap-2 mt-5">
          {(["email", "code", "newPassword"] as const).map((s) => (
            <div key={s} className={`h-2 rounded-full transition-all ${step === s ? "w-6 bg-blue-500" : (["email","code","newPassword"].indexOf(s) < ["email","code","newPassword"].indexOf(step) ? "w-2 bg-blue-300" : "w-2 bg-gray-300")}`} />
          ))}
        </div>
      )}

      {/* STEP 1: Email */}
      {step === "email" && (
        <div className="flex-1 px-5 mt-4 pb-8">
          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-5">
            <form onSubmit={handleSendCode} className="space-y-4">
              <p className="text-gray-600 text-sm">
                Entrez l'adresse email associée à votre compte. Nous vous enverrons un code de réinitialisation.
              </p>
              <div>
                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Adresse email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all active:scale-[0.97] shadow-md"
                style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}
              >
                {isLoading ? "Envoi en cours..." : <><span>Envoyer le code</span><ArrowRight size={18} /></>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STEP 2: Code — nouveau design */}
      {step === "code" && (
        <div className="flex-1 flex flex-col items-center px-5 pt-6 pb-8">
          {/* Icône + Titre */}
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={26} className="text-blue-600" />
            <h2 className="text-gray-900 font-black text-xl">Vérification email</h2>
          </div>

          {/* Sous-titre */}
          <p className="text-gray-500 text-sm text-center mb-4">
            Un code à 6 chiffres a été envoyé à{" "}
            <span className="font-bold text-gray-800">{email}</span>.
          </p>

          {/* Alerte spam */}
          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2 items-start mb-6">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-700 text-xs leading-relaxed">
              Si vous ne voyez pas l'email dans votre boîte de réception,{" "}
              <strong>vérifiez aussi votre dossier spam ou courriers indésirables</strong>.
            </p>
          </div>

          {/* Label */}
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3 self-start">Code de vérification</p>

          {/* 6 cases */}
          <div className="flex gap-2.5 mb-2 w-full justify-center" onPaste={handleDigitPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { digitRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleDigitKeyDown(i, e)}
                className="w-12 h-14 rounded-xl border-2 border-gray-200 bg-white text-center text-2xl font-black text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              />
            ))}
          </div>
          <p className="text-gray-400 text-xs mb-6">Valable 15 minutes. Vérifiez aussi vos spams.</p>

          {/* Bouton confirmer */}
          <button
            onClick={handleVerifyCode}
            disabled={code.length !== 6}
            className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 disabled:opacity-50 shadow-md mb-5 transition-all active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}
          >
            <span>Confirmer le code</span><ArrowRight size={18} />
          </button>

          {/* Renvoyer */}
          <p className="text-gray-500 text-sm mb-3">Vous n'avez pas reçu le code ?</p>

          {!showResendConfirm ? (
            <button
              type="button"
              onClick={() => setShowResendConfirm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 bg-white text-gray-700 text-sm font-semibold shadow-sm active:scale-[0.97] transition-all"
            >
              <RefreshCw size={14} />
              Renvoyer le code
            </button>
          ) : (
            <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-gray-700 text-sm font-semibold mb-3">
                Renvoyer un nouveau code à <span className="text-blue-700">{email}</span> ?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowResendConfirm(false)}
                  className="px-4 py-2 rounded-full border border-gray-300 bg-white text-gray-600 text-sm font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => { setShowResendConfirm(false); await handleSendCode(); }}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                  {isLoading ? "Envoi..." : "Confirmer"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Nouveau mot de passe */}
      {step === "newPassword" && (
        <div className="flex-1 px-5 mt-4 pb-8">
          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-5">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 4 caractères"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full h-12 pl-10 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Répétez le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full h-12 pl-10 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all active:scale-[0.97] shadow-md"
                style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}
              >
                {isLoading ? "Mise à jour..." : <><span>Réinitialiser</span><ArrowRight size={18} /></>}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
