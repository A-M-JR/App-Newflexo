"use server"

import { prisma } from "@/lib/prisma"
import { User, Vendedor } from "@/lib/types"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

import { Prisma } from "@prisma/client"

// Cache curto da permissão do usuário (ver getRequesterVendedorId).
const globalForPerm = global as unknown as {
  __permCache?: Map<number, { value: number | 'admin'; at: number }>
}
const permCache = globalForPerm.__permCache ?? new Map<number, { value: number | 'admin'; at: number }>()
globalForPerm.__permCache = permCache
const PERM_TTL_MS = 15000

function invalidarPermissao(id?: number | null) {
  if (id == null) permCache.clear()
  else permCache.delete(Number(id))
}

export async function getUsers(params: {
  page?: number
  limit?: number
  search?: string
  status?: 'todos' | 'ativo' | 'inativo'
} = {}) {
  const page = params.page || 1
  const limit = params.limit || 20
  const searchPattern = `%${params.search || ""}%`
  const status = params.status || 'todos'

  // 1. SQL Raw para contadores de status
  let statusFilterSql = Prisma.sql`TRUE`
  if (status === 'ativo') statusFilterSql = Prisma.sql`"ativo" = TRUE`
  else if (status === 'inativo') statusFilterSql = Prisma.sql`"ativo" = FALSE`

  const countsPromise = prisma.$queryRaw<any[]>`
    SELECT 
      COUNT(*) FILTER (WHERE ${statusFilterSql})::int as total_filtrado,
      COUNT(*) FILTER (WHERE "ativo" = TRUE)::int as ativos,
      COUNT(*) FILTER (WHERE "ativo" = FALSE)::int as bloqueados,
      COUNT(*)::int as total_global
    FROM "User"
    WHERE ("nome" ILIKE ${searchPattern} OR "email" ILIKE ${searchPattern})
  `

  // 2. Busca paginada
  const where: any = {}
  if (params.search) {
    where.OR = [
      { nome: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ]
  }
  if (status === 'ativo') where.ativo = true
  else if (status === 'inativo') where.ativo = false

  // Contagem e página são independentes: rodam em paralelo.
  const [counts, dbUsers] = await Promise.all([
    countsPromise,
    prisma.user.findMany({
      where,
      orderBy: { nome: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      // Nunca trafegar o hash da senha até o cliente.
      select: {
        id: true, nome: true, email: true, role: true, ativo: true,
        vendedorId: true, criadoEm: true, updatedAt: true,
      },
    }),
  ])
  const stats = counts[0] || { total_filtrado: 0, ativos: 0, bloqueados: 0, total_global: 0 }

  return {
    data: dbUsers.map(u => ({
      ...u,
      criadoEm: u.criadoEm.toISOString(),
    })),
    total: stats.total_filtrado,
    page,
    totalPages: Math.ceil(stats.total_filtrado / limit),
    kpis: {
      total: stats.total_global,
      ativos: stats.ativos,
      bloqueados: stats.bloqueados
    }
  }
}

export async function saveUser(data: Partial<User>, senha?: string) {
  const { id, ...rest } = data
  
  // Remove fields that shouldn't be updated directly via this method if necessary
  const prismaData: any = {
    nome: rest.nome,
    email: rest.email?.toLowerCase(),
    role: rest.role,
    vendedorId: rest.vendedorId || null,
    ativo: rest.ativo,
  }

  if (senha) {
    prismaData.senha = await bcrypt.hash(senha, 10)
  }

  if (!id || id > 1000000000) {
    // New user
    if (!senha) prismaData.senha = await bcrypt.hash("123456", 10) // Default password
    
    invalidarPermissao()
    return prisma.user.create({
      data: prismaData
    })
  } else {
    // Update existing
    invalidarPermissao(id as any)
    return prisma.user.update({
      where: { id: id as any },
      data: prismaData
    })
  }
}

export async function toggleUserActive(id: number) {
  const user = await prisma.user.findUnique({ where: { id: id as any } })
  if (!user) throw new Error("Usuário não encontrado")
  
  const updated = await prisma.user.update({
    where: { id: id as any },
    data: { ativo: !user.ativo },
  })
  invalidarPermissao(id)
  revalidatePath("/usuarios")
  return updated
}

export async function updateUserPassword(id: number, senha: string) {
  const hashedPassword = await bcrypt.hash(senha, 10)
  return prisma.user.update({
    where: { id: id as any },
    data: { senha: hashedPassword },
  })
}
export async function verifySession(id: number) {
  const user = await prisma.user.findUnique({
    where: { id: id as any },
    // Sem o hash da senha: esse retorno vai para o cliente e para o localStorage.
    select: {
      id: true, nome: true, email: true, role: true, ativo: true,
      vendedorId: true, criadoEm: true, updatedAt: true,
    },
  })

  if (!user || !user.ativo) return null

  let vendor = null
  if (user.vendedorId) {
    vendor = await prisma.vendedor.findUnique({
      where: { id: user.vendedorId as any }
    })
  }

  return {
    user: {
      ...user,
      criadoEm: user.criadoEm.toISOString()
    } as unknown as User,
    vendor: vendor ? {
      ...vendor,
      criadoEm: vendor.criadoEm.toISOString()
    } as unknown as Vendedor : null
  }
}

/**
 * Retorna 'admin' se for administrador, ou o vendedorId se for um vendedor limitado.
 * Usado para forçar filtros de segurança no lado do servidor.
 *
 * Toda consulta de lista passa por aqui, então o resultado fica em cache por um
 * intervalo curto: papéis/vínculos não mudam nesse tempo e economizamos um
 * round-trip por requisição. Alterações em usuário invalidam o cache na hora.
 */
export async function getRequesterVendedorId(userId: number): Promise<number | 'admin'> {
  const id = Number(userId)
  const hit = permCache.get(id)
  if (hit && Date.now() - hit.at < PERM_TTL_MS) return hit.value

  const user = await prisma.user.findUnique({
    where: { id },
    select: { ativo: true, role: true, vendedorId: true },
  })

  // Se o usuário não existir, não estiver ativo ou não for admin e não tiver vendedorId,
  // retornamos -1 para garantir que ele não veja nada (filtro por ID inexistente).
  let value: number | 'admin' = -1
  if (user && user.ativo) {
    value = user.role === 'admin' ? 'admin' : (user.vendedorId || -1)
  }

  permCache.set(id, { value, at: Date.now() })
  return value
}
