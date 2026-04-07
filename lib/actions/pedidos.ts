"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"
import { getOrCreateStatus } from "./status"
import { Prisma } from "@prisma/client"

// Helper function map statusId string names to clean strings if they contain "Analise" "Produção" etc.
function mapStatusIdToStr(statusName: string) {
  const s = statusName.toLowerCase()
  if (s.includes('analise')) return 'em_analise'
  if (s.includes('produ') || s.includes('fabrica')) return 'em_producao'
  if (s.includes('separa')) return 'separacao'
  if (s.includes('entregue') || s.includes('entrega')) return 'entregue'
  return 'em_analise'
}

export async function getPedidos(params: {
  page?: number
  limit?: number
  search?: string
  status?: string
  dataInicio?: string
  dataFim?: string
  vendedorId?: number
  apenasSla?: boolean
} = {}) {
  noStore()
  
  const page = params.page || 1
  const limit = params.limit || 20
  
  const statusEmAnalise = await getOrCreateStatus('em_analise')
  const statusEmProducao = await getOrCreateStatus('em_producao')
  const statusSeparacao = await getOrCreateStatus('separacao')
  const statusEntregue = await getOrCreateStatus('entregue')

  const searchPattern = `%${params.search || ""}%`
  const dataInicio = params.dataInicio ? new Date(params.dataInicio) : null
  const dataFim = params.dataFim ? new Date(params.dataFim) : null
  if (dataFim) {
    dataFim.setDate(dataFim.getDate() + 1)
  }
  
  const vendedorId = params.vendedorId ? Number(params.vendedorId) : null

  // 1. Otimização Global: Busca de todos os contadores em UMA ÚNICA query SQL.
  let statusFilterSql = Prisma.sql`TRUE`
  if (params.status === 'em_analise') statusFilterSql = Prisma.sql`p."statusId" = ${statusEmAnalise}`
  else if (params.status === 'em_producao') statusFilterSql = Prisma.sql`p."statusId" IN (${statusEmProducao}, ${statusSeparacao})`
  else if (params.status === 'separacao') statusFilterSql = Prisma.sql`p."statusId" = ${statusSeparacao}`
  else if (params.status === 'entregue') statusFilterSql = Prisma.sql`p."statusId" = ${statusEntregue}`

  const counts: any[] = await prisma.$queryRaw`
    SELECT 
      COUNT(*) FILTER (WHERE ${statusFilterSql})::int as total_filtrado,
      COUNT(*) FILTER (WHERE p."statusId" = ${statusEmAnalise})::int as em_analise,
      COUNT(*) FILTER (WHERE p."statusId" IN (${statusEmProducao}, ${statusSeparacao}))::int as em_producao_soma,
      COUNT(*) FILTER (WHERE p."statusId" = ${statusSeparacao})::int as separacao,
      COUNT(*) FILTER (WHERE p."statusId" = ${statusEntregue})::int as entregue,
      COALESCE(SUM(p."totalGeral"), 0)::float as total_valor
    FROM "Pedido" p
    LEFT JOIN "Cliente" c ON p."clienteId" = c.id
    WHERE (p."numero" ILIKE ${searchPattern} OR c."razaoSocial" ILIKE ${searchPattern})
      AND (${vendedorId}::int IS NULL OR p."vendedorId" = ${vendedorId})
      AND (${dataInicio}::timestamp IS NULL OR p."criadoEm" >= ${dataInicio})
      AND (${dataFim}::timestamp IS NULL OR p."criadoEm" < ${dataFim})
  `
  const stats = counts[0] || { total_filtrado: 0, em_analise: 0, em_producao_soma: 0, entregue: 0, separacao: 0, total_valor: 0 }

  // 2. Busca paginada dos registros
  const where: any = {}
  if (params.search) {
    where.OR = [
      { numero: { contains: params.search, mode: "insensitive" } },
      { cliente: { razaoSocial: { contains: params.search, mode: "insensitive" } } },
    ]
  }
  if (params.status) {
    if (params.status === 'em_analise') where.statusId = statusEmAnalise
    else if (params.status === 'em_producao') where.statusId = { in: [statusEmProducao, statusSeparacao] }
    else if (params.status === 'separacao') where.statusId = statusSeparacao
    else if (params.status === 'entregue') where.statusId = statusEntregue
  }
  if (params.vendedorId) where.vendedorId = params.vendedorId
  if (params.dataInicio || params.dataFim) {
    where.criadoEm = {}
    if (params.dataInicio) where.criadoEm.gte = new Date(params.dataInicio)
    if (params.dataFim) {
      const ends = new Date(params.dataFim)
      ends.setDate(ends.getDate() + 1)
      where.criadoEm.lt = ends
    }
  }

  const dbPedidos = await prisma.pedido.findMany({
    where,
    orderBy: { id: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      cliente: true,
      vendedor: true,
      statusObj: true,
    }
  })
  
  let pedidos = dbPedidos.map(p => ({
    ...p,
    status: mapStatusIdToStr(p.statusObj?.nome || ''),
    criadoEm: p.criadoEm.toISOString(),
    atualizadoEm: p.atualizadoEm.toISOString(),
  }))

  if (params.apenasSla) {
    pedidos = pedidos.filter((p: any) => {
      if (p.status === 'entregue') return false
      const parts = p.prazoEntrega.split('/')
      if (parts.length === 3) {
        const [d, m, y] = parts
        const prazoDate = new Date(Number(y), Number(m) - 1, Number(d))
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((prazoDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays <= 3
      }
      return false
    })
  }
  
  return {
    data: pedidos,
    total: stats.total_filtrado,
    page,
    totalPages: Math.ceil(stats.total_filtrado / limit),
    kpis: {
      total: stats.total_filtrado,
      emAnalise: stats.em_analise,
      emProducao: stats.em_producao_soma, 
      separacao: stats.separacao,
      entregue: stats.entregue,
      totalValor: stats.total_valor
    }
  }
}

export async function getPedidoById(id: number) {
  noStore()
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      statusObj: true,
      vendedor: true,
      itens: {
        include: { etiqueta: true }
      }
    }
  })
  
  if (!pedido) return null
  return {
    ...pedido,
    status: mapStatusIdToStr(pedido.statusObj?.nome || ''),
    criadoEm: pedido.criadoEm.toISOString(),
    atualizadoEm: pedido.atualizadoEm.toISOString(),
  }
}

