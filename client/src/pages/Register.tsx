import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { Eye, EyeOff, Phone, User, Mail, Lock, ArrowRight, Gift } from "lucide-react";
import logoPath from "@assets/1764438802465_1773510898637.jpg";

const COUNTRIES = [
  { code: "+228", name: "Togo",          flag: "🇹🇬" },
  { code: "+229", name: "Bénin",         flag: "🇧🇯" },
  { code: "+226", name: "Burkina Faso",  flag: "🇧🇫" },
  { code: "+225", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "+221", name: "Sénégal",       flag: "🇸🇳" },
  { code: "+237", name: "Cameroun",      flag: "🇨🇲" },
];

const extendedRegisterSchema = z.object({
  fullName:        z.string().min(1, "Le nom complet est requis"),
  email:           z.string().email("Adresse email invalide"),
  countryCode:     z.string().min(1, "Le code pays est requis"),
  phoneNumber:     z.string().min(8, "Au moins 8 chiffres requis"),
  password:        z.string().min(4, "Au moins 4 caractères"),
  confirmPassword: z.string(),
  terms:           z.boolean().refine((v) => v === true, "Vous devez accepter les conditions"),
  referralCode:    z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof extendedRegisterSchema>;

function FieldWrap({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
        {children}
      </div>
    </div>
  );
}

export default function Register() {
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [, setLocation]                           = useLocation();
  const { toast }                                 = useToast();

  const urlParams        = new URLSearchParams(window.location.search);
  const referralCodeParam = urlParams.get("ref") || "";

  const form = useForm<RegisterForm>({
    resolver: zodResolver(extendedRegisterSchema),
    defaultValues: {
      fullName:        "",
      email:           "",
      countryCode:     "+228",
      phoneNumber:     "",
      password:        "",
      confirmPassword: "",
      terms:           false,
      referralCode:    referralCodeParam,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const fullPhone  = data.countryCode + data.phoneNumber;
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 10000);
      const response   = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName:     data.fullName,
          email:        data.email,
          phone:        fullPhone,
          password:     data.password.trim(),
          referralCode: data.referralCode || undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de l'inscription");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Compte créé !", description: "Bienvenue sur SIKA TEXTE" });
      setTimeout(() => { window.location.href = "/"; }, 1000);
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible de créer le compte", variant: "destructive" });
    },
  });

  const inputClass =
    "w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f4f8" }}>

      {/* ── En-tête sombre ── */}
      <div
        className="relative flex flex-col items-center justify-end px-6 pt-12 pb-8 flex-shrink-0"
        style={{
          background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 60%, #1a4fa0 100%)",
          borderRadius: "0 0 36px 36px",
          minHeight: "28vh",
        }}
      >
        <div className="absolute top-6 right-8 w-24 h-24 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />

        <div className="flex flex-col items-center z-10">
          <div className="w-14 h-14 rounded-[16px] overflow-hidden shadow-xl ring-4 ring-white/20 mb-3">
            <img src={logoPath} alt="SIKA TEXTE" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-white font-black text-xl">𝐶𝑅𝐸𝐸 𝑈𝑁 𝐶𝑂𝑀𝑃𝑇𝐸</h1>
          <p className="text-blue-200 text-sm mt-0.5">Rejoignez SIKA TEXTE Business</p>
        </div>
      </div>

      {/* ── Formulaire ── */}
      <div className="flex-1 px-5 -mt-4 z-10 pb-8">
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => registerMutation.mutate(d))} className="space-y-4">

              {/* Nom complet */}
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FieldWrap label="Nom complet" icon={User}>
                    <input
                      {...field}
                      placeholder="Votre nom complet"
                      data-testid="input-fullname"
                      className={inputClass}
                    />
                  </FieldWrap>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Email */}
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FieldWrap label="Adresse email" icon={Mail}>
                    <input
                      {...field}
                      type="email"
                      placeholder="votre@email.com"
                      data-testid="input-email"
                      className={inputClass}
                    />
                  </FieldWrap>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Pays */}
              <FormField control={form.control} name="countryCode" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div>
                      <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Pays</label>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <SelectTrigger
                          data-testid="select-country"
                          className="h-12 rounded-xl border-gray-200 bg-gray-50 font-medium text-sm"
                        >
                          <SelectValue placeholder="Sélectionnez votre pays" />
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Téléphone */}
              <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem>
                  <FieldWrap label="Numéro de téléphone" icon={Phone}>
                    <input
                      {...field}
                      type="tel"
                      placeholder="12 345 678"
                      data-testid="input-phone"
                      className={inputClass}
                    />
                  </FieldWrap>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Mot de passe */}
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FieldWrap label="Mot de passe" icon={Lock}>
                    <input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="Créez un mot de passe"
                      data-testid="input-password"
                      className={`${inputClass} pr-12`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </FieldWrap>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Confirmer mot de passe */}
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FieldWrap label="Confirmer le mot de passe" icon={Lock}>
                    <input
                      {...field}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Répétez votre mot de passe"
                      data-testid="input-confirm-password"
                      className={`${inputClass} pr-12`}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      data-testid="button-toggle-confirm-password"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </FieldWrap>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Code parrainage */}
              {referralCodeParam && (
                <FormField control={form.control} name="referralCode" render={({ field }) => (
                  <FormItem>
                    <FieldWrap label="Code de parrainage" icon={Gift}>
                      <input
                        {...field}
                        disabled
                        data-testid="input-referral-code"
                        className={`${inputClass} opacity-60 cursor-not-allowed`}
                      />
                    </FieldWrap>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* CGU */}
              <FormField control={form.control} name="terms" render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-terms"
                        className="mt-0.5"
                      />
                    </FormControl>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      J'accepte les{" "}
                      <span className="text-blue-600 font-semibold">conditions d'utilisation</span>
                      {" "}et la{" "}
                      <span className="text-blue-600 font-semibold">politique de confidentialité</span>
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Bouton */}
              <button
                type="submit"
                disabled={registerMutation.isPending}
                data-testid="button-create-account"
                className="w-full py-4 rounded-2xl font-black text-base text-white transition-all active:scale-[0.97] shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}
              >
                {registerMutation.isPending
                  ? "Création du compte..."
                  : <><span>Créer mon compte</span><ArrowRight size={18} /></>
                }
              </button>

              <p className="text-center text-sm text-gray-500">
                Déjà un compte ?{" "}
                <Link href="/simple-login" data-testid="link-login" className="text-blue-600 font-bold">
                  Se connecter
                </Link>
              </p>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
