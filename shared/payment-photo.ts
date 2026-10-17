export const PAYMENT_PHOTO_MAX_BYTES = 20 * 1024 * 1024;
const photoMimeTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp",
  "image/heic", "image/heif", "image/avif",
]);
const photoExtension = /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i;

export function paymentPhotoError(file: { type: string; name: string; size: number }): string | null {
  if (!photoMimeTypes.has(file.type.toLowerCase()) &&
      !((!file.type || file.type === "application/octet-stream") && photoExtension.test(file.name))) {
    return "Veuillez choisir une photo. Les PDF et autres documents ne sont pas acceptés.";
  }
  if (file.size === 0) return "Cette photo est vide. Veuillez en choisir une autre.";
  if (file.size > PAYMENT_PHOTO_MAX_BYTES) return "La photo ne doit pas dépasser 20 Mo.";
  return null;
}

// Check the actual uploaded content rather than trusting a renamed PDF.
export function detectPaymentPhotoMime(bytes: Uint8Array): string | null {
  const text = (start: number, length: number) => String.fromCharCode(...Array.from(bytes.slice(start, start + length)));
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return "image/png";
  if (text(0, 4) === "RIFF" && text(8, 4) === "WEBP") return "image/webp";
  if (text(0, 6) === "GIF87a" || text(0, 6) === "GIF89a") return "image/gif";
  if (text(0, 2) === "BM") return "image/bmp";
  if (text(4, 4) === "ftyp") {
    // Check major and compatible brands; HEIF files often use mif1 as major brand.
    const brands = [text(8, 4)];
    for (let i = 16; i + 4 <= Math.min(bytes.length, 80); i += 4) brands.push(text(i, 4));
    if (brands.some(brand => brand === "avif" || brand === "avis")) return "image/avif";
    if (brands.some(brand => ["heic", "heix", "hevc", "hevx"].includes(brand))) return "image/heic";
    if (brands.some(brand => brand === "mif1" || brand === "msf1")) return "image/heif";
  }
  return null;
}
