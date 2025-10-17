import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Lock, Phone, Eye, EyeOff, XCircle } from "lucide-react";
import { FaWhatsapp, FaTelegram } from "react-icons/fa";
import { useAppSetting } from "@/hooks/useAppSettings";

// Country codes for supported countries
const COUNTRIES = [
  { code: "+228", name: "Togo", flag: "🇹🇬" },
  { code: "+229", name: "Bénin", flag: "🇧🇯" },
  { code: "+226", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "+225", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "+221", name: "Sénégal", flag: "🇸🇳" },
];

export default function SimpleLogin() {
  const [countryCode, setCountryCode] = useState("+228"); // Default to Togo
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showSupervisorDialog, setShowSupervisorDialog] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const whatsappLink = useAppSetting("whatsapp_supervisor")?.data || "https://wa.me/639072914078";
  const telegramLink = useAppSetting("telegram_supervisor")?.data || "https://t.me/yoursupervisor";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!countryCode || !phoneNumber || !password) {
      toast({
        title: "Erreur",
        description: "Pays, numéro de téléphone et mot de passe requis",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Combine country code and phone number
      const fullPhone = countryCode + phoneNumber;

      // Add timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          phoneNumber: fullPhone,
          password,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Connexion réussie !",
          description: "Bienvenue sur SIKA TEXTE BUSINESS",
        });
        // Force un rafraîchissement complet pour les téléphones mobiles
        setTimeout(() => {
          window.location.replace("/");
        }, 800);
      } else if (response.status === 403 && data.blocked) {
        setIsBlocked(true);
      } else {
        toast({
          title: "Erreur de connexion",
          description: data.message || "Numéro de téléphone ou mot de passe incorrect",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({
          title: "Timeout",
          description: "La connexion prend trop de temps. Vérifiez votre connexion internet.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Erreur de connexion au serveur",
          variant: "destructive",
        });
      }
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">
            Se connecter
          </CardTitle>
          <CardDescription>
            Connectez-vous à votre compte SIKA TEXTE BUSINESS
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isBlocked ? (
            <div className="space-y-4">
              <Alert className="border-red-500 bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="ml-2">
                  <div className="font-semibold text-red-800">User account locked</div>
                </AlertDescription>
              </Alert>
              
              <div className="text-center py-8">
                <h3 className="text-2xl font-medium text-gray-700 mb-4">
                  Your account has been locked.
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Veuillez contacter un superviseur pour plus d'informations
                </p>
                
                <Button
                  onClick={() => setShowSupervisorDialog(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  data-testid="button-contact-supervisor"
                >
                  Contacter un superviseur
                </Button>
                
                <Button
                  onClick={() => setIsBlocked(false)}
                  variant="outline"
                  className="w-full mt-3"
                  data-testid="button-back-login"
                >
                  Retour à la connexion
                </Button>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Country Selector */}
                <div className="space-y-2">
                  <Label>Pays</Label>
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger data-testid="select-country">
                      <SelectValue placeholder="Sélectionnez votre pays" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.flag} {country.name} ({country.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="12345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10"
                      data-testid="input-phone"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Votre mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      data-testid="input-password"
                      required
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
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-gray-600">Pas encore de compte ? </span>
                <button
                  onClick={() => setLocation("/register")}
                  className="text-blue-600 hover:underline font-medium"
                  data-testid="link-register"
                >
                  Créer un compte
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Contact Supervisor Dialog */}
      <Dialog open={showSupervisorDialog} onOpenChange={setShowSupervisorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contacter un superviseur</DialogTitle>
            <DialogDescription>
              Choisissez votre méthode de contact préférée
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <Button
              onClick={() => window.open(whatsappLink, "_blank")}
              className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
              data-testid="button-whatsapp"
            >
              <FaWhatsapp className="w-5 h-5" />
              Contacter via WhatsApp
            </Button>
            <Button
              onClick={() => window.open(telegramLink, "_blank")}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
              data-testid="button-telegram"
            >
              <FaTelegram className="w-5 h-5" />
              Contacter via Telegram
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}