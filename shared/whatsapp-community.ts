/** Accept official WhatsApp group invitations and existing official channel links. */
export function whatsappCommunityUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const group = host === "chat.whatsapp.com" && /^(?:\/invite)?\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
    const channel = ["whatsapp.com", "www.whatsapp.com"].includes(host) && /^\/channel\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
    return group || channel ? url.href : null;
  } catch {
    return null;
  }
}
