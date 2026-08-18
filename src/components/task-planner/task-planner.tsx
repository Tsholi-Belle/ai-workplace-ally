import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Calendar,
  Bell,
  BellOff,
  Loader2,
  Sparkles,
  Settings2,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  Edit2,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { pickNextColour, contrastText } from "./palette";
import { ColourPicker } from "./colour-picker";
import {
  listProjects,
  createProject,
  deleteProject,
  updateProject,
  listMembers,
  addPlaceholderMember,
  updateMemberColour,
  removeMember,
  listProjectInvites,
  listMyProjectInvites,
  inviteToProject,
  respondToProjectInvite,
  revokeProjectInvite,
} from "@/lib/projects.functions";
import {
  listTasks,
  createTask,
  createBatchTasks,
  updateTask,
  deleteTask,
} from "@/lib/tasks.functions";
import { generateProjectTasks } from "@/lib/ai.functions";

type Status = "todo" | "in_progress" | "done";
type Priority = "low" | "medium" | "high" | "urgent";

const STATUS_LABEL: Record<Status, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const STATUSES: Status[] = ["todo", "in_progress", "done"];

const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const PRIORITY_STYLE: Record<Priority, string> = {
  low: "border-slate-500/30 bg-slate-500/10 text-slate-400",
  medium: "border-sky-500/30 bg-sky-500/10 text-sky-500",
  high: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  urgent: "border-rose-500/40 bg-rose-500/15 text-rose-500 font-semibold",
};

