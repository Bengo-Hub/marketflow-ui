"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, CheckSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RecordPicker, type RecordRef } from "@/components/crm/record-picker";
import { CapsuleTabs, ConfirmDialog, EmptyState, ErrorState, Field, Pager, PageHeader, ToneBadge, humanize, type Tone } from "@/components/ui-kit";
import { useCompleteTask, useDeleteTask, useSaveTask, useTasks, type TaskFilter } from "@/hooks/use-tasks";
import { TASK_PRIORITIES, type Task } from "@/lib/api/tasks";

const PRIORITY_TONE: Record<string, Tone> = { low: "neutral", normal: "info", high: "warning", urgent: "danger" };
const dueFmt = new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function TaskForm({ task, onDone }: { task?: Task; onDone: () => void }) {
  const save = useSaveTask();
  const due = task?.due_at ? new Date(task.due_at) : null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<string>(task?.priority ?? "normal");
  const [date, setDate] = useState(due ? `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}` : "");
  const [time, setTime] = useState(due ? `${pad(due.getHours())}:${pad(due.getMinutes())}` : "09:00");
  const [record, setRecord] = useState<RecordRef | null>(task ? { type: task.entity_type, id: task.entity_id, label: `${humanize(task.entity_type)} record` } : null);
  const dueAt = date ? new Date(`${date}T${time || "09:00"}:00`).toISOString() : undefined;

  return (
    <>
      <div className="space-y-4">
        <Field label="What needs doing" required htmlFor="tk-t"><Input id="tk-t" value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="For" required hint="The lead or contact this task is about.">
          <RecordPicker value={record} onChange={setRecord} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Due date" htmlFor="tk-d"><Input id="tk-d" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Time" htmlFor="tk-h"><Input id="tk-h" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Priority</p>
          <CapsuleTabs label="Priority" value={priority} onChange={setPriority} options={TASK_PRIORITIES.map((p) => ({ value: p, label: humanize(p) }))} />
        </div>
        <Field label="Notes" htmlFor="tk-n"><Textarea id="tk-n" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button
          disabled={!title.trim() || !record || save.isPending}
          onClick={() =>
            record &&
            save.mutate(
              { id: task?.id, data: { title: title.trim(), description: description.trim() || undefined, priority, due_at: dueAt, entity_type: record.type, entity_id: record.id } },
              { onSuccess: onDone },
            )
          }
        >
          {save.isPending ? "Saving..." : task ? "Save task" : "Add task"}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function TasksPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [filter, setFilter] = useState<TaskFilter>("open");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ task?: Task } | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const list = useTasks(filter, page);
  const complete = useCompleteTask();
  const del = useDeleteTask();
  const rows = list.data?.data ?? [];
  // Compared against each row's due time; render-time "now" is fine for a label.
  const [now] = useState(() => Date.now());

  const recordHref = (t: Task) => (t.entity_type === "contact" ? `/${orgSlug}/contacts/${t.entity_id}` : t.entity_type === "lead" ? `/${orgSlug}/leads/${t.entity_id}` : `/${orgSlug}/crm/deals?deal=${t.entity_id}`);

  return (
    <div className="space-y-6">
      <PageHeader icon={<CheckSquare />} title="Tasks" description="Follow-ups for your leads, contacts and deals." actions={<Button onClick={() => setEditing({})}><Plus /> Add task</Button>} />
      <CapsuleTabs<TaskFilter>
        label="Filter tasks"
        value={filter}
        onChange={(v) => { setFilter(v); setPage(1); }}
        options={[{ value: "open", label: "To do" }, { value: "in_progress", label: "In progress" }, { value: "overdue", label: "Overdue" }, { value: "done", label: "Done" }]}
      />

      <div className="glass overflow-hidden rounded-[1.25rem]">
        {list.isError && <ErrorState message="Could not load tasks." onRetry={() => void list.refetch()} />}
        {list.isLoading && <div className="space-y-2 p-4" aria-busy>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>}
        {!list.isLoading && !list.isError && rows.length === 0 && (
          <EmptyState icon={<CheckSquare />} title={filter === "overdue" ? "Nothing overdue" : filter === "done" ? "Nothing finished yet" : "No tasks here"} description="Add a task to remember a call, a delivery or a follow-up." />
        )}
        {rows.length > 0 && (
          <ul className="divide-y divide-border">
            {rows.map((t) => {
              const late = t.status !== "done" && t.due_at && Date.parse(t.due_at) < now;
              return (
                <li key={t.id} className="flex items-start gap-3 p-4">
                  {t.status !== "done" ? (
                    <button
                      type="button"
                      aria-label={`Mark "${t.title}" done`}
                      onClick={() => complete.mutate(t.id)}
                      className="group mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <Check className="h-4 w-4 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
                    </button>
                  ) : (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success text-success-foreground"><Check className="h-4 w-4" /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={t.status === "done" ? "font-medium text-muted-foreground line-through" : "font-medium"}>{t.title}</p>
                    {t.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <ToneBadge tone={PRIORITY_TONE[t.priority] ?? "neutral"}>{humanize(t.priority)}</ToneBadge>
                      {t.due_at && <span className={late ? "font-semibold text-destructive" : "text-muted-foreground"}>{late ? "Overdue since " : "Due "}{dueFmt.format(new Date(t.due_at))}</span>}
                      <Link href={recordHref(t)} className="text-primary hover:underline">Open {t.entity_type}</Link>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label="Edit task" onClick={() => setEditing({ task: t })}><Pencil /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Delete task" onClick={() => setDeleting(t)}><Trash2 className="text-destructive" /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {list.data && <div className="px-4 pb-4"><Pager page={page} limit={list.data.limit || 30} total={list.data.total} onPage={setPage} /></div>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.task ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
          {editing && <TaskForm key={editing.task?.id ?? "new"} task={editing.task} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.title}"?`}
        description="This cannot be undone."
        confirmLabel="Delete task"
        pending={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}
