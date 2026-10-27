import { useEffect, useId, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  MessageSquareOff,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UserRoundMinus,
  UsersRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Filter = "active" | "restricted" | "excluded" | "banned";
type MemberAction =
  | "restrict_posting"
  | "allow_posting"
  | "remove"
  | "block"
  | "restore"
  | "unblock";
type ModerationMember = {
  id: string;
  fullName: string;
  photoUrl?: string;
  role: string;
  status: "active" | "pending" | "left" | "banned";
  postingBlocked: boolean;
  canModerate: boolean;
  excluded?: boolean;
};
type MembersResponse = {
  members: ModerationMember[];
  counts: { active: number; restricted: number; excluded: number; banned: number };
  total: number;
  hasMore: boolean;
};
type Props = {
  slug: string;
  viewerId: string;
  smartModerationEnabled: boolean;
  pending: boolean;
  onAction: (memberId: string, action: MemberAction) => void;
  onToggleSmart: (enabled: boolean) => void;
};

const PAGE_SIZE = 40;
const tabs: { filter: Filter; label: string; count: keyof MembersResponse["counts"] }[] = [
  { filter: "active", label: "Membres", count: "active" },
  { filter: "restricted", label: "Envoi bloqué", count: "restricted" },
  { filter: "excluded", label: "Exclus", count: "excluded" },
  { filter: "banned", label: "Exclus et bloqués", count: "banned" },
];

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("fr") || "S";

async function fetchMembers(
  slug: string,
  filter: Filter,
  search: string,
  offset: number,
): Promise<MembersResponse> {
  const params = new URLSearchParams({
    filter,
    q: search,
    offset: String(offset),
  });
  const response = await fetch(
    `/api/groups/${encodeURIComponent(slug)}/admin/members?${params.toString()}`,
    { credentials: "include", cache: "no-store" },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || "La liste des membres est indisponible.");
  }
  return body as MembersResponse;
}

