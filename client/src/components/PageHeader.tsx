import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  rightElement?: React.ReactNode;
}

export default function PageHeader({ title, backHref = "/", rightElement }: PageHeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 shadow-md"
      style={{ background: "linear-gradient(135deg, #1a237e 0%, #283593 40%, #1565c0 100%)" }}
    >
      <div className="px-4 py-4 flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 transition-colors p-2"
        >
          <Link href={backHref}>
            <ArrowLeft size={22} strokeWidth={2.5} />
          </Link>
        </Button>

        <h1 className="text-white font-bold text-base tracking-wide">{title}</h1>

        <div className="w-10 flex justify-end">
          {rightElement || null}
        </div>
      </div>
    </header>
  );
}
