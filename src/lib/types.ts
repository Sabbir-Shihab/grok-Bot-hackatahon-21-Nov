export type AssignmentStatus =
  | "Not started"
  | "In progress"
  | "Submitted"
  | "Graded";

export type AssignmentType =
  | "Homework"
  | "Essay"
  | "Project"
  | "Quiz"
  | "Reading"
  | "Exam prep";

export type CourseStatus = "Current" | "Completed" | "Planned";

export interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  instructor: string;
  status: CourseStatus;
  currentGrade: number | null;
  targetGrade: number;
  color: string;
}

export interface Assignment {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  dueDate: string; // ISO date
  status: AssignmentStatus;
  type: AssignmentType;
  weight: number;
  grade: number | null;
  estimatedHours: number;
}

export interface Exam {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  date: string;
  location: string;
  prepStatus: "Not started" | "Reviewing" | "Ready";
  topics: string;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  courseId: string | null;
  courseCode: string | null;
}

export interface Note {
  id: string;
  title: string;
  courseId: string;
  courseCode: string;
  date: string | null;
  reviewed: boolean;
}

export interface PriorityItem {
  assignment: Assignment;
  score: number;
  daysLeft: number;
  reasons: string[];
  suggestedMinutes: number;
}

export interface CourseHealth {
  course: Course;
  openCount: number;
  overdueCount: number;
  nextDue: string | null;
  risk: "healthy" | "watch" | "at-risk";
  message: string;
}

export interface StudyBlock {
  title: string;
  courseCode: string;
  minutes: number;
  focus: string;
  assignmentId: string;
}

export interface StudentOsSnapshot {
  mode: "demo" | "notion";
  generatedAt: string;
  courses: Course[];
  assignments: Assignment[];
  exams: Exam[];
  tasks: Task[];
  notes: Note[];
  priorities: PriorityItem[];
  courseHealth: CourseHealth[];
  studyPlan: StudyBlock[];
  stats: {
    dueThisWeek: number;
    overdue: number;
    inProgress: number;
    avgGrade: number | null;
    nextExamDays: number | null;
    openTasks: number;
    notesToReview: number;
  };
}
