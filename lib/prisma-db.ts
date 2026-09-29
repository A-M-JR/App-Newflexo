import "dotenv/config";
import { existsSync, statSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import type { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
  prismaStamp?: number;
  prismaSchemaWarned?: number;
  pool?: Pool;
};

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
globalForPrisma.pool = pool;

// Carrega a classe do client no momento da chamada (e não num import no topo),
// para que um client recém-gerado seja lido do disco em vez do cache do Node.
function criarClient(): PrismaClient {
  const { PrismaClient } = require("@prisma/client");
  return new PrismaClient({ adapter: new PrismaPg(pool as any) });
}

// Em produção o client é gerado no build e nunca muda com o processo no ar.
function clientProducao(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = criarClient();
  return globalForPrisma.prisma;
}

// Em dev, o client guardado no global sobrevive ao Fast Refresh. Depois de um
// `prisma generate` ele continuava sendo o antigo, que não conhece os campos
// novos do schema — as consultas falhavam e as telas vinham vazias até alguém
// reiniciar o servidor. Aqui o client é recriado sozinho quando o client gerado
// muda no disco.
const GERADO = join(process.cwd(), "node_modules", ".prisma", "client", "schema.prisma");
const SCHEMA = join(process.cwd(), "prisma", "schema.prisma");
let ultimaChecagem = 0;

function mtime(arquivo: string) {
  try {
    return existsSync(arquivo) ? statSync(arquivo).mtimeMs : 0;
  } catch {
    return 0;
  }
}

function clientDev(): PrismaClient {
  const agora = Date.now();
  // Checa o disco no máximo uma vez por segundo, não a cada consulta.
  if (globalForPrisma.prisma && agora - ultimaChecagem < 1000) return globalForPrisma.prisma;
  ultimaChecagem = agora;

  const stampGerado = mtime(GERADO);
  if (!globalForPrisma.prisma || stampGerado !== globalForPrisma.prismaStamp) {
    if (globalForPrisma.prisma) {
      console.log("[prisma] client regerado no disco, recarregando sem reiniciar o servidor.");
      Object.keys(require.cache).forEach((key) => {
        if (key.includes(".prisma") || key.includes("@prisma/client")) delete require.cache[key];
      });
    }
    globalForPrisma.prisma = criarClient();
    globalForPrisma.prismaStamp = stampGerado;
  }

  // schema.prisma mais novo que o client: alguém mexeu no schema e não gerou.
  const stampSchema = mtime(SCHEMA);
  if (stampSchema > stampGerado && globalForPrisma.prismaSchemaWarned !== stampSchema) {
    globalForPrisma.prismaSchemaWarned = stampSchema;
    console.warn("[prisma] schema.prisma mudou depois do último generate. Rode `npx prisma generate`.");
  }

  return globalForPrisma.prisma;
}

const obterClient = process.env.NODE_ENV === "production" ? clientProducao : clientDev;

// Proxy para o resto do código continuar usando `prisma.cliente...` normalmente,
// sempre caindo no client atual.
export const prisma = new Proxy({} as PrismaClient, {
  get(_alvo, prop) {
    const client = obterClient() as any;
    const valor = client[prop];
    return typeof valor === "function" ? valor.bind(client) : valor;
  },
});