export default function GroupModerationTools({
  slug,
  viewerId,
  smartModerationEnabled,
  pending,
  onAction,
  onToggleSmart,
}: Props) {
  const id = useId();
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setFilter("active");
    setSearch("");
    setDebouncedSearch("");
    setOffset(0);
  }, [slug]);

  useEffect(() => {
    setOffset(0);
  }, [filter, debouncedSearch]);

  const membersQuery = useQuery<MembersResponse>({
    queryKey: ["/api/groups/" + slug + "/admin/members", viewerId, filter, debouncedSearch, offset],
    queryFn: () => fetchMembers(slug, filter, debouncedSearch, offset),
    enabled: Boolean(slug),
    refetchInterval: 8_000,
    staleTime: 0,
  });
  const data = membersQuery.data;
  useEffect(()=>{
    if(data&&offset>0&&offset>=data.total)setOffset(Math.max(0,Math.floor((data.total-1)/PAGE_SIZE)*PAGE_SIZE));
  },[data,offset]);
  const members = data?.members ?? [];
  const counts = data?.counts ?? { active: 0, restricted: 0, excluded: 0, banned: 0 };
  const canGoBack = offset > 0;
  const canGoForward = Boolean(data?.hasMore);

  const confirmAction = (member: ModerationMember, action: MemberAction) => {
    const name = member.fullName || "ce membre";
    const explanation: Record<MemberAction, string> = {
      restrict_posting: `${name} ne pourra plus envoyer de messages dans le groupe. Il pourra toujours lire la discussion. Appliquer cette restriction ?`,
      allow_posting: `Autoriser de nouveau ${name} à envoyer des messages dans le groupe ?`,
      remove: `Exclure ${name} du groupe ? Cette personne pourra demander à rejoindre le groupe selon ses règles.`,
      block: `Exclure ${name} et bloquer sa participation au groupe ?`,
      restore: `Réintégrer ${name} immédiatement comme membre ordinaire ? Ses anciens droits d’administration ne seront pas rétablis.`,
      unblock: `Lever le blocage de ${name} ? Cette personne ne sera pas réintégrée automatiquement et devra rejoindre le groupe selon ses règles.`,
    };
    if (window.confirm(explanation[action])) onAction(member.id, action);
  };

  const confirmSmartModeration = () => {
    const enabling = !smartModerationEnabled;
    const explanation = enabling
      ? "Activer le filtre automatique de mots et d’expressions ? Les messages contenant des termes interdits seront refusés avant leur publication. Les administrateurs ne sont pas concernés."
      : "Désactiver le filtre automatique de mots et d’expressions ? Les messages ne seront plus refusés par ce filtre.";
    if (window.confirm(explanation)) onToggleSmart(enabling);
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = tabs.findIndex((tab) => tab.filter === filter);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    setOffset(0);
    setFilter(tabs[nextIndex].filter);
    document.getElementById(`${id}-tab-${tabs[nextIndex].filter}`)?.focus();
  };

  const renderActions = (member: ModerationMember) => {
    if (!member.canModerate || member.id === viewerId || pending) return null;
    const actionButton = (
      action: MemberAction,
      label: string,
      icon: ReactNode,
      variant: "outline" | "destructive" = "outline",
    ) => (
      <Button
        key={action}
        type="button"
        size="sm"
        variant={variant}
        className="h-auto min-h-9 max-w-full whitespace-normal px-2.5 py-2 text-xs leading-tight"
        onClick={() => confirmAction(member, action)}
      >
        {icon}
        <span>{label}</span>
      </Button>
    );

    if (member.status === "banned") {
      return (
        <div className="flex w-full flex-wrap gap-2 pt-1">
          {actionButton("unblock", "Lever le blocage", <ShieldCheck className="h-3.5 w-3.5" />)}
          {actionButton("restore", "Débloquer et réintégrer", <UserRoundCheck className="h-3.5 w-3.5" />)}
        </div>
      );
    }
    if (member.status === "left") {
      return (
        <div className="flex w-full flex-wrap gap-2 pt-1">
          {member.postingBlocked&&actionButton("allow_posting", "Autoriser l’envoi", <MessageSquareOff className="h-3.5 w-3.5" />)}
          {member.excluded&&actionButton("restore", "Réintégrer", <UserRoundCheck className="h-3.5 w-3.5" />)}
        </div>
      );
    }
    if (member.status !== "active") return null;

    return (
      <div className="flex w-full flex-wrap gap-2 pt-1">
        {member.postingBlocked
          ? actionButton("allow_posting", "Autoriser l’envoi", <MessageSquareOff className="h-3.5 w-3.5" />)
          : actionButton("restrict_posting", "Bloquer l’envoi", <LockKeyhole className="h-3.5 w-3.5" />)}
        {actionButton("remove", "Exclure", <UserRoundMinus className="h-3.5 w-3.5" />, "destructive")}
        {actionButton("block", "Exclure et bloquer", <Ban className="h-3.5 w-3.5" />, "destructive")}
      </div>
    );
  };

  const currentTab = tabs.find((tab) => tab.filter === filter)!;
  const rangeStart = data && data.total > 0 ? offset + 1 : 0;
  const rangeEnd = data ? Math.min(offset + members.length, data.total) : 0;

  return (
    <section className="w-full min-w-0 max-w-full rounded-2xl border border-teal-100 bg-[#f7fbfa] p-3 text-slate-800 sm:p-4">
      <header className="mb-3 flex min-w-0 items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-800">
          <UsersRound className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-sm font-bold text-slate-900">Membres et modération</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
            Gérez les accès et les restrictions de la discussion.
          </p>
        </div>
      </header>

      <div className="mb-3 rounded-xl border border-teal-100 bg-white p-3">
        <div className="flex min-w-0 items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-800" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Filtre intelligent</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {smartModerationEnabled
                ? "Les messages contenant des mots ou expressions interdits sont refusés. Les administrateurs sont exemptés."
                : "Un filtre de mots et d’expressions peut refuser les messages concernés. Les administrateurs en sont exemptés."}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Filtrage par mots et expressions : arnaque, scam, escroquerie, fraude et formulations négatives sur les retraits ou le site.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={smartModerationEnabled}
            aria-label="Activer le filtre intelligent de mots et d’expressions"
            disabled={pending}
            onClick={confirmSmartModeration}
            className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              smartModerationEnabled ? "border-teal-800 bg-teal-800" : "border-slate-300 bg-slate-200"
            }`}
          >
            <span
              className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                smartModerationEnabled ? "translate-x-[1.35rem]" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Catégories de membres"
        className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl bg-teal-100/60 p-1 sm:grid-cols-4"
      >
        {tabs.map((tab) => {
          const selected = filter === tab.filter;
          return (
            <button
              key={tab.filter}
              id={`${id}-tab-${tab.filter}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-members-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                setOffset(0);
                setFilter(tab.filter);
              }}
              onKeyDown={onTabKeyDown}
              className={`min-h-10 min-w-0 rounded-lg px-2 py-1.5 text-left text-xs font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-1 ${
                selected ? "bg-white text-teal-900 shadow-sm" : "text-teal-900/75 hover:bg-white/70"
              }`}
            >
              <span className="block break-words">{tab.label}</span>
              <span className="mt-0.5 block text-[10px] font-medium text-slate-500">
                {counts[tab.count].toLocaleString("fr-FR")}
              </span>
            </button>
          );
        })}
      </div>

      <label htmlFor={`${id}-search`} className="sr-only">
        Rechercher un membre
      </label>
      <div className="relative mb-3">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          id={`${id}-search`}
          type="search"
          value={search}
          onChange={(event) => {
            setOffset(0);
            setSearch(event.target.value);
          }}
          placeholder="Rechercher un membre"
          className="h-10 border-teal-100 bg-white pl-9 text-sm focus-visible:ring-teal-700"
        />
      </div>

      <div
        id={`${id}-members-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${filter}`}
        className="min-h-28"
      >
        {membersQuery.isLoading ? (
          <div className="space-y-2" aria-label="Chargement des membres">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
                <div className="h-9 w-9 shrink-0 rounded-full bg-teal-50" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-2/5 rounded bg-slate-100" />
                  <div className="h-2.5 w-1/3 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : membersQuery.isError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <CircleAlert className="mx-auto h-5 w-5 text-amber-700" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-slate-800">Impossible de charger les membres</p>
            <p className="mt-1 break-words text-xs text-slate-600">
              {membersQuery.error instanceof Error
                ? membersQuery.error.message
                : "Vérifiez votre connexion puis réessayez."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 border-amber-300 bg-white"
              onClick={() => void membersQuery.refetch()}
            >
              Réessayer
            </Button>
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-teal-200 bg-white px-4 py-7 text-center">
            <UsersRound className="mx-auto h-6 w-6 text-teal-700/60" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {debouncedSearch ? "Aucun résultat" : `Aucun membre dans « ${currentTab.label} »`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {debouncedSearch
                ? "Essayez avec un autre nom."
                : "Cette liste apparaîtra ici lorsqu’elle contiendra des membres."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => {
              const self = member.id === viewerId;
              const statusLabel =
                member.status === "banned"
                  ? "Exclu et bloqué"
                  : member.status === "left"
                    ? member.excluded?"Exclu":member.postingBlocked?"Envoi bloqué · hors du groupe":"Hors du groupe"
                    : member.status === "pending"
                      ? "En attente"
                      : member.postingBlocked
                        ? "Envoi bloqué · lecture autorisée"
                        : "Membre actif";
              return (
                <li
                  key={member.id}
                  className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-teal-50 bg-white p-3 shadow-[0_1px_2px_rgba(15,70,67,0.04)]"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={member.photoUrl} referrerPolicy="no-referrer" />
                    <AvatarFallback className="bg-teal-100 text-xs font-semibold text-teal-900">
                      {initials(member.fullName || "Membre Sika")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold leading-snug text-slate-900">
                      {member.fullName || "Membre Sika"}
                      {self && <span className="ml-1 text-xs font-normal text-slate-500">(vous)</span>}
                    </p>
                    <p className="mt-0.5 break-words text-[11px] leading-snug text-slate-500">
                      {statusLabel}
                      {member.role && member.role !== "member" ? ` · ${member.role}` : ""}
                    </p>
                  </div>
                  {renderActions(member)}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!membersQuery.isLoading && !membersQuery.isError && data && (
        <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-teal-100 pt-3">
          <p className="text-[11px] text-slate-500">
            {rangeStart}–{rangeEnd} sur {data.total.toLocaleString("fr-FR")}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Page précédente"
              disabled={!canGoBack || pending}
              onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xs:inline">Précédent</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Page suivante"
              disabled={!canGoForward || pending}
              onClick={() => setOffset((value) => value + PAGE_SIZE)}
              className="h-8 px-2"
            >
              <span className="hidden xs:inline">Suivant</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </footer>
      )}
      {pending && (
        <p className="mt-2 flex items-center gap-2 text-xs text-teal-800" role="status">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Mise à jour en cours…
        </p>
      )}
    </section>
  );
}
