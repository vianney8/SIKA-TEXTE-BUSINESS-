import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { whatsappCommunityUrl } from "../shared/whatsapp-community";

test("WhatsApp invitations accept official group and existing channel links", () => {
  for (const link of [
    "https://chat.whatsapp.com/Abc123",
    "https://chat.whatsapp.com/invite/Abc123?mode=ac_t",
    "https://whatsapp.com/channel/0029VbC6vZ33bbV4eIeyXJ0T",
    "https://www.whatsapp.com/channel/0029VbC6vZ33bbV4eIeyXJ0T",
  ]) assert.equal(whatsappCommunityUrl(` ${link} `), link);
});

test("WhatsApp invitations reject missing, generic or unsafe destinations", () => {
  for (const link of [
    "", null, {}, "https://whatsapp.com", "https://whatsapp.com/channel",
    "https://chat.whatsapp.com/", "http://chat.whatsapp.com/Abc123",
    "javascript:alert(1)", "https://chat.whatsapp.com.evil.test/Abc123",
    "https://chat.whatsapp.com@evil.test/Abc123",
    "https://name:secret@chat.whatsapp.com/Abc123",
    "https://chat.whatsapp.com:8080/Abc123",
  ]) assert.equal(whatsappCommunityUrl(link), null);
});

test("The home page retains one WhatsApp invitation and no legacy notification", () => {
  const dashboard = readFileSync(new URL("../client/src/pages/Dashboard.tsx", import.meta.url), "utf8");
  assert.equal((dashboard.match(/<WhatsAppGroupInvitation\b/g) || []).length, 1);
  assert.doesNotMatch(dashboard, /\bWhatsAppNotification\b|\bMiddleNotification\b|wa_notif_dismissed/);
  for (const name of ["WhatsAppNotification.tsx", "MiddleNotification.tsx"]) {
    assert.equal(existsSync(new URL(`../client/src/components/${name}`, import.meta.url)), false);
  }
});
