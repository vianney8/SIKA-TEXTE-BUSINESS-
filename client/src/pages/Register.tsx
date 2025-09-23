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
  // Redirection directe vers l'authentification Replit
  const handleCreateAccount = () => {
    window.location.href = "/api/login";
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
                Bienvenue sur SIKA TEXTE BUSINESS
              </h1>
              <p className="text-muted-foreground text-sm">Créons votre compte</p>
            </div>

            {/* Simplified Register - Direct to Replit Auth */}
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-4">
                  Créez votre compte SIKA TEXTE BUSINESS en vous connectant avec votre compte Replit.
                  Vous pourrez compléter vos informations de profil après connexion.
                </p>
                
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-sm mb-2">Pays supportés</h4>
                  <div className="flex justify-center space-x-4 text-sm">
                    <span>🇧🇯 Bénin</span>
                    <span>🇨🇮 Côte d'Ivoire</span>
                    <span>🇸🇳 Sénégal</span>
                  </div>
                  <div className="flex justify-center space-x-4 text-sm mt-2">
                    <span>🇹🇬 Togo</span>
                    <span>🇧🇫 Burkina Faso</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCreateAccount}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                data-testid="button-create-account"
              >
                Créer mon compte
              </Button>
            </div>

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
