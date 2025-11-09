import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient;

// Always log database URL for debugging (without exposing password)
// This helps diagnose connection issues in Vercel
// Since Jan 2024, Supabase uses Supavisor (not pgBouncer) for IPv4 compatibility with Vercel
function logDatabaseUrl(dbUrl: string, source: string) {
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ":****@"); // Mask password
  console.log(`[Prisma] Using ${source}: ${maskedUrl}`);
  console.log(`[Prisma] NODE_ENV: ${process.env.NODE_ENV || "undefined"}`);

  // Check for Supavisor (pooler.supabase.com) or old pgBouncer URL
  if (dbUrl.includes("pooler.supabase.com")) {
    console.log(`[Prisma] ✅ Using Supavisor (IPv4 compatible for Vercel)`);
  } else if (dbUrl.includes("db.") && dbUrl.includes(":6543")) {
    console.warn(
      `[Prisma] ⚠️ WARNING: Using old pgBouncer URL. Supabase migrated to Supavisor in Jan 2024. Use POSTGRES_PRISMA_URL instead!`
    );
  } else if (dbUrl.includes(":5432")) {
    console.error(
      `[Prisma] ⚠️ WARNING: Using direct connection (port 5432). This may not work with Vercel. Use Supavisor (POSTGRES_PRISMA_URL) instead!`
    );
  }
}

// Get database URL - prefer POSTGRES_PRISMA_URL (Supavisor) for Vercel, fallback to DATABASE_URL
// Since Jan 2024, Supabase uses Supavisor instead of pgBouncer for IPv4 compatibility with Vercel
const getDatabaseUrl = (): string => {
  // In production/Vercel, prefer POSTGRES_PRISMA_URL (Supavisor)
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    if (process.env.POSTGRES_PRISMA_URL) {
      logDatabaseUrl(process.env.POSTGRES_PRISMA_URL, "POSTGRES_PRISMA_URL");
      return process.env.POSTGRES_PRISMA_URL;
    }
    if (process.env.DATABASE_URL) {
      logDatabaseUrl(process.env.DATABASE_URL, "DATABASE_URL");
      return process.env.DATABASE_URL;
    }
    console.error(
      `[Prisma] ⚠️ ERROR: Neither POSTGRES_PRISMA_URL nor DATABASE_URL is defined!`
    );
    throw new Error(
      "Database URL not configured. Set POSTGRES_PRISMA_URL or DATABASE_URL."
    );
  }

  // In development, use DATABASE_URL (local connection)
  if (process.env.DATABASE_URL) {
    logDatabaseUrl(process.env.DATABASE_URL, "DATABASE_URL");
    return process.env.DATABASE_URL;
  }

  console.error(`[Prisma] ⚠️ ERROR: DATABASE_URL is not defined!`);
  throw new Error("Database URL not configured. Set DATABASE_URL.");
};

const databaseUrl = getDatabaseUrl();

if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  // In production/Vercel, use connection pooling settings optimized for serverless
  // Supavisor handles connection pooling automatically
  prismaInstance = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  prismaInstance = globalForPrisma.prisma;
}

export const prisma = prismaInstance;
