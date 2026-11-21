import { Client, collectAllDataSourceRows } from "@notionhq/client";
import type {
  Assignment,
  AssignmentStatus,
  AssignmentType,
  Course,
  CourseStatus,
  Exam,
  Note,
  Task,
} from "./types";

type NotionProps = Record<string, unknown>;

function asRecord(value: unknown): NotionProps {
  return value && typeof value === "object" ? (value as NotionProps) : {};
}

function plainText(prop: unknown): string {
  const p = asRecord(prop);
  if (p.type === "title" && Array.isArray(p.title)) {
    return (p.title as { plain_text?: string }[])
      .map((t) => t.plain_text ?? "")
      .join("")
      .trim();
  }
  if (p.type === "rich_text" && Array.isArray(p.rich_text)) {
    return (p.rich_text as { plain_text?: string }[])
      .map((t) => t.plain_text ?? "")
      .join("")
      .trim();
  }
  if (p.type === "select" && p.select && typeof p.select === "object") {
    return String((p.select as { name?: string }).name ?? "");
  }
  if (p.type === "status" && p.status && typeof p.status === "object") {
    return String((p.status as { name?: string }).name ?? "");
  }
  if (p.type === "number" && typeof p.number === "number") {
    return String(p.number);
  }
  return "";
}

function numberProp(prop: unknown): number | null {
  const p = asRecord(prop);
  if (p.type === "number" && typeof p.number === "number") return p.number;
  const text = plainText(prop);
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function dateProp(prop: unknown): string | null {
  const p = asRecord(prop);
  if (p.type === "date" && p.date && typeof p.date === "object") {
    const start = (p.date as { start?: string }).start;
    return start ? start.slice(0, 10) : null;
  }
  return null;
}

function checkboxProp(prop: unknown): boolean | null {
  const p = asRecord(prop);
  if (p.type === "checkbox" && typeof p.checkbox === "boolean") {
    return p.checkbox;
  }
  const text = plainText(prop).toLowerCase();
  if (!text) return null;
  return text.includes("done") || text.includes("complete");
}

function relationIds(prop: unknown): string[] {
  const p = asRecord(prop);
  if (p.type === "relation" && Array.isArray(p.relation)) {
    return (p.relation as { id?: string }[])
      .map((r) => r.id)
      .filter((id): id is string => Boolean(id));
  }
  return [];
}

function findProp(props: NotionProps, names: string[]): unknown {
  const keys = Object.keys(props);
  for (const name of names) {
    const hit = keys.find((k) => k.toLowerCase() === name.toLowerCase());
    if (hit) return props[hit];
  }
  for (const name of names) {
    const hit = keys.find((k) => k.toLowerCase().includes(name.toLowerCase()));
    if (hit) return props[hit];
  }
  return undefined;
}

function mapStatus(raw: string): AssignmentStatus {
  const v = raw.toLowerCase();
  if (v.includes("progress") || v.includes("started")) return "In progress";
  if (v.includes("submit")) return "Submitted";
  if (v.includes("grade") || v.includes("done") || v.includes("complete"))
    return "Graded";
  return "Not started";
}

function mapType(raw: string): AssignmentType {
  const v = raw.toLowerCase();
  if (v.includes("essay")) return "Essay";
  if (v.includes("project")) return "Project";
  if (v.includes("quiz")) return "Quiz";
  if (v.includes("read")) return "Reading";
  if (v.includes("exam")) return "Exam prep";
  return "Homework";
}

function mapCourseStatus(raw: string): CourseStatus {
  const v = raw.toLowerCase();
  if (v.includes("complete")) return "Completed";
  if (v.includes("plan")) return "Planned";
  return "Current";
}

function mapPrep(raw: string): Exam["prepStatus"] {
  const v = raw.toLowerCase();
  if (v.includes("ready")) return "Ready";
  if (v.includes("review")) return "Reviewing";
  return "Not started";
}

const PALETTE = ["#0f766e", "#1d4ed8", "#b45309", "#7c3aed", "#be123c", "#0369a1"];

/**
 * Accept either a data source ID or a database ID from Student OS.
 * Database IDs are resolved to their first data source.
 */
async function resolveDataSourceId(
  notion: Client,
  id: string,
): Promise<string> {
  try {
    const db = await notion.databases.retrieve({ database_id: id });
    if ("data_sources" in db && Array.isArray(db.data_sources) && db.data_sources[0]) {
      return db.data_sources[0].id;
    }
  } catch {
    // Likely already a data source id — try querying it directly.
  }
  return id;
}

async function queryRows(
  notion: Client,
  databaseOrDataSourceId: string,
): Promise<{ id: string; properties: NotionProps }[]> {
  const dataSourceId = await resolveDataSourceId(notion, databaseOrDataSourceId);
  const rows = await collectAllDataSourceRows(notion, {
    data_source_id: dataSourceId,
  });

  return rows
    .filter((row) => "properties" in row)
    .map((row) => ({
      id: row.id,
      properties: (row as { properties: NotionProps }).properties,
    }));
}

export function isNotionConfigured(): boolean {
  return Boolean(
    process.env.NOTION_API_KEY &&
      process.env.NOTION_COURSES_DB_ID &&
      process.env.NOTION_ASSIGNMENTS_DB_ID,
  );
}

export async function fetchNotionStudentOs(): Promise<{
  courses: Course[];
  assignments: Assignment[];
  exams: Exam[];
  tasks: Task[];
  notes: Note[];
}> {
  const notion = new Client({ auth: process.env.NOTION_API_KEY });

  const courseRows = await queryRows(
    notion,
    process.env.NOTION_COURSES_DB_ID as string,
  );

  const courses: Course[] = courseRows.map((row, index) => {
    const props = row.properties;
    const name =
      plainText(findProp(props, ["Course", "Name", "Title"])) || "Untitled course";
    const code =
      plainText(findProp(props, ["Code", "Course Code"])) || name.slice(0, 8);
    return {
      id: row.id,
      name,
      code,
      credits: numberProp(findProp(props, ["Credits", "Credit"])) ?? 3,
      instructor: plainText(
        findProp(props, ["Instructor", "Professor", "Teacher"]),
      ),
      status: mapCourseStatus(plainText(findProp(props, ["Status"]))),
      currentGrade: numberProp(
        findProp(props, [
          "Current grade",
          "Current Grade",
          "Grade %",
          "Grade",
        ]),
      ),
      targetGrade:
        numberProp(findProp(props, ["Target grade", "Target Grade", "Target"])) ??
        85,
      color: PALETTE[index % PALETTE.length],
    };
  });

  const courseLookup = new Map(courses.map((c) => [c.id, c]));

  const assignmentRows = await queryRows(
    notion,
    process.env.NOTION_ASSIGNMENTS_DB_ID as string,
  );

  const assignments: Assignment[] = assignmentRows.map((row) => {
    const props = row.properties;
    const title =
      plainText(findProp(props, ["Assignment", "Name", "Title", "Task"])) ||
      "Untitled assignment";
    const related = relationIds(findProp(props, ["Course", "Courses"]));
    const course = related.map((id) => courseLookup.get(id)).find(Boolean);
    const due =
      dateProp(findProp(props, ["Due date", "Due Date", "Due", "Deadline"])) ||
      new Date().toISOString().slice(0, 10);

    return {
      id: row.id,
      title,
      courseId: course?.id ?? related[0] ?? "unknown",
      courseName: course?.name ?? "Unlinked course",
      courseCode: course?.code ?? "—",
      dueDate: due,
      status: mapStatus(plainText(findProp(props, ["Status"]))),
      type: mapType(plainText(findProp(props, ["Type", "Category"]))),
      weight:
        numberProp(findProp(props, ["Weight %", "Weight", "Weight%"])) ?? 10,
      grade: numberProp(findProp(props, ["Grade %", "Grade", "Score"])),
      estimatedHours:
        numberProp(
          findProp(props, ["Estimated hours", "Hours", "Est. hours"]),
        ) ?? 2,
    };
  });

  let exams: Exam[] = [];
  if (process.env.NOTION_EXAMS_DB_ID) {
    const examRows = await queryRows(notion, process.env.NOTION_EXAMS_DB_ID);
    exams = examRows.map((row) => {
      const props = row.properties;
      const title =
        plainText(findProp(props, ["Exam", "Name", "Title"])) || "Untitled exam";
      const related = relationIds(findProp(props, ["Course", "Courses"]));
      const course = related.map((id) => courseLookup.get(id)).find(Boolean);
      return {
        id: row.id,
        title,
        courseId: course?.id ?? related[0] ?? "unknown",
        courseName: course?.name ?? "Unlinked course",
        courseCode: course?.code ?? "—",
        date:
          dateProp(findProp(props, ["Date", "Exam date", "Exam Date"])) ||
          new Date().toISOString().slice(0, 10),
        location: plainText(findProp(props, ["Location", "Room"])),
        prepStatus: mapPrep(
          plainText(
            findProp(props, ["Prep status", "Prep Status", "Status"]),
          ),
        ),
        topics: plainText(findProp(props, ["Topics", "Topic"])),
      };
    });
  }

  let tasks: Task[] = [];
  if (process.env.NOTION_TASKS_DB_ID) {
    const taskRows = await queryRows(notion, process.env.NOTION_TASKS_DB_ID);
    tasks = taskRows.map((row) => {
      const props = row.properties;
      const related = relationIds(findProp(props, ["Course", "Courses"]));
      const course = related.map((id) => courseLookup.get(id)).find(Boolean);
      return {
        id: row.id,
        title:
          plainText(findProp(props, ["Task", "Name", "Title"])) ||
          "Untitled task",
        done: checkboxProp(findProp(props, ["Done", "Complete", "Status"])) ?? false,
        dueDate: dateProp(findProp(props, ["Due date", "Due", "Date"])),
        courseId: course?.id ?? null,
        courseCode: course?.code ?? null,
      };
    });
  }

  let notes: Note[] = [];
  if (process.env.NOTION_NOTES_DB_ID) {
    const noteRows = await queryRows(notion, process.env.NOTION_NOTES_DB_ID);
    notes = noteRows.map((row) => {
      const props = row.properties;
      const related = relationIds(findProp(props, ["Course", "Courses"]));
      const course = related.map((id) => courseLookup.get(id)).find(Boolean);
      return {
        id: row.id,
        title:
          plainText(findProp(props, ["Note", "Name", "Title", "Topic"])) ||
          "Untitled note",
        courseId: course?.id ?? related[0] ?? "unknown",
        courseCode: course?.code ?? "—",
        date: dateProp(findProp(props, ["Date", "Lecture date", "Created"])),
        reviewed: checkboxProp(findProp(props, ["Reviewed", "Review"])) ?? false,
      };
    });
  }

  return { courses, assignments, exams, tasks, notes };
}

/** Set a checkbox property (e.g. Tasks "Done", Notes "Reviewed") on a Notion page. */
export async function setCheckbox(
  pageId: string,
  candidates: string[],
  value: boolean,
): Promise<void> {
  if (!process.env.NOTION_API_KEY) {
    throw new Error("NOTION_API_KEY is not configured");
  }
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const page = await notion.pages.retrieve({ page_id: pageId });
  if (!("properties" in page)) throw new Error("Page has no properties");

  const props = page.properties as NotionProps;
  const key = Object.keys(props).find(
    (k) =>
      asRecord(props[k]).type === "checkbox" &&
      candidates.some((c) => k.toLowerCase().includes(c.toLowerCase())),
  );
  if (!key) {
    throw new Error(`No checkbox property named ${candidates.join(" / ")}`);
  }

  await notion.pages.update({
    page_id: pageId,
    properties: { [key]: { checkbox: value } },
  });
}

export async function updateAssignmentStatus(
  pageId: string,
  status: AssignmentStatus,
): Promise<void> {
  if (!process.env.NOTION_API_KEY) {
    throw new Error("NOTION_API_KEY is not configured");
  }

  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const page = await notion.pages.retrieve({ page_id: pageId });
  if (!("properties" in page)) {
    throw new Error("Page has no properties");
  }

  const props = page.properties as NotionProps;
  const statusKey =
    Object.keys(props).find((k) => k.toLowerCase() === "status") ??
    Object.keys(props).find((k) => k.toLowerCase().includes("status"));

  if (!statusKey) {
    throw new Error("Could not find a Status property on this assignment");
  }

  const existing = asRecord(props[statusKey]);
  if (existing.type === "status") {
    await notion.pages.update({
      page_id: pageId,
      properties: {
        [statusKey]: { status: { name: status } },
      },
    });
    return;
  }

  await notion.pages.update({
    page_id: pageId,
    properties: {
      [statusKey]: { select: { name: status } },
    },
  });
}
