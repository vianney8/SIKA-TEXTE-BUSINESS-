import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { User, Lock, ChevronLeft, Shield, Calendar, Hash, CheckCircle, XCircle, LogOut } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { Link } from "wouter";

type ProfileForm = { fullName: string; phone: string; email: string };
type PasswordForm = { currentPassword: string; newPassword: string; confirmPassword: string };

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  const { data: activationStatus } = useQuery<{ isActive: boolean; activatedAt: string | null }>({
    queryKey: ["/api/activation/status"],
    enabled: !!user,
  });

  const extractCountryCode = (phone: string) => {
    if (!phone) return "+228";
    if (phone.startsWith("+228")) return "+228";
    if (phone.startsWith("+225")) return "+225";
    if (phone.startsWith("+221")) return "+221";
    if (phone.startsWith("+226")) return "+226";
    if (phone.startsWith("+229")) return "+229";
    if (phone.startsWith("+237")) return "+237";
    return "+228";
  };

  const [countryCode, setCountryCode] = useState(extractCountryCode((user as any)?.phone || ""));

  const profileForm = useForm<ProfileForm>({ defaultValues: { fullName: "", phone: "", email: "" } });
  const passwordForm = useForm<PasswordForm>({ defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });

  useEffect(() => {
    if (user) {
      const code = extractCountryCode((user as any)?.phone || "");
      setCountryCode(code);
      profileForm.reset({
        fullName: (user as any)?.fullName || ((user as any)?.firstName + " " + (user as any)?.lastName) || "",
        phone: (user as any)?.phone ? (user as any).phone.replace(/^\+\d{3}/, "") : "",
        email: (user as any)?.email || "",
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      if (!data.phone || data.phone.trim() === "") throw new Error("Le numéro de téléphone ne peut pas être vide");
      if (!data.email || data.email.trim() === "") throw new Error("L'adresse email est obligatoire");
      return await apiRequest("PUT", "/api/user/profile", { ...data, phone: countryCode + data.phone.trim() });
    },
    onSuccess: () => {
      toast({ title: "✅ Profil mis à jour", description: "Vos informations ont été sauvegardées" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (e: Error) => {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      if (data.newPassword !== data.confirmPassword) throw new Error("Les mots de passe ne correspondent pas");
      return await apiRequest("PUT", "/api/user/password", { currentPassword: data.currentPassword, newPassword: data.newPassword });
    },
    onSuccess: () => {
      toast({ title: "✅ Mot de passe modifié", description: "Votre mot de passe a été changé" });
      passwordForm.reset();
    },
    onError: (e: Error) => {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
  });

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      .finally(() => { window.location.href = "/"; });
  };

  const userName = (user as any)?.fullName || ((user as any)?.firstName + " " + (user as any)?.lastName) || "Utilisateur";
  const userEmail = (user as any)?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();
  const isActive = activationStatus?.isActive;

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
              <p className="text-white font-black text-lg truncate" data-testid="text-user-name">{userName}</p>
              <p className="text-blue-300 text-xs truncate" data-testid="text-user-email">{userEmail || (user as any)?.phone || ""}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                {isActive
                  ? <><CheckCircle size={11} className="text-green-400" /><span className="text-green-400 text-[10px] font-bold" data-testid="status-active">Compte actif</span></>
                  : <><XCircle size={11} className="text-red-400" /><span className="text-red-400 text-[10px] font-bold" data-testid="status-inactive">Compte inactif</span></>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-28 space-y-4">

        {/* Infos compte */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            <div className="px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar size={15} className="text-gray-400" />
                <span className="text-gray-600 text-sm">Membre depuis</span>
              </div>
              <span className="text-gray-800 font-semibold text-sm" data-testid="text-member-since">
                {(user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString("fr-FR") : "N/A"}
              </span>
            </div>
            <div className="px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Hash size={15} className="text-gray-400" />
                <span className="text-gray-600 text-sm">Code parrainage</span>
              </div>
              <span className="text-indigo-600 font-black text-sm tracking-widest" data-testid="text-referral-code">
                {(user as any)?.referralCode || "N/A"}
              </span>
            </div>
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

        {/* Tabs */}
        <div className="bg-white rounded-[16px] p-1.5 flex gap-1 shadow-sm">
          <button
            onClick={() => setActiveTab("profile")}
            data-testid="tab-profile"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={activeTab === "profile"
              ? { background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff" }
              : { color: "#94a3b8" }}>
            <User size={15} />
            Profil
          </button>
          <button
            onClick={() => setActiveTab("password")}
            data-testid="tab-password"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={activeTab === "password"
              ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff" }
              : { color: "#94a3b8" }}>
            <Lock size={15} />
            Mot de passe
          </button>
        </div>

        {/* Formulaire Profil */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-gray-50">
              <p className="text-gray-800 font-bold text-sm">Modifier mes informations</p>
            </div>
            <div className="px-5 pt-4 pb-5">
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(d => updateProfileMutation.mutate(d))} className="space-y-4">
                  <FormField control={profileForm.control} name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-600 text-xs font-bold uppercase tracking-wider">Nom complet</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-fullname"
                            className="rounded-xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-300 py-3 text-sm font-medium" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField control={profileForm.control} name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-600 text-xs font-bold uppercase tracking-wider">Téléphone</FormLabel>
                        <div className="flex gap-2">
                          <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                            data-testid="select-country-code"
                            className="border-2 border-gray-100 rounded-xl px-2 py-3 bg-gray-50 text-sm font-semibold focus:outline-none focus:border-blue-300 flex-shrink-0">
                            <option value="+228">🇹🇬 +228</option>
                            <option value="+225">🇨🇮 +225</option>
                            <option value="+221">🇸🇳 +221</option>
                            <option value="+226">🇧🇫 +226</option>
                            <option value="+229">🇧🇯 +229</option>
                            <option value="+237">🇨🇲 +237</option>
                          </select>
                          <FormControl>
                            <Input type="tel" placeholder="12345678" {...field} data-testid="input-phone"
                              className="flex-1 rounded-xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-300 py-3 text-sm font-medium" />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField control={profileForm.control} name="email"
                    rules={{
                      required: "L'adresse email est obligatoire",
                      pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Adresse email invalide" },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-600 text-xs font-bold uppercase tracking-wider">Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="votre@email.com" {...field} data-testid="input-email"
                            className="rounded-xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-300 py-3 text-sm font-medium" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <button type="submit" disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                    className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}>
                    {updateProfileMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
                  </button>
                </form>
              </Form>
            </div>
          </div>
        )}

        {/* Formulaire Mot de passe */}
        {activeTab === "password" && (
          <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-gray-50">
              <p className="text-gray-800 font-bold text-sm">Changer le mot de passe</p>
            </div>
            <div className="px-5 pt-4 pb-5">
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(d => updatePasswordMutation.mutate(d))} className="space-y-4">
                  {(["currentPassword","newPassword","confirmPassword"] as const).map((name, i) => (
                    <FormField key={name} control={passwordForm.control} name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-600 text-xs font-bold uppercase tracking-wider">
                            {i === 0 ? "Mot de passe actuel" : i === 1 ? "Nouveau mot de passe" : "Confirmer"}
                          </FormLabel>
                          <FormControl>
                            <Input type="password"
                              placeholder={i === 0 ? "Mot de passe actuel" : i === 1 ? "Nouveau mot de passe" : "Confirmer le mot de passe"}
                              {...field}
                              data-testid={i === 0 ? "input-current-password" : i === 1 ? "input-new-password" : "input-confirm-password"}
                              className="rounded-xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-purple-300 py-3 text-sm font-medium" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <button type="submit" disabled={updatePasswordMutation.isPending}
                    data-testid="button-save-password"
                    className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                    {updatePasswordMutation.isPending ? "Modification..." : "Changer le mot de passe"}
                  </button>
                </form>
              </Form>
            </div>
          </div>
        )}

      </div>

      <BottomNavigation currentPage="profile" />
    </div>
  );
}
