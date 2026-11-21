"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  addAssignment,
  addTask,
  loadDemoState,
  markExamPrep,
  removeAssignment,
  removeTask,
  resetDemoState,
  saveDemoState,
  setAssignmentStatus,
  snapshotFromState,
  toggleNoteReviewed,
  toggleTask,
  type DemoState,
} from "@/lib/demo-store";
import type {
  AssignmentStatus,
  AssignmentType,
  PriorityItem,
  StudentOsSnapshot,
} from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function riskClass(risk: "healthy" | "watch" | "at-risk"): string {
  if (risk === "at-risk") return "text-[var(--danger)] bg-[rgba(180,35,24,0.08)]";
  if (risk === "watch") return "text-[var(--watch)] bg-[rgba(161,92,7,0.1)]";
  return "text-[var(--ok)] bg-[rgba(31,107,74,0.1)]";
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function PulseboardApp() {
  const [demoState, setDemoState] = useState<DemoState>(loadDemoState);
  const [liveData, setLiveData] = useState<StudentOsSnapshot | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(180);
  const [forceDemo, setForceDemo] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newCourseId, setNewCourseId] = useState(
    () => demoState.courses[0]?.id ?? "",
  );
  const [newDue, setNewDue] = useState(() => daysFromNow(2));
  const [newType, setNewType] = useState<AssignmentType>("Homework");
  const [newWeight, setNewWeight] = useState(10);
  const [newTask, setNewTask] = useState("");

  const demoData = useMemo(
    () => snapshotFromState(demoState, minutes),
    [demoState, minutes],
  );
  const data = forceDemo ? demoData : liveData;

  const loadFromApi = useCallback(async (dailyMinutes: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ minutes: String(dailyMinutes) });
      const res = await fetch(`/api/student-os?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Could not load Student OS snapshot");
      const json = (await res.json()) as StudentOsSnapshot & {
        warning?: string;
      };
      setLiveData(json);
      setWarning(json.warning ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleMinutesChange(next: number) {
    setMinutes(next);
    if (!forceDemo) void loadFromApi(next);
  }

  function handleToggleMode() {
    const toLive = forceDemo;
    setForceDemo(!toLive);
    setWarning(null);
    setError(null);
    if (toLive) void loadFromApi(minutes);
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const courses = demoState.courses;

  function persistDemo(next: DemoState, message: string) {
    saveDemoState(next);
    setDemoState(next);
    setToast(message);
  }

  async function updateStatus(item: PriorityItem, status: AssignmentStatus) {
    if (!data) return;
    setBusyId(item.assignment.id);
    setToast(null);

    try {
      if (forceDemo || data.mode === "demo") {
        const next = setAssignmentStatus(
          demoState,
          item.assignment.id,
          status,
        );
        persistDemo(
          next,
          status === "Submitted"
            ? "Marked submitted — priority queue updated."
            : "Marked in progress — board recalculated.",
        );
        return;
      }

      const res = await fetch("/api/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: item.assignment.id,
          status,
          mode: "notion",
        }),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      setToast(json.message ?? "Synced to Notion");
      await loadFromApi(minutes);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  function handleAddAssignment(e: FormEvent) {
    e.preventDefault();
    if (!forceDemo) return;
    if (!newTitle.trim() || !newCourseId) {
      setToast("Add a title and pick a course.");
      return;
    }

    const next = addAssignment(demoState, {
      title: newTitle,
      courseId: newCourseId,
      dueDate: newDue,
      type: newType,
      weight: newWeight,
      estimatedHours: 2,
    });
    persistDemo(next, `Added “${newTitle.trim()}” to the Student OS board.`);
    setNewTitle("");
  }

  function handleResetDemo() {
    const fresh = resetDemoState();
    setDemoState(fresh);
    setNewCourseId(fresh.courses[0]?.id ?? "");
    setToast("Demo Student OS reset to the sample semester.");
  }

  function handleDeleteAssignment(assignmentId: string, title: string) {
    persistDemo(removeAssignment(demoState, assignmentId), `Removed “${title}”.`);
  }

  function handleDeleteTask(taskId: string) {
    persistDemo(removeTask(demoState, taskId), "Task removed.");
  }

  async function syncCheckbox(
    kind: "task" | "note",
    pageId: string,
    value: boolean,
  ) {
    setBusyId(pageId);
    try {
      const res = await fetch("/api/checkbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, pageId, value }),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      setToast(json.message ?? "Synced to Notion");
      await loadFromApi(minutes);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  function handleToggleTask(taskId: string, done: boolean) {
    if (forceDemo) {
      persistDemo(
        toggleTask(demoState, taskId),
        done ? "Task reopened." : "Task done — nice.",
      );
      return;
    }
    void syncCheckbox("task", taskId, !done);
  }

  function handleToggleNote(noteId: string, reviewed: boolean) {
    if (forceDemo) {
      persistDemo(
        toggleNoteReviewed(demoState, noteId),
        reviewed ? "Note moved back to review." : "Note marked reviewed.",
      );
      return;
    }
    void syncCheckbox("note", noteId, !reviewed);
  }

  function handleAddTask(e: FormEvent) {
    e.preventDefault();
    if (!forceDemo || !newTask.trim()) return;
    persistDemo(addTask(demoState, newTask), `Added task “${newTask.trim()}”.`);
    setNewTask("");
  }

  async function handleExamPrep(
    examId: string,
    prepStatus: "Not started" | "Reviewing" | "Ready",
  ) {
    if (!forceDemo) return;
    const next = markExamPrep(demoState, examId, prepStatus);
    persistDemo(next, `Exam prep set to ${prepStatus}.`);
  }

  return (
    <section id="app" className="mx-auto w-full max-w-6xl px-5 pb-24 pt-6 sm:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">
            Live board
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-[var(--ink)] sm:text-4xl">
            Today&apos;s mission from Student OS
          </h2>
          <p className="mt-2 max-w-xl text-[var(--ink-soft)]">
            Fully interactive demo: add tasks, start work, mark submitted — the
            priority queue, study plan, and course health all update instantly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-3 py-2 text-sm">
            <span className="text-[var(--ink-soft)]">Study window</span>
            <select
              className="bg-transparent font-semibold outline-none"
              value={minutes}
              onChange={(e) => handleMinutesChange(Number(e.target.value))}
            >
              <option value={90}>1.5h</option>
              <option value={180}>3h</option>
              <option value={240}>4h</option>
              <option value={360}>6h</option>
            </select>
          </label>
          <button
            type="button"
            onClick={handleToggleMode}
            className="rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm font-semibold transition hover:border-[var(--teal)]"
          >
            {forceDemo ? "Using demo data" : "Using Notion sync"}
          </button>
          {forceDemo ? (
            <button
              type="button"
              onClick={handleResetDemo}
              className="rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm font-semibold transition hover:border-[var(--teal)]"
            >
              Reset demo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void loadFromApi(minutes)}
              className="rounded-full bg-[var(--teal)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--teal-deep)]"
            >
              Refresh Notion
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="mb-4 rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm text-[var(--ink-soft)]">
          {toast}
        </div>
      )}
      {warning && (
        <div className="mb-4 rounded-2xl border border-[rgba(161,92,7,0.25)] bg-[rgba(161,92,7,0.08)] px-4 py-3 text-sm text-[var(--watch)]">
          {warning}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-2xl border border-[rgba(180,35,24,0.25)] bg-[rgba(180,35,24,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {forceDemo && demoState && (
        <form
          onSubmit={handleAddAssignment}
          className="mb-8 rounded-[28px] border border-[var(--line)] bg-white/80 p-5 shadow-[var(--shadow)] sm:p-6"
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-[family-name:var(--font-fraunces)] text-xl">
                Quick add to Student OS
              </h3>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Drop a new assignment into the demo semester — ranking updates
                immediately.
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.7fr_auto]">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Assignment title"
              className="rounded-2xl border border-[var(--line)] bg-[rgba(243,239,230,0.7)] px-4 py-3 text-sm outline-none focus:border-[var(--teal)]"
              required
            />
            <select
              value={newCourseId}
              onChange={(e) => setNewCourseId(e.target.value)}
              className="rounded-2xl border border-[var(--line)] bg-[rgba(243,239,230,0.7)] px-4 py-3 text-sm outline-none"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              className="rounded-2xl border border-[var(--line)] bg-[rgba(243,239,230,0.7)] px-4 py-3 text-sm outline-none"
              required
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as AssignmentType)}
              className="rounded-2xl border border-[var(--line)] bg-[rgba(243,239,230,0.7)] px-4 py-3 text-sm outline-none"
            >
              {(
                [
                  "Homework",
                  "Essay",
                  "Project",
                  "Quiz",
                  "Reading",
                  "Exam prep",
                ] as AssignmentType[]
              ).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={100}
              value={newWeight}
              onChange={(e) => setNewWeight(Number(e.target.value) || 10)}
              className="rounded-2xl border border-[var(--line)] bg-[rgba(243,239,230,0.7)] px-4 py-3 text-sm outline-none"
              aria-label="Weight percent"
            />
            <button
              type="submit"
              className="rounded-2xl bg-[var(--teal)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--teal-deep)]"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {loading && !data ? (
        <div className="rounded-[28px] border border-[var(--line)] bg-white/60 p-10 text-[var(--ink-soft)]">
          Reading your Student OS…
        </div>
      ) : data ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Due this week", value: data.stats.dueThisWeek },
              { label: "Overdue", value: data.stats.overdue },
              { label: "In progress", value: data.stats.inProgress },
              { label: "Open tasks", value: data.stats.openTasks },
              { label: "Notes to review", value: data.stats.notesToReview },
              {
                label: "Next exam",
                value:
                  data.stats.nextExamDays === null
                    ? "—"
                    : `${data.stats.nextExamDays}d`,
              },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`animate-rise rounded-[24px] border border-[var(--line)] bg-white/75 p-5 shadow-[var(--shadow)] ${
                  i === 1
                    ? "animate-rise-delay-1"
                    : i === 2
                      ? "animate-rise-delay-2"
                      : i === 3
                        ? "animate-rise-delay-3"
                        : ""
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                  {stat.label}
                </p>
                <p className="mt-3 font-[family-name:var(--font-fraunces)] text-4xl text-[var(--ink)]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
            <div className="rounded-[28px] border border-[var(--line)] bg-white/80 p-6 shadow-[var(--shadow)] sm:p-8">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-[family-name:var(--font-fraunces)] text-2xl">
                    Priority queue
                  </h3>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    Mode:{" "}
                    {data.mode === "demo" ? "Demo Student OS" : "Live Notion"}
                    {data.stats.avgGrade !== null
                      ? ` · avg course grade ${data.stats.avgGrade}%`
                      : ""}
                  </p>
                </div>
                <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-[var(--wash)] sm:block">
                  <div className="live-bar h-full w-full rounded-full bg-[var(--teal)]" />
                </div>
              </div>

              <ul className="space-y-4">
                {data.priorities.slice(0, 8).map((item, index) => (
                  <li
                    key={item.assignment.id}
                    className="rounded-2xl border border-[var(--line)] bg-[rgba(243,239,230,0.55)] p-4 transition hover:border-[rgba(11,107,92,0.35)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--teal)] text-xs font-bold text-white">
                            {index + 1}
                          </span>
                          <p className="font-semibold text-[var(--ink)]">
                            {item.assignment.title}
                          </p>
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-[var(--ink-soft)]">
                            {item.assignment.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[var(--ink-soft)]">
                          {item.assignment.courseCode} · {item.assignment.type}{" "}
                          · {formatDate(item.assignment.dueDate)} · score{" "}
                          {item.score}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.reasons.map((reason) => (
                            <span
                              key={reason}
                              className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-[var(--ink-soft)]"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-semibold text-[var(--teal)]">
                          {item.suggestedMinutes > 0
                            ? `${item.suggestedMinutes} min today`
                            : "Later"}
                        </span>
                        <div className="flex flex-wrap justify-end gap-2">
                          {item.assignment.status !== "In progress" && (
                            <button
                              type="button"
                              disabled={busyId === item.assignment.id}
                              onClick={() =>
                                void updateStatus(item, "In progress")
                              }
                              className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                            >
                              Start
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === item.assignment.id}
                            onClick={() => void updateStatus(item, "Submitted")}
                            className="rounded-full bg-[var(--ink)] px-3 py-1.5 text-xs font-semibold text-[var(--paper)] disabled:opacity-50"
                          >
                            Mark submitted
                          </button>
                          {forceDemo && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteAssignment(
                                  item.assignment.id,
                                  item.assignment.title,
                                )
                              }
                              aria-label={`Delete ${item.assignment.title}`}
                              className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs text-[var(--ink-soft)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
                {data.priorities.length === 0 && (
                  <li className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-[var(--ink-soft)]">
                    No open assignments. Nice — protect the win. Add one above
                    or reset the demo.
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-[var(--line)] bg-[var(--teal-deep)] p-6 text-[var(--paper)] shadow-[var(--shadow)] sm:p-7">
                <h3 className="font-[family-name:var(--font-fraunces)] text-2xl">
                  Study plan
                </h3>
                <p className="mt-1 text-sm text-white/75">
                  {minutes / 60}h packed around the highest-impact work.
                </p>
                <ol className="mt-5 space-y-3">
                  {data.studyPlan.map((block, i) => (
                    <li
                      key={`${block.assignmentId}-${i}`}
                      className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{block.title}</p>
                        <span className="text-sm text-[var(--amber)]">
                          {block.minutes}m
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-white/70">
                        {block.courseCode} · {block.focus}
                      </p>
                    </li>
                  ))}
                  {data.studyPlan.length === 0 && (
                    <li className="text-sm text-white/70">
                      Nothing urgent in the window — schedule lighter review.
                    </li>
                  )}
                </ol>
              </div>

              <div className="rounded-[28px] border border-[var(--line)] bg-white/80 p-6 shadow-[var(--shadow)]">
                <h3 className="font-[family-name:var(--font-fraunces)] text-2xl">
                  Course health
                </h3>
                <ul className="mt-4 space-y-3">
                  {data.courseHealth.map((row) => (
                    <li
                      key={row.course.id}
                      className="rounded-2xl border border-[var(--line)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            <span
                              className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                              style={{ background: row.course.color }}
                            />
                            {row.course.code}
                          </p>
                          <p className="mt-1 text-sm text-[var(--ink-soft)]">
                            {row.message}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${riskClass(row.risk)}`}
                        >
                          {row.risk}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[var(--ink-soft)]">
                        {row.course.currentGrade ?? "—"}% now · target{" "}
                        {row.course.targetGrade}% · {row.openCount} open
                        {row.nextDue ? ` · next ${formatDate(row.nextDue)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-[var(--line)] bg-white/80 p-6 shadow-[var(--shadow)] sm:p-8">
              <h3 className="font-[family-name:var(--font-fraunces)] text-2xl">
                Tasks
              </h3>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Quick to-dos from your Student OS Tasks database.
              </p>
              {forceDemo && (
                <form onSubmit={handleAddTask} className="mt-4 flex gap-2">
                  <input
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Add a to-do…"
                    className="flex-1 rounded-2xl border border-[var(--line)] bg-[rgba(243,239,230,0.7)] px-4 py-2.5 text-sm outline-none focus:border-[var(--teal)]"
                  />
                  <button
                    type="submit"
                    className="rounded-2xl bg-[var(--teal)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--teal-deep)]"
                  >
                    Add
                  </button>
                </form>
              )}
              <ul className="mt-4 space-y-2">
                {[...data.tasks]
                  .sort((a, b) => Number(a.done) - Number(b.done))
                  .map((task) => (
                    <li key={task.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(243,239,230,0.55)] px-4 py-3">
                        <input
                          type="checkbox"
                          checked={task.done}
                          disabled={busyId === task.id}
                          onChange={() => handleToggleTask(task.id, task.done)}
                          className="h-4 w-4 accent-[var(--teal)]"
                        />
                        <span
                          className={`flex-1 text-sm ${task.done ? "text-[var(--ink-soft)] line-through" : "font-medium"}`}
                        >
                          {task.title}
                        </span>
                        <span className="text-xs text-[var(--ink-soft)]">
                          {[task.courseCode, task.dueDate && formatDate(task.dueDate)]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        {forceDemo && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteTask(task.id);
                            }}
                            aria-label={`Delete ${task.title}`}
                            className="text-xs text-[var(--ink-soft)] hover:text-[var(--danger)]"
                          >
                            ✕
                          </button>
                        )}
                      </label>
                    </li>
                  ))}
                {data.tasks.length === 0 && (
                  <li className="text-sm text-[var(--ink-soft)]">
                    No tasks yet.
                  </li>
                )}
              </ul>
            </div>

            <div className="rounded-[28px] border border-[var(--line)] bg-white/80 p-6 shadow-[var(--shadow)] sm:p-8">
              <h3 className="font-[family-name:var(--font-fraunces)] text-2xl">
                Notes to review
              </h3>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Lecture notes linked to courses — tick once you&apos;ve re-read
                them.
              </p>
              <ul className="mt-4 space-y-2">
                {[...data.notes]
                  .sort((a, b) => Number(a.reviewed) - Number(b.reviewed))
                  .map((note) => (
                    <li key={note.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(243,239,230,0.55)] px-4 py-3">
                        <input
                          type="checkbox"
                          checked={note.reviewed}
                          disabled={busyId === note.id}
                          onChange={() => handleToggleNote(note.id, note.reviewed)}
                          className="h-4 w-4 accent-[var(--teal)]"
                        />
                        <span
                          className={`flex-1 text-sm ${note.reviewed ? "text-[var(--ink-soft)] line-through" : "font-medium"}`}
                        >
                          {note.title}
                        </span>
                        <span className="text-xs text-[var(--ink-soft)]">
                          {note.courseCode}
                          {note.date ? ` · ${formatDate(note.date)}` : ""}
                        </span>
                      </label>
                    </li>
                  ))}
                {data.notes.length === 0 && (
                  <li className="text-sm text-[var(--ink-soft)]">
                    No notes connected yet.
                  </li>
                )}
              </ul>
            </div>
          </div>

          {data.exams.length > 0 && (
            <div className="rounded-[28px] border border-[var(--line)] bg-white/75 p-6 shadow-[var(--shadow)] sm:p-8">
              <h3 className="font-[family-name:var(--font-fraunces)] text-2xl">
                Upcoming exams
              </h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {data.exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="rounded-2xl border border-[var(--line)] bg-[rgba(243,239,230,0.55)] p-4"
                  >
                    <p className="font-semibold">{exam.title}</p>
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">
                      {exam.courseCode} · {formatDate(exam.date)}
                      {exam.location ? ` · ${exam.location}` : ""}
                    </p>
                    <p className="mt-2 text-xs text-[var(--ink-soft)]">
                      Prep: {exam.prepStatus}
                      {exam.topics ? ` · ${exam.topics}` : ""}
                    </p>
                    {forceDemo && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(
                          ["Not started", "Reviewing", "Ready"] as const
                        ).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => void handleExamPrep(exam.id, status)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              exam.prepStatus === status
                                ? "bg-[var(--teal)] text-white"
                                : "border border-[var(--line)] bg-white"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
