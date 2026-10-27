import { Reply, Smile } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GROUP_REACTIONS, GROUP_REACTION_LABELS, type GroupReaction } from "@shared/group-reactions";

type Props = {
  canReply: boolean;
  pending: boolean;
  onReply: () => void;
  onReact: (emoji: GroupReaction) => void;
};

export default function GroupMessageActions({ canReply, pending, onReply, onReact }: Props) {
  return (
    <div className="mt-2 flex items-center gap-1 border-t border-slate-200/60 pt-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" disabled={pending} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-600 transition-colors hover:bg-teal-100/70 hover:text-teal-800 disabled:opacity-50">
            <Smile aria-hidden="true" className="h-4 w-4" />Réagir
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" aria-label="Choisir une réaction" className="flex min-w-0 max-w-[calc(100vw-1rem)] gap-0.5 rounded-full border-slate-200 p-1.5 shadow-lg">
            {GROUP_REACTIONS.map(emoji=><DropdownMenuItem key={emoji} disabled={pending}
              aria-label={`${emoji} ${GROUP_REACTION_LABELS[emoji]}`}
              className="grid h-10 w-9 place-items-center rounded-full text-2xl transition-transform hover:scale-110 hover:bg-teal-50 focus-visible:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 motion-reduce:transform-none disabled:opacity-50"
              onSelect={()=>onReact(emoji)}>{emoji}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
      {canReply&&<button type="button" onClick={onReply} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-600 transition-colors hover:bg-teal-100/70 hover:text-teal-800">
        <Reply aria-hidden="true" className="h-4 w-4" />Répondre
      </button>}
    </div>
  );
}
