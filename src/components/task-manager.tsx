import { useMemo, useState } from "react";
import { Check, Plus, Trash2, Tag } from "lucide-react";
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
  done: boolean;
  createdAt: number;
};

const DEFAULT_CATEGORIES = ["Work", "Personal", "Urgent", "Ideas"];
const FILTERS = ["All", "Active", "Completed"] as const;
type Filter = (typeof FILTERS)[number];

export function TaskManager() {
  const [tasks, setTasks] = useLocalStorage<Task[]>("wa.tasks", []);
  const [categories, setCategories] = useLocalStorage<string[]>(
    "wa.task-categories",
    DEFAULT_CATEGORIES,
  );
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Work");
  const [newCategory, setNewCategory] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const addTask = () => {
    const t = title.trim();
    if (!t) return;
    setTasks([
      {
        id: crypto.randomUUID(),
        title: t,
        category,
        done: false,
        createdAt: Date.now(),
      },
      ...tasks,
    ]);
    setTitle("");
  };

  const toggle = (id: string) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const remove = (id: string) => setTasks(tasks.filter((t) => t.id !== id));

  const addCategory = () => {
    const c = newCategory.trim();
    if (!c || categories.includes(c)) return;
    setCategories([...categories, c]);
    setCategory(c);
    setNewCategory("");
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (activeCategory !== "All" && t.category !== activeCategory) return false;
      if (filter === "Active" && t.done) return false;
      if (filter === "Completed" && !t.done) return false;
      return true;
    });
  }, [tasks, filter, activeCategory]);

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
      <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto_auto]">
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
        <MicButton onAppend={(chunk) => setTitle((t) => (t ? t + " " : "") + chunk)} />
        <Button onClick={addTask}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
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
