import type { Request } from "express";

/** Rotate the session after authentication; keep the existing PostgreSQL session store. */
export async function establishUserSession(req: Request, userId: string) {
  await new Promise<void>((resolve, reject) =>
    req.session.regenerate(error => error ? reject(error) : resolve()));
  (req.session as any).userId = userId;
  await new Promise<void>((resolve, reject) =>
    req.session.save(error => error ? reject(error) : resolve()));
}
