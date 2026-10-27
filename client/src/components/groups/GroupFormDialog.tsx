import { useId, type FormEvent } from "react";
import { ImagePlus, LockKeyhole, MessageSquareText, ShieldCheck, UsersRound, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type GroupFormValue = {
  name: string;
  description: string;
  photoUrl: string;
  category: string;
  visibility: string;
  rules: string;
  approvalRequired: boolean;
  membersCanPost?: boolean;
};

type GroupFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  value: GroupFormValue;
  onChange: (value: GroupFormValue) => void;
  onClose: () => void;
  onSubmit: () => void;
  pending: boolean;
};

const fieldClassName =
  "mt-1.5 rounded-xl border-slate-200 bg-white shadow-sm placeholder:text-slate-400 focus-visible:ring-teal-700";
const labelClassName = "block text-sm font-semibold text-slate-800";

export default function GroupFormDialog({
  open,
  mode,
  value,
  onChange,
  onClose,
  onSubmit,
  pending,
}: GroupFormDialogProps) {
  const id = useId();
  const privateGroup = value.visibility === "private";
  const title = mode === "create" ? "Créer un groupe" : "Modifier le groupe";
  const photoIsHttps = !value.photoUrl || /^https:\/\/.+/i.test(value.photoUrl.trim());

  const update = (patch: Partial<GroupFormValue>) => {
    onChange({ ...value, ...patch });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || !photoIsHttps) return;
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        aria-describedby={`${id}-description`}
        className="max-h-[100dvh] w-full max-w-xl gap-0 overflow-hidden rounded-t-[1.75rem] border-slate-200 bg-[#f8fbfb] p-0 shadow-[0_24px_80px_rgba(15,49,54,0.22)] [&>button:last-child]:hidden sm:max-h-[92dvh] sm:rounded-[1.75rem]"
        onEscapeKeyDown={(event) => pending && event.preventDefault()}
        onInteractOutside={(event) => pending && event.preventDefault()}
      >
        <DialogHeader className="relative overflow-hidden border-b border-teal-900/10 bg-gradient-to-br from-[#e6f4f2] via-[#eff8f7] to-[#f7fbf8] px-5 pb-5 pt-6 text-left sm:px-7 sm:pt-7">
          <div aria-hidden="true" className="absolute -right-8 -top-12 h-36 w-36 rounded-full border-[22px] border-teal-700/[0.06]" />
          <div className="relative flex items-start gap-3 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-800 text-white shadow-sm">
              {mode === "create" ? <UsersRound className="h-5 w-5" /> : <MessageSquareText className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-[#183b3d] sm:text-2xl">
                {title}
              </DialogTitle>
              <DialogDescription id={`${id}-description`} className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-600">
                {mode === "create"
                  ? "Un espace clair et accueillant pour les échanges de la communauté Sika Texte."
                  : "Ajustez les informations et les règles de votre communauté."}
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fermer la fenêtre"
            onClick={onClose}
            disabled={pending}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-white/80 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 disabled:opacity-50 sm:right-5 sm:top-5"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="max-h-[calc(100dvh-178px)] space-y-5 overflow-y-auto px-5 py-5 sm:max-h-[calc(92dvh-190px)] sm:px-7 sm:py-6">
            <section aria-labelledby={`${id}-identity-heading`} className="space-y-4">
              <h3 id={`${id}-identity-heading`} className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800">
                Identité du groupe
              </h3>

              <div>
                <label htmlFor={`${id}-name`} className={labelClassName}>Nom du groupe</label>
                <Input
                  id={`${id}-name`}
                  autoFocus
                  required
                  minLength={3}
                  maxLength={100}
                  value={value.name}
                  onChange={(event) => update({ name: event.target.value })}
                  placeholder="Ex. entraide et échanges"
                  className={fieldClassName}
                />
                <p className="mt-1 text-xs text-slate-500">3 à 100 caractères.</p>
              </div>

              <div>
                <label htmlFor={`${id}-description`} className={labelClassName}>Description</label>
                <Textarea
                  id={`${id}-description`}
                  required
                  maxLength={2000}
                  rows={3}
                  value={value.description}
                  onChange={(event) => update({ description: event.target.value })}
                  placeholder="Présentez l’objectif de ce groupe et les échanges qu’on y trouvera."
                  className={`${fieldClassName} min-h-[92px] resize-y`}
                />
              </div>

              <div>
                <label htmlFor={`${id}-photo`} className={labelClassName}>Photo du groupe</label>
                <div className="mt-1.5 flex items-start gap-3">
                  <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-teal-100 bg-teal-50 text-teal-800">
                    <span aria-hidden="true" className="text-lg font-bold">
                      {value.name.trim().slice(0, 1).toLocaleUpperCase("fr-FR") || <ImagePlus className="h-5 w-5" />}
                    </span>
                    {photoIsHttps && value.photoUrl.trim() && (
                      <img
                        src={value.photoUrl.trim()}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={(event) => { event.currentTarget.style.display = "none"; }}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Input
                      id={`${id}-photo`}
                      type="url"
                      inputMode="url"
                      value={value.photoUrl}
                      onChange={(event) => update({ photoUrl: event.target.value })}
                      placeholder="https://…"
                      aria-describedby={`${id}-photo-help${photoIsHttps ? "" : ` ${id}-photo-error`}`}
                      aria-invalid={!photoIsHttps}
                      className={fieldClassName}
                    />
                    <p id={`${id}-photo-help`} className="mt-1 text-xs text-slate-500">Lien sécurisé HTTPS, facultatif.</p>
                    {!photoIsHttps && (
                      <p id={`${id}-photo-error`} role="alert" className="mt-1 text-xs font-medium text-rose-700">
                        Le lien de la photo doit commencer par https://.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor={`${id}-category`} className={labelClassName}>Catégorie</label>
                <Input
                  id={`${id}-category`}
                  maxLength={80}
                  value={value.category}
                  onChange={(event) => update({ category: event.target.value })}
                  placeholder="Général"
                  className={fieldClassName}
                />
              </div>
            </section>

            <section aria-labelledby={`${id}-access-heading`} className="space-y-4 border-t border-slate-200/80 pt-5">
              <h3 id={`${id}-access-heading`} className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800">
                Accès et participation
              </h3>

              <div>
                <label htmlFor={`${id}-visibility`} className={labelClassName}>Type du groupe</label>
                <select
                  id={`${id}-visibility`}
                  value={value.visibility}
                  onChange={(event) => {
                    const visibility = event.target.value;
                    update({
                      visibility,
                      ...(visibility === "private" ? { approvalRequired: true } : {}),
                    });
                  }}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                >
                  <option value="public">Public</option>
                  <option value="private">Privé avec approbation</option>
                  <option value="invite">Sur invitation</option>
                </select>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  {privateGroup
                    ? "Les demandes d’adhésion devront être approuvées par un responsable."
                    : value.visibility === "invite"
                      ? "L’accès se fait à l’aide d’une invitation."
                      : "Le groupe est visible par les membres de la communauté."}
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-teal-200 hover:bg-teal-50/40">
                <input
                  type="checkbox"
                  checked={value.approvalRequired || privateGroup}
                  disabled={privateGroup}
                  onChange={(event) => update({ approvalRequired: event.target.checked })}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:opacity-60"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <ShieldCheck className="h-4 w-4 text-teal-800" />
                    Demander une approbation avant l’adhésion
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                    {privateGroup ? "Obligatoire pour un groupe privé." : "Les responsables valident les demandes des nouveaux membres."}
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-teal-200 hover:bg-teal-50/40">
                <input
                  type="checkbox"
                  checked={value.membersCanPost !== false}
                  onChange={(event) => update({ membersCanPost: event.target.checked })}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <MessageSquareText className="h-4 w-4 text-teal-800" />
                    Autoriser les membres à écrire
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                    Désactivez cette option pour réserver les messages aux responsables.
                  </span>
                </span>
                <LockKeyhole aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              </label>
            </section>

            <section aria-labelledby={`${id}-rules-heading`} className="space-y-2 border-t border-slate-200/80 pt-5">
              <div>
                <h3 id={`${id}-rules-heading`} className={labelClassName}>Règles de discussion</h3>
                <p className="mt-1 text-xs text-slate-500">Expliquez les repères qui aideront chacun à échanger sereinement.</p>
              </div>
              <Textarea
                id={`${id}-rules`}
                maxLength={4000}
                rows={3}
                value={value.rules}
                onChange={(event) => update({ rules: event.target.value })}
                placeholder="Respect, entraide, confidentialité…"
                className={`${fieldClassName} min-h-[88px] resize-y`}
              />
            </section>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/90 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
              className="h-11 rounded-xl border-slate-200 px-5"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={pending || !photoIsHttps}
              className="h-11 rounded-xl bg-teal-800 px-6 font-semibold text-white shadow-sm hover:bg-teal-900"
            >
              {pending ? "Enregistrement…" : mode === "create" ? "Créer le groupe" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
