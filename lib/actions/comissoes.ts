"use server"

import { prisma } from "@/lib/prisma"
import { unstable_noStore as noStore } from "next/cache"

export async function getComissoes(vendedorId?: number) {
  noStore()
  
  const where: any = {}
  if (vendedorId) {
    where.vendedorId = vendedorId
  }

  // Pegamos todos os pedidos válidos
  where.ativo = true

  const pedidos = await prisma.pedido.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    include: {
      vendedor: true,
      cliente: true,
      statusObj: true,
      formaPagamentoObj: true
    }
  })

  // Calcula parcelas de comissão
  const parcelas: any[] = []
  
  pedidos.forEach(ped => {
    const percentual = ped.vendedor?.comissao || 0
    const totalComissaoPedido = ped.totalGeral * (percentual / 100)
    
    // Obtém quantidade de parcelas (default to 1)
    const qtdParcelas = Math.max(1, ped.formaPagamentoObj?.quantidadeParcelas || 1)
    const valorPorParcela = totalComissaoPedido / qtdParcelas

    for (let i = 0; i < qtdParcelas; i++) {
      // Data prevista: data do pedido + (i * 30 dias)
      const dataPrevista = new Date(ped.criadoEm)
      // Ajuste de Data
      dataPrevista.setDate(dataPrevista.getDate() + (i * 30))

      parcelas.push({
        id: `${ped.id}-p${i+1}`,
        pedidoId: ped.id,
        numero: ped.numero,
        criadoEm: ped.criadoEm.toISOString(),
        clienteNome: ped.cliente?.razaoSocial || "Desconhecido",
        vendedorNome: ped.vendedor?.nome || "Sem Vendedor",
        vendedorId: ped.vendedorId,
        status: ped.statusObj?.nome || "Desconhecido",
        totalPedido: ped.totalGeral,
        percentual,
        valorComissao: valorPorParcela, // Valor rateado
        formaPagamentoNome: ped.formaPagamentoObj?.nome || ped.formaPagamento || "A combinar",
        parcelaAtual: i + 1,
        totalParcelas: qtdParcelas,
        dataPrevista: dataPrevista.toISOString()
      })
    }
  })

  // Calcula métricas gerais (usaremos a comissão já rateada)
  // O KPI totalVendas reflete o total dos pedidos, mas como dividimos em parcelas,
  // somar 'totalPedido' duplicaria o valor em caso de 2+ parcelas.
  // Vamos somar os pedidos únicos primeiro.
  const totalVendas = pedidos.reduce((acc, curr) => acc + curr.totalGeral, 0)
  const totalComissoes = parcelas.reduce((acc, curr) => acc + curr.valorComissao, 0)

  return {
    dados: parcelas, // Agora retornamos a flat list de parcelas
    kpis: {
      totalVendas,
      totalComissoes,
      pedidosConcluidos: pedidos.length // Qtd de pedidos únicos
    }
  }
}

