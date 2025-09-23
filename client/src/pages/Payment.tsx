import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Link, useLocation } from "wouter";

type PaymentForm = {
  merchantCode: string;
  amount: number;
  description?: string;
};

export default function Payment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      merchantCode: "",
      amount: 0,
      description: "",
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: PaymentForm) => {
      return await apiRequest("POST", "/api/transactions/payment", data);
    },
    onSuccess: () => {
      toast({
        title: "Paiement effectué",
        description: "Votre paiement a été effectué avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du paiement",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentForm) => {
    paymentMutation.mutate(data);
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
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">Paiement marchand</h1>
        </div>
      </div>

      <div className="p-6">
        <Card className="bg-white rounded-xl shadow-sm border border-border">
          <CardContent className="p-6">
            <div className="flex items-center mb-6">
              <CreditCard className="text-purple-600 mr-3" size={24} />
              <h2 className="text-xl font-bold">Payer un marchand</h2>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="merchantCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code marchand</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Entrez le code marchand"
                          {...field}
                          data-testid="input-merchant-code"
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
                          placeholder="Montant à payer"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Description du paiement"
                          {...field}
                          data-testid="input-description"
                          className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={paymentMutation.isPending}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                  data-testid="button-submit"
                >
                  {paymentMutation.isPending ? "Paiement en cours..." : "Effectuer le paiement"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
