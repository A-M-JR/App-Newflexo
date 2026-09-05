import "dotenv/config";
import { Pool } from "pg";

const cs = process.env.DB_URL_OFFICIAL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString: cs, max: 3 });

const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

console.log("=== VOLUME ===");
for (const t of ["Orcamento", "Pedido", "ItemOrcamento", "ItemPedido", "Cliente", "Etiqueta", "Status", "Vendedor", "\"User\""]) {
  const name = t.startsWith('"') ? t : `"${t}"`;
  const r = await q(`SELECT COUNT(*)::int c FROM ${name}`);
  console.log(String(t).padEnd(16), r[0].c);
}

console.log("\n=== INDEXES existentes (Orcamento/Pedido) ===");
const idx = await q(`
  SELECT tablename, indexname, indexdef FROM pg_indexes
  WHERE schemaname='public' AND tablename IN ('Orcamento','Pedido','ItemOrcamento','Cliente')
  ORDER BY tablename, indexname`);
idx.forEach(r => console.log(`${r.tablename.padEnd(14)} ${r.indexdef}`));

const timeIt = async (label, sql, params = []) => {
  const t0 = Date.now();
  await q(sql, params);
  const t1 = Date.now();
  // segunda execução (cache quente)
  const t2 = Date.now();
  await q(sql, params);
  const t3 = Date.now();
  console.log(`${label.padEnd(42)} cold=${t1 - t0}ms  warm=${t3 - t2}ms`);
};

console.log("\n=== TEMPOS: query de KPI dos ORCAMENTOS (a que roda hoje) ===");
const kpiOrc = `
  SELECT
    COUNT(*) FILTER (WHERE p."ativo" = TRUE)::int as total_filtrado,
    COUNT(*) FILTER (WHERE p."statusId" = 4)::int as vigentes,
    COUNT(*) FILTER (WHERE p."statusId" = 2)::int as aprovados,
    COUNT(*) FILTER (WHERE p."statusId" IN (1, 5))::int as parados,
    COALESCE(SUM(p."totalGeral") FILTER (WHERE p."statusId" <> 5), 0)::float as total_valor
  FROM "Orcamento" p
  LEFT JOIN "Cliente" c ON p."clienteId" = c.id
  WHERE (
    p."numero" ILIKE $1
    OR c."razaoSocial" ILIKE $1
    OR EXISTS (
      SELECT 1 FROM "ItemOrcamento" io
      LEFT JOIN "Etiqueta" e ON io."etiquetaId" = e.id
      WHERE io."orcamentoId" = p.id
        AND (io."descricao" ILIKE $1 OR e."nome" ILIKE $1 OR e."codigo" ILIKE $1)
    )
  )
    AND ($2::int IS NULL OR p."vendedorId" = $2)
    AND ($3::timestamp IS NULL OR p."criadoEm" >= $3)
    AND ($4::timestamp IS NULL OR p."criadoEm" < $4)
    AND p."ativo" = TRUE`;
await timeIt("KPI orcamentos (busca vazia '%%')", kpiOrc, ["%%", null, null, null]);

console.log("\n=== TEMPOS: mesma KPI SEM o bloco de busca ===");
const kpiOrcSemBusca = `
  SELECT
    COUNT(*) FILTER (WHERE p."ativo" = TRUE)::int as total_filtrado,
    COUNT(*) FILTER (WHERE p."statusId" = 4)::int as vigentes,
    COUNT(*) FILTER (WHERE p."statusId" = 2)::int as aprovados,
    COUNT(*) FILTER (WHERE p."statusId" IN (1, 5))::int as parados,
    COALESCE(SUM(p."totalGeral") FILTER (WHERE p."statusId" <> 5), 0)::float as total_valor
  FROM "Orcamento" p
  WHERE p."ativo" = TRUE`;
await timeIt("KPI orcamentos (sem ILIKE/EXISTS/JOIN)", kpiOrcSemBusca);

console.log("\n=== EXPLAIN ANALYZE (KPI orcamentos atual) ===");
const ex = await q(`EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) ${kpiOrc}`, ["%%", null, null, null]);
ex.forEach(r => console.log("   " + r["QUERY PLAN"]));

console.log("\n=== TEMPOS: KPI dos PEDIDOS (a que roda hoje) ===");
const kpiPed = `
  SELECT
    COUNT(*) FILTER (WHERE TRUE)::int as total_filtrado,
    COUNT(*) FILTER (WHERE p."statusId" = $2)::int as em_analise,
    COUNT(*) FILTER (WHERE p."statusId" IN ($3, $4))::int as em_producao_soma,
    COUNT(*) FILTER (WHERE p."statusId" = $4)::int as separacao,
    COUNT(*) FILTER (WHERE p."statusId" = $5)::int as entregue,
    COUNT(*) FILTER (WHERE p."statusId" <> $5 AND p."prazoEntrega" IS NOT NULL
      AND (p."prazoEntrega"::date - CURRENT_DATE) <= 3)::int as sla_alerta,
    COUNT(*) FILTER (WHERE p."ativo" = FALSE)::int as cancelados,
    COALESCE(SUM(p."totalGeral"), 0)::float as total_valor
  FROM "Pedido" p
  LEFT JOIN "Cliente" c ON p."clienteId" = c.id
  WHERE (p."numero" ILIKE $1 OR c."razaoSocial" ILIKE $1)
    AND (false::boolean = TRUE OR p."ativo" = TRUE)`;
const st = await q(`SELECT id, nome FROM "Status" WHERE modulo='pedido' ORDER BY id`);
console.log("   Status pedido:", st.map(s => `${s.id}=${s.nome}`).join(", "));
const byName = (frag) => (st.find(s => s.nome.toLowerCase().includes(frag)) || { id: -1 }).id;
await timeIt("KPI pedidos (busca vazia)", kpiPed, ["%%", byName("anál") || byName("anal"), byName("produ"), byName("separa"), byName("entregue")]);

console.log("\n=== EXPLAIN ANALYZE (KPI pedidos atual) ===");
const ex2 = await q(`EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) ${kpiPed}`, ["%%", byName("anal"), byName("produ"), byName("separa"), byName("entregue")]);
ex2.forEach(r => console.log("   " + r["QUERY PLAN"]));

console.log("\n=== EXPLAIN ANALYZE: pagina 1 dos orcamentos (findMany equivalente) ===");
const ex3 = await q(`EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
  SELECT * FROM "Orcamento" WHERE "ativo" = TRUE ORDER BY id DESC LIMIT 15 OFFSET 0`);
ex3.forEach(r => console.log("   " + r["QUERY PLAN"]));

console.log("\n=== Status geral de statistics/autovacuum ===");
const vac = await q(`
  SELECT relname, n_live_tup, n_dead_tup, last_analyze, last_autoanalyze
  FROM pg_stat_user_tables WHERE relname IN ('Orcamento','Pedido','ItemOrcamento','Cliente')`);
vac.forEach(r => console.log("   ", r.relname, "live=" + r.n_live_tup, "dead=" + r.n_dead_tup,
  "analyze=" + (r.last_analyze || r.last_autoanalyze || "NUNCA")));

await pool.end();
