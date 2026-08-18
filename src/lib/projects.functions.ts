import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFirebaseAuth } from "@/integrations/firebase/auth-middleware";

const idValidator = z.string().min(1);
const colour = z.string().regex(/^#[0-9a-fA-F]{6}$/);

// ------------- Projects -------------

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    // 1. Fetch projects owned by the user
    const ownedSnap = await context.db
      .collection("projects")
      .where("owner_id", "==", context.userId)
      .get();

    // 2. Fetch projects where the user is a member
    const memberSnap = await context.db
      .collection("project_members")
      .where("user_id", "==", context.userId)
      .get();

    const memberProjIds = memberSnap.docs.map((d) => d.data().project_id as string);
    interface ProjectDoc {
      id: string;
      owner_id: string;
      name: string;
      description: string | null;
      deadline: string | null;
      created_at: string;
    }
    const projectsMap = new Map<string, ProjectDoc>();

    for (const doc of ownedSnap.docs) {
      const data = doc.data();
      projectsMap.set(doc.id, {
        id: doc.id,
        owner_id: (data.owner_id as string) ?? "",
        name: (data.name as string) ?? "",
        description: (data.description as string | null) ?? null,
        deadline: (data.deadline as string | null) ?? null,
        created_at: (data.created_at as string) ?? "",
      });
    }

    for (const projId of memberProjIds) {
      if (!projectsMap.has(projId)) {
        const pDoc = await context.db.collection("projects").doc(projId).get();
        if (pDoc.exists) {
          const data = pDoc.data() ?? {};
          projectsMap.set(pDoc.id, {
            id: pDoc.id,
            owner_id: (data.owner_id as string) ?? "",
            name: (data.name as string) ?? "",
            description: (data.description as string | null) ?? null,
            deadline: (data.deadline as string | null) ?? null,
            created_at: (data.created_at as string) ?? "",
          });
        }
      }
    }

    const list = Array.from(projectsMap.values());
    list.sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
    );
    return list;
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
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
    const docRef = context.db.collection("projects").doc();
    const now = new Date().toISOString();
    const projectData = {
      id: docRef.id,
      name: data.name,
      description: data.description ?? null,
      deadline: data.deadline || null,
      owner_id: context.userId,
      created_at: now,
      updated_at: now,
    };
    await docRef.set(projectData);

    // Add creator as owner member
    const memberRef = context.db.collection("project_members").doc();
    await memberRef.set({
      id: memberRef.id,
      project_id: docRef.id,
      user_id: context.userId,
      placeholder_name: null,
      colour: "#4361ee",
      role: "owner",
      status: "active",
      created_at: now,
      updated_at: now,
    });

    return projectData;
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: idValidator,
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).nullable().optional(),
        deadline: z.string().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const cleanPatch: Record<string, unknown> = {
      ...patch,
      updated_at: new Date().toISOString(),
    };
    await context.db.collection("projects").doc(id).set(cleanPatch, { merge: true });
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) => z.object({ id: idValidator }).parse(data))
  .handler(async ({ data, context }) => {
    const batch = context.db.batch();

    // 1. Delete project doc
    batch.delete(context.db.collection("projects").doc(data.id));

    // 2. Delete tasks for this project
    const tasksSnap = await context.db.collection("tasks").where("project_id", "==", data.id).get();
    for (const doc of tasksSnap.docs) batch.delete(doc.ref);

    // 3. Delete members for this project
    const membersSnap = await context.db
      .collection("project_members")
      .where("project_id", "==", data.id)
      .get();
    for (const doc of membersSnap.docs) batch.delete(doc.ref);

    // 4. Delete invites for this project
    const invitesSnap = await context.db
      .collection("project_invites")
      .where("project_id", "==", data.id)
      .get();
    for (const doc of invitesSnap.docs) batch.delete(doc.ref);

    await batch.commit();
    return { ok: true };
  });

// ------------- Members -------------

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) => z.object({ projectId: idValidator }).parse(data))
  .handler(async ({ data, context }) => {
    const snap = await context.db
      .collection("project_members")
      .where("project_id", "==", data.projectId)
      .get();

    const members = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
      id: string;
      project_id: string;
      user_id: string | null;
      placeholder_name: string | null;
      colour: string;
      role: string;
      status: string;
      created_at: string;
    }>;

    const userIds = members.map((m) => m.user_id).filter((v): v is string => !!v);
    const profilesMap: Record<
      string,
      { display_name: string | null; email: string | null; avatar_url: string | null }
    > = {};

    if (userIds.length > 0) {
      for (const uid of userIds) {
        const profDoc = await context.db.collection("profiles").doc(uid).get();
        if (profDoc.exists) {
          const p = profDoc.data();
          profilesMap[uid] = {
            display_name: p?.display_name ?? null,
            email: p?.email ?? null,
            avatar_url: p?.avatar_url ?? null,
          };
        }
      }
    }

    return members.map((m) => ({
      ...m,
      profile: m.user_id ? (profilesMap[m.user_id] ?? null) : null,
    }));
  });

