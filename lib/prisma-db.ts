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
// limites saudáveis: teto de conexões e falha rápido em vez de ficar pendurado
// quando o banco não responde.
//
// O banco é um Neon em sa-east-1: cada ida e volta custa ~25ms de rede e abrir
// uma conexão nova ainda paga o handshake TLS por cima disso. Com o antigo
// idleTimeoutMillis de 30s, qualquer pausa de meio minuto derrubava as conexões
// e a próxima tela pagava o handshake de novo. Mantendo o pool quente por 10
// minutos, a navegação normal reaproveita conexão já aberta.
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 600000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  });
const adapter = new PrismaPg(pool as any);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
