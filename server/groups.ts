import type { Express, Request, Response, NextFunction } from "express";
import { createHash, randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { storage } from "./storage";
import { groupRequestSecurity, isSafeGroupPhoto } from "./group-security";
import { isGroupReaction } from "@shared/group-reactions";
import { isDisallowedGroupContent } from "./group-content-moderation";
import { listModerationMembers, liftMembershipRestriction } from "./group-moderation";

const PRINCIPAL_EMAIL = "sikatexte@gmail.com";
const SYSTEM_GROUP_SLUG = "sika-texte-groupe-officiel";

const messageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  replyToId: z.number().int().positive().optional(),
  clientNonce: z.string().uuid().optional(),
});
const groupSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().min(1).max(2000),
  photoUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.string().trim().max(80).optional(),
  visibility: z.enum(["public", "private", "invite"]),
  rules: z.string().trim().max(4000).optional(),
  approvalRequired: z.boolean().default(false),
  membersCanPost: z.boolean().default(true),
});

const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });
const currentUserId = (req: Request) => (req as any).session?.userId as string | undefined;
const wrap = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch((err: any) => {
      if (res.headersSent) return next(err);
      if (err?.status) return res.status(err.status).json({ message: err.message });
      console.error("[GROUPS]", err?.message || err);
      return res.status(500).json({ message: "Une erreur est survenue dans les groupes." });
    });
  };

