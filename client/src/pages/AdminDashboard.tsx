import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, DollarSign, TrendingUp, TrendingDown, Search, Edit, Trash, Lock, Unlock, CheckCircle, XCircle, Settings, MessageCircle, MessageSquareOff, RefreshCw, Link2, Plus, Copy, ToggleLeft, ToggleRight, ExternalLink } from "lucide-react";
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

  // Payment links
  const [paymentLinkModal, setPaymentLinkModal] = useState(false);
  const [plLabel, setPlLabel] = useState("");
  const [plAmount, setPlAmount] = useState("");
  const [plDescription, setPlDescription] = useState("");
  const [plImageUrl, setPlImageUrl] = useState("");
  const [plImagePreview, setPlImagePreview] = useState("");
  const [plImageUploading, setPlImageUploading] = useState(false);
  
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
                    <div className="font-bold">{user.fullName}</div>
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
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?")) {
                          deleteUserMutation.mutate(user.id);
                        }
                      }}
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
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">Tableau de Bord Administrateur</h1>
            <p className="text-blue-100">SIKA TEXTE BUSINESS - Administration</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <a href="/admin/settings" data-testid="button-admin-settings">
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </a>
            </Button>
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white relative">
              <a href="/admin/ci-update">
                <RefreshCw className="h-4 w-4 mr-2" />
                MàJ +225
                {ciPendingUsers.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {ciPendingUsers.length}
                  </span>
                )}
              </a>
            </Button>
            <Button asChild className="bg-red-600 hover:bg-red-700 text-white relative">
              <a href="/admin/withdrawals">
                <TrendingDown className="h-4 w-4 mr-2" />
                Retraits
                {pendingWithdrawals.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {pendingWithdrawals.length}
                  </span>
                )}
              </a>
            </Button>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white relative">
              <a href="/admin/messages" data-testid="button-admin-messages">
                <MessageCircle className="h-4 w-4 mr-2" />
                Messages
                {totalUnreadMessages > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {totalUnreadMessages}
                  </span>
                )}
              </a>
            </Button>
            <Button
              onClick={() => toggleChatMutation.mutate()}
              disabled={toggleChatMutation.isPending}
              className={`${isChatEnabled ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
              data-testid="button-toggle-chat"
            >
              {isChatEnabled ? (
                <>
                  <MessageSquareOff className="h-4 w-4 mr-2" />
                  Désactiver Chat
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Activer Chat
                </>
              )}
            </Button>
            <Button
              onClick={() => setIdentityModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Users className="w-4 w-4 mr-2" />
              Cartes ID
            </Button>
            <Button
              onClick={() => setOnlineUsersModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="button-online-users"
            >
              <Users className="w-4 h-4 mr-2" />
              👥 Connectés
            </Button>
            <button
              onClick={() => {
                fetch('/api/auth/logout', { method: 'POST' })
                  .then(() => window.location.href = '/simple-login')
                  .catch(() => window.location.href = '/simple-login');
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              data-testid="button-logout"
            >
              Déconnexion
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
                        onClick={() => toggleLinkMutation.mutate(link.id)}>
                        {link.isActive
                          ? <><ToggleRight className="h-3 w-3 text-green-600" /> Désactiver</>
                          : <><ToggleLeft className="h-3 w-3 text-gray-400" /> Activer</>
                        }
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 px-2 text-xs gap-1"
                        onClick={() => { if (confirm("Supprimer ce lien ?")) deleteLinkMutation.mutate(link.id); }}>
                        <Trash className="h-3 w-3" /> Supp.
                      </Button>
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
    </div>
  );
}