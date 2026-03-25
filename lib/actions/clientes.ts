"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"

export async function getClientes() {
  noStore()
  const dbClientes = await prisma.cliente.findMany({
    orderBy: { razaoSocial: "asc" },
    include: {
      orcamentos: {
        select: { id: true, criadoEm: true, totalGeral: true, statusId: true }
      },
      pedidos: {
        select: { id: true, criadoEm: true, totalGeral: true, statusId: true, prazoEntrega: true }
      }
    }
  })
  
  return dbClientes.map(c => ({
    ...c,
    criadoEm: c.criadoEm.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))
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
