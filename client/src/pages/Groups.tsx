import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, BellOff, CircleAlert, Copy, Crown, Flag,
  Globe2, LockKeyhole, LogOut, MessageCircle, MessagesSquare, MoreHorizontal,
  Pin, Plus, Search, Send, Settings2, Shield, Smile, Users, UserPlus, X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import officialLogo from "@assets/1764438802465_1773510898637.jpg";
import GroupFormDialog, { type GroupFormValue } from "@/components/groups/GroupFormDialog";

type Group = {
  id: string; slug: string; name: string; photoUrl?: string | null; description: string;
  category: string; rules?: string; visibility: "public" | "private" | "invite"; approvalRequired: boolean; membersCanPost?: boolean;
  createdAt: string; memberCount: number; onlineCount: number; membershipStatus: string;
  muted: boolean; unreadCount: number;
};
type Member = { id: string; fullName: string; photoUrl?: string; role: string; joinedAt?: string; online?: boolean; status?: string };
type Message = {
  id: string; content: string; type: "text" | "system"; senderId?: string; senderName: string;
  photoUrl?: string | null; createdAt: string; editedAt?: string | null; deleted: boolean; pinned: boolean;
  replyTo?: { id: string; content: string; senderName: string } | null;
  reactions: { emoji: string; count: number; reacted: boolean }[];
};
type GroupDetail = {
  group: Group; counts: { memberCount: number; onlineCount: number };
  members: Member[]; membership: { status: string; role?: string; muted?: boolean };
  isManager: boolean; isPrincipalAdmin: boolean; pendingCount: number;
};
type AdminQueue = { pending: Member[]; members: Member[]; reports: any[]; logs: any[] };
const OFFICIAL_SLUG = "sika-texte-groupe-officiel";
const initialGroupForm: GroupFormValue = { name: "", description: "", photoUrl: "", category: "Général", visibility: "public", rules: "", approvalRequired: false, membersCanPost:true };
const getJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: "include", cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Impossible de charger les groupes.");
  return body as T;
};
const sendJson = async <T,>(url: string, method: string, body?: unknown): Promise<T> => {
  const response = await fetch(url, {
    method, credentials: "include", headers: { "X-Sika-Groups": "1", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "Cette action n’a pas abouti.");
  return result as T;
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "S";
const fullDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function Groups() {
  const { user } = useAuth();
  return <GroupsWorkspace key={(user as any)?.id || "signed-out"} />;
}

function GroupsWorkspace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const viewerId = (user as any)?.id || "anonymous";
  const [, navigate] = useLocation();
  const [activeSlug, setActiveSlug] = useState(() => new URLSearchParams(window.location.search).get("group") || "");
  const [inviteToken, setInviteToken] = useState(() => new URLSearchParams(window.location.search).get("invite") || "");
  const [messageText, setMessageText] = useState("");
  const [reply, setReply] = useState<Message | null>(null);
  const [search, setSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [groupForm, setGroupForm] = useState(initialGroupForm);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [failedDraft, setFailedDraft] = useState(false);
  const [loadedOlder, setLoadedOlder] = useState<Message[]>([]);
  const [hasOlder,setHasOlder]=useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const redeemedInvite = useRef("");
  const draftNonce=useRef(crypto.randomUUID());
  const unreadSnapshot=useRef<Map<string,number>|null>(null);
  const [notificationsAllowed,setNotificationsAllowed]=useState(()=>"Notification" in window&&Notification.permission==="granted");

  const groupsQuery = useQuery<{ groups: Group[]; isPrincipalAdmin: boolean }>({
    queryKey: ["/api/groups", viewerId], queryFn: () => getJson("/api/groups"), refetchInterval: 10000, refetchIntervalInBackground:true,
  });
  const groups = groupsQuery.data?.groups || [];
  const visibleGroups = groups.filter(group => `${group.name} ${group.category}`.toLocaleLowerCase("fr").includes(groupSearch.trim().toLocaleLowerCase("fr")));
  const selected = groups.find(group => group.slug === activeSlug) || null;
  const detailQuery = useQuery<GroupDetail>({
    queryKey: [`/api/groups/${activeSlug}`, viewerId], queryFn: () => getJson(`/api/groups/${encodeURIComponent(activeSlug)}`),
    enabled: !!activeSlug, refetchInterval: 12000,
  });
  const detail = detailQuery.data;
  const isMember = detail?.membership.status === "active";
  const canManage = !!detail?.isManager;
  const messagesQuery = useQuery<{ messages: Message[]; hasMore: boolean }>({
    queryKey: [`/api/groups/${activeSlug}/messages`, viewerId, search],
    queryFn: () => getJson(`/api/groups/${encodeURIComponent(activeSlug)}/messages${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`),
    enabled: !!activeSlug && isMember, refetchInterval: search ? false : 4000, staleTime: 0,
  });
  const messages = Array.from(new Map([...(search?[]:loadedOlder), ...(messagesQuery.data?.messages || [])].map(message=>[message.id,message])).values()).sort((a,b)=>Number(a.id)-Number(b.id));
  const adminQueueQuery = useQuery<AdminQueue>({
    queryKey: [`/api/groups/${activeSlug}/admin/queue`, viewerId],
    queryFn: () => getJson(`/api/groups/${encodeURIComponent(activeSlug)}/admin/queue`),
    enabled: showAdmin && canManage,
  });
  const invitesQuery = useQuery<{invites:any[]}>({
    queryKey: [`/api/groups/${activeSlug}/invites`, viewerId],
    queryFn: () => getJson(`/api/groups/${encodeURIComponent(activeSlug)}/invites`),
    enabled: showAdmin && canManage,
  });
  const adminStatsQuery = useQuery<any>({
    queryKey: ["/api/groups/stats", viewerId], queryFn: () => getJson("/api/groups/stats"),
    enabled: !!groupsQuery.data?.isPrincipalAdmin,
  });

  const refreshGroupData = () => {
    void queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    void queryClient.invalidateQueries({ queryKey: [`/api/groups/${activeSlug}`] });
    void queryClient.invalidateQueries({ queryKey: [`/api/groups/${activeSlug}/messages`] });
    void queryClient.invalidateQueries({ queryKey: [`/api/groups/${activeSlug}/admin/queue`] });
    void queryClient.invalidateQueries({ queryKey: [`/api/groups/${activeSlug}/invites`] });
    void queryClient.invalidateQueries({ queryKey: ["/api/groups/stats"] });
  };
  const act = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: string; body?: any }) => sendJson(path, method, body),
    onSuccess: (_data: any, variables) => {
      const match=variables.path.match(/\/messages\/(\d+)/);
      if(match) setLoadedOlder(previous=>previous.map(message=>{
        if(message.id!==match[1]) return message;
        if(variables.method==="DELETE") return {...message,deleted:true,content:"Message supprimé",pinned:false};
        if(variables.method==="PATCH") return {...message,content:variables.body.content,editedAt:new Date().toISOString()};
        if(variables.path.endsWith("/pin")) return {...message,pinned:variables.body.pinned};
        if(variables.path.endsWith("/reactions")) {
          const emoji=variables.body.emoji;
          const current=message.reactions.find(reaction=>reaction.emoji===emoji);
          return {...message,reactions:[...message.reactions.filter(reaction=>reaction.emoji!==emoji),
            ...(!current?[{emoji,count:1,reacted:true}]:current.count===1&&current.reacted?[]:[{emoji,count:current.count+(current.reacted?-1:1),reacted:!current.reacted}])]};
        }
        return message;
      }));
      refreshGroupData();
      if (variables.path.endsWith("/join") && !variables.body?.inviteToken && new URLSearchParams(window.location.search).has("invite")) {
        window.history.replaceState({}, "", "/groupeOfcl");
        setInviteToken("");
      }
    },
    onError: (error: Error) => toast({ title: "Action impossible", description: error.message, variant: "destructive" }),
  });
  const createGroup = useMutation({
    mutationFn: () => sendJson<{ group: Group }>("/api/groups", "POST", groupForm),
    onSuccess: ({ group }) => {
      setShowCreate(false); setGroupForm(initialGroupForm); refreshGroupData(); setActiveSlug(group.slug);
      navigate(`/groupeOfcl?group=${encodeURIComponent(group.slug)}`);
      toast({ title: "Groupe créé", description: "Le nouveau groupe est disponible dans la liste." });
    },
    onError: (error: Error) => toast({ title: "Création impossible", description: error.message, variant: "destructive" }),
  });
  const patchGroup = useMutation({
    mutationFn: () => sendJson(`/api/groups/${encodeURIComponent(activeSlug)}/admin/groups`, "PATCH", groupForm),
    onSuccess: () => { setShowGroupSettings(false); refreshGroupData(); toast({ title: "Groupe mis à jour" }); },
    onError: (error: Error) => toast({ title: "Modification impossible", description: error.message, variant: "destructive" }),
  });
  const sendMessage = useMutation({
    mutationFn: () => sendJson(`/api/groups/${encodeURIComponent(activeSlug)}/messages`, "POST", { content: messageText, clientNonce:draftNonce.current, ...(reply ? { replyToId: Number(reply.id) } : {}) }),
    onSuccess: () => { draftNonce.current=crypto.randomUUID(); setMessageText(""); setReply(null); setFailedDraft(false); refreshGroupData(); },
    onError: () => setFailedDraft(true),
  });

  useEffect(() => {
    if (!inviteToken || redeemedInvite.current === inviteToken) return;
    redeemedInvite.current = inviteToken;
    void sendJson<{ slug:string; status:string; alreadyMember?:boolean }>("/api/group-invites/redeem","POST",{token:inviteToken})
      .then(result => {
        setActiveSlug(result.slug);
        setInviteToken("");
        window.history.replaceState({}, "", `/groupeOfcl?group=${encodeURIComponent(result.slug)}`);
        refreshGroupData();
        toast({ title: result.alreadyMember ? "Vous êtes déjà membre" : "Groupe rejoint", description: "L’invitation a été prise en compte." });
      })
      .catch(error => {
        redeemedInvite.current = "";
        toast({ title: "Invitation invalide", description: (error as Error).message, variant: "destructive" });
      });
    // An invitation token is redeemed once when the authenticated route opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken]);
  useEffect(() => { setLoadedOlder([]);setHasOlder(true); }, [activeSlug, search]);
  useEffect(() => {setMessageText("");setReply(null);draftNonce.current=crypto.randomUUID();},[activeSlug]);
  useEffect(()=>{
    if(!search&&messagesQuery.data) setLoadedOlder(previous=>Array.from(new Map([...previous,...messagesQuery.data.messages].map(message=>[message.id,message])).values()).sort((a,b)=>Number(a.id)-Number(b.id)));
  },[messagesQuery.data,search]);
  useEffect(() => { if (isMember && messages.length) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [isMember, messages.at(-1)?.id]);
  useEffect(()=>{
    if(!groupsQuery.data) return;
    const previous=unreadSnapshot.current;
    unreadSnapshot.current=new Map(groups.map(group=>[group.id,group.unreadCount]));
    if(!previous) return;
    for(const group of groups) {
      if(group.membershipStatus!=="active"||group.muted||group.unreadCount<=(previous.get(group.id)??group.unreadCount)) continue;
      if(document.hidden&&notificationsAllowed) {
        try {
          const notification=new Notification(group.name,{body:"De nouveaux messages sont disponibles dans votre groupe Sika.",tag:`sika-group-${group.id}`});
          notification.onclick=()=>{window.focus();setActiveSlug(group.slug);navigate(`/groupeOfcl?group=${encodeURIComponent(group.slug)}`);notification.close()};
        } catch { /* In-app unread counters remain available on unsupported browsers. */ }
      } else if(group.slug!==activeSlug) toast({title:"Nouveaux messages",description:group.name});
    }
  },[groupsQuery.data,notificationsAllowed,activeSlug,navigate,toast]);

  const send = (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageText.trim() || sendMessage.isPending) return;
    setFailedDraft(false);
    sendMessage.mutate();
  };
  const selectGroup = (group: Group) => {
    if(sendMessage.isPending) return;
    setActiveSlug(group.slug);
    setSearch("");
    setReply(null);
    setShowAdmin(false);
    navigate(`/groupeOfcl?group=${encodeURIComponent(group.slug)}`);
  };
  const showGroupList=()=>{if(sendMessage.isPending)return;setActiveSlug("");navigate("/groupeOfcl")};
  useEffect(()=>{
    const syncHistory=()=>{setActiveSlug(new URLSearchParams(window.location.search).get("group")||"");setSearch("");setShowAdmin(false)};
    window.addEventListener("popstate",syncHistory);
    return()=>window.removeEventListener("popstate",syncHistory);
  },[]);
  const doGroupAction = (path: string, method: string, body?: any) => act.mutate({ path, method, body });

  if (groupsQuery.isLoading) return <div className="min-h-screen bg-[#f2f7f7] grid place-items-center text-slate-500">Chargement des groupes…</div>;
  if (groupsQuery.error) return <div className="min-h-screen bg-[#f2f7f7] grid place-items-center p-6"><div className="rounded-2xl bg-white p-6 text-center shadow"><p className="font-semibold">Les groupes sont momentanément indisponibles.</p><Button className="mt-4" onClick={() => void groupsQuery.refetch()}>Réessayer</Button></div></div>;

  return (
    <div className="min-h-[100dvh] bg-[#f1f6f7] text-slate-900 pb-6">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Retour au tableau de bord" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-5 w-5" /></Button>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-700 to-cyan-600 text-white shadow-sm"><MessagesSquare className="h-5 w-5" /></div>
            <div className="min-w-0"><h1 className="truncate font-bold">Groupes de discussion</h1><p className="text-xs text-slate-500">La communauté Sika Texte</p></div>
          </div>
          {groupsQuery.data?.isPrincipalAdmin && <Button onClick={() => setShowCreate(true)} className="shrink-0 bg-teal-700 hover:bg-teal-800"><Plus className="mr-1 h-4 w-4" /><span className="hidden sm:inline">Créer un groupe</span><span className="sm:hidden">Créer</span></Button>}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:px-6">
        {groupsQuery.data?.isPrincipalAdmin && adminStatsQuery.data && (
          <section className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-teal-100 bg-white p-3 shadow-sm sm:grid-cols-5">
            {[["Groupes",adminStatsQuery.data.groupCount],["Membres",adminStatsQuery.data.memberCount],["Nouveaux · 7 j",adminStatsQuery.data.newMembers7d],["En ligne",adminStatsQuery.data.onlineCount],["Messages",adminStatsQuery.data.messageCount]].map(([label,value])=><div key={String(label)} className="px-2 py-1"><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold text-teal-800">{Number(value).toLocaleString("fr-FR")}</p></div>)}
          </section>
        )}
        <div className="grid min-h-[calc(100dvh-150px)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={`${activeSlug && detail ? "hidden lg:flex" : "flex"} flex-col border-r border-slate-100`}>
            <div className="border-b border-slate-100 p-4"><h2 className="font-bold">Vos groupes</h2><p className="mt-1 text-xs text-slate-500">Groupes officiels et communautés ouvertes</p><Input aria-label="Rechercher un groupe" placeholder="Rechercher un groupe…" value={groupSearch} onChange={event=>setGroupSearch(event.target.value)} className="mt-3 bg-slate-50"/></div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {visibleGroups.map(group => (
                <button key={group.id} aria-label={`Ouvrir ${group.name}`} onClick={() => selectGroup(group)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${activeSlug===group.slug?"bg-teal-50 ring-1 ring-teal-200":"hover:bg-slate-50"}`}>
                  <Avatar className="h-11 w-11 rounded-2xl"><AvatarImage referrerPolicy="no-referrer" src={group.photoUrl || (group.slug===OFFICIAL_SLUG?officialLogo:undefined)} /><AvatarFallback className="rounded-2xl bg-teal-100 text-teal-800">{initials(group.name)}</AvatarFallback></Avatar>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{group.name}</span><span className="mt-1 block truncate text-xs text-slate-500">{group.memberCount} membres · {group.membershipStatus==="active"?`${group.onlineCount} en ligne`:group.membershipStatus==="pending"?"Demande en attente":group.visibility==="public"?"Groupe public":"Sur invitation"}</span><span className="mt-1 block text-[11px] font-semibold text-teal-700">Ouvrir la discussion</span></span>
                  {group.unreadCount>0&&<span className="grid h-5 min-w-5 place-items-center rounded-full bg-teal-700 px-1 text-[10px] font-bold text-white">{group.unreadCount>99?"99+":group.unreadCount}</span>}
                </button>
              ))}
              {!visibleGroups.length&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{groupSearch?"Aucun groupe ne correspond à cette recherche.":"Aucun groupe n’est actuellement disponible."}</p>}
            </div>
            <div className="border-t border-slate-100 p-3 text-xs text-slate-400">Compte Sika connecté · échanges enregistrés</div>
          </aside>

          <section className={`${activeSlug && detail ? "flex" : "hidden lg:flex"} min-w-0 flex-col`}>
            {!activeSlug?<div className="grid flex-1 place-items-center p-8 text-center text-slate-500">Choisissez un groupe pour ouvrir sa discussion.</div>
              :detailQuery.isLoading ? <div className="grid flex-1 place-items-center text-sm text-slate-500">Ouverture du groupe…</div>
              : detailQuery.error || !detail ? <div className="grid flex-1 place-items-center p-8 text-center"><div><CircleAlert className="mx-auto mb-3 h-8 w-8 text-amber-600" /><p className="font-semibold">Ce groupe n’est pas accessible.</p><Button variant="outline" className="mt-4 lg:hidden" onClick={showGroupList}>Retour aux groupes</Button></div></div>
              : <>
                <div className="flex items-center gap-3 border-b border-slate-100 p-3 sm:p-4">
                  <Button variant="ghost" size="icon" aria-label="Liste des groupes" className="lg:hidden" onClick={showGroupList}><ArrowLeft className="h-5 w-5" /></Button>
                  <Avatar className="h-11 w-11 rounded-2xl"><AvatarImage src={detail.group.photoUrl || (detail.group.slug===OFFICIAL_SLUG?officialLogo:undefined)} /><AvatarFallback className="rounded-2xl bg-teal-100 text-teal-800">{initials(detail.group.name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1"><h2 className="break-words font-bold leading-snug">{detail.group.name}</h2><p className="mt-1 text-xs text-slate-500">{detail.counts.memberCount} membres · {detail.counts.onlineCount} en ligne · créé le {new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(detail.group.createdAt))}</p></div>
                  <Button variant="outline" size="sm" onClick={() => setShowMembers(!showMembers)}><Users className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">Membres</span></Button>
                  <Button variant="ghost" size="icon" aria-label="Règles du groupe" onClick={() => setShowRules(!showRules)}><Shield className="h-4 w-4" /></Button>
                  {canManage&&<Button variant="ghost" size="icon" aria-label="Administration du groupe" onClick={() => setShowAdmin(!showAdmin)}><Settings2 className="h-4 w-4" /></Button>}
                </div>
                <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs text-slate-600">{detail.group.description}</div>
                {detail.group.slug===OFFICIAL_SLUG&&<p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">Administrateur principal : <strong className="text-teal-800">Yvan SPQ SIKA</strong></p>}
                {isMember&&!notificationsAllowed&&"Notification" in window&&<button className="mx-4 mt-2 text-left text-xs text-teal-700 underline" onClick={async()=>{
                  try{const permission=await Notification.requestPermission();setNotificationsAllowed(permission==="granted");toast({title:permission==="granted"?"Notifications activées":"Notifications du navigateur non autorisées",description:"Les compteurs de messages restent disponibles dans l’espace."})}catch{toast({title:"Notifications indisponibles sur ce navigateur",variant:"destructive"})}
                }}>Activer les notifications du navigateur</button>}
                {showRules&&<div className="mx-3 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><strong>Règles de discussion</strong><p className="mt-1 whitespace-pre-wrap text-slate-700">{detail.group.rules||"Respectez les autres membres et évitez le spam."}</p></div>}
                {showMembers&&<div className="mx-3 mt-3 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between"><strong className="text-sm">Participants ({detail.members.length})</strong><button aria-label="Fermer la liste" onClick={()=>setShowMembers(false)}><X className="h-4 w-4"/></button></div>
                  <div className="grid gap-2 sm:grid-cols-2">{detail.members.map(member=><div key={member.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 p-2"><Avatar className="h-8 w-8"><AvatarImage src={member.photoUrl}/><AvatarFallback>{initials(member.fullName||"Membre Sika")}</AvatarFallback></Avatar><span className="min-w-0 flex-1 truncate text-xs font-medium">{member.fullName}</span>{member.role!=="member"&&<Crown className="h-3.5 w-3.5 text-amber-600"/>}<span className={`h-2 w-2 rounded-full ${member.online?"bg-emerald-500":"bg-slate-300"}`}/>{detail.isPrincipalAdmin&&member.id!==(user as any)?.id&&<button className="text-[10px] text-teal-700" onClick={()=>doGroupAction(`/api/groups/${activeSlug}/admin/members/${member.id}`,"POST",{action:member.role==="admin"?"demote":"promote"})}>{member.role==="admin"?"Retirer admin":"Nommer admin"}</button>}{canManage&&member.id!==(user as any)?.id&&member.role==="member"&&<button className="text-[10px] text-red-700" onClick={()=>{if(window.confirm(`Retirer ${member.fullName} du groupe ?`))doGroupAction(`/api/groups/${activeSlug}/admin/members/${member.id}`,"POST",{action:"remove"})}}>Retirer</button>}</div>)}</div>
                </div>}
                {showAdmin&&canManage&&<div className="mx-3 mt-3 max-h-64 overflow-y-auto rounded-xl border border-teal-200 bg-teal-50/60 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm">Administration · {detail.pendingCount} demandes</strong>
                    <div className="flex flex-wrap gap-2">
                      {detail.isPrincipalAdmin&&<Button size="sm" variant="outline" onClick={()=>{
                        setGroupForm({name:detail.group.name,description:detail.group.description,photoUrl:detail.group.photoUrl||"",category:detail.group.category,visibility:detail.group.visibility,rules:detail.group.rules||"",approvalRequired:detail.group.approvalRequired,membersCanPost:detail.group.membersCanPost!==false});
                        setShowGroupSettings(true);
                      }}>Paramètres</Button>}
                      <Button size="sm" variant="outline" onClick={async()=>{try{
                        const result=await sendJson<{url:string}>(`/api/groups/${activeSlug}/invites`,"POST");
                        await navigator.clipboard.writeText(result.url);void invitesQuery.refetch();
                        toast({title:"Invitation copiée",description:"Lien valable sept jours."});
                      }catch(e){toast({title:"Invitation impossible",description:(e as Error).message,variant:"destructive"})}}}><Copy className="mr-1 h-3.5 w-3.5"/>Inviter</Button>
                      <Button size="sm" variant="outline" onClick={()=>{const content=window.prompt("Texte de l’annonce à épingler");if(content?.trim())doGroupAction(`/api/groups/${activeSlug}/admin/announcements`,"POST",{content})}}><Pin className="mr-1 h-3.5 w-3.5"/>Annonce</Button>
                      {detail.isPrincipalAdmin&&activeSlug!==OFFICIAL_SLUG&&<Button size="sm" variant="destructive" onClick={()=>{if(window.confirm("Archiver ce groupe ? Il disparaîtra de la liste, mais ses messages resteront conservés."))doGroupAction(`/api/groups/${activeSlug}/admin/archive`,"POST",{confirm:true})}}>Archiver</Button>}
                    </div>
                  </div>
                  {adminQueueQuery.data?.pending.map(member=><div key={member.id} className="flex items-center gap-2 py-1.5 text-sm"><span className="flex-1">{member.fullName}</span><Button size="sm" onClick={()=>doGroupAction(`/api/groups/${activeSlug}/approvals/${member.id}`,"POST",{approve:true})}>Accepter</Button><Button size="sm" variant="outline" onClick={()=>doGroupAction(`/api/groups/${activeSlug}/approvals/${member.id}`,"POST",{approve:false})}>Refuser</Button></div>)}
                  {adminQueueQuery.data?.reports.map(report=><div key={report.id} className="border-t border-teal-100 py-2 text-xs"><p><strong>Signalement :</strong> {report.reason} · « {report.content} »</p><div className="mt-1 flex gap-2"><Button size="sm" variant="outline" onClick={()=>doGroupAction(`/api/groups/${activeSlug}/admin/reports/${report.id}`,"POST",{status:"resolved"})}>Résolu</Button><Button size="sm" variant="outline" onClick={()=>doGroupAction(`/api/groups/${activeSlug}/admin/reports/${report.id}`,"POST",{status:"dismissed"})}>Ignorer</Button></div></div>)}
                  {adminQueueQuery.data?.members.filter(member=>member.role==="member"&&member.id!==(user as any)?.id).map(member=><div key={member.id} className="flex items-center gap-2 border-t border-teal-100 py-1 text-xs"><span className="flex-1">{member.fullName}</span><Button size="sm" variant="outline" onClick={()=>{if(window.confirm(`Bloquer ${member.fullName} dans ce groupe ?`))doGroupAction(`/api/groups/${activeSlug}/admin/members/${member.id}`,"POST",{action:"block"})}}>Bloquer</Button></div>)}
                  {invitesQuery.data?.invites.map(invite=><div key={invite.id} className="flex items-center gap-2 border-t border-teal-100 py-2 text-xs"><span className="flex-1">Invitation · {invite.usesCount}/{invite.maxUses} utilisations · expire le {new Intl.DateTimeFormat("fr-FR",{dateStyle:"short"}).format(new Date(invite.expiresAt))}</span><Button size="sm" variant="outline" onClick={()=>doGroupAction(`/api/groups/${activeSlug}/invites/${invite.id}`,"DELETE")}>Révoquer</Button></div>)}
                  {adminQueueQuery.data?.logs.map((log:any,index:number)=><p key={`${log.action}-${index}`} className="border-t border-teal-100 py-1 text-[10px] text-slate-500">{fullDate(log.createdAt)} · {log.actorName||"Administrateur"} · {log.action}</p>)}
                  {!adminQueueQuery.data?.pending.length&&!adminQueueQuery.data?.reports.length&&<p className="text-xs text-slate-500">Aucune demande ni aucun signalement en attente.</p>}
                </div>}

                {detail.membership.status==="pending" ? <div className="grid flex-1 place-items-center p-6 text-center"><div className="max-w-sm rounded-2xl bg-amber-50 p-6"><LockKeyhole className="mx-auto mb-3 h-8 w-8 text-amber-700"/><h3 className="font-semibold">Demande en attente</h3><p className="mt-1 text-sm text-slate-600">Un administrateur du groupe doit approuver votre adhésion.</p></div></div>
                : detail.membership.status!=="active" ? <div className="grid flex-1 place-items-center p-6 text-center"><div className="max-w-sm"><Globe2 className="mx-auto mb-3 h-9 w-9 text-teal-700"/><h3 className="text-lg font-bold">Rejoindre {detail.group.name}</h3><p className="my-2 text-sm text-slate-500">{detail.group.description}</p><Button className="mt-2 bg-teal-700" disabled={act.isPending} onClick={()=>doGroupAction(`/api/groups/${activeSlug}/join`,"POST",inviteToken?{inviteToken}:{})}>{inviteToken?"Accepter l’invitation":detail.group.approvalRequired?"Demander à rejoindre":"Rejoindre le groupe"}</Button></div></div>
                : <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex items-center gap-2 border-b border-slate-100 p-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher dans ce groupe…" className="pl-9"/></div><Button title={detail.membership.muted?"Activer les notifications":"Mettre en sourdine"} variant={detail.membership.muted?"secondary":"ghost"} size="icon" onClick={()=>doGroupAction(`/api/groups/${activeSlug}/preferences`,"PATCH",{muted:!detail.membership.muted})}><BellOff className="h-4 w-4"/></Button><Button title="Quitter ce groupe" variant="ghost" size="icon" onClick={()=>{if(window.confirm("Quitter ce groupe ? Vous pourrez le rejoindre à nouveau si ses règles l’autorisent."))doGroupAction(`/api/groups/${activeSlug}/leave`,"POST")}}><LogOut className="h-4 w-4"/></Button></div>
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f8fafb] p-3 sm:p-5">
                    {messagesQuery.isLoading&&<p className="py-6 text-center text-sm text-slate-500">Chargement des messages…</p>}
                    {messagesQuery.error&&<div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Impossible d’actualiser les messages. <button className="font-semibold underline" onClick={()=>void messagesQuery.refetch()}>Réessayer</button></div>}
                    {!messagesQuery.isLoading&&!messages.length&&<div className="py-10 text-center text-sm text-slate-500">{search?"Aucun message ne correspond à cette recherche.":"La conversation commence ici. Envoyez le premier message."}</div>}
                    {messagesQuery.data?.hasMore&&hasOlder&&!search&&<Button variant="outline" size="sm" className="mx-auto flex" onClick={async()=>{const before=messages[0]?.id;if(!before)return;try{const older=await getJson<{messages:Message[];hasMore:boolean}>(`/api/groups/${activeSlug}/messages?before=${before}`);setLoadedOlder(previous=>[...older.messages,...previous]);setHasOlder(older.hasMore)}catch(e){toast({title:"Historique indisponible",description:(e as Error).message,variant:"destructive"})}}}>Afficher les anciens messages</Button>}
                    {messages.map(message=>message.type==="system"?<div key={message.id} className="py-1 text-center text-xs text-slate-400">{message.content} · {fullDate(message.createdAt)}</div>
                      :<article key={message.id} className={`group relative max-w-[92%] rounded-2xl border p-3 shadow-sm sm:max-w-[78%] ${message.senderId===(user as any)?.id?"ml-auto bg-teal-50":"bg-white"} ${message.pinned?"border-amber-300":"border-slate-100"}`}>
                        {message.pinned&&<p className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-amber-700"><Pin className="h-3 w-3"/>Message épinglé</p>}
                        <div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarImage src={message.photoUrl||undefined}/><AvatarFallback className="text-[10px]">{initials(message.senderName)}</AvatarFallback></Avatar><span className="text-xs font-bold text-teal-800">{message.senderName}</span><time className="text-[10px] text-slate-400">{fullDate(message.createdAt)}{message.editedAt?" · modifié":""}</time><button className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100" title="Options du message" onClick={()=>setReply(message)}><MoreHorizontal className="h-4 w-4"/></button></div>
                        {message.replyTo&&<div className="mt-2 border-l-2 border-teal-400 pl-2 text-xs text-slate-500">{message.replyTo.senderName} : {message.replyTo.content}</div>}
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.content}</p>
                        {!message.deleted&&<div className="mt-2 flex gap-3 text-[11px] text-slate-500">
                          <select aria-label="Ajouter une réaction" value="" className="max-w-24 bg-transparent" onChange={event=>{if(event.target.value)doGroupAction(`/api/groups/${activeSlug}/messages/${message.id}/reactions`,"POST",{emoji:event.target.value})}}>
                            <option value="">Réagir</option>{["👍","❤️","😂","🎉","🙏","🔥","😮","😢"].map(emoji=><option key={emoji} value={emoji}>{emoji}</option>)}
                          </select>
                          <button onClick={async()=>{try{const text=`${detail.group.name} — ${message.senderName} : ${message.content}`;if(navigator.share)await navigator.share({text});else{await navigator.clipboard.writeText(text);toast({title:"Message copié pour le partager"})}}catch(error){if((error as Error).name!=="AbortError")toast({title:"Partage impossible",variant:"destructive"})}}}>Partager</button>
                        </div>}
                        {message.reactions.length>0&&<div className="mt-2 flex flex-wrap gap-1">{message.reactions.map(item=><button key={item.emoji} className={`rounded-full border px-2 py-0.5 text-xs ${item.reacted?"border-teal-300 bg-teal-50":"border-slate-200"}`} onClick={()=>doGroupAction(`/api/groups/${activeSlug}/messages/${message.id}/reactions`,"POST",{emoji:item.emoji})}>{item.emoji} {item.count}</button>)}</div>}
                        <div className="mt-2 flex flex-wrap gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" title="Réagir avec 👍" onClick={()=>doGroupAction(`/api/groups/${activeSlug}/messages/${message.id}/reactions`,"POST",{emoji:"👍"})}><Smile className="h-3.5 w-3.5"/></button><button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" title="Répondre" onClick={()=>setReply(message)}><MessageCircle className="h-3.5 w-3.5"/></button><button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" title="Copier" onClick={()=>void navigator.clipboard.writeText(message.content).then(()=>toast({title:"Message copié"}))}><Copy className="h-3.5 w-3.5"/></button><button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" title="Signaler" onClick={()=>{const reason=window.prompt("Pourquoi signalez-vous ce message ?");if(reason)doGroupAction(`/api/groups/${activeSlug}/messages/${message.id}/report`,"POST",{reason})}}><Flag className="h-3.5 w-3.5"/></button>{message.senderId===(user as any)?.id&&<button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" title="Modifier" onClick={()=>{const content=window.prompt("Modifier le message",message.content);if(content?.trim())doGroupAction(`/api/groups/${activeSlug}/messages/${message.id}`,"PATCH",{content})}}><Settings2 className="h-3.5 w-3.5"/></button>}{(message.senderId===(user as any)?.id||canManage)&&<button className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" title="Supprimer" onClick={()=>{if(window.confirm("Supprimer ce message ?"))doGroupAction(`/api/groups/${activeSlug}/messages/${message.id}`,"DELETE")}}><X className="h-3.5 w-3.5"/></button>}
                          {canManage&&<><button className="rounded-lg p-1.5 text-amber-700 hover:bg-amber-50" title={message.pinned?"Désépingler":"Épingler"} onClick={()=>doGroupAction(`/api/groups/${activeSlug}/admin/messages/${message.id}/pin`,"POST",{pinned:!message.pinned})}><Pin className="h-3.5 w-3.5"/></button><button className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" title="Modérer et supprimer" onClick={()=>{if(window.confirm("Supprimer ce message pour tous les membres ?"))doGroupAction(`/api/groups/${activeSlug}/messages/${message.id}`,"DELETE")}}><X className="h-3.5 w-3.5"/></button></>}
                        </div>
                      </article>)}
                    <div ref={bottomRef}/>
                  </div>
                  <form onSubmit={send} className="border-t border-slate-100 bg-white p-3 sm:p-4">
                    {reply&&<div className="mb-2 flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-xs"><span className="min-w-0 flex-1 truncate">Réponse à <strong>{reply.senderName}</strong> : {reply.content}</span><button type="button" aria-label="Annuler la réponse" onClick={()=>setReply(null)}><X className="h-4 w-4"/></button></div>}
                    {detail.group.membersCanPost===false&&!canManage
                      ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Seuls les administrateurs peuvent écrire dans ce groupe.</p>
                      : <div className="flex items-end gap-2">
                          <Textarea aria-label="Votre message" disabled={sendMessage.isPending} value={messageText}
                            onChange={event=>{if(failedDraft){draftNonce.current=crypto.randomUUID();setFailedDraft(false)}setMessageText(event.target.value)}}
                            onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();send(event)}}}
                            maxLength={4000} rows={2} placeholder="Écrire un message… (Entrée pour envoyer)"
                            className="min-h-[48px] resize-y rounded-2xl bg-slate-50"/>
                          <Button aria-label="Envoyer le message" type="submit" disabled={!messageText.trim()||sendMessage.isPending} className="h-12 w-12 shrink-0 rounded-2xl bg-teal-700 p-0"><Send className="h-4 w-4"/></Button>
                        </div>}
                    {failedDraft&&<p className="mt-1 text-xs text-red-600">Envoi impossible. Votre texte est conservé ; réessayez.</p>}
                  </form>
                </div>}
              </>}
          </section>
        </div>
      </main>

      <GroupFormDialog open={showCreate||showGroupSettings} mode={showCreate?"create":"edit"} value={groupForm}
        onChange={setGroupForm} onClose={()=>{setShowCreate(false);setShowGroupSettings(false)}}
        onSubmit={()=>showCreate?createGroup.mutate():patchGroup.mutate()} pending={createGroup.isPending||patchGroup.isPending}/>
    </div>
  );
}
