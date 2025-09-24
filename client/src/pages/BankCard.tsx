import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, Edit3, Save, Trash2, Plus } from "lucide-react";
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
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function BankCard() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: bankCard, isLoading } = useQuery<BankCardData | null>({
    queryKey: ['/api/bank-card'],
  });

  const form = useForm<BankCardRequest>({
    resolver: zodResolver(bankCardSchema),
    defaultValues: {
      firstName: bankCard?.firstName || "",
      lastName: bankCard?.lastName || "",
      cardNumber: bankCard?.cardNumber || "",
    },
  });

  // Reset form when bank card data changes
  useEffect(() => {
    if (bankCard) {
      form.reset({
        firstName: bankCard.firstName,
        lastName: bankCard.lastName,
        cardNumber: bankCard.cardNumber,
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
    if (bankCard?.id) {
      updateBankCardMutation.mutate(data);
    } else {
      createBankCardMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (bankCard) {
      form.reset({
        firstName: bankCard.firstName,
        lastName: bankCard.lastName,
        cardNumber: bankCard.cardNumber,
      });
    }
  };

  const maskCardNumber = (cardNumber: string) => {
    if (cardNumber.length <= 4) return cardNumber;
    return `${'*'.repeat(cardNumber.length - 4)}${cardNumber.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-bg text-primary-foreground">
        <div className="px-6 py-4 flex items-center">
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
            <Link href="/profile" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">
            Carte Bancaire
          </h1>
        </div>
      </div>

      <div className="p-6">
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

                  {/* Card Number */}
                  <FormField
                    control={form.control}
                    name="cardNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de retrait</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="1234567890123456"
                            {...field}
                            data-testid="input-card-number"
                          />
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
                      <p>• Utilisé uniquement pour vos retraits</p>
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