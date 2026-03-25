"use server"

import { prisma } from "@/lib/prisma"
import { Vendedor } from "@/lib/types"
import { revalidatePath } from "next/cache"

export async function getVendedores(): Promise<Vendedor[]> {
  const dbVendedores = await prisma.vendedor.findMany({
    orderBy: { nome: "asc" },
  })
  return dbVendedores.map(v => ({
    ...v,
    criadoEm: v.criadoEm.toISOString(),
  })) as unknown as Vendedor[]
}

export async function saveVendedor(data: Partial<Vendedor>) {
  const { id, ...rest } = data
  
  const prismaData: any = {
    nome: rest.nome,
    email: rest.email?.toLowerCase(),
    telefone: rest.telefone,
    comissao: rest.comissao,
    regiao: rest.regiao,
    ativo: rest.ativo,
  }

  if (!id || id > 1000000000) {
    // New vendor
    return prisma.vendedor.create({
      data: prismaData
    })
  } else {
    // Update existing
    return prisma.vendedor.update({
      where: { id: id as any },
      data: prismaData
    })
  }
}

export async function toggleVendedorActive(id: number) {
  const vendedor = await prisma.vendedor.findUnique({ where: { id: id as any } })
  if (!vendedor) throw new Error("Vendedor não encontrado")
  
  const updated = await prisma.vendedor.update({
    where: { id: id as any },
    data: { ativo: !vendedor.ativo },
  })
  revalidatePath("/vendedores")
  return updated
}
