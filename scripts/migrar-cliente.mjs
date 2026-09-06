/**
 * Aplica a migração de prisma/migrations/20260905_cliente_documento_opcional
 * sem precisar do psql instalado. Usa o mesmo pg/dotenv do resto do projeto.
 *
 *   node scripts/migrar-cliente.mjs             -> só confere (não altera nada)
 *   node scripts/migrar-cliente.mjs --aplicar   -> PARTE 1: estrutura
 *   node scripts/migrar-cliente.mjs --limpar    -> PARTE 2: troca '' por NULL
 *
 * Sem argumento ele não escreve nada. É preciso pedir explicitamente.
 */
import "dotenv/config";
import { Pool } from "pg";

const args = new Set(process.argv.slice(2));
const aplicar = args.has("--aplicar");
const limpar = args.has("--limpar");

const cs = process.env.DB_URL_OFFICIAL || process.env.DATABASE_URL;
if (!cs) {
  console.error("Não achei DB_URL_OFFICIAL nem DATABASE_URL no .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: cs, max: 2 });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

// PARTE 1 — estrutura. Nenhum destes comandos escreve em linha.
const ESTRUTURA = [
  `ALTER TABLE "Cliente" ALTER COLUMN "cnpj"     DROP NOT NULL`,
  `ALTER TABLE "Cliente" ALTER COLUMN "telefone" DROP NOT NULL`,
  `ALTER TABLE "Cliente" ALTER COLUMN "cep"      DROP NOT NULL`,
  `ALTER TABLE "Cliente" ALTER COLUMN "cidade"   DROP NOT NULL`,
  `ALTER TABLE "Cliente" ALTER COLUMN "estado"   DROP NOT NULL`,
  `ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "pais" TEXT DEFAULT 'Brasil'`,
];

// PARTE 2 — só toca em campos que já estão vazios.
const LIMPEZA = [
  `UPDATE "Cliente" SET "cnpj"     = NULL WHERE btrim("cnpj")     = ''`,
  `UPDATE "Cliente" SET "telefone" = NULL WHERE btrim("telefone") = ''`,
  `UPDATE "Cliente" SET "cep"      = NULL WHERE btrim("cep")      = ''`,
  `UPDATE "Cliente" SET "cidade"   = NULL WHERE btrim("cidade")   = ''`,
  `UPDATE "Cliente" SET "estado"   = NULL WHERE btrim("estado")   = ''`,
];

async function estado() {
  const cols = await q(`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'Cliente'
      AND column_name IN ('cnpj','telefone','cep','cidade','estado','pais')
    ORDER BY column_name`);
  console.log("\n  Colunas hoje:");
  for (const c of cols) {
    console.log(`    ${c.column_name.padEnd(10)} aceita nulo: ${c.is_nullable === "YES" ? "sim" : "NÃO"}`);
  }
  if (!cols.some((c) => c.column_name === "pais")) {
    console.log("    pais       ainda não existe");
  }
}

async function conferir() {
  const [r] = await q(`
    SELECT
      COUNT(*)::int                                       AS total,
      COUNT(*) FILTER (WHERE btrim("cnpj")     = '')::int AS cnpj_vazio,
      COUNT(*) FILTER (WHERE btrim("telefone") = '')::int AS telefone_vazio,
      COUNT(*) FILTER (WHERE btrim("cep")      = '')::int AS cep_vazio,
      COUNT(*) FILTER (WHERE btrim("cidade")   = '')::int AS cidade_vazio,
      COUNT(*) FILTER (WHERE btrim("estado")   = '')::int AS estado_vazio
    FROM "Cliente"`);
  console.log("\n  Linhas que a PARTE 2 tocaria (campos hoje com texto vazio):");
  console.log(`    total de clientes: ${r.total}`);
  console.log(`    cnpj vazio:     ${r.cnpj_vazio}`);
  console.log(`    telefone vazio: ${r.telefone_vazio}`);
  console.log(`    cep vazio:      ${r.cep_vazio}`);
  console.log(`    cidade vazio:   ${r.cidade_vazio}`);
  console.log(`    estado vazio:   ${r.estado_vazio}`);
  const soma = r.cnpj_vazio + r.telefone_vazio + r.cep_vazio + r.cidade_vazio + r.estado_vazio;
  if (soma === 0) console.log("    -> tudo zero: a PARTE 2 é dispensável.");
}

async function executar(titulo, comandos) {
  console.log(`\n  ${titulo}`);
  // DDL no Postgres é transacional: se um comando falhar, nada é aplicado.
  await q("BEGIN");
  try {
    for (const sql of comandos) {
      const r = await pool.query(sql);
      const n = r.rowCount == null ? "" : ` (${r.rowCount} linha(s))`;
      console.log(`    ok  ${sql}${n}`);
    }
    await q("COMMIT");
    console.log("    COMMIT");
  } catch (e) {
    await q("ROLLBACK");
    console.error(`\n    FALHOU, nada foi aplicado: ${e.message}`);
    throw e;
  }
}

try {
  await estado();
  await conferir();

  if (!aplicar && !limpar) {
    console.log("\n  Nada foi alterado. Para aplicar:");
    console.log("    node scripts/migrar-cliente.mjs --aplicar     (estrutura)");
    console.log("    node scripts/migrar-cliente.mjs --limpar      (opcional, troca '' por NULL)\n");
  } else {
    if (aplicar) await executar("PARTE 1 — estrutura (não escreve em linhas):", ESTRUTURA);
    if (limpar) await executar("PARTE 2 — limpeza (escreve):", LIMPEZA);
    await estado();
    console.log("\n  Pronto. Reinicie o dev server antes de testar.\n");
  }
} finally {
  await pool.end();
}
