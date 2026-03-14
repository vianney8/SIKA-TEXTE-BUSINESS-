import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Edit3, Save, Shield, ChevronDown } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bankCardSchema, type BankCardRequest } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface BankCardData {
  id?: string;
  firstName: string;
  lastName: string;
  cardNumber: string;
  operator: string;
  country: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const COUNTRIES = [
  { prefix: "+229", name: "Bénin",         flag: "🇧🇯" },
  { prefix: "+225", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { prefix: "+221", name: "Sénégal",       flag: "🇸🇳" },
  { prefix: "+226", name: "Burkina Faso",  flag: "🇧🇫" },
  { prefix: "+228", name: "Togo",          flag: "🇹🇬" },
  { prefix: "+237", name: "Cameroun",      flag: "🇨🇲" },
];

const OPERATORS_LIST = ["MTN", "Moov", "Orange Money", "Wave", "Free Mobile", "T-Money", "Wizall"];

export default function BankCard() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPrefix, setSelectedPrefix] = useState("+229");

  const { data: user } = useQuery<{ id: string; phone: string; fullName: string }>({
    queryKey: ["/api/auth/user"],
  });

  const { data: bankCard, isLoading } = useQuery<BankCardData | null>({
    queryKey: ["/api/bank-card"],
  });

  const form = useForm<BankCardRequest>({
    resolver: zodResolver(bankCardSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      cardNumber: "",
      operator: "",
      country: "+229",
    },
  });

  const stripCountryCode = (phone: string, country: string) => {
    if (country && phone.startsWith(country)) return phone.slice(country.length);
    return phone;
  };

  // Détecter le pays depuis le téléphone utilisateur
  useEffect(() => {
    if (user?.phone && !bankCard) {
      const found = COUNTRIES.find(c => user.phone.startsWith(c.prefix));
      const prefix = found?.prefix || "+229";
      setSelectedPrefix(prefix);
      form.setValue("country", prefix);
      const localNum = user.phone.startsWith(prefix) ? user.phone.slice(prefix.length) : user.phone;
      form.setValue("cardNumber", localNum);
    }
  }, [user, bankCard]);

  // Pré-remplir depuis la carte existante
  useEffect(() => {
    if (bankCard) {
      const prefix = bankCard.country || "+229";
      setSelectedPrefix(prefix);
      form.reset({
        firstName: bankCard.firstName,
        lastName: bankCard.lastName,
        cardNumber: stripCountryCode(bankCard.cardNumber, prefix),
        operator: bankCard.operator,
        country: prefix,
      });
    }
  }, [bankCard]);

  // Sync indicatif → form country
  useEffect(() => {
    form.setValue("country", selectedPrefix);
  }, [selectedPrefix]);

  const createBankCardMutation = useMutation({
    mutationFn: async (data: BankCardRequest) => {
      const res = await fetch("/api/bank-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Erreur d'enregistrement"); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Carte enregistrée ✅", description: "Votre carte a été enregistrée avec succès" });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/bank-card"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateBankCardMutation = useMutation({
    mutationFn: async (data: BankCardRequest) => {
      const res = await fetch(`/api/bank-card/${bankCard?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Erreur de mise à jour"); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Carte mise à jour ✅", description: "Informations mises à jour avec succès" });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/bank-card"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const onSubmit = (data: BankCardRequest) => {
    const prefix = selectedPrefix;
    const fullNumber = data.cardNumber.startsWith("+") ? data.cardNumber : `${prefix}${data.cardNumber}`;
    const payload = { ...data, cardNumber: fullNumber, country: prefix };
    if (bankCard?.id) updateBankCardMutation.mutate(payload);
    else createBankCardMutation.mutate(payload);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (bankCard) {
      const prefix = bankCard.country || "+229";
      setSelectedPrefix(prefix);
      form.reset({
        firstName: bankCard.firstName,
        lastName: bankCard.lastName,
        cardNumber: stripCountryCode(bankCard.cardNumber, prefix),
        operator: bankCard.operator,
        country: prefix,
      });
    }
  };

  const isPending = createBankCardMutation.isPending || updateBankCardMutation.isPending;
  const selectedCountryInfo = COUNTRIES.find(c => c.prefix === selectedPrefix) || COUNTRIES[0];

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f0f4f8" }}>
      <PageHeader title="Carte Bancaire" backHref="/profile" />

      <div className="px-4 space-y-3 mt-3">

        {isLoading ? (
          <div className="bg-white rounded-[20px] p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ) : bankCard && !isEditing ? (
          /* ── Vue carte enregistrée ── */
          <div
            className="rounded-[20px] p-5 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1a4fa0, #7c3aed)" }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-1">Carte de retrait</p>
                <p className="text-white font-bold text-lg">{bankCard.firstName} {bankCard.lastName}</p>
              </div>
              <button
                data-testid="button-edit-card"
                onClick={() => setIsEditing(true)}
                className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"
              >
                <Edit3 size={15} className="text-white" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-blue-300 text-[10px] font-semibold uppercase">Numéro Mobile Money</p>
                <p className="text-white font-mono text-base tracking-widest" data-testid="text-card-number">
                  {bankCard.country} {"*".repeat(Math.max(0, bankCard.cardNumber.replace(bankCard.country, "").length - 4))}
                  {bankCard.cardNumber.slice(-4)}
                </p>
              </div>
              <div>
                <p className="text-blue-300 text-[10px] font-semibold uppercase">Opérateur</p>
                <p className="text-white font-semibold" data-testid="text-card-operator">{bankCard.operator}</p>
              </div>
            </div>

            {/* Cercles décoratifs */}
            <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/5" />
          </div>
        ) : (
          /* ── Formulaire ajout / modification ── */
          <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-[14px] bg-blue-50 flex items-center justify-center">
                <CreditCard size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-gray-800 font-bold text-base">{bankCard ? "Modifier la carte" : "Ajouter une carte"}</p>
                <p className="text-gray-400 text-xs">{bankCard ? "Modifiez vos informations bancaires" : "Enregistrez votre carte pour les retraits"}</p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                {/* Prénom + Nom */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Prénom</FormLabel>
                      <FormControl>
                        <input
                          placeholder="Prénom"
                          {...field}
                          data-testid="input-firstname"
                          className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Nom</FormLabel>
                      <FormControl>
                        <input
                          placeholder="Nom"
                          {...field}
                          data-testid="input-lastname"
                          className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Opérateur */}
                <FormField control={form.control} name="operator" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Opérateur Mobile Money</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger
                          data-testid="select-operator"
                          className="h-11 rounded-xl border-gray-200 bg-gray-50 text-sm font-medium"
                        >
                          <SelectValue placeholder="Sélectionnez votre opérateur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OPERATORS_LIST.map(op => (
                          <SelectItem key={op} value={op}>{op}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Numéro avec sélecteur d'indicatif */}
                <FormField control={form.control} name="cardNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
                      Numéro {form.watch("operator") || "Mobile Money"} (sans indicatif)
                    </FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        {/* Sélecteur indicatif */}
                        <div className="relative flex-shrink-0">
                          <select
                            value={selectedPrefix}
                            onChange={e => setSelectedPrefix(e.target.value)}
                            className="h-11 pl-2 pr-7 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer transition-all"
                            style={{ minWidth: 90 }}
                          >
                            {COUNTRIES.map(c => (
                              <option key={c.prefix} value={c.prefix}>
                                {c.flag} {c.prefix}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Numéro local */}
                        <input
                          type="tel"
                          placeholder="01 23 45 67"
                          {...field}
                          data-testid="input-card-number"
                          className="flex-1 h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>
                    </FormControl>
                    <p className="text-gray-400 text-[11px] mt-1">
                      Numéro complet : <strong className="text-gray-600">{selectedPrefix} {field.value || "XXXXXXXX"}</strong>
                    </p>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Boutons */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={isPending}
                    data-testid="button-save-card"
                    className="flex-1 h-12 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 shadow-md active:scale-[0.97] transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #1a4fa0, #7c3aed)" }}
                  >
                    <Save size={16} />
                    {isPending ? "Enregistrement..." : bankCard ? "Modifier" : "Enregistrer"}
                  </button>

                  {bankCard && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      data-testid="button-cancel-edit"
                      className="h-12 px-5 rounded-2xl font-bold text-sm border-2 border-gray-200 text-gray-500 bg-white active:scale-[0.97] transition-all"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* Sécurité */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Shield size={16} className="text-blue-500" />
            </div>
            <div>
              <p className="text-gray-700 font-bold text-sm mb-1.5">Sécurité des données</p>
              <div className="text-gray-400 text-xs space-y-1 leading-relaxed">
                <p>• Vos informations bancaires sont stockées de manière sécurisée</p>
                <p>• Seuls les 4 derniers chiffres sont affichés</p>
                <p>• Utilisé uniquement pour vos retraits Mobile Money</p>
                <p>• Le numéro doit inclure l'indicatif de votre pays</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
