import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, DollarSign, TrendingUp, TrendingDown, Search, Edit, Trash, Lock, Unlock, CheckCircle, XCircle, Settings, MessageCircle, MessageSquare, MessageSquareOff, RefreshCw, Link2, Plus, Copy, ToggleLeft, ToggleRight, ExternalLink, History, ChevronLeft, ChevronRight, Mail, Bot, Bell, BellOff, Send, LayoutDashboard, Wifi } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface AdminStats {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
  completedDeposits: number;
  completedWithdrawals: number;
}

interface AdminUser {
  id: string;
  phone: string;
  email: string;
  fullName: string;
  balance: string;
  referralCode: string;
  role: string;
  isBlocked: boolean;
  createdAt: string;
  referralsCount: number;
  isActive?: boolean;
  autoWithdrawalMode?: string;
}

interface OnlineUser {
  id: string;
  phone: string;
  email: string;
  fullName: string;
  balance: string;
  referralCode: string;
  role: string;
  lastActivity: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [userFilter, setUserFilter] = useState<"all" | "blocked" | "active">("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [shouldLoadUsers, setShouldLoadUsers] = useState(false);
  
  // Modals state
  const [balanceModal, setBalanceModal] = useState(false);
  const [balanceNoHistoryModal, setBalanceNoHistoryModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [creditModal, setCreditModal] = useState(false);
  const [editBankCardModal, setEditBankCardModal] = useState(false);
  const [pcsCodesModal, setPcsCodesModal] = useState(false);
  const [pcsCodesUser, setPcsCodesUser] = useState<AdminUser | null>(null);
  const [newPcsCode, setNewPcsCode] = useState("");
  const [newPcsStatus, setNewPcsStatus] = useState<'actif' | 'inactif'>('actif');
  const [newPcsCopied, setNewPcsCopied] = useState(false);
  const [showNewPcsForm, setShowNewPcsForm] = useState(false);
  const [pcsConfirm, setPcsConfirm] = useState<{ codeId: string; code: string; currentStatus: 'actif' | 'inactif'; newStatus: 'actif' | 'inactif' } | null>(null);
  const [pcsNotify, setPcsNotify] = useState<{ code: string; newStatus: 'actif' | 'inactif' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; userName: string; userEmail: string } | null>(null);
  
  // Form state
  const [balanceAmount, setBalanceAmount] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [editingBankCard, setEditingBankCard] = useState<any>(null);
  const [cardFirstName, setCardFirstName] = useState("");
  const [cardLastName, setCardLastName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  
  // Settings state
  const [settingsModal, setSettingsModal] = useState(false);
  const [settings, setSettings] = useState<{[key: string]: string}>({});
  const [identityModal, setIdentityModal] = useState(false);
  const [withdrawalsModal, setWithdrawalsModal] = useState(false);
  const [onlineUsersModal, setOnlineUsersModal] = useState(false);
  
  // Notification en masse
  const [notifyAllModal, setNotifyAllModal] = useState(false);
  const [notifyAllMessage, setNotifyAllMessage] = useState("");

  // Notifications plateforme
  const [pnMessage, setPnMessage] = useState("");
  const [pnColor, setPnColor] = useState<'green' | 'red'>('green');
  const [pnEditId, setPnEditId] = useState<string | null>(null);
  const [pnEditMessage, setPnEditMessage] = useState("");
  const [pnEditColor, setPnEditColor] = useState<'green' | 'red'>('green');

  // Payment links — create
  const [paymentLinkModal, setPaymentLinkModal] = useState(false);
  const [plLabel, setPlLabel] = useState("");
  const [plAmount, setPlAmount] = useState("");
  const [plDescription, setPlDescription] = useState("");
  const [plImageUrl, setPlImageUrl] = useState("");
  const [plImagePreview, setPlImagePreview] = useState("");
  const [plImageUploading, setPlImageUploading] = useState(false);

  // Payment link transactions history
  const [txnSearch, setTxnSearch] = useState("");
  const [txnDebouncedSearch, setTxnDebouncedSearch] = useState("");
  const [txnStatus, setTxnStatus] = useState("all");
  const [txnPage, setTxnPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setTxnDebouncedSearch(txnSearch); setTxnPage(1); }, 400);
    return () => clearTimeout(t);
  }, [txnSearch]);

