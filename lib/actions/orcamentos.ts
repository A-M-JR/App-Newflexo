"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"
import { Orcamento } from "@/lib/types"
import { Prisma } from "@prisma/client"

export async function getOrcamentos(params: {
  page?: number
  limit?: number
  search?: string
  status?: string
  dataInicio?: string
  dataFim?: string
  vendedorId?: number
  mode?: 'full' | 'history'
} = {}) {
  noStore()
  
  const page = params.page || 1
  const limit = params.limit || 20
  const mode = params.mode || 'full'

  const searchPattern = `%${params.search || ""}%`
  const dataInicio = params.dataInicio ? new Date(params.dataInicio) : null
  const dataFim = params.dataFim ? new Date(params.dataFim) : null
  if (dataFim) dataFim.setDate(dataFim.getDate() + 1)
  
  const vendedorId = params.vendedorId ? Number(params.vendedorId) : null

  // 1. Otimização SQL Raw para contadores e KPIs
  let statusFilterSql = Prisma.sql`p."ativo" = TRUE`
  if (params.status === 'rascunho') statusFilterSql = Prisma.sql`p."statusId" = 1`
  else if (params.status === 'enviado') statusFilterSql = Prisma.sql`p."statusId" = 4`
  else if (params.status === 'aprovado') statusFilterSql = Prisma.sql`p."statusId" = 2`
  else if (params.status === 'recusado') statusFilterSql = Prisma.sql`p."statusId" = 5`

  const counts: any[] = await prisma.$queryRaw`
    SELECT 
      COUNT(*) FILTER (WHERE ${statusFilterSql})::int as total_filtrado,
      COUNT(*) FILTER (WHERE p."statusId" = 4)::int as vigentes,
      COUNT(*) FILTER (WHERE p."statusId" = 2)::int as aprovados,
      COUNT(*) FILTER (WHERE p."statusId" IN (1, 5))::int as parados,
      COALESCE(SUM(p."totalGeral") FILTER (WHERE p."statusId" <> 5), 0)::float as total_valor
    FROM "Orcamento" p
    LEFT JOIN "Cliente" c ON p."clienteId" = c.id
    WHERE (p."numero" ILIKE ${searchPattern} OR c."razaoSocial" ILIKE ${searchPattern})
      AND (${vendedorId}::int IS NULL OR p."vendedorId" = ${vendedorId})
      AND (${dataInicio}::timestamp IS NULL OR p."criadoEm" >= ${dataInicio})
      AND (${dataFim}::timestamp IS NULL OR p."criadoEm" < ${dataFim})
      AND p."ativo" = TRUE
  `
  const stats = counts[0] || { total_filtrado: 0, vigentes: 0, aprovados: 0, parados: 0, total_valor: 0 }

  const where: any = { ativo: true }
  if (params.search) {
    where.OR = [
      { numero: { contains: params.search, mode: "insensitive" } },
      { cliente: { razaoSocial: { contains: params.search, mode: "insensitive" } } },
    ]
  }

  if (params.status) {
    if (params.status === 'rascunho') where.statusId = 1
    else if (params.status === 'enviado') where.statusId = 4
    else if (params.status === 'aprovado') where.statusId = 2
    else if (params.status === 'recusado') where.statusId = 5
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

  if (mode === 'history') {
    const dbOrcs = await prisma.orcamento.findMany({
      where,
      orderBy: { id: "desc" },
      take: limit,
      select: { id: true, clienteId: true, itens: true }
    })
    return { data: dbOrcs, total: stats.total_filtrado, page: 1, totalPages: 1, kpis: null }
  }

  const dbOrcs = await prisma.orcamento.findMany({
    where,
    orderBy: { id: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      cliente: true,
      vendedor: true,
      statusObj: true,
      itens: true,
      _count: { select: { itens: true } }
    }
  })
  
  return {
    data: dbOrcs.map((o: any) => ({
      ...o,
      status: o.statusObj?.nome?.toLowerCase() === 'pendente' ? 'rascunho' : (o.statusObj?.nome?.toLowerCase() || 'rascunho'),
      criadoEm: o.criadoEm.toISOString(),
      atualizadoEm: o.atualizadoEm.toISOString(),
    })),
    total: stats.total_filtrado,
    page,
    totalPages: Math.ceil(stats.total_filtrado / limit),
    kpis: {
      total: stats.total_filtrado,
      totalValor: stats.total_valor,
      vigentes: stats.vigentes,
      aprovados: stats.aprovados,
      parados: stats.parados,
    }
  }
}

export async function getOrcamentoById(id: number) {
  noStore()
  const orcamento = await prisma.orcamento.findUnique({
    where: { id },
    include: {
      cliente: true,
      vendedor: true,
      statusObj: true,
      itens: {
        include: { etiqueta: true }
      }
    }
  })
  
  if (!orcamento) return null
  return {
    ...orcamento,
    status: orcamento.statusObj?.nome?.toLowerCase() === 'pendente' ? 'rascunho' : (orcamento.statusObj?.nome?.toLowerCase() || 'rascunho'),
    criadoEm: orcamento.criadoEm.toISOString(),
    atualizadoEm: orcamento.atualizadoEm.toISOString(),
  }
}

export async function updateOrcamentoStatus(id: number, statusId: string | number) {
  const updated = await prisma.orcamento.update({
    where: { id },
    data: { statusId: Number(statusId) }
  })
  revalidatePath("/orcamentos")
  return updated
}

export async function deleteOrcamento(id: number) {
  await prisma.orcamento.update({
    where: { id },
    data: { ativo: false }
  })
  revalidatePath("/orcamentos")
}

export async function saveOrcamento(data: any) {
  const { id, itens, ...rest } = data

  if (!itens || !Array.isArray(itens)) {
    console.error("saveOrcamento: itens is missing or not an array", data)
    throw new Error("Os itens do orçamento são obrigatórios.")
  }
  
  let numero = rest.numero
  if (!id && !numero) {
    const lastOrc = await prisma.orcamento.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true }
    })
    const nextId = (lastOrc?.id || 0) + 1
    numero = `ORC-${new Date().getFullYear()}-${nextId.toString().padStart(4, '0')}`
  }

  const prismaData = {
    numero: String(numero || ""),
    clienteId: Number(rest.clienteId),
    vendedorId: Number(rest.vendedorId),
    statusId: (rest.statusId && !isNaN(Number(rest.statusId))) ? Number(rest.statusId) : 1, // 1 = Pendente
    observacoes: rest.observacoes || "",
    totalGeral: isNaN(Number(rest.totalGeral)) ? 0 : Number(rest.totalGeral),
    ativo: true,
  }

  if (!id) {
    const created = await prisma.orcamento.create({
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
    revalidatePath("/orcamentos")
    return created
  } else {
    const updated = await prisma.orcamento.update({
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
    revalidatePath("/orcamentos")
    revalidatePath(`/orcamentos/${id}`)
    return updated
  }
}
