import { Button } from "@/components/ui/button";
import { Home, Users, BarChart } from "lucide-react";
import { Link } from "wouter";

interface BottomNavigationProps {
  currentPage: string;
}

export default function BottomNavigation({ currentPage }: BottomNavigationProps) {
  const navItems = [
    {
      icon: Home,
      label: "Accueil",
      href: "/",
      id: "home",
      testId: "nav-home",
    },
    {
      icon: Users,
      label: "Équipe",
      href: "/team",
      id: "team",
      testId: "nav-team",
    },
    {
      icon: BarChart,
      label: "Stats",
      href: "/",
      id: "stats",
      testId: "nav-stats",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30">
      <div className="flex justify-around py-2">
        {navItems.map((item) => (
          <Button
            key={item.id}
            asChild
            variant="ghost"
            className={`flex flex-col items-center p-3 ${
              currentPage === item.id
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            } transition-colors`}
            data-testid={item.testId}
          >
            <Link href={item.href}>
              <item.icon size={20} className="mb-1" />
              <span className="text-xs">{item.label}</span>
            </Link>
          </Button>
        ))}
      </div>
    </nav>
  );
}
