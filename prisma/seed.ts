import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ProjectRole } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Helpers ────────────────────────────────────────────────────────────────

function d(base: Date, offsetDays: number): Date {
  const r = new Date(base);
  r.setDate(r.getDate() + offsetDays);
  return r;
}

// ─── Seed ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("🧹  Cleaning domain data (preserving users & auth)...");

  // Delete in dependency order so FK constraints are satisfied
  await prisma.taskComment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});

  console.log("✅  Clean done.");

  // ── Owner user (must already exist — created via Google OAuth) ──────────
  const OWNER_EMAIL = "codeversebackend@gmail.com";
  const owner = await prisma.user.findUniqueOrThrow({
    where: { email: OWNER_EMAIL },
  });

  // ── Project ─────────────────────────────────────────────────────────────
  const project = await prisma.project.create({
    data: {
      name: "Ganttx Platform",
      description:
        "End-to-end build of the Ganttx collaborative project management platform — from infrastructure to product launch.",
      members: {
        create: { userId: owner.id, role: ProjectRole.OWNER },
      },
    },
  });

  const pid = project.id;
  const cid = owner.id; // creatorId
  const aid = owner.id; // assigneeId (you)

  // ── Anchor date: start of the current week (Monday) ─────────────────────
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sun
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = d(today, diffToMonday);
  monday.setHours(0, 0, 0, 0);

  // ─────────────────────────────────────────────────────────────────────────
  // EPIC 1 — Infrastructure & Backend
  // Spans: Week 1 → Week 6  (0 … +41 days)
  // ─────────────────────────────────────────────────────────────────────────
  const epic1 = await prisma.task.create({
    data: {
      title: "Infrastructure & Backend Foundation",
      description:
        "Stand up the full server-side foundation: database, authentication, real-time layer, file storage, and CI/CD pipeline. This epic is the prerequisite for all product-facing work.",
      label: "URGENT",
      bucket: "IN_PROGRESS",
      isEpic: true,
      showSubtasksOnCard: true,
      startDate: d(monday, 0),
      dueDate: d(monday, 41),
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  // We need IDs for predecessor references — create tasks sequentially
  // so each one can reference the previous task's ID.

  const e1t1 = await prisma.task.create({
    data: {
      title: "Provision PostgreSQL on VPS with Docker Compose",
      description:
        "Configure a non-root PostgreSQL 17.5-alpine service with health-check, named volume, and environment secrets in docker-compose.yml. Verify remote connectivity and run initial Prisma migrate.",
      label: "HIGH",
      bucket: "DONE",
      isEpic: false,
      startDate: d(monday, 0),
      dueDate: d(monday, 2),
      predecessors: null,
      parentId: epic1.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e1t2 = await prisma.task.create({
    data: {
      title: "Design and migrate Prisma schema",
      description:
        "Model User, Account, Session, Project, ProjectMember, Task, TaskComment with correct indexes, UUID PKs, and @map conventions. Run and verify migration against VPS database.",
      label: "HIGH",
      bucket: "DONE",
      isEpic: false,
      startDate: d(monday, 1),
      dueDate: d(monday, 4),
      predecessors: e1t1.id,
      parentId: epic1.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e1t3 = await prisma.task.create({
    data: {
      title: "Implement Google OAuth with Auth.js v5",
      description:
        "Configure Auth.js NextAuth instance with Google provider, PrismaAdapter, session strategy, and typed session augmentation. Protect routes via middleware.",
      label: "HIGH",
      bucket: "DONE",
      isEpic: false,
      startDate: d(monday, 3),
      dueDate: d(monday, 6),
      predecessors: e1t2.id,
      parentId: epic1.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e1t4 = await prisma.task.create({
    data: {
      title: "Build Server Actions for project CRUD",
      description:
        "Create, read, update, and archive projects via Zod-validated Server Actions with revalidatePath. Wire up optimistic UI in the project list page.",
      label: "HIGH",
      bucket: "IN_PROGRESS",
      isEpic: false,
      startDate: d(monday, 5),
      dueDate: d(monday, 9),
      predecessors: e1t3.id,
      parentId: epic1.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e1t5 = await prisma.task.create({
    data: {
      title: "Build Server Actions for task CRUD",
      description:
        "Implement createTask, updateTask, deleteTask, and bulkUpdateStatus server actions with full Zod validation, permission checks, and SSE broadcast after each mutation.",
      label: "HIGH",
      bucket: "IN_PROGRESS",
      isEpic: false,
      startDate: d(monday, 8),
      dueDate: d(monday, 13),
      predecessors: e1t4.id,
      parentId: epic1.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e1t6 = await prisma.task.create({
    data: {
      title: "Implement SSE real-time broadcast layer",
      description:
        "Wire in-process EventEmitter with the /api/projects/[projectId]/events SSE Route Handler. Ensure cleanup on client disconnect to prevent memory leaks.",
      label: "URGENT",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 12),
      dueDate: d(monday, 16),
      predecessors: e1t5.id,
      parentId: epic1.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e1t7 = await prisma.task.create({
    data: {
      title: "Integrate Azure Blob Storage for file attachments",
      description:
        "Set up Azurite locally and Azure Blob in production. Implement secure upload/download presigned URLs and attach files to tasks via server actions.",
      label: "MEDIUM",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 14),
      dueDate: d(monday, 18),
      predecessors: e1t5.id,
      parentId: epic1.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e1t8 = await prisma.task.create({
    data: {
      title: "Add project member invite system",
      description:
        "Email-based invitation flow: generate signed token, send email via Resend, accept endpoint that creates ProjectMember with MEMBER role.",
      label: "MEDIUM",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 16),
      dueDate: d(monday, 21),
      predecessors: e1t4.id,
      parentId: epic1.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e1t9 = await prisma.task.create({
    data: {
      title: "Role-based permission middleware",
      description:
        "Enforce OWNER/ADMIN/MEMBER permissions on every server action and route handler. Centralize permission checks in a shared utility to avoid duplication.",
      label: "HIGH",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 19),
      dueDate: d(monday, 23),
      predecessors: e1t8.id,
      parentId: epic1.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e1t10 = await prisma.task.create({
    data: {
      title: "Set up GitHub Actions CI pipeline",
      description:
        "Lint, type-check, and build on every PR. Cache Bun dependencies and Docker layers. Block merges on failures.",
      label: "MEDIUM",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 20),
      dueDate: d(monday, 25),
      predecessors: e1t6.id,
      parentId: epic1.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e1t11 = await prisma.task.create({
    data: {
      title: "Implement cursor-based pagination on task API",
      description:
        "Replace offset pagination with cursor-based pagination using Prisma cursor + take. Update all task list queries and SSE delta payloads.",
      label: "MEDIUM",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 23),
      dueDate: d(monday, 27),
      predecessors: e1t5.id,
      parentId: epic1.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e1t12 = await prisma.task.create({
    data: {
      title: "Backend integration tests with Vitest",
      description:
        "Cover all server actions and route handlers with integration tests using an isolated Prisma test client seeded per test suite. Target 80% branch coverage.",
      label: "LOW",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 27),
      dueDate: d(monday, 41),
      predecessors: `${e1t10.id},${e1t11.id}`,
      parentId: epic1.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EPIC 2 — Product UI & UX
  // Spans: Week 3 → Week 10  (+14 … +69 days)
  // ─────────────────────────────────────────────────────────────────────────
  const epic2 = await prisma.task.create({
    data: {
      title: "Product UI — Gantt, Calendar & Dashboard",
      description:
        "Design and build all user-facing screens: dashboard shell, month/week calendar views, interactive Gantt chart with drag-resize, task detail panel, and global search. Must be fully keyboard-accessible and responsive.",
      label: "HIGH",
      bucket: "TODO",
      isEpic: true,
      showSubtasksOnCard: true,
      startDate: d(monday, 14),
      dueDate: d(monday, 69),
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e2t1 = await prisma.task.create({
    data: {
      title: "Design token system and global CSS",
      description:
        "Define the full Tailwind v4 @theme token set: colors (HSL palette), spacing scale, typography, radius, shadow. Export to globals.css. No arbitrary values allowed after this task.",
      label: "HIGH",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 14),
      dueDate: d(monday, 17),
      predecessors: null,
      parentId: epic2.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e2t2 = await prisma.task.create({
    data: {
      title: "Build shadcn/ui component library baseline",
      description:
        "Install and configure all shadcn/ui primitives needed: Button, Input, Dialog, Select, Badge, Tooltip, Popover, DropdownMenu, Avatar, Skeleton. Verify CVA variants and cn merging.",
      label: "HIGH",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 16),
      dueDate: d(monday, 20),
      predecessors: e2t1.id,
      parentId: epic2.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e2t3 = await prisma.task.create({
    data: {
      title: "Implement dashboard shell with sidebar navigation",
      description:
        "Persistent sidebar with project list, collapsible sections, active route highlighting. Top nav with breadcrumb, user avatar, and notifications bell. Server Component layout.",
      label: "HIGH",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 19),
      dueDate: d(monday, 24),
      predecessors: e2t2.id,
      parentId: epic2.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e2t4 = await prisma.task.create({
    data: {
      title: "Build Month calendar view",
      description:
        "Render a full month grid with task chips per day. Multi-day tasks span columns. Navigation controls (prev/next/today). Overflow handling (+N more). Clicking a chip opens task detail.",
      label: "HIGH",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 22),
      dueDate: d(monday, 29),
      predecessors: e2t3.id,
      parentId: epic2.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e2t5 = await prisma.task.create({
    data: {
      title: "Build Week calendar view",
      description:
        "7-column week layout with hourly rows. Drag to create/move tasks. Color-coded by priority. Sync scroll between columns. Integrate with SSE for live updates.",
      label: "MEDIUM",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 28),
      dueDate: d(monday, 35),
      predecessors: e2t4.id,
      parentId: epic2.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e2t6 = await prisma.task.create({
    data: {
      title: "Build interactive Gantt chart — horizontal timeline",
      description:
        "Horizontal scrollable timeline with day/week/month zoom levels. Task bars render start→due dates. Epics show collapsed/expanded rows. Predecessor lines drawn as SVG arrows between dependent bars.",
      label: "URGENT",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 33),
      dueDate: d(monday, 44),
      predecessors: e2t3.id,
      parentId: epic2.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e2t7 = await prisma.task.create({
    data: {
      title: "Drag-to-reschedule on Gantt bars",
      description:
        "Pointer-event driven drag handler: moving a bar updates startDate/dueDate optimistically then calls updateTask server action. Snap-to-day grid. Undo with Ctrl+Z.",
      label: "URGENT",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 43),
      dueDate: d(monday, 50),
      predecessors: e2t6.id,
      parentId: epic2.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e2t8 = await prisma.task.create({
    data: {
      title: "Resize Gantt bars to extend/shrink duration",
      description:
        "Right-edge resize handle changes dueDate. Left-edge changes startDate. Minimum duration: 1 day. Show date tooltip during resize. Persist via server action.",
      label: "HIGH",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 49),
      dueDate: d(monday, 55),
      predecessors: e2t7.id,
      parentId: epic2.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e2t9 = await prisma.task.create({
    data: {
      title: "Task detail side panel",
      description:
        "Slide-in panel showing task fields (title, description, status, priority, dates, assignee, labels, attachments, comments). Inline editing with optimistic updates. Keyboard shortcut to close (Esc).",
      label: "HIGH",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 44),
      dueDate: d(monday, 52),
      predecessors: e2t6.id,
      parentId: epic2.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e2t10 = await prisma.task.create({
    data: {
      title: "Global command palette and search",
      description:
        "⌘K palette for quick task/project navigation, status changes, and assignee updates. Fuzzy search across all project tasks. Keyboard-first UX.",
      label: "MEDIUM",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 52),
      dueDate: d(monday, 58),
      predecessors: `${e2t8.id},${e2t9.id}`,
      parentId: epic2.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e2t11 = await prisma.task.create({
    data: {
      title: "SSE live updates on Gantt and calendar views",
      description:
        "Subscribe to /events SSE endpoint on project load. Apply delta updates to local state without full re-render. Show 'updated by [user]' toasts on remote changes.",
      label: "HIGH",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 55),
      dueDate: d(monday, 62),
      predecessors: e1t6.id,
      parentId: epic2.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const e2t12 = await prisma.task.create({
    data: {
      title: "Accessibility audit and WCAG 2.1 AA compliance",
      description:
        "Run axe-core on all views. Fix contrast ratios, add ARIA labels to Gantt bars and calendar chips, ensure full keyboard navigation on modals and panels. Document audit results.",
      label: "MEDIUM",
      bucket: "TODO",
      isEpic: false,
      startDate: d(monday, 61),
      dueDate: d(monday, 69),
      predecessors: `${e2t10.id},${e2t11.id}`,
      parentId: epic2.id,
      projectId: pid,
      creatorId: cid,
      assigneeId: aid,
    },
  });

  const totalTasks =
    2 + // epics
    [
      e1t1, e1t2, e1t3, e1t4, e1t5, e1t6, e1t7, e1t8, e1t9, e1t10, e1t11,
      e1t12, e2t1, e2t2, e2t3, e2t4, e2t5, e2t6, e2t7, e2t8, e2t9, e2t10,
      e2t11, e2t12,
    ].length; // 24 subtasks

  console.log(
    `\n🌱  Seed complete: 1 project · 2 epics · 24 subtasks = ${totalTasks} total tasks\n`
  );
  console.log(`   Project ID : ${pid}`);
  console.log(`   Owner      : ${owner.name} <${owner.email}>`);
}

main()
  .catch((e) => {
    console.error("❌  Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
