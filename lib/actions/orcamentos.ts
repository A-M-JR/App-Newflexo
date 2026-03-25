"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"
import { Orcamento } from "@/lib/types"

export async function getOrcamentos() {
  noStore()
  const dbOrcs = await prisma.orcamento.findMany({
    orderBy: { id: "desc" },
    include: {
      cliente: true,
      vendedor: true,
      statusObj: true,
      itens: true,
      pedidos: true
    }
  })
  
  return dbOrcs.map(o => ({
    ...o,
    status: o.statusObj?.nome?.toLowerCase() === 'pendente' ? 'rascunho' : (o.statusObj?.nome?.toLowerCase() || 'rascunho'),
    criadoEm: o.criadoEm.toISOString(),
    atualizadoEm: o.atualizadoEm.toISOString(),
  }))
}

export async function getOrcamentoById(id: number) {
  noStore()
  const o = await prisma.orcamento.findUnique({
    where: { id },
    include: {
      cliente: true,
      vendedor: true,
      statusObj: true,
      itens: true
    }
  })
  
  if (!o) return null
  return {
    ...o,
    status: o.statusObj?.nome?.toLowerCase() === 'pendente' ? 'rascunho' : (o.statusObj?.nome?.toLowerCase() || 'rascunho'),
    criadoEm: o.criadoEm.toISOString(),
    atualizadoEm: o.atualizadoEm.toISOString(),
  }
}

export async function saveOrcamento(data: any, itensData: any[]) {
  const { id, clienteId, vendedorId, observacoes, totalGeral, numero, statusStr } = data
  
  // Encontrar ou adotar status padrão
  let statusAdopted = 1
  if (statusStr === 'rascunho') statusAdopted = 1
  if (statusStr === 'enviado') statusAdopted = 4
  if (statusStr === 'aprovado') statusAdopted = 2
  if (statusStr === 'recusado' || statusStr === 'rejeitado') statusAdopted = 5

  // Gerar numero random se for novo
  const reqNumero = numero || `ORC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`

  if (!id) {
    // Validação de segurança para foreign keys vitais
    if (!clienteId || !vendedorId) throw new Error("Cliente e Vendedor são obrigatórios.")

    const orc = await prisma.orcamento.create({
      data: {
        numero: reqNumero,
        clienteId: Number(clienteId),
        vendedorId: Number(vendedorId),
        statusId: statusAdopted,
        observacoes: observacoes || "",
        totalGeral: Number(totalGeral),
        itens: {
          create: itensData.map(item => ({
            descricao: item.descricao,
            quantidade: typeof item.quantidade === 'string' ? parseFloat(item.quantidade.replace(',','.')) || 0 : Number(item.quantidade || 0),
            unidade: item.unidade,
            precoUnitario: typeof item.precoUnitario === 'string' ? parseFloat(item.precoUnitario.replace(',','.')) || 0 : Number(item.precoUnitario || 0),
            total: (typeof item.quantidade === 'string' ? parseFloat(item.quantidade.replace(',','.')) || 0 : Number(item.quantidade || 0)) * (typeof item.precoUnitario === 'string' ? parseFloat(item.precoUnitario.replace(',','.')) || 0 : Number(item.precoUnitario || 0)),
          }))
        }
      }
    })
    
    revalidatePath("/orcamentos")
    return orc
  } else {
    // Update
    // To handle items update cleanly: delete existing items and recreate them, 
    // or run a complex upsert. Since this is an MVP, deleting and recreating is safest.
    
    await prisma.itemOrcamento.deleteMany({
      where: { orcamentoId: Number(id) }
    })

    const updated = await prisma.orcamento.update({
      where: { id: Number(id) },
      data: {
        clienteId: Number(clienteId),
        vendedorId: Number(vendedorId),
        statusId: statusAdopted,
        observacoes: observacoes || "",
        totalGeral: Number(totalGeral),
        itens: {
          create: itensData.map(item => ({
            descricao: item.descricao,
            quantidade: typeof item.quantidade === 'string' ? parseFloat(item.quantidade.replace(',','.')) || 0 : Number(item.quantidade || 0),
            unidade: item.unidade,
            precoUnitario: typeof item.precoUnitario === 'string' ? parseFloat(item.precoUnitario.replace(',','.')) || 0 : Number(item.precoUnitario || 0),
            total: (typeof item.quantidade === 'string' ? parseFloat(item.quantidade.replace(',','.')) || 0 : Number(item.quantidade || 0)) * (typeof item.precoUnitario === 'string' ? parseFloat(item.precoUnitario.replace(',','.')) || 0 : Number(item.precoUnitario || 0)),
          }))
        }
      }
    })

    revalidatePath("/orcamentos")
    revalidatePath(`/orcamentos/${id}`)
    return updated
  }
}

export async function deleteOrcamento(id: number) {
  const result = await prisma.orcamento.delete({
    where: { id }
  })
  revalidatePath("/orcamentos")
  return result
}

export async function updateOrcamentoStatus(id: number, statusStr: string) {
  let statusAdopted = 1
  if (statusStr === 'rascunho') statusAdopted = 1
  if (statusStr === 'enviado') statusAdopted = 4
  if (statusStr === 'aprovado') statusAdopted = 2
  if (statusStr === 'recusado' || statusStr === 'rejeitado') statusAdopted = 5

  const result = await prisma.orcamento.update({
    where: { id },
    data: { statusId: statusAdopted }
  })
  
  revalidatePath("/orcamentos")
  revalidatePath(`/orcamentos/${id}`)
  return result
}
