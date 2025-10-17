import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { simpleRegisterSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link } from "wouter";
import { Eye, EyeOff, Phone } from "lucide-react";

// Pays supportés avec opérateurs Mobile Money
const COUNTRIES = [
  { code: "+228", name: "Togo", flag: "🇹🇬" },
  { code: "+229", name: "Bénin", flag: "🇧🇯" },
  { code: "+226", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "+225", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "+221", name: "Sénégal", flag: "🇸🇳" },
];

// Extended register schema with country code support
const extendedRegisterSchema = z.object({
  fullName: z.string().min(1, "Le nom complet est requis"),
  email: z.string().email("Adresse email invalide"),
  countryCode: z.string().min(1, "Le code pays est requis"),
  phoneNumber: z.string().min(8, "Le numéro de téléphone doit contenir au moins 8 chiffres"),
  password: z.string().min(4, "Le mot de passe doit contenir au moins 4 caractères"),
  confirmPassword: z.string(),
  terms: z.boolean().refine(val => val === true, "Vous devez accepter les conditions"),
  referralCode: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof extendedRegisterSchema>;

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get referral code from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const referralCodeParam = urlParams.get('ref') || '';

  const form = useForm<RegisterForm>({
    resolver: zodResolver(extendedRegisterSchema),
    defaultValues: {
      fullName: "",
      email: "",
      countryCode: "+228", // Default to Togo
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      terms: false,
      referralCode: referralCodeParam,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      // Combine country code and phone number
      const fullPhone = data.countryCode + data.phoneNumber;

      // Add timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fullName: data.fullName,
          email: data.email,
          phone: fullPhone,
          password: data.password.trim(),
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
      toast({
        title: "Compte créé avec succès !",
        description: "Bienvenue sur SIKA TEXTE BUSINESS",
      });
      // User is automatically authenticated after registration
      // Redirect to dashboard instead of login page
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur d'inscription",
        description: error.message || "Impossible de créer le compte",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-blue-600 flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        <Card className="mx-auto w-full max-w-md shadow-xl">
          <CardContent className="p-8">
            {/* Logo Section */}
            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-primary to-accent w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                <i className="fas fa-business-time text-white text-2xl"></i>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1" data-testid="page-title">
                Créer un compte
              </h1>
              <p className="text-muted-foreground text-sm">Rejoignez SIKA TEXTE BUSINESS</p>
            </div>

            {/* Registration Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Full Name */}
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Entrez votre nom complet"
                          {...field}
                          data-testid="input-fullname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email Address */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="votre@email.com"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Country Code Selector */}
                <FormField
                  control={form.control}
                  name="countryCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-country">
                            <SelectValue placeholder="Sélectionnez votre pays" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.flag} {country.name} ({country.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Number */}
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de téléphone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type="tel"
                            placeholder="12345678"
                            className="pl-10"
                            {...field}
                            data-testid="input-phone"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Créez un mot de passe"
                            {...field}
                            data-testid="input-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Confirm Password */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmer le mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirmez votre mot de passe"
                            {...field}
                            data-testid="input-confirm-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            data-testid="button-toggle-confirm-password"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Referral Code */}
                {referralCodeParam && (
                  <FormField
                    control={form.control}
                    name="referralCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code de parrainage</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Code de parrainage"
                            {...field}
                            data-testid="input-referral-code"
                            disabled
                            className="bg-gray-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Terms and Conditions */}
                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-terms"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm">
                          J'accepte les conditions d'utilisation et la politique de confidentialité
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  data-testid="button-create-account"
                >
                  {registerMutation.isPending ? "Création du compte..." : "Créer mon compte"}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center">
              <p className="text-muted-foreground text-sm">
                Vous avez déjà un compte ?{" "}
                <Button asChild variant="link" className="p-0 h-auto font-semibold text-primary">
                  <Link href="/simple-login" data-testid="link-login">
                    Connectez-vous
                  </Link>
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
