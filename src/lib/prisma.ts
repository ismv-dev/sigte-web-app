import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/sigtedb?schema=public";

// Si no se encuentra DATABASE_URL (ej. en desarrollo local sin .env),
// se asume la base de datos PostgreSQL local de docker-compose.
const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

