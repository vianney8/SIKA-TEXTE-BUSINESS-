import type { RequestHandler } from "express";

type AdminUser = { id: string; role: string | null; isBlocked: boolean | null };

export function createAdminGuard(getUser: (id: string) => Promise<AdminUser | undefined>): RequestHandler {
  return async (req: any, res, next) => {
    const id = req.session?.userId;
    if (!id) return res.status(401).json({ message: "Connexion administrateur requise." });
    if (req.sikaVerifiedAdmin === id) return next();
    try {
      const user = await getUser(id);
      if (!user || user.isBlocked || user.role !== "admin") {
        if (!user || user.isBlocked) req.session.destroy(() => {});
        return res.status(403).json({ message: "Accès administrateur refusé." });
      }
      const now = Date.now();
      const lastSeen = Number(req.session.adminLastSeenAt || req.session.authenticatedAt || now);
      if (now - lastSeen > 30 * 60 * 1000) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "Session administrateur expirée. Reconnectez-vous." });
      }
      if (!req.session.adminLastSeenAt || now - lastSeen >= 60000) req.session.adminLastSeenAt = now;
      req.sikaVerifiedAdmin = id;
      next();
    } catch {
      res.status(503).json({ message: "Vérification des droits indisponible." });
    }
  };
}
