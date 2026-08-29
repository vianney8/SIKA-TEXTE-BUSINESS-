import type { LucideIcon } from "lucide-react";
import {
  Bot,
  ChevronRight,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  RefreshCw,
  Settings,
  TrendingDown,
  Users,
  Wifi,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const adminLinks: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/admin", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/admin/withdrawals", label: "Retraits", icon: TrendingDown },
  { href: "/admin/ci-update", label: "Mise à jour +225", icon: RefreshCw },
  { href: "/admin/pcs-send", label: "Codes PCS", icon: Mail },
  { href: "/admin/messages", label: "Messages", icon: MessageCircle },
  { href: "/admin/connected-users", label: "Connectés", icon: Wifi },
  { href: "/admin/ai-chat", label: "Lylya IA", icon: Bot },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

interface AdminNavProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  badge?: string | number;
  actions?: React.ReactNode;
}

export default function AdminNav({
  title,
  subtitle,
  icon: PageIcon,
  badge,
  actions,
}: AdminNavProps) {
  const [location] = useLocation();

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      .finally(() => {
        window.location.href = "/simple-login";
      });
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/95 text-white shadow-lg shadow-slate-950/10 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/admin"
            className="group flex min-w-0 items-center gap-3"
            data-testid="button-back"
          >
            <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-950/30 transition-transform group-hover:scale-105">
              <span className="font-serif text-sm font-black tracking-tight text-white">ST</span>
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate font-serif text-sm font-extrabold tracking-tight">SIKA TEXTE</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-teal-300/80">Administration</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {actions}
            <Link
              href="/dashboard"
              className="hidden h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-200 transition hover:bg-white/10 sm:flex"
            >
              <CircleUserRound className="h-4 w-4" />
              Mon compte
            </Link>
            <button
              type="button"
              onClick={logout}
              className="grid h-9 w-9 place-items-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav aria-label="Navigation administrateur" className="border-t border-white/5">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-2 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {adminLinks.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/admin"
                ? location === "/admin" || location === "/"
                : location.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-none items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    active
                      ? "bg-teal-500 text-white shadow-md shadow-teal-950/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <section className="border-b border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-8">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl border border-white/10 bg-white/10 text-teal-300 shadow-inner">
              <PageIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  className="truncate font-serif text-xl font-extrabold tracking-tight sm:text-2xl"
                  data-testid="page-title"
                >
                  {title}
                </h1>
                {badge !== undefined && (
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950">{badge}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm">{subtitle}</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-300 hover:text-teal-200 sm:hidden"
          >
            Vue d’ensemble
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </>
  );
}