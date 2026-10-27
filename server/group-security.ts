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

export function detectGroupImageMime(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => buffer[index] === byte)) return "image/png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
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
    const originalPath = req.originalUrl.split("?")[0];
    const groupImagePath = req.method === "POST" && /^\/api\/groups\/[^/]+\/images$/.test(originalPath);
    const isGroupImageUpload = groupImagePath && req.is("multipart/form-data");
    if (req.method !== "DELETE" && !req.is("application/json") && !isGroupImageUpload) {
      return res.status(415).json({ message: "Format de demande non accepté dans les groupes." });
    }
    const maxBodyBytes = isGroupImageUpload ? 5 * 1024 * 1024 + 64 * 1024 : 65536;
    if (Number(req.get("Content-Length") || 0) > maxBodyBytes ||
      Buffer.byteLength(JSON.stringify(req.body ?? {})) > maxBodyBytes) {
      return res.status(413).json({ message: "La demande est trop volumineuse." });
    }
  }
  const id = req.path.match(/\/(?:messages|reports)\/([^/]+)/)?.[1];
  if (id && (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > BigInt("9223372036854775807"))) {
    return res.status(400).json({ message: "Identifiant de message ou de signalement invalide." });
  }
  next();
};
