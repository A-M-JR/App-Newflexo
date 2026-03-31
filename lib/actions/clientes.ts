"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"
import { Prisma } from "@prisma/client"

export async function getClientes(params: {
  page?: number
  limit?: number
  search?: string
  filter?: 'todos' | '30d' | '60d'
  mode?: 'full' | 'dropdown'
} = {}) {
  noStore()
  
  const page = params.page || 1
  const limit = params.limit || 20
  const search = params.search || ""
  const mode = params.mode || 'full'
  const filter = params.filter || 'todos'

  const searchPattern = `%${search}%`
  const hoje = new Date()
  const trintaDiasAtras = new Date(hoje.getTime() - (30 * 24 * 60 * 60 * 1000))
  const sessentaDiasAtras = new Date(hoje.getTime() - (60 * 24 * 60 * 60 * 1000))

  // 1. Otimização Sugerida pelo Usuário: Busca de contadores em uma única query SQL Raw
  // Utilizamos a cláusula FILTER (WHERE ...) do Postgres que é extremamente performática.
  const filterSql = filter === '30d' 
    ? Prisma.sql`("ultimaCompra" < ${trintaDiasAtras} AND "ultimaCompra" >= ${sessentaDiasAtras}) OR ("ultimaCompra" IS NULL AND "criadoEm" < ${trintaDiasAtras} AND "criadoEm" >= ${sessentaDiasAtras})`
    : filter === '60d' 
      ? Prisma.sql`"ultimaCompra" < ${sessentaDiasAtras} OR ("ultimaCompra" IS NULL AND "criadoEm" < ${sessentaDiasAtras})`
      : Prisma.sql`TRUE`

  const counts: any[] = await prisma.$queryRaw`
    SELECT 
      COUNT(*)::int as total_global,
      COUNT(*) FILTER (WHERE ("ultimaCompra" < ${trintaDiasAtras} AND "ultimaCompra" >= ${sessentaDiasAtras}) OR ("ultimaCompra" IS NULL AND "criadoEm" < ${trintaDiasAtras} AND "criadoEm" >= ${sessentaDiasAtras}))::int as sem_compra_30,
      COUNT(*) FILTER (WHERE "ultimaCompra" < ${sessentaDiasAtras} OR ("ultimaCompra" IS NULL AND "criadoEm" < ${sessentaDiasAtras}))::int as sem_compra_60,
      COUNT(*) FILTER (WHERE ${filterSql})::int as total_filtrado
    FROM "Cliente"
    WHERE ("razaoSocial" ILIKE ${searchPattern} OR "cnpj" ILIKE ${searchPattern} OR "cidade" ILIKE ${searchPattern})
  `
  
  const stats = counts[0] || { total_global: 0, sem_compra_30: 0, sem_compra_60: 0, total_filtrado: 0 }

  // 2. Busca dos dados da página (FindMany ainda é ideal para tipagem e includes automáticos)
  const where: any = {}
  if (search) {
    where.OR = [
      { razaoSocial: { contains: search, mode: "insensitive" } },
      { cnpj: { contains: search, mode: "insensitive" } },
      { cidade: { contains: search, mode: "insensitive" } },
    ]
  }

  if (filter === '30d') {
    where.OR = [
      { ultimaCompra: { lt: trintaDiasAtras, gte: sessentaDiasAtras } },
      { AND: [ { ultimaCompra: null }, { criadoEm: { lt: trintaDiasAtras, gte: sessentaDiasAtras } } ] }
    ]
  } else if (filter === '60d') {
     const retentionFilter = {
      OR: [
        { ultimaCompra: { lt: sessentaDiasAtras } },
        { AND: [ { ultimaCompra: null }, { criadoEm: { lt: sessentaDiasAtras } } ] }
      ]
    }
    if (search) {
       const searchFilter = { OR: where.OR }
       delete where.OR
       where.AND = [searchFilter, retentionFilter]
    } else {
       where.OR = retentionFilter.OR
    }
  }

  if (mode === 'dropdown') {
    const dbClientes = await prisma.cliente.findMany({
      where,
      orderBy: { razaoSocial: "asc" },
      take: limit,
      select: { id: true, razaoSocial: true, cnpj: true, endereco: true, cidade: true, estado: true }
    })
    return { data: dbClientes, total: stats.total_filtrado, page: 1, totalPages: 1 }
  }

  const dbClientes = await prisma.cliente.findMany({
    where,
    orderBy: { razaoSocial: "asc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      _count: { select: { orcamentos: true, pedidos: true } }
    }
  })
  
  return {
    data: dbClientes.map((c: any) => ({
      ...c,
      criadoEm: c.criadoEm.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      ultimaCompra: c.ultimaCompra ? c.ultimaCompra.toISOString() : null,
    })),
    total: stats.total_filtrado,
    page,
    totalPages: Math.ceil(stats.total_filtrado / limit),
    kpis: {
      total: stats.total_global,
      semCompra30: stats.sem_compra_30,
      semCompra60: stats.sem_compra_60
    }
  }
}

export async function getClienteById(id: number) {
  noStore()
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      orcamentos: {
        include: { statusObj: true },
        orderBy: { id: 'desc' }
      },
      pedidos: {
        include: { statusObj: true },
        orderBy: { id: 'desc' }
      }
    }
  })
  
  if (!cliente) return null
  return {
    ...cliente,
    criadoEm: cliente.criadoEm.toISOString(),
    updatedAt: cliente.updatedAt.toISOString(),
    ultimaCompra: cliente.ultimaCompra ? cliente.ultimaCompra.toISOString() : null,
  }
}

export async function saveCliente(data: any) {
  const { id, numero, ...rest } = data
  
  let finalEndereco = rest.endereco || ""
  if (numero && !finalEndereco.includes(numero)) {
    finalEndereco = `${finalEndereco}, ${numero}`
  }

  const prismaData = {
    razaoSocial: rest.razaoSocial,
    cnpj: rest.cnpj,
    ie: rest.ie || null,
    email: rest.email || null,
    telefone: rest.telefone || "",
    endereco: finalEndereco,
    cep: rest.cep || "",
    cidade: rest.cidade || "",
    estado: rest.estado || "",
    observacoes: rest.observacoes || null,
    ativo: rest.ativo !== undefined ? rest.ativo : true,
  }

  if (!id) {
    const created = await prisma.cliente.create({ data: prismaData })
    revalidatePath("/clientes")
    return created
  } else {
    const updated = await prisma.cliente.update({
      where: { id: Number(id) },
      data: prismaData
    })
    revalidatePath("/clientes")
    revalidatePath(`/clientes/${id}`)
    return updated
  }
}
