"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"
import { getOrCreateStatus } from "./status"
import { getRequesterVendedorId } from "./users"
import { Prisma } from "@prisma/client"

// Helper function map statusId string names to clean strings if they contain "Analise" "Produção" etc.
function mapStatusIdToStr(statusName: string) {
  const s = statusName.toLowerCase()
  if (s.includes('analise')) return 'em_analise'
  if (s.includes('produ') || s.includes('fabrica')) return 'em_producao'
  if (s.includes('separa')) return 'separacao'
  if (s.includes('entregue') || s.includes('entrega')) return 'entregue'
  if (s.includes('cancel')) return 'cancelado'
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
  requesterId?: number
} = {}) {
  
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
  
  let vendedorId = params.vendedorId ? Number(params.vendedorId) : null
  
  // SEGURANÇA: Se houver um requesterId, verifica se ele é vendedor limitado
  if (params.requesterId) {
    const perm = await getRequesterVendedorId(params.requesterId)
    if (perm !== 'admin') {
      vendedorId = perm as number // Força o vendedorId dele
    }
  }

  // 1. Otimização Global: Busca de todos os contadores em UMA ÚNICA query SQL.
  const slaFilterSql = Prisma.sql`(
    p."statusId" <> ${statusEntregue}
    AND p."prazoEntrega" IS NOT NULL
    AND (p."prazoEntrega"::date - CURRENT_DATE) <= 3
  )`

  let statusFilterSql = Prisma.sql`TRUE`
  if (params.apenasSla) statusFilterSql = slaFilterSql
  else if (params.status === 'cancelado') statusFilterSql = Prisma.sql`p."ativo" = FALSE`
  else if (params.status === 'em_analise') statusFilterSql = Prisma.sql`p."statusId" = ${statusEmAnalise}`
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
      COUNT(*) FILTER (WHERE 
        p."statusId" <> ${statusEntregue}
        AND p."prazoEntrega" IS NOT NULL
        AND (p."prazoEntrega"::date - CURRENT_DATE) <= 3
      )::int as sla_alerta,
      COUNT(*) FILTER (WHERE p."ativo" = FALSE)::int as cancelados,
      COALESCE(SUM(p."totalGeral"), 0)::float as total_valor
    FROM "Pedido" p
    LEFT JOIN "Cliente" c ON p."clienteId" = c.id
    WHERE (p."numero" ILIKE ${searchPattern} OR c."razaoSocial" ILIKE ${searchPattern})
      AND (${params.status === 'cancelado'}::boolean = TRUE OR p."ativo" = TRUE)
      AND (${vendedorId}::int IS NULL OR p."vendedorId" = ${vendedorId})
      AND (${dataInicio}::timestamp IS NULL OR p."criadoEm" >= ${dataInicio})
      AND (${dataFim}::timestamp IS NULL OR p."criadoEm" < ${dataFim})
  `
  const stats = counts[0] || { total_filtrado: 0, em_analise: 0, em_producao_soma: 0, entregue: 0, separacao: 0, sla_alerta: 0, cancelados: 0, total_valor: 0 }

  // 2. Busca paginada dos registros
  const where: any = {}
  if (params.status === 'cancelado') {
    where.ativo = false
  } else {
    where.ativo = true
  }
  if (params.search) {
    where.OR = [
      { numero: { contains: params.search, mode: "insensitive" } },
      { cliente: { razaoSocial: { contains: params.search, mode: "insensitive" } } },
    ]
  }
  if (params.apenasSla) {
    const limiteSla = new Date()
    limiteSla.setHours(0, 0, 0, 0)
    limiteSla.setDate(limiteSla.getDate() + 3)
    limiteSla.setHours(23, 59, 59, 999)
    where.statusId = { not: statusEntregue }
    where.prazoEntrega = { lte: limiteSla }
  } else if (params.status) {
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
    orderBy: params.apenasSla ? { prazoEntrega: 'asc' } : { id: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      cliente: true,
      vendedor: true,
      statusObj: true,
      _count: { select: { itens: true } }
    }
  })
  
  const pedidos = dbPedidos.map(p => ({
    ...p,
    status: mapStatusIdToStr(p.statusObj?.nome || ''),
    criadoEm: p.criadoEm.toISOString(),
    atualizadoEm: p.atualizadoEm.toISOString(),
    prazoEntrega: p.prazoEntrega ? p.prazoEntrega.toISOString() : null,
  }))

  const totalFiltrado = stats.total_filtrado

  return {
    data: pedidos,
    total: totalFiltrado,
    page,
    totalPages: Math.ceil(totalFiltrado / limit) || 1,
    kpis: {
      total: stats.total_filtrado,
      emAnalise: stats.em_analise,
      emProducao: stats.em_producao_soma, 
      separacao: stats.separacao,
      entregue: stats.entregue,
      slaAlerta: stats.sla_alerta,
      cancelados: stats.cancelados,
      totalValor: stats.total_valor
    }
  }
}

export async function getPedidoById(id: number, requesterId?: number) {
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      statusObj: true,
      vendedor: true,
      formaPagamentoObj: true,
      itens: {
        include: { etiqueta: true }
      }
    }
  })
  
  if (!pedido) return null

  // SEGURANÇA: Vendedor só vê o dele
  if (requesterId) {
    const perm = await getRequesterVendedorId(requesterId)
    if (perm !== 'admin' && pedido.vendedorId !== perm) {
       return null // Acesso negado
    }
  }

  return {
    ...pedido,
    status: mapStatusIdToStr(pedido.statusObj?.nome || ''),
    criadoEm: pedido.criadoEm.toISOString(),
    atualizadoEm: pedido.atualizadoEm.toISOString(),
    prazoEntrega: pedido.prazoEntrega ? pedido.prazoEntrega.toISOString() : null,
  }
}

export async function updatePedidoStatus(id: number, statusIdent: string | number, requesterId?: number) {
  const pedCheck = await prisma.pedido.findUnique({ where: { id }, select: { ativo: true, vendedorId: true } })
  if (!pedCheck?.ativo) throw new Error("Pedido cancelado não pode ser alterado.")

  // SEGURANÇA: Vendedor só edita o dele
  if (requesterId) {
    const perm = await getRequesterVendedorId(requesterId)
    if (perm !== 'admin') {
      if (!pedCheck || pedCheck.vendedorId !== perm) throw new Error("Acesso negado.")
    }
  }
  let statusId = Number(statusIdent)
  
  if (isNaN(statusId)) {
    statusId = await getOrCreateStatus(String(statusIdent))
  }

  const updated = await prisma.pedido.update({
    where: { id },
    data: { statusId },
    include: { 
      statusObj: true,
      cliente: true,
      vendedor: true,
      formaPagamentoObj: true,
      itens: {
        include: { etiqueta: true }
      }
    }
  })
  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${id}`)
  return {
    ...updated,
    status: mapStatusIdToStr(updated.statusObj?.nome || ''),
    criadoEm: updated.criadoEm.toISOString(),
    atualizadoEm: updated.atualizadoEm.toISOString(),
    prazoEntrega: updated.prazoEntrega ? updated.prazoEntrega.toISOString() : null,
  }
}