export const addPlaceholderMember = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) =>
    z.object({ projectId: idValidator, name: z.string().min(1).max(80), colour }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const docRef = context.db.collection("project_members").doc();
    const now = new Date().toISOString();
    const memberData = {
      id: docRef.id,
      project_id: data.projectId,
      user_id: null,
      placeholder_name: data.name,
      colour: data.colour,
      role: "member",
      status: "active",
      created_at: now,
      updated_at: now,
    };
    await docRef.set(memberData);
    return { id: docRef.id };
  });

export const updateMemberColour = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) => z.object({ memberId: idValidator, colour }).parse(data))
  .handler(async ({ data, context }) => {
    await context.db
      .collection("project_members")
      .doc(data.memberId)
      .set({ colour: data.colour, updated_at: new Date().toISOString() }, { merge: true });
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) => z.object({ memberId: idValidator }).parse(data))
  .handler(async ({ data, context }) => {
    await context.db.collection("project_members").doc(data.memberId).delete();
    return { ok: true };
  });

// ------------- Invites -------------

export const listMyProjectInvites = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    const email = (context.email ?? "").toLowerCase();
    if (!email) return [];

    const snap = await context.db
      .collection("project_invites")
      .where("email", "==", email)
      .where("status", "==", "pending")
      .get();

    const invites = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
      id: string;
      project_id: string;
      email: string;
      colour: string;
      status: string;
      created_at: string;
      invited_by: string;
    }>;

    const result = [];
    for (const inv of invites) {
      const pDoc = await context.db.collection("projects").doc(inv.project_id).get();
      result.push({
        ...inv,
        project_name: pDoc.exists ? (pDoc.data()?.name as string) : "Project",
      });
    }

    return result;
  });

export const listProjectInvites = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) => z.object({ projectId: idValidator }).parse(data))
  .handler(async ({ data, context }) => {
    const snap = await context.db
      .collection("project_invites")
      .where("project_id", "==", data.projectId)
      .get();

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });

export const inviteToProject = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) =>
    z.object({ projectId: idValidator, email: z.string().email(), colour }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const docRef = context.db.collection("project_invites").doc();
    const now = new Date().toISOString();
    await docRef.set({
      id: docRef.id,
      project_id: data.projectId,
      email: data.email.toLowerCase(),
      colour: data.colour,
      invited_by: context.userId,
      status: "pending",
      created_at: now,
      updated_at: now,
    });
    return { ok: true };
  });

export const respondToProjectInvite = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) =>
    z.object({ inviteId: idValidator, accept: z.boolean(), colour: colour.optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const email = (context.email ?? "").toLowerCase();
    if (!email) throw new Error("Missing account email");

    const invDoc = await context.db.collection("project_invites").doc(data.inviteId).get();
    if (!invDoc.exists) throw new Error("Invite not found");

    const inv = invDoc.data() as {
      project_id: string;
      email: string;
      colour: string;
      status: string;
    };

    if (inv.email.toLowerCase() !== email) throw new Error("This invite isn't for you");
    if (inv.status !== "pending") throw new Error("Invite already responded to");

    const now = new Date().toISOString();
    if (data.accept) {
      const memberRef = context.db.collection("project_members").doc();
      await memberRef.set({
        id: memberRef.id,
        project_id: inv.project_id,
        user_id: context.userId,
        colour: data.colour ?? inv.colour,
        role: "member",
        status: "active",
        created_at: now,
        updated_at: now,
      });
    }

    await invDoc.ref.set(
      {
        status: data.accept ? "accepted" : "declined",
        responded_at: now,
        updated_at: now,
      },
      { merge: true },
    );

    return { ok: true, accepted: data.accept };
  });

export const revokeProjectInvite = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) => z.object({ inviteId: idValidator }).parse(data))
  .handler(async ({ data, context }) => {
    await context.db.collection("project_invites").doc(data.inviteId).delete();
    return { ok: true };
  });
