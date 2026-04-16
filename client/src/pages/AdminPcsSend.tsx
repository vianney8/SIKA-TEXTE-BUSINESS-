import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Mail, Plus, Trash2, Zap, CheckCircle, Copy, RefreshCw, Send, UserCheck, Loader2, ToggleLeft, ToggleRight } from "lucide-react";

const COUNTRIES = [
  { code: "BJ", name: "Bénin" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "SN", name: "Sénégal" },
  { code: "BF", name: "Burkina Faso" },
  { code: "TG", name: "Togo" },
  { code: "CM", name: "Cameroun" },
  { code: "COG", name: "Congo-Brazzaville" },
];

function generatePcsCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `PCS-${seg()}-${seg()}-${seg()}-${seg()}`;
}

interface CodeEntry {
  code: string;
  status: 'actif' | 'inactif';
}

interface SentResult {
  email: string;
  codes: string[];
  sentAt: Date;
}

interface FoundUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string;
  phone: string | null;
}

export default function AdminPcsSend() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [codeEntries, setCodeEntries] = useState<CodeEntry[]>([{ code: generatePcsCode(), status: 'inactif' }]);
  const [newCodeInput, setNewCodeInput] = useState("");
  const [lastResult, setLastResult] = useState<SentResult | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // User lookup state
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced email lookup
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = email.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    if (!isValidEmail) {
      setLookupState('idle');
      setFoundUser(null);
      return;
    }

    setLookupState('loading');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/user-by-email?email=${encodeURIComponent(trimmed)}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const user: FoundUser = await res.json();
          setFoundUser(user);
          setLookupState('found');

          // Auto-fill name fields from user data
          if (user.firstName) {
            setFirstName(user.firstName);
          } else if (user.fullName) {
            const parts = user.fullName.trim().split(' ');
            setFirstName(parts[0] || '');
            setLastName(parts.slice(1).join(' ') || '');
          }
          if (user.lastName) setLastName(user.lastName);
        } else {
          setFoundUser(null);
          setLookupState('notfound');
        }
      } catch {
        setLookupState('notfound');
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [email]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/send-pcs", {
        email,
        firstName: firstName || "Cher",
        lastName: lastName || "Client",
        countryCode,
        codes: codeEntries.map(e => e.code),
        statuses: codeEntries.map(e => e.status),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setLastResult({ email, codes: data.codes, sentAt: new Date() });
      toast({
        title: "Email envoyé avec succès",
        description: `${data.sent} code(s) PCS envoyé(s) à ${email}`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Échec de l'envoi",
        description: err.message || "Erreur lors de l'envoi",
        variant: "destructive",
      });
    },
  });

  function addCode() {
    if (newCodeInput.trim()) {
      setCodeEntries(prev => [...prev, { code: newCodeInput.trim().toUpperCase(), status: 'inactif' }]);
      setNewCodeInput("");
    } else {
      setCodeEntries(prev => [...prev, { code: generatePcsCode(), status: 'inactif' }]);
    }
  }

  function removeCode(idx: number) {
    setCodeEntries(prev => prev.filter((_, i) => i !== idx));
  }

  function regenerateCode(idx: number) {
    setCodeEntries(prev => prev.map((e, i) => i === idx ? { ...e, code: generatePcsCode() } : e));
  }

  function updateCode(idx: number, value: string) {
    setCodeEntries(prev => prev.map((e, i) => i === idx ? { ...e, code: value.toUpperCase() } : e));
  }

  function toggleStatus(idx: number) {
    setCodeEntries(prev => prev.map((e, i) =>
      i === idx ? { ...e, status: e.status === 'actif' ? 'inactif' : 'actif' } : e
    ));
  }

  function copyCode(code: string, idx: number) {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  function copyAll() {
    navigator.clipboard.writeText(codeEntries.map(e => e.code).join('\n'));
    toast({ title: "Tous les codes copiés" });
  }

  const canSend = email.includes('@') && countryCode && codeEntries.length > 0 && !sendMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setLocation('/admin')}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Mail size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">Envoi Codes PCS</h1>
              <p className="text-xs text-gray-500">Envoi par email en temps réel</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Destinataire */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
            Destinataire
          </h2>
          <div className="space-y-3">
            {/* Email avec indicateur de lookup */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Adresse email *</Label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="exemple@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-11 pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {lookupState === 'loading' && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                  {lookupState === 'found' && <UserCheck size={16} className="text-green-500" />}
                  {lookupState === 'notfound' && <Mail size={16} className="text-gray-400" />}
                </div>
              </div>

              {/* Badge utilisateur trouvé */}
              {lookupState === 'found' && foundUser && (
                <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <UserCheck size={14} className="text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-semibold">
                    Utilisateur trouvé — {foundUser.fullName || `${foundUser.firstName || ''} ${foundUser.lastName || ''}`.trim() || foundUser.email}
                    {foundUser.phone && <span className="font-normal text-green-600 ml-1">· {foundUser.phone}</span>}
                  </span>
                </div>
              )}
              {lookupState === 'notfound' && (
                <p className="mt-1.5 text-xs text-amber-600">Aucun compte Sika Texte trouvé — remplissez le nom manuellement</p>
              )}
            </div>

            {/* Prénom / Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Prénom</Label>
                <Input
                  placeholder="Prénom"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Nom</Label>
                <Input
                  placeholder="Nom"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {/* Pays */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Pays *</Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Codes PCS */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
              Codes PCS ({codeEntries.length})
            </h2>
            {codeEntries.length > 1 && (
              <button
                onClick={copyAll}
                className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:text-blue-700"
              >
                <Copy size={12} /> Tout copier
              </button>
            )}
          </div>

          {/* Liste des codes */}
          <div className="space-y-3 mb-4">
            {codeEntries.map((entry, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      value={entry.code}
                      onChange={e => updateCode(idx, e.target.value)}
                      className="h-10 font-mono text-sm bg-slate-50 border-slate-200 text-slate-800"
                      placeholder="PCS-XXXX-XXXX-XXXX-XXXX"
                    />
                  </div>
                  <button
                    onClick={() => regenerateCode(idx)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Régénérer"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    onClick={() => copyCode(entry.code, idx)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Copier"
                  >
                    {copiedIdx === idx
                      ? <CheckCircle size={14} className="text-green-500" />
                      : <Copy size={14} className="text-gray-400 hover:text-gray-600" />
                    }
                  </button>
                  <button
                    onClick={() => removeCode(idx)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="Supprimer"
                    disabled={codeEntries.length === 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Toggle Statut */}
                <button
                  onClick={() => toggleStatus(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    entry.status === 'actif'
                      ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                      : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                  }`}
                >
                  {entry.status === 'actif'
                    ? <><ToggleRight size={14} /> Actif — cliquer pour mettre Inactif</>
                    : <><ToggleLeft size={14} /> Inactif — cliquer pour mettre Actif</>
                  }
                </button>
              </div>
            ))}
          </div>

          {/* Ajouter un code */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Entrer un code manuellement ou laisser vide"
                value={newCodeInput}
                onChange={e => setNewCodeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCode()}
                className="h-10 text-sm font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={addCode}
                className="shrink-0 h-10 gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                {newCodeInput.trim() ? <><Plus size={14} /> Ajouter</> : <><Zap size={14} /> Générer</>}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Laissez vide pour générer automatiquement · Appuyez sur Entrée ou cliquez Générer
            </p>
          </div>
        </div>

        {/* Bouton envoi */}
        <Button
          onClick={() => sendMutation.mutate()}
          disabled={!canSend}
          className="w-full h-14 text-base font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg gap-3"
        >
          {sendMutation.isPending ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Envoi en cours…
            </>
          ) : (
            <>
              <Send size={20} />
              Envoyer {codeEntries.length} code{codeEntries.length > 1 ? 's' : ''} PCS
            </>
          )}
        </Button>

        {/* Résultat dernier envoi */}
        {lastResult && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={18} className="text-green-600" />
              <h3 className="font-bold text-green-800 text-sm">Email envoyé avec succès</h3>
            </div>
            <p className="text-xs text-green-700 mb-3">
              <strong>{lastResult.codes.length} code{lastResult.codes.length > 1 ? 's' : ''}</strong> envoyé{lastResult.codes.length > 1 ? 's' : ''} à <strong>{lastResult.email}</strong>
              <br />
              {lastResult.sentAt.toLocaleString('fr-FR')}
            </p>
            <div className="space-y-1.5">
              {lastResult.codes.map((code, i) => (
                <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-100">
                  <span className="font-mono text-sm text-slate-800 font-semibold">{code}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(code); }}
                    className="text-green-600 hover:text-green-800"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
