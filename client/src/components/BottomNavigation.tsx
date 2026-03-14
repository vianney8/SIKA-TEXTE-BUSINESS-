import { Home, Briefcase, Users, Clock, User } from "lucide-react";
import { Link } from "wouter";

interface BottomNavigationProps {
  currentPage: string;
}

const navItems = [
  { icon: Home,     label: "Accueil",   href: "/",            id: "home",         testId: "nav-home",   color: "#2563eb" },
  { icon: Briefcase,label: "Travaux",   href: "/work",        id: "work",         testId: "nav-work",   color: "#059669" },
  { icon: Users,    label: "Équipe",    href: "/team",        id: "team",         testId: "nav-team",   color: "#7c3aed" },
  { icon: Clock,    label: "Historique",href: "/transactions",id: "transactions", testId: "nav-history",color: "#0891b2" },
  { icon: User,     label: "Profil",    href: "/profile",     id: "profile",      testId: "nav-profile",color: "#be185d" },
];

export default function BottomNavigation({ currentPage }: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30"
      style={{ background: "#fff", boxShadow: "0 -1px 0 #e5e7eb, 0 -8px 24px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const active = currentPage === item.id;
          return (
            <Link key={item.id} href={item.href}
              data-testid={item.testId}
              className="flex flex-col items-center gap-0.5 flex-1 py-1.5 relative group"
            >
              {/* Pill indicator */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                  style={{ background: item.color }} />
              )}
              <div className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-200 ${
                active ? "scale-105" : "scale-100"
              }`}
                style={active ? { background: `${item.color}15` } : {}}>
                <item.icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.8}
                  style={{ color: active ? item.color : "#94a3b8" }}
                />
              </div>
              <span className="text-[10px] font-semibold transition-colors"
                style={{ color: active ? item.color : "#94a3b8" }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
