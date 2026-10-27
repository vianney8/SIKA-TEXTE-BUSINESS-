import { FaWhatsapp } from "react-icons/fa";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { whatsappCommunityUrl } from "@shared/whatsapp-community";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteUrl?: string;
  loading: boolean;
};

export default function WhatsAppGroupInvitation({ open, onOpenChange, inviteUrl, loading }: Props) {
  const href = whatsappCommunityUrl(inviteUrl);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2.5rem)] max-w-sm gap-0 overflow-hidden rounded-3xl border-0 p-0 [&>button]:text-white [&>button]:opacity-80">
        <div className="bg-gradient-to-br from-[#25d366] to-[#128c7e] px-6 pb-5 pt-7 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <FaWhatsapp aria-hidden="true" size={32} className="text-white" />
          </div>
          <DialogTitle className="text-lg font-bold text-white">Notre groupe officiel WhatsApp</DialogTitle>
        </div>
        <DialogDescription className="px-6 pb-4 pt-5 text-center text-sm leading-relaxed text-slate-600">
          Rejoignez le groupe officiel SIKA TEXTE pour recevoir les dernières nouvelles.
        </DialogDescription>
        <div className="flex flex-col gap-2.5 px-6 pb-6">
          {href && !loading ? (
            <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => onOpenChange(false)}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#128c7e] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0d7064] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128c7e] focus-visible:ring-offset-2">
              <FaWhatsapp aria-hidden="true" size={19} />Rejoindre le groupe
            </a>
          ) : (
            <>
              <button disabled className="min-h-12 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-400">Rejoindre le groupe</button>
              <p role="status" className="text-center text-xs text-slate-500">{loading ? "Chargement du lien…" : "Le lien WhatsApp est momentanément indisponible."}</p>
            </>
          )}
          <button type="button" onClick={() => onOpenChange(false)}
            className="min-h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100">
            D’accord
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
