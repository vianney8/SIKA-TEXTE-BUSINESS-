export type MoovPaymentKind =
  | 'account_activation'
  | 'pcs_purchase'
  | 'pcs_activation'
  | 'private_dns'
  | 'other';

export interface ParsedMoovSms {
  amount: number | null;
  phone: string | null;
  senderName: string | null;
  date: string | null;
  ref: string | null;
  raw: string;
}

export interface MoovPaymentCategory {
  kind: MoovPaymentKind;
  label: string;
}

const PAYMENT_CATEGORIES: Record<MoovPaymentKind, MoovPaymentCategory> = {
  account_activation: { kind: 'account_activation', label: 'ACTIVATION DE COMPTE' },
  pcs_purchase: { kind: 'pcs_purchase', label: 'PAIEMENT PCS' },
  pcs_activation: { kind: 'pcs_activation', label: 'ACTIVATION PCS' },
  private_dns: { kind: 'private_dns', label: 'MISE À JOUR DU SERVEUR DNS PRIVÉ' },
  other: { kind: 'other', label: 'PAIEMENT MOBILE MONEY' },
};

/**
 * Les montants ci-dessous correspondent aux offres administratives actuelles.
 * Les link_id/labels restent prioritaires lorsqu'une transaction est déjà
 * enregistrée, afin de supporter une modification future des montants.
 */
export function classifyMoovPayment(input: {
  amount?: number | null;
  linkId?: string | null;
  linkLabel?: string | null;
}): MoovPaymentCategory {
  const linkId = String(input.linkId || '').toLowerCase();
  const linkLabel = String(input.linkLabel || '').toLowerCase();
  const amount = input.amount == null ? null : Math.round(Number(input.amount));

  if (linkId === 'eedbc622' || /dns|serveur\s+dns/.test(linkLabel)) {
    return PAYMENT_CATEGORIES.private_dns;
  }
  if (linkId === '88cb6331' || /activation.*pcs|pcs.*activation/.test(linkLabel)) {
    return PAYMENT_CATEGORIES.pcs_activation;
  }
  if (linkId === 'd3e5479d' || linkId === 'codepcs' || /code\s*pcs|paiement\s*pcs/.test(linkLabel)) {
    return PAYMENT_CATEGORIES.pcs_purchase;
  }

  switch (amount) {
    case 2400:
      return PAYMENT_CATEGORIES.pcs_activation;
    case 3400:
      return PAYMENT_CATEGORIES.private_dns;
    case 5240:
      return PAYMENT_CATEGORIES.pcs_purchase;
    case 3800:
      return PAYMENT_CATEGORIES.account_activation;
    default:
      return PAYMENT_CATEGORIES.other;
  }
}

export function splitMoovSmsBlocks(message: string): string[] {
  const blocks = message
    .split(/(?=Vous\s+avez\s+re[cç]u\s+)/i)
    .map(block => block.trim())
    .filter(block => /Vous\s+avez\s+re[cç]u/i.test(block));

  return blocks.length ? blocks : [message.trim()];
}

export function parseMoovSmsBlock(block: string): ParsedMoovSms {
  // Montant : "3 800 FCFA" ou "3 800 FCFA" → 3800
  const amountMatch = /re[cç]u\s+([\d][\d\s\u00a0]*)\s*FCFA/i.exec(block);
  const amount = amountMatch
    ? parseInt(amountMatch[1].replace(/[\s\u00a0]/g, ''), 10)
    : null;

  const dateMatch = /le\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/i.exec(block);
  const date = dateMatch ? dateMatch[1] : null;

  // Le nom peut contenir des accents et plusieurs espaces avant le numéro.
  const senderMatch = /de\s+(.+?)\s+(\d{10,})\s*[.,]/i.exec(block);
  const senderName = senderMatch ? senderMatch[1].trim() : null;
  const phone = senderMatch ? senderMatch[2] : null;

  const refMatch = /(?:Ref|Réf(?:érence)?)\s*:\s*([A-Za-z0-9_-]+)/i.exec(block);
  const ref = refMatch ? refMatch[1] : null;

  return { amount, phone, senderName, date, ref, raw: block };
}
