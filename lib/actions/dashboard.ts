"use server"

import { prisma } from "@/lib/prisma"
import { unstable_noStore as noStore } from "next/cache"
import { getPedidos } from "./pedidos"
import { getRequesterVendedorId } from "./users"

export async function getDashboardMetrics(vendedorIdParam?: number, requesterId?: number) {
  
  const quarentaDiasAtras = new Date()
  quarentaDiasAtras.setDate(quarentaDiasAtras.getDate() - 40)

  let vendedorId = vendedorIdParam
  
  // SEGURANÇA: Se houver um requesterId, verifica se ele é vendedor limitado
  if (requesterId) {
    const perm = await getRequesterVendedorId(requesterId)
    if (perm !== 'admin') {
      vendedorId = perm as number // Força o vendedorId dele
    }
  }

  const searchVendedor = vendedorId ? Number(vendedorId) : null

  // Datas do gráfico (últimos 6 meses) — calculadas antes para entrar no Promise.all.
  const monthsNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const chartData = []
  const baseDate = new Date()
  baseDate.setDate(1)
  baseDate.setHours(0, 0, 0, 0)
  const sixMonthsAgo = new Date(baseDate)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)

  // Todas as consultas do dashboard são independentes entre si (só dependem do
  // vendedor já resolvido). Antes rodavam em série — ~6 idas-e-voltas ao Neon
  // enfileiradas. Agora vão todas juntas num Promise.all: o tempo total passa a
  // ser o da consulta mais lenta, não a soma de todas.
  const [
    pedidoMetrics,
    orcamentoMetrics,
    clienteMetrics,
    clientesInativosList,
    orcStatsMes,
    pedStatsMes,
    recentes,
  ] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT
        COALESCE(SUM("totalGeral"), 0)::float as total_receita,
        COUNT(*) FILTER (WHERE "statusId" NOT IN (SELECT id FROM "Status" WHERE "modulo" = 'pedido' AND ("nome" ILIKE '%Entregue%' OR "nome" ILIKE '%Entrega%')))::int as ativos_count
      FROM "Pedido"
      WHERE (${searchVendedor}::int IS NULL OR "vendedorId" = ${searchVendedor})
        AND "ativo" = TRUE
    `,
    prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as total_orcamentos
      FROM "Orcamento"
      WHERE "statusId" = 4
        AND (${searchVendedor}::int IS NULL OR "vendedorId" = ${searchVendedor})
        AND "ativo" = TRUE
    `,
    prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as inativos_count
      FROM "Cliente" c
      WHERE "ultimaCompra" < ${quarentaDiasAtras}
        AND "ultimaCompra" IS NOT NULL
        AND (${searchVendedor}::int IS NULL OR EXISTS (SELECT 1 FROM "Pedido" p WHERE p."clienteId" = c.id AND p."vendedorId" = ${searchVendedor}))
    `,
    prisma.cliente.findMany({
      where: {
        ultimaCompra: { lt: quarentaDiasAtras, not: null },
        pedidos: searchVendedor ? { some: { vendedorId: searchVendedor } } : undefined
      },
      take: 15,
      orderBy: { ultimaCompra: 'asc' },
      select: { id: true, razaoSocial: true, ultimaCompra: true }
    }),
    prisma.$queryRaw<any[]>`
      SELECT
        EXTRACT(MONTH FROM "criadoEm")::int as mes,
        EXTRACT(YEAR FROM "criadoEm")::int as ano,
        COUNT(*)::int as count
      FROM "Orcamento"
      WHERE "criadoEm" >= ${sixMonthsAgo}
        AND (${searchVendedor}::int IS NULL OR "vendedorId" = ${searchVendedor})
        AND "ativo" = TRUE
      GROUP BY ano, mes
      ORDER BY ano, mes
    `,
    prisma.$queryRaw<any[]>`
      SELECT
        EXTRACT(MONTH FROM "criadoEm")::int as mes,
        EXTRACT(YEAR FROM "criadoEm")::int as ano,
        COUNT(*)::int as count
      FROM "Pedido"
      WHERE "criadoEm" >= ${sixMonthsAgo}
        AND (${searchVendedor}::int IS NULL OR "vendedorId" = ${searchVendedor})
        AND "ativo" = TRUE
      GROUP BY ano, mes
      ORDER BY ano, mes
    `,
    // Lista dos últimos pedidos da tela.
    getPedidos({ page: 1, limit: 10, vendedorId }),
  ])

  const pedStats = pedidoMetrics[0] || { total_receita: 0, ativos_count: 0 }
  const orcStats = orcamentoMetrics[0] || { total_orcamentos: 0 }
  const cliStats = clienteMetrics[0] || { inativos_count: 0 }

  for (let i = 5; i >= 0; i--) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1)
    const monthNum = d.getMonth() + 1 // Postgres EXTRACT MONTH is 1-indexed
    const yearNum = d.getFullYear()

    const orcsMes = orcStatsMes.find(s => s.mes === monthNum && s.ano === yearNum)?.count || 0
    const pedsMes = pedStatsMes.find(s => s.mes === monthNum && s.ano === yearNum)?.count || 0

    chartData.push({
      name: monthsNames[monthNum - 1],
      orcamentos: orcsMes,
      conversoes: pedsMes
    })
  }

  return {
    kpis: {
      totalReceita: pedStats.total_receita,
      ativos: pedStats.ativos_count,
      totalOrcamentos: orcStats.total_orcamentos,
      clientesInativos: cliStats.inativos_count,
    },
    clientesInativosList: clientesInativosList.map(c => ({
      ...c,
      ultimaCompra: c.ultimaCompra ? c.ultimaCompra.toISOString() : null
    })),
    chartData,
    recentes: recentes.data
  }
}
