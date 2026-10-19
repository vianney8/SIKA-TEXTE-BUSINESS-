import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, ChevronRight, LoaderCircle, RefreshCw, ShieldCheck, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { defaultDnsAnnouncement, type AdminDnsVersion } from "@shared/dns-version";

type PublishResult = AdminDnsVersion;

export default function AdminDnsVersion() {
  const { toast } = useToast();
  const [version, setVersion] = useState("");
  const [message, setMessage] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [expectedVersion, setExpectedVersion] = useState("");
  const { data, isLoading, isError, refetch } = useQuery<AdminDnsVersion>({
    queryKey: ["/api/admin/dns-version"],
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("La version actuelle n’est pas disponible.");
      const response = await apiRequest("POST", "/api/admin/dns-version", {
        expectedVersion,
        version: version.trim(),
        message: message.trim(),
      });
      return response.json() as Promise<PublishResult>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["/api/admin/dns-version"], result);
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/dns-version"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/withdrawal/dns-update-status"] });
      toast({ title: "Version DNS publiée", description: `${result.currentVersion} est maintenant la version active.` });
      setVersion("");
      setMessage("");
      setReviewing(false);
    },
    onError: (error: Error) => {
      void refetch();
      toast({
        title: "Publication impossible",
        description: error.message || "Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const canReview = !!version.trim() && version.trim() !== data?.currentVersion;
  const messageIncludesVersion = !!version.trim() && message.includes(version.trim());

  return (
    <Card className="mb-6 overflow-hidden border-teal-200/80 shadow-[0_14px_38px_hsl(170_55%_25%/.08)]">
      <CardHeader className="border-b border-teal-100 bg-gradient-to-r from-teal-50 via-emerald-50/70 to-amber-50/60">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-700 text-white shadow-md shadow-teal-900/15">
            <Wifi size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="sika-kicker">Publication contrôlée</p>
            <CardTitle className="mt-1">Versions du DNS privé</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              Publiez une version et son annonce aux clients ayant déjà acheté une mise à jour DNS.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5 sm:p-6">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-label="Chargement de la version DNS">
            <div className="h-16 animate-pulse rounded-2xl bg-teal-50" />
            <div className="h-11 animate-pulse rounded-xl bg-muted/60" />
          </div>
        ) : isError || !data ? (
          <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between">
            <p>Impossible de charger la configuration de version.</p>
            <Button type="button" variant="outline" onClick={() => void refetch()} className="border-rose-200 bg-white text-rose-800">
              <RefreshCw className="mr-2 h-4 w-4" /> Réessayer
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[.13em] text-teal-800">Version en service</p>
                <p className="mt-1 font-mono text-2xl font-black tracking-tight text-teal-950">{data.currentVersion}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:min-w-48">
                <p className="text-[11px] font-extrabold uppercase tracking-[.12em] text-amber-800">Destinataires éligibles</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-amber-950">{data.affectedUsers.toLocaleString("fr-FR")}</p>
                <p className="text-xs text-amber-800">anciens acheteurs DNS</p>
              </div>
            </div>

            {!reviewing ? (
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="dns-next-version">Nouvelle version</Label>
                  <Input id="dns-next-version" value={version} onChange={(event) => setVersion(event.target.value)}
                    placeholder="Ex. v.026" autoComplete="off" aria-describedby="dns-version-help" />
                  <p id="dns-version-help" className="text-xs text-muted-foreground">Choisissez un identifiant différent de la version active.</p>
                </div>
                <Button type="button" onClick={() => { setMessage(defaultDnsAnnouncement(version.trim())); setExpectedVersion(data.currentVersion); setReviewing(true); }}
                  disabled={!canReview} className="h-11 bg-teal-700 text-white hover:bg-teal-800">
                  Examiner l’annonce <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <section aria-labelledby="dns-review-title" className="space-y-4 rounded-2xl border border-teal-200 bg-[#f4fbf8] p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-teal-700 shadow-sm"><ShieldCheck size={18} /></div>
                  <div>
                    <h3 id="dns-review-title" className="font-bold text-foreground">Confirmer la publication · {version.trim()}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Relisez le message envoyé aux {data.affectedUsers.toLocaleString("fr-FR")} clients concernés.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dns-announcement">Annonce de version</Label>
                  <textarea id="dns-announcement" value={message} onChange={(event) => setMessage(event.target.value)}
                    rows={5} aria-describedby="dns-message-hint"
                    className="w-full resize-y rounded-xl border border-border bg-card px-3.5 py-3 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600" />
                  <p id="dns-message-hint" className={`text-xs ${messageIncludesVersion ? "text-muted-foreground" : "font-semibold text-amber-800"}`}>
                    {messageIncludesVersion ? "Le message contient l’identifiant de version." : `Le message doit inclure « ${version.trim()} ».`}
                  </p>
                </div>
                <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm leading-relaxed text-amber-950">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
                  <p>La publication rend obsolètes les versions DNS déjà achetées. Le message s’affichera à chaque visite de la page de retrait jusqu’à validation de la nouvelle mise à jour. Les paiements historiques restent conservés.</p>
                </div>
                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-between">
                  <Button type="button" variant="ghost" disabled={publishMutation.isPending} onClick={() => setReviewing(false)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour / annuler
                  </Button>
                  <Button type="button" disabled={publishMutation.isPending || !messageIncludesVersion}
                    onClick={() => publishMutation.mutate()} className="min-h-11 bg-teal-700 text-white hover:bg-teal-800">
                    {publishMutation.isPending
                      ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Publication…</>
                      : <><Check className="mr-2 h-4 w-4" /> Publier {version.trim()}</>}
                  </Button>
                </div>
              </section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
