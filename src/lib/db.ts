import "server-only";

import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client 单例。
 *
 * Next.js 开发模式下模块会被热重载，如果每次 new 一个 client，
 * 连接池会迅速耗尽。挂到 globalThis 上避免重复实例化。
 *
 * @see docs/frontend-architecture.md §2（src/lib/db.ts — Member 2）
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
