import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Edit3, Save, Trash2, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Link } from "wouter";
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

// Opérateurs Mobile Money pour tous les pays
const OPERATORS_BY_COUNTRY: Record<string, string[]> = {
  "+228": ["T-Money", "Wizall-senegal", "Expresso", "Free Sénégal", "Mtn", "Moov", "Orange Money", "Wave"], // Togo
  "+229": ["T-Money", "Wizall-senegal", "Expresso", "Free Sénégal", "Mtn", "Moov", "Orange Money", "Wave"], // Bénin
  "+221": ["T-Money", "Wizall-senegal", "Expresso", "Free Sénégal", "Mtn", "Moov", "Orange Money", "Wave"], // Sénégal
  "+225": ["T-Money", "Wizall-senegal", "Expresso", "Free Sénégal", "Mtn", "Moov", "Orange Money", "Wave"], // Côte d'Ivoire
};

// Noms des pays par code
const COUNTRY_NAMES: Record<string, string> = {
  "+228": "Togo",
  "+229": "Bénin",
  "+221": "Sénégal",
  "+225": "Côte d'Ivoire"
};

export default function BankCard() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [userCountry, setUserCountry] = useState<string>("");
  const [availableOperators, setAvailableOperators] = useState<string[]>([]);

  // Récupérer les infos utilisateur pour déterminer le pays
  const { data: user } = useQuery<{id: string, phone: string, fullName: string}>({
    queryKey: ['/api/auth/user'],
  });

  const { data: bankCard, isLoading } = useQuery<BankCardData | null>({
    queryKey: ['/api/bank-card'],
  });

  const form = useForm<BankCardRequest>({
    resolver: zodResolver(bankCardSchema),
    defaultValues: {
      firstName: bankCard?.firstName || "",
      lastName: bankCard?.lastName || "",
      cardNumber: bankCard?.cardNumber || "",
      operator: bankCard?.operator || "",
      country: bankCard?.country || "",
    },
  });

  // Déterminer le pays à partir du numéro de téléphone de l'utilisateur
  useEffect(() => {
    if (user?.phone) {
      console.log('User phone:', user.phone);
      
      // Extraire le code pays plus intelligemment
      let countryCode = "";
      
      // Vérifier les codes pays supportés dans l'ordre de priorité
      const supportedCodes = Object.keys(OPERATORS_BY_COUNTRY);
      for (const code of supportedCodes) {
        if (user.phone.startsWith(code)) {
          countryCode = code;
          break;
        }
      }
      
      console.log('Detected country code:', countryCode);
      console.log('Available operators:', OPERATORS_BY_COUNTRY[countryCode]);
      
      if (countryCode && OPERATORS_BY_COUNTRY[countryCode]) {
        setUserCountry(countryCode);
        setAvailableOperators(OPERATORS_BY_COUNTRY[countryCode]);
        
        // Mettre à jour le formulaire avec le pays
        form.setValue('country', countryCode);
        
        // Pré-remplir le numéro sans indicatif si aucune carte existante
        if (!bankCard) {
          const localNumber = user.phone.startsWith(countryCode)
            ? user.phone.slice(countryCode.length)
            : user.phone;
          form.setValue('cardNumber', localNumber);
        }
      } else {
        console.warn('No country code detected for phone:', user.phone);
        // Par défaut, utiliser le Togo
        setUserCountry("+228");
        setAvailableOperators(OPERATORS_BY_COUNTRY["+228"]);
        form.setValue('country', "+228");
        
        // Pré-remplir le numéro tel quel si aucune carte existante
        if (!bankCard) {
          form.setValue('cardNumber', user.phone);
        }
      }
    }
  }, [user, bankCard, form]);

  const stripCountryCode = (phone: string, country: string) => {
    if (country && phone.startsWith(country)) {
      return phone.slice(country.length);
    }
    return phone;
  };

  // Reset form when bank card data changes
  useEffect(() => {
    if (bankCard) {
      form.reset({
        firstName: bankCard.firstName,
        lastName: bankCard.lastName,
        cardNumber: stripCountryCode(bankCard.cardNumber, bankCard.country),
        operator: bankCard.operator,
        country: bankCard.country,
      });
    }
  }, [bankCard, form]);

  const createBankCardMutation = useMutation({
    mutationFn: async (data: BankCardRequest) => {
      const response = await fetch('/api/bank-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'enregistrement');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Carte enregistrée ! 💳",
        description: "Votre carte bancaire a été enregistrée avec succès",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/bank-card'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur d'enregistrement",
        description: error.message || "Impossible d'enregistrer la carte",
        variant: "destructive",
      });
    },
  });

  const updateBankCardMutation = useMutation({
    mutationFn: async (data: BankCardRequest) => {
      const response = await fetch(`/api/bank-card/${bankCard?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la mise à jour');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Carte mise à jour ! ✅",
        description: "Vos informations ont été mises à jour avec succès",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/bank-card'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de mise à jour",
        description: error.message || "Impossible de mettre à jour la carte",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BankCardRequest) => {
    const country = data.country || userCountry || "+228";
    const fullNumber = data.cardNumber.startsWith("+")
      ? data.cardNumber
      : `${country}${data.cardNumber}`;
    const payload = { ...data, cardNumber: fullNumber };
    if (bankCard?.id) {
      updateBankCardMutation.mutate(payload);
    } else {
      createBankCardMutation.mutate(payload);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (bankCard) {
      form.reset({
        firstName: bankCard.firstName,
        lastName: bankCard.lastName,
        cardNumber: stripCountryCode(bankCard.cardNumber, bankCard.country),
        operator: bankCard.operator,
        country: bankCard.country,
      });
    }
  };

  const maskCardNumber = (cardNumber: string) => {
    if (cardNumber.length <= 4) return cardNumber;
    return `${'*'.repeat(cardNumber.length - 4)}${cardNumber.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Carte Bancaire" backHref="/profile" />

      <div className="p-4 pb-8">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ) : bankCard && !isEditing ? (
          /* Display Card View */
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Carte de Retrait</h3>
                    <p className="text-sm opacity-90">Carte principale</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-white hover:bg-white/10"
                  data-testid="button-edit-card"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm opacity-75">Numéro de retrait</p>
                  <p className="text-xl font-mono tracking-wider" data-testid="text-card-number">
                    {maskCardNumber(bankCard.cardNumber)}
                  </p>
                </div>

                <div>
                  <p className="text-sm opacity-75">Opérateur</p>
                  <p className="font-semibold" data-testid="text-card-operator">
                    {bankCard.operator}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm opacity-75">Prénom</p>
                    <p className="font-semibold" data-testid="text-card-firstname">
                      {bankCard.firstName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm opacity-75">Nom</p>
                    <p className="font-semibold" data-testid="text-card-lastname">
                      {bankCard.lastName}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Add/Edit Card Form */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                  <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl">
                    {bankCard ? "Modifier la carte" : "Ajouter une carte"}
                  </h3>
                  <p className="text-sm text-muted-foreground font-normal">
                    {bankCard ? "Modifiez vos informations bancaires" : "Enregistrez votre carte pour les retraits"}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* First Name */}
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Votre prénom"
                              {...field}
                              data-testid="input-firstname"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Last Name */}
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom de famille</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Votre nom"
                              {...field}
                              data-testid="input-lastname"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Opérateur */}
                  <FormField
                    control={form.control}
                    name="operator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opérateur Mobile Money</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-operator">
                              <SelectValue placeholder="Sélectionnez votre opérateur" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableOperators.map((operator) => (
                              <SelectItem key={operator} value={operator}>
                                {operator}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Card Number */}
                  <FormField
                    control={form.control}
                    name="cardNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro {form.watch('operator') || 'Mobile Money'} (sans indicatif)</FormLabel>
                        <FormControl>
                          <div className="flex items-center border border-input rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
                            <span className="flex items-center gap-1.5 px-3 py-2 bg-muted text-muted-foreground text-sm font-medium border-r border-input whitespace-nowrap">
                              {userCountry || "+228"}
                            </span>
                            <input
                              type="tel"
                              placeholder="XXXXXXXX"
                              {...field}
                              data-testid="input-card-number"
                              className="flex-1 px-3 py-2 bg-transparent text-sm outline-none"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={createBankCardMutation.isPending || updateBankCardMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      data-testid="button-save-card"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {createBankCardMutation.isPending || updateBankCardMutation.isPending 
                        ? "Enregistrement..." 
                        : bankCard ? "Modifier" : "Enregistrer"
                      }
                    </Button>

                    {bankCard && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        data-testid="button-cancel-edit"
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                </form>
              </Form>


              {/* Security Notice */}
              <div className="mt-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Sécurité des données</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Vos informations bancaires sont stockées de manière sécurisée</p>
                      <p>• Seuls les 4 derniers chiffres sont affichés</p>
                      <p>• Utilisé uniquement pour vos retraits Mobile Money</p>
                      <p>• Le numéro doit inclure l'indicatif de votre pays</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}