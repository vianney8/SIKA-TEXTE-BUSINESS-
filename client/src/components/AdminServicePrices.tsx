import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { refreshSite } from "@/hooks/useLiveUpdates";
import { serviceAmount } from "@shared/service-pricing";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PriceLink = { id: string; label: string; amount: string; currency: string; isActive: boolean };
type Row = { id: string; label: string; amount: string; currency: string; setting?: string };

export default function AdminServicePrices() {
  const { toast } = useToast();
  const links = useQuery<PriceLink[]>({ queryKey: ["/api/admin/payment-links"] });
  const settings = useQuery<{ key: string; value: string }[]>({ queryKey: ["/api/admin/settings"] });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const getSetting = (key: string, fallback: string) => settings.data?.find(item => item.key === key)?.value ?? fallback;
  const rows: Row[] = [
    { id: "account", setting: "activation_amount", label: "Activation du compte", amount: getSetting("activation_amount", "3600"), currency: "XOF" },
    { id: "ci", setting: "ci_update_amount", label: "Mise à jour Côte d’Ivoire", amount: getSetting("ci_update_amount", "1200"), currency: "XOF" },
    ...(links.data ?? []).filter(link => link.id !== "d3e5479d" || !links.data?.some(item => item.id === "codepcs")),
  ];
  const save = useMutation({
    mutationFn: async (row: Row) => {
      const amount = serviceAmount(drafts[row.id] ?? row.amount, row.currency);
      if (!amount) throw new Error("Saisissez un montant positif avec au plus deux décimales.");
      const response = row.setting
        ? await apiRequest("PUT", `/api/admin/settings/${row.setting}`, { value: amount })
        : await apiRequest("PATCH", `/api/admin/payment-links/${row.id}`, { amount });
      return response.json();
    },
    onSuccess: async (_data, row) => {
      refreshSite(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-links"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
      ]);
      setDrafts(current => { const next = { ...current }; delete next[row.id]; return next; });
      toast({ title: "Tarif enregistré", description: "Les pages et liens de paiement sont mis à jour automatiquement." });
    },
    onError: error => toast({ title: "Tarif non enregistré", description: error.message, variant: "destructive" }),
  });
  return (
    <Card data-testid="admin-service-prices">
      <CardHeader>
        <CardTitle>Tarifs des services</CardTitle>
        <CardDescription>PCS, activation PCS, DNS et tous les liens. Chaque tarif s’enregistre séparément et s’applique aux nouveaux paiements. Les transactions déjà lancées gardent leur montant. Pour un lien externe à montant fixe, modifiez également le tarif chez le prestataire.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(links.isError || settings.isError) && <div role="alert">Impossible de charger les tarifs. <button className="underline" onClick={() => { void links.refetch(); void settings.refetch(); }}>Réessayer</button></div>}
        {links.isPending || settings.isPending ? <p role="status">Chargement des tarifs…</p> : rows.map(row => (
          <div key={row.id} className="flex flex-wrap items-end gap-3 rounded-xl border p-3">
            <label className="min-w-0 flex-1" htmlFor={`price-${row.id}`}>
              <span className="mb-2 block text-sm font-medium">{row.label}</span>
              <Input id={`price-${row.id}`} data-testid={`price-${row.id}`} type="number" min={row.currency === "XOF" ? "1" : "0.01"} step={row.currency === "XOF" ? "1" : "0.01"} inputMode="decimal" disabled={save.isPending}
                value={drafts[row.id] ?? row.amount} onChange={event => setDrafts(current => ({ ...current, [row.id]: event.target.value }))} />
            </label>
            <span className="pb-2 text-sm text-muted-foreground">{row.currency || "XOF"}</span>
            <Button type="button" data-testid={`save-price-${row.id}`} disabled={save.isPending || drafts[row.id] === undefined}
              onClick={() => save.mutate(row)}>{save.isPending && save.variables?.id === row.id ? "Enregistrement…" : "Enregistrer"}</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
