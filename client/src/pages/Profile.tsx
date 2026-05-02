import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Hash, Shield, CheckCircle, XCircle, LogOut, ChevronLeft, Mail, Phone, Pencil, X, Save } from "lucide-react";
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
      toast({ title: "Nom mis à jour avec succès" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err?.message || "Impossible de mettre à jour le nom", variant: "destructive" });
    },
  });

  const openEditName = () => {
    const u = user as any;
    setFirstName(u?.firstName || "");
    setLastName(u?.lastName || "");
    setEditingName(true);
  };

  const userName = (user as any)?.fullName || ((user as any)?.firstName && (user as any)?.lastName
    ? `${(user as any).firstName} ${(user as any).lastName}`
    : (user as any)?.firstName || (user as any)?.lastName || "Utilisateur");
  const userEmail = (user as any)?.email || "";
  const userPhone = (user as any)?.phone || "";
  const userInitial = userName.charAt(0).toUpperCase();
  const isActive = activationStatus?.isActive;

  const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="px-5 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-gray-600 text-sm">{label}</span>
      </div>
      <span className="text-gray-800 font-semibold text-sm text-right max-w-[55%] truncate">{value || "—"}</span>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      {/* Header */}
      <div className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0f172a, #1e3a5f, #1a4fa0)" }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, #f472b6, transparent)" }} />
        <div className="px-4 pt-4 pb-6">
          <div className="flex items-center justify-between mb-5">
            <Link href="/">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:bg-white/20">
                <ChevronLeft size={20} className="text-white" />
              </div>
            </Link>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 bg-red-500/20 px-3 py-1.5 rounded-full active:bg-red-500/40">
              <LogOut size={12} className="text-red-300" />
              <span className="text-red-300 text-xs font-semibold">Déconnexion</span>
            </button>
          </div>

          {/* Avatar + nom */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
              {(user as any)?.profileImageUrl
                ? <img src={(user as any).profileImageUrl} alt="profil" className="w-full h-full rounded-full object-cover" />
                : userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-lg truncate">{userName}</p>
              <p className="text-blue-300 text-xs truncate">{userEmail || userPhone}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                {isActive
                  ? <><CheckCircle size={11} className="text-green-400" /><span className="text-green-400 text-[10px] font-bold">Compte actif</span></>
                  : <><XCircle size={11} className="text-red-400" /><span className="text-red-400 text-[10px] font-bold">Compte inactif</span></>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-28 space-y-4">

        {/* Modifier nom & prénom */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b border-gray-50 flex items-center justify-between">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Nom & Prénom</p>
            {!editingName && (
              <button onClick={openEditName}
                className="flex items-center gap-1 text-blue-600 text-xs font-semibold active:opacity-70">
                <Pencil size={12} /> Modifier
              </button>
            )}
          </div>

          {editingName ? (
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-semibold mb-1 block">Prénom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Votre prénom"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold mb-1 block">Nom de famille</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Votre nom"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditingName(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold active:bg-gray-50">
                  <X size={14} /> Annuler
                </button>
                <button
                  onClick={() => updateNameMutation.mutate()}
                  disabled={updateNameMutation.isPending || !firstName.trim() || !lastName.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-semibold active:opacity-80 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #1a4fa0, #6366f1)" }}>
                  {updateNameMutation.isPending
                    ? <span className="animate-pulse">Enregistrement…</span>
                    : <><Save size={14} /> Enregistrer</>
                  }
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              <InfoRow
                icon={<span className="text-gray-400 text-sm">👤</span>}
                label="Prénom"
                value={(user as any)?.firstName || "—"}
              />
              <InfoRow
                icon={<span className="text-gray-400 text-sm">👤</span>}
                label="Nom"
                value={(user as any)?.lastName || "—"}
              />
            </div>
          )}
        </div>

        {/* Infos compte */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b border-gray-50">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Informations du compte</p>
          </div>
          <div className="divide-y divide-gray-50">
            <InfoRow
              icon={<Mail size={15} className="text-gray-400" />}
              label="E-mail"
              value={userEmail}
            />
            <InfoRow
              icon={<Phone size={15} className="text-gray-400" />}
              label="Téléphone"
              value={userPhone}
            />
            <InfoRow
              icon={<Calendar size={15} className="text-gray-400" />}
              label="Membre depuis"
              value={(user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString("fr-FR") : "N/A"}
            />
            <InfoRow
              icon={<Hash size={15} className="text-gray-400" />}
              label="Code parrainage"
              value={(user as any)?.referralCode || "N/A"}
            />
            <div className="px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield size={15} className="text-gray-400" />
                <span className="text-gray-600 text-sm">Statut</span>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
              }`}>
                {isActive ? "Actif" : "Inactif"}
              </span>
            </div>
          </div>
        </div>

      </div>

      <BottomNavigation currentPage="profile" />
    </div>
  );
}
