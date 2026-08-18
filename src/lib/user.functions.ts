import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFirebaseAuth } from "@/integrations/firebase/auth-middleware";

export interface UserPersonalDataExport {
  exportDate: string;
  popiaComplianceNote: string;
  dataSubject: {
    id: string;
    email: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
    popiaConsentedAt: string | null;
    aiConsent: boolean;
    marketingConsent: boolean;
    dataRetentionPreference: string;
  };
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    deadline: string | null;
    createdAt: string;
    role: string;
  }>;
  tasks: Array<{
    id: string;
    projectId: string;
    title: string;
    description: string | null;
    category: string | null;
    priority: string;
    status: string;
    dueDate: string | null;
    completedAt: string | null;
    createdAt: string;
  }>;
  invites: Array<{
    id: string;
    projectId: string;
    email: string;
    colour: string;
    status: string;
    createdAt: string;
  }>;
  notifications: Array<{
    id: string;
    kind: string;
    title: string;
    body: string | null;
    readAt: string | null;
    createdAt: string;
  }>;
}

// -------------------------------------------------------------
// 1. Get Profile & Privacy Settings (Google Cloud Firestore)
// -------------------------------------------------------------
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    const docRef = context.db.collection("profiles").doc(context.userId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      const now = new Date().toISOString();
      const defaultProfile = {
        id: context.userId,
        display_name: (context.claims?.name as string) ?? context.email ?? "User",
        email: context.email ?? null,
        avatar_url: (context.claims?.picture as string) ?? null,
        created_at: now,
        updated_at: now,
        popia_consented_at: null,
        ai_consent: true,
        marketing_consent: false,
        data_retention_preference: "standard",
      };
      await docRef.set(defaultProfile);
      return defaultProfile;
    }

    return docSnap.data() as {
      id: string;
      display_name: string | null;
      email: string | null;
      avatar_url: string | null;
      created_at: string;
      updated_at: string;
      popia_consented_at: string | null;
      ai_consent: boolean;
      marketing_consent: boolean;
      data_retention_preference: string;
    };
  });

// -------------------------------------------------------------
// 2. Update Profile Information (POPIA §16 Information Quality)
// -------------------------------------------------------------
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) =>
    z
      .object({
        displayName: z.string().min(1).max(120).optional(),
        avatarUrl: z.string().url().max(1000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (data.displayName !== undefined) patch.display_name = data.displayName;
    if (data.avatarUrl !== undefined) patch.avatar_url = data.avatarUrl;

    const docRef = context.db.collection("profiles").doc(context.userId);
    await docRef.set(patch, { merge: true });
    return { ok: true };
  });

// -------------------------------------------------------------
// 3. Update POPIA Consent & Privacy Preferences (POPIA §11 & §13)
// -------------------------------------------------------------
export const updatePrivacyConsent = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) =>
    z
      .object({
        consented: z.boolean(),
        aiConsent: z.boolean().optional(),
        marketingConsent: z.boolean().optional(),
        dataRetentionPreference: z.enum(["standard", "minimal", "extended"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.consented) {
      patch.popia_consented_at = new Date().toISOString();
    }
    if (data.aiConsent !== undefined) patch.ai_consent = data.aiConsent;
    if (data.marketingConsent !== undefined) patch.marketing_consent = data.marketingConsent;
    if (data.dataRetentionPreference !== undefined) {
      patch.data_retention_preference = data.dataRetentionPreference;
    }

    const docRef = context.db.collection("profiles").doc(context.userId);
    await docRef.set(patch, { merge: true });
    return { ok: true, consentedAt: (patch.popia_consented_at as string) ?? null };
  });

// -------------------------------------------------------------
// 4. POPIA §23 Data Subject Access Request (DSAR) / Export Data
// -------------------------------------------------------------
export const exportMyPersonalData = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }): Promise<UserPersonalDataExport> => {
    const userId = context.userId;

    // 1. Profile
    const profileDoc = await context.db.collection("profiles").doc(userId).get();
    const profile = profileDoc.data();

    // 2. Owned Projects
    const projectsSnap = await context.db
      .collection("projects")
      .where("owner_id", "==", userId)
      .get();
    const projects = projectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
      id: string;
      name: string;
      description: string | null;
      deadline: string | null;
      created_at: string;
    }>;

    // 3. Memberships
    const membersSnap = await context.db
      .collection("project_members")
      .where("user_id", "==", userId)
      .get();
    const memberships = membersSnap.docs.map((d) => d.data()) as Array<{
      project_id: string;
      role: string;
    }>;
    const memberRoleByProject = new Map(memberships.map((m) => [m.project_id, m.role]));

    // 4. Tasks
    const tasksSnap = await context.db.collection("tasks").where("created_by", "==", userId).get();
    const tasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
      id: string;
      project_id: string;
      title: string;
      description: string | null;
      category: string | null;
      priority: string;
      status: string;
      due_date: string | null;
      completed_at: string | null;
      created_at: string;
    }>;

    // 5. Invites sent
    const invitesSnap = await context.db
      .collection("project_invites")
      .where("invited_by", "==", userId)
      .get();
    const invites = invitesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
      id: string;
      project_id: string;
      email: string;
      colour: string;
      status: string;
      created_at: string;
    }>;

    // 6. Notifications
    const notifsSnap = await context.db
      .collection("notifications")
      .where("user_id", "==", userId)
      .get();
    const notifications = notifsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
      id: string;
      kind: string;
      title: string;
      body: string | null;
      read_at: string | null;
      created_at: string;
    }>;

    return {
      exportDate: new Date().toISOString(),
      popiaComplianceNote:
        "This data export is provided in accordance with Section 23 of the South African Protection of Personal Information Act (POPIA, Act 4 of 2013). It contains all personal information, project records, and task data stored under your account on Google Cloud.",
      dataSubject: {
        id: userId,
        email: (profile?.email as string) ?? context.email ?? null,
        displayName: (profile?.display_name as string) ?? null,
        avatarUrl: (profile?.avatar_url as string) ?? null,
        createdAt: (profile?.created_at as string) ?? new Date().toISOString(),
        updatedAt: (profile?.updated_at as string) ?? new Date().toISOString(),
        popiaConsentedAt: (profile?.popia_consented_at as string) ?? null,
        aiConsent: (profile?.ai_consent as boolean) ?? true,
        marketingConsent: (profile?.marketing_consent as boolean) ?? false,
        dataRetentionPreference: (profile?.data_retention_preference as string) ?? "standard",
      },
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        deadline: p.deadline,
        createdAt: p.created_at,
        role: memberRoleByProject.get(p.id) ?? "owner",
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        projectId: t.project_id,
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority ?? "medium",
        status: t.status,
        dueDate: t.due_date,
        completedAt: t.completed_at,
        createdAt: t.created_at,
      })),
      invites: invites.map((i) => ({
        id: i.id,
        projectId: i.project_id,
        email: i.email,
        colour: i.colour,
        status: i.status,
        createdAt: i.created_at,
      })),
      notifications: notifications.map((n) => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        readAt: n.read_at,
        createdAt: n.created_at,
      })),
    };
  });

