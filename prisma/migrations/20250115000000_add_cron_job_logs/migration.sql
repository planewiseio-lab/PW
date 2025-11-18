-- CreateTable
CREATE TABLE IF NOT EXISTS "cron_job_logs" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "result" JSONB,
    "error" TEXT,
    "metadata" JSONB
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cron_job_logs_jobName_startedAt_idx" ON "cron_job_logs"("jobName", "startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cron_job_logs_status_idx" ON "cron_job_logs"("status");




