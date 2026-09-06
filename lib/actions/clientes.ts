"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"
import { Prisma } from "@prisma/client"

export async function getClientes(params: {
  page?: number
  limit?: number
  search?: string
  filter?: 'todos' | '30d' | '60d'
  mode?: 'full' | 'dropdown' | 'list'
} = {}) {
  
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

  const countsPromise = prisma.$queryRaw<any[]>`
    SELECT 
      COUNT(*)::int as total_global,
      COUNT(*) FILTER (WHERE ("ultimaCompra" < ${trintaDiasAtras} AND "ultimaCompra" >= ${sessentaDiasAtras}) OR ("ultimaCompra" IS NULL AND "criadoEm" < ${trintaDiasAtras} AND "criadoEm" >= ${sessentaDiasAtras}))::int as sem_compra_30,
      COUNT(*) FILTER (WHERE "ultimaCompra" < ${sessentaDiasAtras} OR ("ultimaCompra" IS NULL AND "criadoEm" < ${sessentaDiasAtras}))::int as sem_compra_60,
      COUNT(*) FILTER (WHERE ${filterSql})::int as total_filtrado
    FROM "Cliente"
    WHERE ("razaoSocial" ILIKE ${searchPattern} OR "cnpj" ILIKE ${searchPattern} OR "cidade" ILIKE ${searchPattern})
  `

  // 2. Busca dos dados via Prisma para garantir integridade das relações
  const where: Prisma.ClienteWhereInput = {
    OR: [
      { razaoSocial: { contains: search, mode: 'insensitive' } },
      { cnpj: { contains: search, mode: 'insensitive' } },
      { cidade: { contains: search, mode: 'insensitive' } },
    ],
  }

  // Aplica filtro de tempo se necessário
  if (filter === '30d') {
    where.OR = [
      { ultimaCompra: { lt: trintaDiasAtras, gte: sessentaDiasAtras } },
      { AND: [{ ultimaCompra: null }, { criadoEm: { lt: trintaDiasAtras, gte: sessentaDiasAtras } }] }
    ]
  } else if (filter === '60d') {
    where.OR = [
      { ultimaCompra: { lt: sessentaDiasAtras } },
      { AND: [{ ultimaCompra: null }, { criadoEm: { lt: sessentaDiasAtras } }] }
    ]
  }

  // As etiquetas exclusivas (com o objeto Etiqueta inteiro de cada vínculo) só
  // interessam ao modo 'full'. Na lista paginada isso puxava dezenas de linhas
  // extras por cliente sem que a tela mostrasse nenhuma delas.
  const comEtiquetas = mode === 'full'

  // Contagem e página são independentes: rodam em paralelo.
  const [counts, dbClientes] = await Promise.all([
    countsPromise,
    prisma.cliente.findMany({
      where,
      include: {
        ...(comEtiquetas
          ? { etiquetasExclusivas: { include: { etiqueta: true } } }
          : {}),
        _count: {
          select: { orcamentos: true, pedidos: true }
        }
      },
      orderBy: { razaoSocial: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const stats = counts[0] || { total_global: 0, sem_compra_30: 0, sem_compra_60: 0, total_filtrado: 0 }

  return {
    data: dbClientes.map((c: any) => ({
      ...c,
      etiquetasVinculadas: (c.etiquetasExclusivas || []).map((ee: any) => ee.etiqueta),
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

// Teto do histórico carregado na ficha do cliente. Sem limite, um cliente antigo
// puxava a base inteira de orçamentos/pedidos dele em uma tacada só.
const HISTORICO_LIMITE = 200

export async function getClienteById(id: number) {
  // As quatro consultas são independentes — uma rodada só em vez de quatro idas
  // sequenciais ao banco.
  const [results, orcamentos, pedidos, itensExclusivos] = await Promise.all([
    // Busca via Raw SQL para garantir que pegamos os campos novos (nomeFantasia, etc)
    prisma.$queryRaw`SELECT * FROM "Cliente" WHERE id = ${id}` as Promise<any[]>,
    prisma.orcamento.findMany({
      where: { clienteId: id },
      include: { statusObj: true },
      orderBy: { id: 'desc' },
      take: HISTORICO_LIMITE,
    }),
    prisma.pedido.findMany({
      where: { clienteId: id },
      include: { statusObj: true },
      orderBy: { id: 'desc' },
      take: HISTORICO_LIMITE,
    }),
    // Fallback para itens exclusivos via raw query devido a cache do Prisma
    prisma.$queryRaw`SELECT * FROM "ItemExclusivoCliente" WHERE "clienteId" = ${id}` as Promise<any[]>,
  ])

  if (results.length === 0) return null
  const cliente = results[0]

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

// Verificação rápida de duplicidade de CNPJ/CPF (compara só os dígitos, ignora máscara).
// Usada para avisar o usuário na hora, antes de terminar de preencher o cadastro.
export async function checkClienteDuplicado(cnpj: string, excludeId?: number) {
  const cnpjDigits = String(cnpj || "").replace(/\D/g, "")
  if (!cnpjDigits) return { exists: false as const }

  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, "razaoSocial" FROM "Cliente"
    WHERE cnpj IS NOT NULL
      AND regexp_replace(cnpj, '[^0-9]', '', 'g') = ${cnpjDigits}
      ${excludeId ? Prisma.sql`AND id <> ${Number(excludeId)}` : Prisma.empty}
    LIMIT 1
  `

  if (rows.length > 0) {
    return { exists: true as const, id: rows[0].id as number, razaoSocial: rows[0].razaoSocial as string }
  }
  return { exists: false as const }
}

export async function saveCliente(data: any) {
  const { id, numero, ...rest } = data
  
  let finalEndereco = rest.endereco || ""
  if (numero && !finalEndereco.includes(numero)) {
    finalEndereco = `${finalEndereco}, ${numero}`
  }

  // Campo em branco vira NULL, nao string vazia: "sem informacao" precisa de uma
  // representacao unica. E o indice unico de cnpj aceita varios NULL, mas so um
  // unico "" — com string vazia, o segundo cliente sem documento nao salvaria.
  const ouNulo = (v: any) => {
    const t = typeof v === "string" ? v.trim() : v
    return t === "" || t === undefined ? null : t
  }

  const prismaData: any = {
    razaoSocial: rest.razaoSocial,
    nomeFantasia: ouNulo(rest.nomeFantasia),
    cnpj: ouNulo(rest.cnpj),
    ie: ouNulo(rest.ie),
    email: ouNulo(rest.email),
    telefone: ouNulo(rest.telefone),
    compradorNome: ouNulo(rest.compradorNome),
    compradorTelefone: ouNulo(rest.compradorTelefone),
    endereco: finalEndereco,
    cep: ouNulo(rest.cep),
    cidade: ouNulo(rest.cidade),
    estado: ouNulo(rest.estado),
    pais: ouNulo(rest.pais) || "Brasil",
    observacoes: ouNulo(rest.observacoes),
    ativo: rest.ativo !== undefined ? rest.ativo : true,
  }

  const itensExclusivos = rest.itensExclusivos || []

  // Validação de duplicidade: compara apenas os dígitos do CNPJ/CPF,
  // ignorando máscara (pontos, barras, traços) para evitar cadastro repetido.
  const cnpjDigits = String(prismaData.cnpj || "").replace(/\D/g, "")
  if (cnpjDigits) {
    const existentes = await prisma.$queryRaw<any[]>`
      SELECT id FROM "Cliente"
      WHERE cnpj IS NOT NULL
        AND regexp_replace(cnpj, '[^0-9]', '', 'g') = ${cnpjDigits}
        ${id ? Prisma.sql`AND id <> ${Number(id)}` : Prisma.empty}
      LIMIT 1
    `
    if (existentes.length > 0) {
      return { error: "Cliente já existente (CNPJ/CPF já cadastrado)." }
    }
  }

  if (!id) {
    const created = await prisma.$transaction(async (tx) => {
      // Inserção manual do Cliente via raw SQL
      const now = new Date()
      const inserido = await tx.$queryRaw<{ id: number }[]>`
        INSERT INTO "Cliente" (
          "razaoSocial", "nomeFantasia", cnpj, ie, email, telefone, 
          "compradorNome", "compradorTelefone", endereco, cep, cidade, estado, pais,
          observacoes, ativo, "saldoCreditoValor", "saldoCreditoEtiquetas", "criadoEm", "updatedAt"
        )
        VALUES (
          ${prismaData.razaoSocial}, ${prismaData.nomeFantasia}, ${prismaData.cnpj}, ${prismaData.ie}, 
          ${prismaData.email}, ${prismaData.telefone}, ${prismaData.compradorNome}, ${prismaData.compradorTelefone}, 
          ${prismaData.endereco}, ${prismaData.cep}, ${prismaData.cidade}, ${prismaData.estado}, ${prismaData.pais},
          ${prismaData.observacoes}, ${prismaData.ativo}, 
          ${rest.saldoCreditoValor || 0}, ${rest.saldoCreditoEtiquetas || 0}, ${now}, ${now}
        )
        RETURNING id
      `

      // O id vem do proprio INSERT. Antes era um "SELECT id ORDER BY id DESC
      // LIMIT 1" depois da insercao, que devolve o id errado se outro cadastro
      // for gravado no mesmo instante — e os itens exclusivos iriam para o
      // cliente errado.
      const newId = inserido[0].id

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
      // Sincronização inteligente de itens exclusivos
      const itemIdsToKeep = itensExclusivos.map((it: any) => it.id).filter(Boolean).map(Number)
      if (itemIdsToKeep.length > 0) {
        await tx.$executeRaw`DELETE FROM "ItemExclusivoCliente" WHERE "clienteId" = ${Number(id)} AND id NOT IN (${Prisma.join(itemIdsToKeep)})`
      } else {
        await tx.$executeRaw`DELETE FROM "ItemExclusivoCliente" WHERE "clienteId" = ${Number(id)}`
      }
      
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
          "pais" = ${prismaData.pais},
          "observacoes" = ${prismaData.observacoes},
          "ativo" = ${prismaData.ativo},
          "saldoCreditoValor" = ${rest.saldoCreditoValor !== undefined ? rest.saldoCreditoValor : 0},
          "saldoCreditoEtiquetas" = ${rest.saldoCreditoEtiquetas !== undefined ? rest.saldoCreditoEtiquetas : 0},
          "updatedAt" = ${now}
        WHERE id = ${Number(id)}
      `

      for (const it of itensExclusivos) {
        if (it.id) {
          await tx.$executeRaw`
            UPDATE "ItemExclusivoCliente" 
            SET nome = ${it.nome}, descricao = ${it.descricao || null}, preco = ${Number(it.preco) || 0}
            WHERE id = ${Number(it.id)}
          `
        } else {
          await tx.$executeRaw`
            INSERT INTO "ItemExclusivoCliente" ("clienteId", nome, descricao, preco)
            VALUES (${Number(id)}, ${it.nome}, ${it.descricao || null}, ${Number(it.preco) || 0})
          `
        }
      }
      return { id: Number(id) }
    })
    
    revalidatePath("/clientes")
    revalidatePath(`/clientes/${id}`)
    return updated
  }
}