function daysUntil(d: string | null) {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function initials(s: string) {
  return s
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TaskPlanner() {
  const qc = useQueryClient();
  const projectsFn = useServerFn(listProjects);
  const createProj = useServerFn(createProject);

  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: () => projectsFn() });
  const invitesFn = useServerFn(listMyProjectInvites);
  const invitesQ = useQuery({ queryKey: ["project-invites-me"], queryFn: () => invitesFn() });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const projects = projectsQ.data ?? [];
  const selected = projects.find((p) => p.id === selectedId) ?? projects[0] ?? null;
  const activeId = selected?.id ?? null;

  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [newProjDeadline, setNewProjDeadline] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const createProjectMut = useMutation({
    mutationFn: (v: { name: string; description?: string; deadline: string | null }) =>
      createProj({
        data: { name: v.name, description: v.description || null, deadline: v.deadline },
      }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setNewProjName("");
      setNewProjDesc("");
      setNewProjDeadline("");
      setCreateDialogOpen(false);
      setSelectedId(row?.id ?? null);
      toast.success("Project created");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create project"),
  });

  if (projectsQ.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading your workspace projects…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(invitesQ.data ?? []).length > 0 && (
        <InviteInbox
          invites={invitesQ.data ?? []}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["project-invites-me"] });
            qc.invalidateQueries({ queryKey: ["projects"] });
          }}
        />
      )}

      {/* Project selector & creation bar */}
      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base font-semibold">Your Projects</h3>
            <p className="text-xs text-muted-foreground">
              Select a project or create a new one to organise tasks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground shadow-sm">
                  <Plus className="h-4 w-4 mr-1" /> New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Organise team members, track deliverables, and manage deadlines.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <Label htmlFor="proj-name">Project Name *</Label>
                    <Input
                      id="proj-name"
                      value={newProjName}
                      onChange={(e) => setNewProjName(e.target.value)}
                      placeholder="e.g. POPIA Compliance & Privacy Audit"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="proj-desc">Description (optional)</Label>
                    <Textarea
                      id="proj-desc"
                      value={newProjDesc}
                      onChange={(e) => setNewProjDesc(e.target.value)}
                      placeholder="Brief overview of project goals..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="proj-deadline">Target Deadline (optional)</Label>
                    <Input
                      id="proj-deadline"
                      type="date"
                      value={newProjDeadline}
                      onChange={(e) => setNewProjDeadline(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!newProjName.trim() || createProjectMut.isPending}
                    onClick={() =>
                      createProjectMut.mutate({
                        name: newProjName.trim(),
                        description: newProjDesc.trim() || undefined,
                        deadline: newProjDeadline || null,
                      })
                    }
                  >
                    {createProjectMut.isPending && (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    )}
                    Create Project
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No projects yet. Create your first project to start planning tasks and assigning
              members.
            </p>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create Project
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "text-sm rounded-full border px-3.5 py-1.5 transition-all font-medium",
                  p.id === activeId
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {p.name}
                {p.deadline && (
                  <span className="ml-2 text-xs opacity-80">
                    ·{" "}
                    {new Date(p.deadline + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ProjectPanel
          key={selected.id}
          project={selected}
          onProjectDeleted={() => {
            qc.invalidateQueries({ queryKey: ["projects"] });
            setSelectedId(null);
          }}
          onProjectUpdated={() => {
            qc.invalidateQueries({ queryKey: ["projects"] });
          }}
        />
      )}
    </div>
  );
}

function InviteInbox({
  invites,
  onDone,
}: {
  invites: Array<{ id: string; project_id: string; project_name: string; colour: string }>;
  onDone: () => void;
}) {
  const respond = useServerFn(respondToProjectInvite);
  const mut = useMutation({
    mutationFn: (v: { inviteId: string; accept: boolean; colour?: string }) => respond({ data: v }),
    onSuccess: (r) => {
      toast.success(r.accepted ? "Joined project" : "Invite declined");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
      <div className="text-sm font-semibold flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" /> You have {invites.length} pending project
        invite{invites.length === 1 ? "" : "s"}
      </div>
      <ul className="space-y-2">
        {invites.map((inv) => (
          <li
            key={inv.id}
            className="flex items-center gap-3 flex-wrap rounded-lg bg-card/60 p-2.5 border border-border/80"
          >
            <span
              className="inline-block h-3.5 w-3.5 rounded-full"
              style={{ backgroundColor: inv.colour }}
            />
            <span className="text-sm font-medium flex-1">{inv.project_name}</span>
            <Button
              size="sm"
              onClick={() => mut.mutate({ inviteId: inv.id, accept: true, colour: inv.colour })}
              disabled={mut.isPending}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => mut.mutate({ inviteId: inv.id, accept: false })}
              disabled={mut.isPending}
            >
              Decline
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProjectPanel({
  project,
  onProjectDeleted,
  onProjectUpdated,
}: {
  project: { id: string; name: string; description: string | null; deadline: string | null };
  onProjectDeleted: () => void;
  onProjectUpdated: () => void;
}) {
  const qc = useQueryClient();
  const projectId = project.id;

  const membersFn = useServerFn(listMembers);
  const tasksFn = useServerFn(listTasks);
  const invitesFn = useServerFn(listProjectInvites);
  const updateProjFn = useServerFn(updateProject);
  const deleteProjFn = useServerFn(deleteProject);

  const membersQ = useQuery({
    queryKey: ["members", projectId],
    queryFn: () => membersFn({ data: { projectId } }),
  });
  const tasksQ = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => tasksFn({ data: { projectId } }),
  });
  const projInvitesQ = useQuery({
    queryKey: ["invites", projectId],
    queryFn: () => invitesFn({ data: { projectId } }),
  });

  const members = membersQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const invites = projInvitesQ.data ?? [];

  // Project Settings Dialog State
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDesc, setEditDesc] = useState(project.description ?? "");
  const [editDeadline, setEditDeadline] = useState(project.deadline ?? "");

  const updateProjMut = useMutation({
    mutationFn: () =>
      updateProjFn({
        data: {
          id: projectId,
          name: editName.trim(),
          description: editDesc.trim() || null,
          deadline: editDeadline || null,
        },
      }),
    onSuccess: () => {
      toast.success("Project updated");
      setEditOpen(false);
      onProjectUpdated();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  const deleteProjMut = useMutation({
    mutationFn: () => deleteProjFn({ data: { id: projectId } }),
    onSuccess: () => {
      toast.success("Project deleted");
      setEditOpen(false);
      onProjectDeleted();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    qc.invalidateQueries({ queryKey: ["members", projectId] });
    qc.invalidateQueries({ queryKey: ["invites", projectId] });
  };

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const overdueCount = tasks.filter(
    (t) => t.status !== "done" && t.due_date && (daysUntil(t.due_date) ?? 0) < 0,
  ).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Project header card */}
      <div className="rounded-xl border border-border bg-card/60 p-5 shadow-card backdrop-blur">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight">{project.name}</h2>
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Settings2 className="h-3.5 w-3.5 mr-1" /> Settings
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Project Settings</DialogTitle>
                    <DialogDescription>
                      Edit project metadata or delete this project.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="space-y-1">
                      <Label htmlFor="edit-name">Project Name</Label>
                      <Input
                        id="edit-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-desc">Description</Label>
                      <Textarea
                        id="edit-desc"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-deadline">Deadline</Label>
                      <Input
                        id="edit-deadline"
                        type="date"
                        value={editDeadline}
                        onChange={(e) => setEditDeadline(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter className="flex items-center justify-between w-full sm:justify-between">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete project "${project.name}" and all its tasks?`)) {
                          deleteProjMut.mutate();
                        }
                      }}
                      disabled={deleteProjMut.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Project
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={!editName.trim() || updateProjMut.isPending}
                        onClick={() => updateProjMut.mutate()}
                      >
                        {updateProjMut.isPending && (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {project.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{project.description}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
              <span>
                {tasks.length} task{tasks.length === 1 ? "" : "s"}
              </span>
              <span>· {doneCount} completed</span>
              {overdueCount > 0 && (
                <span className="text-rose-500 font-medium inline-flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> {overdueCount} overdue
                </span>
              )}
              {project.deadline && (
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Target:{" "}
                  {new Date(project.deadline + "T00:00:00").toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-[200px] max-w-sm space-y-1.5 self-center">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="font-semibold text-foreground">{pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full gradient-primary transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* People & Members Section */}
      <MembersSection
        projectId={projectId}
        members={members}
        invites={invites}
        onChange={invalidate}
      />

      {/* Tasks Section with Filter, AI Generator, and Full CRUD */}
      <TasksSection
        projectId={projectId}
        projectName={project.name}
        projectDescription={project.description ?? ""}
        tasks={tasks}
        members={members}
        onChange={invalidate}
      />
    </div>
  );
}

function MembersSection({
  projectId,
  members,
  invites,
  onChange,
}: {
  projectId: string;
  members: Awaited<ReturnType<ReturnType<typeof useServerFn<typeof listMembers>>>>;
  invites: Awaited<ReturnType<ReturnType<typeof useServerFn<typeof listProjectInvites>>>>;
  onChange: () => void;
}) {
  const addPh = useServerFn(addPlaceholderMember);
  const updColour = useServerFn(updateMemberColour);
  const rm = useServerFn(removeMember);
  const invite = useServerFn(inviteToProject);
  const revoke = useServerFn(revokeProjectInvite);

  const [phName, setPhName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const usedColours = [
    ...members.map((m) => m.colour),
    ...invites.filter((i) => i.status === "pending").map((i) => i.colour),
  ];
  const [nextColour, setNextColour] = useState(pickNextColour(usedColours));

  const addPhMut = useMutation({
    mutationFn: () => addPh({ data: { projectId, name: phName.trim(), colour: nextColour } }),
    onSuccess: () => {
      setPhName("");
      setNextColour(pickNextColour([...usedColours, nextColour]));
      toast.success("Member added");
      onChange();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const inviteMut = useMutation({
    mutationFn: () =>
      invite({ data: { projectId, email: inviteEmail.trim(), colour: nextColour } }),
    onSuccess: () => {
      setInviteEmail("");
      setNextColour(pickNextColour([...usedColours, nextColour]));
      toast.success("Invite sent");
      onChange();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="rounded-xl border border-border bg-card/50 p-5 space-y-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Team & Collaborators</h3>
        <span className="text-xs text-muted-foreground">
          {members.length} member{members.length === 1 ? "" : "s"}
          {invites.filter((i) => i.status === "pending").length > 0 &&
            ` · ${invites.filter((i) => i.status === "pending").length} pending`}
        </span>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2 text-xs"
          >
            <MemberAvatar
              colour={m.colour}
              label={m.profile?.display_name ?? m.placeholder_name ?? "?"}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate text-foreground">
                {m.profile?.display_name ?? m.placeholder_name}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {m.profile?.email ?? (m.user_id ? "Signed-in member" : "Placeholder")}
                {m.role === "owner" && " · Owner"}
              </div>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <button
                  className="inline-flex h-6 w-6 shrink-0 rounded-full ring-1 ring-border hover:ring-foreground transition"
                  style={{ backgroundColor: m.colour }}
                  aria-label="Change colour"
                />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Member Colour</DialogTitle>
                </DialogHeader>
                <ColourPicker
                  value={m.colour}
                  onChange={async (c) => {
                    await updColour({ data: { memberId: m.id, colour: c } });
                    toast.success("Colour updated");
                    onChange();
                  }}
                />
              </DialogContent>
            </Dialog>

            {m.role !== "owner" && (
              <button
                onClick={async () => {
                  if (!confirm("Remove this member from project?")) return;
                  await rm({ data: { memberId: m.id } });
                  toast.success("Member removed");
                  onChange();
                }}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove member"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}

        {invites
          .filter((i) => i.status === "pending")
          .map((i) => (
            <li
              key={i.id}
              className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background/30 px-3 py-2 text-xs"
            >
              <MemberAvatar colour={i.colour} label={i.email} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-foreground">{i.email}</div>
                <div className="text-[11px] text-amber-500">Invite Pending</div>
              </div>
              <button
                onClick={async () => {
                  await revoke({ data: { inviteId: i.id } });
                  toast.success("Invite revoked");
                  onChange();
                }}
                className="text-[11px] text-muted-foreground hover:text-destructive"
              >
                Revoke
              </button>
            </li>
          ))}
      </ul>

      {/* Add member / invite form */}
      <div className="space-y-3 pt-3 border-t border-border/60">
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span>Member colour:</span>
          <ColourPicker value={nextColour} onChange={setNextColour} size="sm" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex gap-2">
            <Input
              value={phName}
              onChange={(e) => setPhName(e.target.value)}
              placeholder="Add name (placeholder)"
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === "Enter" && phName.trim() && addPhMut.mutate()}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs shrink-0"
              disabled={!phName.trim() || addPhMut.isPending}
              onClick={() => addPhMut.mutate()}
            >
              Add
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Invite collaborator by email"
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === "Enter" && inviteEmail.trim() && inviteMut.mutate()}
            />
            <Button
              size="sm"
              className="h-8 text-xs shrink-0"
              disabled={!inviteEmail.trim() || inviteMut.isPending}
              onClick={() => inviteMut.mutate()}
            >
              Invite
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberAvatar({ colour, label }: { colour: string; label: string }) {
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-xs"
      style={{ backgroundColor: colour, color: contrastText(colour) }}
      aria-hidden
    >
      {initials(label)}
    </span>
  );
}

function TasksSection({
  projectId,
  projectName,
  projectDescription,
  tasks,
  members,
  onChange,
}: {
  projectId: string;
  projectName: string;
  projectDescription: string;
  tasks: Awaited<ReturnType<ReturnType<typeof useServerFn<typeof listTasks>>>>;
  members: Awaited<ReturnType<ReturnType<typeof useServerFn<typeof listMembers>>>>;
  onChange: () => void;
}) {
  const create = useServerFn(createTask);
  const batchCreate = useServerFn(createBatchTasks);
  const update = useServerFn(updateTask);
  const del = useServerFn(deleteTask);
  const aiGenerateFn = useServerFn(generateProjectTasks);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("All");

  // Inline Quick Add State
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [category, setCategory] = useState("General");
  const [assignee, setAssignee] = useState<string>("__u");

  // Task Edit Modal State
  const [editingTask, setEditingTask] = useState<(typeof tasks)[number] | null>(null);

  // AI Task Generator Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiGoal, setAiGoal] = useState("");
  const [aiTaskCount, setAiTaskCount] = useState(5);
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState<
    Array<{
      title: string;
      description: string | null;
      category: string;
      priority: Priority;
      dueDate: string | null;
    }>
  >([]);

  const memberById = useMemo(() => {
    const map = new Map<string, (typeof members)[number]>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const categories = useMemo(() => {
    const set = new Set<string>(["General", "Planning", "Execution", "Design", "QA", "Compliance"]);
    for (const t of tasks) if (t.category) set.add(t.category);
    return Array.from(set);
  }, [tasks]);

  const addMut = useMutation({
    mutationFn: () =>
      create({
        data: {
          projectId,
          title: title.trim(),
          category: category || "General",
          priority,
          dueDate: dueDate || null,
          assigneeMemberId: assignee === "__u" ? null : assignee,
        },
      }),
    onSuccess: () => {
      setTitle("");
      setDueDate("");
      toast.success("Task added");
      onChange();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add task"),
  });

  const updateMut = useMutation({
    mutationFn: (v: {
      id: string;
      title?: string;
      description?: string | null;
      category?: string | null;
      priority?: Priority;
      status?: Status;
      remindersEnabled?: boolean;
      dueDate?: string | null;
      assigneeMemberId?: string | null;
    }) => update({ data: v }),
    onSuccess: () => {
      setEditingTask(null);
      toast.success("Task updated");
      onChange();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update task"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      setEditingTask(null);
      toast.success("Task deleted");
      onChange();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete task"),
  });

  const generateAiTasksMut = useMutation({
    mutationFn: () =>
      aiGenerateFn({
        data: {
          goal: aiGoal || `Complete deliverables for ${projectName}`,
          projectContext: projectDescription,
          count: aiTaskCount,
        },
      }),
    onSuccess: (res) => {
      setAiGeneratedTasks(res.tasks);
      toast.success(`Generated ${res.tasks.length} tasks`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "AI generation failed"),
  });

  const saveAiTasksMut = useMutation({
    mutationFn: () =>
      batchCreate({
        data: {
          projectId,
          tasks: aiGeneratedTasks,
        },
      }),
    onSuccess: () => {
      setAiModalOpen(false);
      setAiGeneratedTasks([]);
      setAiGoal("");
      toast.success("AI tasks added to project!");
      onChange();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add tasks"),
  });

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchCategory = t.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCategory) return false;
      }
      if (selectedCategory !== "All" && t.category !== selectedCategory) return false;
      if (selectedPriority !== "All" && (t.priority ?? "medium") !== selectedPriority) return false;
      if (selectedAssignee !== "All") {
        if (selectedAssignee === "__u" && t.assignee_member_id) return false;
        if (selectedAssignee !== "__u" && t.assignee_member_id !== selectedAssignee) return false;
      }
      return true;
    });
  }, [tasks, searchQuery, selectedCategory, selectedPriority, selectedAssignee]);

  const columns: Record<Status, typeof tasks> = { todo: [], in_progress: [], done: [] };
  for (const t of filteredTasks) {
    const s = (t.status as Status) || "todo";
    if (columns[s]) columns[s].push(t);
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-5 space-y-5 shadow-card backdrop-blur">
      {/* Action header with AI button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold">Tasks Pipeline</h3>
          <p className="text-xs text-muted-foreground">
            Manage tasks, assign team members, and track priorities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Task Plan Generator Dialog */}
          <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                <Sparkles className="h-4 w-4 mr-1.5" /> AI Task Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> AI Goal Breakdown & Task Plan
                </DialogTitle>
                <DialogDescription>
                  Enter a project milestone or goal, and AI will generate an action plan with tasks,
                  priorities, and deadlines.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-goal">Project Goal or Milestone</Label>
                  <Input
                    id="ai-goal"
                    value={aiGoal}
                    onChange={(e) => setAiGoal(e.target.value)}
                    placeholder={`e.g. Implement South African POPIA compliance & security audit`}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="ai-count" className="text-xs">
                    Number of tasks to generate:
                  </Label>
                  <Select
                    value={String(aiTaskCount)}
                    onValueChange={(v) => setAiTaskCount(Number(v))}
                  >
                    <SelectTrigger id="ai-count" className="w-24 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Tasks</SelectItem>
                      <SelectItem value="5">5 Tasks</SelectItem>
                      <SelectItem value="8">8 Tasks</SelectItem>
                      <SelectItem value="10">10 Tasks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => generateAiTasksMut.mutate()}
                  disabled={generateAiTasksMut.isPending}
                  className="w-full gradient-primary text-primary-foreground"
                >
                  {generateAiTasksMut.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Action Plan
                </Button>

                {aiGeneratedTasks.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto pt-2 border-t border-border">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Generated Tasks ({aiGeneratedTasks.length})
                    </div>
                    {aiGeneratedTasks.map((t, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-border bg-background/50 p-2.5 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">{t.title}</span>
                          <Badge variant="outline" className={PRIORITY_STYLE[t.priority]}>
                            {PRIORITY_LABEL[t.priority]}
                          </Badge>
                        </div>
                        {t.description && (
                          <p className="text-muted-foreground text-[11px]">{t.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px] h-4">
                            {t.category}
                          </Badge>
                          {t.dueDate && <span>Due in {daysUntil(t.dueDate)}d</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setAiModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={aiGeneratedTasks.length === 0 || saveAiTasksMut.isPending}
                  onClick={() => saveAiTasksMut.mutate()}
                >
                  {saveAiTasksMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Add All ({aiGeneratedTasks.length}) to Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Add Bar */}
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-[1fr_130px_120px_140px_130px_auto] bg-background/40 p-3 rounded-lg border border-border/80">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title..."
          className="h-8 text-xs"
          onKeyDown={(e) => e.key === "Enter" && title.trim() && addMut.mutate()}
        />

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={(v: Priority) => setPriority(v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => (
              <SelectItem key={p} value={p} className="text-xs">
                {PRIORITY_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Assign to" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__u" className="text-xs">
              Unassigned
            </SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: m.colour }}
                  />
                  {m.profile?.display_name ?? m.placeholder_name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-8 text-xs"
          aria-label="Due date"
        />

        <Button
          size="sm"
          className="h-8 text-xs"
          disabled={!title.trim() || addMut.isPending}
          onClick={() => addMut.mutate()}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground">Category:</span>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground">Priority:</span>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground">Assignee:</span>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="__u">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.profile?.display_name ?? m.placeholder_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Kanban status columns */}
      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map((s) => (
          <div key={s} className="space-y-2 rounded-lg bg-muted/20 p-2 border border-border/50">
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {STATUS_LABEL[s]}
              </span>
              <Badge variant="secondary" className="text-xs font-semibold">
                {columns[s].length}
              </Badge>
            </div>

            <ul className="space-y-2 min-h-[120px]">
              {columns[s].map((t) => {
                const member = t.assignee_member_id ? memberById.get(t.assignee_member_id) : null;
                const dd = daysUntil(t.due_date);
                const overdue = dd != null && dd < 0 && s !== "done";
                const soon = dd != null && dd >= 0 && dd <= 2 && s !== "done";
                const pri = (t.priority as Priority) || "medium";

                return (
                  <li
                    key={t.id}
                    className={cn(
                      "group relative rounded-lg border border-border/80 bg-card p-3 space-y-2.5 shadow-xs transition-all hover:border-primary/50 hover:shadow-card cursor-pointer",
                      overdue && "border-rose-500/50 bg-rose-500/5",
                      soon && "border-amber-500/50",
                      s === "done" && "opacity-75",
                    )}
                    onClick={() => setEditingTask(t)}
                  >
                    {/* Header: Title + Priority */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 font-medium text-sm text-foreground leading-snug">
                        {t.title}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] uppercase tracking-wider", PRIORITY_STYLE[pri])}
                      >
                        {PRIORITY_LABEL[pri]}
                      </Badge>
                    </div>

                    {/* Description preview */}
                    {t.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    )}

                    {/* Metadata tags */}
                    <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                      {t.category && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4.5 font-normal"
                        >
                          {t.category}
                        </Badge>
                      )}

                      {member ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            backgroundColor: member.colour,
                            color: contrastText(member.colour),
                          }}
                        >
                          {initials(member.profile?.display_name ?? member.placeholder_name ?? "?")}
                          <span className="opacity-90 max-w-[80px] truncate">
                            {member.profile?.display_name ?? member.placeholder_name}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Unassigned</span>
                      )}

                      {t.due_date && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] border",
                            overdue
                              ? "border-rose-500/60 text-rose-500 bg-rose-500/10 font-semibold"
                              : soon
                                ? "border-amber-500/60 text-amber-500 bg-amber-500/10"
                                : "border-border text-muted-foreground",
                          )}
                        >
                          <Calendar className="h-3 w-3" />
                          {dd != null && dd < 0
                            ? `${Math.abs(dd)}d overdue`
                            : dd === 0
                              ? "Today"
                              : dd === 1
                                ? "Tomorrow"
                                : new Date(t.due_date + "T00:00:00").toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })}
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateMut.mutate({ id: t.id, remindersEnabled: !t.reminders_enabled });
                        }}
                        className={cn(
                          "ml-auto text-muted-foreground hover:text-foreground transition",
                          t.reminders_enabled && "text-primary",
                        )}
                        title={t.reminders_enabled ? "Reminder Enabled" : "Reminder Disabled"}
                      >
                        {t.reminders_enabled ? (
                          <Bell className="h-3.5 w-3.5" />
                        ) : (
                          <BellOff className="h-3.5 w-3.5 opacity-50" />
                        )}
                      </button>
                    </div>

                    {/* Quick Move Status Buttons */}
                    <div
                      className="flex gap-1.5 pt-1 border-t border-border/40"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {STATUSES.filter((x) => x !== s).map((x) => (
                        <button
                          key={x}
                          onClick={() => updateMut.mutate({ id: t.id, status: x })}
                          className="text-[10px] rounded border border-border/80 px-2 py-0.5 hover:bg-muted transition text-muted-foreground hover:text-foreground font-medium"
                        >
                          → {STATUS_LABEL[x]}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}

              {columns[s].length === 0 && (
                <li className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border/60 rounded-lg">
                  No {STATUS_LABEL[s].toLowerCase()} tasks
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>

      {/* Task Details / Edit Dialog */}
      {editingTask && (
        <TaskEditDialog
          task={editingTask}
          members={members}
          categories={categories}
          onClose={() => setEditingTask(null)}
          onSave={(patch) => updateMut.mutate({ id: editingTask.id, ...patch })}
          onDelete={() => deleteMut.mutate(editingTask.id)}
          saving={updateMut.isPending}
          deleting={deleteMut.isPending}
        />
      )}
    </div>
  );
}

function TaskEditDialog({
  task,
  members,
  categories,
  onClose,
  onSave,
  onDelete,
  saving,
  deleting,
}: {
  task: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    priority?: string;
    assignee_member_id: string | null;
    due_date: string | null;
    status: string;
    reminders_enabled: boolean;
  };
  members: Awaited<ReturnType<ReturnType<typeof useServerFn<typeof listMembers>>>>;
  categories: string[];
  onClose: () => void;
  onSave: (patch: {
    title?: string;
    description?: string | null;
    category?: string | null;
    priority?: Priority;
    assigneeMemberId?: string | null;
    dueDate?: string | null;
    status?: Status;
    remindersEnabled?: boolean;
  }) => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description ?? "");
  const [category, setCategory] = useState(task.category ?? "General");
  const [priority, setPriority] = useState<Priority>((task.priority as Priority) || "medium");
  const [assignee, setAssignee] = useState<string>(task.assignee_member_id ?? "__u");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [status, setStatus] = useState<Status>((task.status as Status) || "todo");
  const [reminders, setReminders] = useState(task.reminders_enabled);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-primary" /> Edit Task Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="task-title">Task Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="task-desc">Description & Notes</Label>
            <Textarea
              id="task-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Add extra context, deliverables, or checklist..."
              rows={3}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v: Priority) => setPriority(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__u">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: m.colour }}
                        />
                        {m.profile?.display_name ?? m.placeholder_name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: Status) => setStatus(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 items-center">
            <div className="space-y-1">
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-4 px-1">
              <Label className="text-xs cursor-pointer">Reminder Alerts</Label>
              <button
                type="button"
                onClick={() => setReminders(!reminders)}
                className={cn(
                  "p-1.5 rounded-md border transition",
                  reminders
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "text-muted-foreground border-border",
                )}
              >
                {reminders ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Delete this task?")) onDelete();
            }}
            disabled={deleting}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!title.trim() || saving}
              onClick={() =>
                onSave({
                  title: title.trim(),
                  description: desc.trim() || null,
                  category,
                  priority,
                  assigneeMemberId: assignee === "__u" ? null : assignee,
                  dueDate: dueDate || null,
                  status,
                  remindersEnabled: reminders,
                })
              }
            >
              {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Save Task
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
