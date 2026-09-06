"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"
import type { Etiqueta } from "@/lib/types"

export async function getEtiquetas() {
  const dbEtiquetas = await prisma.etiqueta.findMany({
    orderBy: { id: "desc" }, // Most recent first
    relationLoadStrategy: "join",
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
    formato: e.formato as Etiqueta["formato"],
    unidadeVenda: e.unidadeVenda as Etiqueta["unidadeVenda"],
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
    const { id, clientes, diametro, ...rest } = data

    const formato = rest.formato === "REDONDA" ? "REDONDA" : "RETANGULAR"
    const unidadeVenda = rest.unidadeVenda === "MILHEIRO" ? "MILHEIRO" : "UNIDADE"

    let largura = Number(rest.largura)
    let altura = Number(rest.altura)
    if (formato === "REDONDA") {
      const d = Number(diametro ?? rest.largura)
      largura = d
      altura = d
    }

    if (!rest.nome?.trim()) throw new Error("Nome obrigatório")
    if (!largura || largura <= 0 || !altura || altura <= 0) {
      throw new Error(formato === "REDONDA" ? "Diâmetro inválido" : "Largura e altura devem ser positivas")
    }

    const prismaData = {
      nome: rest.nome.trim(),
      codigo: rest.codigo || (await getNextEtiquetaCode()),
      formato,
      unidadeVenda,
      material: rest.material?.trim() || "",
      tipoAdesivo: rest.tipoAdesivo?.trim() || "",
      largura,
      altura,
      numeroCores: rest.numeroCores != null && rest.numeroCores !== "" ? Number(rest.numeroCores) : null,
      tipoTubete: rest.tipoTubete?.trim() || "",
      quantidadePorRolo: rest.quantidadePorRolo != null && rest.quantidadePorRolo !== "" ? Number(rest.quantidadePorRolo) : null,
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
