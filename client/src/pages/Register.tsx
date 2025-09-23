import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { registerUserSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link } from "wouter";
import { Eye, EyeOff } from "lucide-react";

type RegisterForm = {
  fullName: string;
  phone: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
  referralCode?: string;
};

export default function Register() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      password: "",
      confirmPassword: "",
      terms: false,
      referralCode: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      return await apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      toast({
        title: "Compte créé avec succès",
        description: "Vous pouvez maintenant vous connecter",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création du compte",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-blue-600 flex flex-col">
      {/* Mobile Status Bar */}
      <div className="bg-primary text-primary-foreground px-6 py-2 flex justify-between items-center text-sm font-medium">
        <span data-testid="status-time">19:49</span>
        <div className="flex items-center space-x-1">
          <i className="fas fa-signal text-xs"></i>
          <i className="fas fa-wifi text-xs"></i>
          <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">52</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        <Card className="mx-auto w-full max-w-md shadow-xl">
          <CardContent className="p-8">
            {/* Logo Section */}
            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-primary to-accent w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                <i className="fas fa-business-time text-white text-2xl"></i>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1" data-testid="page-title">
                Bienvenue sur SIKA TEXTE BUSINESS
              </h1>
              <p className="text-muted-foreground text-sm">Créons votre compte</p>
            </div>

            {/* Register Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Nom et prénom"
                          {...field}
                          data-testid="input-fullname"
                          className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex">
                  <select className="bg-muted border border-input rounded-l-lg px-3 py-3 focus:ring-2 focus:ring-ring focus:border-transparent outline-none">
                    <option>🇨🇮 +229</option>
                  </select>
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="Numéro de téléphone"
                            {...field}
                            data-testid="input-phone"
                            className="flex-1 px-4 py-3 border border-l-0 border-input rounded-r-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Code secret"
                            {...field}
                            data-testid="input-password"
                            className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirmer code secret"
                            {...field}
                            data-testid="input-confirm-password"
                            className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            data-testid="button-toggle-confirm-password"
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referralCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Code de parrainage (optionnel)"
                          {...field}
                          data-testid="input-referral-code"
                          className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-terms"
                          className="mt-1"
                        />
                      </FormControl>
                      <Label className="text-sm text-muted-foreground">
                        J'accepte les{" "}
                        <a href="#" className="text-primary hover:underline">
                          conditions générales d'utilisation
                        </a>
                      </Label>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                  data-testid="button-submit"
                >
                  {registerMutation.isPending ? "Création..." : "Créer"}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center">
              <p className="text-muted-foreground text-sm">
                Vous avez déjà un compte ?{" "}
                <Button asChild variant="link" className="p-0 h-auto font-semibold text-primary">
                  <a href="/api/login" data-testid="link-login">
                    Connectez-vous
                  </a>
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
