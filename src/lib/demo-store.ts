import {
  getDemoAssignments,
  getDemoCourses,
  getDemoExams,
  getDemoNotes,
  getDemoTasks,
} from "./demo-data";
import { buildSnapshot } from "./priority";
import type {
  Assignment,
  AssignmentStatus,
  AssignmentType,
  Course,
  Exam,
  Note,
  StudentOsSnapshot,
  Task,
} from "./types";

const STORAGE_KEY = "pulseboard-demo-v2";

export interface DemoState {
  courses: Course[];
  assignments: Assignment[];
  exams: Exam[];
  tasks: Task[];
  notes: Note[];
}

export function createFreshDemoState(): DemoState {
  return {
    courses: getDemoCourses(),
    assignments: getDemoAssignments(),
    exams: getDemoExams(),
    tasks: getDemoTasks(),
    notes: getDemoNotes(),
  };
}

export function loadDemoState(): DemoState {
  if (typeof window === "undefined") return createFreshDemoState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createFreshDemoState();
    const parsed = JSON.parse(raw) as DemoState;
    const keys: (keyof DemoState)[] = [
      "courses",
      "assignments",
      "exams",
      "tasks",
      "notes",
    ];
    if (keys.some((k) => !Array.isArray(parsed[k]))) {
      return createFreshDemoState();
    }
    return parsed;
  } catch {
    return createFreshDemoState();
  }
}

export function saveDemoState(state: DemoState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetDemoState(): DemoState {
  const fresh = createFreshDemoState();
  saveDemoState(fresh);
  return fresh;
}

export function snapshotFromState(
  state: DemoState,
  dailyMinutes: number,
): StudentOsSnapshot {
  return buildSnapshot(
    "demo",
    state.courses,
    state.assignments,
    state.exams,
    dailyMinutes,
    state.tasks,
    state.notes,
  );
}

export function setAssignmentStatus(
  state: DemoState,
  assignmentId: string,
  status: AssignmentStatus,
): DemoState {
  return {
    ...state,
    assignments: state.assignments.map((a) =>
      a.id === assignmentId ? { ...a, status } : a,
    ),
  };
}

export function addAssignment(
  state: DemoState,
  input: {
    title: string;
    courseId: string;
    dueDate: string;
    type: AssignmentType;
    weight: number;
    estimatedHours: number;
  },
): DemoState {
  const course = state.courses.find((c) => c.id === input.courseId);
  if (!course) return state;

  const assignment: Assignment = {
    id: `a-local-${Date.now()}`,
    title: input.title.trim(),
    courseId: course.id,
    courseName: course.name,
    courseCode: course.code,
    dueDate: input.dueDate,
    status: "Not started",
    type: input.type,
    weight: input.weight,
    grade: null,
    estimatedHours: input.estimatedHours,
  };

  return {
    ...state,
    assignments: [assignment, ...state.assignments],
  };
}

export function removeAssignment(
  state: DemoState,
  assignmentId: string,
): DemoState {
  return {
    ...state,
    assignments: state.assignments.filter((a) => a.id !== assignmentId),
  };
}

export function removeTask(state: DemoState, taskId: string): DemoState {
  return { ...state, tasks: state.tasks.filter((t) => t.id !== taskId) };
}

export function addTask(state: DemoState, title: string): DemoState {
  const task: Task = {
    id: `t-local-${Date.now()}`,
    title: title.trim(),
    done: false,
    dueDate: null,
    courseId: null,
    courseCode: null,
  };
  return { ...state, tasks: [task, ...state.tasks] };
}

export function toggleTask(state: DemoState, taskId: string): DemoState {
  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === taskId ? { ...t, done: !t.done } : t,
    ),
  };
}

export function toggleNoteReviewed(state: DemoState, noteId: string): DemoState {
  return {
    ...state,
    notes: state.notes.map((n) =>
      n.id === noteId ? { ...n, reviewed: !n.reviewed } : n,
    ),
  };
}

export function markExamPrep(
  state: DemoState,
  examId: string,
  prepStatus: Exam["prepStatus"],
): DemoState {
  return {
    ...state,
    exams: state.exams.map((e) =>
      e.id === examId ? { ...e, prepStatus } : e,
    ),
  };
}
