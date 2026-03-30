"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"

export async function getEtiquetas() {
  noStore()
  const dbEtiquetas = await prisma.etiqueta.findMany({
    orderBy: { id: "desc" }, // Most recent first
    include: {
      clientesAutorizados: {
        include: {
          cliente: {
            select: { id: true, razaoSocial: true }
          }
        }
      }
    }
  })
  
  return dbEtiquetas.map(e => ({
    ...e,
    criadoEm: e.criadoEm.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    clientesIds: e.clientesAutorizados.map(ca => ca.clienteId)
  }))
}

export async function getNextEtiquetaCode() {
  noStore()
  const lastEtiqueta = await prisma.etiqueta.findFirst({
    orderBy: { id: 'desc' },
    select: { codigo: true }
  })

  if (!lastEtiqueta) return "1"

  const lastCode = parseInt(lastEtiqueta.codigo)
  if (isNaN(lastCode)) {
      // If the last code wasn't a number, count all and suggest next
      const count = await prisma.etiqueta.count()
      return (count + 1).toString()
  }

  return (lastCode + 1).toString()
}

export async function saveEtiqueta(data: any) {
  const { id, clientesIds, ...rest } = data
  
  const prismaData = {
    nome: rest.nome,
    codigo: rest.codigo,
    material: rest.material,
    tipoAdesivo: rest.tipoAdesivo,
    largura: Number(rest.largura),
    altura: Number(rest.altura),
    numeroCores: Number(rest.numeroCores),
    tipoTubete: rest.tipoTubete,
    quantidadePorRolo: Number(rest.quantidadePorRolo),
    metragem: rest.metragem ? Number(rest.metragem) : null,
    preco: rest.preco ? Number(rest.preco) : 0,
    coresDescricao: rest.coresDescricao || null,
    observacoesTecnicas: rest.observacoesTecnicas || null,
    pasta: rest.pasta || null,
    aplicacoesEspeciais: rest.aplicacoesEspeciais || [],
    ativo: rest.ativo !== undefined ? rest.ativo : true,
  }

  if (!id) {
    const created = await prisma.etiqueta.create({
      data: {
        ...prismaData,
        clientesAutorizados: {
          create: (clientesIds || []).map((cId: number) => ({
            clienteId: cId
          }))
        }
      }
    })
    revalidatePath("/etiquetas")
    return created
  } else {
    await prisma.clienteEtiqueta.deleteMany({
      where: { etiquetaId: Number(id) }
    })
    
    const updated = await prisma.etiqueta.update({
      where: { id: Number(id) },
      data: {
        ...prismaData,
        clientesAutorizados: {
          create: (clientesIds || []).map((cId: number) => ({
            clienteId: cId
          }))
        }
      }
    })
    revalidatePath("/etiquetas")
    return updated
  }
}

export async function deleteEtiqueta(id: number) {
    await prisma.etiqueta.delete({
        where: { id }
    })
    revalidatePath("/etiquetas")
    return { success: true }
}
