import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Shield, Globe, Zap, CheckCircle, Code2, Database, Lock } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ApiAgregateur() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    project: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Demande envoyée ! 📧",
      description: "Notre équipe technique vous contactera sous 24-48h",
    });
    setFormData({
      name: "",
      company: "",
      email: "",
      phone: "",
      project: "",
      message: ""
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">
            API Agrégateur de Paiements
          </h1>
        </div>
      </div>

      <div className="p-6">
        {/* Introduction */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Code2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Intégration Professionnelle</h2>
          <p className="text-muted-foreground leading-relaxed">
            Nous utilisons un agrégateur de paiements moins reconnu, mais fiable et sécurisé pour différents pays africains. 
            C'est pourquoi vos transactions sont traitées automatiquement avec une sécurité optimale.
          </p>
        </div>

        {/* Features Cards */}
        <div className="grid gap-4 mb-8">
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                  <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Couverture Multi-Pays</h3>
                  <p className="text-sm text-muted-foreground">
                    Support des principales devises et opérateurs Mobile Money : Orange Money, MTN Mobile Money, 
                    Moov Money, Wave, Flooz pour le Bénin, Togo, Burkina Faso, Côte d'Ivoire et Sénégal.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                  <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Sécurité Bancaire</h3>
                  <p className="text-sm text-muted-foreground">
                    Chiffrement AES-256, conformité PCI DSS, authentification multi-facteurs et 
                    surveillance en temps réel pour toutes les transactions financières.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
                  <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Traitement Automatique</h3>
                  <p className="text-sm text-muted-foreground">
                    API REST moderne avec webhooks en temps réel, callbacks sécurisés et 
                    réconciliation automatique des paiements sous 30 secondes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Professional Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-full">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl">Demande d'API et Intégration</h3>
                <p className="text-sm text-muted-foreground font-normal">
                  Obtenez l'accès à notre infrastructure de paiements
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              Vous souhaitez obtenir plus d'informations sur notre API, intégrer nos solutions dans vos projets, 
              ou vérifier votre compte développeur ? Remplissez ce formulaire et notre équipe technique vous contactera 
              dans les 24-48 heures avec toute la documentation nécessaire.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="text-sm font-medium mb-2 block">
                    Nom complet *
                  </label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Votre nom et prénom"
                    required
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <label htmlFor="company" className="text-sm font-medium mb-2 block">
                    Entreprise / Projet
                  </label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleInputChange("company", e.target.value)}
                    placeholder="Nom de votre entreprise"
                    data-testid="input-company"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="text-sm font-medium mb-2 block">
                    Email professionnel *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="contact@entreprise.com"
                    required
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="text-sm font-medium mb-2 block">
                    Téléphone *
                  </label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+225 XX XX XX XX XX"
                    required
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="project" className="text-sm font-medium mb-2 block">
                  Type de projet / intégration
                </label>
                <Input
                  id="project"
                  value={formData.project}
                  onChange={(e) => handleInputChange("project", e.target.value)}
                  placeholder="Application mobile, site e-commerce, plateforme..."
                  data-testid="input-project"
                />
              </div>

              <div>
                <label htmlFor="message" className="text-sm font-medium mb-2 block">
                  Description de vos besoins *
                </label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  placeholder="Décrivez votre projet, vos besoins d'intégration, volumes de transactions estimés, pays ciblés..."
                  rows={4}
                  required
                  data-testid="textarea-message"
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                      Processus de validation
                    </p>
                    <ul className="text-amber-700 dark:text-amber-300 space-y-1">
                      <li>• Vérification de votre identité et projet</li>
                      <li>• Évaluation des besoins techniques</li>
                      <li>• Génération de clés API sécurisées</li>
                      <li>• Documentation et support d'intégration</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                data-testid="button-submit-api-request"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Envoyer ma demande
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* API Information */}
        <Card className="mt-6 bg-slate-50 dark:bg-slate-900">
          <CardContent className="p-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" />
              Informations Techniques
            </h4>
            <div className="grid gap-4 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Endpoints RESTful</p>
                  <p className="text-muted-foreground">API JSON avec authentification JWT et rate limiting</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Webhooks en temps réel</p>
                  <p className="text-muted-foreground">Notifications instantanées des changements d'état</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">SDK multi-plateformes</p>
                  <p className="text-muted-foreground">Python, PHP, Node.js, Java, C# disponibles</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Environnement de test</p>
                  <p className="text-muted-foreground">Sandbox complet pour vos développements</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}