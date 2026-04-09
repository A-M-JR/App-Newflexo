import { prisma } from "./prisma"

/**
 * Gera um resumo textual do estado atual da plataforma para contextualizar a IA.
 * Inclui: total de pedidos, pedidos atrasados (SLA), clientes inativos e desempenho de vendas.
 */
export async function getAIContextSummary() {
    const today = new Date()

    const orcamentos = await prisma.orcamento.findMany()
    const pedidos = await prisma.pedido.findMany({ include: { cliente: true, vendedor: true, statusObj: true } })
    const clientes = await prisma.cliente.findMany()
    const vendedores = await prisma.vendedor.findMany()

    // 1. Pedidos e SLA (Atrasados)
    const pedidosAtrasados = pedidos.filter(p => {
        if (!p.prazoEntrega) return false
        const dataEntrega = new Date(p.prazoEntrega)
        return dataEntrega < today && p.statusObj?.nome !== 'Entregue' && p.statusObj?.nome !== 'Cancelado'
    })

    // 2. Clientes em risco (sem compra > 30 dias)
    const clientesInativos = clientes.filter(c => {
        if (!c.ultimaCompra) return false
        const diasSemCompra = Math.floor((today.getTime() - c.ultimaCompra.getTime()) / (1000 * 3600 * 24))
        return diasSemCompra > 30
    }).map(c => ({
        nome: c.razaoSocial,
        dias: c.ultimaCompra ? Math.floor((today.getTime() - c.ultimaCompra.getTime()) / (1000 * 3600 * 24)) : 0
    }))

    // 3. Desempenho de Vendas (Ranking e Volume)
    const desempenhoVendedores = vendedores.map(v => {
        const pedidosVendedor = pedidos.filter(p => p.vendedorId === v.id && p.statusObj?.nome === 'Entregue')
        const totalVendas = pedidosVendedor.reduce((acc, p) => acc + Number(p.totalGeral || 0), 0)
        const orcamentosVendedor = orcamentos.filter(o => o.vendedorId === v.id)
        const taxaConversao = orcamentosVendedor.length > 0
            ? ((pedidosVendedor.length / orcamentosVendedor.length) * 100).toFixed(1)
            : 0

        return { nome: v.nome, total: totalVendas, conversao: taxaConversao }
    }).sort((a, b) => b.total - (a.total as number))

    // Monta o resumo
    let summary = `\n--- CONTEXTO ATUAL DO SISTEMA ---\n`
    summary += `Data atual: ${today.toLocaleDateString('pt-BR')}\n`

    summary += `RESUMO FINANCEIRO:\n`
    summary += `- Total de Pedidos: ${pedidos.length}\n`
    summary += `- Pedidos em Produção: ${pedidos.filter(p => p.statusObj?.nome === 'Em Produção').length}\n\n`

    summary += `RANKING DE VENDEDORES (Vendas Concluídas):\n`
    desempenhoVendedores.forEach((v, i) => {
        summary += `${i + 1}. ${v.nome}: R$ ${v.total.toLocaleString('pt-BR')} (Conversão: ${v.conversao}%)\n`
    })
    summary += `\n`

    if (pedidosAtrasados.length > 0) {
        summary += `ALERTAS DE SLA (Pedidos Atrasados):\n`
        pedidosAtrasados.forEach(p => {
            const cli = p.cliente
            summary += `- Pedido ${p.numero} - ${cli?.razaoSocial} (Prazo: ${p.prazoEntrega ? new Date(p.prazoEntrega).toLocaleDateString('pt-BR') : 'N/D'})\n`
        })
        summary += `\n`
    }

    if (clientesInativos.length > 0) {
        summary += `CLIENTES SEM COMPRA > 30 DIAS:\n`
        clientesInativos.slice(0, 5).forEach(c => {
            summary += `- ${c.nome} (Há ${c.dias} dias)\n`
        })
    }

    summary += `--- FIM DO CONTEXTO ---\n`

    return summary
}
