import type { RequestHandler } from "express";
import { isIP } from "node:net";

/** Group photos are external images, never files fetched or executed by this server. */
export function isSafeGroupPhoto(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return url.protocol === "https:" && !url.username && !url.password &&
      !isIP(host) && !host.includes(":") && host.includes(".") &&
      !["localhost", "local", "internal", "test", "invalid"].some(part => host === part || host.endsWith(`.${part}`));
  } catch {
    return false;
  }
}

/** A custom header prevents cross-site form submissions, even without Origin. */
export const groupRequestSecurity: RequestHandler = (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (req.get("X-Sika-Groups") !== "1" || req.get("Sec-Fetch-Site") === "cross-site") {
      return res.status(403).json({ message: "Cette action doit être effectuée depuis Sika." });
    }
    const origin = req.get("Origin");
    if (origin) {
      try {
        const source = new URL(origin);
        if (source.host !== req.get("host") || !["http:", "https:"].includes(source.protocol) ||
          (req.secure && source.protocol !== "https:")) throw new Error("Origin");
      } catch {
        return res.status(403).json({ message: "Origine de la requête non autorisée." });
      }
    }
    if (req.method !== "DELETE" && !req.is("application/json")) {
      return res.status(415).json({ message: "Envoyez des données JSON. Les pièces jointes ne sont pas acceptées dans les groupes." });
    }
    if (Number(req.get("Content-Length") || 0) > 65536 ||
      Buffer.byteLength(JSON.stringify(req.body ?? {})) > 65536) {
      return res.status(413).json({ message: "La demande est trop volumineuse." });
    }
  }
  const id = req.path.match(/\/(?:messages|reports)\/([^/]+)/)?.[1];
  if (id && (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > BigInt("9223372036854775807"))) {
    return res.status(400).json({ message: "Identifiant de message ou de signalement invalide." });
  }
  next();
};
