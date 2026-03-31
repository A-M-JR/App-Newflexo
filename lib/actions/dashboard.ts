"use server"

import { prisma } from "@/lib/prisma"
import { unstable_noStore as noStore } from "next/cache"
import { getPedidos } from "./pedidos"

export async function getDashboardMetrics(vendedorId?: number) {
  noStore()
  
  const whereVendedorOrcs = vendedorId ? { vendedorId } : {}
  const whereVendedorPeds = vendedorId ? { vendedorId } : {}

  const quarentaDiasAtras = new Date()
  quarentaDiasAtras.setDate(quarentaDiasAtras.getDate() - 40)

  // Consultas paralelas rápidas para os KPIs (Top Cards)
  const [
    totalReceitaAggr,
    ativosFilter,
    totalOrcamentosCont,
    clientesInativosCount,
    clientesInativosList
  ] = await Promise.all([
    prisma.pedido.aggregate({
      _sum: { totalGeral: true },
      where: whereVendedorPeds
    }),
    
    // Para 'ativos' precisamos da string exata ou ID, vamos assumir que o ID do 'em_producao'
    prisma.status.findFirst({ where: { modulo: 'pedido', nome: 'Em Produção' } }),

    // Conta apenas orçamentos "enviados" (aguardando aprovação do cliente = statusId 4)
    prisma.orcamento.count({
      where: { ...whereVendedorOrcs, statusId: 4 }
    }),

    // Conta apenas clientes que JÁ compraram mas estão há +40 dias sem atividade
    // (exclui quem nunca comprou — ultimaCompra = null)
    prisma.cliente.count({
      where: {
        ultimaCompra: { lt: quarentaDiasAtras, not: null }
      }
    }),
    
    // Pegar apenas os primeiros 15 p/ a UI
    prisma.cliente.findMany({
      where: {
        ultimaCompra: { lt: quarentaDiasAtras, not: null }
      },
      take: 15,
      orderBy: { ultimaCompra: 'asc' },
      select: { id: true, razaoSocial: true, ultimaCompra: true }
    })
  ])

  let ativosCount = 0
  if (ativosFilter) {
    ativosCount = await prisma.pedido.count({
      where: { ...whereVendedorPeds, statusId: ativosFilter.id }
    })
  }

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
      where: { ...whereVendedorOrcs, criadoEm: { gte: sixMonthsAgo } },
      select: { criadoEm: true }
    }),
    prisma.pedido.findMany({
      where: { ...whereVendedorPeds, criadoEm: { gte: sixMonthsAgo } },
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

  // Para mostrar a pequena lista de últimos pedidos (se o Dashboard tinha uma listagem)
  // Reutilizamos a query de listagem recém atualizada para enviar pelo menos os recentes pro frontend
  const recentes = await getPedidos({ page: 1, limit: 10, vendedorId })

  return {
    kpis: {
      totalReceita: totalReceitaAggr._sum.totalGeral || 0,
      ativos: ativosCount,
      totalOrcamentos: totalOrcamentosCont,
      clientesInativos: clientesInativosCount,
    },
    clientesInativosList: clientesInativosList.map(c => ({
      ...c,
      ultimaCompra: c.ultimaCompra ? c.ultimaCompra.toISOString() : null
    })),
    chartData,
    recentes: recentes.data
  }
}
