# Pulseboard

**A smarter daily command center for Notion Student OS.**

Students already track courses, assignments, and exams in Notion — but still ask *“what should I do today?”* Pulseboard answers that by ranking open work from your Student OS by deadline pressure, syllabus weight, and course grade risk, then packing it into a realistic study plan.

Built for the **Cognition × Notion Student OS Hackathon**.

## The problem

Notion Student OS is excellent at storing the semester. It is weaker at deciding the next two hours. Deadlines, weights, and “I’m behind in Linear Algebra” live in different databases, so the loudest task often wins over the highest-impact one.

## What Pulseboard does

- Reads the four core Student OS databases (**Courses, Assignments, Notes, Tasks**) plus optional **Exams**
- Scores open assignments into a **priority queue**
- Surfaces **course health** (healthy / watch / at-risk)
- Builds a **study plan** that fits a chosen daily window (1.5h–6h)
- Shows **Tasks** (to-dos) and **Notes to review**, with checkboxes
- Writes changes back to Notion in live mode: assignment **Status**, task **Done**, note **Reviewed**
- Ships with an interactive **demo mode** (add assignments and tasks, tick things off, saved in the browser) so judges can try it without Notion credentials

## How we used Devin Chat / AI coding

This project was developed with an AI coding agent  as the primary builder:

1. Framed the student problem and Student OS data model
2. Scaffolded a Next.js app and Notion sync layer
3. Implemented the priority + study-plan engine
4. Designed the Pulseboard UI and demo mode for reliable judging
5. Wrote setup docs and verified `npm run build`

Human role: choose the product angle, validate the scoring rules, and prepare submission.

## How it incorporates Notion Student OS

The hackathon's [Student OS guide](https://app.notion.com/p/campusleaders/Student-OS-Build-Your-Campus-Life-with-Notion-41cd5368c6db80da906ec73c061b3cc6) has students build a dashboard with **4 core databases — Courses, Assignments, Notes, Tasks** — and a **Courses ↔ Assignments relation**. Pulseboard plugs straight into that structure:

| Database     | Properties used |
|-------------|------------------|
| **Courses** | Name/Course, Code, Credits, Instructor, Status, Current grade, Target grade |
| **Assignments** | Name/Assignment, **Course relation**, Due date, Status, Type, Weight %, Grade %, Estimated hours (optional) |
| **Tasks** (optional) | Name/Task, Done checkbox, Due date, Course relation |
| **Notes** (optional) | Name/Note, Course relation, Date, Reviewed checkbox |
| **Exams** (optional) | Name/Exam, Course relation, Date, Location, Prep status, Topics |

Missing properties fall back to sensible defaults (e.g. weight 10%, target grade 85%), so a freshly built guide dashboard works before you add grades or weights.

Connect a Notion integration, share those databases with it, and set the IDs in `.env`. Property names are matched flexibly (e.g. `Due date` / `Due Date` / `Deadline`).

Without credentials, open the app in **demo mode** — sample CS / ENG / MATH / BUS work mirrors a live semester.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- `@notionhq/client` for Student OS sync
- Priority engine in `src/lib/priority.ts` (pure logic, easy to test)

## Run locally

```bash
cd pulseboard
npm install
cp .env.example .env.local   # optional — skip for demo mode
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo mode (recommended for judges)

1. Click **See today’s priorities**
2. Leave **Using demo data** enabled
3. Change the study window — the study plan repacks instantly
4. Use **Start** / **Mark submitted**, tick tasks and notes, add or delete assignments and tasks — everything recalculates
5. Changes are saved in your browser; **Reset demo** restores the sample semester

### Live Notion mode

1. Create an integration at [notion.so/profile/integrations](https://www.notion.so/profile/integrations)
2. Open each Student OS database → **⋯ → Connections** → add the integration
3. Copy each database ID from the Notion URL
4. Fill `.env.local`:

```env
NOTION_API_KEY=ntn_...
NOTION_COURSES_DB_ID=...
NOTION_ASSIGNMENTS_DB_ID=...
NOTION_TASKS_DB_ID=...   # optional
NOTION_NOTES_DB_ID=...   # optional
NOTION_EXAMS_DB_ID=...   # optional
```

5. Restart `npm run dev`
6. Toggle the board to **Using Notion sync** and hit **Refresh Notion**

## Priority scoring (short version)

For each open assignment:

- **Urgency** rises as the due date approaches (overdue / today / tomorrow weighted highest)
- **Weight** from the syllabus increases impact
- **Grade risk** boosts courses currently under the student’s target grade
- **In progress** work gets a small boost so unfinished drafts don’t stall

The study plan then allocates the selected daily minutes across the top-scoring items.

## Project structure

```
src/
  app/                 # Landing page + API routes
  components/          # Pulseboard dashboard UI (client-only board)
tests/                 # Unit tests for ranking, study plan, course health
  lib/
    demo-data.ts       # Sample Student OS semester
    demo-store.ts      # Interactive demo state (saved in localStorage)
    notion.ts          # Notion read/write adapter
    priority.ts        # Ranking + study plan + course health
    types.ts
```

## Scripts

| Command        | Purpose              |
|----------------|----------------------|
| `npm run dev`  | Local development    |
| `npm run build`| Production build     |
| `npm run start`| Run production build |
| `npm run lint` | ESLint               |
| `npm test`     | Priority engine tests (Node's built-in test runner, Node 22.18+) |


Made for students who keep their life in Notion — and need the next move, not another empty page.