// -------------------------------------------------------------
// 5. POPIA §24 Right to Erasure / Account & Data Deletion
// -------------------------------------------------------------
export const deleteMyAccountAndData = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) =>
    z
      .object({
        confirmationText: z.literal("DELETE MY ACCOUNT AND DATA"),
      })
      .parse(data),
  )
  .handler(async ({ context }) => {
    const userId = context.userId;
    const batch = context.db.batch();

    // 1. Delete notifications
    const notifs = await context.db
      .collection("notifications")
      .where("user_id", "==", userId)
      .get();
    for (const doc of notifs.docs) batch.delete(doc.ref);

    // 2. Delete project invites sent by user
    const invites = await context.db
      .collection("project_invites")
      .where("invited_by", "==", userId)
      .get();
    for (const doc of invites.docs) batch.delete(doc.ref);

    // 3. Delete owned projects and associated tasks
    const ownedProjects = await context.db
      .collection("projects")
      .where("owner_id", "==", userId)
      .get();
    for (const pDoc of ownedProjects.docs) {
      batch.delete(pDoc.ref);
      const projTasks = await context.db
        .collection("tasks")
        .where("project_id", "==", pDoc.id)
        .get();
      for (const tDoc of projTasks.docs) batch.delete(tDoc.ref);
      const projMembers = await context.db
        .collection("project_members")
        .where("project_id", "==", pDoc.id)
        .get();
      for (const mDoc of projMembers.docs) batch.delete(mDoc.ref);
    }

    // 4. Remove memberships in other projects
    const memberships = await context.db
      .collection("project_members")
      .where("user_id", "==", userId)
      .get();
    for (const mDoc of memberships.docs) batch.delete(mDoc.ref);

    // 5. Delete individual tasks created
    const createdTasks = await context.db
      .collection("tasks")
      .where("created_by", "==", userId)
      .get();
    for (const tDoc of createdTasks.docs) batch.delete(tDoc.ref);

    // 6. Delete profile
    batch.delete(context.db.collection("profiles").doc(userId));

    await batch.commit();
    return { ok: true, deletedUserId: userId };
  });
