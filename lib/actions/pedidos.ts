"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"
import { Pedido } from "@/lib/types"

// Helper para garantir que o status existe no DB
async function getOrCreateStatus(codigoStr: string) {
  const map: Record<string, { nome: string, cor: string, ordem: number }> = {
    'em_analise': { nome: 'Em Análise', cor: '#eab308', ordem: 1 },
    'em_producao': { nome: 'Em Produção', cor: '#3b82f6', ordem: 2 },
    'separacao': { nome: 'Separação', cor: '#a855f7', ordem: 3 },
    'entregue': { nome: 'Entregue', cor: '#22c55e', ordem: 4 },
  }

  const def = map[codigoStr] || { nome: 'Em Análise', cor: '#eab308', ordem: 1 }

  let status = await prisma.status.findFirst({
    where: { modulo: 'pedido', nome: def.nome }
  })

  if (!status) {
    // Calculamos o id manualmente para evitar colisões com sequências dessincronizadas do Postgres por causa do seed
    const maxStatus = await prisma.status.findFirst({
      orderBy: { id: 'desc' }
    })
    const nextId = (maxStatus?.id || 0) + 1

    status = await prisma.status.create({
      data: {
        id: nextId,
        nome: def.nome,
        modulo: 'pedido',
        cor: def.cor,
        ordem: def.ordem
      }
    })
  }

  return status.id
}

// Helper reverso para devolver string
function mapStatusIdToStr(nome: string) {
  const map: Record<string, string> = {
    'Em Análise': 'em_analise',
    'Em Produção': 'em_producao',
    'Separação': 'separacao',
    'Entregue': 'entregue',
  }
  return map[nome] || 'em_analise'
}

export async function getPedidos() {
  noStore()
  const dbPedidos = await prisma.pedido.findMany({
    orderBy: { id: "desc" },
    include: {
      cliente: true,
      vendedor: true,
      statusObj: true,
      itens: true
    }
  })
  
  return dbPedidos.map(p => ({
    ...p,
    status: mapStatusIdToStr(p.statusObj?.nome || ''),
    criadoEm: p.criadoEm.toISOString(),
    atualizadoEm: p.atualizadoEm.toISOString(),
  }))
}

export async function getPedidoById(id: number) {
  noStore()
  const p = await prisma.pedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      vendedor: true,
      statusObj: true,
      itens: true
    }
  })
  
  if (!p) return null
  return {
    ...p,
    status: mapStatusIdToStr(p.statusObj?.nome || ''),
    criadoEm: p.criadoEm.toISOString(),
    atualizadoEm: p.atualizadoEm.toISOString(),
  }
}

export async function savePedido(data: any, itensData: any[]) {
  const { 
    id, 
    orcamentoId,
    clienteId, 
    vendedorId, 
    statusStr,
    numero,
    sentidoSaidaRolo,
    tipoTubete,
    gapEntreEtiquetas,
    numeroPistas,
    observacoesEmbalagem,
    observacoesFaturamento,
    prazoEntrega,
    formaPagamento,
    nomeVendedor,
    nomeComprador,
    frete,
    observacoesGerais,
    totalGeral
  } = data
  
  const statusId = await getOrCreateStatus(statusStr || 'em_analise')
  const reqNumero = numero || `PED-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`

  if (!id) {
    if (!clienteId || !vendedorId) throw new Error("Cliente e Vendedor são obrigatórios.")

    const ped = await prisma.pedido.create({
      data: {
        numero: reqNumero,
        orcamentoId: orcamentoId ? Number(orcamentoId) : null,
        clienteId: Number(clienteId),
        vendedorId: Number(vendedorId),
        statusId,
        sentidoSaidaRolo: sentidoSaidaRolo || "",
        tipoTubete: tipoTubete || "",
        gapEntreEtiquetas: gapEntreEtiquetas || "",
        numeroPistas: Number(numeroPistas) || 1,
        observacoesEmbalagem: observacoesEmbalagem || null,
        observacoesFaturamento: observacoesFaturamento || null,
        prazoEntrega: prazoEntrega || "",
        formaPagamento: formaPagamento || "",
        nomeVendedor: nomeVendedor || null,
        nomeComprador: nomeComprador || null,
        frete: frete || null,
        observacoesGerais: observacoesGerais || null,
        totalGeral: Number(totalGeral),
        itens: {
          create: itensData.map(item => ({
            descricao: item.descricao,
            quantidade: Number(item.quantidade),
            unidade: item.unidade,
            precoUnitario: Number(item.precoUnitario),
            total: Number(item.total),
          }))
        }
      }
    })
    
    revalidatePath("/pedidos")
    return ped
  } else {
    // Update
    await prisma.itemPedido.deleteMany({
      where: { pedidoId: Number(id) }
    })

    const updated = await prisma.pedido.update({
      where: { id: Number(id) },
      data: {
        orcamentoId: orcamentoId ? Number(orcamentoId) : null,
        clienteId: Number(clienteId),
        vendedorId: Number(vendedorId),
        statusId,
        sentidoSaidaRolo: sentidoSaidaRolo || "",
        tipoTubete: tipoTubete || "",
        gapEntreEtiquetas: gapEntreEtiquetas || "",
        numeroPistas: Number(numeroPistas) || 1,
        observacoesEmbalagem: observacoesEmbalagem || null,
        observacoesFaturamento: observacoesFaturamento || null,
        prazoEntrega: prazoEntrega || "",
        formaPagamento: formaPagamento || "",
        nomeVendedor: nomeVendedor || null,
        nomeComprador: nomeComprador || null,
        frete: frete || null,
        observacoesGerais: observacoesGerais || null,
        totalGeral: Number(totalGeral),
        itens: {
          create: itensData.map(item => ({
            descricao: item.descricao,
            quantidade: Number(item.quantidade),
            unidade: item.unidade,
            precoUnitario: Number(item.precoUnitario),
            total: Number(item.total),
          }))
        }
      }
    })

    revalidatePath("/pedidos")
    revalidatePath(`/pedidos/${id}`)
    return updated
  }
}

export async function deletePedido(id: number) {
  const result = await prisma.pedido.delete({
    where: { id }
  })
  revalidatePath("/pedidos")
  return result
}

export async function updatePedidoStatus(id: number, statusStr: string) {
  const statusId = await getOrCreateStatus(statusStr)
  const updated = await prisma.pedido.update({
    where: { id },
    data: { statusId }
  })
  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${id}`)
  return updated
}
