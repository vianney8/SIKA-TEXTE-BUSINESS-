import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, Mail, Plus, Zap, CheckCircle, Copy, RefreshCw, Send,
  UserCheck, Loader2, ShieldCheck, ShieldOff, Pencil, MailCheck,
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

const STATUS_OPTIONS: { value: 'actif' | 'inactif'; label: string }[] = [
  { value: 'actif', label: '✅ Actif' },
  { value: 'inactif', label: '🔴 Inactif' },
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

interface FoundUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string;
  phone: string | null;
}

/* ─── Sous-composant : ligne d'un code existant ─── */
function ExistingCodeRow({
  code,
  email,
  firstName,
  lastName,
  countryCode,
  onRefresh,
}: {
  code: ExistingCode;
  email: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [localStatus, setLocalStatus] = useState<'actif' | 'inactif'>(code.status);
  const [copied, setCopied] = useState(false);

  // Sync when parent refreshes
  useEffect(() => { setLocalStatus(code.status); }, [code.status]);

  const isDirty = localStatus !== code.status;

  // Mettre à jour uniquement (sans email)
  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('PATCH', `/api/admin/pcs-codes/${code.id}/status`, { status: localStatus });
    },
    onSuccess: () => {
      onRefresh();
      toast({ title: "Statut mis à jour", description: `Code …${code.code.slice(-9)} → ${localStatus}` });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  // Mettre à jour ET envoyer par email
  const updateSendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/admin/pcs-codes/${code.id}/update-and-send`, {
        status: localStatus,
        email,
        firstName: firstName || 'Cher',
        lastName: lastName || 'Client',
        countryCode,
      });
      return res.json();
    },
    onSuccess: () => {
      onRefresh();
      toast({ title: "Mis à jour et email envoyé ✓", description: `Code …${code.code.slice(-9)} → ${localStatus}` });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const busy = updateMutation.isPending || updateSendMutation.isPending;
  const canSendEmail = !!countryCode;

  function copy() {
    navigator.clipboard.writeText(code.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`rounded-xl border-2 p-3.5 transition-all ${
      localStatus === 'actif'
        ? 'border-green-200 bg-green-50/50'
        : 'border-gray-100 bg-gray-50'
    }`}>
      {/* Ligne 1 : code + copier + badge statut actuel en DB */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          code.status === 'actif' ? 'bg-green-100' : 'bg-gray-100'
        }`}>
          {code.status === 'actif'
            ? <ShieldCheck size={13} className="text-green-600" />
            : <ShieldOff size={13} className="text-gray-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs font-bold text-gray-800 truncate">{code.code}</p>
          <p className={`text-[10px] font-semibold ${code.status === 'actif' ? 'text-green-600' : 'text-gray-400'}`}>
            {code.status === 'actif' ? 'Actif en base' : 'Inactif en base'}
            <span className="text-gray-300 font-normal ml-1.5">·</span>
            <span className="text-gray-400 font-normal ml-1.5">
              {new Date(code.createdAt).toLocaleDateString('fr-FR')}
            </span>
          </p>
        </div>
        <button onClick={copy} className="p-1.5 rounded-lg hover:bg-white transition-colors" title="Copier le code">
          {copied ? <CheckCircle size={13} className="text-green-500" /> : <Copy size={13} className="text-gray-400" />}
        </button>
      </div>

      {/* Ligne 2 : sélecteur de nouveau statut */}
      <div className="flex items-center gap-2 mb-2.5">
        <Pencil size={11} className="text-gray-400 flex-shrink-0" />
        <span className="text-[11px] text-gray-500 flex-shrink-0">Nouveau statut :</span>
        <Select value={localStatus} onValueChange={(v) => setLocalStatus(v as 'actif' | 'inactif')}>
          <SelectTrigger className="h-8 text-xs flex-1 min-w-0 max-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isDirty && (
          <span className="text-[10px] text-amber-600 font-semibold px-2 py-0.5 bg-amber-50 rounded-full border border-amber-200">
            Modifié
          </span>
        )}
      </div>

      {/* Ligne 3 : boutons d'action */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateMutation.mutate()}
          disabled={busy}
          className="flex-1 h-8 text-xs gap-1.5 border-gray-200 text-gray-600 hover:bg-gray-100"
        >
          {updateMutation.isPending
            ? <Loader2 size={12} className="animate-spin" />
            : <CheckCircle size={12} />
          }
          Mettre à jour
        </Button>
        <Button
          size="sm"
          onClick={() => updateSendMutation.mutate()}
          disabled={busy || !canSendEmail}
          title={!canSendEmail ? "Sélectionnez un pays d'abord" : undefined}
          className="flex-1 h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {updateSendMutation.isPending
            ? <Loader2 size={12} className="animate-spin" />
            : <MailCheck size={12} />
          }
          Mettre à jour &amp; envoyer
        </Button>
      </div>
    </div>
  );
}

