import type { Express, RequestHandler } from "express";

export const sameOriginMutation: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("Origin");
  const source = origin || req.get("Referer");
  if (req.get("Sec-Fetch-Site") === "cross-site") {
    return res.status(403).json({ message: "Origine de la requête non autorisée." });
  }
  if (source) {
    try {
      const url = new URL(source);
      if (url.host !== req.get("host") || !["http:", "https:"].includes(url.protocol) ||
        (req.secure && url.protocol !== "https:")) throw new Error("origin");
    } catch {
      return res.status(403).json({ message: "Origine de la requête non autorisée." });
    }
  } else if ((req.session as any)?.userId && req.get("Sec-Fetch-Site") !== "same-origin") {
    return res.status(403).json({ message: "Effectuez cette action depuis Sika." });
  }
  // Server-to-server signed webhooks have neither a browser Origin nor a session.
  next();
};

export function installHttpSecurity(app: Express, production = process.env.NODE_ENV === "production") {
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "private, no-store");
    if (production) {
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
      if (req.secure) res.setHeader("Strict-Transport-Security", "max-age=31536000");
    }
    let pathname: string;
    try { pathname = decodeURIComponent(req.path); } catch { return res.sendStatus(400); }
    if (/(^|\/)(\.env(?:[./]|$)|\.git(?:\/|$)|\.npmrc$|\.replit$|replit\.nix$)/i.test(pathname) ||
      (production && (/\.(map|sql|sqlite|db)$/i.test(pathname) ||
        /^\/(?:server|shared|node_modules)(?:\/|$)/i.test(pathname)))) {
      return res.sendStatus(404);
    }
    next();
  });
}
