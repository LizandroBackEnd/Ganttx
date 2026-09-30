-- DropIndex
DROP INDEX IF EXISTS "tasks_project_id_status_idx";

-- AlterTable
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "custom_priorities" JSONB,
ADD COLUMN IF NOT EXISTS "custom_statuses" JSONB;

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "priority",
DROP COLUMN IF EXISTS "progress",
DROP COLUMN IF EXISTS "status",
ADD COLUMN IF NOT EXISTS "bucket" VARCHAR(50) NOT NULL DEFAULT 'TODO',
ADD COLUMN IF NOT EXISTS "is_epic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "label" VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN IF NOT EXISTS "parent_id" UUID,
ADD COLUMN IF NOT EXISTS "predecessors" TEXT,
ADD COLUMN IF NOT EXISTS "show_subtasks_on_card" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "task_comments" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "task_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "task_comments_task_id_idx" ON "task_comments"("task_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "task_comments_author_id_idx" ON "task_comments"("author_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "task_comments_task_id_created_at_idx" ON "task_comments"("task_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tasks_parent_id_idx" ON "tasks"("parent_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tasks_project_id_bucket_idx" ON "tasks"("project_id", "bucket");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tasks_parent_id_fkey'
    ) THEN
        ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'task_comments_task_id_fkey'
    ) THEN
        ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'task_comments_author_id_fkey'
    ) THEN
        ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
