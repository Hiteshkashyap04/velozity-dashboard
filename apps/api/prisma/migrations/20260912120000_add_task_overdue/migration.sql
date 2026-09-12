ALTER TABLE "Task" ADD COLUMN "overdue" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Task_overdue_idx" ON "Task"("overdue");