export async function updatePedidoStatus(id: number, statusId: number) {
  const updated = await prisma.pedido.update({
    where: { id },
    data: { statusId },
    include: { statusObj: true }
  })
  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${id}`)
  return {
    ...updated,
    status: mapStatusIdToStr(updated.statusObj?.nome || '')
  }
}

export async function savePedido(data: any) {
  const { id, itens, ...rest } = data
  
  if (!itens || !Array.isArray(itens)) {
    console.error("savePedido: itens is missing or not an array", data)
    throw new Error("Os itens do pedido são obrigatórios.")
  }
  
  let numero = rest.numero
  if (!id && !numero) {
    const lastPed = await prisma.pedido.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true }
    })
    const nextId = (lastPed?.id || 0) + 1
    numero = `PED-${new Date().getFullYear()}-${nextId.toString().padStart(4, '0')}`
  }

  let statusId = rest.statusId ? Number(rest.statusId) : null
  if (!statusId) {
    const { getOrCreateStatus } = await import("./status")
    statusId = await getOrCreateStatus('em_analise')
  }

  const prismaData = {
    numero: String(numero || ""),
    orcamentoId: rest.orcamentoId ? Number(rest.orcamentoId) : null,
    clienteId: Number(rest.clienteId),
    vendedorId: Number(rest.vendedorId),
    statusId: Number(statusId),
    sentidoSaidaRolo: rest.sentidoSaidaRolo || "Ext 0º",
    tipoTubete: rest.tipoTubete || "76",
    gapEntreEtiquetas: rest.gapEntreEtiquetas || "3mm",
    numeroPistas: Number(rest.numeroPistas) || 1,
    observacoesEmbalagem: rest.observacoesEmbalagem || "",
    observacoesFaturamento: rest.observacoesFaturamento || "",
    prazoEntrega: rest.prazoEntrega || "15 dias",
    formaPagamento: rest.formaPagamento || "A combinar",
    nomeVendedor: rest.nomeVendedor || "",
    nomeComprador: rest.nomeComprador || "",
    frete: rest.frete || "FOB",
    observacoesGerais: rest.observacoesGerais || "",
    totalGeral: isNaN(Number(rest.totalGeral)) ? 0 : Number(rest.totalGeral),
    ativo: true,
  }

  if (!id) {
    const created = await prisma.pedido.create({
      data: {
        ...prismaData,
        itens: {
          create: itens.map((it: any) => {
            const qty = Number(typeof it.quantidade === 'string' ? it.quantidade.replace(',', '.') : it.quantidade) || 0
            const price = Number(typeof it.precoUnitario === 'string' ? it.precoUnitario.replace(',', '.') : it.precoUnitario) || 0
            return {
              etiquetaId: it.etiquetaId ? Number(it.etiquetaId) : null,
              descricao: it.descricao,
              quantidade: qty,
              unidade: it.unidade,
              precoUnitario: price,
              total: Number(it.total) || (qty * price)
            }
          })
        }
      }
    })
    revalidatePath("/pedidos")
    return created
  } else {
    // Update logic for existing order
    const updated = await prisma.pedido.update({
      where: { id: Number(id) },
      data: {
        ...prismaData,
        itens: {
          deleteMany: {},
          create: itens.map((it: any) => {
            const qty = Number(typeof it.quantidade === 'string' ? it.quantidade.replace(',', '.') : it.quantidade) || 0
            const price = Number(typeof it.precoUnitario === 'string' ? it.precoUnitario.replace(',', '.') : it.precoUnitario) || 0
            return {
              etiquetaId: it.etiquetaId ? Number(it.etiquetaId) : null,
              descricao: it.descricao,
              quantidade: qty,
              unidade: it.unidade,
              precoUnitario: price,
              total: Number(it.total) || (qty * price)
            }
          })
        }
      }
    })
    revalidatePath("/pedidos")
    revalidatePath(`/pedidos/${id}`)
    return updated
  }
}
