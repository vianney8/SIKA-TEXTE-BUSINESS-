import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transferSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link, useLocation } from "wouter";

type TransferForm = {
  recipientPhone: string;
  amount: number;
  message?: string;
};

export default function Transfer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    transferMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-bg text-primary-foreground">
        <div className="px-6 py-4 flex items-center">
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
            <Link href="/" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">Transférer de l'argent à un abonné Sika texte</h1>
        </div>
      </div>

      <div className="p-6">
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
                      <FormLabel>Numéro destinataire</FormLabel>
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
      </div>
    </div>
  );
}
