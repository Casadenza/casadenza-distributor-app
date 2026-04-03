import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// 🔥 Better config (connection stability + logging control)
const prismaClient =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// 🔥 Prevent multiple instances in dev (hot reload fix)
if (process.env.NODE_ENV !== "production") {
  global.prisma = prismaClient;
}

// 🔥 Optional: auto reconnect safeguard (lightweight)
prismaClient.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error: any) {
    // retry once if connection closed
    if (
      error?.message?.includes("Closed") ||
      error?.message?.includes("connection")
    ) {
      try {
        return await next(params);
      } catch (err) {
        throw err;
      }
    }
    throw error;
  }
});

export const db = prismaClient;
export const prisma = prismaClient;