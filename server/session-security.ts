import type { Request } from "express";

export function newPasswordError(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (Buffer.byteLength(value.trim(), "utf8") > 72) return "Le mot de passe est trop long (72 octets maximum).";
  return null;
}

/** Rotate the session after authentication; keep the existing PostgreSQL session store. */
export async function establishUserSession(req: Request, userId: string) {
  await new Promise<void>((resolve, reject) =>
    req.session.regenerate(error => error ? reject(error) : resolve()));
  (req.session as any).userId = userId;
  (req.session as any).authenticatedAt = Date.now();
  await new Promise<void>((resolve, reject) =>
    req.session.save(error => error ? reject(error) : resolve()));
}
