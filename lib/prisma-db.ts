// Force reload for schema sync - Updated at 2026-04-21T17:53:00
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Força o recarregamento do cache do Prisma em ambiente de desenvolvimento
if (process.env.NODE_ENV !== "production") {
  Object.keys(require.cache).forEach((key) => {
    if (key.includes(".prisma") || key.includes("@prisma/client")) {
      delete require.cache[key];
    }
  });
}

const globalForPrisma = global as unknown as { prisma?: PrismaClient; pool?: Pool };

const connectionString = process.env.DB_URL_OFFICIAL || process.env.DATABASE_URL;

// Reutiliza o mesmo pool entre reloads (dev) para não vazar conexões, e define
// limites saudáveis: teto de conexões, encerra conexões ociosas e falha rápido
// em vez de ficar pendurado quando o banco não responde.
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
const adapter = new PrismaPg(pool as any);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
