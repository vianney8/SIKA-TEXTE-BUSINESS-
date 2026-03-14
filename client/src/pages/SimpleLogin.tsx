import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Lock, Phone, Eye, EyeOff, XCircle, ArrowRight, MessageCircle } from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { useAppSetting } from "@/hooks/useAppSettings";
import logoPath from "@assets/1764438802465_1773510898637.jpg";

const COUNTRIES = [
  { code: "+225", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "+221", name: "Sénégal",        flag: "🇸🇳" },
  { code: "+229", name: "Bénin",           flag: "🇧🇯" },
  { code: "+226", name: "Burkina Faso",    flag: "🇧🇫" },
  { code: "+228", name: "Togo",            flag: "🇹🇬" },
  { code: "+237", name: "Cameroun",        flag: "🇨🇲" },
];

export default function SimpleLogin() {
  const [countryCode, setCountryCode]       = useState("+225");
  const [phoneNumber, setPhoneNumber]       = useState("");
  const [password, setPassword]             = useState("");
  const [showPassword, setShowPassword]     = useState(false);
  const [isLoading, setIsLoading]           = useState(false);
  const [isBlocked, setIsBlocked]           = useState(false);
  const [showSupervisorDialog, setShowSupervisorDialog] = useState(false);
  const { toast }    = useToast();
  const [, setLocation] = useLocation();
  const { data: telegramSupervisor } = useAppSetting("telegram_supervisor");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryCode || !phoneNumber || !password) {
      toast({ title: "Erreur", description: "Tous les champs sont requis", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const fullPhone = countryCode + phoneNumber;
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 10000);
      const response   = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phoneNumber: fullPhone, password: password.trim() }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (response.ok) {
        toast({ title: "Connexion réussie !", description: "Bienvenue sur SIKA TEXTE" });
        setTimeout(() => window.location.replace("/"), 800);
      } else if (response.status === 403 && data.blocked) {
        setIsBlocked(true);
      } else {
        toast({ title: "Erreur", description: data.message || "Numéro ou mot de passe incorrect", variant: "destructive" });
      }
    } catch (error: any) {
      toast({
        title: error.name === "AbortError" ? "Timeout" : "Erreur",
        description: error.name === "AbortError"
          ? "Connexion trop lente. Vérifiez votre réseau."
          : "Erreur de connexion au serveur",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f4f8" }}>

      {/* ── En-tête sombre ── */}
      <div
        className="relative flex flex-col items-center justify-end px-6 pt-14 pb-10 flex-shrink-0"
        style={{
          background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 60%, #1a4fa0 100%)",
          borderRadius: "0 0 36px 36px",
          minHeight: "38vh",
        }}
      >
        <div className="absolute top-6 right-8 w-24 h-24 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />

        <div className="flex flex-col items-center z-10">
          <div className="w-16 h-16 rounded-[18px] overflow-hidden shadow-xl ring-4 ring-white/20 mb-3">
            <img src={logoPath} alt="SIKA TEXTE" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-white font-black text-2xl">SIKA TEXTE</h1>
          <p className="text-blue-200 text-sm mt-1">Connexion à votre compte</p>
        </div>
      </div>

      {/* ── Formulaire ── */}
      <div className="flex-1 px-5 -mt-4 z-10 pb-8">
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-5">

          {isBlocked ? (
            <div className="space-y-5 py-4">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle size={28} className="text-red-500" />
                </div>
                <p className="text-gray-800 font-bold text-base text-center">Compte bloqué</p>
                <p className="text-gray-500 text-sm text-center leading-relaxed">
                  Votre compte a été bloqué suite à une activité non conforme à nos politiques d'utilisation.
                </p>
              </div>
              <button
                onClick={() => setShowSupervisorDialog(true)}
                data-testid="button-contact-supervisor"
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}
              >
                <MessageCircle size={16} /> Contacter un superviseur
              </button>
              <button
                onClick={() => setIsBlocked(false)}
                data-testid="button-back-login"
                className="w-full py-3.5 rounded-2xl font-bold text-sm border-2 border-gray-200 text-gray-600"
              >
                Retour à la connexion
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-gray-800 font-bold text-lg mb-1">Se connecter</p>

              {/* Pays */}
              <div>
                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Pays</label>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger
                    data-testid="select-country"
                    className="h-12 rounded-xl border-gray-200 bg-gray-50 font-medium text-sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Téléphone */}
              <div>
                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                  Numéro de téléphone
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="12 345 678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    data-testid="input-phone"
                    required
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="input-password"
                    required
                    className="w-full h-12 pl-10 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Bouton connexion */}
              <button
                type="submit"
                disabled={isLoading}
                data-testid="button-login"
                className="w-full py-4 rounded-2xl font-black text-base text-white transition-all active:scale-[0.97] shadow-md mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}
              >
                {isLoading ? "Connexion..." : <><span>Se connecter</span><ArrowRight size={18} /></>}
              </button>

              {/* Lien inscription */}
              <p className="text-center text-sm text-gray-500 pt-1">
                Pas encore de compte ?{" "}
                <button
                  type="button"
                  onClick={() => setLocation("/register")}
                  data-testid="link-register"
                  className="text-blue-600 font-bold"
                >
                  Créer un compte
                </button>
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Dialog superviseur */}
      <Dialog open={showSupervisorDialog} onOpenChange={setShowSupervisorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contacter un superviseur</DialogTitle>
            <DialogDescription>Choisissez votre méthode de contact</DialogDescription>
          </DialogHeader>
          <button
            onClick={() => window.open(telegramSupervisor || "https://t.me/servicepay_support", "_blank")}
            data-testid="button-telegram"
            className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 mt-2"
            style={{ background: "linear-gradient(135deg, #0088cc, #229ed9)" }}
          >
            <FaTelegram size={18} /> Contacter via Telegram
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
