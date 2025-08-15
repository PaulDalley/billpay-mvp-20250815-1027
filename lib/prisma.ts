import { PrismaClient } from "@prisma/client";

// Ensure a single PrismaClient instance in dev (Next.js hot reload safe)
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    // log: ["query", "error", "warn"], // uncomment if you want query logs
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export default prisma;
