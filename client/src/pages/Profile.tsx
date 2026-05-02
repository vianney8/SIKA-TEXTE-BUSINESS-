import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CheckCircle, XCircle, LogOut, ChevronLeft, Mail, Phone,
  Pencil, X, Save, Hash, Calendar, Shield, Copy,
  ChevronRight, Bell, Lock, UserCircle2
} from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const { data: activationStatus } = useQuery<{ isActive: boolean; activatedAt: string | null }>({
    queryKey: ["/api/activation/status"],
    enabled: !!user,
  });

  const { data: balanceData } = useQuery<{ balance: number }>({
    queryKey: ["/api/user/balance"],
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
    queryFn: () => fetch("/api/transactions?limit=5", { credentials: "include" }).then(r => r.json()),
    enabled: !!user,
  });

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      .finally(() => { window.location.href = "/"; });
  };

  const updateNameMutation = useMutation({
    mutationFn: async () => {
      const u = user as any;
      const newFullName = `${firstName.trim()} ${lastName.trim()}`;
      return apiRequest("PUT", "/api/user/profile", {
        email: u?.email || "",
        phone: u?.phone,
        fullName: newFullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setEditingName(false);
      toast({ title: "Nom mis à jour ✓" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err?.message || "Impossible de mettre à jour", variant: "destructive" });
    },
  });

  const openEditName = () => {
    const u = user as any;
    setFirstName(u?.firstName || "");
    setLastName(u?.lastName || "");
    setEditingName(true);
  };

  const u = user as any;
  const userName = u?.fullName || (u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : u?.firstName || u?.lastName || "Utilisateur");
  const userEmail = u?.email || "";
  const userPhone = u?.phone || "";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const isActive = activationStatus?.isActive;
  const balance = balanceData?.balance ?? 0;
  const txCount = (transactions as any[]).length;
  const referralCode = u?.referralCode || "";

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({ title: "Code copié !" });
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8]">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden"
        style={{ background: "linear-gradient(150deg, #0c1a35 0%, #0f2d5a 50%, #0d3d8a 100%)" }}>

        {/* Déco */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #c084fc, transparent)" }} />
          <div className="absolute bottom-0 -left-8 w-40 h-40 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />
        </div>

        <div className="relative px-4 pt-5 pb-7">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-7">
            <Link href="/">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:bg-white/20 transition-all">
                <ChevronLeft size={20} className="text-white" />
              </div>
            </Link>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 bg-red-500/15 border border-red-400/20 px-3.5 py-1.5 rounded-xl active:bg-red-500/30 transition-all">
              <LogOut size={12} className="text-red-300" />
              <span className="text-red-300 text-xs font-bold">Déconnexion</span>
            </button>
          </div>

          {/* Avatar + nom */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                {u?.profileImageUrl
                  ? <img src={u.profileImageUrl} alt="profil" className="w-full h-full rounded-2xl object-cover" />
                  : userInitials}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0c1a35] flex items-center justify-center ${isActive ? "bg-green-500" : "bg-red-500"}`}>
                {isActive
                  ? <CheckCircle size={11} className="text-white" strokeWidth={3} />
                  : <XCircle size={11} className="text-white" strokeWidth={3} />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-xl leading-tight truncate">{userName}</p>
              <p className="text-blue-300/80 text-xs mt-0.5 truncate">{userEmail || userPhone}</p>
              <span className={`inline-block mt-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                isActive ? "bg-green-500/20 text-green-300 border border-green-500/30"
                         : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}>
                {isActive ? "Compte actif" : "Compte inactif"}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Solde",          value: `${balance.toLocaleString("fr-FR")} F` },
              { label: "Transactions",   value: String(txCount) },
              { label: "Depuis",         value: u?.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "—" },
            ].map(s => (
              <div key={s.label} className="bg-white/8 border border-white/10 rounded-2xl px-3 py-2.5 text-center">
                <p className="text-white font-black text-sm leading-none truncate">{s.value}</p>
                <p className="text-blue-300/60 text-[9px] font-semibold mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-28 space-y-4">

        {/* ── MODIFIER NOM ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-50">
            <div className="flex items-center gap-2">
              <UserCircle2 size={16} className="text-indigo-500" />
              <p className="text-gray-700 text-sm font-bold">Identité</p>
            </div>
            {!editingName && (
              <button onClick={openEditName}
                className="flex items-center gap-1 text-indigo-600 text-xs font-bold bg-indigo-50 px-2.5 py-1 rounded-lg active:opacity-70">
                <Pencil size={11} /> Modifier
              </button>
            )}
          </div>

          {editingName ? (
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">Prénom</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                  placeholder="Votre prénom"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">Nom de famille</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="Votre nom"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
              </div>
              <div className="flex gap-2.5 pt-1">
                <button onClick={() => setEditingName(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold active:bg-gray-50">
                  <X size={14} /> Annuler
                </button>
                <button onClick={() => updateNameMutation.mutate()}
                  disabled={updateNameMutation.isPending || !firstName.trim() || !lastName.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-white text-sm font-bold active:opacity-80 disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                  {updateNameMutation.isPending
                    ? <span className="animate-pulse">Enregistrement…</span>
                    : <><Save size={14} /> Enregistrer</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {[
                { label: "Prénom",          value: u?.firstName || "—" },
                { label: "Nom de famille",  value: u?.lastName  || "—" },
              ].map(r => (
                <div key={r.label} className="px-5 py-3.5 flex items-center justify-between">
                  <p className="text-gray-500 text-sm">{r.label}</p>
                  <p className="text-gray-800 font-semibold text-sm">{r.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── INFORMATIONS ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center gap-2">
            <Shield size={16} className="text-blue-500" />
            <p className="text-gray-700 text-sm font-bold">Informations du compte</p>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { icon: <Mail size={15} className="text-gray-400" />,     label: "E-mail",     value: userEmail },
              { icon: <Phone size={15} className="text-gray-400" />,    label: "Téléphone",  value: userPhone },
              { icon: <Calendar size={15} className="text-gray-400" />, label: "Membre depuis", value: u?.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—" },
            ].map(r => (
              <div key={r.label} className="px-5 py-3.5 flex items-center gap-3">
                {r.icon}
                <p className="text-gray-500 text-sm flex-1">{r.label}</p>
                <p className="text-gray-800 font-semibold text-sm text-right max-w-[55%] truncate">{r.value || "—"}</p>
              </div>
            ))}

            {/* Statut */}
            <div className="px-5 py-3.5 flex items-center gap-3">
              <Shield size={15} className="text-gray-400" />
              <p className="text-gray-500 text-sm flex-1">Statut</p>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
              }`}>
                {isActive ? "✅ Actif" : "❌ Inactif"}
              </span>
            </div>
          </div>
        </div>

        {/* ── PARRAINAGE ── */}
        {referralCode && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center gap-2">
              <Hash size={16} className="text-violet-500" />
              <p className="text-gray-700 text-sm font-bold">Code parrainage</p>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3">
                <p className="font-black text-violet-700 text-lg tracking-widest">{referralCode}</p>
                <button onClick={copyCode}
                  className="flex items-center gap-1.5 bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl active:opacity-70">
                  <Copy size={11} /> Copier
                </button>
              </div>
              <p className="text-gray-400 text-xs mt-2.5 text-center">Partagez ce code pour gagner des bonus</p>
            </div>
          </div>
        )}

        {/* ── ACTIONS ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center gap-2">
            <Bell size={16} className="text-orange-500" />
            <p className="text-gray-700 text-sm font-bold">Actions rapides</p>
          </div>
          <div className="divide-y divide-gray-50">
            <Link href="/transactions">
              <div className="px-5 py-4 flex items-center gap-3 active:bg-gray-50 transition-colors cursor-pointer">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2">
                    <path d="M3 12h18M3 6h18M3 18h18"/>
                  </svg>
                </div>
                <p className="flex-1 text-gray-700 text-sm font-semibold">Historique des transactions</p>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            </Link>
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lock size={15} className="text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="text-gray-700 text-sm font-semibold">Sécurité</p>
                <p className="text-gray-400 text-[11px]">Mot de passe et connexion</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </div>
        </div>

        {/* ── DÉCONNEXION ── */}
        <button onClick={handleLogout}
          className="w-full bg-white rounded-3xl shadow-sm border border-red-100 px-5 py-4 flex items-center gap-3 active:bg-red-50 transition-colors">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <LogOut size={15} className="text-red-500" />
          </div>
          <p className="flex-1 text-red-600 font-bold text-sm text-left">Se déconnecter</p>
          <ChevronRight size={16} className="text-red-300" />
        </button>

      </div>

      <BottomNavigation currentPage="profile" />
    </div>
  );
}
