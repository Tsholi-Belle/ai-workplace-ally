import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();
const colour = z.string().regex(/^#[0-9a-fA-F]{6}$/);

// ------------- Projects -------------

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, owner_id, name, description, deadline, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional().nullable(),
        deadline: z.string().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .insert({
        name: data.name,
        description: data.description ?? null,
        deadline: data.deadline || null,
        owner_id: context.userId,
      })
      .select("id, owner_id, name, description, deadline, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: uuid,
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).nullable().optional(),
        deadline: z.string().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("projects").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------- Members -------------

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ projectId: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("project_members")
      .select("id, project_id, user_id, placeholder_name, colour, role, status, created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const userIds = (rows ?? []).map((r) => r.user_id).filter((v): v is string => !!v);
    let profiles: Record<string, { display_name: string | null; email: string | null; avatar_url: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, display_name, email, avatar_url")
        .in("id", userIds);
      profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
    }
    return (rows ?? []).map((r) => ({
      ...r,
      profile: r.user_id ? profiles[r.user_id] ?? null : null,
    }));
  });

export const addPlaceholderMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ projectId: uuid, name: z.string().min(1).max(80), colour }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("project_members")
      .insert({
        project_id: data.projectId,
        placeholder_name: data.name,
        colour: data.colour,
        role: "member",
        status: "active",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMemberColour = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ memberId: uuid, colour }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_members")
      .update({ colour: data.colour })
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ memberId: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_members")
      .delete()
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------- Invites -------------

export const listMyProjectInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims?.email ?? "").toLowerCase();
    if (!email) return [];
    const { data, error } = await context.supabase
      .from("project_invites")
      .select("id, project_id, email, colour, status, created_at, invited_by")
      .eq("status", "pending")
      .ilike("email", email);
    if (error) throw new Error(error.message);
    const projIds = [...new Set((data ?? []).map((r) => r.project_id))];
    let projs: Record<string, { name: string }> = {};
    if (projIds.length) {
      const { data: p } = await context.supabase
        .from("projects")
        .select("id, name")
        .in("id", projIds);
      projs = Object.fromEntries((p ?? []).map((x) => [x.id, x]));
    }
    return (data ?? []).map((r) => ({ ...r, project_name: projs[r.project_id]?.name ?? "Project" }));
  });

export const listProjectInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ projectId: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("project_invites")
      .select("id, email, colour, status, created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const inviteToProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ projectId: uuid, email: z.string().email(), colour }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("project_invites").insert({
      project_id: data.projectId,
      email: data.email.toLowerCase(),
      colour: data.colour,
      invited_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const respondToProjectInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ inviteId: uuid, accept: z.boolean(), colour: colour.optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const email = (context.claims?.email ?? "").toLowerCase();
    if (!email) throw new Error("Missing account email");
    const { data: inv, error: e1 } = await context.supabase
      .from("project_invites")
      .select("id, project_id, email, colour, status")
      .eq("id", data.inviteId)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!inv) throw new Error("Invite not found");
    if (inv.email.toLowerCase() !== email) throw new Error("This invite isn't for you");
    if (inv.status !== "pending") throw new Error("Invite already responded to");

    if (data.accept) {
      const { error: mErr } = await context.supabase.from("project_members").insert({
        project_id: inv.project_id,
        user_id: context.userId,
        colour: data.colour ?? inv.colour,
        role: "member",
        status: "active",
      });
      if (mErr && !mErr.message.includes("duplicate")) throw new Error(mErr.message);
    }

    const { error: uErr } = await context.supabase
      .from("project_invites")
      .update({ status: data.accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
      .eq("id", data.inviteId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true, accepted: data.accept };
  });

export const revokeProjectInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ inviteId: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_invites")
      .delete()
      .eq("id", data.inviteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
