import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();
const status = z.enum(["todo", "in_progress", "done"]);

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ projectId: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("tasks")
      .select(
        "id, project_id, title, description, category, assignee_member_id, status, due_date, reminders_enabled, completed_at, created_at",
      )
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        projectId: uuid,
        title: z.string().min(1).max(500),
        description: z.string().max(4000).nullable().optional(),
        category: z.string().max(80).nullable().optional(),
        assigneeMemberId: uuid.nullable().optional(),
        dueDate: z.string().nullable().optional(),
        status: status.optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tasks")
      .insert({
        project_id: data.projectId,
        title: data.title,
        description: data.description ?? null,
        category: data.category ?? null,
        assignee_member_id: data.assigneeMemberId ?? null,
        due_date: data.dueDate || null,
        status: data.status ?? "todo",
        created_by: context.userId,
      })
      .select(
        "id, project_id, title, description, category, assignee_member_id, status, due_date, reminders_enabled, completed_at, created_at",
      )
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: uuid,
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(4000).nullable().optional(),
        category: z.string().max(80).nullable().optional(),
        assigneeMemberId: uuid.nullable().optional(),
        dueDate: z.string().nullable().optional(),
        status: status.optional(),
        remindersEnabled: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.category !== undefined) patch.category = data.category;
    if (data.assigneeMemberId !== undefined) patch.assignee_member_id = data.assigneeMemberId;
    if (data.dueDate !== undefined) patch.due_date = data.dueDate || null;
    if (data.status !== undefined) {
      patch.status = data.status;
      patch.completed_at = data.status === "done" ? new Date().toISOString() : null;
    }
    if (data.remindersEnabled !== undefined) patch.reminders_enabled = data.remindersEnabled;

    const { error } = await context.supabase.from("tasks").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
