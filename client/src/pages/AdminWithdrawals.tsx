import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { TrendingDown, CheckCircle, XCircle, Edit, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

export default function AdminWithdrawals() {
  const { toast } = useToast();
  const [notifyAllModal, setNotifyAllModal] = useState(false);
  const [notifyAllMessage, setNotifyAllMessage] = useState("");
  const [editBankCardModal, setEditBankCardModal] = useState(false);
  const [editingBankCard, setEditingBankCard] = useState<any>(null);
  const [cardFirstName, setCardFirstName] = useState("");
  const [cardLastName, setCardLastName] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  const { data: pendingWithdrawals = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/withdrawals/pending'],
    staleTime: 15000,
    refetchInterval: 30000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
  };

  const approveWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const response = await apiRequest('POST', `/api/admin/withdrawals/${withdrawalId}/approve`);
      return response.json();
    },
    onSuccess: () => { invalidate(); toast({ title: "✓ Retrait approuvé" }); },
    onError: () => toast({ title: "Erreur", description: "Erreur lors de l'approbation", variant: "destructive" })
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const response = await apiRequest('POST', `/api/admin/withdrawals/${withdrawalId}/reject`);
      return response.json();
    },
    onSuccess: () => { invalidate(); toast({ title: "✓ Retrait rejeté" }); },
    onError: () => toast({ title: "Erreur", description: "Erreur lors du rejet", variant: "destructive" })
  });

  const cancelWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const response = await apiRequest('POST', `/api/admin/withdrawals/${withdrawalId}/cancel`);
      return response.json();
    },
    onSuccess: () => { invalidate(); toast({ title: "✓ Retrait annulé et utilisateur remboursé" }); },
    onError: (error: any) => toast({ title: "Erreur", description: error.message || "Erreur lors de l'annulation", variant: "destructive" })
  });

  const approveAllWithdrawalsMutation = useMutation({
    mutationFn: async () => apiRequest('POST', '/api/admin/withdrawals/approve-all'),
    onSuccess: () => { invalidate(); toast({ title: "Tous les retraits validés" }); },
    onError: (error: any) => toast({ title: "Erreur", description: error.message || "Erreur", variant: "destructive" })
  });

  const rejectAllWithdrawalsMutation = useMutation({
    mutationFn: async () => apiRequest('POST', '/api/admin/withdrawals/reject-all'),
    onSuccess: () => { invalidate(); toast({ title: "Tous les retraits rejetés" }); },
    onError: (error: any) => toast({ title: "Erreur", description: error.message || "Erreur", variant: "destructive" })
  });

  const cancelAllWithdrawalsMutation = useMutation({
    mutationFn: async () => apiRequest('POST', '/api/admin/withdrawals/cancel-all'),
    onSuccess: () => { invalidate(); toast({ title: "Tous les retraits annulés et utilisateurs remboursés" }); },
    onError: (error: any) => toast({ title: "Erreur", description: error.message || "Erreur", variant: "destructive" })
  });

  const notifyAllPendingWithdrawalsMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/admin/notify-all-pending-withdrawals', { message });
      return response.json();
    },
    onSuccess: (data) => {
      setNotifyAllModal(false);
      setNotifyAllMessage("");
      toast({ title: "Notifications envoyées", description: data.message || `${data.count} utilisateur(s) notifié(s)` });
    },
    onError: (error: any) => toast({ title: "Erreur", description: error.message || "Erreur lors de l'envoi", variant: "destructive" })
  });

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
      const prev = queryClient.getQueryData(['/api/admin/withdrawals/pending']);
      queryClient.setQueryData(['/api/admin/withdrawals/pending'], (old: any) =>
        old?.map((w: any) =>
          w.bankCardId === data.cardId
            ? { ...w, bankCardFirstName: data.firstName, bankCardLastName: data.lastName, bankCardNumber: data.cardNumber }
            : w
        )
      );
      setEditBankCardModal(false);
      setEditingBankCard(null);
      toast({ title: "✓ Carte mise à jour" });
      return { prev };
    },
    onError: (error: any, _data, context) => {
      queryClient.setQueryData(['/api/admin/withdrawals/pending'], context?.prev);
      toast({ title: "Erreur", description: error.message || "Erreur", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-blue-600 p-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrendingDown className="h-6 w-6" />
              Retraits en Attente
            </h1>
            <p className="text-blue-100 text-sm">{pendingWithdrawals.length} retrait(s) en attente</p>
          </div>
        </div>

        {/* Bulk actions */}
        {pendingWithdrawals.length > 0 && (
          <Card className="mb-4">
            <CardContent className="pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Actions groupées ({pendingWithdrawals.length} retrait(s))</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  onClick={() => setNotifyAllModal(true)}
                >
                  🔔 Notifier tout
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Rejeter les ${pendingWithdrawals.length} retrait(s) en attente ?`)) {
                      rejectAllWithdrawalsMutation.mutate();
                    }
                  }}
                  disabled={rejectAllWithdrawalsMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {rejectAllWithdrawalsMutation.isPending ? "Rejet..." : "Rejeter tout"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  onClick={() => {
                    if (confirm(`ATTENTION : Annuler les ${pendingWithdrawals.length} retrait(s) va les supprimer et rembourser les utilisateurs. Continuer ?`)) {
                      cancelAllWithdrawalsMutation.mutate();
                    }
                  }}
                  disabled={cancelAllWithdrawalsMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {cancelAllWithdrawalsMutation.isPending ? "Annulation..." : "Annuler tout"}
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    if (confirm(`Valider les ${pendingWithdrawals.length} retrait(s) en attente ?`)) {
                      approveAllWithdrawalsMutation.mutate();
                    }
                  }}
                  disabled={approveAllWithdrawalsMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {approveAllWithdrawalsMutation.isPending ? "Validation..." : "Valider tout"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Withdrawal list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Liste des retraits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : pendingWithdrawals.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
                <p>Aucun retrait en attente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingWithdrawals.map((withdrawal: any) => (
                  <div key={withdrawal.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{parseFloat(withdrawal.amount || '0').toFixed(0)} FCFA</p>
                        <p className="text-sm text-slate-600">
                          {withdrawal.userFullName || withdrawal.userId}
                        </p>
                        <p className="text-xs text-slate-500">{withdrawal.userPhone}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(withdrawal.createdAt).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => approveWithdrawalMutation.mutate(withdrawal.id)}
                          disabled={approveWithdrawalMutation.isPending}
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
                        >
                          ✖ Rejeter
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-orange-500 text-orange-600 hover:bg-orange-50"
                          onClick={() => {
                            if (confirm("ATTENTION : Annuler ce retrait va le supprimer et rembourser l'utilisateur. Continuer ?")) {
                              cancelWithdrawalMutation.mutate(withdrawal.id);
                            }
                          }}
                          disabled={cancelWithdrawalMutation.isPending}
                        >
                          🗑️ Annuler
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const message = prompt("Message de notification :");
                            if (message) {
                              fetch('/api/admin/notifications', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ userId: withdrawal.userId, message })
                              }).then(() => toast({ title: "Notification envoyée !" }));
                            }
                          }}
                        >
                          🔔 Notifier
                        </Button>
                      </div>
                    </div>

                    {/* Bank Card Info */}
                    {withdrawal.bankCardId ? (
                      <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-blue-800 mb-1">💳 Carte bancaire</p>
                            <p className="text-sm font-medium text-blue-900">
                              {withdrawal.bankCardFirstName} {withdrawal.bankCardLastName}
                            </p>
                            <p className="text-xs text-blue-700">{withdrawal.bankCardNumber}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingBankCard({
                                id: withdrawal.bankCardId,
                                firstName: withdrawal.bankCardFirstName,
                                lastName: withdrawal.bankCardLastName,
                                cardNumber: withdrawal.bankCardNumber,
                                userId: withdrawal.userId
                              });
                              setCardFirstName(withdrawal.bankCardFirstName || '');
                              setCardLastName(withdrawal.bankCardLastName || '');
                              setCardNumber(withdrawal.bankCardNumber || '');
                              setEditBankCardModal(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-amber-600">⚠️ Aucune carte bancaire enregistrée</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notify all modal */}
        <Dialog open={notifyAllModal} onOpenChange={setNotifyAllModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>🔔 Notifier tous les utilisateurs en attente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="notify-message">Message</Label>
                <Textarea
                  id="notify-message"
                  placeholder="Votre message pour tous les utilisateurs avec un retrait en attente..."
                  value={notifyAllMessage}
                  onChange={(e) => setNotifyAllMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setNotifyAllModal(false)}>Annuler</Button>
                <Button
                  onClick={() => {
                    if (notifyAllMessage.trim()) {
                      notifyAllPendingWithdrawalsMutation.mutate(notifyAllMessage.trim());
                    }
                  }}
                  disabled={!notifyAllMessage.trim() || notifyAllPendingWithdrawalsMutation.isPending}
                >
                  {notifyAllPendingWithdrawalsMutation.isPending ? "Envoi..." : "Envoyer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit bank card modal */}
        <Dialog open={editBankCardModal} onOpenChange={setEditBankCardModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier la carte bancaire</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="card-firstname">Prénom</Label>
                <Input
                  id="card-firstname"
                  value={cardFirstName}
                  onChange={(e) => setCardFirstName(e.target.value)}
                  placeholder="Prénom"
                />
              </div>
              <div>
                <Label htmlFor="card-lastname">Nom</Label>
                <Input
                  id="card-lastname"
                  value={cardLastName}
                  onChange={(e) => setCardLastName(e.target.value)}
                  placeholder="Nom"
                />
              </div>
              <div>
                <Label htmlFor="card-number">Numéro de carte</Label>
                <Input
                  id="card-number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="Numéro de carte"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditBankCardModal(false)}>Annuler</Button>
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
                >
                  {updateBankCardMutation.isPending ? "Mise à jour..." : "Sauvegarder"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
