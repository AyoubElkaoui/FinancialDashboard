-- AlterTable
ALTER TABLE "rm_project_summary" ADD COLUMN     "projectleider" TEXT,
ADD COLUMN     "startdatum" DATE;

-- CreateIndex
CREATE INDEX "rm_project_summary_database_projectleider_idx" ON "rm_project_summary"("database", "projectleider");
