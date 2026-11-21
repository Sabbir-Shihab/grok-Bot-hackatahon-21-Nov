import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCourseHealth,
  buildSnapshot,
  buildStudyPlan,
  daysUntil,
  rankPriorities,
} from "../src/lib/priority.ts";

function isoInDays(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const course = (overrides = {}) => ({
  id: "c1",
  name: "Data Structures",
  code: "CS 201",
  credits: 3,
  instructor: "",
  status: "Current",
  currentGrade: 90,
  targetGrade: 85,
  color: "#000",
  ...overrides,
});

const assignment = (overrides = {}) => ({
  id: "a1",
  title: "Lab",
  courseId: "c1",
  courseName: "Data Structures",
  courseCode: "CS 201",
  dueDate: isoInDays(3),
  status: "Not started",
  type: "Homework",
  weight: 10,
  grade: null,
  estimatedHours: 2,
  ...overrides,
});

test("daysUntil counts calendar days", () => {
  assert.equal(daysUntil(isoInDays(0)), 0);
  assert.equal(daysUntil(isoInDays(1)), 1);
  assert.equal(daysUntil(isoInDays(-1)), -1);
  assert.equal(daysUntil(isoInDays(7)), 7);
});

test("submitted and graded work is excluded from the queue", () => {
  const ranked = rankPriorities(
    [
      assignment({ id: "open" }),
      assignment({ id: "sub", status: "Submitted" }),
      assignment({ id: "graded", status: "Graded" }),
    ],
    [course()],
  );
  assert.deepEqual(
    ranked.map((p) => p.assignment.id),
    ["open"],
  );
});

test("sooner deadlines outrank later ones at equal weight", () => {
  const ranked = rankPriorities(
    [
      assignment({ id: "later", dueDate: isoInDays(6) }),
      assignment({ id: "today", dueDate: isoInDays(0) }),
      assignment({ id: "overdue", dueDate: isoInDays(-2) }),
    ],
    [course()],
  );
  assert.deepEqual(
    ranked.map((p) => p.assignment.id),
    ["overdue", "today", "later"],
  );
  assert.ok(ranked[0].reasons.includes("2d overdue"));
});

test("heavier weight and below-target courses get a boost", () => {
  const [heavy, light] = rankPriorities(
    [
      assignment({ id: "light", weight: 5 }),
      assignment({ id: "heavy", weight: 30 }),
    ],
    [course()],
  );
  assert.equal(heavy.assignment.id, "heavy");
  assert.ok(heavy.score > light.score);

  const [behind] = rankPriorities(
    [
      assignment({ id: "ok", courseId: "c1" }),
      assignment({ id: "behind", courseId: "c2" }),
    ],
    [course(), course({ id: "c2", code: "MATH 240", currentGrade: 70, targetGrade: 85 })],
  );
  assert.equal(behind.assignment.id, "behind");
  assert.ok(behind.reasons.includes("MATH 240 below target"));
});

test("study plan never exceeds the daily window", () => {
  const assignments = Array.from({ length: 6 }, (_, i) =>
    assignment({ id: `a${i}`, estimatedHours: 4, dueDate: isoInDays(i) }),
  );
  for (const minutes of [90, 180, 360]) {
    const plan = buildStudyPlan(rankPriorities(assignments, [course()], minutes), minutes);
    const total = plan.reduce((sum, block) => sum + block.minutes, 0);
    assert.ok(total <= minutes, `${total} > ${minutes}`);
    assert.ok(plan.length > 0);
  }
});

test("course health flags overdue work as at-risk", () => {
  const [health] = buildCourseHealth(
    [course()],
    [assignment({ dueDate: isoInDays(-1) })],
  );
  assert.equal(health.risk, "at-risk");
  assert.equal(health.overdueCount, 1);
});

test("snapshot stats count tasks and notes", () => {
  const snap = buildSnapshot(
    "demo",
    [course()],
    [assignment(), assignment({ id: "late", dueDate: isoInDays(-1) })],
    [],
    180,
    [
      { id: "t1", title: "x", done: false, dueDate: null, courseId: null, courseCode: null },
      { id: "t2", title: "y", done: true, dueDate: null, courseId: null, courseCode: null },
    ],
    [{ id: "n1", title: "z", courseId: "c1", courseCode: "CS 201", date: null, reviewed: false }],
  );
  assert.equal(snap.stats.overdue, 1);
  assert.equal(snap.stats.dueThisWeek, 1);
  assert.equal(snap.stats.openTasks, 1);
  assert.equal(snap.stats.notesToReview, 1);
});
