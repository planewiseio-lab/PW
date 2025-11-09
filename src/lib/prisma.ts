import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient;

// Always log DATABASE_URL for debugging (without exposing password)
// This helps diagnose connection issues in Vercel
function logDatabaseUrl() {
  if (typeof process.env.DATABASE_URL === "string") {
    const dbUrl = process.env.DATABASE_URL;
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ":****@"); // Mask password
    console.log(`[Prisma] Using DATABASE_URL: ${maskedUrl}`);
    console.log(`[Prisma] NODE_ENV: ${process.env.NODE_ENV || "undefined"}`);
    // Check if using correct port (6543 for Connection Pooler)
    if (dbUrl.includes(":5432")) {
      console.error(`[Prisma] ⚠️ WARNING: DATABASE_URL uses port 5432 (direct connection). Should use port 6543 (Connection Pooler) for Vercel!`);
    } else if (dbUrl.includes(":6543")) {
      console.log(`[Prisma] ✅ DATABASE_URL correctly uses port 6543 (Connection Pooler)`);
    }
  } else {
    console.error(`[Prisma] ⚠️ ERROR: DATABASE_URL is not defined!`);
  }
}

// Log immediately when module loads
logDatabaseUrl();

if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  prismaInstance = new PrismaClient();
  // Log again after Prisma client creation to ensure URL is correct
  logDatabaseUrl();
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  prismaInstance = globalForPrisma.prisma;
}

export const prisma = prismaInstance;
