import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";

const fail=(status:number,message:string)=>Object.assign(new Error(message),{status});
const rows=(result:any)=>result.rows as any[];

export async function listModerationMembers(groupId:string,viewerId:string,query:unknown) {
  const parsed=z.object({
    filter:z.enum(["active","restricted","excluded","banned"]).default("active"),
    q:z.string().trim().max(100).default(""),
    offset:z.coerce.number().int().min(0).max(1000000).default(0),
  }).safeParse(query);
  if(!parsed.success)throw fail(400,"Recherche ou filtre de membres invalide.");
  const {filter,q,offset}=parsed.data;
  // Existing moderation history distinguishes an exclusion from a voluntary departure.
  // joined_at prevents an old exclusion resurfacing after rejoining and leaving normally.
  const base=sql`SELECT m.user_id AS id,
      CASE WHEN m.user_id=(SELECT principal_user_id FROM discussion_group_security) THEN 'Yvan SPQ SIKA'
        ELSE coalesce(nullif(u.full_name,''),concat_ws(' ',u.first_name,u.last_name),'Membre Sika') END AS "fullName",
      u.profile_image_url AS "photoUrl",m.role,m.status,m.posting_blocked AS "postingBlocked",m.joined_at,
      (m.role='member' AND m.user_id<>${viewerId}
        AND m.user_id<>(SELECT principal_user_id FROM discussion_group_security)) AS "canModerate",
      (m.status='left' AND (SELECT a.action FROM discussion_group_audit a
        WHERE a.group_id=m.group_id AND a.target_user_id=m.user_id AND a.created_at>=m.joined_at
          AND a.action IN ('member.remove','member.block','member.unblock','member.restore')
        ORDER BY a.created_at DESC,a.id DESC LIMIT 1)='member.remove') AS excluded
    FROM discussion_group_members m JOIN users u ON u.id=m.user_id WHERE m.group_id=${groupId}`;
  const condition=filter==="active"?sql`status='active'`
    :filter==="restricted"?sql`"postingBlocked" AND status IN ('active','left')`
    :filter==="excluded"?sql`excluded IS TRUE`:sql`status='banned'`;
  const [summary,result]=await Promise.all([
    db.execute(sql`WITH members AS (${base}) SELECT count(*) FILTER(WHERE status='active')::int AS active,
      count(*) FILTER(WHERE "postingBlocked" AND status IN ('active','left'))::int AS restricted,
      count(*) FILTER(WHERE excluded IS TRUE)::int AS excluded,
      count(*) FILTER(WHERE status='banned')::int AS banned FROM members`),
    db.execute(sql`WITH members AS (${base}),filtered AS (
      SELECT * FROM members WHERE ${condition} AND strpos(lower("fullName"),lower(${q}))>0)
      SELECT (SELECT count(*)::int FROM filtered) AS total,
        coalesce((SELECT jsonb_agg(page) FROM (
          SELECT id,"fullName","photoUrl",role,status,"postingBlocked","canModerate",coalesce(excluded,false) AS excluded
          FROM filtered ORDER BY lower("fullName"),id LIMIT 40 OFFSET ${offset}
        ) page),'[]'::jsonb) AS members`),
  ]);
  const data=rows(result)[0];
  return {...data,counts:rows(summary)[0],hasMore:offset+data.members.length<data.total};
}

export async function liftMembershipRestriction(groupId:string,actor:string,target:string,action:"restore"|"unblock") {
  return db.transaction(async tx=>{
    const old=rows(await tx.execute(sql`SELECT m.role,m.status,u.full_name,u.first_name,u.last_name
      FROM discussion_group_members m JOIN users u ON u.id=m.user_id
      WHERE m.group_id=${groupId} AND m.user_id=${target} FOR UPDATE OF m`))[0];
    if(!old||old.role!=="member")throw fail(409,"Les droits de ce membre ont changé. Actualisez la liste.");
    if(action==="unblock"&&old.status!=="banned")throw fail(400,"Ce membre n’est pas exclu et bloqué.");
    if(action==="restore"&&!["left","banned"].includes(old.status))throw fail(400,"Ce membre n’est pas exclu.");
    if(action==="restore"&&old.status==="left"){
      const latest=rows(await tx.execute(sql`SELECT action FROM discussion_group_audit
        WHERE group_id=${groupId} AND target_user_id=${target}
          AND created_at>=(SELECT joined_at FROM discussion_group_members WHERE group_id=${groupId} AND user_id=${target})
          AND action IN ('member.remove','member.block','member.unblock','member.restore')
        ORDER BY created_at DESC,id DESC LIMIT 1`))[0];
      if(latest?.action!=="member.remove")throw fail(400,"Ce membre a quitté le groupe. Il doit demander à le rejoindre.");
    }
    await tx.execute(sql`UPDATE discussion_group_members SET status=${action==="restore"?"active":"left"},
      role='member',posting_blocked=false,
      joined_at=CASE WHEN ${action==="restore"} THEN now() ELSE joined_at END,
      last_read_at=CASE WHEN ${action==="restore"} THEN now() ELSE last_read_at END
      WHERE group_id=${groupId} AND user_id=${target}`);
    if(action==="restore"){
      const name=old.full_name||[old.first_name,old.last_name].filter(Boolean).join(" ")||"Un membre Sika";
      await tx.execute(sql`INSERT INTO discussion_group_messages (group_id,sender_label,content,message_type)
        VALUES (${groupId},${name},${`${name} a rejoint le groupe.`},'system')`);
    }
    await tx.execute(sql`INSERT INTO discussion_group_audit (group_id,actor_id,action,target_user_id)
      VALUES (${groupId},${actor},${`member.${action}`},${target})`);
    return {success:true};
  });
}
