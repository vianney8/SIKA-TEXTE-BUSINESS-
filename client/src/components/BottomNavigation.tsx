import { Button } from "@/components/ui/button";
import { Home, Users, Briefcase } from "lucide-react";
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
      activeColor: "text-primary bg-blue-50",
      hoverColor: "text-muted-foreground hover:text-primary hover:bg-blue-50",
    },
    {
      icon: Users,
      label: "Équipe",
      href: "/team",
      id: "team",
      testId: "nav-team",
      activeColor: "text-green-600 bg-green-50",
      hoverColor: "text-muted-foreground hover:text-green-600 hover:bg-green-50",
    },
    {
      icon: Briefcase,
      label: "Travail",
      href: "/work",
      id: "work",
      testId: "nav-work",
      activeColor: "text-accent bg-orange-50",
      hoverColor: "text-muted-foreground hover:text-accent hover:bg-orange-50",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30 shadow-lg">
      <div className="flex justify-around py-3 px-2">
        {navItems.map((item) => (
          <Button
            key={item.id}
            asChild
            variant="ghost"
            className={`flex flex-col items-center p-3 rounded-lg transition-all duration-200 ${
              currentPage === item.id
                ? `${item.activeColor} font-semibold`
                : item.hoverColor
            }`}
            data-testid={item.testId}
          >
            <Link href={item.href}>
              <item.icon size={24} strokeWidth={currentPage === item.id ? 2.5 : 2} className="mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          </Button>
        ))}
      </div>
    </nav>
  );
}
