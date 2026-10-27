import { test } from "node:test";
import assert from "node:assert/strict";
import {
  containsGroupLink, containsGroupPhoneNumber, isDisallowedGroupContent, normalizeGroupContent,
} from "../server/group-content-moderation";

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

test("The smart policy also rejects links and phone numbers without mistaking common amounts or dates",()=>{
  for(const text of [
    "https://example.com/a", "www.example.org", "Consultez example.com",
    "Appelez-moi au +229 01 57 88 04 38", "Mon numéro est 0157880438",
  ]) assert.equal(isDisallowedGroupContent(text),true,text);

  assert.equal(containsGroupLink("Une annonce officielle est publiée aujourd’hui"),false);
  assert.equal(containsGroupPhoneNumber("Frais : 5 240 XOF, le 2026-10-27"),false);
  assert.equal(isDisallowedGroupContent("Le groupe ouvre à 18 heures, frais 5 240 XOF"),false);
});
