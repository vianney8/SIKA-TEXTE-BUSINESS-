import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, Mail, Plus, CheckCircle, Copy, RefreshCw, Send,
  UserCheck, Loader2, ShieldCheck, ShieldOff, Pencil, MailCheck,
  Sparkles, Zap, Trash2, AlertTriangle, Users, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, KeyRound, Bolt,
} from "lucide-react";

const COUNTRIES = [
  { code: "BJ", name: "Bénin" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "SN", name: "Sénégal" },
  { code: "BF", name: "Burkina Faso" },
  { code: "TG", name: "Togo" },
  { code: "CM", name: "Cameroun" },
];

const STATUS_OPTIONS: { value: 'actif' | 'inactif'; label: string; color: string }[] = [
  { value: 'actif',   label: 'Actif',   color: 'text-emerald-600' },
  { value: 'inactif', label: 'Inactif', color: 'text-rose-500' },
];

function generatePcsCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `PCS-${seg()}-${seg()}-${seg()}-${seg()}`;
}

interface ExistingCode { id: string; code: string; status: 'actif' | 'inactif'; createdAt: string; }
interface FoundUser { id: string; firstName: string | null; lastName: string | null; fullName: string | null; email: string; phone: string | null; }

/* ══════════════ EXISTING CODE ROW ══════════════ */
function ExistingCodeRow({ code, email, firstName, lastName, countryCode, index, onRefresh }: {
  code: ExistingCode; email: string; firstName: string; lastName: string;
  countryCode: string; index: number; onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [localStatus, setLocalStatus] = useState<'actif' | 'inactif'>(code.status);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { setLocalStatus(code.status); }, [code.status]);

  const isDirty = localStatus !== code.status;
  const isActif = localStatus === 'actif';

  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('PATCH', `/api/admin/pcs-codes/${code.id}/status`, { status: localStatus });
    },
    onSuccess: () => {
      onRefresh();
      toast({ title: "✅ Statut mis à jour", description: `Code …${code.code.slice(-9)} → ${localStatus}` });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/admin/pcs-codes/${code.id}/update-and-send`, {
        status: localStatus, email,
        firstName: firstName || 'Cher', lastName: lastName || 'Client', countryCode,
      });
      return res.json();
    },
    onSuccess: () => {
      onRefresh();
      toast({ title: "📧 Email envoyé avec succès", description: `Code …${code.code.slice(-9)} → ${localStatus}` });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/admin/pcs-codes/${code.id}`);
    },
    onSuccess: () => {
      onRefresh();
      toast({ title: "🗑️ Code PCS supprimé", description: `Code ${code.code} supprimé définitivement.` });
    },
    onError: (err: any) => {
      setConfirmDelete(false);
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const busy = updateMutation.isPending || sendMutation.isPending || deleteMutation.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: 'easeOut' }}
      layout
      className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
        isActif
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50/40 shadow-emerald-100/80 shadow-md'
          : 'border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50/40 shadow-sm'
      }`}
    >
      {/* Bande colorée gauche */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
        isActif ? 'bg-gradient-to-b from-emerald-400 to-green-500' : 'bg-gradient-to-b from-slate-300 to-gray-400'
      }`} />

      <div className="pl-4 pr-3 py-3.5">
        {/* Ligne 1 : code + badge + copier */}
        <div className="flex items-start gap-2 mb-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
            isActif ? 'bg-gradient-to-br from-emerald-400 to-green-500' : 'bg-gradient-to-br from-slate-300 to-gray-400'
          }`}>
            {isActif
              ? <ShieldCheck size={14} className="text-white" />
              : <ShieldOff size={14} className="text-white" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-mono text-[13px] font-extrabold text-gray-800 tracking-wide leading-tight">
              {code.code}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                code.status === 'actif'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${code.status === 'actif' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {code.status === 'actif' ? 'Actif' : 'Inactif'} en base
              </span>
              <span className="text-[10px] text-gray-400">
                {new Date(code.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>

          {/* Copier */}
          <button
            onClick={() => { navigator.clipboard.writeText(code.code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="p-1.5 rounded-lg hover:bg-white/80 transition-colors"
            title="Copier le code"
          >
            {copied
              ? <CheckCircle size={14} className="text-emerald-500" />
              : <Copy size={14} className="text-gray-400 hover:text-gray-600" />
            }
          </button>

          {/* Supprimer */}
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="p-1.5 rounded-lg hover:bg-rose-50 transition-colors group"
            title="Supprimer ce code PCS"
          >
            <Trash2 size={14} className="text-gray-300 group-hover:text-rose-500 transition-colors" />
          </button>
        </div>

        {/* Ligne 2 : sélecteur statut */}
        <div className="flex items-center gap-2 mb-3">
          <Pencil size={10} className="text-gray-400 flex-shrink-0" />
          <span className="text-[11px] text-gray-500 flex-shrink-0 font-medium">Changer :</span>
          <Select value={localStatus} onValueChange={(v) => setLocalStatus(v as 'actif' | 'inactif')}>
            <SelectTrigger className={`h-7 text-xs flex-1 max-w-[130px] font-semibold border-2 transition-colors ${
              localStatus === 'actif'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-600'
            }`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className={`text-xs font-semibold ${o.color}`}>
                  {o.value === 'actif' ? '✅' : '🔴'} {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AnimatePresence>
            {isDirty && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"
              >
                ✏️ Modifié
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Ligne 3 : boutons action */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateMutation.mutate()}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 h-9 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-bold transition-all hover:shadow-sm disabled:opacity-50"
          >
            {updateMutation.isPending
              ? <Loader2 size={11} className="animate-spin" />
              : <CheckCircle size={11} />
            }
            Mettre à jour
          </button>
          <button
            onClick={() => sendMutation.mutate()}
            disabled={busy || !countryCode}
            title={!countryCode ? "Sélectionnez un pays d'abord" : undefined}
            className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-[11px] font-bold transition-all shadow-md shadow-blue-200 hover:shadow-blue-300 disabled:opacity-50 disabled:shadow-none"
          >
            {sendMutation.isPending
              ? <Loader2 size={11} className="animate-spin" />
              : <><MailCheck size={11} /><Mail size={9} className="opacity-60" /></>
            }
            <span>Mettre à jour &amp; <span className="underline underline-offset-2">envoyer email</span></span>
          </button>
        </div>
      </div>

      {/* ── Confirmation de suppression (overlay) ── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 p-5 z-10"
          >
            {/* Icône danger */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-red-600 flex items-center justify-center shadow-lg shadow-rose-200"
            >
              <Trash2 size={24} className="text-white" />
            </motion.div>

            {/* Texte */}
            <div className="text-center">
              <p className="font-extrabold text-gray-800 text-sm">Supprimer ce code ?</p>
              <p className="text-[11px] text-gray-500 mt-1 font-mono font-semibold">{code.code}</p>
              <p className="text-[10px] text-rose-500 mt-1.5 flex items-center justify-center gap-1 font-medium">
                <AlertTriangle size={9} /> Cette action est irréversible
              </p>
            </div>

            {/* Boutons */}
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleteMutation.isPending}
                className="flex-1 h-10 rounded-xl border-2 border-gray-200 bg-white text-gray-600 text-xs font-bold hover:bg-gray-50 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-200 disabled:opacity-60"
              >
                {deleteMutation.isPending
                  ? <><Loader2 size={12} className="animate-spin" /> Suppression…</>
                  : <><Trash2 size={12} /> Supprimer définitivement</>
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ══════════════ PAGE PRINCIPALE ══════════════ */
export default function AdminPcsSend() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [newCode, setNewCode] = useState(generatePcsCode());
  const [newStatus, setNewStatus] = useState<'actif' | 'inactif'>('actif');
  const [copiedNew, setCopiedNew] = useState(false);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          setFoundUser(user); setLookupState('found');
          if (user.firstName || user.lastName) {
            if (user.firstName) setFirstName(user.firstName);
            if (user.lastName) setLastName(user.lastName);
          } else if (user.fullName) {
            // Convention ouest-africaine : NOM DE FAMILLE en premier, PRÉNOM ensuite
            // Ex: "Kouamé Amoin Lina Sandrine" → Nom=Kouamé, Prénom=Amoin Lina Sandrine
            const p = user.fullName.trim().split(' ');
            setLastName(p[0] || '');
            setFirstName(p.slice(1).join(' ') || '');
          }
        } else { setFoundUser(null); setLookupState('notfound'); }
      } catch { setLookupState('notfound'); }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [email]);

  const { data: existingCodes = [], isLoading: codesLoading, refetch } = useQuery<ExistingCode[]>({
    queryKey: ['/api/admin/users', foundUser?.id, 'pcs-codes'],
    queryFn: async () => { const res = await apiRequest('GET', `/api/admin/users/${foundUser!.id}/pcs-codes`); return res.json(); },
    enabled: !!foundUser,
    staleTime: 0,
  });

  function refreshCodes() {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/users', foundUser?.id, 'pcs-codes'] });
    refetch();
  }

  const createOnlyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/send-pcs', {
        email, firstName: firstName || 'Cher', lastName: lastName || 'Client',
        countryCode: countryCode || 'BJ', codes: [newCode], statuses: [newStatus], skipEmail: true,
      });
      return res.json();
    },
    onSuccess: () => {
      refreshCodes(); setNewCode(generatePcsCode()); setNewStatus('actif');
      toast({ title: "✅ Code PCS créé", description: "Enregistré sans envoi d'email." });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const createSendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/send-pcs', {
        email, firstName: firstName || 'Cher', lastName: lastName || 'Client',
        countryCode, codes: [newCode], statuses: [newStatus],
      });
      return res.json();
    },
    onSuccess: () => {
      refreshCodes(); setNewCode(generatePcsCode()); setNewStatus('actif');
      toast({ title: "📧 Code créé et email envoyé !", description: `Nouveau PCS envoyé à ${email}` });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const userFound = lookupState === 'found' && !!foundUser;
  const busyNew = createOnlyMutation.isPending || createSendMutation.isPending;

  /* ── Section 4 : Retraits Automatiques ── */
  const [autoPage, setAutoPage] = useState(1);
  const { data: autoData, isLoading: autoLoading, refetch: refetchAuto } = useQuery<{
    users: { id: string; email: string; full_name: string | null; phone: string | null; auto_withdrawal_mode: string }[];
    total: number; pages: number;
  }>({
    queryKey: ['/api/admin/auto-withdrawal-users', autoPage],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/auto-withdrawal-users?page=${autoPage}`);
      return res.json();
    },
    staleTime: 0,
  });

  /* ── Section 5 : Titulaires de Codes PCS ── */
  const [pcsPage, setPcsPage] = useState(1);
  const { data: pcsData, isLoading: pcsLoading, refetch: refetchPcs } = useQuery<{
    users: { id: string; email: string; full_name: string | null; phone: string | null; auto_withdrawal_mode: string; pcs_count: number }[];
    total: number; pages: number;
  }>({
    queryKey: ['/api/admin/pcs-holders', pcsPage],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/pcs-holders?page=${pcsPage}`);
      return res.json();
    },
    staleTime: 0,
  });

  const toggleWithdrawalMutation = useMutation({
    mutationFn: async ({ userId, mode }: { userId: string; mode: 'auto' | 'manual' }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/withdrawal-mode`, { mode });
      return res.json();
    },
    onSuccess: () => {
      refetchAuto();
      refetchPcs();
      toast({ title: "✅ Mode de retrait mis à jour" });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/30 to-indigo-50/20">

      {/* ── Header premium ── */}
      <div className="sticky top-0 z-20">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 shadow-xl shadow-blue-900/20">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setLocation('/admin')}
              className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <ArrowLeft size={18} className="text-white" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-white text-base tracking-tight">Gestion Codes PCS</h1>
                <p className="text-blue-100 text-[11px] font-medium">Modifier · Créer · Envoyer par email</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-10">

        {/* ══════════════════════════════
            SECTION 1 — Destinataire
        ══════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-100 border border-slate-100 overflow-hidden">
            {/* En-tête */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-3.5 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                <span className="text-white text-xs font-black">1</span>
              </div>
              <span className="text-white font-bold text-sm">Destinataire</span>
            </div>

            <div className="p-5 space-y-3.5">
              {/* Email */}
              <div>
                <Label className="text-xs font-bold text-slate-600 mb-1.5 block tracking-wide uppercase">
                  Adresse email *
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Mail size={16} className="text-slate-400" />
                  </div>
                  <Input
                    type="email"
                    placeholder="exemple@gmail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-12 pl-9 pr-10 text-sm border-2 border-slate-200 focus:border-blue-400 rounded-xl transition-colors"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {lookupState === 'loading' && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                    {lookupState === 'found' && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <UserCheck size={16} className="text-emerald-500" />
                      </motion.div>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {userFound && foundUser && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mt-2 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow">
                          <UserCheck size={14} className="text-white" />
                        </div>
                        <div>
                          <p className="text-emerald-800 font-bold text-xs">
                            {foundUser.fullName || `${foundUser.firstName || ''} ${foundUser.lastName || ''}`.trim() || foundUser.email}
                          </p>
                          {foundUser.phone && <p className="text-emerald-600 text-[10px]">{foundUser.phone}</p>}
                        </div>
                        <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Trouvé ✓
                        </span>
                      </div>
                    </motion.div>
                  )}
                  {lookupState === 'notfound' && (
                    <motion.p
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="mt-1.5 text-xs text-amber-600 font-medium"
                    >
                      ⚠️ Aucun compte Sika Texte trouvé — remplissez le nom manuellement.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Prénom / Nom */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Prénom", val: firstName, set: setFirstName },
                  { label: "Nom", val: lastName, set: setLastName },
                ].map(f => (
                  <div key={f.label}>
                    <Label className="text-xs font-bold text-slate-600 mb-1.5 block tracking-wide uppercase">{f.label}</Label>
                    <Input
                      placeholder={f.label}
                      value={f.val}
                      onChange={e => f.set(e.target.value)}
                      className="h-10 border-2 border-slate-200 focus:border-blue-400 rounded-xl text-sm transition-colors"
                    />
                  </div>
                ))}
              </div>

              {/* Pays */}
              <div>
                <Label className="text-xs font-bold text-slate-600 mb-1.5 block tracking-wide uppercase">Pays *</Label>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-blue-400 rounded-xl text-sm">
                    <SelectValue placeholder="🌍 Sélectionner un pays" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.code} value={c.code} className="text-sm">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ══════════════════════════════
            SECTION 2 — Codes existants
        ══════════════════════════════ */}
        <AnimatePresence>
          {userFound && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <div className="bg-white rounded-2xl shadow-lg shadow-indigo-100 border border-indigo-100 overflow-hidden">
                {/* En-tête */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                      <span className="text-white text-xs font-black">2</span>
                    </div>
                    <div>
                      <span className="text-white font-bold text-sm">Codes PCS existants</span>
                      {codesLoading && <Loader2 size={11} className="animate-spin text-indigo-200 inline ml-2" />}
                    </div>
                  </div>
                  <motion.div
                    key={existingCodes.length}
                    initial={{ scale: 0.7 }} animate={{ scale: 1 }}
                    className="bg-white/20 text-white text-[11px] font-extrabold px-3 py-1 rounded-full"
                  >
                    {existingCodes.length} code{existingCodes.length !== 1 ? 's' : ''}
                  </motion.div>
                </div>

                <div className="p-4">
                  {!codesLoading && existingCodes.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <ShieldOff size={24} className="text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400 font-semibold">Aucun code PCS associé</p>
                      <p className="text-xs text-slate-300 mt-1">Créez-en un nouveau ci-dessous.</p>
                    </div>
                  )}

                  {existingCodes.length > 0 && (
                    <div className="space-y-3">
                      {/* Aide */}
                      <div className="flex items-center gap-2 text-[10px] text-indigo-500 bg-indigo-50 rounded-lg px-3 py-2 font-medium">
                        <Pencil size={9} />
                        Modifiez le statut → cliquez <strong>Mettre à jour</strong> ou <strong className="text-blue-600">Mettre à jour &amp; envoyer email</strong>
                      </div>

                      {existingCodes.map((code, i) => (
                        <ExistingCodeRow
                          key={code.id}
                          code={code}
                          index={i}
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════
            SECTION 3 — Créer nouveau
            (uniquement si compte Sika trouvé)
        ══════════════════════════════ */}
        <AnimatePresence>
          {userFound && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              <div className="bg-white rounded-2xl shadow-lg shadow-blue-100 border border-blue-100 overflow-hidden">
                {/* En-tête */}
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3.5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                    <span className="text-white text-xs font-black">3</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-white/80" />
                    <span className="text-white font-bold text-sm">Créer un nouveau code PCS</span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Code PCS */}
                  <div>
                    <Label className="text-xs font-bold text-slate-600 mb-2 block tracking-wide uppercase">
                      Code PCS généré
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <Input
                          value={newCode}
                          onChange={e => setNewCode(e.target.value.toUpperCase())}
                          className="h-12 font-mono text-sm font-bold tracking-widest bg-slate-50 border-2 border-slate-200 focus:border-blue-400 rounded-xl pr-2 text-center text-slate-800"
                        />
                      </div>
                      <button
                        onClick={() => setNewCode(generatePcsCode())}
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 hover:from-blue-100 hover:to-indigo-100 border-2 border-slate-200 hover:border-blue-300 flex items-center justify-center text-slate-500 hover:text-blue-600 transition-all"
                        title="Régénérer"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={() => { navigator.clipboard.writeText(newCode); setCopiedNew(true); setTimeout(() => setCopiedNew(false), 1500); }}
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 hover:from-emerald-100 hover:to-green-100 border-2 border-slate-200 hover:border-emerald-300 flex items-center justify-center text-slate-500 hover:text-emerald-600 transition-all"
                        title="Copier"
                      >
                        {copiedNew ? <CheckCircle size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Statut initial */}
                  <div>
                    <Label className="text-xs font-bold text-slate-600 mb-2 block tracking-wide uppercase">
                      Statut initial
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setNewStatus(opt.value)}
                          className={`h-11 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                            newStatus === opt.value
                              ? opt.value === 'actif'
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-md shadow-emerald-100'
                                : 'border-rose-400 bg-rose-50 text-rose-600 shadow-md shadow-rose-100'
                              : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <span>{opt.value === 'actif' ? '✅' : '🔴'}</span>
                          {opt.label}
                          {newStatus === opt.value && (
                            <span className="w-2 h-2 rounded-full bg-current opacity-60" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="space-y-2.5 pt-1">
                    {/* Créer uniquement */}
                    <button
                      onClick={() => createOnlyMutation.mutate()}
                      disabled={busyNew || !newCode.trim()}
                      className="w-full h-12 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center justify-center gap-2.5 transition-all hover:shadow-md hover:border-slate-300 disabled:opacity-50"
                    >
                      {createOnlyMutation.isPending
                        ? <Loader2 size={16} className="animate-spin" />
                        : <Plus size={16} className="text-slate-500" />
                      }
                      Créer uniquement
                      <span className="text-xs text-slate-400 font-normal">(sans email)</span>
                    </button>

                    {/* Créer + Envoyer par email */}
                    <button
                      onClick={() => createSendMutation.mutate()}
                      disabled={busyNew || !newCode.trim() || !countryCode}
                      title={!countryCode ? "Sélectionnez un pays d'abord" : undefined}
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700 text-white font-extrabold text-[15px] flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-300 hover:shadow-blue-400 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:shadow-none disabled:scale-100"
                    >
                      {createSendMutation.isPending ? (
                        <><Loader2 size={18} className="animate-spin" /> Envoi en cours…</>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <Send size={15} className="text-white" />
                          </div>
                          <div className="text-left">
                            <div className="text-white text-sm font-black leading-tight">Créer et envoyer par email</div>
                            <div className="text-blue-100 text-[10px] font-medium leading-tight flex items-center gap-1">
                              <Mail size={8} /> Email envoyé automatiquement au destinataire
                            </div>
                          </div>
                        </>
                      )}
                    </button>

                    {!countryCode && (
                      <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-[11px] text-amber-600 text-center font-medium bg-amber-50 rounded-lg py-2 border border-amber-100"
                      >
                        ⚠️ Sélectionnez un pays pour envoyer l'email
                      </motion.p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── État initial : aucune email saisie ── */}
        <AnimatePresence>
          {lookupState === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                  <Zap size={26} className="text-white" />
                </div>
                <p className="text-base font-bold text-blue-800">Saisissez l'email du destinataire</p>
                <p className="text-xs text-blue-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  Les codes PCS existants et les options de création apparaîtront automatiquement.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Email valide mais AUCUN compte Sika trouvé → génération bloquée ── */}
        <AnimatePresence>
          {lookupState === 'notfound' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div className="rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-red-50 overflow-hidden shadow-md shadow-rose-100">
                {/* Bande rouge */}
                <div className="bg-gradient-to-r from-rose-500 to-red-600 px-5 py-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                    <AlertTriangle size={14} className="text-white" />
                  </div>
                  <span className="text-white font-extrabold text-sm">Création bloquée</span>
                </div>

                <div className="p-6 text-center">
                  {/* Icône */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-red-100 border-2 border-rose-200 flex items-center justify-center mx-auto mb-4">
                    <div className="relative">
                      <Mail size={24} className="text-rose-400" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center">
                        <span className="text-white text-[9px] font-black">✕</span>
                      </div>
                    </div>
                  </div>

                  <p className="font-extrabold text-rose-800 text-sm mb-1.5">
                    Email non lié à un compte Sika Texte
                  </p>
                  <p className="text-xs text-rose-500 leading-relaxed max-w-xs mx-auto">
                    La génération et l'envoi de codes PCS sont réservés aux abonnés Sika Texte enregistrés.
                    Vérifiez l'adresse email ou demandez à l'utilisateur de créer un compte.
                  </p>

                  {/* Séparateur */}
                  <div className="border-t border-rose-200 my-4" />

                  <div className="flex items-center justify-center gap-2 text-[11px] text-rose-600 font-semibold">
                    <AlertTriangle size={11} />
                    Aucun code PCS ne peut être créé pour cet email
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════
            SÉPARATEUR GLOBAL
        ══════════════════════════════════════════════ */}
        <div className="flex items-center gap-3 pt-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
            <Users size={11} className="text-slate-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Gestion Globale</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        </div>

        {/* ══════════════════════════════════════════════
            SECTION 4 — Retraits Automatiques Activés
        ══════════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="bg-white rounded-2xl shadow-lg shadow-orange-100 border border-orange-100 overflow-hidden">
            {/* En-tête */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3.5 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <Bolt size={13} className="text-white" />
              </div>
              <div className="flex-1">
                <span className="text-white font-bold text-sm">Retraits Automatiques Activés</span>
                {autoData && (
                  <span className="ml-2 bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {autoData.total} utilisateur{autoData.total !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button onClick={() => refetchAuto()} className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                <RefreshCw size={12} className="text-white" />
              </button>
            </div>

            <div className="p-4">
              {autoLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
                </div>
              ) : !autoData || autoData.users.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 border-2 border-orange-100 flex items-center justify-center mx-auto mb-3">
                    <Bolt size={20} className="text-orange-300" />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Aucun retrait automatique activé</p>
                  <p className="text-slate-400 text-xs mt-1">Les utilisateurs avec le mode auto apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {autoData.users.map(user => (
                    <div key={user.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-orange-50 border border-orange-100">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-white text-xs font-black">
                          {(user.full_name || user.email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 font-bold text-xs truncate">{user.full_name || user.email}</p>
                        <p className="text-slate-400 text-[10px] truncate font-mono">{user.email}</p>
                        {user.phone && <p className="text-slate-400 text-[10px]">{user.phone}</p>}
                      </div>
                      {/* Badge + Toggle */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[9px] font-black text-orange-600 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-full">
                          ⚡ AUTO
                        </span>
                        <button
                          onClick={() => toggleWithdrawalMutation.mutate({ userId: user.id, mode: 'manual' })}
                          disabled={toggleWithdrawalMutation.isPending}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold border-2 border-slate-200 text-slate-600 bg-white hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
                          title="Désactiver le retrait automatique"
                        >
                          <ToggleRight size={14} className="text-orange-500" />
                          Désactiver
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {autoData && autoData.pages > 1 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setAutoPage(p => Math.max(1, p - 1))}
                    disabled={autoPage === 1}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} /> Préc.
                  </button>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Page {autoPage} / {autoData.pages}
                  </span>
                  <button
                    onClick={() => setAutoPage(p => Math.min(autoData.pages, p + 1))}
                    disabled={autoPage === autoData.pages}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Suiv. <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════
            SECTION 5 — Titulaires de Codes PCS
        ══════════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
          <div className="bg-white rounded-2xl shadow-lg shadow-violet-100 border border-violet-100 overflow-hidden">
            {/* En-tête */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3.5 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <KeyRound size={13} className="text-white" />
              </div>
              <div className="flex-1">
                <span className="text-white font-bold text-sm">Titulaires de Codes PCS</span>
                {pcsData && (
                  <span className="ml-2 bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {pcsData.total} utilisateur{pcsData.total !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button onClick={() => refetchPcs()} className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                <RefreshCw size={12} className="text-white" />
              </button>
            </div>

            {/* Légende */}
            <div className="px-5 pt-3 pb-0">
              <div className="flex items-center gap-2 text-[10px] text-violet-600 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 font-medium">
                <KeyRound size={9} />
                Activez le retrait automatique pour les utilisateurs ayant un code PCS valide
              </div>
            </div>

            <div className="p-4">
              {pcsLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
                </div>
              ) : !pcsData || pcsData.users.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 border-2 border-violet-100 flex items-center justify-center mx-auto mb-3">
                    <KeyRound size={20} className="text-violet-300" />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Aucun titulaire de code PCS</p>
                  <p className="text-slate-400 text-xs mt-1">Les utilisateurs avec au moins un code PCS apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pcsData.users.map(user => {
                    const isAuto = user.auto_withdrawal_mode === 'auto';
                    return (
                      <div key={user.id}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${isAuto ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${isAuto ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-violet-500 to-purple-600'}`}>
                          <span className="text-white text-xs font-black">
                            {(user.full_name || user.email || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-slate-800 font-bold text-xs truncate">{user.full_name || user.email}</p>
                            <span className="text-[9px] font-black text-violet-600 bg-violet-100 border border-violet-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              🔑 {user.pcs_count} PCS
                            </span>
                          </div>
                          <p className="text-slate-400 text-[10px] truncate font-mono">{user.email}</p>
                        </div>
                        {/* Toggle */}
                        <div className="flex-shrink-0">
                          {isAuto ? (
                            <button
                              onClick={() => toggleWithdrawalMutation.mutate({ userId: user.id, mode: 'manual' })}
                              disabled={toggleWithdrawalMutation.isPending}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold border-2 border-slate-200 text-slate-600 bg-white hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
                            >
                              <ToggleRight size={14} className="text-orange-500" />
                              Désactiver
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleWithdrawalMutation.mutate({ userId: user.id, mode: 'auto' })}
                              disabled={toggleWithdrawalMutation.isPending}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold border-2 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:scale-95 transition-all disabled:opacity-50"
                            >
                              <ToggleLeft size={14} className="text-emerald-500" />
                              Activer auto
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {pcsData && pcsData.pages > 1 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setPcsPage(p => Math.max(1, p - 1))}
                    disabled={pcsPage === 1}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} /> Préc.
                  </button>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Page {pcsPage} / {pcsData.pages}
                  </span>
                  <button
                    onClick={() => setPcsPage(p => Math.min(pcsData.pages, p + 1))}
                    disabled={pcsPage === pcsData.pages}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Suiv. <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
