export const INITIAL_DNS_VERSION = "v.025";

export interface DnsRelease {
  id: string;
  version: string;
  message: string;
  publishedAt: string;
}

export interface AdminDnsVersion {
  currentVersion: string;
  affectedUsers: number;
}

export function defaultDnsAnnouncement(version: string): string {
  return `Une nouvelle version améliorée du serveur DNS privé, ${version}, est disponible. Votre version actuelle est désormais obsolète. Veuillez effectuer la nouvelle mise à jour depuis la rubrique DNS privé de votre page de retrait pour bénéficier de cette nouvelle version.`;
}

export function dnsVersionIsOutdated(installedVersion: string | null | undefined, currentVersion: string): boolean {
  return !!installedVersion && installedVersion !== currentVersion;
}
