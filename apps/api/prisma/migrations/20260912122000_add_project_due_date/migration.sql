ALTER TABLE "Project" ADD COLUMN "dueDate" TIMESTAMP(3);

CREATE INDEX "Project_dueDate_idx" ON "Project"("dueDate");
