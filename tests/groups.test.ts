import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { randomUUID } from "node:crypto";
import { db, pool } from "../server/db";
import { ensureGroupsSchema, registerGroupRoutes } from "../server/groups";
import { users } from "../shared/schema";
import { sql } from "drizzle-orm";
import { GROUP_REACTIONS } from "../shared/group-reactions";

test("Sika group endpoints enforce membership and persist identity-scoped messages", async () => {
  await ensureGroupsSchema();
  const userA = randomUUID();
  const userB = randomUUID();
  const userC = randomUUID();
  const publicSlug = `test-groupe-${randomUUID().slice(0,8)}`;
  const privateSlug = `test-prive-${randomUUID().slice(0,8)}`;
  const publicId = randomUUID();
  const privateId = randomUUID();
  let adminGroupId: string | undefined;
  const extraUserIds:string[]=[];
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
      method, headers: { "x-test-user": userId, "X-Sika-Groups": "1", ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    await db.insert(users).values([
      { id: userA, email: `${userA}@example.test`, fullName: "Membre Test A" },
      { id: userB, email: `${userB}@example.test`, fullName: "Membre Test B" },
      { id: userC, email: `${userC}@example.test`, fullName: "Yvan SPQ SIKA", role: "admin" },
    ]);
    await db.execute(sql`INSERT INTO discussion_groups (id,slug,name,description,visibility,created_by)
      VALUES (${publicId},${publicSlug},'Groupe de test','Description', 'public',${userA})`);
    await db.execute(sql`INSERT INTO discussion_groups (id,slug,name,description,visibility,approval_required,created_by)
      VALUES (${privateId},${privateSlug},'Groupe privé','Description', 'invite',true,${userA})`);

    const unauthenticated = await fetch(base + "/api/groups");
    assert.equal(unauthenticated.status, 401);
    const hidden = await request(userB, `/api/groups/${privateSlug}`);
    assert.equal(hidden.status, 404);
    assert.equal((await request(userB, `/api/groups/${privateSlug}/messages`)).status, 403);
    assert.equal((await request(userB, "/api/groups")).body.groups.some((g: any) => g.slug === privateSlug), false);
    assert.equal((await request(userC,"/api/groups","POST",{name:"Groupe usurpé",description:"Non autorisé",visibility:"public"})).status,403);

    const joined = await request(userA, `/api/groups/${publicSlug}/join`, "POST", {});
    assert.equal(joined.status, 200);
    assert.equal((await request(userA, `/api/groups/${publicSlug}/join`, "POST", {})).body.alreadyMember, true);
    const clientNonce=randomUUID();
    const sent = await request(userA, `/api/groups/${publicSlug}/messages`, "POST", { content: "Message persistant", userId: userB, senderIsAdmin:true, clientNonce });
    assert.equal(sent.status, 201);
    assert.equal((await request(userA, `/api/groups/${publicSlug}/messages`, "POST", {content:"Message persistant",clientNonce})).body.id,sent.body.id);
    const ownMessages = await request(userA, `/api/groups/${publicSlug}/messages`);
    assert.equal(ownMessages.body.messages.length, 2);
    assert.equal(ownMessages.body.messages[0].content, "Membre Test A a rejoint le groupe.");
    assert.equal(ownMessages.body.messages[1].senderId, userA);
    assert.equal(ownMessages.body.messages[1].senderName, "Membre Test A");
    assert.equal(ownMessages.body.messages[1].senderIsAdmin, false);

    assert.equal((await request(userB, `/api/groups/${publicSlug}/messages`, "POST", { content: "Pas encore membre" })).status, 403);
    assert.equal((await request(userB, `/api/groups/${publicSlug}/join`, "POST", {role:"owner",userId:userA})).status, 200);
    assert.equal((await request(userB, `/api/groups/${publicSlug}`)).body.membership.role, "member");
    assert.equal((await request(userB, `/api/groups/${publicSlug}`)).body.counts.memberCount, 2);
    assert.equal((await request(userB, `/api/groups/${publicSlug}/admin/queue`)).status, 403);
    assert.equal((await request(userB, `/api/groups/${publicSlug}/admin/members/${userB}`, "POST", {action:"promote"})).status, 403);
    assert.equal((await request(userB, `/api/groups/${publicSlug}/messages/${sent.body.id}`, "DELETE")).status, 404);
    const crossGroup = await request(userB, `/api/groups/${publicSlug}/messages`);
    assert.equal(crossGroup.body.messages.some((m: any) => m.content === "Message persistant"), true);
    const deniedEdit = await request(userB, `/api/groups/${publicSlug}/messages/${sent.body.id}`, "PATCH", { content: "usurpation" });
    assert.equal(deniedEdit.status, 404);
    const edit = await request(userA, `/api/groups/${publicSlug}/messages/${sent.body.id}`, "PATCH", { content: "Texte modifié" });
    assert.equal(edit.status, 200);
    assert.equal((await request(userA, `/api/groups/${publicSlug}/messages`)).body.messages.find((m: any) => m.id === sent.body.id).content, "Texte modifié");

    for(const emoji of GROUP_REACTIONS){
      const reaction = await request(userA, `/api/groups/${publicSlug}/messages/${sent.body.id}/reactions`, "POST", { emoji });
      assert.equal(reaction.status, 200);
      const timeline=await request(userA, `/api/groups/${publicSlug}/messages`);
      assert.equal(timeline.body.messages.find((m:any)=>m.id===sent.body.id).reactions.find((r:any)=>r.emoji===emoji).count,1);
      assert.equal((await request(userA, `/api/groups/${publicSlug}/messages/${sent.body.id}/reactions`, "POST", { emoji })).status,200);
    }
    for(const emoji of ["👍","😂","🙏","😮","😢","💎"]){
      assert.equal((await request(userA, `/api/groups/${publicSlug}/messages/${sent.body.id}/reactions`, "POST", { emoji })).status,400);
    }
    assert.equal((await request(userA, `/api/groups/${publicSlug}/messages`)).body.messages.find((m: any) => m.id === sent.body.id).reactions.length, 0);
    await db.execute(sql`INSERT INTO discussion_group_reactions (message_id,user_id,emoji) VALUES (${sent.body.id},${userA},'👍')`);
    assert.equal((await request(userA, `/api/groups/${publicSlug}/messages`)).body.messages.find((m: any) => m.id === sent.body.id).reactions.length, 0);

    await db.execute(sql`UPDATE discussion_groups SET visibility='private' WHERE id=${privateId}`);
    const preview=await request(userC,`/api/groups/${privateSlug}`);
    assert.equal(preview.status,200);
    assert.deepEqual(preview.body.members,[]);
    const pending = await request(userC, `/api/groups/${privateSlug}/join`, "POST", {});
    assert.equal(pending.status, 202);
    assert.equal(pending.body.status, "pending");
    const pendingDetail = await request(userC, `/api/groups/${privateSlug}`);
    assert.equal(pendingDetail.body.membership.status, "pending");
    assert.equal((await request(userC, `/api/groups/${privateSlug}/messages`)).status, 403);
    const simultaneous = await Promise.all([
      request(userA, `/api/groups/${publicSlug}/messages`, "POST", {content:"Message simultané A",clientNonce:randomUUID()}),
      request(userB, `/api/groups/${publicSlug}/messages`, "POST", {content:"Message simultané B",clientNonce:randomUUID()}),
    ]);
    assert.ok(simultaneous.every(result => result.status === 201));
    const concurrentHistory=(await request(userA,`/api/groups/${publicSlug}/messages`)).body.messages;
    assert.ok(concurrentHistory.some((m:any)=>m.content==="Message simultané A"&&m.senderId===userA));
    assert.ok(concurrentHistory.some((m:any)=>m.content==="Message simultané B"&&m.senderId===userB));

    await request(userA, `/api/groups/${publicSlug}/leave`, "POST", {});
    await request(userA, `/api/groups/${publicSlug}/join`, "POST", {});
    const afterRejoin = await request(userA, `/api/groups/${publicSlug}/messages`);
    assert.equal(afterRejoin.body.messages.filter((m: any) => m.type === "system" && m.content === "Membre Test A a rejoint le groupe.").length, 2);
    assert.equal((await request(userA, `/api/groups/${privateSlug}/messages`)).status, 403);
    const memberDetail=await request(userA,`/api/groups/${publicSlug}`);
    assert.equal(memberDetail.body.counts.memberCount,2);
    assert.equal(memberDetail.body.isManager,false);
    assert.deepEqual(memberDetail.body.members,[]);
    const spoofedRoster=await request(userA,`/api/groups/${publicSlug}?isManager=true&role=admin`);
    assert.deepEqual(spoofedRoster.body.members,[]);
    assert.equal((await request(userA,`/api/groups/${publicSlug}/admin/queue`)).status,403);

    // Reuse only the trusted administrator identity in this isolated HTTP harness.
    // Every administrative write below targets a newly-created synthetic group.
    const principal=(await db.execute(sql`SELECT u.id FROM users u JOIN discussion_group_security s ON s.principal_user_id=u.id
      WHERE u.role='admin' AND u.is_blocked IS NOT TRUE LIMIT 1`)).rows[0] as {id:string}|undefined;
    assert.ok(principal,"Un administrateur autorisé doit exister pour vérifier réellement les opérations de modération.");
    if(principal){
      assert.equal((await request(principal.id,`/api/groups/${privateSlug}/approvals/${userC}`,"POST",{approve:true})).status,200);
      assert.equal((await request(principal.id,`/api/groups/${privateSlug}/approvals/${userC}`,"POST",{approve:true})).status,404);
      const approvedHistory=await request(userC,`/api/groups/${privateSlug}/messages`);
      assert.equal(approvedHistory.status,200);
      assert.equal(approvedHistory.body.messages.filter((m:any)=>m.type==="system").length,1);
      const created=await request(principal.id,"/api/groups","POST",{name:`Test administration ${randomUUID().slice(0,8)}`,description:"Groupe synthétique temporaire",visibility:"public"});
      assert.equal(created.status,201);
      adminGroupId=created.body.group.id;
      const slug=created.body.group.slug;
      const invitation=await request(principal.id,`/api/groups/${slug}/invites`,"POST",{});
      assert.equal(invitation.status,201);
      const token=new URL(invitation.body.url).searchParams.get("invite");
      assert.equal((await request(userC,"/api/group-invites/redeem","POST",{token})).status,200);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members/${userC}`,"POST",{action:"promote"})).status,200);
      assert.equal((await request(userC,`/api/groups/${slug}/admin/groups`,"PATCH",{name:"Modification interdite"})).status,403);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/groups`,"PATCH",{membersCanPost:false})).status,200);
      assert.equal((await request(userA,`/api/groups/${slug}/join`,"POST",{})).status,200);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`,"POST",{content:"Interdit par les permissions"})).status,403);
      const announcement=await request(userC,`/api/groups/${slug}/admin/announcements`,"POST",{content:"Annonce synthétique"});
      assert.equal(announcement.status,201);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/groups`,"PATCH",{membersCanPost:true})).status,200);
      assert.equal((await request(userA,`/api/groups/${slug}/admin/posting`,"POST",{membersCanPost:false})).status,403);
      assert.equal((await request(userA,`/api/groups/${slug}/admin/members/${userB}`,"POST",{action:"restrict_posting"})).status,403);
      const priorMessage=await request(userA,`/api/groups/${slug}/messages`,"POST",{content:"Avant la restriction"});
      assert.equal(priorMessage.status,201);
      assert.equal((await request(userC,`/api/groups/${slug}/admin/posting`,"POST",{membersCanPost:false})).status,200);
      const managerDetail=await request(userC,`/api/groups/${slug}`);
      assert.equal(managerDetail.body.isManager,true);
      assert.ok(managerDetail.body.members.some((member:any)=>member.id===userA));
      const principalDetail=await request(principal.id,`/api/groups/${slug}`);
      assert.equal(principalDetail.body.isManager,true);
      assert.ok(principalDetail.body.members.some((member:any)=>member.id===userA));
      assert.equal((await request(userA,`/api/groups/${slug}`)).body.group.membersCanPost,false);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`,"POST",{content:"Bloqué pour tous"})).status,403);
      assert.equal((await request(userA,`/api/groups/${slug}/messages/${priorMessage.body.id}`,"PATCH",{content:"Modification bloquée"})).status,403);
      assert.equal((await request(userC,`/api/groups/${slug}/messages`,"POST",{content:"Message d’administrateur"})).status,201);
      assert.equal((await request(userC,`/api/groups/${slug}/admin/members/${userA}`,"POST",{action:"restrict_posting"})).status,200);
      assert.equal((await request(userC,`/api/groups/${slug}/admin/posting`,"POST",{membersCanPost:true})).status,200);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`)).status,200);
      assert.equal((await request(userA,`/api/groups/${slug}`)).body.membership.postingBlocked,true);
      assert.equal((await request(userC,`/api/groups/${slug}`)).body.members.find((member:any)=>member.id===userA).postingBlocked,true);
      assert.deepEqual((await request(userA,`/api/groups/${slug}`)).body.members,[]);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`,"POST",{content:"Toujours restreint"})).status,403);
      assert.equal((await request(userA,`/api/groups/${slug}/messages/${priorMessage.body.id}`,"PATCH",{content:"Modification restreinte"})).status,403);
      assert.equal((await request(userA,`/api/groups/${slug}/leave`,"POST",{})).status,200);
      assert.equal((await request(userA,`/api/groups/${slug}/join`,"POST",{})).status,200);
      assert.equal((await request(userA,`/api/groups/${slug}`)).body.membership.postingBlocked,true);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`,"POST",{content:"Toujours restreint après réadhésion"})).status,403);
      assert.equal((await request(userC,`/api/groups/${slug}/admin/members/${userA}`,"POST",{action:"allow_posting"})).status,200);
      assert.equal((await request(userC,`/api/groups/${slug}`)).body.members.find((member:any)=>member.id===userA).postingBlocked,false);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`,"POST",{content:"Envoi rétabli"})).status,201);
      assert.equal((await request(userC,`/api/groups/${slug}/admin/members/${principal.id}`,"POST",{action:"restrict_posting"})).status,403);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`,"POST",{content:"Réponse croisée interdite",replyToId:Number(sent.body.id)})).status,400);
      assert.equal((await request(userB,`/api/groups/${slug}/join`,"POST",{})).status,200);
      const toModerate=await request(userB,`/api/groups/${slug}/messages`,"POST",{content:"Message de modération synthétique"});
      assert.equal(toModerate.status,201);
      assert.equal((await request(userA,`/api/groups/${slug}/messages/${toModerate.body.id}/report`,"POST",{reason:"Signalement de test"})).status,201);
      assert.equal((await request(userC,`/api/groups/${slug}/admin/messages/${toModerate.body.id}/pin`,"POST",{pinned:true})).status,200);
      const moderationQueue=await request(userC,`/api/groups/${slug}/admin/queue`);
      assert.equal(moderationQueue.body.reports.length,1);
      assert.equal((await request(userC,`/api/groups/${slug}/admin/reports/${moderationQueue.body.reports[0].id}`,"POST",{status:"resolved"})).status,200);
      assert.equal((await request(userC,`/api/groups/${slug}/messages/${toModerate.body.id}`,"DELETE")).status,200);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`)).body.messages.find((m:any)=>m.id===toModerate.body.id).deleted,true);
      assert.equal((await request(userC,`/api/groups/${slug}/messages`)).body.messages.some((m:any)=>m.id===toModerate.body.id),false);
      const adminOwn=await request(userC,`/api/groups/${slug}/messages`,"POST",{content:"Message administrateur à supprimer"});
      assert.equal(adminOwn.status,201);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`)).body.messages.find((m:any)=>m.id===adminOwn.body.id).senderIsAdmin,true);
      assert.equal((await request(userC,`/api/groups/${slug}/messages/${adminOwn.body.id}`,"DELETE",{mode:"standard"})).status,200);
      assert.equal((await request(userC,`/api/groups/${slug}/messages`)).body.messages.some((m:any)=>m.id===adminOwn.body.id),false);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`)).body.messages.find((m:any)=>m.id===adminOwn.body.id).content,"Message supprimé");
      const adminOwnComplete=await request(userC,`/api/groups/${slug}/messages`,"POST",{content:"Message administrateur à supprimer pour tous"});
      assert.equal(adminOwnComplete.status,201);
      const quoteAdminOwn=await request(userA,`/api/groups/${slug}/messages`,"POST",{content:"Réponse au message administrateur",replyToId:Number(adminOwnComplete.body.id)});
      assert.equal(quoteAdminOwn.status,201);
      const fullRemoval=await request(userC,`/api/groups/${slug}/messages/${adminOwnComplete.body.id}`,"DELETE",{mode:"complete"});
      assert.equal(fullRemoval.status,200);
      assert.equal(fullRemoval.body.mode,"complete");
      for(const viewer of [userA,userB,userC]){
        const timeline=await request(viewer,`/api/groups/${slug}/messages?oldest=${adminOwnComplete.body.id}`);
        assert.equal(timeline.body.messages.some((m:any)=>m.id===adminOwnComplete.body.id),false);
        assert.equal(timeline.body.messages.find((m:any)=>m.id===quoteAdminOwn.body.id).replyTo,null);
        assert.deepEqual(timeline.body.deletions.find((m:any)=>m.id===adminOwnComplete.body.id),{id:adminOwnComplete.body.id,hidden:true,complete:true});
      }
      const toRemove=await request(userB,`/api/groups/${slug}/messages`,"POST",{content:"Contenu synthétique à retirer complètement"});
      assert.equal(toRemove.status,201);
      const responseToRemove=await request(userA,`/api/groups/${slug}/messages`,"POST",{content:"Réponse conservée",replyToId:Number(toRemove.body.id)});
      assert.equal(responseToRemove.status,201);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`)).body.messages.find((m:any)=>m.id===responseToRemove.body.id).replyTo.content,"Contenu synthétique à retirer complètement");
      assert.equal((await request(userA,`/api/groups/${slug}/messages/${toRemove.body.id}/reactions`,"POST",{emoji:"🔥"})).status,200);
      assert.equal((await request(userB,`/api/groups/${slug}/messages/${toRemove.body.id}`,"DELETE",{mode:"complete"})).status,403);
      assert.equal((await request(userA,`/api/groups/${slug}/messages/${toRemove.body.id}`,"DELETE",{mode:"complete",role:"admin"})).status,400);
      assert.equal((await request(userC,`/api/groups/${slug}/messages/${sent.body.id}`,"DELETE",{mode:"complete"})).status,404);
      assert.equal((await request(userC,`/api/groups/${slug}/messages/${toRemove.body.id}`,"DELETE",{mode:"complete"})).status,200);
      for(const viewer of [userA,userB,userC]){
        const timeline=await request(viewer,`/api/groups/${slug}/messages?oldest=${toModerate.body.id}`);
        assert.equal(timeline.body.messages.some((m:any)=>m.id===toRemove.body.id),false);
        assert.equal(timeline.body.messages.find((m:any)=>m.id===responseToRemove.body.id).replyTo,null);
        assert.deepEqual(timeline.body.deletions.find((m:any)=>m.id===toRemove.body.id),{id:toRemove.body.id,hidden:true,complete:true});
        assert.equal(timeline.body.deletions.find((m:any)=>m.id===toModerate.body.id).hidden,viewer===userC);
        assert.equal(timeline.body.deletions.some((m:any)=>m.id===sent.body.id),false);
      }
      const removedRows=await db.execute(sql`SELECT content,pinned_at FROM discussion_group_messages WHERE id=${toRemove.body.id}`);
      assert.equal(removedRows.rows[0].content,"");
      assert.equal(removedRows.rows[0].pinned_at,null);
      assert.equal((await db.execute(sql`SELECT 1 FROM discussion_group_reactions WHERE message_id=${toRemove.body.id}`)).rows.length,0);
      assert.equal((await request(userC,`/api/groups/${slug}/messages/${toModerate.body.id}`,"DELETE",{mode:"complete"})).status,200);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`)).body.messages.some((m:any)=>m.id===toModerate.body.id),false);
      assert.equal((await request(userC,`/api/groups/${slug}/messages?oldest=invalid`)).status,400);
      assert.equal((await request(userC,`/api/groups/${slug}/leave`,"POST",{})).status,200);
      assert.equal((await request(userC,`/api/groups/${slug}/join`,"POST",{role:"admin"})).status,200);
      assert.equal((await request(userC,`/api/groups/${slug}`)).body.membership.role,"member");
      assert.deepEqual((await request(userC,`/api/groups/${slug}`)).body.members,[]);
      const demotedMessages=(await request(userC,`/api/groups/${slug}/messages`)).body.messages.filter((m:any)=>m.senderId===userC);
      assert.ok(demotedMessages.length>0);
      assert.equal(demotedMessages.every((m:any)=>m.senderIsAdmin===false),true);
      assert.equal((await request(userC,`/api/groups/${slug}/admin/queue`)).status,403);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`)).body.messages.some((m:any)=>m.id===sent.body.id),false);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members/${userB}`,"POST",{action:"block"})).status,200);
      assert.equal((await request(userB,`/api/groups/${slug}/messages`)).status,403);
      assert.equal((await request(userB,`/api/groups/${slug}/messages`,"POST",{content:"Tentative après blocage"})).status,403);
      assert.equal((await request(userB,`/api/groups/${slug}/join`,"POST",{})).status,403);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members/${userC}`,"POST",{action:"promote"})).status,200);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members/${userC}`,"POST",{action:"remove"})).status,200);
      assert.equal((await request(userC,`/api/groups/${slug}/join`,"POST",{})).status,200);
      assert.equal((await request(userC,`/api/groups/${slug}`)).body.membership.role,"member");
      const invitationList=await request(principal.id,`/api/groups/${slug}/invites`);
      assert.equal((await request(principal.id,`/api/groups/${slug}/invites/${invitationList.body.invites[0].id}`,"DELETE")).status,200);
      assert.equal((await request(userB,"/api/group-invites/redeem","POST",{token})).status,404);
      const queue=await request(principal.id,`/api/groups/${slug}/admin/queue`);
      assert.equal(queue.status,200);
      assert.ok(queue.body.logs.length>0);
      assert.equal((await request(userA,`/api/groups/${slug}/admin/members?filter=banned`)).status,403);
      assert.equal((await request(userA,`/api/groups/${slug}/admin/members/${userB}`,"POST",{action:"unblock"})).status,403);
      assert.equal((await request(userA,`/api/groups/${slug}/admin/members/${userB}`,"POST",{action:"restore"})).status,403);
      const bannedList=await request(principal.id,`/api/groups/${slug}/admin/members?filter=banned&q=Membre%20Test%20B`);
      assert.equal(bannedList.status,200);
      assert.ok(bannedList.body.members.some((m:any)=>m.id===userB));
      assert.equal(bannedList.body.counts.banned,1);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members/${userB}`,"POST",{action:"unblock"})).status,200);
      assert.equal((await request(userB,`/api/groups/${slug}/messages`)).status,403);
      assert.equal((await request(userB,`/api/groups/${slug}/join`,"POST",{})).status,200);
      assert.equal((await request(userB,`/api/groups/${slug}`)).body.membership.role,"member");
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members/${userB}`,"POST",{action:"remove"})).status,200);
      const excludedList=await request(principal.id,`/api/groups/${slug}/admin/members?filter=excluded`);
      assert.ok(excludedList.body.members.some((m:any)=>m.id===userB&&m.excluded));
      const restored=await Promise.all([0,1].map(()=>request(principal.id,`/api/groups/${slug}/admin/members/${userB}`,"POST",{action:"restore"})));
      assert.deepEqual(restored.map(r=>r.status).sort(),[200,400]);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members?filter=excluded`)).body.members.some((m:any)=>m.id===userB),false);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members/${userB}`,"POST",{action:"block"})).status,200);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members/${userB}`,"POST",{action:"restore"})).status,200);
      assert.equal((await request(userB,`/api/groups/${slug}/messages`)).status,200);
      assert.equal((await request(userB,`/api/groups/${slug}`)).body.membership.postingBlocked,false);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members/${userA}`,"POST",{action:"restrict_posting"})).status,200);
      assert.ok((await request(principal.id,`/api/groups/${slug}/admin/members?filter=restricted`)).body.members.some((m:any)=>m.id===userA));
      await request(userA,`/api/groups/${slug}/leave`,"POST",{});
      assert.ok((await request(principal.id,`/api/groups/${slug}/admin/members?filter=restricted`)).body.members.some((m:any)=>m.id===userA));
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members/${userA}`,"POST",{action:"allow_posting"})).status,200);
      await request(userA,`/api/groups/${slug}/join`,"POST",{});
      await request(userC,`/api/groups/${slug}/leave`,"POST",{});
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members?filter=excluded`)).body.members.some((m:any)=>m.id===userC),false);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members/${userC}`,"POST",{action:"restore"})).status,400);
      await request(userC,`/api/groups/${slug}/join`,"POST",{});

      assert.equal((await request(userA,`/api/groups/${slug}/admin/moderation`,"PATCH",{enabled:true})).status,403);
      assert.equal((await request(principal.id,`/api/groups/${slug}`)).body.group.smartModerationEnabled,false);
      await request(principal.id,`/api/groups/${slug}/admin/members/${userC}`,"POST",{action:"promote"});
      assert.equal((await request(userC,`/api/groups/${slug}/admin/moderation`,"PATCH",{enabled:true})).status,200);
      assert.equal((await request(userA,`/api/groups/${slug}`)).body.group.smartModerationEnabled,true);
      const beforeRejected=(await db.execute(sql`SELECT count(*)::int AS count FROM discussion_group_messages WHERE group_id=${adminGroupId}`)).rows[0].count;
      for(const content of ["Cette plateforme est une arnaque","SCAM","Mon retrait n’est pas arrivé","Les retraits ne passe pas","Une escroquerie"]){
        const rejected=await request(userA,`/api/groups/${slug}/messages`,"POST",{content,senderIsAdmin:true,userId:userC});
        assert.equal(rejected.status,422,content);
        assert.match(rejected.body.message,/Envoi impossible/);
      }
      assert.equal((await db.execute(sql`SELECT count(*)::int AS count FROM discussion_group_messages WHERE group_id=${adminGroupId}`)).rows[0].count,beforeRejected);
      const editable=await request(userA,`/api/groups/${slug}/messages`,"POST",{content:"Comment effectuer un retrait ?"});
      assert.equal(editable.status,201);
      assert.equal((await request(userA,`/api/groups/${slug}/messages/${editable.body.id}`,"PATCH",{content:"Une arnaque"})).status,422);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`)).body.messages.find((m:any)=>m.id===editable.body.id).content,"Comment effectuer un retrait ?");
      assert.equal((await request(userC,`/api/groups/${slug}/messages`,"POST",{content:"Annonce administrateur : attention au scam"})).status,201);
      assert.equal((await request(userA,`/api/groups/${publicSlug}/messages`,"POST",{content:"Test arnaque : autre groupe sans filtre"})).status,201);
      assert.equal((await request(userC,`/api/groups/${slug}/admin/moderation`,"PATCH",{enabled:false})).status,200);
      assert.equal((await request(userA,`/api/groups/${slug}/messages`,"POST",{content:"Test scam après désactivation"})).status,201);
      await request(principal.id,`/api/groups/${slug}/admin/members/${userC}`,"POST",{action:"demote"});
      assert.equal((await request(userC,`/api/groups/${slug}/admin/moderation`,"PATCH",{enabled:true})).status,403);

      const beforePages=(await request(principal.id,`/api/groups/${slug}/admin/members`)).body.total;
      for(let index=0;index<42;index++)extraUserIds.push(randomUUID());
      await db.insert(users).values(extraUserIds.map((id,index)=>({id,email:`${id}@example.test`,fullName:`Index Test ${String(index).padStart(2,"0")}`})));
      await db.execute(sql`INSERT INTO discussion_group_members(group_id,user_id) VALUES ${sql.join(extraUserIds.map(id=>sql`(${adminGroupId},${id})`),sql`,`)}`);
      const pageOne=await request(principal.id,`/api/groups/${slug}/admin/members?filter=active`);
      assert.equal(pageOne.body.total,beforePages+42);
      assert.equal(pageOne.body.members.length,40);
      assert.equal(pageOne.body.hasMore,true);
      const pageTwo=await request(principal.id,`/api/groups/${slug}/admin/members?filter=active&offset=40`);
      assert.ok(pageTwo.body.members.some((m:any)=>m.id===extraUserIds[41]));
      const searched=await request(principal.id,`/api/groups/${slug}/admin/members?filter=active&q=Index%20Test%2041`);
      assert.equal(searched.body.total,1);
      assert.equal(searched.body.members[0].id,extraUserIds[41]);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members?filter=bogus`)).status,400);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/members?offset=-1`)).status,400);
      assert.equal((await request(principal.id,`/api/groups/${privateSlug}/admin/members?filter=active&q=Index%20Test`)).body.total,0);
      assert.deepEqual((await request(userA,`/api/groups/${slug}`)).body.members,[]);
      assert.equal((await request(principal.id,`/api/groups/${slug}/admin/archive`,"POST",{confirm:true})).status,200);
    }
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if(adminGroupId){
      await db.execute(sql`DELETE FROM discussion_group_audit WHERE group_id=${adminGroupId}`);
      await db.execute(sql`DELETE FROM discussion_groups WHERE id=${adminGroupId}`);
    }
    await db.execute(sql`DELETE FROM discussion_groups WHERE id IN (${publicId},${privateId})`);
    await db.delete(users).where(sql`id IN (${userA},${userB},${userC})`);
    if(extraUserIds.length)await db.delete(users).where(sql`id IN (${sql.join(extraUserIds.map(id=>sql`${id}`),sql`,`)})`);
    await pool.end();
  }
});
