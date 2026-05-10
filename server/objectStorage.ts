import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }
    return null;
  }

  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });
      const stream = file.createReadStream();
      stream.on("error", (err: Error) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Télécharge un fichier via URL signée GET (contourne la validation du nom de bucket GCS)
  async downloadViaSignedUrl(objectPath: string, res: Response, cacheTtlSec: number = 3600) {
    const { bucketName, objectName } = parseObjectPath(objectPath);
    const getUrl = await signObjectURL({ bucketName, objectName, method: "GET", ttlSec: 300 });
    const upstream = await fetch(getUrl);
    if (!upstream.ok) {
      if (upstream.status === 404) throw new ObjectNotFoundError();
      throw new Error(`Storage fetch failed: ${upstream.status}`);
    }
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");
    res.set({
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    });
    if (contentLength) res.set("Content-Length", contentLength);
    const { Readable } = await import("stream");
    const nodeStream = Readable.fromWeb(upstream.body as any);
    nodeStream.on("error", (err: Error) => {
      console.error("Stream error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Error streaming file" });
    });
    nodeStream.pipe(res);
  }

  // Vérifie l'existence via URL signée HEAD (contourne la validation du nom de bucket GCS)
  async existsViaSignedUrl(objectPath: string): Promise<boolean> {
    try {
      const { bucketName, objectName } = parseObjectPath(objectPath);
      const getUrl = await signObjectURL({ bucketName, objectName, method: "GET", ttlSec: 60 });
      const resp = await fetch(getUrl, { method: "HEAD" });
      return resp.ok;
    } catch {
      return false;
    }
  }

  // Upload un buffer via URL signée PUT (contourne la validation du nom de bucket GCS)
  async uploadViaSignedUrl(buffer: Buffer, mimeType: string, objectPath: string): Promise<void> {
    const { bucketName, objectName } = parseObjectPath(objectPath);
    const putUrl = await signObjectURL({ bucketName, objectName, method: "PUT", ttlSec: 300 });
    const resp = await fetch(putUrl, {
      method: "PUT",
      body: buffer,
      headers: { "Content-Type": mimeType },
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Upload failed: ${resp.status} ${text}`);
    }
  }

  async getUploadURL(fileName: string): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const extension = fileName.split('.').pop() || 'jpg';
    const fullPath = `${privateObjectDir}/profile-photos/${objectId}.${extension}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return signObjectURL({ bucketName, objectName, method: "PUT", ttlSec: 900 });
  }

  normalizeObjectPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) objectEntityDir = `${objectEntityDir}/`;
    if (!rawObjectPath.startsWith(objectEntityDir)) return rawObjectPath;
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/profile-photos/${entityId}`;
  }

  async getProfilePhotoFile(photoPath: string): Promise<File> {
    if (!photoPath.startsWith("/profile-photos/")) throw new ObjectNotFoundError();
    const fileName = photoPath.replace("/profile-photos/", "");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const objectEntityPath = `${entityDir}profile-photos/${fileName}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) throw new ObjectNotFoundError();
    return objectFile;
  }

  async getDemoVideoUploadURL(originalFileName: string): Promise<{ uploadUrl: string; videoId: string }> {
    const ext = (originalFileName.split(".").pop() || "mp4").toLowerCase().replace("quicktime", "mov");
    const videoId = `${randomUUID()}.${ext}`;
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const objectPath = `${entityDir}demo-videos/${videoId}`;
    const { bucketName, objectName } = parseObjectPath(objectPath);
    const uploadUrl = await signObjectURL({ bucketName, objectName, method: "PUT", ttlSec: 3600 });
    return { uploadUrl, videoId };
  }

  async uploadDemoVideo(buffer: Buffer, mimeType: string): Promise<string> {
    const ext = mimeType.split("/")[1] || "mp4";
    const videoId = randomUUID();
    const fileName = `${videoId}.${ext}`;
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const objectPath = `${entityDir}demo-videos/${fileName}`;
    await this.uploadViaSignedUrl(buffer, mimeType, objectPath);
    return `/api/media/demo-video/${videoId}.${ext}`;
  }

  async getDemoVideoFile(videoId: string): Promise<File> {
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const objectPath = `${entityDir}demo-videos/${videoId}`;
    const { bucketName, objectName } = parseObjectPath(objectPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();
    return file;
  }

  // Récupère le chemin GCS d'une vidéo de démo (pour streaming via URL signée)
  getDemoVideoObjectPath(videoId: string): string {
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    return `${entityDir}demo-videos/${videoId}`;
  }

  async deleteDemoVideo(videoId: string): Promise<void> {
    try {
      let entityDir = this.getPrivateObjectDir();
      if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
      const objectPath = `${entityDir}demo-videos/${videoId}`;
      const exists = await this.existsViaSignedUrl(objectPath);
      if (exists) {
        const { bucketName, objectName } = parseObjectPath(objectPath);
        const delUrl = await signObjectURL({ bucketName, objectName, method: "DELETE", ttlSec: 60 });
        await fetch(delUrl, { method: "DELETE" });
        console.log("[DEMO-VIDEO] Ancienne vidéo supprimée:", objectPath);
      }
    } catch (err) {
      console.error("[DEMO-VIDEO] Erreur suppression ancienne vidéo:", err);
    }
  }

  async uploadPaymentLinkImage(buffer: Buffer, mimeType: string): Promise<string> {
    const ext = mimeToExt(mimeType);
    const imageId = randomUUID();
    const fileName = `${imageId}.${ext}`;
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const objectPath = `${entityDir}payment-link-images/${fileName}`;
    await this.uploadViaSignedUrl(buffer, mimeType, objectPath);
    return `/api/media/payment-link-image/${fileName}`;
  }

  async uploadActivationScreenshot(buffer: Buffer, mimeType: string): Promise<string> {
    const ext = mimeToExt(mimeType);
    const imageId = randomUUID();
    const fileName = `${imageId}.${ext}`;
    const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
    const localDir = path.join(process.cwd(), "uploads", "activation-screenshots");
    if (!privateDir) {
      fs.mkdirSync(localDir, { recursive: true });
      fs.writeFileSync(path.join(localDir, fileName), buffer);
      return `/api/media/activation-screenshot/${fileName}`;
    }
    let entityDir = privateDir;
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const objectPath = `${entityDir}activation-screenshots/${fileName}`;
    try {
      await this.uploadViaSignedUrl(buffer, mimeType, objectPath);
    } catch (err) {
      console.warn("[OBJECT-STORAGE] Upload GCS échoué, repli sur disque local:", err);
      fs.mkdirSync(localDir, { recursive: true });
      fs.writeFileSync(path.join(localDir, fileName), buffer);
    }
    return `/api/media/activation-screenshot/${fileName}`;
  }

  async getActivationScreenshotFile(imageId: string): Promise<File | null> {
    const localPath = path.join(process.cwd(), "uploads", "activation-screenshots", imageId);
    if (fs.existsSync(localPath)) return null;
    const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!privateDir) throw new ObjectNotFoundError();
    let entityDir = privateDir;
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const objectPath = `${entityDir}activation-screenshots/${imageId}`;
    const { bucketName, objectName } = parseObjectPath(objectPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [exists] = await file.exists().catch(() => [false]);
    if (!exists) throw new ObjectNotFoundError();
    return file;
  }

  // Chemin GCS d'une capture d'activation (pour streaming via URL signée)
  getActivationScreenshotObjectPath(imageId: string): string {
    const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
    let entityDir = privateDir;
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    return `${entityDir}activation-screenshots/${imageId}`;
  }

  async uploadLinkManualScreenshot(buffer: Buffer, mimeType: string): Promise<string> {
    const ext = mimeToExt(mimeType);
    const imageId = randomUUID();
    const fileName = `${imageId}.${ext}`;
    const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
    const localDir = path.join(process.cwd(), "uploads", "link-manual-screenshots");
    if (!privateDir) {
      fs.mkdirSync(localDir, { recursive: true });
      fs.writeFileSync(path.join(localDir, fileName), buffer);
      return `/api/media/link-manual-screenshot/${fileName}`;
    }
    let entityDir = privateDir;
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const objectPath = `${entityDir}link-manual-screenshots/${fileName}`;
    try {
      await this.uploadViaSignedUrl(buffer, mimeType, objectPath);
    } catch (err) {
      console.warn("[OBJECT-STORAGE] Upload GCS échoué, repli sur disque local:", err);
      fs.mkdirSync(localDir, { recursive: true });
      fs.writeFileSync(path.join(localDir, fileName), buffer);
    }
    return `/api/media/link-manual-screenshot/${fileName}`;
  }

  async getLinkManualScreenshotFile(imageId: string): Promise<File | null> {
    const localPath = path.join(process.cwd(), "uploads", "link-manual-screenshots", imageId);
    if (fs.existsSync(localPath)) return null;
    const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!privateDir) throw new ObjectNotFoundError();
    let entityDir = privateDir;
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const objectPath = `${entityDir}link-manual-screenshots/${imageId}`;
    const { bucketName, objectName } = parseObjectPath(objectPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [exists] = await file.exists().catch(() => [false]);
    if (!exists) throw new ObjectNotFoundError();
    return file;
  }

  // Chemin GCS d'une capture de paiement lien (pour streaming via URL signée)
  getLinkManualScreenshotObjectPath(imageId: string): string {
    const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
    let entityDir = privateDir;
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    return `${entityDir}link-manual-screenshots/${imageId}`;
  }

  async getPaymentLinkImageFile(imageId: string): Promise<File> {
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const objectPath = `${entityDir}payment-link-images/${imageId}`;
    const { bucketName, objectName } = parseObjectPath(objectPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [exists] = await file.exists().catch(() => [false]);
    if (!exists) throw new ObjectNotFoundError();
    return file;
  }

  // Chemin GCS d'une image de lien paiement (pour streaming via URL signée)
  getPaymentLinkImageObjectPath(imageId: string): string {
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    return `${entityDir}payment-link-images/${imageId}`;
  }
}

function mimeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/avif": "avif",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "application/octet-stream": "bin",
  };
  return map[mimeType] || (mimeType.split("/")[1] || "jpg").replace("jpeg", "jpg");
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return { bucketName, objectName };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
