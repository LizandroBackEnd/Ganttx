import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ProjectRole, TaskPriority, TaskStatus } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  // Create a dev user (simulates Google OAuth user)
  const user = await prisma.user.upsert({
    where: { email: "dev@ganttx.local" },
    update: {},
    create: {
      name: "Dev User",
      email: "dev@ganttx.local",
      image: null,
    },
  });

  // Create a sample project with owner membership
  const project = await prisma.project.create({
    data: {
      name: "Ganttx MVP",
      description: "Build the first version of Ganttx",
      members: {
        create: {
          userId: user.id,
          role: ProjectRole.OWNER,
        },
      },
    },
  });

  // Sample tasks spanning current and upcoming weeks
  const today = new Date();
  const addDays = (d: Date, n: number): Date => {
    const result = new Date(d);
    result.setDate(result.getDate() + n);
    return result;
  };

  const tasksData = [
    {
      title: "Set up Prisma schema and migrations",
      description: "Define all models, enums, indexes, and run initial migration",
      priority: TaskPriority.HIGH,
      status: TaskStatus.DONE,
      progress: 100,
      startDate: today,
      dueDate: addDays(today, 2),
      projectId: project.id,
      creatorId: user.id,
      assigneeId: user.id,
    },
    {
      title: "Implement Google OAuth with Auth.js",
      description: "Configure Google provider, Prisma adapter, session handling",
      priority: TaskPriority.HIGH,
      status: TaskStatus.IN_PROGRESS,
      progress: 60,
      startDate: addDays(today, 1),
      dueDate: addDays(today, 4),
      projectId: project.id,
      creatorId: user.id,
      assigneeId: user.id,
    },
    {
      title: "Build Month calendar view",
      description: "Render days grid, task chips, navigation controls",
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      progress: 0,
      startDate: addDays(today, 3),
      dueDate: addDays(today, 7),
      projectId: project.id,
      creatorId: user.id,
      assigneeId: null,
    },
    {
      title: "Build interactive Gantt chart",
      description: "Horizontal timeline with draggable/resizable bars",
      priority: TaskPriority.HIGH,
      status: TaskStatus.TODO,
      progress: 0,
      startDate: addDays(today, 5),
      dueDate: addDays(today, 12),
      projectId: project.id,
      creatorId: user.id,
      assigneeId: null,
    },
    {
      title: "Wire real-time SSE sync",
      description: "SSE Route Handler + client EventSource for live updates",
      priority: TaskPriority.URGENT,
      status: TaskStatus.TODO,
      progress: 0,
      startDate: addDays(today, 7),
      dueDate: addDays(today, 14),
      projectId: project.id,
      creatorId: user.id,
      assigneeId: null,
    },
  ];

  for (const task of tasksData) {
    await prisma.task.create({ data: task });
  }

  console.log(`Seeded: 1 user, 1 project, ${tasksData.length} tasks`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
