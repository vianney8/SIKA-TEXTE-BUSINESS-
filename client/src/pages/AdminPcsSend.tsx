import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, Mail, Plus, Zap, CheckCircle, Copy,
  RefreshCw, Send, UserCheck, Loader2, ToggleLeft, ToggleRight,
  ShieldCheck, ShieldOff,
} from "lucide-react";

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

interface ExistingCode {
  id: string;
  code: string;
  status: 'actif' | 'inactif';
  createdAt: string;
}

interface NewCodeEntry {
  code: string;
  status: 'actif' | 'inactif';
}

interface FoundUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string;
  phone: string | null;
}

interface SentResult {
  email: string;
  codes: string[];
  sentAt: Date;
}

export default function AdminPcsSend() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("");

  const [newCodeEntries, setNewCodeEntries] = useState<NewCodeEntry[]>([]);
  const [newCodeInput, setNewCodeInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SentResult | null>(null);
  const [sendNewByEmail, setSendNewByEmail] = useState(true);

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

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [email]);

  // Fetch existing PCS codes when user is found
  const { data: existingCodes = [], isLoading: codesLoading } = useQuery<ExistingCode[]>({
    queryKey: ['/api/admin/users', foundUser?.id, 'pcs-codes'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/users/${foundUser!.id}/pcs-codes`);
      return res.json();
    },
    enabled: !!foundUser,
    staleTime: 0,
  });

  // Toggle status of an existing code (no email)
  async function toggleExistingStatus(code: ExistingCode) {
    setUpdatingId(code.id);
    const newStatus: 'actif' | 'inactif' = code.status === 'actif' ? 'inactif' : 'actif';
    try {
      await apiRequest('PATCH', `/api/admin/pcs-codes/${code.id}/status`, { status: newStatus });
      // Mise à jour immédiate du cache local
      queryClient.setQueryData(
        ['/api/admin/users', foundUser?.id, 'pcs-codes'],
        (old: ExistingCode[] | undefined) =>
          old ? old.map(c => c.id === code.id ? { ...c, status: newStatus } : c) : old
      );
      // Refetch en arrière-plan pour garantir la cohérence
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', foundUser?.id, 'pcs-codes'] });
      toast({
        title: `Statut mis à jour`,
        description: `Code PCS …${code.code.slice(-9)} → ${newStatus === 'actif' ? '✅ Actif' : '🔴 Inactif'}`,
      });
    } catch (err: any) {
      toast({
        title: "Erreur de mise à jour",
        description: err.message || "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  // Send new code(s) by email
  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/send-pcs", {
        email,
        firstName: firstName || "Cher",
        lastName: lastName || "Client",
        countryCode,
        codes: newCodeEntries.map(e => e.code),
        statuses: newCodeEntries.map(e => e.status),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setLastResult({ email, codes: data.codes, sentAt: new Date() });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', foundUser?.id, 'pcs-codes'] });
      toast({
        title: "Email envoyé avec succès",
        description: `${data.sent} code(s) PCS envoyé(s) à ${email}`,
      });
      setNewCodeEntries([]);
    },
    onError: (err: any) => {
      toast({ title: "Échec de l'envoi", description: err.message || "Erreur lors de l'envoi", variant: "destructive" });
    },
  });

  // Save new code(s) to DB only (no email)
  const saveOnlyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/send-pcs", {
        email,
        firstName: firstName || "Cher",
        lastName: lastName || "Client",
        countryCode: countryCode || "BJ",
        codes: newCodeEntries.map(e => e.code),
        statuses: newCodeEntries.map(e => e.status),
        skipEmail: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', foundUser?.id, 'pcs-codes'] });
      toast({ title: "Code(s) enregistré(s)", description: "Codes ajoutés au compte sans envoi d'email" });
      setNewCodeEntries([]);
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  function addNewCode() {
    const code = newCodeInput.trim() ? newCodeInput.trim().toUpperCase() : generatePcsCode();
    setNewCodeEntries(prev => [...prev, { code, status: 'inactif' }]);
    setNewCodeInput("");
  }

  function removeNewCode(idx: number) {
    setNewCodeEntries(prev => prev.filter((_, i) => i !== idx));
  }

  function regenerateNewCode(idx: number) {
    setNewCodeEntries(prev => prev.map((e, i) => i === idx ? { ...e, code: generatePcsCode() } : e));
  }

  function toggleNewStatus(idx: number) {
    setNewCodeEntries(prev => prev.map((e, i) =>
      i === idx ? { ...e, status: e.status === 'actif' ? 'inactif' : 'actif' } : e
    ));
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const canSendNew = email.includes('@') && countryCode && newCodeEntries.length > 0 && !sendMutation.isPending && !saveOnlyMutation.isPending;
  const userFound = lookupState === 'found' && !!foundUser;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => setLocation('/admin')} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Mail size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">Gestion Codes PCS</h1>
              <p className="text-xs text-gray-500">Modifier statuts & envoyer par email</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Section 1 : Destinataire ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
            Destinataire
          </h2>
          <div className="space-y-3">
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
              {userFound && foundUser && (
                <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <UserCheck size={14} className="text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-semibold">
                    {foundUser.fullName || `${foundUser.firstName || ''} ${foundUser.lastName || ''}`.trim() || foundUser.email}
                    {foundUser.phone && <span className="font-normal text-green-600 ml-1">· {foundUser.phone}</span>}
                  </span>
                </div>
              )}
              {lookupState === 'notfound' && (
                <p className="mt-1.5 text-xs text-amber-600">Aucun compte trouvé — remplissez le nom manuellement</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Prénom</Label>
                <Input placeholder="Prénom" value={firstName} onChange={e => setFirstName(e.target.value)} className="h-11" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Nom</Label>
                <Input placeholder="Nom" value={lastName} onChange={e => setLastName(e.target.value)} className="h-11" />
              </div>
            </div>

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

        {/* ── Section 2 : Codes PCS existants (visible si utilisateur trouvé) ── */}
        {userFound && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">2</span>
              Codes PCS existants
              {codesLoading && <Loader2 size={13} className="animate-spin text-gray-400 ml-1" />}
              {!codesLoading && (
                <span className="ml-auto text-xs text-gray-400 font-normal">{existingCodes.length} code{existingCodes.length !== 1 ? 's' : ''}</span>
              )}
            </h2>

            {!codesLoading && existingCodes.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Aucun code PCS enregistré pour cet utilisateur.</p>
            )}

            {existingCodes.length > 0 && (
              <div className="space-y-2">
                {existingCodes.map(code => (
                  <div key={code.id} className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    code.status === 'actif'
                      ? 'border-green-100 bg-green-50/60'
                      : 'border-gray-100 bg-gray-50'
                  }`}>
                    {/* Icône statut */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      code.status === 'actif' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {code.status === 'actif'
                        ? <ShieldCheck size={14} className="text-green-600" />
                        : <ShieldOff size={14} className="text-gray-400" />
                      }
                    </div>

                    {/* Code + statut */}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-bold text-gray-800 truncate">{code.code}</p>
                      <p className={`text-[10px] font-semibold mt-0.5 ${
                        code.status === 'actif' ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {code.status === 'actif' ? '● Actif' : '○ Inactif'}
                        {code.createdAt && (
                          <span className="text-gray-400 font-normal ml-2">
                            · {new Date(code.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Copier */}
                    <button
                      onClick={() => copyCode(code.code)}
                      className="p-1.5 rounded-lg hover:bg-white transition-colors flex-shrink-0"
                      title="Copier"
                    >
                      {copiedId === code.code
                        ? <CheckCircle size={13} className="text-green-500" />
                        : <Copy size={13} className="text-gray-400 hover:text-gray-600" />
                      }
                    </button>

                    {/* Toggle statut */}
                    <button
                      onClick={() => toggleExistingStatus(code)}
                      disabled={updatingId === code.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex-shrink-0 ${
                        code.status === 'actif'
                          ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                      } disabled:opacity-50`}
                    >
                      {updatingId === code.id
                        ? <Loader2 size={11} className="animate-spin" />
                        : code.status === 'actif'
                          ? <><ToggleLeft size={12} /> Désactiver</>
                          : <><ToggleRight size={12} /> Activer</>
                      }
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Section 3 : Créer un nouveau code ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              userFound ? 'bg-blue-100 text-blue-600' : 'bg-blue-100 text-blue-600'
            }`}>{userFound ? '3' : '2'}</span>
            Nouveau code PCS
          </h2>

          {/* Codes créés */}
          {newCodeEntries.length > 0 && (
            <div className="space-y-2 mb-4">
              {newCodeEntries.map((entry, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Input
                      value={entry.code}
                      onChange={e => setNewCodeEntries(prev => prev.map((e2, i) => i === idx ? { ...e2, code: e.target.value.toUpperCase() } : e2))}
                      className="h-10 font-mono text-sm bg-slate-50 border-slate-200 flex-1"
                      placeholder="PCS-XXXX-XXXX-XXXX-XXXX"
                    />
                    <button
                      onClick={() => regenerateNewCode(idx)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Régénérer"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      onClick={() => copyCode(entry.code)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {copiedId === entry.code
                        ? <CheckCircle size={14} className="text-green-500" />
                        : <Copy size={14} className="text-gray-400" />
                      }
                    </button>
                    <button
                      onClick={() => removeNewCode(idx)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <button
                    onClick={() => toggleNewStatus(idx)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      entry.status === 'actif'
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-600'
                    }`}
                  >
                    {entry.status === 'actif'
                      ? <><ToggleRight size={14} /> Actif</>
                      : <><ToggleLeft size={14} /> Inactif</>
                    }
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Ajouter */}
          <div className="flex gap-2 mb-5">
            <Input
              placeholder="Entrer un code ou laisser vide pour générer"
              value={newCodeInput}
              onChange={e => setNewCodeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNewCode()}
              className="h-10 text-sm font-mono"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addNewCode}
              className="shrink-0 h-10 gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              {newCodeInput.trim() ? <><Plus size={14} /> Ajouter</> : <><Zap size={14} /> Générer</>}
            </Button>
          </div>

          {/* Boutons d'action */}
          {newCodeEntries.length > 0 && (
            <div className="space-y-2.5 border-t border-gray-100 pt-4">
              {/* Option envoyer par email */}
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={!canSendNew || !countryCode}
                className="w-full h-12 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 shadow gap-2"
              >
                {sendMutation.isPending
                  ? <><Loader2 size={16} className="animate-spin" /> Envoi en cours…</>
                  : <><Send size={16} /> Enregistrer &amp; envoyer par email ({newCodeEntries.length} code{newCodeEntries.length > 1 ? 's' : ''})</>
                }
              </Button>

              {/* Option enregistrer sans email */}
              {userFound && (
                <Button
                  variant="outline"
                  onClick={() => saveOnlyMutation.mutate()}
                  disabled={!canSendNew}
                  className="w-full h-11 font-bold rounded-xl border-gray-200 text-gray-600 gap-2"
                >
                  {saveOnlyMutation.isPending
                    ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</>
                    : <><CheckCircle size={16} /> Enregistrer uniquement (sans email)</>
                  }
                </Button>
              )}
            </div>
          )}

          {newCodeEntries.length === 0 && (
            <p className="text-xs text-gray-400 text-center">
              Générez ou saisissez un code pour l'ajouter au compte et l'envoyer.
            </p>
          )}
        </div>

        {/* ── Résultat dernier envoi ── */}
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
                  <button onClick={() => copyCode(code)} className="text-green-600 hover:text-green-800">
                    {copiedId === code ? <CheckCircle size={13} className="text-green-500" /> : <Copy size={13} />}
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
