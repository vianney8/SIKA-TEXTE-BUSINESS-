import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transferSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, ArrowUpRight, Phone, Banknote, MessageSquare, Lock, ShieldAlert } from "lucide-react";
import { Link, useLocation } from "wouter";
import { FaTelegram } from "react-icons/fa";
import { useAppSetting } from "@/hooks/useAppSettings";

type TransferForm = { recipientPhone: string; amount: number; message?: string };

export default function Transfer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: telegramSupervisor } = useAppSetting('telegram_supervisor');

  const { data: withdrawalData, isLoading: isLoadingStatus } = useQuery<any>({
    queryKey: ["/api/withdrawal"],
  });

  const form = useForm<TransferForm>({
    resolver: zodResolver(transferSchema),
    defaultValues: { recipientPhone: "", message: "" },
  });

  const transferMutation = useMutation({
    mutationFn: async (data: TransferForm) => apiRequest("POST", "/api/transactions/transfer", data),
    onSuccess: () => {
      toast({ title: "Transfert effectué ✅", description: "Votre transfert a été envoyé avec succès" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Erreur lors du transfert", variant: "destructive" });
    },
  });

  const isActive = withdrawalData?.isAccountActive;

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f0f4ff" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0a0f2c 0%, #1a1f5e 100%)" }}>
        <div className="px-4 pt-12 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(255,255,255,0.08)" }} data-testid="button-back">
                <ArrowLeft size={18} className="text-white" />
              </div>
            </Link>
            <h1 className="text-white font-bold text-lg" data-testid="page-title">Transfert</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
              <ArrowUpRight size={26} style={{ color: "#818cf8" }} />
            </div>
            <div>
              <p className="text-white font-bold text-base">Envoyer de l'argent</p>
              <p className="text-white/50 text-xs">À un abonné Sika Texte</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-5">

        {/* Account not active — blocked */}
        {!isLoadingStatus && !isActive && (
          <div className="space-y-4">
            <div className="rounded-3xl overflow-hidden shadow-sm" style={{ background: "white" }}>
              <div className="h-1" style={{ background: "linear-gradient(90deg, #ef4444, #f59e0b)" }} />
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.08)" }}>
                  <Lock size={28} style={{ color: "#ef4444" }} />
                </div>
                <h2 className="font-black text-slate-800 text-xl mb-2">Compte non activé</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-5">
                  Le transfert d'argent est réservé aux comptes activés. Activez votre compte pour accéder à toutes les fonctionnalités.
                </p>

                <div className="rounded-2xl p-4 mb-5 text-left space-y-2"
                  style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}>
                  {["Transférer de l'argent", "Retirer vos gains", "Accéder aux paiements"].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <ShieldAlert size={14} style={{ color: "#ef4444" }} />
                      <span className="text-slate-600 text-sm">{item}</span>
                    </div>
                  ))}
                </div>

                <Link href="/withdrawal">
                  <button className="w-full rounded-2xl py-4 text-white font-bold text-sm transition-all active:scale-95 mb-3"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                    data-testid="button-activate-account">
                    Activer mon compte — 3 600 FCFA
                  </button>
                </Link>

                <a href={telegramSupervisor || 'https://t.me/servicepay_support'} target="_blank" rel="noopener noreferrer">
                  <button className="w-full rounded-2xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-95"
                    style={{ background: "rgba(0,136,204,0.08)", color: "#0088cc", border: "1px solid rgba(0,136,204,0.15)" }}>
                    <FaTelegram />
                    Contacter le support
                  </button>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoadingStatus && (
          <div className="rounded-2xl p-10 text-center shadow-sm" style={{ background: "white" }}>
            <div className="w-8 h-8 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Vérification du compte...</p>
          </div>
        )}

        {/* Transfer Form — only if active */}
        {!isLoadingStatus && isActive && (
          <div className="rounded-3xl overflow-hidden shadow-sm" style={{ background: "white" }}>
            <div className="h-1" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
            <div className="p-5">
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => transferMutation.mutate(d))} className="space-y-4">

                  {/* Phone */}
                  <FormField control={form.control} name="recipientPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold text-sm">Numéro destinataire</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="tel"
                            placeholder="+229 12345678"
                            {...field}
                            data-testid="input-recipient-phone"
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                            style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                            onFocus={e => e.target.style.borderColor = "#6366f1"}
                            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Amount */}
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold text-sm">Montant (FCFA)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Banknote size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            placeholder="1 000"
                            {...field}
                            onChange={e => { const v = parseFloat(e.target.value); field.onChange(v > 0 ? v : e.target.value === '' ? '' : field.value); }}
                            min="1"
                            data-testid="input-amount"
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                            style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                            onFocus={e => e.target.style.borderColor = "#6366f1"}
                            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Message */}
                  <FormField control={form.control} name="message" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold text-sm">Message (optionnel)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MessageSquare size={16} className="absolute left-3 top-3 text-slate-400" />
                          <textarea
                            placeholder="Votre message..."
                            rows={3}
                            {...field}
                            data-testid="textarea-message"
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all resize-none"
                            style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                            onFocus={e => e.target.style.borderColor = "#6366f1"}
                            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <button
                    type="submit"
                    disabled={transferMutation.isPending}
                    className="w-full rounded-2xl py-4 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                    data-testid="button-submit"
                  >
                    {transferMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Envoi en cours...
                      </span>
                    ) : "Envoyer le transfert"}
                  </button>
                </form>
              </Form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
