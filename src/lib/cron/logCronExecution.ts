import { prisma } from "@/lib/prisma";

export type CronJobStatus = "running" | "success" | "error";

export interface CronJobLogData {
  jobName: string;
  status: CronJobStatus;
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
  duration?: number;
}

/**
 * Enregistre l'exécution d'un cron job dans la base de données
 */
export async function logCronExecution(data: CronJobLogData) {
  try {
    const logEntry = await prisma.cron_job_logs.create({
      data: {
        jobName: data.jobName,
        status: data.status,
        startedAt: new Date(),
        completedAt: data.status !== "running" ? new Date() : undefined,
        duration: data.duration,
        result: data.result ? JSON.parse(JSON.stringify(data.result)) : null,
        error: data.error,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
      },
    });

    return logEntry;
  } catch (error) {
    // Ne pas faire échouer le cron si le logging échoue
    console.error(`[CRON-LOG] Failed to log cron execution for ${data.jobName}:`, error);
    return null;
  }
}

/**
 * Met à jour un log de cron job existant
 */
export async function updateCronLog(
  logId: string,
  data: {
    status: CronJobStatus;
    result?: any;
    error?: string;
    duration?: number;
  }
) {
  try {
    const updated = await prisma.cron_job_logs.update({
      where: { id: logId },
      data: {
        status: data.status,
        completedAt: new Date(),
        duration: data.duration,
        result: data.result ? JSON.parse(JSON.stringify(data.result)) : undefined,
        error: data.error,
      },
    });

    return updated;
  } catch (error) {
    console.error(`[CRON-LOG] Failed to update cron log ${logId}:`, error);
    return null;
  }
}

/**
 * Récupère les logs récents d'un cron job
 */
export async function getRecentCronLogs(jobName: string, limit: number = 10) {
  try {
    const logs = await prisma.cron_job_logs.findMany({
      where: { jobName },
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    return logs;
  } catch (error) {
    console.error(`[CRON-LOG] Failed to get recent logs for ${jobName}:`, error);
    return [];
  }
}




