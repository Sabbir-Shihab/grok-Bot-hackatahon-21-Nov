import type { Assignment, Course, Exam, Note, Task } from "./types";

/** Sample data shaped like a Notion Student OS semester. */
export function getDemoCourses(): Course[] {
  return [
    {
      id: "c-cs201",
      name: "Data Structures",
      code: "CS 201",
      credits: 3,
      instructor: "Dr. Rahman",
      status: "Current",
      currentGrade: 82,
      targetGrade: 85,
      color: "#0f766e",
    },
    {
      id: "c-eng110",
      name: "Academic Writing",
      code: "ENG 110",
      credits: 3,
      instructor: "Prof. Chowdhury",
      status: "Current",
      currentGrade: 91,
      targetGrade: 88,
      color: "#1d4ed8",
    },
    {
      id: "c-math240",
      name: "Linear Algebra",
      code: "MATH 240",
      credits: 4,
      instructor: "Dr. Karim",
      status: "Current",
      currentGrade: 74,
      targetGrade: 80,
      color: "#b45309",
    },
    {
      id: "c-bus150",
      name: "Intro to Entrepreneurship",
      code: "BUS 150",
      credits: 2,
      instructor: "Ms. Sultana",
      status: "Current",
      currentGrade: 88,
      targetGrade: 85,
      color: "#7c3aed",
    },
  ];
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getDemoAssignments(): Assignment[] {
  return [
    {
      id: "a-1",
      title: "Binary Tree Lab Report",
      courseId: "c-cs201",
      courseName: "Data Structures",
      courseCode: "CS 201",
      dueDate: daysFromNow(1),
      status: "In progress",
      type: "Homework",
      weight: 10,
      grade: null,
      estimatedHours: 3,
    },
    {
      id: "a-2",
      title: "Midterm Essay Draft",
      courseId: "c-eng110",
      courseName: "Academic Writing",
      courseCode: "ENG 110",
      dueDate: daysFromNow(3),
      status: "Not started",
      type: "Essay",
      weight: 20,
      grade: null,
      estimatedHours: 5,
    },
    {
      id: "a-3",
      title: "Eigenvalues Problem Set",
      courseId: "c-math240",
      courseName: "Linear Algebra",
      courseCode: "MATH 240",
      dueDate: daysFromNow(0),
      status: "Not started",
      type: "Homework",
      weight: 8,
      grade: null,
      estimatedHours: 2.5,
    },
    {
      id: "a-4",
      title: "Startup Canvas Pitch Deck",
      courseId: "c-bus150",
      courseName: "Intro to Entrepreneurship",
      courseCode: "BUS 150",
      dueDate: daysFromNow(5),
      status: "In progress",
      type: "Project",
      weight: 25,
      grade: null,
      estimatedHours: 4,
    },
    {
      id: "a-5",
      title: "Graph Algorithms Quiz Prep",
      courseId: "c-cs201",
      courseName: "Data Structures",
      courseCode: "CS 201",
      dueDate: daysFromNow(2),
      status: "Not started",
      type: "Quiz",
      weight: 15,
      grade: null,
      estimatedHours: 2,
    },
    {
      id: "a-6",
      title: "Reading: Vector Spaces Ch. 4",
      courseId: "c-math240",
      courseName: "Linear Algebra",
      courseCode: "MATH 240",
      dueDate: daysFromNow(4),
      status: "Not started",
      type: "Reading",
      weight: 5,
      grade: null,
      estimatedHours: 1.5,
    },
    {
      id: "a-7",
      title: "Peer Review Comments",
      courseId: "c-eng110",
      courseName: "Academic Writing",
      courseCode: "ENG 110",
      dueDate: daysFromNow(-1),
      status: "In progress",
      type: "Homework",
      weight: 5,
      grade: null,
      estimatedHours: 1,
    },
    {
      id: "a-8",
      title: "Market Research Interview Notes",
      courseId: "c-bus150",
      courseName: "Intro to Entrepreneurship",
      courseCode: "BUS 150",
      dueDate: daysFromNow(8),
      status: "Not started",
      type: "Project",
      weight: 10,
      grade: null,
      estimatedHours: 2,
    },
  ];
}

export function getDemoTasks(): Task[] {
  return [
    {
      id: "t-1",
      title: "Email Dr. Karim about office hours",
      done: false,
      dueDate: daysFromNow(0),
      courseId: "c-math240",
      courseCode: "MATH 240",
    },
    {
      id: "t-2",
      title: "Print lab report cover page",
      done: false,
      dueDate: daysFromNow(1),
      courseId: "c-cs201",
      courseCode: "CS 201",
    },
    {
      id: "t-3",
      title: "Book group study room",
      done: false,
      dueDate: daysFromNow(2),
      courseId: null,
      courseCode: null,
    },
    {
      id: "t-4",
      title: "Pay club membership fee",
      done: true,
      dueDate: daysFromNow(-1),
      courseId: null,
      courseCode: null,
    },
  ];
}

export function getDemoNotes(): Note[] {
  return [
    {
      id: "n-1",
      title: "Lecture 9 — Heaps & priority queues",
      courseId: "c-cs201",
      courseCode: "CS 201",
      date: daysFromNow(-2),
      reviewed: false,
    },
    {
      id: "n-2",
      title: "Eigenvectors worked examples",
      courseId: "c-math240",
      courseCode: "MATH 240",
      date: daysFromNow(-3),
      reviewed: false,
    },
    {
      id: "n-3",
      title: "Thesis statement workshop",
      courseId: "c-eng110",
      courseCode: "ENG 110",
      date: daysFromNow(-5),
      reviewed: true,
    },
  ];
}

export function getDemoExams(): Exam[] {
  return [
    {
      id: "e-1",
      title: "Linear Algebra Midterm",
      courseId: "c-math240",
      courseName: "Linear Algebra",
      courseCode: "MATH 240",
      date: daysFromNow(6),
      location: "Hall B-204",
      prepStatus: "Not started",
      topics: "Matrices, determinants, eigenvalues",
    },
    {
      id: "e-2",
      title: "Data Structures Quiz 3",
      courseId: "c-cs201",
      courseName: "Data Structures",
      courseCode: "CS 201",
      date: daysFromNow(2),
      location: "Lab C-12",
      prepStatus: "Reviewing",
      topics: "Trees, heaps, traversal",
    },
  ];
}
