import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFirebaseAuth } from "@/integrations/firebase/auth-middleware";

const idValidator = z.string().min(1);
const status = z.enum(["todo", "in_progress", "done"]);
const priority = z.enum(["low", "medium", "high", "urgent"]);

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) => z.object({ projectId: idValidator }).parse(data))
  .handler(async ({ data, context }) => {
    const snap = await context.db
      .collection("tasks")
      .where("project_id", "==", data.projectId)
      .get();

    const tasks = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Array<{
      id: string;
      project_id: string;
      title: string;
      description: string | null;
      category: string | null;
      priority: "low" | "medium" | "high" | "urgent";
      assignee_member_id: string | null;
      status: "todo" | "in_progress" | "done";
      due_date: string | null;
      reminders_enabled: boolean;
      completed_at: string | null;
      created_at: string;
    }>;

    tasks.sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
    );
    return tasks;
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) =>
    z
      .object({
        projectId: idValidator,
        title: z.string().min(1).max(500),
        description: z.string().max(4000).nullable().optional(),
        category: z.string().max(80).nullable().optional(),
        priority: priority.optional(),
        assigneeMemberId: idValidator.nullable().optional(),
        dueDate: z.string().nullable().optional(),
        status: status.optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const docRef = context.db.collection("tasks").doc();
    const now = new Date().toISOString();
    const taskData = {
      id: docRef.id,
      project_id: data.projectId,
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? null,
      priority: data.priority ?? "medium",
      assignee_member_id: data.assigneeMemberId ?? null,
      due_date: data.dueDate || null,
      status: data.status ?? "todo",
      reminders_enabled: true,
      completed_at: data.status === "done" ? now : null,
      created_by: context.userId,
      created_at: now,
      updated_at: now,
    };
    await docRef.set(taskData);
    return taskData;
  });

export const createBatchTasks = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) =>
    z
      .object({
        projectId: idValidator,
        tasks: z.array(
          z.object({
            title: z.string().min(1).max(500),
            description: z.string().max(4000).nullable().optional(),
            category: z.string().max(80).nullable().optional(),
            priority: priority.optional(),
            dueDate: z.string().nullable().optional(),
          }),
        ),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    if (data.tasks.length === 0) return [];
    const batch = context.db.batch();
    const now = new Date().toISOString();
    const created = [];

    for (const t of data.tasks) {
      const docRef = context.db.collection("tasks").doc();
      const taskData = {
        id: docRef.id,
        project_id: data.projectId,
        title: t.title,
        description: t.description ?? null,
        category: t.category ?? null,
        priority: t.priority ?? "medium",
        assignee_member_id: null,
        due_date: t.dueDate || null,
        status: "todo",
        reminders_enabled: true,
        completed_at: null,
        created_by: context.userId,
        created_at: now,
        updated_at: now,
      };
      batch.set(docRef, taskData);
      created.push(taskData);
    }

    await batch.commit();
    return created;
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: idValidator,
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(4000).nullable().optional(),
        category: z.string().max(80).nullable().optional(),
        priority: priority.optional(),
        assigneeMemberId: idValidator.nullable().optional(),
        dueDate: z.string().nullable().optional(),
        status: status.optional(),
        remindersEnabled: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.category !== undefined) patch.category = data.category;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.assigneeMemberId !== undefined) patch.assignee_member_id = data.assigneeMemberId;
    if (data.dueDate !== undefined) patch.due_date = data.dueDate || null;
    if (data.status !== undefined) {
      patch.status = data.status;
      patch.completed_at = data.status === "done" ? new Date().toISOString() : null;
    }
    if (data.remindersEnabled !== undefined) patch.reminders_enabled = data.remindersEnabled;

    await context.db.collection("tasks").doc(data.id).set(patch, { merge: true });
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) => z.object({ id: idValidator }).parse(data))
  .handler(async ({ data, context }) => {
    await context.db.collection("tasks").doc(data.id).delete();
    return { ok: true };
  });
