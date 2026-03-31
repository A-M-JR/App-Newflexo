"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"

export async function getClientes(params: {
  page?: number
  limit?: number
  search?: string
} = {}) {
  noStore()
  
  const page = params.page || 1
  const limit = params.limit || 20
  const search = params.search || ""

  const where = search ? {
    OR: [
      { razaoSocial: { contains: search, mode: "insensitive" as const } },
      { cnpj: { contains: search, mode: "insensitive" as const } },
      { cidade: { contains: search, mode: "insensitive" as const } },
    ]
  } : {}

  const hoje = new Date()
  const trintaDiasAtras = new Date(hoje.getTime() - (30 * 24 * 60 * 60 * 1000))
  const sessentaDiasAtras = new Date(hoje.getTime() - (60 * 24 * 60 * 60 * 1000))

  const [total, semCompra30, semCompra60, dbClientes] = await prisma.$transaction([
    prisma.cliente.count({ where }),
    prisma.cliente.count({ 
      where: { 
        ultimaCompra: { lt: trintaDiasAtras, gte: sessentaDiasAtras }
      }
    }),
    prisma.cliente.count({ 
      where: { 
        OR: [
          { ultimaCompra: { lt: sessentaDiasAtras } },
          { ultimaCompra: null }
        ]
      }
    }),
    prisma.cliente.findMany({
      where,
      orderBy: { razaoSocial: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { orcamentos: true, pedidos: true }
        }
      }
    })
  ])
  
  return {
    data: dbClientes.map(c => ({
      ...c,
      criadoEm: c.criadoEm.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      ultimaCompra: c.ultimaCompra ? c.ultimaCompra.toISOString() : null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    kpis: {
      total,
      semCompra30,
      semCompra60
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
