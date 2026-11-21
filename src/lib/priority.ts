import type {
  Assignment,
  Course,
  CourseHealth,
  Exam,
  Note,
  PriorityItem,
  StudentOsSnapshot,
  StudyBlock,
  Task,
} from "./types";

const OPEN: Assignment["status"][] = ["Not started", "In progress"];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysUntil(isoDate: string, now = startOfToday()): number {
  const due = new Date(`${isoDate}T00:00:00`);
  const ms = due.getTime() - now.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function courseMap(courses: Course[]): Map<string, Course> {
  return new Map(courses.map((c) => [c.id, c]));
}

/**
 * Score open assignments by deadline pressure, syllabus weight, and grade risk.
 * Higher = do sooner.
 */
export function rankPriorities(
  assignments: Assignment[],
  courses: Course[],
  dailyMinutes = 180,
): PriorityItem[] {
  const coursesById = courseMap(courses);

  const open = assignments.filter((a) => OPEN.includes(a.status));
  const scored: PriorityItem[] = open.map((assignment) => {
    const course = coursesById.get(assignment.courseId);
    const daysLeft = daysUntil(assignment.dueDate);
    const reasons: string[] = [];

    let urgency =
      daysLeft < 0
        ? 100
        : daysLeft === 0
          ? 92
          : daysLeft === 1
            ? 78
            : daysLeft <= 3
              ? 60
              : daysLeft <= 7
                ? 40
                : 22;

    if (daysLeft < 0) reasons.push(`${Math.abs(daysLeft)}d overdue`);
    else if (daysLeft === 0) reasons.push("Due today");
    else if (daysLeft === 1) reasons.push("Due tomorrow");
    else reasons.push(`${daysLeft}d left`);

    const weightFactor = 0.35 + 0.65 * Math.min(assignment.weight / 100, 1);
    if (assignment.weight >= 15) reasons.push(`${assignment.weight}% of grade`);

    let riskBoost = 1;
    if (course && course.currentGrade !== null) {
      const gap = course.targetGrade - course.currentGrade;
      if (gap > 0) {
        riskBoost = 1 + Math.min(gap / 40, 0.45);
        reasons.push(`${course.code} below target`);
      }
    }

    if (assignment.status === "In progress") {
      urgency += 6;
      reasons.push("Already started");
    }

    const score = Math.round(urgency * weightFactor * riskBoost * 10) / 10;
    const suggestedMinutes = Math.max(
      25,
      Math.min(90, Math.round(assignment.estimatedHours * 60 * 0.45)),
    );

    return { assignment, score, daysLeft, reasons, suggestedMinutes };
  });

  scored.sort((a, b) => b.score - a.score);

  // Cap today's suggested minutes to the available study window.
  let remaining = dailyMinutes;
  return scored.map((item) => {
    if (remaining <= 0) {
      return { ...item, suggestedMinutes: 0 };
    }
    const minutes = Math.min(item.suggestedMinutes, remaining);
    remaining -= minutes;
    return { ...item, suggestedMinutes: minutes };
  });
}

export function buildCourseHealth(
  courses: Course[],
  assignments: Assignment[],
): CourseHealth[] {
  return courses
    .filter((c) => c.status === "Current")
    .map((course) => {
      const related = assignments.filter(
        (a) => a.courseId === course.id && OPEN.includes(a.status),
      );
      const overdueCount = related.filter((a) => daysUntil(a.dueDate) < 0).length;
      const nextDue =
        related
          .map((a) => a.dueDate)
          .sort()
          .at(0) ?? null;

      let risk: CourseHealth["risk"] = "healthy";
      let message = "On track for your target.";

      const gradeGap =
        course.currentGrade === null
          ? 0
          : course.targetGrade - course.currentGrade;

      if (overdueCount > 0 || gradeGap >= 8) {
        risk = "at-risk";
        message =
          overdueCount > 0
            ? `${overdueCount} overdue item${overdueCount > 1 ? "s" : ""} need attention.`
            : `Current grade is ${gradeGap.toFixed(0)} pts under target.`;
      } else if (related.length >= 3 || gradeGap >= 3) {
        risk = "watch";
        message =
          related.length >= 3
            ? `${related.length} open tasks this week — keep momentum.`
            : "Slightly under target; prioritize weighted work.";
      }

      return {
        course,
        openCount: related.length,
        overdueCount,
        nextDue,
        risk,
        message,
      };
    })
    .sort((a, b) => {
      const order = { "at-risk": 0, watch: 1, healthy: 2 };
      return order[a.risk] - order[b.risk];
    });
}

export function buildStudyPlan(
  priorities: PriorityItem[],
  dailyMinutes = 180,
): StudyBlock[] {
  const blocks: StudyBlock[] = [];
  let remaining = dailyMinutes;

  for (const item of priorities) {
    if (remaining < 25) break;
    const minutes = Math.min(
      item.suggestedMinutes || Math.min(50, remaining),
      remaining,
    );
    if (minutes < 20) continue;

    const focus =
      item.daysLeft <= 0
        ? "Finish and submit"
        : item.assignment.status === "In progress"
          ? "Continue draft / solve remaining parts"
          : "Start with outline or first pass";

    blocks.push({
      title: item.assignment.title,
      courseCode: item.assignment.courseCode,
      minutes,
      focus,
      assignmentId: item.assignment.id,
    });
    remaining -= minutes;
  }

  return blocks;
}

export function buildSnapshot(
  mode: "demo" | "notion",
  courses: Course[],
  assignments: Assignment[],
  exams: Exam[],
  dailyMinutes = 180,
  tasks: Task[] = [],
  notes: Note[] = [],
): StudentOsSnapshot {
  const priorities = rankPriorities(assignments, courses, dailyMinutes);
  const courseHealth = buildCourseHealth(courses, assignments);
  const studyPlan = buildStudyPlan(priorities, dailyMinutes);

  const open = assignments.filter((a) => OPEN.includes(a.status));
  const dueThisWeek = open.filter((a) => {
    const d = daysUntil(a.dueDate);
    return d >= 0 && d <= 7;
  }).length;
  const overdue = open.filter((a) => daysUntil(a.dueDate) < 0).length;
  const inProgress = assignments.filter((a) => a.status === "In progress").length;

  const graded = courses
    .map((c) => c.currentGrade)
    .filter((g): g is number => g !== null);
  const avgGrade =
    graded.length > 0
      ? Math.round((graded.reduce((s, g) => s + g, 0) / graded.length) * 10) / 10
      : null;

  const upcomingExam = [...exams]
    .map((e) => ({ e, days: daysUntil(e.date) }))
    .filter((x) => x.days >= 0)
    .sort((a, b) => a.days - b.days)[0];

  return {
    mode,
    generatedAt: new Date().toISOString(),
    courses,
    assignments,
    exams,
    tasks,
    notes,
    priorities,
    courseHealth,
    studyPlan,
    stats: {
      dueThisWeek,
      overdue,
      inProgress,
      avgGrade,
      nextExamDays: upcomingExam?.days ?? null,
      openTasks: tasks.filter((t) => !t.done).length,
      notesToReview: notes.filter((n) => !n.reviewed).length,
    },
  };
}
