import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { randomUUID } from "node:crypto";
import { db, pool } from "../server/db";
import { ensureGroupsSchema, registerGroupRoutes } from "../server/groups";
import { users } from "../shared/schema";
import { sql } from "drizzle-orm";

test("Sika group endpoints enforce membership and persist identity-scoped messages", async () => {
  await ensureGroupsSchema();
  const userA = randomUUID();
  const userB = randomUUID();
  const userC = randomUUID();
  const publicSlug = `test-groupe-${randomUUID().slice(0,8)}`;
  const privateSlug = `test-prive-${randomUUID().slice(0,8)}`;
  const publicId = randomUUID();
  const privateId = randomUUID();
  const app = express();
  app.use(express.json());
  app.use((req: any, res, next) => {
    const userId = req.header("x-test-user");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    req.session = { userId };
    next();
  });
  registerGroupRoutes(app, (_req: any, _res: any, next: any) => next());
  const server = app.listen(0);
  const base = await new Promise<string>(resolve => server.once("listening", () => {
    const address = server.address();
    if (address && typeof address !== "string") resolve(`http://127.0.0.1:${address.port}`);
  }));
  const request = async (userId: string, path: string, method = "GET", body?: unknown) => {
    const response = await fetch(base + path, {
      method, headers: { "x-test-user": userId, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    await db.insert(users).values([
      { id: userA, email: `${userA}@example.test`, fullName: "Membre Test A" },
      { id: userB, email: `${userB}@example.test`, fullName: "Membre Test B" },
      { id: userC, email: `${userC}@example.test`, fullName: "Membre Test C" },
    ]);
    await db.execute(sql`INSERT INTO discussion_groups (id,slug,name,description,visibility,created_by)
      VALUES (${publicId},${publicSlug},'Groupe de test','Description', 'public',${userA})`);
    await db.execute(sql`INSERT INTO discussion_groups (id,slug,name,description,visibility,approval_required,created_by)
      VALUES (${privateId},${privateSlug},'Groupe privé','Description', 'private',true,${userA})`);

    const unauthenticated = await fetch(base + "/api/groups");
    assert.equal(unauthenticated.status, 401);
    const hidden = await request(userB, `/api/groups/${privateSlug}`);
    assert.equal(hidden.status, 404);
    assert.equal((await request(userB, "/api/groups")).body.groups.some((g: any) => g.slug === privateSlug), false);

    const joined = await request(userA, `/api/groups/${publicSlug}/join`, "POST", {});
    assert.equal(joined.status, 200);
    assert.equal((await request(userA, `/api/groups/${publicSlug}/join`, "POST", {})).body.alreadyMember, true);
    const sent = await request(userA, `/api/groups/${publicSlug}/messages`, "POST", { content: "Message persistant", userId: userB });
    assert.equal(sent.status, 201);
    const ownMessages = await request(userA, `/api/groups/${publicSlug}/messages`);
    assert.equal(ownMessages.body.messages.length, 2);
    assert.equal(ownMessages.body.messages[0].content, "Membre Test A a rejoint le groupe.");
    assert.equal(ownMessages.body.messages[1].senderId, userA);
    assert.equal(ownMessages.body.messages[1].senderName, "Membre Test A");

    assert.equal((await request(userB, `/api/groups/${publicSlug}/messages`, "POST", { content: "Pas encore membre" })).status, 403);
    assert.equal((await request(userB, `/api/groups/${publicSlug}/join`, "POST", {})).status, 200);
    const crossGroup = await request(userB, `/api/groups/${publicSlug}/messages`);
    assert.equal(crossGroup.body.messages.some((m: any) => m.content === "Message persistant"), true);
    const deniedEdit = await request(userB, `/api/groups/${publicSlug}/messages/${sent.body.id}`, "PATCH", { content: "usurpation" });
    assert.equal(deniedEdit.status, 404);
    const edit = await request(userA, `/api/groups/${publicSlug}/messages/${sent.body.id}`, "PATCH", { content: "Texte modifié" });
    assert.equal(edit.status, 200);
    assert.equal((await request(userA, `/api/groups/${publicSlug}/messages`)).body.messages.find((m: any) => m.id === sent.body.id).content, "Texte modifié");

    const reaction = await request(userA, `/api/groups/${publicSlug}/messages/${sent.body.id}/reactions`, "POST", { emoji: "👍" });
    assert.equal(reaction.status, 200);
    await request(userA, `/api/groups/${publicSlug}/messages/${sent.body.id}/reactions`, "POST", { emoji: "👍" });
    assert.equal((await request(userA, `/api/groups/${publicSlug}/messages`)).body.messages.find((m: any) => m.id === sent.body.id).reactions.length, 0);

    const pending = await request(userC, `/api/groups/${privateSlug}/join`, "POST", {});
    assert.equal(pending.status, 202);
    assert.equal(pending.body.status, "pending");
    const pendingDetail = await request(userC, `/api/groups/${privateSlug}`);
    assert.equal(pendingDetail.body.membership.status, "pending");

    await request(userA, `/api/groups/${publicSlug}/leave`, "POST", {});
    await request(userA, `/api/groups/${publicSlug}/join`, "POST", {});
    const afterRejoin = await request(userA, `/api/groups/${publicSlug}/messages`);
    assert.equal(afterRejoin.body.messages.filter((m: any) => m.type === "system" && m.content === "Membre Test A a rejoint le groupe.").length, 2);
    assert.equal((await request(userA, `/api/groups/${privateSlug}/messages`)).status, 403);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await db.execute(sql`DELETE FROM discussion_groups WHERE id IN (${publicId},${privateId})`);
    await db.delete(users).where(sql`id IN (${userA},${userB},${userC})`);
    await pool.end();
  }
});
