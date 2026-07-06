import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Calendar, Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MEMBER_PALETTE, pickNextColour, contrastText } from "./palette";
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
  updateTask,
  deleteTask,
} from "@/lib/tasks.functions";

type Status = "todo" | "in_progress" | "done";
const STATUS_LABEL: Record<Status, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};
const STATUSES: Status[] = ["todo", "in_progress", "done"];

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
  const [newProjDeadline, setNewProjDeadline] = useState("");
  const createProjectMut = useMutation({
    mutationFn: (v: { name: string; deadline: string | null }) =>
      createProj({ data: { name: v.name, deadline: v.deadline } }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setNewProjName("");
      setNewProjDeadline("");
      setSelectedId(row?.id ?? null);
      toast.success("Project created");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (projectsQ.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your projects…
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

      {/* Project list + new */}
      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-base font-semibold">Your projects</h3>
          <div className="flex items-center gap-2">
            <Input
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              placeholder="New project name"
              className="h-9 w-56"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newProjName.trim())
                  createProjectMut.mutate({ name: newProjName.trim(), deadline: newProjDeadline || null });
              }}
            />
            <Input
              type="date"
              value={newProjDeadline}
              onChange={(e) => setNewProjDeadline(e.target.value)}
              className="h-9 w-40"
              aria-label="Project deadline"
            />
            <Button
              size="sm"
              disabled={!newProjName.trim() || createProjectMut.isPending}
              onClick={() =>
                createProjectMut.mutate({ name: newProjName.trim(), deadline: newProjDeadline || null })
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Create
            </Button>
          </div>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No projects yet. Create one above to start planning tasks.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "text-sm rounded-full border px-3 py-1.5 transition-colors",
                  p.id === activeId
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {p.name}
                {p.deadline && (
                  <span className="ml-2 text-xs opacity-70">
                    · {new Date(p.deadline + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && <ProjectPanel key={selected.id} projectId={selected.id} projectName={selected.name} projectDeadline={selected.deadline} isOwner={selected.owner_id === undefined ? true : true} />}
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
    mutationFn: (v: { inviteId: string; accept: boolean; colour?: string }) =>
      respond({ data: v }),
    onSuccess: (r) => {
      toast.success(r.accepted ? "Joined project" : "Invite declined");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
      <div className="text-sm font-medium">You have {invites.length} project invite{invites.length === 1 ? "" : "s"}</div>
      <ul className="space-y-2">
        {invites.map((inv) => (
          <li key={inv.id} className="flex items-center gap-3 flex-wrap">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: inv.colour }}
            />
            <span className="text-sm flex-1">{inv.project_name}</span>
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
  projectId,
  projectName,
  projectDeadline,
}: {
  projectId: string;
  projectName: string;
  projectDeadline: string | null;
  isOwner: boolean;
}) {
  const qc = useQueryClient();

  const membersFn = useServerFn(listMembers);
  const tasksFn = useServerFn(listTasks);
  const invitesFn = useServerFn(listProjectInvites);

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

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    qc.invalidateQueries({ queryKey: ["members", projectId] });
    qc.invalidateQueries({ queryKey: ["invites", projectId] });
  };

  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Project header */}
      <div className="rounded-xl border border-border bg-card/50 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">{projectName}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {tasks.length} task{tasks.length === 1 ? "" : "s"} · {done} done
              {projectDeadline && (
                <>
                  {" "}
                  · Deadline{" "}
                  <span className="text-foreground">
                    {new Date(projectDeadline + "T00:00:00").toLocaleDateString()}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex-1 min-w-[180px] max-w-md">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">{pct}% complete</div>
          </div>
        </div>
      </div>

      {/* Members */}
      <MembersSection
        projectId={projectId}
        members={members}
        invites={invites}
        onChange={invalidate}
      />

      {/* Tasks */}
      <TasksSection
        projectId={projectId}
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
    <div className="rounded-xl border border-border bg-card/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">People</h3>
        <span className="text-xs text-muted-foreground">
          {members.length} member{members.length === 1 ? "" : "s"}
          {invites.filter((i) => i.status === "pending").length > 0 &&
            ` · ${invites.filter((i) => i.status === "pending").length} pending`}
        </span>
      </div>

      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2"
          >
            <MemberAvatar colour={m.colour} label={m.profile?.display_name ?? m.placeholder_name ?? "?"} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {m.profile?.display_name ?? m.placeholder_name}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {m.profile?.email ?? (m.user_id ? "Signed-in member" : "Placeholder")}
                {m.role === "owner" && " · Owner"}
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <button
                  className="inline-flex h-6 w-6 rounded-full ring-1 ring-border hover:ring-foreground transition"
                  style={{ backgroundColor: m.colour }}
                  aria-label="Change colour"
                />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Choose a colour</DialogTitle>
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
                  if (!confirm("Remove this member?")) return;
                  await rm({ data: { memberId: m.id } });
                  toast.success("Removed");
                  onChange();
                }}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove member"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
        {invites
          .filter((i) => i.status === "pending")
          .map((i) => (
            <li
              key={i.id}
              className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background/40 px-3 py-2"
            >
              <MemberAvatar colour={i.colour} label={i.email} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{i.email}</div>
                <div className="text-xs text-muted-foreground">Invite pending</div>
              </div>
              <button
                onClick={async () => {
                  await revoke({ data: { inviteId: i.id } });
                  toast.success("Invite revoked");
                  onChange();
                }}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Revoke
              </button>
            </li>
          ))}
      </ul>

      <div className="space-y-3 pt-2 border-t border-border">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Add someone new
        </div>
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Colour for the next person</div>
          <ColourPicker value={nextColour} onChange={setNextColour} size="sm" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex gap-2">
            <Input
              value={phName}
              onChange={(e) => setPhName(e.target.value)}
              placeholder="Add a name (placeholder)"
              className="h-9"
            />
            <Button
              size="sm"
              variant="outline"
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
              placeholder="Invite by email"
              className="h-9"
            />
            <Button
              size="sm"
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
      style={{ backgroundColor: colour, color: contrastText(colour) }}
      aria-hidden
    >
      {initials(label)}
    </span>
  );
}

function TasksSection({
  projectId,
  tasks,
  members,
  onChange,
}: {
  projectId: string;
  tasks: Awaited<ReturnType<ReturnType<typeof useServerFn<typeof listTasks>>>>;
  members: Awaited<ReturnType<ReturnType<typeof useServerFn<typeof listMembers>>>>;
  onChange: () => void;
}) {
  const create = useServerFn(createTask);
  const update = useServerFn(updateTask);
  const del = useServerFn(deleteTask);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState<string>("__u");

  const memberById = useMemo(() => {
    const map = new Map<string, (typeof members)[number]>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const addMut = useMutation({
    mutationFn: () =>
      create({
        data: {
          projectId,
          title: title.trim(),
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
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const updateMut = useMutation({
    mutationFn: (v: Parameters<typeof update>[0]["data"]) => update({ data: v }),
    onSuccess: onChange,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: onChange,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const columns: Record<Status, typeof tasks> = { todo: [], in_progress: [], done: [] };
  for (const t of tasks) columns[t.status as Status].push(t);

  return (
    <div className="rounded-xl border border-border bg-card/50 p-5 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-semibold">Tasks</h3>
      </div>

      {/* New task */}
      <div className="grid gap-2 sm:grid-cols-[1fr_180px_160px_auto]">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          onKeyDown={(e) => e.key === "Enter" && title.trim() && addMut.mutate()}
        />
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger>
            <SelectValue placeholder="Assign to" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__u">Unassigned</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
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
          aria-label="Due date"
        />
        <Button
          disabled={!title.trim() || addMut.isPending}
          onClick={() => addMut.mutate()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Status columns */}
      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map((s) => (
          <div key={s} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {STATUS_LABEL[s]}
              </span>
              <Badge variant="secondary" className="text-xs">
                {columns[s].length}
              </Badge>
            </div>
            <ul className="space-y-2 min-h-[80px]">
              {columns[s].map((t) => {
                const member = t.assignee_member_id ? memberById.get(t.assignee_member_id) : null;
                const dd = daysUntil(t.due_date);
                const overdue = dd != null && dd < 0 && s !== "done";
                const soon = dd != null && dd >= 0 && dd <= 2 && s !== "done";
                return (
                  <li
                    key={t.id}
                    className={cn(
                      "group rounded-lg border border-border bg-background/60 p-3 space-y-2",
                      overdue && "border-destructive/60 bg-destructive/5",
                      soon && "border-amber-500/40",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 text-sm">{t.title}</div>
                      <button
                        onClick={() => deleteMut.mutate(t.id)}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {member ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium"
                          style={{
                            backgroundColor: member.colour,
                            color: contrastText(member.colour),
                          }}
                        >
                          {initials(member.profile?.display_name ?? member.placeholder_name ?? "?")}
                          <span className="opacity-90">
                            {member.profile?.display_name ?? member.placeholder_name}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                      {t.due_date && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 border",
                            overdue
                              ? "border-destructive/60 text-destructive"
                              : soon
                                ? "border-amber-500/60 text-amber-500"
                                : "border-border text-muted-foreground",
                          )}
                        >
                          <Calendar className="h-3 w-3" />
                          {dd != null && dd < 0
                            ? `${Math.abs(dd)}d overdue`
                            : dd === 0
                              ? "Due today"
                              : dd === 1
                                ? "Tomorrow"
                                : new Date(t.due_date + "T00:00:00").toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })}
                        </span>
                      )}
                      <button
                        onClick={() =>
                          updateMut.mutate({ id: t.id, remindersEnabled: !t.reminders_enabled })
                        }
                        className={cn(
                          "ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground",
                          t.reminders_enabled && "text-primary",
                        )}
                        title={t.reminders_enabled ? "Reminder on" : "Reminder off"}
                      >
                        {t.reminders_enabled ? (
                          <Bell className="h-3.5 w-3.5" />
                        ) : (
                          <BellOff className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      {STATUSES.filter((x) => x !== s).map((x) => (
                        <button
                          key={x}
                          onClick={() => updateMut.mutate({ id: t.id, status: x })}
                          className="text-[11px] rounded border border-border px-1.5 py-0.5 hover:bg-muted transition"
                        >
                          → {STATUS_LABEL[x]}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
              {columns[s].length === 0 && (
                <li className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                  Nothing here
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// silence unused-import warnings in strict mode
void deleteProject;
void updateProject;
void MEMBER_PALETTE;
void Textarea;
void DialogFooter;