/* ─── Page principale ─── */
export default function AdminPcsSend() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Destinataire
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("");

  // Nouveau code
  const [newCode, setNewCode] = useState(generatePcsCode());
  const [newStatus, setNewStatus] = useState<'actif' | 'inactif'>('actif');
  const [copiedNew, setCopiedNew] = useState(false);

  // Lookup utilisateur
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-lookup email
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = email.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!valid) { setLookupState('idle'); setFoundUser(null); return; }

    setLookupState('loading');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/user-by-email?email=${encodeURIComponent(trimmed)}`, { credentials: 'include' });
        if (res.ok) {
          const user: FoundUser = await res.json();
          setFoundUser(user);
          setLookupState('found');
          if (user.firstName) setFirstName(user.firstName);
          else if (user.fullName) {
            const p = user.fullName.trim().split(' ');
            setFirstName(p[0] || ''); setLastName(p.slice(1).join(' ') || '');
          }
          if (user.lastName) setLastName(user.lastName);
        } else {
          setFoundUser(null); setLookupState('notfound');
        }
      } catch { setLookupState('notfound'); }
    }, 600);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [email]);

  // Codes PCS existants
  const { data: existingCodes = [], isLoading: codesLoading, refetch: refetchCodes } = useQuery<ExistingCode[]>({
    queryKey: ['/api/admin/users', foundUser?.id, 'pcs-codes'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/users/${foundUser!.id}/pcs-codes`);
      return res.json();
    },
    enabled: !!foundUser,
    staleTime: 0,
  });

  function refreshCodes() {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/users', foundUser?.id, 'pcs-codes'] });
    refetchCodes();
  }

  // Créer uniquement (sans email)
  const createOnlyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/send-pcs', {
        email,
        firstName: firstName || 'Cher',
        lastName: lastName || 'Client',
        countryCode: countryCode || 'BJ',
        codes: [newCode],
        statuses: [newStatus],
        skipEmail: true,
      });
      return res.json();
    },
    onSuccess: () => {
      refreshCodes();
      setNewCode(generatePcsCode());
      setNewStatus('actif');
      toast({ title: "Code PCS créé", description: "Code enregistré sans envoi d'email." });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  // Créer ET envoyer par email
  const createSendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/send-pcs', {
        email,
        firstName: firstName || 'Cher',
        lastName: lastName || 'Client',
        countryCode,
        codes: [newCode],
        statuses: [newStatus],
      });
      return res.json();
    },
    onSuccess: () => {
      refreshCodes();
      setNewCode(generatePcsCode());
      setNewStatus('actif');
      toast({ title: "Code créé et email envoyé ✓", description: `Nouveau PCS envoyé à ${email}` });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const userFound = lookupState === 'found' && !!foundUser;
  const busyNew = createOnlyMutation.isPending || createSendMutation.isPending;
  const hasEmail = email.includes('@');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => setLocation('/admin')} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Mail size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">Gestion Codes PCS</h1>
              <p className="text-xs text-gray-500">Modifier, créer et envoyer par email</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* ══════════════════════════════════════════
            SECTION 1 — Destinataire
        ══════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
            Destinataire
          </h2>

          <div className="space-y-3">
            {/* Email */}
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
                  {lookupState === 'notfound' && <Mail size={16} className="text-gray-300" />}
                </div>
              </div>

              {userFound && foundUser && (
                <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <UserCheck size={14} className="text-green-600 shrink-0" />
                  <div>
                    <p className="text-xs text-green-800 font-bold">
                      {foundUser.fullName || `${foundUser.firstName || ''} ${foundUser.lastName || ''}`.trim() || foundUser.email}
                    </p>
                    {foundUser.phone && <p className="text-[10px] text-green-600">{foundUser.phone}</p>}
                  </div>
                </div>
              )}
              {lookupState === 'notfound' && (
                <p className="mt-1.5 text-xs text-amber-600">Aucun compte Sika Texte trouvé — remplissez le nom manuellement.</p>
              )}
            </div>

            {/* Prénom / Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Prénom</Label>
                <Input placeholder="Prénom" value={firstName} onChange={e => setFirstName(e.target.value)} className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Nom</Label>
                <Input placeholder="Nom" value={lastName} onChange={e => setLastName(e.target.value)} className="h-10" />
              </div>
            </div>

            {/* Pays */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Pays *</Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="h-10">
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

        {/* ══════════════════════════════════════════
            SECTION 2 — Codes PCS existants
            (visible uniquement si utilisateur trouvé)
        ══════════════════════════════════════════ */}
        {userFound && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* En-tête section */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 bg-indigo-50/60">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</span>
                Codes PCS existants
                {codesLoading && <Loader2 size={12} className="animate-spin text-indigo-400 ml-1" />}
              </h2>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                {existingCodes.length} code{existingCodes.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="p-4">
              {!codesLoading && existingCodes.length === 0 && (
                <div className="text-center py-6">
                  <ShieldOff size={28} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Aucun code PCS associé à cet utilisateur.</p>
                  <p className="text-[11px] text-gray-300 mt-1">Créez-en un ci-dessous.</p>
                </div>
              )}

              {existingCodes.length > 0 && (
                <div className="space-y-3">
                  {/* Légende */}
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 pb-1">
                    <Pencil size={9} />
                    <span>Modifiez le statut puis cliquez sur <strong>Mettre à jour</strong> ou <strong>Mettre à jour &amp; envoyer</strong></span>
                  </div>

                  {existingCodes.map(code => (
                    <ExistingCodeRow
                      key={code.id}
                      code={code}
                      email={email}
                      firstName={firstName}
                      lastName={lastName}
                      countryCode={countryCode}
                      onRefresh={refreshCodes}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            SECTION 3 — Créer un nouveau code PCS
        ══════════════════════════════════════════ */}
        {hasEmail && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* En-tête section */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-50 bg-blue-50/60">
              <span className={`w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold`}>
                {userFound ? '3' : '2'}
              </span>
              <h2 className="font-bold text-gray-800 text-sm">Créer un nouveau PCS</h2>
            </div>

            <div className="p-4 space-y-3.5">
              {/* Code PCS */}
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Code PCS</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCode}
                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                    className="h-10 font-mono text-sm bg-slate-50 border-slate-200 flex-1"
                    placeholder="PCS-XXXX-XXXX-XXXX-XXXX"
                  />
                  <button
                    onClick={() => setNewCode(generatePcsCode())}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Regénérer aléatoirement"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(newCode); setCopiedNew(true); setTimeout(() => setCopiedNew(false), 1500); }}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    title="Copier"
                  >
                    {copiedNew ? <CheckCircle size={15} className="text-green-500" /> : <Copy size={15} className="text-gray-400" />}
                  </button>
                </div>
              </div>

              {/* Statut initial */}
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Statut initial</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as 'actif' | 'inactif')}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-2 pt-1">
                {/* Créer uniquement */}
                <Button
                  variant="outline"
                  onClick={() => createOnlyMutation.mutate()}
                  disabled={busyNew || !newCode.trim()}
                  className="flex-1 h-11 font-semibold text-sm gap-2 border-gray-200 text-gray-600"
                >
                  {createOnlyMutation.isPending
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Plus size={15} />
                  }
                  Créer uniquement
                </Button>

                {/* Créer et envoyer */}
                <Button
                  onClick={() => createSendMutation.mutate()}
                  disabled={busyNew || !newCode.trim() || !countryCode}
                  title={!countryCode ? "Sélectionnez un pays d'abord" : undefined}
                  className="flex-1 h-11 font-bold text-sm gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow"
                >
                  {createSendMutation.isPending
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Send size={15} />
                  }
                  Créer et envoyer
                </Button>
              </div>

              {!countryCode && (
                <p className="text-[11px] text-amber-600 text-center">
                  ⚠️ Sélectionnez un pays pour pouvoir envoyer par email.
                </p>
              )}
            </div>
          </div>
        )}

        {/* État initial : aucune email saisie */}
        {!hasEmail && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <Mail size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">Saisissez l'email du destinataire</p>
            <p className="text-xs text-gray-300 mt-1">Les codes PCS existants et les options de création apparaîtront ici.</p>
          </div>
        )}

      </div>
    </div>
  );
}
