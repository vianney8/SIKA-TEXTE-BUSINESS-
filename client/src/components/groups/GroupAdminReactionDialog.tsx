import { useEffect, useState } from "react";
import { GROUP_REACTIONS, GROUP_REACTION_LABELS, type GroupReaction } from "@shared/group-reactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: string;
  reactions: { emoji: string; count: number; reacted: boolean; adminCount?: number }[];
};

type Props = {
  message: Message | null;
  onClose: () => void;
  onSave: (messageId: string, counts: Record<GroupReaction, number>) => Promise<void>;
};

function initialCounts(message: Message | null): Record<GroupReaction, string> {
  return Object.fromEntries(GROUP_REACTIONS.map(emoji => [
    emoji,
    String(message?.reactions.find(reaction => reaction.emoji === emoji)?.adminCount || 0),
  ])) as Record<GroupReaction, string>;
}

export default function GroupAdminReactionDialog({ message, onClose, onSave }: Props) {
  const { toast } = useToast();
  const [counts, setCounts] = useState<Record<GroupReaction, string>>(() => initialCounts(message));
  const [pending, setPending] = useState(false);
  const open = !!message;

  useEffect(() => {
    if (message) setCounts(initialCounts(message));
  }, [open, message?.id]);

  const invalid = GROUP_REACTIONS.some(emoji => {
    const raw = counts[emoji]?.trim() ?? "";
    if (!raw) return false;
    const value = Number(raw);
    return !Number.isInteger(value) || value < 0 || value > 10000;
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message || invalid) return;
    const values = Object.fromEntries(GROUP_REACTIONS.map(emoji => [
      emoji, counts[emoji].trim() ? Number(counts[emoji]) : 0,
    ])) as Record<GroupReaction, number>;
    setPending(true);
    try {
      await onSave(message.id, values);
      toast({ title: "Réactions enregistrées", description: "Elles s’ajoutent à celles des membres." });
      onClose();
    } catch (error) {
      toast({ title: "Enregistrement impossible", description: (error as Error).message, variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => { if (!nextOpen && !pending) onClose(); }}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Réactions attribuées par l’administration</DialogTitle>
          <DialogDescription>
            Ces nombres s’ajoutent aux réactions réelles des membres. Saisissez 0 pour retirer une quantité attribuée.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            {GROUP_REACTIONS.map(emoji => (
              <label key={emoji} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <span className="w-7 shrink-0 text-center text-xl" aria-hidden="true">{emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="sr-only">{GROUP_REACTION_LABELS[emoji]} — nombre attribué</span>
                  <Input
                    type="number"
                    min={0}
                    max={10000}
                    step={1}
                    inputMode="numeric"
                    value={counts[emoji]}
                    disabled={pending}
                    aria-label={`${emoji} ${GROUP_REACTION_LABELS[emoji]} — nombre attribué`}
                    onChange={event => setCounts(previous => ({ ...previous, [emoji]: event.target.value }))}
                    className="h-10 bg-white text-center font-semibold tabular-nums"
                  />
                </span>
              </label>
            ))}
          </div>
          {invalid && <p role="alert" className="mt-2 text-sm text-red-600">Entrez un nombre entier de 0 à 10 000.</p>}
          <DialogFooter className="mt-5 gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={pending || invalid}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
