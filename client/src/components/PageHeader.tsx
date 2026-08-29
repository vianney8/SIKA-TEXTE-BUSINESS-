import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  rightElement?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, backHref = "/", rightElement }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, hsl(216 31% 18%), hsl(174 73% 27%))" }}>
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
        style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />
      <div className="px-4 pt-4 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={backHref}>
              <div className="w-9 h-9 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center active:bg-white/20 transition-colors">
                <ChevronLeft size={20} className="text-white" />
              </div>
            </Link>
            <div>
              <h1 className="text-white font-black text-xl">{title}</h1>
              {subtitle && <p className="text-blue-300 text-xs">{subtitle}</p>}
            </div>
          </div>
          {rightElement && (
            <div className="flex-shrink-0">{rightElement}</div>
          )}
        </div>
      </div>
    </div>
  );
}
