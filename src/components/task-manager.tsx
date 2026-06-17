import { useMemo, useState } from "react";
import { AlertCircle, Calendar, Check, Plus, Tag, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { MicButton } from "@/components/mic-button";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  category: string;
  assignee: string | null;
  dueDate?: string | null;
  done: boolean;
  createdAt: number;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const parseDueDate = (s: string | null) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getTime();
};

const dueStatus = (s: string | null) => {
  const ts = parseDueDate(s);
  if (ts == null) return { label: null as string | null, overdue: false, soon: false };
  const today = startOfToday();
  const diffDays = Math.round((ts - today) / 86400000);
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, overdue: true, soon: false };
  if (diffDays === 0) return { label: "Due today", overdue: false, soon: true };
  if (diffDays === 1) return { label: "Due tomorrow", overdue: false, soon: true };
  if (diffDays <= 7) return { label: `In ${diffDays}d`, overdue: false, soon: true };
  return {
    label: new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    overdue: false,
    soon: false,
  };
};

const DEFAULT_CATEGORIES = ["Work", "Personal", "Urgent", "Ideas"];
const DEFAULT_MEMBERS = ["Alex", "Sam", "Jordan"];
const UNASSIGNED = "__unassigned__";
const FILTERS = ["All", "Active", "Completed"] as const;
type Filter = (typeof FILTERS)[number];

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function TaskManager() {
  const [tasks, setTasks] = useLocalStorage<Task[]>("wa.tasks", []);
  const [categories, setCategories] = useLocalStorage<string[]>(
    "wa.task-categories",
    DEFAULT_CATEGORIES,
  );
  const [members, setMembers] = useLocalStorage<string[]>(
    "wa.task-members",
    DEFAULT_MEMBERS,
  );
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Work");
  const [assignee, setAssignee] = useState<string>(UNASSIGNED);
  const [dueDate, setDueDate] = useState<string>("");
  const [newCategory, setNewCategory] = useState("");
  const [newMember, setNewMember] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeMember, setActiveMember] = useState<string>("All");

  const addTask = () => {
    const t = title.trim();
    if (!t) return;
    setTasks([
      {
        id: crypto.randomUUID(),
        title: t,
        category,
        assignee: assignee === UNASSIGNED ? null : assignee,
        dueDate: dueDate || null,
        done: false,
        createdAt: Date.now(),
      },
      ...tasks,
    ]);
    setTitle("");
    setDueDate("");
  };

  const toggle = (id: string) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const remove = (id: string) => setTasks(tasks.filter((t) => t.id !== id));

  const reassign = (id: string, value: string) =>
    setTasks(
      tasks.map((t) =>
        t.id === id
          ? { ...t, assignee: value === UNASSIGNED ? null : value }
          : t,
      ),
    );

  const addCategory = () => {
    const c = newCategory.trim();
    if (!c || categories.includes(c)) return;
    setCategories([...categories, c]);
    setCategory(c);
    setNewCategory("");
  };

  const addMember = () => {
    const m = newMember.trim();
    if (!m || members.includes(m)) return;
    setMembers([...members, m]);
    setNewMember("");
  };

  const removeMember = (m: string) => {
    setMembers(members.filter((x) => x !== m));
    setTasks(
      tasks.map((t) => (t.assignee === m ? { ...t, assignee: null } : t)),
    );
    if (activeMember === m) setActiveMember("All");
    if (assignee === m) setAssignee(UNASSIGNED);
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (activeCategory !== "All" && t.category !== activeCategory) return false;
      if (activeMember !== "All") {
        if (activeMember === UNASSIGNED && t.assignee) return false;
        if (activeMember !== UNASSIGNED && t.assignee !== activeMember) return false;
      }
      if (filter === "Active" && t.done) return false;
      if (filter === "Completed" && !t.done) return false;
      return true;
    });
  }, [tasks, filter, activeCategory, activeMember]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    return { total, done, active: total - done };
  }, [tasks]);

  return (
    <div className="rounded-xl border border-border bg-card/50 backdrop-blur p-5 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Your tasks</h3>
          <p className="text-sm text-muted-foreground">
            {stats.active} active · {stats.done} completed · {stats.total} total
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-border p-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Add task */}
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-[1fr_140px_160px_auto_auto]">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a new task… or click the mic"
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger>
            <SelectValue placeholder="Assign to" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {members.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 sm:contents">
          <MicButton onAppend={(chunk) => setTitle((t) => (t ? t + " " : "") + chunk)} />
          <Button onClick={addTask} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>


      {/* Categories */}
      <div className="flex flex-wrap items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        {["All", ...categories].map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              activeCategory === c
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
        <div className="flex items-center gap-1 ml-auto">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category"
            className="h-8 w-36 text-xs"
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
          />
          <Button size="sm" variant="outline" onClick={addCategory}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Team members */}
      <div className="flex flex-wrap items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => setActiveMember("All")}
          className={cn(
            "text-xs px-2.5 py-1 rounded-full border transition-colors",
            activeMember === "All"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          Everyone
        </button>
        <button
          onClick={() => setActiveMember(UNASSIGNED)}
          className={cn(
            "text-xs px-2.5 py-1 rounded-full border transition-colors",
            activeMember === UNASSIGNED
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          Unassigned
        </button>
        {members.map((m) => (
          <span
            key={m}
            className={cn(
              "group/member inline-flex items-center gap-1 text-xs pl-1 pr-1 py-0.5 rounded-full border transition-colors",
              activeMember === m
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <button
              onClick={() => setActiveMember(m)}
              className="inline-flex items-center gap-1.5 pl-1 pr-1.5 py-0.5"
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium",
                  activeMember === m
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {initials(m)}
              </span>
              {m}
            </button>
            <button
              onClick={() => removeMember(m)}
              aria-label={`Remove ${m}`}
              className="opacity-0 group-hover/member:opacity-100 hover:text-destructive transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1 ml-auto">
          <Input
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
            placeholder="Add team member"
            className="h-8 w-40 text-xs"
            onKeyDown={(e) => e.key === "Enter" && addMember()}
          />
          <Button size="sm" variant="outline" onClick={addMember}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* List */}
      <ul className="space-y-2">
        {filtered.length === 0 && (
          <li className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg">
            No tasks here yet. Add one above to get started.
          </li>
        )}
        {filtered.map((t) => (
          <li
            key={t.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5 group transition-colors",
              t.done && "opacity-60",
            )}
          >
            <Checkbox
              checked={t.done}
              onCheckedChange={() => toggle(t.id)}
              aria-label={`Mark ${t.title} complete`}
            />
            <span
              className={cn(
                "flex-1 text-sm",
                t.done && "line-through text-muted-foreground",
              )}
            >
              {t.title}
            </span>
            <Select
              value={t.assignee ?? UNASSIGNED}
              onValueChange={(v) => reassign(t.id, v)}
            >
              <SelectTrigger
                className="h-7 w-auto gap-1.5 border-dashed text-xs px-2"
                aria-label="Assignee"
              >
                {t.assignee ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                      {initials(t.assignee)}
                    </span>
                    {t.assignee}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="text-xs">
              {t.category}
            </Badge>
            <button
              onClick={() => remove(t.id)}
              className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {t.done && <Check className="h-4 w-4 text-green-400 sr-only" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
