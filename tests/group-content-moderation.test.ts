import { test } from "node:test";
import assert from "node:assert/strict";
import { isDisallowedGroupContent,normalizeGroupContent } from "../server/group-content-moderation";

test("The group policy recognizes specified terms, variants and withdrawal failures",()=>{
  for(const text of ["ARNAQUE","arnaqués","des escroqueries","un escroc","scammers","frauduleux","des voleurs",
    "ar\u200bnaque","a.r.n.a.q.u.e","Ce site est une arnaque",
    "les retraits ne passe pas","Mon retrait n’est toujours pas arrivé",
    "Les retraits ne passent plus","Mon retrait n'a pas abouti","mon retrait est non reçu",
    "Les retraits sont bloqués","Impossible de retirer","Je n'arrive pas à retirer",
    "Sika ne paie pas","ce site ne fonctionne jamais","withdrawal not received","faux site",
    "Je n’ai pas encore reçu mon retrait","Je n’ai pas pu retirer"]){
    assert.equal(isDisallowedGroupContent(text),true,text);
  }
});

test("The policy does not reject ordinary questions, successful withdrawals or substring coincidences",()=>{
  for(const text of ["Bonjour à tous","Comment effectuer un retrait ?","Mon retrait est passé, merci",
    "Le bus Cameroun arrive","Merci pour le paiement reçu","Pas de problème avec mon retrait",
    "Où obtenir de l’aide pour le site ?","Comment activer mon compte ?"]){
    assert.equal(isDisallowedGroupContent(text),false,text);
  }
  assert.equal(normalizeGroupContent("  ÉTÉ,  reçu ! "),"ete recu");
});