export async function cancelarPedido(id: number, requesterId?: number) {
  if (requesterId) {
    const perm = await getRequesterVendedorId(requesterId)
    if (perm !== 'admin') {
      const ped = await prisma.pedido.findUnique({ where: { id }, select: { vendedorId: true } })
      if (!ped || ped.vendedorId !== perm) throw new Error("Acesso negado.")
    }
  }

  const existing = await prisma.pedido.findUnique({
    where: { id },
    select: { ativo: true, clienteId: true, orcamentoId: true, statusObj: { select: { nome: true } } }
  })
  if (!existing || !existing.ativo) throw new Error("Pedido não encontrado ou já cancelado.")

  const statusNome = existing.statusObj?.nome?.toLowerCase() || ''
  if (statusNome.includes('entregue') || statusNome.includes('entrega')) {
    throw new Error("Não é possível cancelar um pedido já entregue.")
  }

  const statusId = await getOrCreateStatus('cancelado', 'pedido')

  await prisma.pedido.update({
    where: { id },
    data: { ativo: false, statusId },
  })

  // Ao cancelar o pedido, devolve o orçamento vinculado para "Enviado ao cliente",
  // liberando-o novamente no funil (edição e nova conversão em pedido).
  if (existing.orcamentoId) {
    const statusEnviado = await prisma.status.findFirst({
      where: { modulo: 'orcamento', nome: { contains: 'Enviado', mode: 'insensitive' } }
    })
    await prisma.orcamento.update({
      where: { id: existing.orcamentoId },
      data: { statusId: statusEnviado?.id ?? 4 }
    })
    revalidatePath("/orcamentos")
    revalidatePath(`/orcamentos/${existing.orcamentoId}`)
  }

  await updateClienteUltimaCompra(existing.clienteId)
  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${id}`)
}

async function updateClienteUltimaCompra(clienteId: number) {
  const latestPedido = await prisma.pedido.findFirst({
    where: { clienteId, ativo: true },
    orderBy: { criadoEm: 'desc' },
    select: { criadoEm: true }
  })
  
  await prisma.cliente.update({
    where: { id: clienteId },
    data: { ultimaCompra: latestPedido ? latestPedido.criadoEm : null }
  })
}

export async function savePedido(data: any, requesterId?: number) {
  const { id, itens, ...rest } = data

  let oldClienteId: number | null = null
  if (id) {
    const existing = await prisma.pedido.findUnique({
      where: { id: Number(id) },
      select: { clienteId: true }
    })
    if (existing) {
      oldClienteId = existing.clienteId
    }
  }

  let forcedVendedorId = rest.vendedorId

  // SEGURANÇA: Vendedor só mexe no dele
  if (requesterId) {
    const perm = await getRequesterVendedorId(requesterId)
    if (perm !== 'admin') {
      if (id) {
        const ped = await prisma.pedido.findUnique({ where: { id }, select: { vendedorId: true } })
        if (!ped || ped.vendedorId !== perm) throw new Error("Acesso negado.")
      }
      forcedVendedorId = perm // Força ser dele na criação ou edição
    }
  }
  
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
    const { getEmpresa } = await import("./config")
    
    // Verifica config da empresa para pular etapa
    const empresaConfig = await getEmpresa()
    if (empresaConfig?.pularDiretoSeparacao) {
      statusId = await getOrCreateStatus('separacao')
    } else {
      statusId = await getOrCreateStatus('em_analise')
    }
  }

  const prismaData = {
    numero: String(numero || ""),
    orcamentoId: rest.orcamentoId ? Number(rest.orcamentoId) : null,
    clienteId: Number(rest.clienteId),
    vendedorId: Number(forcedVendedorId || 0),
    statusId: Number(statusId),
    sentidoSaidaRolo: rest.sentidoSaidaRolo || "Ext 0º",
    tipoTubete: rest.tipoTubete || "76",
    gapEntreEtiquetas: rest.gapEntreEtiquetas || "3mm",
    numeroPistas: Number(rest.numeroPistas) || 1,
    observacoesEmbalagem: rest.observacoesEmbalagem || "",
    observacoesFaturamento: rest.observacoesFaturamento || "",
    prazoEntrega: rest.prazoEntrega ? new Date(rest.prazoEntrega) : null,
    formaPagamento: rest.formaPagamento || "A combinar",
    nomeVendedor: rest.nomeVendedor || "",
    nomeComprador: rest.nomeComprador || "",
    frete: rest.frete || "CIF",
    observacoesGerais: rest.observacoesGerais || "",
    totalGeral: isNaN(Number(rest.totalGeral)) ? 0 : Number(rest.totalGeral),
    formaPagamentoId: rest.formaPagamentoId ? Number(rest.formaPagamentoId) : null,
    ocCliente: rest.ocCliente || null,
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
              quantidadeCredito: Number(it.quantidadeCredito) || 0,
              unidade: it.unidade,
              precoUnitario: price,
              total: Number(it.total) || ((qty - (Number(it.quantidadeCredito) || 0)) * price),
              observacao: it.observacao || ""
            }
          })
        }
      },
      include: {
        cliente: true,
        vendedor: true,
        statusObj: true,
        formaPagamentoObj: true,
        itens: {
          include: { etiqueta: true }
        }
      }
    })
    // Se for gerado a partir de um orçamento, atualiza o status do orçamento para "Aprovado"
    if (created.orcamentoId) {
      const statusAprovadoId = await getOrCreateStatus('aprovado', 'orcamento')
      await prisma.orcamento.update({
        where: { id: created.orcamentoId },
        data: { statusId: statusAprovadoId }
      })
      revalidatePath("/orcamentos")
      revalidatePath(`/orcamentos/${created.orcamentoId}`)
    }

    // Sincroniza a data da última compra do cliente
    await updateClienteUltimaCompra(created.clienteId)

    revalidatePath("/pedidos")
    return created
  } else {
    // Update logic for existing order
    const updated = await prisma.pedido.update({
      where: { id: Number(id) },
      data: {
        ...prismaData,
        itens: {
          deleteMany: { id: { notIn: itens.filter((i: any) => i.id).map((i: any) => Number(i.id)) } },
          upsert: itens.map((it: any) => {
            const qty = Number(typeof it.quantidade === 'string' ? it.quantidade.replace(',', '.') : it.quantidade) || 0
            const price = Number(typeof it.precoUnitario === 'string' ? it.precoUnitario.replace(',', '.') : it.precoUnitario) || 0
            const itemData = {
              etiquetaId: it.etiquetaId ? Number(it.etiquetaId) : null,
              descricao: it.descricao,
              quantidade: qty,
              quantidadeCredito: Number(it.quantidadeCredito) || 0,
              unidade: it.unidade,
              precoUnitario: price,
              total: Number(it.total) || ((qty - (Number(it.quantidadeCredito) || 0)) * price),
              observacao: it.observacao || ""
            }
            return {
              where: { id: it.id ? Number(it.id) : 0 },
              create: itemData,
              update: itemData
            }
          })
        }
      },
      include: {
        cliente: true,
        vendedor: true,
        statusObj: true,
        formaPagamentoObj: true,
        itens: {
          include: { etiqueta: true }
        }
      }
    })

    // Sincroniza a data da última compra do cliente atual e do antigo (se alterado)
    await updateClienteUltimaCompra(updated.clienteId)
    if (oldClienteId && oldClienteId !== updated.clienteId) {
      await updateClienteUltimaCompra(oldClienteId)
    }

    revalidatePath("/pedidos")
    revalidatePath(`/pedidos/${id}`)
    return updated
  }
}
