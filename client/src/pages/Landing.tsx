import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-blue-600 flex flex-col">

      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <Card className="mx-auto w-full max-w-md shadow-xl">
          <CardContent className="p-8">
            {/* Logo Section */}
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-primary to-accent w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                <i className="fas fa-business-time text-white text-2xl"></i>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2" data-testid="app-title">
                SIKA TEXTE BUSINESS
              </h1>
              <p className="text-muted-foreground">Bienvenue dans votre espace financier</p>
            </div>

            <div className="space-y-4">
              <Button 
                asChild 
                className="w-full bg-primary hover:bg-blue-700 text-primary-foreground py-3"
                data-testid="button-login"
              >
                <Link href="/simple-login">Se connecter</Link>
              </Button>
              
              <Button 
                asChild 
                variant="outline" 
                className="w-full py-3"
                data-testid="button-register"
              >
                <Link href="/simple-register">Créer un compte</Link>
              </Button>
            </div>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Gérez vos transactions en toute sécurité</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
