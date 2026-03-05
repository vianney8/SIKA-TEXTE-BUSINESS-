import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function ActivationSuccess() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation('/activation?return=1');
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin mb-3" />
        <p className="text-gray-600">Redirection en cours...</p>
      </div>
    </div>
  );
}
