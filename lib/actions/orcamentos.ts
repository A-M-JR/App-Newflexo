"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"
import { Orcamento } from "@/lib/types"

export async function getOrcamentos(params: {
  page?: number
  limit?: number
  search?: string
  status?: string
  dataInicio?: string
  dataFim?: string
  vendedorId?: number
} = {}) {
  noStore()
  
  const page = params.page || 1
  const limit = params.limit || 20
  
  const where: any = {}

  if (params.search) {
    where.OR = [
      { numero: { contains: params.search, mode: "insensitive" } },
      { cliente: { razaoSocial: { contains: params.search, mode: "insensitive" } } },
    ]
  }

  if (params.status) {
    if (params.status === 'rascunho') where.statusId = 1
    else if (params.status === 'enviado') where.statusId = 4
    else if (params.status === 'aprovado') where.statusId = 2
    else if (params.status === 'recusado') where.statusId = 5
  }

  if (params.vendedorId) {
    where.vendedorId = params.vendedorId
  }

  if (params.dataInicio || params.dataFim) {
    where.criadoEm = {}
    if (params.dataInicio) where.criadoEm.gte = new Date(params.dataInicio)
    // Add 1 day to end date to include the entire day
    if (params.dataFim) {
      const ends = new Date(params.dataFim)
      ends.setDate(ends.getDate() + 1)
      where.criadoEm.lt = ends
    }
  }

  const [total, totalValorObj, vigentes, aprovados, parados, dbOrcs] = await prisma.$transaction([
    prisma.orcamento.count({ where }),
    prisma.orcamento.aggregate({
      _sum: { totalGeral: true },
      where: { ...where, statusId: { not: 5 } } // recusado é 5
    }),
    prisma.orcamento.count({ where: { ...where, statusId: 4 } }), // enviado/vigente
    prisma.orcamento.count({ where: { ...where, statusId: 2 } }), // aprovado
    prisma.orcamento.count({ where: { ...where, statusId: { in: [1, 5] } } }), // rascunho(1) ou recusado(5)
    prisma.orcamento.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        cliente: true,
        vendedor: true,
        statusObj: true,
        itens: true,
        _count: {
          select: { itens: true }
        }
      }
    })
  ])
  
  return {
    data: dbOrcs.map(o => ({
      ...o,
      status: o.statusObj?.nome?.toLowerCase() === 'pendente' ? 'rascunho' : (o.statusObj?.nome?.toLowerCase() || 'rascunho'),
      criadoEm: o.criadoEm.toISOString(),
      atualizadoEm: o.atualizadoEm.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    kpis: {
      totalValor: totalValorObj._sum.totalGeral || 0,
      vigentes,
      aprovados,
      parados
    }
  }
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
