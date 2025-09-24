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
  
  // Fetch identity verifications
  const { data: identityVerifications } = useQuery({
    queryKey: ['/api/admin/identity-verifications'],
    refetchInterval: 60000,
  });

  // Fetch admin statistics
  const { data: stats, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch all users with referrals
  const { data: allUsers, refetch: refetchUsers } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Search users mutation (by phone or email)
  const searchMutation = useMutation<AdminUser[], Error, string>({
    mutationFn: async (query: string): Promise<AdminUser[]> => {
      const response = await apiRequest('GET', `/api/admin/users/search?query=${encodeURIComponent(query)}`);
      return response as unknown as AdminUser[];
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
      refetchUsers();
      refetchStats();
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
      refetchUsers();
      refetchStats();
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
      refetchUsers();
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
      refetchUsers();
      refetchStats();
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
      refetchUsers();
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
      refetchUsers();
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
      refetchUsers();
      refetchStats();
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery.trim());
    }
  };

  // Recherche en temps réel
  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      const debounceTimer = setTimeout(() => {
        searchMutation.mutate(searchQuery.trim());
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
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

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Recherche d'Utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search-phone">Numéro de téléphone</Label>
                <Input
                  id="search-query"
                  placeholder="Ex: +22812345678 ou email@example.com"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-query"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleSearch}
                  disabled={searchMutation.isPending}
                  data-testid="button-search"
                >
                  {searchMutation.isPending ? "Recherche..." : "Rechercher"}
                </Button>
              </div>
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Résultats de recherche</h3>
                <UserTable users={searchResults} onSelectUser={setSelectedUser} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Users Section */}
        <Card>
          <CardHeader>
            <CardTitle>Tous les Utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            {allUsers && allUsers.length > 0 && (
              <UserTable users={allUsers} onSelectUser={setSelectedUser} />
            )}
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
                      placeholder="Ex: Pointage pour retrait"
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
                <td className="border border-gray-300 px-4 py-2">{user.phone}</td>
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
                    
                    {user.isActive ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deactivateAccountMutation.mutate(user.id)}
                        data-testid={`button-deactivate-${user.id}`}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Rendre inactif
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => activateAccountMutation.mutate(user.id)}
                        data-testid={`button-activate-${user.id}`}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Activer
                      </Button>
                    )}
                    
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
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{verification.userPhone || verification.userId}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(verification.submittedAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant={verification.status === 'approved' ? 'default' : 'secondary'}>
                      {verification.status === 'approved' ? 'Approuvé' : verification.status === 'pending' ? 'En attente' : 'Rejeté'}
                    </Badge>
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
        {stats && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers || 0}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      
      {/* User Search Results */}
      {searchResults.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Résultats de recherche ({searchResults.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <UserTable users={searchResults} onSelectUser={setSelectedUser} />
          </CardContent>
        </Card>
      )}

      {/* All Users */}
      {allUsers && allUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tous les utilisateurs ({allUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <UserTable users={allUsers} onSelectUser={setSelectedUser} />
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}