const resultRows = (result: any) => (result?.rows || []) as any[];
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function ensureGroupsSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS discussion_groups (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
      slug varchar NOT NULL UNIQUE,
      name varchar NOT NULL,
      photo_url text,
      description text NOT NULL DEFAULT '',
      category varchar NOT NULL DEFAULT 'Général',
      visibility varchar NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private','invite')),
      rules text NOT NULL DEFAULT '',
      approval_required boolean NOT NULL DEFAULT false,
      created_by varchar REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      archived_at timestamptz
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS discussion_group_members (
      group_id varchar NOT NULL REFERENCES discussion_groups(id) ON DELETE CASCADE,
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role varchar NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
      status varchar NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','left','banned')),
      joined_at timestamptz NOT NULL DEFAULT now(),
      last_read_at timestamptz NOT NULL DEFAULT now(),
      muted boolean NOT NULL DEFAULT false,
      PRIMARY KEY (group_id,user_id)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS discussion_group_messages (
      id bigserial PRIMARY KEY,
      group_id varchar NOT NULL REFERENCES discussion_groups(id) ON DELETE CASCADE,
      user_id varchar REFERENCES users(id) ON DELETE SET NULL,
      sender_label varchar,
      content text NOT NULL,
      message_type varchar NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','system')),
      reply_to_id bigint REFERENCES discussion_group_messages(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      edited_at timestamptz,
      deleted_at timestamptz,
      pinned_at timestamptz
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS discussion_messages_group_cursor ON discussion_group_messages(group_id,id DESC)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS discussion_members_user_status ON discussion_group_members(user_id,status)`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS discussion_group_reactions (
      message_id bigint NOT NULL REFERENCES discussion_group_messages(id) ON DELETE CASCADE,
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji varchar NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (message_id,user_id,emoji)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS discussion_group_reports (
      id bigserial PRIMARY KEY,
      group_id varchar NOT NULL REFERENCES discussion_groups(id) ON DELETE CASCADE,
      message_id bigint NOT NULL REFERENCES discussion_group_messages(id) ON DELETE CASCADE,
      reporter_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason varchar NOT NULL,
      status varchar NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (message_id,reporter_id)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS discussion_group_invites (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
      group_id varchar NOT NULL REFERENCES discussion_groups(id) ON DELETE CASCADE,
      token_hash varchar NOT NULL UNIQUE,
      created_by varchar REFERENCES users(id) ON DELETE SET NULL,
      max_uses integer NOT NULL DEFAULT 50,
      uses_count integer NOT NULL DEFAULT 0,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS discussion_group_audit (
      id bigserial PRIMARY KEY,
      group_id varchar REFERENCES discussion_groups(id) ON DELETE SET NULL,
      actor_id varchar REFERENCES users(id) ON DELETE SET NULL,
      action varchar NOT NULL,
      target_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
      message_id bigint,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`ALTER TABLE discussion_groups ADD COLUMN IF NOT EXISTS members_can_post boolean NOT NULL DEFAULT true`);
  await db.execute(sql`ALTER TABLE discussion_groups ADD COLUMN IF NOT EXISTS smart_moderation_enabled boolean NOT NULL DEFAULT false`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS discussion_audit_member_actions ON discussion_group_audit(group_id,target_user_id,created_at DESC,id DESC)`);
  await db.execute(sql`ALTER TABLE discussion_group_members ADD COLUMN IF NOT EXISTS posting_blocked boolean NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE discussion_group_messages ADD COLUMN IF NOT EXISTS client_nonce varchar`);
  await db.execute(sql`ALTER TABLE discussion_group_messages ADD COLUMN IF NOT EXISTS removed_at timestamptz`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS discussion_message_nonce_unique
    ON discussion_group_messages (user_id,client_nonce) WHERE client_nonce IS NOT NULL`);
  // Resolve the approved account once. Later profile/name/email changes cannot grant ownership.
  await db.execute(sql`CREATE TABLE IF NOT EXISTS discussion_group_security (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    principal_user_id varchar REFERENCES users(id) ON DELETE SET NULL
  )`);
  await db.execute(sql`INSERT INTO discussion_group_security (singleton,principal_user_id)
    SELECT true,id FROM users WHERE lower(email)=${PRINCIPAL_EMAIL} AND role='admin'
      AND is_blocked IS NOT TRUE LIMIT 1 ON CONFLICT (singleton) DO NOTHING`);
  const adminResult = await db.execute(sql`
    SELECT u.id FROM users u JOIN discussion_group_security s ON s.principal_user_id=u.id
    WHERE u.role='admin' AND u.is_blocked IS NOT TRUE LIMIT 1
  `);
  const adminId = resultRows(adminResult)[0]?.id || null;
  await db.execute(sql`
    INSERT INTO discussion_groups (slug,name,description,category,visibility,rules,approval_required,created_by)
    VALUES (${SYSTEM_GROUP_SLUG},'Sika Texte — Groupe officiel',
      'Espace officiel de discussion des membres de Sika Texte. Respectez les autres participants et les règles de la communauté.',
      'Officiel','public', 'Respect, entraide et échanges liés à la communauté Sika Texte. Pas de spam, menaces, harcèlement ni divulgation de données personnelles.',
      false, ${adminId})
    ON CONFLICT (slug) DO NOTHING
  `);
  const groupId = resultRows(await db.execute(sql`SELECT id FROM discussion_groups WHERE slug=${SYSTEM_GROUP_SLUG} LIMIT 1`))[0]?.id;
  if (groupId && adminId) {
    await db.execute(sql`
      INSERT INTO discussion_group_members (group_id,user_id,role,status)
      VALUES (${groupId},${adminId},'owner','active')
      ON CONFLICT (group_id,user_id) DO UPDATE SET role='owner',status='active'
    `);
  }
}

async function getGroup(slug: string) {
  const rows = resultRows(await db.execute(sql`
    SELECT id,slug,name,photo_url AS "photoUrl",description,category,visibility,rules,
      approval_required AS "approvalRequired",members_can_post AS "membersCanPost",
      smart_moderation_enabled AS "smartModerationEnabled",
      created_at AS "createdAt",archived_at AS "archivedAt"
    FROM discussion_groups WHERE slug=${slug} AND archived_at IS NULL LIMIT 1
  `));
  return rows[0];
}

async function isPrincipalAdmin(userId: string) {
  return resultRows(await db.execute(sql`
    SELECT u.id FROM users u JOIN discussion_group_security s ON s.principal_user_id=u.id
    WHERE u.id=${userId} AND u.role='admin' AND u.is_blocked IS NOT TRUE LIMIT 1
  `)).length > 0;
}

async function canManageGroup(userId: string, groupId: string) {
  if (await isPrincipalAdmin(userId)) return true;
  return resultRows(await db.execute(sql`
    SELECT 1 FROM discussion_group_members
    WHERE group_id=${groupId} AND user_id=${userId} AND role IN ('owner','admin') AND status='active'
  `)).length > 0;
}

async function requireMembership(userId: string, groupId: string) {
  const rows = resultRows(await db.execute(sql`
    SELECT status,role,posting_blocked AS "postingBlocked" FROM discussion_group_members WHERE group_id=${groupId} AND user_id=${userId} LIMIT 1
  `));
  if (rows[0]?.status === "banned") throw httpError(403, "Votre accès à ce groupe est bloqué.");
  if (rows[0]?.status !== "active") throw httpError(403, "Rejoignez le groupe pour participer à la discussion.");
  return rows[0];
}

async function requirePostingAccess(userId: string, group: any) {
  const membership = await requireMembership(userId, group.id);
  if (await canManageGroup(userId, group.id)) return;
  if (membership.postingBlocked) throw httpError(403, "Un administrateur a bloqué votre envoi de messages dans ce groupe. Vous pouvez toujours lire les discussions.");
  if (!group.membersCanPost) throw httpError(403, "L’envoi de messages est réservé aux administrateurs dans ce groupe.");
}

async function requireAllowedGroupContent(userId:string,group:any,content:string) {
  if(group.smartModerationEnabled&&isDisallowedGroupContent(content)&&!await canManageGroup(userId,group.id))
    throw httpError(422,"Envoi impossible. Ce message contient des mots ou expressions non autorisés dans ce groupe.");
}

async function audit(groupId: string, actorId: string, action: string, targetUserId?: string, messageId?: string, details: any = {}) {
  await db.execute(sql`
    INSERT INTO discussion_group_audit (group_id,actor_id,action,target_user_id,message_id,details)
    VALUES (${groupId},${actorId},${action},${targetUserId || null},${messageId || null},${JSON.stringify(details)}::jsonb)
  `);
}

function publicMessage(row: any) {
  return {
    id: String(row.id), groupId: row.group_id, content: row.deleted_at ? "Message supprimé" : row.content,
    type: row.message_type, senderId: row.user_id, senderName: row.sender_label || row.full_name || "Membre Sika",
    senderIsAdmin: !!row.sender_is_admin,
    photoUrl: row.profile_image_url || null, createdAt: row.created_at, editedAt: row.edited_at,
    deleted: !!row.deleted_at, pinned: !!row.pinned_at,
    replyTo: !row.deleted_at && row.visible_reply_id ? { id: String(row.visible_reply_id), content: row.reply_content, senderName: row.reply_sender || "Membre" } : null,
    reactions: (row.reactions || []).filter((reaction: {emoji:string})=>isGroupReaction(reaction.emoji)),
  };
}

export function registerGroupRoutes(app: Express, requireAuth: any) {
  app.use(["/api/groups", "/api/group-invites"], groupRequestSecurity);
  app.get("/api/groups", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const principal = await isPrincipalAdmin(userId);
    const rows = resultRows(await db.execute(sql`
      SELECT g.id,g.slug,g.name,g.photo_url AS "photoUrl",g.description,g.category,g.visibility,
        g.approval_required AS "approvalRequired",g.created_at AS "createdAt",
        count(DISTINCT m.user_id)::int AS "memberCount",
        count(DISTINCT m.user_id) FILTER (WHERE u.last_seen > now() - interval '5 minutes')::int AS "onlineCount",
        coalesce(own.status,'none') AS "membershipStatus",coalesce(own.muted,false) AS muted,
        CASE WHEN own.status='active' THEN (SELECT count(*)::int FROM discussion_group_messages unread
          WHERE unread.group_id=g.id AND unread.message_type='text' AND unread.deleted_at IS NULL
            AND unread.user_id <> ${userId} AND unread.created_at > coalesce(own.last_read_at, 'epoch'::timestamptz)) ELSE 0 END AS "unreadCount"
      FROM discussion_groups g
      LEFT JOIN discussion_group_members m ON m.group_id=g.id AND m.status='active'
      LEFT JOIN users u ON u.id=m.user_id
      LEFT JOIN discussion_group_members own ON own.group_id=g.id AND own.user_id=${userId}
      WHERE g.archived_at IS NULL AND (g.visibility IN ('public','private') OR own.status IN ('active','pending') OR ${principal})
      GROUP BY g.id,own.status,own.muted,own.last_read_at ORDER BY g.created_at ASC
    `));
    res.setHeader("Cache-Control", "no-store");
    res.json({ groups: rows, isPrincipalAdmin: principal });
  }));

  app.get("/api/groups/stats", requireAuth, wrap(async (req,res)=>{
    if(!await isPrincipalAdmin(currentUserId(req)!)) throw httpError(403,"Accès réservé à l’administrateur principal.");
    const stats=resultRows(await db.execute(sql`SELECT
      (SELECT count(*)::int FROM discussion_groups WHERE archived_at IS NULL) AS "groupCount",
      (SELECT count(DISTINCT user_id)::int FROM discussion_group_members WHERE status='active') AS "memberCount",
      (SELECT count(*)::int FROM discussion_group_messages WHERE message_type='text' AND deleted_at IS NULL) AS "messageCount",
      (SELECT count(DISTINCT user_id)::int FROM discussion_group_members WHERE status='active' AND joined_at > now()-interval '7 days') AS "newMembers7d",
      (SELECT count(DISTINCT user_id)::int FROM discussion_group_members WHERE status='active' AND user_id IN
        (SELECT id FROM users WHERE last_seen > now()-interval '5 minutes')) AS "onlineCount"`))[0];
    res.json(stats);
  }));

  app.post("/api/groups", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    if (!await isPrincipalAdmin(userId)) throw httpError(403, "Seul l’administrateur principal peut créer un groupe.");
    const parsed = groupSchema.safeParse(req.body);
    if (!parsed.success) throw httpError(400, parsed.error.issues[0]?.message || "Informations du groupe invalides.");
    const input = parsed.data;
    if (input.photoUrl && !isSafeGroupPhoto(input.photoUrl)) throw httpError(400, "La photo doit utiliser une adresse HTTPS publique, sans identifiants.");
    const slug = `${input.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55)}-${randomBytes(3).toString("hex")}`;
    const inserted = resultRows(await db.execute(sql`
      INSERT INTO discussion_groups (slug,name,photo_url,description,category,visibility,rules,approval_required,members_can_post,created_by)
      VALUES (${slug},${input.name},${input.photoUrl || null},${input.description},${input.category || "Général"},
        ${input.visibility},${input.rules || ""},${input.approvalRequired || input.visibility !== "public"},${input.membersCanPost},${userId})
      RETURNING id,slug,name,photo_url AS "photoUrl",description,category,visibility,created_at AS "createdAt"
    `))[0];
    await db.execute(sql`INSERT INTO discussion_group_members (group_id,user_id,role) VALUES (${inserted.id},${userId},'owner')`);
    await audit(inserted.id, userId, "group.created");
    res.status(201).json({ group: inserted });
  }));

  app.get("/api/groups/:slug", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const group = await getGroup(String(req.params.slug));
    if (!group) throw httpError(404, "Groupe introuvable.");
    const member = resultRows(await db.execute(sql`
      SELECT status,role,muted,posting_blocked AS "postingBlocked",last_read_at AS "lastReadAt" FROM discussion_group_members WHERE group_id=${group.id} AND user_id=${userId}
    `))[0];
    const principal = await isPrincipalAdmin(userId);
    if (group.visibility === "invite" && !["active","pending"].includes(member?.status) && !principal) throw httpError(404, "Groupe introuvable.");
    const manager = principal || await canManageGroup(userId, group.id);
    const counts = resultRows(await db.execute(sql`
      SELECT count(*) FILTER (WHERE status='active')::int AS "memberCount",
        count(*) FILTER (WHERE status='active' AND u.last_seen > now() - interval '5 minutes')::int AS "onlineCount"
      FROM discussion_group_members m LEFT JOIN users u ON u.id=m.user_id WHERE m.group_id=${group.id}
    `))[0];
    const members = manager ? resultRows(await db.execute(sql`
      SELECT u.id,CASE WHEN u.id=(SELECT principal_user_id FROM discussion_group_security) THEN 'Yvan SPQ SIKA'
        ELSE coalesce(nullif(u.full_name,''),concat_ws(' ',u.first_name,u.last_name),'Membre Sika') END AS "fullName",
        u.profile_image_url AS "photoUrl",m.role,m.posting_blocked AS "postingBlocked",m.joined_at AS "joinedAt",
        (u.last_seen > now() - interval '5 minutes') AS online
      FROM discussion_group_members m JOIN users u ON u.id=m.user_id
      WHERE m.group_id=${group.id} AND m.status='active'
      ORDER BY (m.role IN ('owner','admin')) DESC,m.joined_at DESC
    `)) : [];
    const pendingCount = manager
      ? resultRows(await db.execute(sql`SELECT count(*)::int AS count FROM discussion_group_members WHERE group_id=${group.id} AND status='pending'`))[0]?.count || 0
      : 0;
    res.setHeader("Cache-Control", "no-store");
    res.json({ group, counts, members, membership: member || { status: "none" }, isManager: manager, isPrincipalAdmin: principal, pendingCount });
  }));

  app.post("/api/groups/:slug/join", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const group = await getGroup(String(req.params.slug));
    if (!group) throw httpError(404, "Groupe introuvable.");
    const inviteToken = typeof req.body?.inviteToken === "string" ? req.body.inviteToken : "";
    let invite: any;
    if (inviteToken) {
      invite = resultRows(await db.execute(sql`
        SELECT id FROM discussion_group_invites WHERE group_id=${group.id} AND token_hash=${sha256(inviteToken)}
          AND revoked_at IS NULL AND expires_at > now() AND uses_count < max_uses LIMIT 1
      `))[0];
      if (!invite) throw httpError(400, "Ce lien d’invitation est invalide ou expiré.");
    } else if (group.visibility === "invite" && !await isPrincipalAdmin(userId)) {
      throw httpError(403, "Ce groupe nécessite une invitation.");
    }
    const before = resultRows(await db.execute(sql`SELECT status FROM discussion_group_members WHERE group_id=${group.id} AND user_id=${userId}`))[0]?.status;
    if (before === "active") return res.json({ status: "active", alreadyMember: true });
    if (before === "banned") throw httpError(403, "Votre accès à ce groupe est bloqué.");
    if (before === "pending" && !invite) return res.status(202).json({status:"pending",alreadyRequested:true});
    const pending = (group.approvalRequired || group.visibility==="private") && !invite && !await isPrincipalAdmin(userId);
    const memberStatus = pending ? "pending" : "active";
    const user = await storage.getUser(userId);
    const memberName = [user?.fullName, [user?.firstName, user?.lastName].filter(Boolean).join(" ")].find(Boolean) || "Un membre Sika";
    await db.transaction(async tx => {
      const saved = resultRows(await tx.execute(sql`
        INSERT INTO discussion_group_members (group_id,user_id,role,status,joined_at,last_read_at)
        VALUES (${group.id},${userId},'member',${memberStatus},now(),now())
        ON CONFLICT (group_id,user_id) DO UPDATE SET status=${memberStatus},role='member',joined_at=now(),last_read_at=now()
        WHERE discussion_group_members.status IN ('left','pending')
        RETURNING status
      `))[0];
      if (!saved) throw httpError(409, "Votre demande d’adhésion est déjà en attente.");
      if (invite) {
        const accepted=resultRows(await tx.execute(sql`UPDATE discussion_group_invites SET uses_count=uses_count+1
          WHERE id=${invite.id} AND revoked_at IS NULL AND expires_at>now() AND uses_count<max_uses RETURNING id`))[0];
        if(!accepted) throw httpError(400,"Ce lien d’invitation est expiré ou épuisé.");
      }
      if (!pending) {
        const eventContent = `${memberName} a rejoint le groupe.`;
        await tx.execute(sql`
        INSERT INTO discussion_group_messages (group_id,sender_label,content,message_type)
        VALUES (${group.id},${memberName},${eventContent},'system')
        `);
      }
    });
    res.status(pending ? 202 : 200).json({ status: memberStatus, message: pending ? "Votre demande a été envoyée à l’administration." : "Vous avez rejoint le groupe." });
  }));

  app.post("/api/group-invites/redeem", requireAuth, wrap(async (req,res)=>{
    const userId=currentUserId(req)!;
    const token=z.string().min(32).max(100).safeParse(req.body?.token);
    if(!token.success) throw httpError(400,"Invitation invalide.");
    const invite=resultRows(await db.execute(sql`SELECT i.id,i.group_id,g.slug,g.name FROM discussion_group_invites i
      JOIN discussion_groups g ON g.id=i.group_id
      WHERE i.token_hash=${sha256(token.data)} AND i.revoked_at IS NULL AND i.expires_at>now()
        AND i.uses_count<i.max_uses AND g.archived_at IS NULL LIMIT 1`))[0];
    if(!invite) throw httpError(404,"Ce lien d’invitation est invalide ou expiré.");
    const previous=resultRows(await db.execute(sql`SELECT status FROM discussion_group_members WHERE group_id=${invite.group_id} AND user_id=${userId}`))[0]?.status;
    if(previous==="banned") throw httpError(403,"Votre accès à ce groupe est bloqué.");
    if(previous==="active") return res.json({slug:invite.slug,status:"active",alreadyMember:true});
    const user=await storage.getUser(userId);
    const name=user?.fullName||[user?.firstName,user?.lastName].filter(Boolean).join(" ")||"Un membre Sika";
    await db.transaction(async tx=>{
      const saved=resultRows(await tx.execute(sql`INSERT INTO discussion_group_members (group_id,user_id,role,status,joined_at,last_read_at)
        VALUES (${invite.group_id},${userId},'member','active',now(),now())
        ON CONFLICT (group_id,user_id) DO UPDATE SET status='active',role='member',joined_at=now(),last_read_at=now()
        WHERE discussion_group_members.status IN ('left','pending') RETURNING user_id`))[0];
      if(!saved) throw httpError(409,"Votre demande d’adhésion est déjà en cours.");
      const used=resultRows(await tx.execute(sql`UPDATE discussion_group_invites SET uses_count=uses_count+1
        WHERE id=${invite.id} AND uses_count<max_uses AND revoked_at IS NULL AND expires_at>now() RETURNING id`))[0];
      if(!used) throw httpError(409,"Cette invitation vient d’expirer ou a atteint sa limite.");
      const eventContent = `${name} a rejoint le groupe.`;
      await tx.execute(sql`INSERT INTO discussion_group_messages (group_id,sender_label,content,message_type)
        VALUES (${invite.group_id},${name},${eventContent},'system')`);
    });
    res.json({slug:invite.slug,status:"active"});
  }));

  app.post("/api/groups/:slug/leave", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const group = await getGroup(String(req.params.slug));
    if (!group) throw httpError(404, "Groupe introuvable.");
    const membership = await requireMembership(userId, group.id);
    if (membership.role === "owner" || await isPrincipalAdmin(userId)) throw httpError(400, "L’administrateur principal ne peut pas quitter le groupe officiel.");
    const user = await storage.getUser(userId);
    const name = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Un membre Sika";
    await db.transaction(async tx => {
      const changed = resultRows(await tx.execute(sql`UPDATE discussion_group_members SET status='left',role='member'
        WHERE group_id=${group.id} AND user_id=${userId} AND status='active' RETURNING user_id`))[0];
      if (!changed) throw httpError(409, "Vous avez déjà quitté ce groupe.");
      const eventContent = `${name} a quitté le groupe.`;
      await tx.execute(sql`INSERT INTO discussion_group_messages (group_id,sender_label,content,message_type) VALUES (${group.id},${name},${eventContent},'system')`);
    });
    res.json({ success: true });
  }));

  app.get("/api/groups/:slug/messages", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const group = await getGroup(String(req.params.slug));
    if (!group) throw httpError(404, "Groupe introuvable.");
    await requireMembership(userId, group.id);
    const manager = await canManageGroup(userId, group.id);
    const before = z.coerce.number().int().positive().optional().safeParse(req.query.before);
    if (!before.success) throw httpError(400, "Curseur de pagination invalide.");
    const search = z.string().trim().max(120).optional().safeParse(req.query.q);
    if (!search.success) throw httpError(400, "Recherche trop longue.");
    const oldest = z.coerce.number().int().positive().optional().safeParse(req.query.oldest);
    if (!oldest.success) throw httpError(400, "Curseur de synchronisation invalide.");
    const rows = resultRows(await db.execute(sql`
      SELECT m.id,m.group_id,m.user_id,m.sender_label,m.content,m.message_type,m.reply_to_id,m.created_at,m.edited_at,m.deleted_at,m.pinned_at,
        u.full_name,u.profile_image_url,
        (u.is_blocked IS NOT TRUE AND (
          EXISTS (SELECT 1 FROM discussion_group_members sender_membership
            WHERE sender_membership.group_id=m.group_id AND sender_membership.user_id=m.user_id
              AND sender_membership.status='active' AND sender_membership.role IN ('owner','admin'))
          OR (u.role='admin' AND EXISTS (SELECT 1 FROM discussion_group_security security
            WHERE security.principal_user_id=m.user_id))
        )) AS sender_is_admin,
        reply.id AS visible_reply_id,
        CASE WHEN reply.deleted_at IS NOT NULL THEN 'Message supprimé' ELSE reply.content END AS reply_content,
        reply_user.full_name AS reply_sender,
        coalesce((SELECT jsonb_agg(jsonb_build_object('emoji',r.emoji,'count',r.total,'reacted',r.reacted))
          FROM (SELECT emoji,count(*)::int AS total,bool_or(user_id=${userId}) AS reacted
                FROM discussion_group_reactions WHERE message_id=m.id GROUP BY emoji) r),'[]'::jsonb) AS reactions
      FROM discussion_group_messages m
      LEFT JOIN users u ON u.id=m.user_id
      LEFT JOIN discussion_group_messages reply ON reply.id=m.reply_to_id AND reply.group_id=m.group_id AND reply.removed_at IS NULL
      LEFT JOIN users reply_user ON reply_user.id=reply.user_id
      WHERE m.group_id=${group.id} AND (${before.data || null}::bigint IS NULL OR m.id < ${before.data || null}::bigint)
        AND m.removed_at IS NULL AND (m.deleted_at IS NULL OR NOT ${manager})
        AND (${search.data || null}::text IS NULL OR m.content ILIKE ('%' || ${search.data || null}::text || '%'))
      ORDER BY m.id DESC LIMIT 50
    `));
    const deletions = oldest.data ? resultRows(await db.execute(sql`
      SELECT id::text AS id, (${manager} OR removed_at IS NOT NULL) AS hidden,
        (removed_at IS NOT NULL) AS complete
      FROM discussion_group_messages
      WHERE group_id=${group.id} AND id>=${oldest.data} AND deleted_at IS NOT NULL
    `)) : [];
    await db.execute(sql`UPDATE discussion_group_members SET last_read_at=now() WHERE group_id=${group.id} AND user_id=${userId}`);
    res.setHeader("Cache-Control", "no-store");
    res.json({ messages: rows.reverse().map(publicMessage), hasMore: rows.length === 50, deletions });
  }));

  app.post("/api/groups/:slug/messages", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) throw httpError(400, parsed.error.issues[0]?.message || "Message invalide.");
    const group = await getGroup(String(req.params.slug));
    if (!group) throw httpError(404, "Groupe introuvable.");
    await requirePostingAccess(userId, group);
    await requireAllowedGroupContent(userId,group,parsed.data.content);
    const recent=resultRows(await db.execute(sql`SELECT count(*)::int AS count FROM discussion_group_messages
      WHERE user_id=${userId} AND created_at>now()-interval '1 minute' AND message_type='text'`))[0]?.count||0;
    if(recent>=30) throw httpError(429,"Vous envoyez trop de messages. Patientez une minute.");
    if (parsed.data.replyToId) {
      const parent = resultRows(await db.execute(sql`SELECT id FROM discussion_group_messages WHERE id=${parsed.data.replyToId} AND group_id=${group.id} AND deleted_at IS NULL`))[0];
      if (!parent) throw httpError(400, "Le message auquel vous répondez n’existe plus.");
    }
    const inserted = resultRows(await db.execute(sql`
      INSERT INTO discussion_group_messages (group_id,user_id,content,reply_to_id,client_nonce)
      VALUES (${group.id},${userId},${parsed.data.content},${parsed.data.replyToId || null},${parsed.data.clientNonce||null})
      ON CONFLICT (user_id,client_nonce) WHERE client_nonce IS NOT NULL DO NOTHING
      RETURNING id
    `))[0];
    const saved=inserted||resultRows(await db.execute(sql`SELECT id FROM discussion_group_messages
      WHERE group_id=${group.id} AND user_id=${userId} AND client_nonce=${parsed.data.clientNonce||null}`))[0];
    if(!saved) throw httpError(409,"Ce message ne peut pas être renvoyé dans un autre groupe.");
    res.status(201).json({ id: String(saved.id) });
  }));

  app.patch("/api/groups/:slug/messages/:id", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const content = z.string().trim().min(1).max(4000).safeParse(req.body?.content);
    if (!content.success) throw httpError(400, "Le texte du message doit contenir entre 1 et 4 000 caractères.");
    const group = await getGroup(String(req.params.slug));
    if (!group) throw httpError(404, "Groupe introuvable.");
    await requirePostingAccess(userId, group);
    await requireAllowedGroupContent(userId,group,content.data);
    const result = await db.execute(sql`
      UPDATE discussion_group_messages SET content=${content.data},edited_at=now()
      WHERE id=${req.params.id} AND group_id=${group.id} AND user_id=${userId} AND message_type='text' AND deleted_at IS NULL
      RETURNING id
    `);
    if (!resultRows(result).length) throw httpError(404, "Message introuvable ou modification non autorisée.");
    res.json({ success: true });
  }));

  app.delete("/api/groups/:slug/messages/:id", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const group = await getGroup(String(req.params.slug));
    if (!group) throw httpError(404, "Groupe introuvable.");
    await requireMembership(userId, group.id);
    const manager = await canManageGroup(userId, group.id);
    const parsed = z.object({ mode: z.enum(["standard", "complete"]).default("standard") }).strict().safeParse(req.body || {});
    if (!parsed.success) throw httpError(400, "Mode de suppression invalide.");
    const complete = parsed.data.mode === "complete";
    if (complete && !manager) throw httpError(403, "La suppression complète est réservée aux administrateurs du groupe.");
    await db.transaction(async tx => {
      const result = await tx.execute(sql`
        UPDATE discussion_group_messages SET deleted_at=coalesce(deleted_at,now()),content='',pinned_at=NULL,
          removed_at=CASE WHEN ${complete} THEN now() ELSE removed_at END
        WHERE id=${req.params.id} AND group_id=${group.id} AND removed_at IS NULL
          AND (deleted_at IS NULL OR ${complete})
          AND (user_id=${userId} OR ${manager}) RETURNING id
      `);
      if (!resultRows(result).length) throw httpError(404, "Message introuvable ou suppression non autorisée.");
      await tx.execute(sql`DELETE FROM discussion_group_reactions WHERE message_id=${req.params.id}`);
      if (manager) await tx.execute(sql`
        INSERT INTO discussion_group_audit (group_id,actor_id,action,message_id,details)
        VALUES (${group.id},${userId},${complete ? "message.removed" : "message.deleted"},${req.params.id},'{}'::jsonb)
      `);
    });
    res.json({ success: true, mode: parsed.data.mode });
  }));

  app.post("/api/groups/:slug/messages/:id/reactions", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const emoji = z.string().min(1).max(16).safeParse(req.body?.emoji);
    if (!emoji.success || !isGroupReaction(emoji.data)) throw httpError(400, "Réaction invalide.");
    const group = await getGroup(String(req.params.slug));
    if (!group) throw httpError(404, "Groupe introuvable.");
    await requireMembership(userId, group.id);
    const message = resultRows(await db.execute(sql`SELECT id FROM discussion_group_messages WHERE id=${req.params.id} AND group_id=${group.id} AND deleted_at IS NULL`))[0];
    if (!message) throw httpError(404, "Message introuvable.");
    const removed=resultRows(await db.execute(sql`DELETE FROM discussion_group_reactions
      WHERE message_id=${req.params.id} AND user_id=${userId} AND emoji=${emoji.data} RETURNING message_id`)).length>0;
    if(!removed) await db.execute(sql`INSERT INTO discussion_group_reactions (message_id,user_id,emoji)
      VALUES (${req.params.id},${userId},${emoji.data}) ON CONFLICT DO NOTHING`);
    res.json({ success: true });
  }));

  app.post("/api/groups/:slug/messages/:id/report", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const reason = z.string().trim().min(5).max(500).safeParse(req.body?.reason);
    if (!reason.success) throw httpError(400, "Précisez brièvement le motif du signalement.");
    const group = await getGroup(String(req.params.slug));
    if (!group) throw httpError(404, "Groupe introuvable.");
    await requireMembership(userId, group.id);
    const result = await db.execute(sql`INSERT INTO discussion_group_reports (group_id,message_id,reporter_id,reason)
      SELECT ${group.id},m.id,${userId},${reason.data} FROM discussion_group_messages m
      WHERE m.id=${req.params.id} AND m.group_id=${group.id} AND m.deleted_at IS NULL ON CONFLICT DO NOTHING RETURNING id`);
    if (!resultRows(result).length) throw httpError(409, "Ce message a déjà été signalé ou n’existe pas.");
    res.status(201).json({ success: true });
  }));

  app.patch("/api/groups/:slug/preferences", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const muted = z.boolean().safeParse(req.body?.muted);
    if (!muted.success) throw httpError(400, "Préférence invalide.");
    const group = await getGroup(String(req.params.slug));
    if (!group) throw httpError(404, "Groupe introuvable.");
    await requireMembership(userId, group.id);
    await db.execute(sql`UPDATE discussion_group_members SET muted=${muted.data} WHERE group_id=${group.id} AND user_id=${userId}`);
    res.json({ muted: muted.data });
  }));

  app.post("/api/groups/:slug/invites", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const group = await getGroup(String(req.params.slug));
    if (!group) throw httpError(404, "Groupe introuvable.");
    if (!await canManageGroup(userId, group.id)) throw httpError(403, "Seuls les administrateurs du groupe peuvent inviter.");
    const activeInvites=resultRows(await db.execute(sql`SELECT count(*)::int AS count FROM discussion_group_invites
      WHERE group_id=${group.id} AND revoked_at IS NULL AND expires_at>now()`))[0]?.count||0;
    if(activeInvites>=20) throw httpError(429,"Révoquez un ancien lien avant de créer une nouvelle invitation.");
    const token = randomBytes(32).toString("base64url");
    await db.execute(sql`INSERT INTO discussion_group_invites (group_id,token_hash,created_by,expires_at) VALUES (${group.id},${sha256(token)},${userId},now()+interval '7 days')`);
    res.status(201).json({ url: `${process.env.APP_BASE_URL || "https://sikatexte.site"}/groupeOfcl?group=${encodeURIComponent(group.slug)}&invite=${encodeURIComponent(token)}` });
  }));

  app.get("/api/groups/:slug/invites", requireAuth, wrap(async (req,res)=>{
    const userId=currentUserId(req)!;
    const group=await getGroup(String(req.params.slug));
    if(!group) throw httpError(404,"Groupe introuvable.");
    if(!await canManageGroup(userId,group.id)) throw httpError(403,"Action réservée aux administrateurs du groupe.");
    const invites=resultRows(await db.execute(sql`SELECT id,created_at AS "createdAt",expires_at AS "expiresAt",uses_count AS "usesCount",max_uses AS "maxUses"
      FROM discussion_group_invites WHERE group_id=${group.id} AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 30`));
    res.json({invites});
  }));

  app.delete("/api/groups/:slug/invites/:id", requireAuth, wrap(async (req,res)=>{
    const userId=currentUserId(req)!;
    const group=await getGroup(String(req.params.slug));
    if(!group) throw httpError(404,"Groupe introuvable.");
    if(!await canManageGroup(userId,group.id)) throw httpError(403,"Action réservée aux administrateurs du groupe.");
    const result=await db.execute(sql`UPDATE discussion_group_invites SET revoked_at=now()
      WHERE id=${req.params.id} AND group_id=${group.id} AND revoked_at IS NULL RETURNING id`);
    if(!resultRows(result).length) throw httpError(404,"Invitation introuvable.");
    await audit(group.id,userId,"invite.revoked");
    res.json({success:true});
  }));

  app.post("/api/groups/:slug/approvals/:userId", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const group = await getGroup(String(req.params.slug));
    if (!group) throw httpError(404, "Groupe introuvable.");
    if (!await canManageGroup(userId, group.id)) throw httpError(403, "Action réservée aux administrateurs du groupe.");
    const approve = z.boolean().safeParse(req.body?.approve);
    if (!approve.success) throw httpError(400, "Décision d’approbation invalide.");
    const status = approve.data ? "active" : "left";
    await db.transaction(async tx => {
      const changed = resultRows(await tx.execute(sql`UPDATE discussion_group_members SET status=${status},joined_at=now()
        WHERE group_id=${group.id} AND user_id=${req.params.userId} AND status='pending' RETURNING user_id`))[0];
      if (!changed) throw httpError(404, "Demande d’adhésion introuvable.");
      if (approve.data) {
        const target = await storage.getUser(String(req.params.userId));
        const name = target?.fullName || [target?.firstName,target?.lastName].filter(Boolean).join(" ") || "Un membre Sika";
        const eventContent = `${name} a rejoint le groupe.`;
        await tx.execute(sql`INSERT INTO discussion_group_messages (group_id,sender_label,content,message_type) VALUES (${group.id},${name},${eventContent},'system')`);
      }
    });
    await audit(group.id,userId,approve.data?"member.approved":"member.rejected",String(req.params.userId));
    res.json({ success: true });
  }));

  app.get("/api/groups/:slug/admin/queue", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const group = await getGroup(String(req.params.slug));
    if (!group) throw httpError(404, "Groupe introuvable.");
    if (!await canManageGroup(userId, group.id)) throw httpError(403, "Accès réservé aux administrateurs du groupe.");
    const [pending,members,reports,logs] = await Promise.all([
      db.execute(sql`SELECT m.user_id AS id,coalesce(nullif(u.full_name,''),concat_ws(' ',u.first_name,u.last_name),'Membre Sika') AS "fullName",
        u.profile_image_url AS "photoUrl",m.joined_at AS "requestedAt"
        FROM discussion_group_members m JOIN users u ON u.id=m.user_id WHERE m.group_id=${group.id} AND m.status='pending' ORDER BY m.joined_at`),
      db.execute(sql`SELECT m.user_id AS id,CASE WHEN u.id=(SELECT principal_user_id FROM discussion_group_security) THEN 'Yvan SPQ SIKA'
        ELSE coalesce(nullif(u.full_name,''),concat_ws(' ',u.first_name,u.last_name),'Membre Sika') END AS "fullName",m.role,m.status,m.posting_blocked AS "postingBlocked" FROM discussion_group_members m JOIN users u ON u.id=m.user_id
        WHERE m.group_id=${group.id} AND m.status='active' ORDER BY m.joined_at DESC LIMIT 200`),
      db.execute(sql`SELECT r.id,r.message_id AS "messageId",r.reason,r.created_at AS "createdAt",u.full_name AS "reporterName",m.content
        FROM discussion_group_reports r JOIN users u ON u.id=r.reporter_id JOIN discussion_group_messages m ON m.id=r.message_id
        WHERE r.group_id=${group.id} AND r.status='open' ORDER BY r.created_at DESC LIMIT 100`),
      db.execute(sql`SELECT a.action,a.details,a.created_at AS "createdAt",actor.full_name AS "actorName",target.full_name AS "targetName"
        FROM discussion_group_audit a LEFT JOIN users actor ON actor.id=a.actor_id LEFT JOIN users target ON target.id=a.target_user_id
        WHERE a.group_id=${group.id} ORDER BY a.created_at DESC LIMIT 100`),
    ]);
    res.json({ pending: resultRows(pending), members: resultRows(members), reports: resultRows(reports), logs: resultRows(logs) });
  }));

  app.get("/api/groups/:slug/admin/members",requireAuth,wrap(async(req,res)=>{
    const actor=currentUserId(req)!;
    const group=await getGroup(String(req.params.slug));
    if(!group)throw httpError(404,"Groupe introuvable.");
    if(!await canManageGroup(actor,group.id))throw httpError(403,"Accès réservé aux administrateurs du groupe.");
    res.setHeader("Cache-Control","no-store");
    res.json(await listModerationMembers(group.id,actor,req.query));
  }));

  app.patch("/api/groups/:slug/admin/moderation",requireAuth,wrap(async(req,res)=>{
    const actor=currentUserId(req)!;
    const group=await getGroup(String(req.params.slug));
    if(!group)throw httpError(404,"Groupe introuvable.");
    if(!await canManageGroup(actor,group.id))throw httpError(403,"Action réservée aux administrateurs du groupe.");
    const input=z.object({enabled:z.boolean()}).strict().safeParse(req.body);
    if(!input.success)throw httpError(400,"Réglage du filtre invalide.");
    await db.transaction(async tx=>{
      await tx.execute(sql`UPDATE discussion_groups SET smart_moderation_enabled=${input.data.enabled} WHERE id=${group.id}`);
      await tx.execute(sql`INSERT INTO discussion_group_audit (group_id,actor_id,action,details)
        VALUES (${group.id},${actor},'moderation.updated',${JSON.stringify(input.data)}::jsonb)`);
    });
    res.json({success:true,enabled:input.data.enabled});
  }));

  app.post("/api/groups/:slug/admin/posting", requireAuth, wrap(async (req, res) => {
    const userId = currentUserId(req)!;
    const group = await getGroup(String(req.params.slug));
    if (!group) throw httpError(404, "Groupe introuvable.");
    if (!await canManageGroup(userId, group.id)) throw httpError(403, "Seuls les administrateurs du groupe peuvent gérer l’envoi des messages.");
    const allowed = z.boolean().safeParse(req.body?.membersCanPost);
    if (!allowed.success) throw httpError(400, "Autorisation d’envoi invalide.");
    await db.transaction(async tx => {
      await tx.execute(sql`UPDATE discussion_groups SET members_can_post=${allowed.data} WHERE id=${group.id}`);
      await tx.execute(sql`INSERT INTO discussion_group_audit (group_id,actor_id,action,details)
        VALUES (${group.id},${userId},${allowed.data ? "posting.opened" : "posting.closed"},
          ${JSON.stringify({ membersCanPost: allowed.data })}::jsonb)`);
    });
    res.json({ success: true });
  }));

  app.patch("/api/groups/:slug/admin/groups", requireAuth, wrap(async (req, res) => {
    const userId=currentUserId(req)!;
    if (!await isPrincipalAdmin(userId)) throw httpError(403,"Action réservée à l’administrateur principal.");
    const group=await getGroup(String(req.params.slug));
    if (!group) throw httpError(404,"Groupe introuvable.");
    const parsed=groupSchema.partial().safeParse(req.body);
    if (!parsed.success) throw httpError(400,parsed.error.issues[0]?.message||"Paramètres invalides.");
    const data=parsed.data;
    if (data.photoUrl && !isSafeGroupPhoto(data.photoUrl)) throw httpError(400,"La photo doit utiliser une adresse HTTPS publique, sans identifiants.");
    await db.execute(sql`UPDATE discussion_groups SET
      name=coalesce(${data.name??null},name),description=coalesce(${data.description??null},description),
      photo_url=${data.photoUrl === "" ? null : data.photoUrl ?? group.photoUrl},
      category=coalesce(${data.category??null},category),visibility=coalesce(${data.visibility??null},visibility),
      rules=coalesce(${data.rules??null},rules),approval_required=coalesce(${data.approvalRequired??null},approval_required),
      members_can_post=coalesce(${data.membersCanPost??null},members_can_post)
      WHERE id=${group.id}`);
    await audit(group.id,userId,"group.updated");
    res.json({success:true});
  }));

  app.post("/api/groups/:slug/admin/archive", requireAuth, wrap(async (req,res)=>{
    const userId=currentUserId(req)!;
    if(!await isPrincipalAdmin(userId)) throw httpError(403,"Action réservée à l’administrateur principal.");
    const group=await getGroup(String(req.params.slug));
    if(!group) throw httpError(404,"Groupe introuvable.");
    if(group.slug===SYSTEM_GROUP_SLUG) throw httpError(400,"Le groupe officiel ne peut pas être archivé.");
    const confirm=z.literal(true).safeParse(req.body?.confirm);
    if(!confirm.success) throw httpError(400,"Confirmez l’archivage du groupe.");
    await db.execute(sql`UPDATE discussion_groups SET archived_at=now() WHERE id=${group.id}`);
    await audit(group.id,userId,"group.archived");
    res.json({success:true});
  }));

  app.post("/api/groups/:slug/admin/members/:memberId", requireAuth, wrap(async (req,res)=>{
    const actor=currentUserId(req)!;
    const group=await getGroup(String(req.params.slug));
    if(!group) throw httpError(404,"Groupe introuvable.");
    if(!await canManageGroup(actor,group.id)) throw httpError(403,"Action réservée aux administrateurs.");
    const action=z.enum(["remove","block","promote","demote","restrict_posting","allow_posting","restore","unblock"]).safeParse(req.body?.action);
    if(!action.success) throw httpError(400,"Action de modération invalide.");
    const target=String(req.params.memberId);
    if(target===actor || await isPrincipalAdmin(target)) throw httpError(403,"Cette action ne peut pas viser l’administrateur principal ou votre propre compte.");
    const old= resultRows(await db.execute(sql`SELECT role,status FROM discussion_group_members WHERE group_id=${group.id} AND user_id=${target}`))[0];
    if(!old || old.role==="owner") throw httpError(404,"Membre introuvable.");
    if(old.role==="admin"&&!await isPrincipalAdmin(actor)) throw httpError(403,"Seul l’administrateur principal peut retirer un administrateur.");
    if(action.data==="restore"||action.data==="unblock")
      return res.json(await liftMembershipRestriction(group.id,actor,target,action.data));
    if (action.data === "restrict_posting" || action.data === "allow_posting") {
      if (old.role !== "member" || !(action.data==="allow_posting"?["active","left"]:["active"]).includes(old.status))
        throw httpError(400, "Cette restriction concerne uniquement les membres non administrateurs autorisés.");
      await db.transaction(async tx => {
        const changed = resultRows(await tx.execute(sql`UPDATE discussion_group_members
          SET posting_blocked=${action.data === "restrict_posting"}
           WHERE group_id=${group.id} AND user_id=${target} AND role='member'
             AND (status='active' OR (${action.data==="allow_posting"} AND status='left')) RETURNING user_id`))[0];
        if (!changed) throw httpError(409, "Les droits de ce membre ont changé. Actualisez la liste.");
        await tx.execute(sql`INSERT INTO discussion_group_audit (group_id,actor_id,action,target_user_id)
          VALUES (${group.id},${actor},${`member.${action.data}`},${target})`);
      });
      return res.json({ success: true });
    }
    if(action.data==="promote" || action.data==="demote") {
      if(!await isPrincipalAdmin(actor)) throw httpError(403,"Seul l’administrateur principal peut gérer les administrateurs secondaires.");
      if(old.status!=="active") throw httpError(400,"Seul un membre actif peut recevoir des droits administratifs.");
      await db.execute(sql`UPDATE discussion_group_members SET role=${action.data==="promote"?"admin":"member"} WHERE group_id=${group.id} AND user_id=${target}`);
    } else {
      const targetUser=await storage.getUser(target);
      const targetName=targetUser?.fullName||[targetUser?.firstName,targetUser?.lastName].filter(Boolean).join(" ")||"Un membre Sika";
      const event=action.data==="block"?"a été bloqué du groupe.":"a été retiré du groupe.";
      const eventContent = `${targetName} ${event}`;
      await db.transaction(async tx=>{
        const changed=resultRows(await tx.execute(sql`UPDATE discussion_group_members SET status=${action.data==="block"?"banned":"left"},role='member'
          WHERE group_id=${group.id} AND user_id=${target} AND role=${old.role} AND status=${old.status} RETURNING user_id`))[0];
        if(!changed)throw httpError(409,"Les droits de ce membre ont changé. Actualisez la liste.");
        await tx.execute(sql`INSERT INTO discussion_group_messages (group_id,sender_label,content,message_type)
          VALUES (${group.id},${targetName},${eventContent},'system')`);
        await tx.execute(sql`INSERT INTO discussion_group_audit (group_id,actor_id,action,target_user_id)
          VALUES (${group.id},${actor},${`member.${action.data}`},${target})`);
      });
      return res.json({success:true});
    }
    await audit(group.id,actor,`member.${action.data}`,target);
    res.json({success:true});
  }));

  app.post("/api/groups/:slug/admin/messages/:id/pin", requireAuth, wrap(async (req,res)=>{
    const userId=currentUserId(req)!;
    const group=await getGroup(String(req.params.slug));
    if(!group) throw httpError(404,"Groupe introuvable.");
    if(!await canManageGroup(userId,group.id)) throw httpError(403,"Action réservée aux administrateurs.");
    const pinned=z.boolean().safeParse(req.body?.pinned);
    if(!pinned.success) throw httpError(400,"État d’épinglage invalide.");
    const result=await db.execute(sql`UPDATE discussion_group_messages SET pinned_at=${pinned.data?new Date():null}
      WHERE id=${req.params.id} AND group_id=${group.id} AND message_type='text' RETURNING id`);
    if(!resultRows(result).length) throw httpError(404,"Message introuvable.");
    await audit(group.id,userId,pinned.data?"message.pinned":"message.unpinned",undefined,String(req.params.id));
    res.json({success:true});
  }));

  app.post("/api/groups/:slug/admin/reports/:id", requireAuth, wrap(async (req,res)=>{
    const userId=currentUserId(req)!;
    const group=await getGroup(String(req.params.slug));
    if(!group) throw httpError(404,"Groupe introuvable.");
    if(!await canManageGroup(userId,group.id)) throw httpError(403,"Action réservée aux administrateurs.");
    const status=z.enum(["resolved","dismissed"]).safeParse(req.body?.status);
    if(!status.success) throw httpError(400,"Décision de signalement invalide.");
    const result=await db.execute(sql`UPDATE discussion_group_reports SET status=${status.data} WHERE id=${req.params.id} AND group_id=${group.id} AND status='open' RETURNING id`);
    if(!resultRows(result).length) throw httpError(404,"Signalement introuvable.");
    await audit(group.id,userId,"report."+status.data);
    res.json({success:true});
  }));

  app.post("/api/groups/:slug/admin/announcements", requireAuth, wrap(async (req,res)=>{
    const userId=currentUserId(req)!;
    const content=z.string().trim().min(1).max(4000).safeParse(req.body?.content);
    if(!content.success) throw httpError(400,"Annonce invalide.");
    const group=await getGroup(String(req.params.slug));
    if(!group) throw httpError(404,"Groupe introuvable.");
    if(!await canManageGroup(userId,group.id)) throw httpError(403,"Action réservée aux administrateurs du groupe.");
    const inserted=resultRows(await db.execute(sql`INSERT INTO discussion_group_messages (group_id,user_id,sender_label,content,message_type,pinned_at)
      VALUES (${group.id},${userId},'Annonce officielle',${content.data},'text',now()) RETURNING id`))[0];
    await audit(group.id,userId,"announcement.created",undefined,String(inserted.id));
    res.status(201).json({id:String(inserted.id)});
  }));
}
