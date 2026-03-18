import { clientes, pedidos, vendedores, orcamentos } from "./mock-data"
import { differenceInDays, parseISO } from "date-fns"

/**
 * Gera um resumo textual do estado atual da plataforma para contextualizar a IA.
 * Inclui: total de pedidos, pedidos atrasados (SLA), clientes inativos e desempenho de vendas.
 */
export function getAIContextSummary() {
    const today = new Date()

    // 1. Pedidos e SLA (Atrasados)
    const pedidosAtrasados = pedidos.filter(p => {
        if (!p.prazoEntrega) return false
        const [day, month, year] = p.prazoEntrega.split('/').map(Number)
        const dataEntrega = new Date(year, month - 1, day)
        return dataEntrega < today && p.status !== 'entregue' && p.status !== 'cancelado'
    })

    // 2. Clientes em risco (sem compra > 30 dias)
    const clientesInativos = clientes.filter(c => {
        if (!c.ultimaCompra) return false
        const diasSemCompra = differenceInDays(today, parseISO(c.ultimaCompra))
        return diasSemCompra > 30
    }).map(c => ({
        nome: c.razaoSocial,
        dias: c.ultimaCompra ? differenceInDays(today, parseISO(c.ultimaCompra)) : 0
    }))

    // 3. Desempenho de Vendas (Ranking e Volume)
    const desempenhoVendedores = vendedores.map(v => {
        const pedidosVendedor = pedidos.filter(p => p.vendedorId === v.id && p.status === 'entregue')
        const totalVendas = pedidosVendedor.reduce((acc, p) => acc + (p.totalGeral || 0), 0)
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
    summary += `- Pedidos em Produção: ${pedidos.filter(p => p.status === 'em_producao').length}\n\n`

    summary += `RANKING DE VENDEDORES (Vendas Concluídas):\n`
    desempenhoVendedores.forEach((v, i) => {
        summary += `${i + 1}. ${v.nome}: R$ ${v.total.toLocaleString('pt-BR')} (Conversão: ${v.conversao}%)\n`
    })
    summary += `\n`

    if (pedidosAtrasados.length > 0) {
        summary += `ALERTAS DE SLA (Pedidos Atrasados):\n`
        pedidosAtrasados.forEach(p => {
            const cli = clientes.find(c => c.id === p.clienteId)
            summary += `- Pedido ${p.numero} - ${cli?.razaoSocial} (Prazo: ${p.prazoEntrega})\n`
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
