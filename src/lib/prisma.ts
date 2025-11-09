import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient;

// Log DATABASE_URL in production for debugging (without exposing password)
if (process.env.NODE_ENV === "production" && typeof process.env.DATABASE_URL === "string") {
  const dbUrl = process.env.DATABASE_URL;
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ":****@"); // Mask password
  console.log(`[Prisma] Using DATABASE_URL: ${maskedUrl}`);
}

if (process.env.NODE_ENV === "production") {
  prismaInstance = new PrismaClient();
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  prismaInstance = globalForPrisma.prisma;
}

export const prisma = prismaInstance;
