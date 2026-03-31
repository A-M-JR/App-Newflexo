"use server"

import { prisma } from "@/lib/prisma"
import { unstable_noStore as noStore } from "next/cache"
import { getPedidos } from "./pedidos"

export async function getDashboardMetrics(vendedorId?: number) {
  noStore()
  
  const quarentaDiasAtras = new Date()
  quarentaDiasAtras.setDate(quarentaDiasAtras.getDate() - 40)

  const searchVendedor = vendedorId ? Number(vendedorId) : null

  // 1. Otimização SQL Raw para métricas do Dashboard
  // Buscamos receita e pedidos ativos em uma única query
  const pedidoMetrics: any[] = await prisma.$queryRaw`
    SELECT 
      COALESCE(SUM("totalGeral"), 0)::float as total_receita,
      COUNT(*) FILTER (WHERE "statusId" NOT IN (SELECT id FROM "Status" WHERE "modulo" = 'pedido' AND ("nome" ILIKE '%Entregue%' OR "nome" ILIKE '%Entrega%')))::int as ativos_count
    FROM "Pedido"
    WHERE (${searchVendedor}::int IS NULL OR "vendedorId" = ${searchVendedor})
      AND "ativo" = TRUE
  `
  const pedStats = pedidoMetrics[0] || { total_receita: 0, ativos_count: 0 }

  // Buscamos orçamentos aguardando aprovação (statusId 4)
  const orcamentoMetrics: any[] = await prisma.$queryRaw`
    SELECT COUNT(*)::int as total_orcamentos
    FROM "Orcamento"
    WHERE "statusId" = 4
      AND (${searchVendedor}::int IS NULL OR "vendedorId" = ${searchVendedor})
      AND "ativo" = TRUE
  `
  const orcStats = orcamentoMetrics[0] || { total_orcamentos: 0 }

  // Buscamos clientes inativos (mais de 40 dias sem compra e que já compraram antes)
  const clienteMetrics: any[] = await prisma.$queryRaw`
    SELECT COUNT(*)::int as inativos_count
    FROM "Cliente"
    WHERE "ultimaCompra" < ${quarentaDiasAtras}
      AND "ultimaCompra" IS NOT NULL
  `
  const cliStats = clienteMetrics[0] || { inativos_count: 0 }

  const clientesInativosList = await prisma.cliente.findMany({
    where: {
      ultimaCompra: { lt: quarentaDiasAtras, not: null }
    },
    take: 15,
    orderBy: { ultimaCompra: 'asc' },
    select: { id: true, razaoSocial: true, ultimaCompra: true }
  })

  // Obter Chart Data - Últimos 6 meses
  const monthsNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const chartData = []
  
  const baseDate = new Date()
  baseDate.setDate(1)
  baseDate.setHours(0,0,0,0)

  // Buscar os raw para orçamentos e pedidos apenas nesses ultimos 6 meses
  const sixMonthsAgo = new Date(baseDate)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  
  const [recentOrcamentos, recentPedidos] = await Promise.all([
    prisma.orcamento.findMany({
      where: { 
        vendedorId: vendedorId ? Number(vendedorId) : undefined, 
        criadoEm: { gte: sixMonthsAgo } 
      },
      select: { criadoEm: true }
    }),
    prisma.pedido.findMany({
      where: { 
        vendedorId: vendedorId ? Number(vendedorId) : undefined, 
        criadoEm: { gte: sixMonthsAgo } 
      },
      select: { criadoEm: true }
    })
  ])

  for (let i = 5; i >= 0; i--) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1)
    const monthNum = d.getMonth()
    const yearNum = d.getFullYear()

    const orcsMes = recentOrcamentos.filter(o => 
      o.criadoEm.getMonth() === monthNum && o.criadoEm.getFullYear() === yearNum
    ).length

    const pedsMes = recentPedidos.filter(p => 
      p.criadoEm.getMonth() === monthNum && p.criadoEm.getFullYear() === yearNum
    ).length

    chartData.push({
      name: monthsNames[monthNum],
      orcamentos: orcsMes,
      conversoes: pedsMes
    })
  }

  // Para mostrar a pequena lista de últimos pedidos
  const recentes = await getPedidos({ page: 1, limit: 10, vendedorId })

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
