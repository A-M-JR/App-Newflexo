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

  // 2. Busca dos dados da página via Raw SQL para evitar problemas de cache do Prisma com novos campos
  const limitNum = Number(limit)
  const offsetNum = (Number(page) - 1) * limitNum

  const dbClientes: any[] = await prisma.$queryRaw`
    SELECT c.*, 
      (SELECT COUNT(*)::int FROM "Orcamento" o WHERE o."clienteId" = c.id) as orcamentos_count,
      (SELECT COUNT(*)::int FROM "Pedido" p WHERE p."clienteId" = c.id) as pedidos_count
    FROM "Cliente" c
    WHERE ("razaoSocial" ILIKE ${searchPattern} OR "cnpj" ILIKE ${searchPattern} OR "cidade" ILIKE ${searchPattern})
    AND ${filterSql}
    ORDER BY "razaoSocial" ASC
    LIMIT ${limitNum} OFFSET ${offsetNum}
  `
  
  return {
    data: dbClientes.map((c: any) => ({
      ...c,
      _count: { orcamentos: c.orcamentos_count, pedidos: c.pedidos_count },
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
  // Busca via Raw SQL para garantir que pegamos os campos novos (nomeFantasia, etc)
  const results = await prisma.$queryRaw`
    SELECT * FROM "Cliente" WHERE id = ${id}
  ` as any[]

  if (results.length === 0) return null
  const cliente = results[0]

  // Busca orçamentos e pedidos separadamente (fallback total para Raw SQL/Selective ORM)
  const orcamentos = await prisma.orcamento.findMany({
    where: { clienteId: id },
    include: { statusObj: true },
    orderBy: { id: 'desc' }
  })

  const pedidos = await prisma.pedido.findMany({
    where: { clienteId: id },
    include: { statusObj: true },
    orderBy: { id: 'desc' }
  })

  // Falback para itens exclusivos via raw query devido a cache do Prisma
  const itensExclusivos = await prisma.$queryRaw`
    SELECT * FROM "ItemExclusivoCliente" WHERE "clienteId" = ${id}
  ` as any[]

  return {
    ...cliente,
    itensExclusivos,
    orcamentos,
    pedidos,
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

  const prismaData: any = {
    razaoSocial: rest.razaoSocial,
    nomeFantasia: rest.nomeFantasia || null,
    cnpj: rest.cnpj,
    ie: rest.ie || null,
    email: rest.email || null,
    telefone: rest.telefone || "",
    compradorNome: rest.compradorNome || null,
    compradorTelefone: rest.compradorTelefone || null,
    endereco: finalEndereco,
    cep: rest.cep || "",
    cidade: rest.cidade || "",
    estado: rest.estado || "",
    observacoes: rest.observacoes || null,
    ativo: rest.ativo !== undefined ? rest.ativo : true,
  }

  const itensExclusivos = rest.itensExclusivos || []

  if (!id) {
    const created = await prisma.$transaction(async (tx) => {
      // Inserção manual do Cliente via raw SQL
      const now = new Date()
      await tx.$executeRaw`
        INSERT INTO "Cliente" (
          "razaoSocial", "nomeFantasia", cnpj, ie, email, telefone, 
          "compradorNome", "compradorTelefone", endereco, cep, cidade, estado, 
          observacoes, ativo, "saldoCreditoValor", "saldoCreditoEtiquetas", "criadoEm", "updatedAt"
        )
        VALUES (
          ${prismaData.razaoSocial}, ${prismaData.nomeFantasia}, ${prismaData.cnpj}, ${prismaData.ie}, 
          ${prismaData.email}, ${prismaData.telefone}, ${prismaData.compradorNome}, ${prismaData.compradorTelefone}, 
          ${prismaData.endereco}, ${prismaData.cep}, ${prismaData.cidade}, ${prismaData.estado}, 
          ${prismaData.observacoes}, ${prismaData.ativo}, 
          ${rest.saldoCreditoValor || 0}, ${rest.saldoCreditoEtiquetas || 0}, ${now}, ${now}
        )
      `
      
      // Busca o ID gerado (Postgres)
      const lastInsert = await tx.$queryRaw`SELECT id FROM "Cliente" ORDER BY id DESC LIMIT 1` as any[]
      const newId = lastInsert[0].id

      for (const it of itensExclusivos) {
        await tx.$executeRaw`
          INSERT INTO "ItemExclusivoCliente" ("clienteId", nome, descricao, preco)
          VALUES (${newId}, ${it.nome}, ${it.descricao || null}, ${Number(it.preco) || 0})
        `
      }
      return { id: newId }
    })
    revalidatePath("/clientes")
    return created
  } else {
    const updated = await prisma.$transaction(async (tx) => {
      // Usando executeRaw devido a cache do Prisma
      await tx.$executeRaw`DELETE FROM "ItemExclusivoCliente" WHERE "clienteId" = ${Number(id)}`
      
      const now = new Date()
      await tx.$executeRaw`
        UPDATE "Cliente"
        SET 
          "razaoSocial" = ${prismaData.razaoSocial},
          "nomeFantasia" = ${prismaData.nomeFantasia},
          "cnpj" = ${prismaData.cnpj},
          "ie" = ${prismaData.ie},
          "email" = ${prismaData.email},
          "telefone" = ${prismaData.telefone},
          "compradorNome" = ${prismaData.compradorNome},
          "compradorTelefone" = ${prismaData.compradorTelefone},
          "endereco" = ${prismaData.endereco},
          "cep" = ${prismaData.cep},
          "cidade" = ${prismaData.cidade},
          "estado" = ${prismaData.estado},
          "observacoes" = ${prismaData.observacoes},
          "ativo" = ${prismaData.ativo},
          "saldoCreditoValor" = ${rest.saldoCreditoValor !== undefined ? rest.saldoCreditoValor : 0},
          "saldoCreditoEtiquetas" = ${rest.saldoCreditoEtiquetas !== undefined ? rest.saldoCreditoEtiquetas : 0},
          "updatedAt" = ${now}
        WHERE id = ${Number(id)}
      `

      for (const it of itensExclusivos) {
        await tx.$executeRaw`
          INSERT INTO "ItemExclusivoCliente" ("clienteId", nome, descricao, preco)
          VALUES (${Number(id)}, ${it.nome}, ${it.descricao || null}, ${Number(it.preco) || 0})
        `
      }
      return { id: Number(id) }
    })
    
    revalidatePath("/clientes")
    revalidatePath(`/clientes/${id}`)
    return updated
  }
}
