import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rechargeSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";

type RechargeForm = {
  operator: string;
  phone: string;
  amount: number;
};

export default function Recharge() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RechargeForm>({
    resolver: zodResolver(rechargeSchema),
    defaultValues: {
      operator: "",
      phone: "",
      amount: 0,
    },
  });

  const rechargeMutation = useMutation({
    mutationFn: async (data: RechargeForm) => {
      return await apiRequest("POST", "/api/transactions/recharge", data);
    },
    onSuccess: () => {
      toast({
        title: "Recharge effectuée",
        description: "Votre recharge a été effectuée avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la recharge",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RechargeForm) => {
    rechargeMutation.mutate(data);
  };

  const setAmount = (amount: number) => {
    form.setValue("amount", amount);
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
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">Recharge de crédit</h1>
        </div>
      </div>

      <div className="p-6">
        <Card className="bg-white rounded-xl shadow-sm border border-border">
          <CardContent className="p-6">
            <div className="flex items-center mb-6">
              <Plus className="text-green-600 mr-3" size={24} />
              <h2 className="text-xl font-bold">Recharger un numéro</h2>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="operator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opérateur</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-operator">
                            <SelectValue placeholder="Sélectionnez un opérateur" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MTN">MTN</SelectItem>
                          <SelectItem value="Moov">Moov</SelectItem>
                          <SelectItem value="Orange">Orange</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro à recharger</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+229 12345678"
                          {...field}
                          data-testid="input-phone"
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
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setAmount(500)}
                          data-testid="button-amount-500"
                          className="py-2"
                        >
                          500
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setAmount(1000)}
                          data-testid="button-amount-1000"
                          className="py-2"
                        >
                          1000
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setAmount(2000)}
                          data-testid="button-amount-2000"
                          className="py-2"
                        >
                          2000
                        </Button>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Montant personnalisé"
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

                <Button
                  type="submit"
                  disabled={rechargeMutation.isPending}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  data-testid="button-submit"
                >
                  {rechargeMutation.isPending ? "Recharge en cours..." : "Recharger maintenant"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
