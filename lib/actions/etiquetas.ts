"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"

export async function getEtiquetas() {
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
    clientesIds: e.clientesAutorizados.map(ca => ca.clienteId),
    clientesVinculados: e.clientesAutorizados.map(ca => ({
      id: ca.clienteId,
      razaoSocial: ca.cliente.razaoSocial,
      preco: (ca as any).preco
    }))
  }))
}

export async function getNextEtiquetaCode() {
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
  try {
    const { id, clientes, ...rest } = data
    
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
      const created = await prisma.$transaction(async (tx) => {
        const etiqueta = await tx.etiqueta.create({
          data: prismaData
        })

        if (clientes && clientes.length > 0) {
          await Promise.all(clientes.map((c: any) => 
            tx.clienteEtiqueta.create({
              data: {
                etiquetaId: etiqueta.id,
                clienteId: Number(c.id),
                preco: c.preco ? Number(c.preco) : null
              }
            })
          ))
        }
        return etiqueta
      })

      revalidatePath("/etiquetas")
      return created
    } else {
      const updated = await prisma.$transaction(async (tx) => {
        // Remove vínculos antigos
        await tx.clienteEtiqueta.deleteMany({
          where: { etiquetaId: Number(id) }
        })
        
        // Atualiza a etiqueta
        const etiqueta = await tx.etiqueta.update({
          where: { id: Number(id) },
          data: prismaData
        })

        // Cria novos vínculos
        if (clientes && clientes.length > 0) {
          await Promise.all(clientes.map((c: any) => 
            tx.clienteEtiqueta.create({
              data: {
                etiquetaId: etiqueta.id,
                clienteId: Number(c.id),
                preco: c.preco ? Number(c.preco) : null
              }
            })
          ))
        }
        return etiqueta
      })

      revalidatePath("/etiquetas")
      return updated
    }
  } catch (error: any) {
    console.error("ERRO DETALHADO EM saveEtiqueta:", error)
    throw new Error(error.message || "Erro interno ao salvar etiqueta")
  }
}

export async function deleteEtiqueta(id: number) {
    await prisma.etiqueta.delete({
        where: { id }
    })
    revalidatePath("/etiquetas")
    return { success: true }
}
