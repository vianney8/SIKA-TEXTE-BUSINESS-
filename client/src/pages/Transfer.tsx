import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transferSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowUpRight, Lock, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import PageHeader from "@/components/PageHeader";

type TransferForm = {
  recipientPhone: string;
  amount: number;
  message?: string;
};

export default function Transfer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: withdrawalInfo } = useQuery<{ isAccountActive: boolean }>({
    queryKey: ["/api/withdrawal"],
  });

  const isAccountActive = withdrawalInfo?.isAccountActive ?? true;

  const form = useForm<TransferForm>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      recipientPhone: "",
      message: "",
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (data: TransferForm) => {
      return await apiRequest("POST", "/api/transactions/transfer", data);
    },
    onSuccess: () => {
      toast({
        title: "Transfert effectué",
        description: "Votre transfert a été effectué avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du transfert",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransferForm) => {
    if (!isAccountActive) {
      toast({
        title: "Compte non activé",
        description: "Le transfert d'argent est uniquement réservé aux comptes activés. Activez votre compte pour pouvoir effectuer un transfert.",
        variant: "destructive",
      });
      return;
    }
    transferMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Transfert d'argent" backHref="/" />

      {/* Bandeau info abonné */}
      <div className="mx-4 mt-4 flex items-center gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5">
        <Users size={14} className="text-blue-500 flex-shrink-0" />
        <p className="text-blue-700 text-xs font-semibold leading-relaxed">
          Transfert d'argent à un abonné SIKA TEXTE uniquement
        </p>
      </div>

      <div className="p-4 pb-8">
        {!isAccountActive && (
          <div className="mb-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
            <Lock size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-amber-800 text-xs leading-relaxed">
              Votre compte n'est pas encore activé. Le transfert ne pourra être validé qu'après l'activation de votre compte.
            </p>
          </div>
        )}
        {(
          <Card className="bg-white rounded-xl shadow-sm border border-border">
            <CardContent className="p-6">
              <div className="flex items-center mb-6">
                <ArrowUpRight className="text-primary mr-3" size={24} />
                <h2 className="text-xl font-bold">Envoyer de l'argent</h2>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="recipientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de l'abonné SIKA TEXTE</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+229 12345678"
                            {...field}
                            data-testid="input-recipient-phone"
                            className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant (F.CFA)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1000"
                            {...field}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (value > 0) {
                                field.onChange(value);
                              } else if (e.target.value === '') {
                                field.onChange('');
                              }
                            }}
                            min="1"
                            data-testid="input-amount"
                            className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message (optionnel)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Votre message"
                            rows={3}
                            {...field}
                            data-testid="textarea-message"
                            className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={transferMutation.isPending}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    data-testid="button-submit"
                  >
                    {transferMutation.isPending ? "Envoi en cours..." : "Envoyer le transfert"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