  const { data: txnData, isLoading: txnLoading, refetch: refetchTxn } = useQuery<any>({
    queryKey: ['/api/admin/payment-link-transactions', txnDebouncedSearch, txnStatus, txnPage],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(txnPage), limit: "5" });
      if (txnDebouncedSearch) params.set("search", txnDebouncedSearch);
      if (txnStatus !== "all") params.set("status", txnStatus);
      const res = await apiRequest("GET", `/api/admin/payment-link-transactions?${params}`);
      return res.json();
    },
  });

  const refreshTxnMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/payment-link-transactions/${id}/refresh`);
      return res.json();
    },
    onSuccess: () => { refetchTxn(); toast({ title: "✅ Statut mis à jour" }); },
    onError: () => toast({ title: "Erreur de mise à jour", variant: "destructive" }),
  });

  const [manualTxnPending, setManualTxnPending] = useState<string | null>(null);
  const [txnConfirm, setTxnConfirm] = useState<{ id: string; status: 'completed' | 'failed'; name: string; amount: string } | null>(null);
  const manualUpdateTxnMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      setManualTxnPending(id);
      const res = await apiRequest("PATCH", `/api/admin/payment-link-transactions/${id}`, { status });
      return res.json();
    },
    onSuccess: (_, vars) => {
      setManualTxnPending(null);
      refetchTxn();
      if (vars.status === 'completed') {
        toast({ title: "✅ Transaction validée", description: "Code PCS généré et envoyé par email si applicable" });
      } else if (vars.status === 'failed') {
        toast({ title: "Transaction rejetée" });
      } else {
        toast({ title: "Statut mis à jour" });
      }
    },
    onError: () => { setManualTxnPending(null); toast({ title: "Erreur", variant: "destructive" }); },
  });

  // Payment links — edit
  const [editLinkModal, setEditLinkModal] = useState(false);
  const [editLink, setEditLink] = useState<any>(null);
  const [elLabel, setElLabel] = useState("");
  const [elAmount, setElAmount] = useState("");
  const [elDescription, setElDescription] = useState("");
  const [elImageUrl, setElImageUrl] = useState("");
  const [elImagePreview, setElImagePreview] = useState("");
  const [elImageUploading, setElImageUploading] = useState(false);
  const [elManualMode, setElManualMode] = useState(false);
  
  // Fetch identity verifications (only when modal is open)
  const { data: identityVerifications } = useQuery({
    queryKey: ['/api/admin/identity-verifications'],
    enabled: identityModal, // Charger seulement quand modal ouvert
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Fetch pending withdrawals
  const { data: pendingWithdrawals = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/withdrawals/pending'],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Fetch unread messages count
  const { data: conversations = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/support/conversations'],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
  const totalUnreadMessages = conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);

  // Notifications plateforme — queries & mutations
  const { data: platformNotifs = [], isLoading: isLoadingPn } = useQuery<any[]>({
    queryKey: ['/api/admin/platform-notifications'],
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });

  const createPnMutation = useMutation({
    mutationFn: async (body: { message: string; color: string }) => {
      const res = await apiRequest('POST', '/api/admin/platform-notifications', body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platform-notifications'] });
      setPnMessage("");
      setPnColor('green');
      toast({ title: "✅ Notification créée et active" });
    },
    onError: () => toast({ title: "Erreur", description: "Échec de la création", variant: "destructive" }),
  });

  const updatePnMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      const res = await apiRequest('PATCH', `/api/admin/platform-notifications/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platform-notifications'] });
      setPnEditId(null);
      toast({ title: "✅ Notification mise à jour" });
    },
    onError: () => toast({ title: "Erreur", description: "Échec de la modification", variant: "destructive" }),
  });

  const deletePnMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/platform-notifications/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platform-notifications'] });
      toast({ title: "Notification supprimée" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  // Chat enabled status
  const { data: chatEnabledData } = useQuery<{ value: string }>({
    queryKey: ['/api/settings/chat_enabled'],
    staleTime: 10000,
  });
  const isChatEnabled = chatEnabledData?.value !== 'false';

  // Toggle chat mutation
  const toggleChatMutation = useMutation({
    mutationFn: async () => {
      const newValue = isChatEnabled ? 'false' : 'true';
      return apiRequest('PUT', '/api/admin/settings/chat_enabled', { value: newValue });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/chat_enabled'] });
      toast({ 
        title: isChatEnabled ? "Chat désactivé" : "Chat activé",
        description: isChatEnabled ? "Les utilisateurs ne peuvent plus envoyer de messages" : "Les utilisateurs peuvent à nouveau envoyer des messages"
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut du chat",
        variant: "destructive"
      });
    }
  });

  // Payment links queries & mutations
  const { data: paymentLinksList = [], isLoading: isLoadingLinks } = useQuery<any[]>({
    queryKey: ['/api/admin/payment-links'],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const createLinkMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await apiRequest('POST', '/api/admin/payment-links', body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-links'] });
      setPaymentLinkModal(false);
      setPlLabel(""); setPlAmount(""); setPlDescription(""); setPlImageUrl(""); setPlImagePreview("");
      toast({ title: "✅ Lien créé avec succès" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err?.message || "Échec de la création", variant: "destructive" });
    },
  });

  const toggleLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('PATCH', `/api/admin/payment-links/${id}/toggle`, {});
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-links'] }),
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/payment-links/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-links'] });
      toast({ title: "Lien supprimé" });
    },
  });

  const updateLinkMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      const res = await apiRequest('PATCH', `/api/admin/payment-links/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-links'] });
      setEditLinkModal(false);
      setEditLink(null);
      toast({ title: "✅ Lien modifié avec succès" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err?.message || "Échec de la modification", variant: "destructive" });
    },
  });

  const openEditModal = (link: any) => {
    setEditLink(link);
    setElLabel(link.label);
    setElAmount(parseFloat(link.amount).toString());
    setElDescription(link.description || "");
    setElImageUrl(link.imageUrl || "");
    setElImagePreview(link.imageUrl || "");
    setElManualMode(link.manualMode || false);
    setEditLinkModal(true);
  };

  const handleUploadEditImage = async (file: File) => {
    setElImageUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = e => setElImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/admin/payment-links/upload-image", { method: "POST", body: form, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setElImageUrl(data.url);
      toast({ title: "✅ Image chargée" });
    } catch (err: any) {
      toast({ title: "Erreur upload image", description: err.message, variant: "destructive" });
      setElImagePreview(editLink?.imageUrl || "");
    } finally {
      setElImageUploading(false);
    }
  };

  const handleSaveLink = () => {
    if (!elLabel.trim()) { toast({ title: "Libellé requis", variant: "destructive" }); return; }
    const amt = parseFloat(elAmount);
    if (!amt || amt < 100) { toast({ title: "Montant minimum 100 FCFA", variant: "destructive" }); return; }
    updateLinkMutation.mutate({
      id: editLink.id,
      body: {
        label: elLabel.trim(),
        amount: amt,
        description: elDescription.trim() || "",
        imageUrl: elImageUrl || "",
        manualMode: elManualMode,
      },
    });
  };

  const handleUploadLinkImage = async (file: File) => {
    setPlImageUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = e => setPlImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/admin/payment-links/upload-image", { method: "POST", body: form, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPlImageUrl(data.url);
      toast({ title: "✅ Image chargée" });
    } catch (err: any) {
      toast({ title: "Erreur upload image", description: err.message, variant: "destructive" });
      setPlImagePreview("");
    } finally {
      setPlImageUploading(false);
    }
  };

  const handleCreatePaymentLink = () => {
    if (!plLabel.trim()) { toast({ title: "Libellé requis", variant: "destructive" }); return; }
    const amt = parseFloat(plAmount);
    if (!amt || amt < 100) { toast({ title: "Montant minimum 100 FCFA", variant: "destructive" }); return; }
    createLinkMutation.mutate({
      label: plLabel.trim(),
      amount: amt,
      currency: 'XOF',
      description: plDescription.trim() || undefined,
      imageUrl: plImageUrl || undefined,
    });
  };

  const getLinkUrl = (link: any) => `${window.location.origin}/pay/${link.id}`;

  // Withdrawal approval mutations
  const approveWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const response = await apiRequest('POST', `/api/admin/withdrawals/${withdrawalId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "✓ Retrait approuvé" });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'approbation",
        variant: "destructive"
      });
    }
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const response = await apiRequest('POST', `/api/admin/withdrawals/${withdrawalId}/reject`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "✓ Retrait rejeté" });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Erreur lors du rejet",
        variant: "destructive"
      });
    }
  });

  // Bank card update mutation with optimistic update
  const updateBankCardMutation = useMutation({
    mutationFn: async (data: { cardId: string; firstName: string; lastName: string; cardNumber: string }) => {
      return apiRequest('PUT', `/api/admin/bank-card/${data.cardId}`, {
        firstName: data.firstName,
        lastName: data.lastName,
        cardNumber: data.cardNumber
      });
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
      const previousWithdrawals = queryClient.getQueryData(['/api/admin/withdrawals/pending']);
      
      queryClient.setQueryData(['/api/admin/withdrawals/pending'], (old: any) => {
        if (!old) return old;
        return old.map((w: any) => 
          w.bankCardId === data.cardId 
            ? { ...w, bankCardFirstName: data.firstName, bankCardLastName: data.lastName, bankCardNumber: data.cardNumber }
            : w
        );
      });
      
      setEditBankCardModal(false);
      setEditingBankCard(null);
      toast({ title: "✓ Carte mise à jour" });
      
      return { previousWithdrawals };
    },
    onError: (error: any, _data, context) => {
      queryClient.setQueryData(['/api/admin/withdrawals/pending'], context?.previousWithdrawals);
      toast({ 
        title: "Erreur", 
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/withdrawal'] });
    }
  });

  // Approve all withdrawals mutation
  const approveAllWithdrawalsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/admin/withdrawals/approve-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ 
        title: "Tous les retraits validés", 
        description: "Tous les retraits en attente ont été approuvés avec succès"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erreur", 
        description: error.message || "Erreur lors de la validation",
        variant: "destructive"
      });
    }
  });

  // Reject all withdrawals mutation
  const rejectAllWithdrawalsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/admin/withdrawals/reject-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ 
        title: "Tous les retraits rejetés", 
        description: "Tous les retraits en attente ont été rejetés"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erreur", 
        description: error.message || "Erreur lors du rejet",
        variant: "destructive"
      });
    }
  });

  // Cancel withdrawal mutation (delete + refund)
  const cancelWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const response = await apiRequest('POST', `/api/admin/withdrawals/${withdrawalId}/cancel`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "✓ Retrait annulé et utilisateur remboursé" });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'annulation",
        variant: "destructive"
      });
    }
  });

  // Cancel all withdrawals mutation (delete + refund)
  const cancelAllWithdrawalsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/admin/withdrawals/cancel-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ 
        title: "Tous les retraits annulés", 
        description: "Tous les retraits ont été annulés et les utilisateurs remboursés"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erreur", 
        description: error.message || "Erreur lors de l'annulation",
        variant: "destructive"
      });
    }
  });

  // Notify all pending withdrawals mutation
  const notifyAllPendingWithdrawalsMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/admin/notify-all-pending-withdrawals', { message });
      return response.json();
    },
    onSuccess: (data) => {
      setNotifyAllModal(false);
      setNotifyAllMessage("");
      toast({ 
        title: "Notifications envoyées", 
        description: data.message || `${data.count} utilisateur(s) notifié(s)`
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erreur", 
        description: error.message || "Erreur lors de l'envoi des notifications",
        variant: "destructive"
      });
    }
  });

  // Fetch admin statistics
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    staleTime: 30000, // Données valides pendant 30 secondes
    refetchOnWindowFocus: false, // Ne pas refetch au focus de la fenêtre
  });

  // Fetch all users with referrals (lazy loaded - only when needed)
  const { data: allUsers, isLoading: isLoadingUsers, isFetching: isFetchingUsers, refetch: refetchUsers } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    enabled: shouldLoadUsers, // Charger quand l'utilisateur clique sur un filtre
    staleTime: 60000, // Données valides pendant 1 minute
    refetchOnWindowFocus: false,
  });

  // Fonction pour charger/rafraîchir les utilisateurs à la demande
  const loadUsersIfNeeded = () => {
    if (!shouldLoadUsers) {
      setShouldLoadUsers(true);
    } else if (!isLoadingUsers && !isFetchingUsers) {
      refetchUsers();
    }
  };

  // Fetch online users (only when modal is open)
  const { data: onlineUsers = [] } = useQuery<OnlineUser[]>({
    queryKey: ['/api/admin/users/online'],
    refetchInterval: onlineUsersModal ? 5000 : false,
    enabled: onlineUsersModal,
    staleTime: 4000,
    refetchOnWindowFocus: false,
  });

  // Search users mutation (by phone or email)
  const searchMutation = useMutation<AdminUser[], Error, string>({
    mutationFn: async (query: string): Promise<AdminUser[]> => {
      const response = await apiRequest('GET', `/api/admin/users/search?query=${encodeURIComponent(query)}`);
      return await response.json();
    },
    onSuccess: (data: AdminUser[]) => {
      setSearchResults(data);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la recherche",
        variant: "destructive",
      });
    },
  });

  // Fetch PCS codes for selected user (when modal is open)
  const { data: userPcsCodes = [], isLoading: isPcsCodesLoading } = useQuery<{ id: string; code: string; status: string; createdAt: string }[]>({
    queryKey: ['/api/admin/users', pcsCodesUser?.id, 'pcs-codes'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/users/${pcsCodesUser!.id}/pcs-codes`);
      return res.json();
    },
    enabled: !!pcsCodesUser && pcsCodesModal,
    staleTime: 0,
  });

  function genPcsCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `PCS-${seg()}-${seg()}-${seg()}-${seg()}`;
  }

  // Update PCS code status
  const updatePcsStatusMutation = useMutation({
    mutationFn: async ({ codeId, status }: { codeId: string; status: 'actif' | 'inactif' }) => {
      const res = await apiRequest('PATCH', `/api/admin/pcs-codes/${codeId}/status`, { status });
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', pcsCodesUser?.id, 'pcs-codes'] });
      toast({ title: "Statut mis à jour" });
      const code = pcsConfirm?.code ?? '';
      setPcsConfirm(null);
      setPcsNotify({ code, newStatus: vars.status });
    },
    onError: () => {
      setPcsConfirm(null);
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut", variant: "destructive" });
    },
  });

  // Send status-change notification email
  const sendStatusNotifyMutation = useMutation({
    mutationFn: async ({ code, status }: { code: string; status: 'actif' | 'inactif' }) => {
      if (!pcsCodesUser) throw new Error("Aucun utilisateur sélectionné");
      const nameParts = (pcsCodesUser.fullName || pcsCodesUser.email || '').trim().split(' ');
      const res = await apiRequest("POST", "/api/admin/send-pcs", {
        email: pcsCodesUser.email,
        firstName: nameParts[0] || 'Cher',
        lastName: nameParts.slice(1).join(' ') || 'Client',
        countryCode: 'BJ',
        codes: [code],
        statuses: [status],
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email de notification envoyé !", description: `Statut envoyé à ${pcsCodesUser?.email}` });
      setPcsNotify(null);
    },
    onError: () => toast({ title: "Erreur envoi email", variant: "destructive" }),
  });

  // Send new PCS code by email
  const sendNewPcsMutation = useMutation({
    mutationFn: async ({ code, status }: { code: string; status: 'actif' | 'inactif' }) => {
      if (!pcsCodesUser) throw new Error("Aucun utilisateur sélectionné");
      const nameParts = (pcsCodesUser.fullName || pcsCodesUser.email || '').trim().split(' ');
      const res = await apiRequest("POST", "/api/admin/send-pcs", {
        email: pcsCodesUser.email,
        firstName: nameParts[0] || 'Cher',
        lastName: nameParts.slice(1).join(' ') || 'Client',
        countryCode: 'BJ',
        codes: [code],
        statuses: [status],
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', pcsCodesUser?.id, 'pcs-codes'] });
      toast({ title: "Email envoyé !", description: `Code PCS envoyé à ${pcsCodesUser?.email}` });
      setShowNewPcsForm(false);
      setNewPcsCode(genPcsCode());
      setNewPcsStatus('actif');
    },
    onError: () => toast({ title: "Erreur envoi email", variant: "destructive" }),
  });

  // Update balance mutation with optimistic update
  const updateBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: string }) => {
      return apiRequest('POST', `/api/admin/users/${userId}/balance`, {
        amount: parseFloat(amount),
        description: "Modification administrateur"
      });
    },
    onMutate: async ({ userId, amount }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/users'] });
      const previous = queryClient.getQueryData(['/api/admin/users']);
      
      queryClient.setQueryData(['/api/admin/users'], (old: any) => 
        old?.map((u: any) => 
          u.id === userId 
            ? { ...u, balance: (parseFloat(u.balance || '0') + parseFloat(amount)).toString() }
            : u
        ) || []
      );
      
      setBalanceModal(false);
      setBalanceAmount("");
      toast({ title: "✓ Solde mis à jour" });
      
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['/api/admin/users'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      if (allUsers) refetchUsers(); // Rafraîchir si déjà chargé
    },
  });

  // Update balance without history mutation
  const updateBalanceNoHistoryMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: string }) => {
      return apiRequest('POST', `/api/admin/users/${userId}/balance-no-history`, {
        amount: parseFloat(amount),
        description: "Modification sans historique"
      });
    },
    onMutate: async ({ userId, amount }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/users'] });
      const previous = queryClient.getQueryData(['/api/admin/users']);
      
      queryClient.setQueryData(['/api/admin/users'], (old: any) => 
        old?.map((u: any) => 
          u.id === userId ? { ...u, balance: amount } : u
        ) || []
      );
      
      setBalanceNoHistoryModal(false);
      setBalanceAmount("");
      toast({ title: "✓ Solde défini" });
      
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['/api/admin/users'], context?.previous);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour",
        variant: "destructive"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      if (allUsers) refetchUsers(); // Rafraîchir si déjà chargé
    },
  });

  // Update password mutation with instant feedback
  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      return apiRequest('POST', `/api/admin/users/${userId}/password`, { newPassword });
    },
    onMutate: () => {
      setPasswordModal(false);
      setNewPassword("");
      toast({ title: "✓ Mot de passe mis à jour" });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour du mot de passe",
        variant: "destructive"
      });
    }
  });

  // Block/Unblock user mutation with optimistic update
  const blockUserMutation = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      return apiRequest('POST', `/api/admin/users/${userId}/block`, { blocked });
    },
    onMutate: async ({ userId, blocked }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/users'] });
      const previous = queryClient.getQueryData(['/api/admin/users']);
      
      queryClient.setQueryData(['/api/admin/users'], (old: any) => 
        old?.map((u: any) => u.id === userId ? { ...u, isBlocked: blocked } : u) || []
      );
      
      toast({ title: blocked ? "✓ Utilisateur bloqué" : "✓ Utilisateur débloqué" });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['/api/admin/users'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      if (allUsers) refetchUsers(); // Rafraîchir si déjà chargé
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/users'] });
      const previous = queryClient.getQueryData(['/api/admin/users']);
      
      queryClient.setQueryData(['/api/admin/users'], (old: any) => 
        old?.filter((u: any) => u.id !== userId) || []
      );
      
      toast({ title: "✓ Utilisateur supprimé" });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['/api/admin/users'], context?.previous);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      if (allUsers) refetchUsers();
    },
  });

  // Activate account mutation
  const activateAccountMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/activate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      if (allUsers) refetchUsers(); // Rafraîchir si déjà chargé
      toast({ title: "✓ Compte activé" });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'activation",
        variant: "destructive"
      });
    },
  });

  // Deactivate account mutation
  const deactivateAccountMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/deactivate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      if (allUsers) refetchUsers(); // Rafraîchir si déjà chargé
      toast({ title: "✓ Compte désactivé" });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la désactivation",
        variant: "destructive"
      });
    },
  });

  // CI Update - pending users query (active +225 only)
  const { data: ciPendingUsers = [], refetch: refetchCiPending } = useQuery<any[]>({
    queryKey: ['/api/admin/ci-update-pending'],
    refetchInterval: 15000,
  });

  // CI Update - all +225 users for individual management
  const [showCiSearch, setShowCiSearch] = useState(false);
  const [ciSearchQuery, setCiSearchQuery] = useState("");
  const { data: allCiUsers = [], refetch: refetchAllCi } = useQuery<any[]>({
    queryKey: ['/api/admin/ci-update-all-users'],
    enabled: showCiSearch,
  });
  const filteredCiUsers = allCiUsers.filter((u: any) =>
    !ciSearchQuery || u.fullName?.toLowerCase().includes(ciSearchQuery.toLowerCase()) || u.phone?.includes(ciSearchQuery)
  );

  // CI Update - validate mutation
  const ciValidateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', `/api/admin/ci-update-validate/${userId}`, {});
      return res.json();
    },
    onSuccess: () => {
      refetchCiPending();
      refetchAllCi();
      toast({ title: "✓ Mise à jour validée", description: "Le compte a été débloqué avec succès." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la validation", variant: "destructive" });
    }
  });

  // CI Update - reset individual user (re-activate requirement)
  const ciResetMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', `/api/admin/ci-update-reset/${userId}`, {});
      return res.json();
    },
    onSuccess: () => {
      refetchCiPending();
      refetchAllCi();
      toast({ title: "✓ Option réactivée", description: "L'utilisateur devra effectuer la mise à jour." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la réactivation", variant: "destructive" });
    }
  });

  // CI Update - disable for ALL +225 users at once
  const ciDisableAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ci-update-disable-all', {});
      return res.json();
    },
    onSuccess: () => {
      refetchCiPending();
      refetchAllCi();
      toast({ title: "✓ Option désactivée pour tous", description: "Tous les comptes +225 ont retrouvé l'accès." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la désactivation globale", variant: "destructive" });
    }
  });

  // Credit account mutation with optimistic update
  const creditAccountMutation = useMutation({
    mutationFn: async ({ userId, amount, description }: { userId: string; amount: string; description: string }) => {
      return apiRequest('POST', `/api/admin/users/${userId}/balance`, {
        amount: parseFloat(amount),
        description
      });
    },
    onMutate: async ({ userId, amount }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/users'] });
      const previous = queryClient.getQueryData(['/api/admin/users']);
      
      queryClient.setQueryData(['/api/admin/users'], (old: any) => 
        old?.map((u: any) => 
          u.id === userId 
            ? { ...u, balance: (parseFloat(u.balance || '0') + parseFloat(amount)).toString() }
            : u
        ) || []
      );
      
      setCreditModal(false);
      setCreditAmount("");
      setCreditDescription("");
      toast({ title: "✓ Compte crédité" });
      
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['/api/admin/users'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      if (allUsers) refetchUsers(); // Rafraîchir si déjà chargé
    },
  });

  // Toggle auto withdrawal mode per user
  const withdrawalModeMutation = useMutation({
    mutationFn: async ({ userId, mode }: { userId: string; mode: 'manual' | 'auto' }) => {
      return apiRequest('POST', `/api/admin/users/${userId}/withdrawal-mode`, { mode });
    },
    onSuccess: (_, { mode }) => {
      toast({
        title: "Mode de retrait mis à jour",
        description: mode === 'auto' ? "Retraits automatiques activés" : "Retraits manuels (normal)",
      });
      if (searchResults.length > 0 && searchQuery.trim().length >= 3) {
        searchMutation.mutate(searchQuery.trim());
      }
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la mise à jour du mode", variant: "destructive" });
    },
  });

  // Recherche en temps réel avec debounce optimisé
  useEffect(() => {
    if (searchQuery.trim().length >= 3) {
      const debounceTimer = setTimeout(() => {
        searchMutation.mutate(searchQuery.trim());
      }, 400);
      return () => clearTimeout(debounceTimer);
    } else if (searchQuery.trim().length === 0) {
      // Si le champ est vide, réinitialiser les résultats
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleUpdateBalance = () => {
    if (selectedUser && balanceAmount) {
      updateBalanceMutation.mutate({
        userId: selectedUser.id,
        amount: balanceAmount
      });
    }
  };

  const handleUpdateBalanceNoHistory = () => {
    if (selectedUser && balanceAmount) {
      updateBalanceNoHistoryMutation.mutate({
        userId: selectedUser.id,
        amount: balanceAmount
      });
    }
  };

  const handleUpdatePassword = () => {
    if (selectedUser && newPassword) {
      updatePasswordMutation.mutate({
        userId: selectedUser.id,
        newPassword: newPassword.trim()
      });
    }
  };

  const handleCreditAccount = () => {
    if (selectedUser && creditAmount && creditDescription) {
      creditAccountMutation.mutate({
        userId: selectedUser.id,
        amount: creditAmount,
        description: creditDescription
      });
    }
  };

  // User Table Component
  function UserTable({ users, onSelectUser }: { users: AdminUser[]; onSelectUser: (user: AdminUser) => void }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="border border-gray-300 px-4 py-2 text-left">Utilisateur</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Téléphone</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Solde</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Parrainages</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Statut</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="border border-gray-300 px-4 py-2">
                  <div>
                    <div className="font-bold">{user.fullName || <span className="text-gray-400 italic">Sans nom</span>}</div>
                    {user.email && <div className="text-xs text-blue-600 dark:text-blue-400 break-all">{user.email}</div>}
                    <div className="text-sm text-gray-500">Code: {user.referralCode}</div>
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {user.phone && (
                    <div className="flex items-center gap-1">
                      {user.phone.startsWith('+228') && <span>🇹🇬 +228</span>}
                      {user.phone.startsWith('+229') && <span>🇧🇯 +229</span>}
                      {user.phone.startsWith('+226') && <span>🇧🇫 +226</span>}
                      {user.phone.startsWith('+221') && <span>🇸🇳 +221</span>}
                      {user.phone.startsWith('+225') && <span>🇨🇮 +225</span>}
                      <span>{user.phone.replace(/^\+22[5689156]/, '')}</span>
                    </div>
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <span className="font-mono">{parseFloat(user.balance || '0').toFixed(0)} FCFA</span>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <Badge variant="secondary">{user.referralsCount} parrainé(s)</Badge>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="flex flex-col gap-1">
                    {user.role === 'admin' && (
                      <Badge variant="destructive">Admin</Badge>
                    )}
                    {user.isBlocked && (
                      <Badge variant="destructive">Bloqué</Badge>
                    )}
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onSelectUser(user);
                        setBalanceModal(true);
                      }}
                      data-testid={`button-edit-balance-${user.id}`}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Solde
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onSelectUser(user);
                        setBalanceNoHistoryModal(true);
                      }}
                      data-testid={`button-edit-balance-no-history-${user.id}`}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Solde (sans historique)
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onSelectUser(user);
                        setPasswordModal(true);
                      }}
                      data-testid={`button-edit-password-${user.id}`}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Mot de passe
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onSelectUser(user);
                        setCreditModal(true);
                      }}
                      data-testid={`button-credit-${user.id}`}
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      Créditer
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={user.isBlocked ? "default" : "destructive"}
                      onClick={() => blockUserMutation.mutate({ userId: user.id, blocked: !user.isBlocked })}
                      data-testid={`button-block-${user.id}`}
                    >
                      {user.isBlocked ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                      {user.isBlocked ? 'Débloquer' : 'Bloquer'}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={user.isActive ? "default" : "outline"}
                      className={user.isActive ? "bg-green-600 hover:bg-green-700" : ""}
                      onClick={() => {
                        if (user.isActive) {
                          if (confirm("Désactiver ce compte ? L'utilisateur ne pourra plus faire de retraits.")) {
                            deactivateAccountMutation.mutate(user.id);
                          }
                        } else {
                          activateAccountMutation.mutate(user.id);
                        }
                      }}
                      disabled={activateAccountMutation.isPending || deactivateAccountMutation.isPending}
                      data-testid={`button-activate-${user.id}`}
                    >
                      {user.isActive ? '✅ Activé' : '❌ Activer'}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-400 text-purple-700 dark:text-purple-300"
                      onClick={() => {
                        setPcsCodesUser(user);
                        setPcsCodesModal(true);
                      }}
                      data-testid={`button-pcs-codes-${user.id}`}
                    >
                      🔑 Codes PCS
                    </Button>

                    <Button
                      size="sm"
                      variant={user.autoWithdrawalMode === 'auto' ? "default" : "outline"}
                      className={user.autoWithdrawalMode === 'auto' ? "bg-orange-500 hover:bg-orange-600 text-white" : "border-orange-400 text-orange-600"}
                      onClick={() => {
                        const newMode = user.autoWithdrawalMode === 'auto' ? 'manual' : 'auto';
                        const label = newMode === 'auto' ? 'activer le mode retrait automatique' : 'désactiver le retrait automatique';
                        if (confirm(`Voulez-vous ${label} pour cet utilisateur ?`)) {
                          withdrawalModeMutation.mutate({ userId: user.id, mode: newMode });
                        }
                      }}
                      disabled={withdrawalModeMutation.isPending}
                      data-testid={`button-withdrawal-mode-${user.id}`}
                    >
                      ⚡ {user.autoWithdrawalMode === 'auto' ? 'Auto ON' : 'Auto OFF'}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteConfirm({
                        userId: user.id,
                        userName: user.fullName || '',
                        userEmail: user.email || '',
                      })}
                      data-testid={`button-delete-${user.id}`}
                    >
                      <Trash className="h-3 w-3 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-blue-600 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          {/* Top bar: title + logout */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">Tableau de Bord</h1>
              <p className="text-blue-200/70 text-sm">SIKA TEXTE BUSINESS · Administration</p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild className="bg-white/15 hover:bg-white/25 text-white border border-white/20 font-medium text-sm" data-testid="button-admin-my-account">
                <a href="/dashboard">
                  <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                  Mon compte
                </a>
              </Button>
              <button
                onClick={() => {
                  fetch('/api/auth/logout', { method: 'POST' })
                    .then(() => window.location.href = '/simple-login')
                    .catch(() => window.location.href = '/simple-login');
                }}
                className="bg-red-500/80 hover:bg-red-500 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                data-testid="button-logout"
              >
                Déconnexion
              </button>
            </div>
          </div>

          {/* Nav actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {/* Codes PCS */}
            <a href="/admin/pcs-send"
              className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white transition-colors text-center">
              <Mail className="h-4 w-4" />
              <span className="text-xs font-semibold leading-none">Codes PCS</span>
            </a>

            {/* Paramètres */}
            <a href="/admin/settings" data-testid="button-admin-settings"
              className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-600/80 hover:bg-slate-600 text-white transition-colors text-center">
              <Settings className="h-4 w-4" />
              <span className="text-xs font-semibold leading-none">Paramètres</span>
            </a>

            {/* MàJ +225 */}
            <a href="/admin/ci-update" className="relative flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl bg-orange-500/80 hover:bg-orange-500 text-white transition-colors text-center">
              <RefreshCw className="h-4 w-4" />
              <span className="text-xs font-semibold leading-none">MàJ +225</span>
              {ciPendingUsers.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {ciPendingUsers.length}
                </span>
              )}
            </a>

            {/* Retraits */}
            <a href="/admin/withdrawals" className="relative flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-colors text-center">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs font-semibold leading-none">Retraits</span>
              {pendingWithdrawals.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {pendingWithdrawals.length}
                </span>
              )}
            </a>

            {/* Messages */}
            <a href="/admin/messages" data-testid="button-admin-messages"
              className="relative flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors text-center">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs font-semibold leading-none">Messages</span>
              {totalUnreadMessages > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {totalUnreadMessages}
                </span>
              )}
            </a>

            {/* Cartes ID */}
            <button onClick={() => setIdentityModal(true)}
              className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl bg-green-600/80 hover:bg-green-600 text-white transition-colors w-full">
              <Users className="h-4 w-4" />
              <span className="text-xs font-semibold leading-none">Cartes ID</span>
            </button>

            {/* Connectés */}
            <a href="/admin/connected-users" data-testid="button-online-users"
              className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl bg-teal-600/80 hover:bg-teal-600 text-white transition-colors text-center">
              <Wifi className="h-4 w-4" />
              <span className="text-xs font-semibold leading-none">Connectés</span>
            </a>

            {/* Chat toggle */}
            <button
              onClick={() => toggleChatMutation.mutate()}
              disabled={toggleChatMutation.isPending}
              data-testid="button-toggle-chat"
              className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl text-white transition-colors ${isChatEnabled ? 'bg-orange-500/80 hover:bg-orange-500' : 'bg-green-500/80 hover:bg-green-500'}`}
            >
              {isChatEnabled ? <MessageSquareOff className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
              <span className="text-xs font-semibold leading-none">{isChatEnabled ? "Chat ON" : "Chat OFF"}</span>
            </button>
          </div>
        </div>

        {/* Identity Modal */}
        <Dialog open={identityModal} onOpenChange={setIdentityModal}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Cartes d'Identité Soumises</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto space-y-4">
              {(identityVerifications as any[])?.map((verification: any) => (
                <Card key={verification.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* User Info Header */}
                      <div className="flex justify-between items-center border-b pb-3">
                        <div>
                          <h4 className="font-medium text-lg">ID: {verification.userId}</h4>
                          <p className="text-sm text-muted-foreground">
                            Soumis le: {new Date(verification.submittedAt).toLocaleDateString('fr-FR', {
                              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <Badge variant={verification.status === 'approved' ? 'default' : verification.status === 'pending' ? 'secondary' : 'destructive'}>
                          {verification.status === 'approved' ? '✅ Approuvé' : verification.status === 'pending' ? '⏳ En attente' : '❌ Rejeté'}
                        </Badge>
                      </div>

                      {/* Photos Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-sm font-medium mb-2">Recto de la pièce</p>
                          {verification.frontIdPhotoUrl ? (
                            <img 
                              src={verification.frontIdPhotoUrl} 
                              alt="Recto ID" 
                              className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                              onClick={() => window.open(verification.frontIdPhotoUrl, '_blank')}
                            />
                          ) : (
                            <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                              Non fourni
                            </div>
                          )}
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm font-medium mb-2">Verso de la pièce</p>
                          {verification.backIdPhotoUrl ? (
                            <img 
                              src={verification.backIdPhotoUrl} 
                              alt="Verso ID" 
                              className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                              onClick={() => window.open(verification.backIdPhotoUrl, '_blank')}
                            />
                          ) : (
                            <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                              Non fourni
                            </div>
                          )}
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm font-medium mb-2">Photo Selfie</p>
                          {verification.selfiePhotoUrl ? (
                            <img 
                              src={verification.selfiePhotoUrl} 
                              alt="Selfie" 
                              className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                              onClick={() => window.open(verification.selfiePhotoUrl, '_blank')}
                            />
                          ) : (
                            <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                              Non fourni
                            </div>
                          )}
                        </div>
                      </div>

                      {/* API Info */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-medium text-sm mb-2">Informations API</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><strong>Verification ID:</strong> {verification.id}</div>
                          <div><strong>User ID:</strong> {verification.userId}</div>
                          <div><strong>Status:</strong> {verification.status}</div>
                          <div><strong>Date création:</strong> {new Date(verification.submittedAt).toISOString()}</div>
                          {verification.reviewedAt && <div><strong>Date révision:</strong> {new Date(verification.reviewedAt).toISOString()}</div>}
                          {verification.reviewedBy && <div><strong>Révisé par:</strong> {verification.reviewedBy}</div>}
                        </div>
                        {verification.adminNotes && (
                          <div className="mt-2">
                            <strong className="text-xs">Notes admin:</strong>
                            <p className="text-xs text-gray-600 mt-1">{verification.adminNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!(identityVerifications as any[])?.length && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune carte d'identité soumise
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Online Users Modal */}
        <Dialog open={onlineUsersModal} onOpenChange={setOnlineUsersModal}>
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>👥 Utilisateurs Connectés</span>
                <Badge variant="outline" className="bg-green-100 text-green-800 ml-4">
                  {onlineUsers.length} en ligne
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[500px] overflow-y-auto">
              {onlineUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="bg-gray-100 dark:bg-gray-800">
                        <th className="border border-gray-300 px-4 py-2 text-left">Statut</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Utilisateur</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Téléphone</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Solde</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Dernière Activité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onlineUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="border border-gray-300 px-4 py-2">
                            <Badge className="bg-green-500 text-white">
                              🟢 En ligne
                            </Badge>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <div>
                              <div className="font-bold">{user.fullName}</div>
                              <div className="text-sm text-gray-500">Code: {user.referralCode}</div>
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">{user.phone}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm">{user.email}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            <span className="font-mono">{parseFloat(user.balance || '0').toFixed(0)} FCFA</span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-500">
                            {new Date(user.lastActivity).toLocaleString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Aucun utilisateur connecté actuellement</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dépôts Validés</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.completedDeposits || 0}</div>
              <p className="text-xs text-muted-foreground">
                En attente: {stats?.pendingDeposits || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retraits Validés</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.completedWithdrawals || 0}</div>
              <p className="text-xs text-muted-foreground">
                En attente: {stats?.pendingWithdrawals || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats?.totalDeposits || 0) + (stats?.totalWithdrawals || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bot Telegram — aide-mémoire des commandes de recherche */}
        <Card className="border-blue-200 bg-blue-50/50 mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-900">
              <Bot className="h-5 w-5" />
              Bot Telegram — commandes de recherche
            </CardTitle>
            <p className="text-xs text-blue-700 mt-1">
              Tapez ces commandes au bot pour retrouver une transaction. Les résultats reviennent avec capture d'écran et boutons d'approbation/rejet.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Par téléphone */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-2">📱 Par numéro de téléphone</p>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <code className="bg-white border border-blue-200 px-2 py-0.5 rounded font-mono text-xs">+229XXXXXXXX</code>
                  <span className="text-gray-500">→</span>
                  <span className="text-gray-700">activations CI</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <code className="bg-white border border-blue-200 px-2 py-0.5 rounded font-mono text-xs">+229XXXXXXXX paie act</code>
                  <span className="text-gray-500">→</span>
                  <span className="text-gray-700">activations manuelles (autres pays)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <code className="bg-white border border-blue-200 px-2 py-0.5 rounded font-mono text-xs">+229XXXXXXXX pay lien</code>
                  <span className="text-gray-500">→</span>
                  <span className="text-gray-700">paiements lien manuels</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <code className="bg-white border border-blue-200 px-2 py-0.5 rounded font-mono text-xs">+229XXXXXXXX pcs</code>
                  <span className="text-gray-500">→</span>
                  <span className="text-gray-700">achats de code PCS</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <code className="bg-white border border-blue-200 px-2 py-0.5 rounded font-mono text-xs">+229XXXXXXXX act pcs</code>
                  <span className="text-gray-500">→</span>
                  <span className="text-gray-700">activations par code PCS</span>
                </div>
              </div>
            </div>

            {/* Par ID transaction */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-2">🔖 Par ID de transaction</p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <code className="bg-white border border-blue-200 px-2 py-0.5 rounded font-mono text-xs">tx ABC123</code>
                <span className="text-gray-400 text-xs">ou</span>
                <code className="bg-white border border-blue-200 px-2 py-0.5 rounded font-mono text-xs">id ABC123</code>
                <span className="text-gray-500">→</span>
                <span className="text-gray-700">lien manuel + activation + SolvexPay</span>
              </div>
            </div>

            {/* Par nom du payeur */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-2">👤 Par nom du payeur</p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <code className="bg-white border border-blue-200 px-2 py-0.5 rounded font-mono text-xs">nom Kouassi Jean</code>
                <span className="text-gray-400 text-xs">ou</span>
                <code className="bg-white border border-blue-200 px-2 py-0.5 rounded font-mono text-xs">name Kouassi</code>
                <span className="text-gray-500">→</span>
                <span className="text-gray-700">toutes les transactions de ce nom</span>
              </div>
            </div>

            <div className="text-xs text-blue-700 bg-blue-100 rounded-lg p-2.5 border border-blue-200">
              💡 <strong>Astuce :</strong> les recherches par téléphone comparent aussi les 8 derniers chiffres ; les recherches par nom et ID acceptent un fragment (ex : <code className="bg-white px-1 rounded">tx 5511</code> ou <code className="bg-white px-1 rounded">nom Kouassi</code>). Si vous tapez un message non reconnu, le bot vous renvoie automatiquement cette liste.
            </div>
          </CardContent>
        </Card>


        {/* Summary cards linking to dedicated pages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* CI Update summary card */}
          <Card className="border-orange-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/admin/ci-update'}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Mise à jour +225
                  </p>
                  <p className="text-2xl font-bold mt-1 text-orange-800">{ciPendingUsers.length}</p>
                  <p className="text-xs text-muted-foreground">compte(s) en attente de validation</p>
                </div>
                <div className="text-right">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                    Gérer →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawals summary card */}
          <Card className="border-red-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/admin/withdrawals'}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Retraits en Attente
                  </p>
                  <p className="text-2xl font-bold mt-1 text-red-800">{pendingWithdrawals.length}</p>
                  <p className="text-xs text-muted-foreground">retrait(s) à traiter</p>
                </div>
                <div className="text-right">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                    Gérer →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ══ Liens de Paiement SolvexPay ══ */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-violet-600" />
                Liens de Paiement SolvexPay
              </CardTitle>
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-white gap-1"
                onClick={() => setPaymentLinkModal(true)}
              >
                <Plus className="h-4 w-4" />
                Créer un lien
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingLinks ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
            ) : paymentLinksList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun lien de paiement créé</p>
                <p className="text-xs mt-1">Cliquez sur « Créer un lien » pour commencer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentLinksList.map((link: any) => (
                  <div key={link.id}
                    className="flex items-start gap-3 p-3 rounded-xl border bg-gray-50/60 hover:bg-gray-100/60 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}>
                      <Link2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-800 truncate">{link.label}</p>
                        <Badge variant={link.isActive ? "default" : "secondary"} className="text-[10px]">
                          {link.isActive ? "Actif" : "Inactif"}
                        </Badge>
                        {link.manualMode && (
                          <Badge className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200">
                            🏦 Manuel
                          </Badge>
                        )}
                      </div>
                      <p className="text-violet-700 font-bold text-sm mt-0.5">
                        {parseFloat(link.amount).toLocaleString('fr-FR')} {link.currency}
                      </p>
                      {link.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{link.description}</p>
                      )}
                      <p className="text-xs text-blue-500 mt-1 truncate font-mono">{getLinkUrl(link)}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"
                          onClick={() => {
                            navigator.clipboard.writeText(getLinkUrl(link));
                            toast({ title: "Lien copié !" });
                          }}>
                          <Copy className="h-3 w-3" /> Copier
                        </Button>
                        <a href={getLinkUrl(link)} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 w-full">
                            <ExternalLink className="h-3 w-3" /> Ouvrir
                          </Button>
                        </a>
                      </>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"
                        onClick={() => openEditModal(link)}>
                        ✏️ Modifier
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"
                        onClick={() => toggleLinkMutation.mutate(link.id)}>
                        {link.isActive
                          ? <><ToggleRight className="h-3 w-3 text-green-600" /> Désactiver</>
                          : <><ToggleLeft className="h-3 w-3 text-gray-400" /> Activer</>
                        }
                      </Button>
                      {link.id !== 'd3e5479d' && link.id !== 'codepcs' && (
                        <Button size="sm" variant="destructive" className="h-7 px-2 text-xs gap-1"
                          onClick={() => { if (confirm("Supprimer ce lien ?")) deleteLinkMutation.mutate(link.id); }}>
                          <Trash className="h-3 w-3" /> Supp.
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal création lien */}
        {paymentLinkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}>
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-white" />
                  <h2 className="text-white font-bold text-base">Nouveau lien de paiement</h2>
                </div>
                <button onClick={() => setPaymentLinkModal(false)}
                  className="text-white/80 hover:text-white text-xl font-bold">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-xs text-violet-700">
                  💡 Un lien de paiement sécurisé sera généré. Le client le visite, saisit ses infos Mobile Money et paie via SolvexPay SR.
                </div>
                <div>
                  <Label className="text-sm font-semibold">Libellé *</Label>
                  <Input className="mt-1" placeholder="ex: Synchronisation de compte"
                    value={plLabel} onChange={e => setPlLabel(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Montant (FCFA) *</Label>
                  <Input className="mt-1" type="number" min="100" placeholder="ex: 4300"
                    value={plAmount} onChange={e => setPlAmount(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Description (optionnel)</Label>
                  <Input className="mt-1" placeholder="ex: Paiement pour activation premium"
                    value={plDescription} onChange={e => setPlDescription(e.target.value)} />
                </div>

                {/* Image upload */}
                <div>
                  <Label className="text-sm font-semibold">Photo du lien (optionnel)</Label>
                  <p className="text-xs text-gray-400 mt-0.5 mb-2">Apparaît en haut de la page de paiement</p>
                  {plImagePreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                      <img src={plImagePreview} alt="Aperçu" className="w-full h-32 object-cover" />
                      <button
                        onClick={() => { setPlImagePreview(""); setPlImageUrl(""); }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                      >✕</button>
                      {plImageUploading && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                        </div>
                      )}
                      {plImageUrl && !plImageUploading && (
                        <div className="absolute bottom-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">✓ Chargée</div>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <span className="text-2xl mb-1">🖼</span>
                      <span className="text-xs text-gray-500">Cliquer pour choisir une image</span>
                      <span className="text-[10px] text-gray-400">JPG, PNG, WebP — max 10 Mo</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadLinkImage(f); }} />
                    </label>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1"
                    onClick={() => setPaymentLinkModal(false)}>
                    Annuler
                  </Button>
                  <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={handleCreatePaymentLink}
                    disabled={createLinkMutation.isPending}>
                    {createLinkMutation.isPending ? "Génération…" : "Générer le lien"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal modification lien */}
        {editLinkModal && editLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 rounded-t-3xl"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}>
                <div>
                  <p className="font-black text-white text-lg">Modifier le lien</p>
                  <p className="text-white/70 text-xs font-mono">/pay/{editLink.id}</p>
                </div>
                <button onClick={() => setEditLinkModal(false)}
                  className="text-white/80 hover:text-white text-xl font-bold">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Libellé *</Label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    placeholder="ex: Synchronisation de compte"
                    value={elLabel} onChange={e => setElLabel(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Montant (FCFA) *</Label>
                  <input type="number" min="100"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    placeholder="ex: 4300"
                    value={elAmount} onChange={e => setElAmount(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Description (optionnel)</Label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    placeholder="ex: Paiement pour activation premium"
                    value={elDescription} onChange={e => setElDescription(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Photo du lien (optionnel)</Label>
                  <p className="text-xs text-gray-400 mt-0.5 mb-2">Apparaît en haut de la page de paiement</p>
                  {elImagePreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                      <img src={elImagePreview} alt="Aperçu" className="w-full h-32 object-cover" />
                      <button
                        onClick={() => { setElImagePreview(""); setElImageUrl(""); }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                      >✕</button>
                      {elImageUploading && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                        </div>
                      )}
                      {elImageUrl && !elImageUploading && (
                        <div className="absolute bottom-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">✓ Chargée</div>
                      )}
                      <label className="absolute bottom-2 right-2 bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer">
                        Changer
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadEditImage(f); }} />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <span className="text-2xl mb-1">🖼</span>
                      <span className="text-xs text-gray-500">Cliquer pour choisir une image</span>
                      <span className="text-[10px] text-gray-400">JPG, PNG, WebP — max 10 Mo</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadEditImage(f); }} />
                    </label>
                  )}
                </div>
                {/* Mode dépôt manuel */}
                <div className="border border-orange-200 bg-orange-50 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-3">
                      <p className="font-semibold text-sm text-gray-800">Mode dépôt manuel</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {elManualMode
                          ? "✓ Activé — utilise les numéros configurés dans Paramètres → Activation manuelle"
                          : "✗ Désactivé — paiement SolvexPay automatique"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setElManualMode(v => !v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${elManualMode ? 'bg-orange-500' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${elManualMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1"
                    onClick={() => setEditLinkModal(false)}>
                    Annuler
                  </Button>
                  <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={handleSaveLink}
                    disabled={updateLinkMutation.isPending || elImageUploading}>
                    {updateLinkMutation.isPending ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Link Transactions History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-violet-600" />
                Historique des paiements par lien
              </CardTitle>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => refetchTxn()}>
                <RefreshCw className="h-3 w-3" /> Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search + Filter bar */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-9 text-sm"
                  placeholder="Rechercher par nom, email ou numéro…"
                  value={txnSearch}
                  onChange={e => setTxnSearch(e.target.value)}
                />
              </div>
              <select
                value={txnStatus}
                onChange={e => { setTxnStatus(e.target.value); setTxnPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="completed">Complété</option>
                <option value="failed">Échoué</option>
              </select>
            </div>

            {/* Stats chips */}
            {txnData && (
              <div className="flex gap-2 flex-wrap text-xs">
                <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">{txnData.total} transaction{txnData.total > 1 ? "s" : ""}</span>
                {txnData.total > 0 && <span className="bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full font-medium">Page {txnData.page}/{txnData.pages}</span>}
              </div>
            )}

            {/* List */}
            {txnLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400 gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" /> Chargement…
              </div>
            ) : !txnData?.transactions?.length ? (
              <div className="text-center py-10 text-gray-400 text-sm">Aucune transaction trouvée</div>
            ) : (
              <div className="space-y-2">
                {txnData.transactions.map((txn: any) => {
                  const statusColor = txn.status === "completed" ? "bg-green-100 text-green-700" : txn.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";
                  const statusLabel = txn.status === "completed" ? "✅ Complété" : txn.status === "failed" ? "❌ Échoué" : "⏳ En attente";
                  const operatorColors: Record<string, string> = { mtn: "#FFCC00", orange: "#FF6900", moov: "#0057A8", wave: "#1AC8DB", free: "#CC0000", airtel: "#E40000", tmoney: "#E30613" };
                  const opColor = operatorColors[txn.operator] || "#888";
                  return (
                    <div key={txn.id} className="flex items-start gap-3 p-3 rounded-xl border bg-gray-50/60 hover:bg-gray-100/50 transition-colors">
                      {/* Operator dot */}
                      <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black text-[10px]"
                        style={{ background: opColor }}>
                        {(txn.operator || "?").toUpperCase().slice(0, 3)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-800 truncate">{txn.customerName || "—"}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-violet-700 font-bold text-sm">{parseFloat(txn.amount).toLocaleString("fr-FR")} {txn.currency}</span>
                          <span className="text-gray-500 text-xs font-mono">{txn.phone}</span>
                          {txn.customerEmail && <span className="text-gray-400 text-xs truncate">{txn.customerEmail}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-gray-400 text-[11px]">🔗 {txn.linkLabel || txn.linkId}</span>
                          <span className="text-gray-300 text-[11px]">{new Date(txn.createdAt).toLocaleString("fr-FR", { day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit" })}</span>
                        </div>
                        {txn.solvexpayTxnId && (
                          <span className="text-[10px] text-gray-300 font-mono">ID: {txn.solvexpayTxnId}</span>
                        )}
                        {txn.pcsCode && (
                          <span className="text-[10px] font-mono bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                            🔑 {txn.pcsCode}
                          </span>
                        )}
                      </div>
                      {/* Actions */}
                      {txn.status === "pending" && (
                        txn.solvexpayTxnId ? (
                          // Transaction SolvexPay → rafraîchissement automatique
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs flex-shrink-0"
                            onClick={() => refreshTxnMutation.mutate(txn.id)}
                            disabled={refreshTxnMutation.isPending}>
                            <RefreshCw className={`h-3 w-3 ${refreshTxnMutation.isPending ? "animate-spin" : ""}`} />
                          </Button>
                        ) : (
                          // Transaction CI (sans SolvexPay) → validation manuelle
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <Button size="sm"
                              className="h-7 px-3 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white gap-1.5"
                              onClick={() => setTxnConfirm({ id: txn.id, status: 'completed', name: txn.customerName || txn.phone, amount: `${parseFloat(txn.amount).toLocaleString("fr-FR")} ${txn.currency}` })}
                              disabled={manualTxnPending === txn.id}>
                              <CheckCircle className="h-3 w-3" /> Approuver
                            </Button>
                            <Button size="sm" variant="outline"
                              className="h-7 px-3 text-xs font-semibold text-red-700 border-red-300 hover:bg-red-50 gap-1.5"
                              onClick={() => setTxnConfirm({ id: txn.id, status: 'failed', name: txn.customerName || txn.phone, amount: `${parseFloat(txn.amount).toLocaleString("fr-FR")} ${txn.currency}` })}
                              disabled={manualTxnPending === txn.id}>
                              <XCircle className="h-3 w-3" /> Rejeter
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {txnData && txnData.pages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button size="sm" variant="outline" className="gap-1 text-xs"
                  disabled={txnPage <= 1}
                  onClick={() => setTxnPage(p => p - 1)}>
                  <ChevronLeft className="h-3 w-3" /> Précédent
                </Button>
                <span className="text-xs text-gray-500">Page {txnPage} / {txnData.pages}</span>
                <Button size="sm" variant="outline" className="gap-1 text-xs"
                  disabled={txnPage >= txnData.pages}
                  onClick={() => setTxnPage(p => p + 1)}>
                  Suivant <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de confirmation — validation/rejet manuel d'une transaction CI */}
        <Dialog open={!!txnConfirm} onOpenChange={(open) => { if (!open) setTxnConfirm(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className={txnConfirm?.status === 'completed' ? "text-green-700" : "text-red-700"}>
                {txnConfirm?.status === 'completed' ? "✅ Approuver la transaction" : "❌ Rejeter la transaction"}
              </DialogTitle>
              <DialogDescription className="pt-2 space-y-1 text-sm">
                <p>Client : <strong>{txnConfirm?.name}</strong></p>
                <p>Montant : <strong>{txnConfirm?.amount}</strong></p>
                {txnConfirm?.status === 'completed' && (
                  <p className="mt-2 text-violet-700 font-medium text-xs bg-violet-50 p-2 rounded-lg">
                    Un code PCS sera généré et envoyé automatiquement par email au client.
                  </p>
                )}
                {txnConfirm?.status === 'failed' && (
                  <p className="mt-2 text-red-600 text-xs bg-red-50 p-2 rounded-lg">
                    La transaction sera marquée comme rejetée. Aucun code PCS ne sera envoyé.
                  </p>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setTxnConfirm(null)}>
                Annuler
              </Button>
              <Button
                className={`flex-1 gap-1.5 ${txnConfirm?.status === 'completed' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} text-white`}
                disabled={manualTxnPending === txnConfirm?.id}
                onClick={() => {
                  if (txnConfirm) {
                    manualUpdateTxnMutation.mutate({ id: txnConfirm.id, status: txnConfirm.status });
                    setTxnConfirm(null);
                  }
                }}>
                {txnConfirm?.status === 'completed'
                  ? <><CheckCircle className="h-4 w-4" /> Confirmer l'approbation</>
                  : <><XCircle className="h-4 w-4" /> Confirmer le rejet</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── NOTIFICATIONS PLATEFORME ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              Notifications Plateforme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Formulaire de création */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700">Nouvelle notification</p>
              <Textarea
                placeholder="Texte de la notification affiché à tous les utilisateurs…"
                value={pnMessage}
                onChange={e => setPnMessage(e.target.value)}
                className="resize-none min-h-[72px] text-sm"
              />
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-slate-600">Couleur :</p>
                <button
                  onClick={() => setPnColor('green')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${pnColor === 'green' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-green-600 border-green-300'}`}
                >
                  <span className="w-2 h-2 rounded-full bg-current" />
                  Verte (info)
                </button>
                <button
                  onClick={() => setPnColor('red')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${pnColor === 'red' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-600 border-red-300'}`}
                >
                  <span className="w-2 h-2 rounded-full bg-current" />
                  Rouge (alerte)
                </button>
              </div>
              <Button
                onClick={() => {
                  if (!pnMessage.trim()) return;
                  createPnMutation.mutate({ message: pnMessage.trim(), color: pnColor });
                }}
                disabled={createPnMutation.isPending || !pnMessage.trim()}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-10 rounded-xl"
              >
                {createPnMutation.isPending ? "Envoi…" : <><Send className="h-4 w-4 mr-2" />Envoyer à tous les utilisateurs</>}
              </Button>
            </div>

            {/* Liste des notifications récentes */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notifications récentes</p>
              {isLoadingPn ? (
                <p className="text-sm text-slate-400 py-4 text-center">Chargement…</p>
              ) : platformNotifs.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">Aucune notification créée</p>
              ) : (
                platformNotifs.map((n: any) => (
                  <div
                    key={n.id}
                    className={`rounded-xl border-2 p-3 space-y-2 ${n.color === 'red' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}
                  >
                    {pnEditId === n.id ? (
                      /* Mode édition */
                      <div className="space-y-2">
                        <Textarea
                          value={pnEditMessage}
                          onChange={e => setPnEditMessage(e.target.value)}
                          className="resize-none min-h-[60px] text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPnEditColor('green')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border-2 ${pnEditColor === 'green' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-green-600 border-green-300'}`}
                          >Verte</button>
                          <button
                            onClick={() => setPnEditColor('red')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border-2 ${pnEditColor === 'red' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-600 border-red-300'}`}
                          >Rouge</button>
                          <div className="ml-auto flex gap-2">
                            <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => setPnEditId(null)}>Annuler</Button>
                            <Button
                              size="sm"
                              className="h-8 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold"
                              disabled={updatePnMutation.isPending}
                              onClick={() => updatePnMutation.mutate({ id: n.id, body: { message: pnEditMessage, color: pnEditColor } })}
                            >
                              {updatePnMutation.isPending ? "…" : "Sauvegarder"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Mode affichage */
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium flex-1 ${n.color === 'red' ? 'text-red-800' : 'text-green-800'}`}>{n.message}</p>
                          <div className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${n.isActive ? (n.color === 'red' ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700') : 'bg-slate-200 text-slate-500'}`}>
                            {n.isActive ? "Active" : "Inactive"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <div className="ml-auto flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-lg text-xs font-bold px-2.5"
                              disabled={updatePnMutation.isPending}
                              onClick={() => updatePnMutation.mutate({ id: n.id, body: { isActive: !n.isActive } })}
                            >
                              {n.isActive ? <><BellOff className="h-3 w-3 mr-1" />Désactiver</> : <><Bell className="h-3 w-3 mr-1" />Activer</>}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-lg text-xs font-bold px-2.5"
                              onClick={() => {
                                setPnEditId(n.id);
                                setPnEditMessage(n.message);
                                setPnEditColor(n.color as 'green' | 'red');
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />Modifier
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 rounded-lg text-xs font-bold px-2.5"
                              disabled={deletePnMutation.isPending}
                              onClick={() => deletePnMutation.mutate(n.id)}
                            >
                              <Trash className="h-3 w-3 mr-1" />Suppr.
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users Section with Real-time Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestion des Utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filter Buttons */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={userFilter === "all" ? "default" : "outline"}
                onClick={() => { setUserFilter("all"); loadUsersIfNeeded(); }}
                disabled={isLoadingUsers || isFetchingUsers}
                data-testid="filter-all-users"
              >
                Tous ({allUsers?.length || 0})
              </Button>
              <Button
                variant={userFilter === "blocked" ? "destructive" : "outline"}
                onClick={() => { setUserFilter("blocked"); loadUsersIfNeeded(); }}
                disabled={isLoadingUsers || isFetchingUsers}
                data-testid="filter-blocked-users"
              >
                <Lock className="h-4 w-4 mr-1" />
                Bloqués ({allUsers?.filter(u => u.isBlocked).length || 0})
              </Button>
              <Button
                variant={userFilter === "active" ? "default" : "outline"}
                onClick={() => { setUserFilter("active"); loadUsersIfNeeded(); }}
                disabled={isLoadingUsers}
                className={userFilter === "active" ? "bg-green-600 hover:bg-green-700" : ""}
                data-testid="filter-active-users"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Actifs ({allUsers?.filter(u => u.isActive).length || 0})
              </Button>
            </div>

            {/* Search Input */}
            <div className="mb-6">
              <Label htmlFor="search-query">Recherche par téléphone ou email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search-query"
                  className="pl-10"
                  placeholder="Tapez au moins 3 caractères pour filtrer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-query"
                />
              </div>
              {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Tapez au moins 3 caractères pour rechercher
                </p>
              )}
              {searchMutation.isPending && (
                <p className="text-sm text-primary mt-1">Recherche en cours...</p>
              )}
            </div>
            
            {/* Users List - Show filtered results or all users */}
            <div>
              {(isLoadingUsers || isFetchingUsers) ? (
                <p className="text-center py-8 text-muted-foreground">Chargement des utilisateurs...</p>
              ) : searchQuery.trim().length >= 3 ? (
                // Show search results
                searchResults.length > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchResults.length} résultat(s) trouvé(s)
                    </p>
                    <UserTable users={searchResults} onSelectUser={setSelectedUser} />
                  </>
                ) : (
                  !searchMutation.isPending && (
                    <p className="text-center py-8 text-muted-foreground">
                      Aucun utilisateur trouvé pour "{searchQuery}"
                    </p>
                  )
                )
              ) : !allUsers ? (
                <p className="text-center py-8 text-muted-foreground">
                  Cliquez sur un filtre ci-dessus pour voir les utilisateurs
                </p>
              ) : (
                // Show filtered users when no search
                (() => {
                  const filteredUsers = allUsers.filter(u => {
                    if (userFilter === "blocked") return u.isBlocked;
                    if (userFilter === "active") return u.isActive;
                    return true;
                  });
                  
                  return filteredUsers.length > 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-4">
                        {filteredUsers.length} utilisateur(s)
                      </p>
                      <UserTable users={filteredUsers} onSelectUser={setSelectedUser} />
                    </>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      Aucun utilisateur {userFilter === "blocked" ? "bloqué" : userFilter === "active" ? "actif" : ""}
                    </p>
                  );
                })()
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Action Modals */}
        {selectedUser && (
          <>
            {/* Balance Update Modal */}
            <Dialog open={balanceModal} onOpenChange={setBalanceModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Modifier le Solde</DialogTitle>
                  <DialogDescription>
                    Utilisateur: {selectedUser.fullName} ({selectedUser.phone})
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="balance-amount">Nouveau Solde (FCFA)</Label>
                    <Input
                      id="balance-amount"
                      type="number"
                      placeholder="Ex: 10000"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      data-testid="input-balance-amount"
                    />
                  </div>
                  <Button 
                    onClick={handleUpdateBalance}
                    disabled={updateBalanceMutation.isPending}
                    data-testid="button-update-balance"
                  >
                    {updateBalanceMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Balance Update Without History Modal */}
            <Dialog open={balanceNoHistoryModal} onOpenChange={setBalanceNoHistoryModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Définir le Solde (Sans Historique)</DialogTitle>
                  <DialogDescription>
                    Utilisateur: {selectedUser.fullName} ({selectedUser.phone})
                    <br />
                    Solde actuel: <strong>{parseFloat(selectedUser.balance || '0').toFixed(0)} FCFA</strong>
                    <br />
                    <span className="text-orange-600">⚠️ Cette action remplace totalement le solde et ne créera pas d'historique</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="balance-amount-no-history">Nouveau Solde Absolu (FCFA)</Label>
                    <Input
                      id="balance-amount-no-history"
                      type="number"
                      placeholder="Ex: 15000 (remplacera le solde actuel)"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      data-testid="input-balance-amount-no-history"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Le solde sera défini exactement à cette valeur, peu importe le solde actuel.
                    </p>
                  </div>
                  <Button 
                    onClick={handleUpdateBalanceNoHistory}
                    disabled={updateBalanceNoHistoryMutation.isPending}
                    variant="secondary"
                    data-testid="button-update-balance-no-history"
                  >
                    {updateBalanceNoHistoryMutation.isPending ? "Définition..." : "Définir le solde (sans historique)"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Password Update Modal */}
            <Dialog open={passwordModal} onOpenChange={setPasswordModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Modifier le Mot de Passe</DialogTitle>
                  <DialogDescription>
                    Utilisateur: {selectedUser.fullName} ({selectedUser.phone})
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-password">Nouveau Mot de Passe</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Nouveau mot de passe"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      data-testid="input-new-password"
                    />
                  </div>
                  <Button 
                    onClick={handleUpdatePassword}
                    disabled={updatePasswordMutation.isPending}
                    data-testid="button-update-password"
                  >
                    {updatePasswordMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Credit Account Modal */}
            <Dialog open={creditModal} onOpenChange={setCreditModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créditer le Compte</DialogTitle>
                  <DialogDescription>
                    Utilisateur: {selectedUser.fullName} ({selectedUser.phone})
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="credit-amount">Montant à Créditer (FCFA)</Label>
                    <Input
                      id="credit-amount"
                      type="number"
                      placeholder="Ex: 5000"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      data-testid="input-credit-amount"
                    />
                  </div>
                  <div>
                    <Label htmlFor="credit-description">Description (visible par l'utilisateur)</Label>
                    <Textarea
                      id="credit-description"
                      placeholder="Ex: Récompenses"
                      value={creditDescription}
                      onChange={(e) => setCreditDescription(e.target.value)}
                      data-testid="input-credit-description"
                    />
                  </div>
                  <Button 
                    onClick={handleCreditAccount}
                    disabled={creditAccountMutation.isPending}
                    data-testid="button-credit-account"
                  >
                    {creditAccountMutation.isPending ? "Crédit en cours..." : "Créditer"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Edit Bank Card Modal */}
      <Dialog open={editBankCardModal} onOpenChange={setEditBankCardModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la Carte Bancaire</DialogTitle>
            <DialogDescription>
              Modification pour l'utilisateur
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-card-first-name">Prénom</Label>
              <Input
                id="edit-card-first-name"
                placeholder="Prénom"
                value={cardFirstName}
                onChange={(e) => setCardFirstName(e.target.value)}
                data-testid="input-edit-card-first-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-card-last-name">Nom</Label>
              <Input
                id="edit-card-last-name"
                placeholder="Nom"
                value={cardLastName}
                onChange={(e) => setCardLastName(e.target.value)}
                data-testid="input-edit-card-last-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-card-number">Numéro de carte</Label>
              <Input
                id="edit-card-number"
                placeholder="+22812345678"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                data-testid="input-edit-card-number"
              />
            </div>
            <Button 
              onClick={() => {
                if (editingBankCard) {
                  updateBankCardMutation.mutate({
                    cardId: editingBankCard.id,
                    firstName: cardFirstName,
                    lastName: cardLastName,
                    cardNumber: cardNumber
                  });
                }
              }}
              disabled={updateBankCardMutation.isPending}
              data-testid="button-save-bank-card"
            >
              {updateBankCardMutation.isPending ? "Mise à jour..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notify All Pending Withdrawals Modal */}
      {/* PCS Codes Modal */}
      <Dialog open={pcsCodesModal} onOpenChange={(open) => {
        if (!open) { setPcsCodesModal(false); setPcsCodesUser(null); setShowNewPcsForm(false); setPcsConfirm(null); setPcsNotify(null); }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>🔑 Codes PCS Secure Pay</DialogTitle>
            <DialogDescription>
              {pcsCodesUser?.fullName || pcsCodesUser?.email || 'Utilisateur'} — {pcsCodesUser?.phone}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">

            {/* ── Bannière confirmation changement statut ── */}
            {pcsConfirm && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-amber-800">⚠️ Confirmer le changement de statut</p>
                <code className="block text-[11px] font-mono text-gray-700 break-all bg-white rounded px-2 py-1 border border-amber-100">
                  {pcsConfirm.code}
                </code>
                <p className="text-xs text-amber-700">
                  Passer de{" "}
                  <span className={`font-bold ${pcsConfirm.currentStatus === 'actif' ? 'text-green-700' : 'text-gray-600'}`}>
                    {pcsConfirm.currentStatus === 'actif' ? '✅ Actif' : '⏸ Inactif'}
                  </span>
                  {" "}→{" "}
                  <span className={`font-bold ${pcsConfirm.newStatus === 'actif' ? 'text-green-700' : 'text-red-600'}`}>
                    {pcsConfirm.newStatus === 'actif' ? '✅ Actif' : '⏸ Inactif'}
                  </span>
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8"
                    onClick={() => setPcsConfirm(null)}>
                    Annuler
                  </Button>
                  <Button size="sm"
                    className="flex-1 text-xs h-8 bg-amber-500 hover:bg-amber-600 text-white"
                    disabled={updatePcsStatusMutation.isPending}
                    onClick={() => updatePcsStatusMutation.mutate({ codeId: pcsConfirm.codeId, status: pcsConfirm.newStatus })}>
                    {updatePcsStatusMutation.isPending ? "En cours…" : "Confirmer"}
                  </Button>
                </div>
              </div>
            )}

            {/* ── Bannière notification email après changement ── */}
            {pcsNotify && (
              <div className="bg-blue-50 border border-blue-300 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-blue-800">📧 Envoyer une notification ?</p>
                <code className="block text-[11px] font-mono text-gray-700 break-all bg-white rounded px-2 py-1 border border-blue-100">
                  {pcsNotify.code}
                </code>
                <p className="text-xs text-blue-700">
                  Envoyer un email à <strong>{pcsCodesUser?.email}</strong> avec le nouveau statut{" "}
                  <span className={`font-bold ${pcsNotify.newStatus === 'actif' ? 'text-green-700' : 'text-red-600'}`}>
                    {pcsNotify.newStatus === 'actif' ? '✅ Actif' : '⏸ Inactif'}
                  </span>{" "}
                  dans le message ?
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8"
                    onClick={() => setPcsNotify(null)}>
                    Non, ignorer
                  </Button>
                  <Button size="sm"
                    className="flex-1 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1"
                    disabled={sendStatusNotifyMutation.isPending}
                    onClick={() => sendStatusNotifyMutation.mutate({ code: pcsNotify.code, status: pcsNotify.newStatus })}>
                    {sendStatusNotifyMutation.isPending
                      ? "Envoi…"
                      : <><Mail className="h-3 w-3" /> Oui, envoyer</>
                    }
                  </Button>
                </div>
              </div>
            )}

            {/* ── Codes existants ── */}
            {isPcsCodesLoading ? (
              <p className="text-center py-6 text-muted-foreground text-sm">Chargement des codes...</p>
            ) : userPcsCodes.length === 0 ? (
              <p className="text-center py-4 text-sm text-muted-foreground">Aucun code PCS pour cet utilisateur.</p>
            ) : (
              userPcsCodes.map((pcs) => (
                <div key={pcs.id}
                  className={`p-3 rounded-xl border space-y-2 ${pcs.status === 'actif' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs font-mono font-bold text-gray-800 break-all">{pcs.code}</code>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(pcs.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0"
                      onClick={() => { navigator.clipboard.writeText(pcs.code); toast({ title: "Copié !" }); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  {/* Bouton toggle statut → confirmation */}
                  <button
                    onClick={() => {
                      if (pcsConfirm || pcsNotify) return;
                      const newStatus = pcs.status === 'actif' ? 'inactif' : 'actif';
                      setPcsConfirm({ codeId: pcs.id, code: pcs.code, currentStatus: pcs.status as 'actif' | 'inactif', newStatus });
                    }}
                    disabled={!!pcsConfirm || !!pcsNotify || updatePcsStatusMutation.isPending}
                    className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-40 ${
                      pcs.status === 'actif'
                        ? 'bg-green-100 border-green-300 text-green-800 hover:bg-red-50 hover:border-red-300 hover:text-red-700'
                        : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700'
                    }`}
                  >
                    {pcs.status === 'actif'
                      ? <><ToggleRight className="h-3.5 w-3.5" /> ✅ Actif — changer le statut</>
                      : <><ToggleLeft className="h-3.5 w-3.5" /> ⏸ Inactif — changer le statut</>
                    }
                  </button>
                </div>
              ))
            )}

            {/* ── Séparateur ── */}
            <div className="border-t pt-3 mt-1">
              <p className="text-xs text-muted-foreground mb-2">{userPcsCodes.length} code(s) existant(s)</p>

              {/* Bouton pour afficher le formulaire nouveau code */}
              {!showNewPcsForm ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-dashed border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => {
                    setNewPcsCode(genPcsCode());
                    setNewPcsStatus('actif');
                    setShowNewPcsForm(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Créer un nouveau code PCS
                </Button>
              ) : (
                <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-blue-800">Nouveau code PCS</p>

                  {/* Champ code + régénérer */}
                  <div className="flex gap-2">
                    <Input
                      value={newPcsCode}
                      onChange={e => setNewPcsCode(e.target.value.toUpperCase())}
                      className="h-9 font-mono text-xs bg-white"
                      placeholder="PCS-XXXX-XXXX-XXXX-XXXX"
                    />
                    <Button size="sm" variant="outline" className="h-9 shrink-0"
                      onClick={() => setNewPcsCode(genPcsCode())}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(newPcsCode);
                        setNewPcsCopied(true);
                        setTimeout(() => setNewPcsCopied(false), 1500);
                      }}>
                      {newPcsCopied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>

                  {/* Toggle statut */}
                  <button
                    onClick={() => setNewPcsStatus(s => s === 'actif' ? 'inactif' : 'actif')}
                    className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      newPcsStatus === 'actif'
                        ? 'bg-green-100 border-green-300 text-green-800 hover:bg-red-50 hover:border-red-300 hover:text-red-700'
                        : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700'
                    }`}
                  >
                    {newPcsStatus === 'actif'
                      ? <><ToggleRight className="h-3.5 w-3.5" /> Actif — cliquer pour Inactif</>
                      : <><ToggleLeft className="h-3.5 w-3.5" /> Inactif — cliquer pour Actif</>
                    }
                  </button>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => setShowNewPcsForm(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700"
                      onClick={() => sendNewPcsMutation.mutate({ code: newPcsCode, status: newPcsStatus })}
                      disabled={!newPcsCode.trim() || sendNewPcsMutation.isPending}
                    >
                      {sendNewPcsMutation.isPending
                        ? "Envoi..."
                        : <><Mail className="h-3.5 w-3.5" /> Envoyer par email</>
                      }
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t">
            <Button variant="outline" size="sm" className="w-full" onClick={() => { setPcsCodesModal(false); setPcsCodesUser(null); setShowNewPcsForm(false); }}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={notifyAllModal} onOpenChange={setNotifyAllModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notifier Tous les Retraits en Attente</DialogTitle>
            <DialogDescription>
              Envoyer un message à tous les utilisateurs avec des retraits en attente ({pendingWithdrawals?.length || 0} utilisateur{(pendingWithdrawals?.length || 0) > 1 ? 's' : ''})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notify-all-message">Message de notification</Label>
              <Textarea
                id="notify-all-message"
                placeholder="Ex: Votre retrait est en cours de traitement. Nous vous tiendrons informé."
                value={notifyAllMessage}
                onChange={(e) => setNotifyAllMessage(e.target.value)}
                rows={4}
                data-testid="input-notify-all-message"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  notifyAllPendingWithdrawalsMutation.mutate(notifyAllMessage);
                }}
                disabled={notifyAllPendingWithdrawalsMutation.isPending || notifyAllMessage.trim().length === 0}
                className="flex-1"
                data-testid="button-send-notify-all"
              >
                {notifyAllPendingWithdrawalsMutation.isPending ? "Envoi..." : "🔔 Envoyer à tous"}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setNotifyAllModal(false);
                  setNotifyAllMessage("");
                }}
                data-testid="button-cancel-notify-all"
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog de confirmation de suppression ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
          {/* Bande rouge en haut */}
          <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 pt-6 pb-5 text-white">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Trash className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-white text-base font-black m-0">Supprimer ce compte ?</DialogTitle>
            </div>
            <DialogDescription className="text-red-100 text-xs mt-2 leading-relaxed">
              Cette action est <span className="font-black text-white">irréversible</span>. Toutes les données de l'utilisateur seront définitivement effacées.
            </DialogDescription>
          </div>

          {/* Bloc infos utilisateur */}
          <div className="px-6 py-4 bg-red-50 border-b border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-black">
                  {(deleteConfirm?.userName || deleteConfirm?.userEmail || '?')[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                {deleteConfirm?.userName && (
                  <p className="text-slate-800 font-bold text-sm truncate">{deleteConfirm.userName}</p>
                )}
                <p className="text-slate-500 text-xs truncate font-mono">{deleteConfirm?.userEmail}</p>
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-2 px-6 py-4">
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl font-bold text-sm border-2"
              onClick={() => setDeleteConfirm(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-10 rounded-xl font-black text-sm bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 border-0 shadow-lg shadow-red-200"
              disabled={deleteUserMutation.isPending}
              onClick={() => {
                if (deleteConfirm) {
                  deleteUserMutation.mutate(deleteConfirm.userId);
                  setDeleteConfirm(null);
                }
              }}
            >
              {deleteUserMutation.isPending ? "Suppression…" : "Oui, supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}