import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, DollarSign, TrendingUp, TrendingDown, Search, Edit, Trash, Lock, Unlock, CheckCircle, Settings } from "lucide-react";
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

export default function AdminDashboard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  
  // Modals state
  const [balanceModal, setBalanceModal] = useState(false);
  const [balanceNoHistoryModal, setBalanceNoHistoryModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [creditModal, setCreditModal] = useState(false);
  
  // Form state
  const [balanceAmount, setBalanceAmount] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  
  // Settings state
  const [settingsModal, setSettingsModal] = useState(false);
  const [settings, setSettings] = useState<{[key: string]: string}>({});
  const [identityModal, setIdentityModal] = useState(false);
  const [withdrawalsModal, setWithdrawalsModal] = useState(false);
  
  // Fetch identity verifications
  const { data: identityVerifications } = useQuery({
    queryKey: ['/api/admin/identity-verifications'],
  });

  // Fetch pending withdrawals
  const { data: pendingWithdrawals = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/withdrawals/pending'],
  });

  // Withdrawal approval mutations
  const approveWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      return fetch(`/api/admin/withdrawals/${withdrawalId}/approve`, {
        method: 'POST',
        credentials: 'include'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
      toast({ title: "Retrait approuvé avec succès" });
    }
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      return fetch(`/api/admin/withdrawals/${withdrawalId}/reject`, {
        method: 'POST',
        credentials: 'include'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
      toast({ title: "Retrait rejeté" });
    }
  });

  // Fetch admin statistics
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
  });

  // Fetch all users with referrals
  const { data: allUsers } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
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

  // Update balance mutation
  const updateBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: string }) => {
      return apiRequest('POST', `/api/admin/users/${userId}/balance`, {
        amount: parseFloat(amount),
        description: "Modification administrateur"
      });
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Solde mis à jour avec succès",
      });
      setBalanceModal(false);
      setBalanceAmount("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
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
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Solde mis à jour avec succès (sans historique)",
      });
      setBalanceNoHistoryModal(false);
      setBalanceAmount("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      return apiRequest('POST', `/api/admin/users/${userId}/password`, { newPassword });
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Mot de passe mis à jour avec succès",
      });
      setPasswordModal(false);
      setNewPassword("");
    },
  });

  // Block/Unblock user mutation
  const blockUserMutation = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      return apiRequest('POST', `/api/admin/users/${userId}/block`, { blocked });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Succès",
        description: variables.blocked ? "Utilisateur bloqué" : "Utilisateur débloqué",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Utilisateur supprimé définitivement",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
  });

  // Activate account mutation
  const activateAccountMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest('POST', `/api/admin/users/${userId}/activate`);
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Compte activé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  // Deactivate account mutation
  const deactivateAccountMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest('POST', `/api/admin/users/${userId}/deactivate`);
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Compte désactivé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  // Credit account mutation
  const creditAccountMutation = useMutation({
    mutationFn: async ({ userId, amount, description }: { userId: string; amount: string; description: string }) => {
      return apiRequest('POST', `/api/admin/users/${userId}/balance`, {
        amount: parseFloat(amount),
        description
      });
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Compte crédité avec succès",
      });
      setCreditModal(false);
      setCreditAmount("");
      setCreditDescription("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
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
        newPassword
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
                    <div className="font-medium">{user.fullName}</div>
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
            <Button
              onClick={() => setIdentityModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              Cartes ID
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

        {/* Pending Withdrawals Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Retraits en Attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingWithdrawals && pendingWithdrawals.length > 0 ? (
              <div className="space-y-3">
                {pendingWithdrawals.map((withdrawal: any) => (
                  <div key={withdrawal.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{parseFloat(withdrawal.amount || '0').toFixed(0)} FCFA</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Utilisateur: {withdrawal.userFullName || withdrawal.userId}
                      </p>
                      <p className="text-xs text-slate-500">
                        Téléphone: {withdrawal.phoneNumber}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(withdrawal.createdAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => approveWithdrawalMutation.mutate(withdrawal.id)}
                        disabled={approveWithdrawalMutation.isPending}
                        data-testid={`button-approve-withdrawal-${withdrawal.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Valider
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Rejeter ce retrait ?")) {
                            rejectWithdrawalMutation.mutate(withdrawal.id);
                          }
                        }}
                        disabled={rejectWithdrawalMutation.isPending}
                        data-testid={`button-reject-withdrawal-${withdrawal.id}`}
                      >
                        ✖ Rejeter
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                Aucun retrait en attente
              </div>
            )}
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
              {searchQuery.trim().length >= 3 ? (
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
              ) : (
                // Show all users when no search
                allUsers && allUsers.length > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      {allUsers.length} utilisateur(s) au total
                    </p>
                    <UserTable users={allUsers} onSelectUser={setSelectedUser} />
                  </>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur
                  </p>
                )
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
    </div>
  );
}