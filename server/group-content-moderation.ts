/** Deterministic policy filter, not a model or a guarantee of semantic detection. */
export function normalizeGroupContent(content: string) {
  return content.normalize("NFKD").replace(new RegExp("\\p{M}","gu"), "").toLowerCase()
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, "")
    .replace(new RegExp("[^\\p{L}\\p{N}\\s]","gu"), " ").replace(/\s+/g, " ").trim()
    .replace(/\b(?:[a-z] ){3,}[a-z]\b/g, letters=>letters.replace(/ /g,""));
}

export function isDisallowedGroupContent(content: string) {
  const text=normalizeGroupContent(content);
  if(/\b(?:arnaqu\w*|escroqu\w*|escrocs?|scam\w*|fraud\w*|voleurs?|voleuses?)\b/.test(text))return true;
  if(/\b(?:faux|fake|bidon)\s+(?:site|plateforme)\b|\b(?:site|plateforme)\s+(?:fake|bidon)\b/.test(text))return true;
  const subject="(?:retraits?|paiements?|sika(?: texte)?|(?:ce|le|votre) site|plateforme)";
  const verb="(?:pass\\w*|abouti\\w*|arriv\\w*|fonctionn\\w*|march\\w*|pai\\w*|pay\\w*)";
  if(new RegExp(`\\b${subject}\\b.{0,65}\\b${verb}\\s+(?:(?:toujours|vraiment|meme)\\s+)?(?:pas|plus|jamais)\\b`).test(text))return true;
  if(new RegExp(`\\b${subject}\\b.{0,45}\\b(?:pas|plus|jamais|non)\\s+(?:(?:encore|du tout|ete)\\s+){0,2}(?:${verb}|recu\\w*|valid\\w*|effectu\\w*|disponible\\w*)\\b`).test(text))return true;
  if(/\bretraits?\b.{0,30}\b(?:bloqu\w*|refus\w*|echou\w*|echec|impossible)\b/.test(text))return true;
  if(/\b(?:impossible|pas possible)\s+(?:de\s+)?(?:retirer|faire (?:un|des|le) retrait|effectuer (?:un|des|le) retrait)\b/.test(text))return true;
  if(/\b(?:arrive|arrivons|peux|peut|pouvons)\s+(?:pas|plus|jamais)\s+a?\s*retirer\b/.test(text))return true;
  if(/\b(?:pas|plus|jamais|non)\s+(?:encore\s+)?(?:recu|valide|effectue|paye)\b.{0,35}\b(?:retraits?|paiements?)\b/.test(text))return true;
  if(/\b(?:pas|plus|jamais)\s+(?:(?:pu|possible de|moyen de)\s+retirer|(?:faire|effectuer)\s+(?:de|un|des|le|mes)\s+retraits?)\b/.test(text))return true;
  return /\bwithdrawals?\b.{0,35}\b(?:failed|fails?|blocked|not (?:working|received|paid)|never (?:arrives?|received))\b/.test(text);
}
