import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10">
        <div className="mx-auto w-full max-w-md">
          {/* Main Card */}
          <Card className="shadow-2xl border-0 backdrop-blur-xl bg-white/10 dark:bg-slate-800/40">
            <CardContent className="p-8 md:p-10">
              {/* Logo Section */}
              <div className="text-center mb-8 animate-fade-in-up">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-business-time text-white text-3xl"></i>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3" data-testid="app-title">
                  SIKA TEXTE
                </h1>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">BUSINESS</p>
                <p className="text-gray-500 dark:text-gray-400">Bienvenue dans votre espace financier</p>
              </div>

              {/* Description */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-8 backdrop-blur">
                <p className="text-sm text-gray-700 dark:text-gray-300 text-center font-medium">
                  ✨ Gagnez de l'argent en corrigeant des phrases • Retirez vos gains en sécurité • Bonus quotidiens
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  asChild 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-6 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  data-testid="button-login"
                >
                  <Link href="/simple-login" className="flex items-center justify-center gap-2">
                    Se connecter
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                
                <Button 
                  asChild 
                  variant="outline" 
                  className="w-full py-6 rounded-xl text-lg font-semibold border-2 hover:bg-white/10 dark:hover:bg-slate-700/30"
                  data-testid="button-register"
                >
                  <Link href="/register" className="flex items-center justify-center gap-2">
                    Créer un compte
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">SÉCURISÉ ET FIABLE</p>
                <div className="flex justify-center gap-4 text-2xl text-gray-400 dark:text-gray-500">
                  <i className="fas fa-lock"></i>
                  <i className="fas fa-shield-alt"></i>
                  <i className="fas fa-certificate"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Info */}
          <div className="mt-8 text-center text-gray-300 dark:text-gray-400 text-sm">
            <p>Disponible sur web et mobile</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
