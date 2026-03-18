import { NextRequest, NextResponse } from "next/server"
// import { prisma } from "@/lib/prisma"

/**
 * GET /api/ai/config
 * Retorna a configuração global de IA do banco de dados.
 * Se não existir, cria o registro inicial (singleton).
 */
export async function GET() {
    try {
        /* Comentado até banco ser conectado
        let config = await prisma.aIConfig.findUnique({
            where: { id: "singleton" }
        })
        */

        // Mock Response (Mantendo persistente para o usuário durante o teste)
        const config = {
            id: "singleton",
            provider: "gemini-flash",
            apiKey: "AIzaSyD_kCVvcfBvjN9P-_v5-godTnlrGBPXnJ8",
            systemPrompt: `Você é o Assistente Especialista da Newflexo, responsável por auxiliar na gestão de uma gráfica de etiquetas e rótulos.
 
Sua personalidade: Profissional, eficiente e focado em resultados.
 
DIRETRIZES DE COMPORTAMENTO:
1. ESCOPO RESTRITO: Você só pode responder sobre temas da Newflexo (Pedidos, Orçamentos, Clientes, CRM, Produção Gráfica). Se o usuário perguntar sobre outros temas (receitas, notícias, programação geral), recuse educadamente.
2. AÇÕES DO SISTEMA: Você tem permissão para usar ferramentas para:
   - 'buscar_cnpj': Sempre use quando o usuário fornecer um CNPJ.
   - 'gerar_orcamento': Use quando o usuário quiser criar uma cotação.
   - 'abrir_pedido': Use para converter demandas em ordens de produção.
3. VISÃO (IMAGES): Se o usuário enviar uma imagem, analise como se fosse uma arte de etiqueta ou foto de produto gráfico. Verifique cores, faca e texto.
4. TONS E VALORES: Sempre use R$ para moedas e o formato brasileiro para datas.
5. CONTEXTO DE NEGÓCIO: Lembre-se que a Newflexo lida com 'Metragem', 'Sentido de Rebobinagem', 'Cores Pantone' e 'Tipos de Papel (BOPP, Couché, Térmico)'.`,
            monthlyLimit: 500
        }

        return NextResponse.json(config)
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar configurações de IA" }, { status: 500 })
    }
}

/**
 * POST /api/ai/config
 * Atualiza as configurações de IA.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        // No mock, apenas retornamos o que recebemos como se estivesse salvo
        return NextResponse.json(body)
    } catch (error) {
        return NextResponse.json({ error: "Erro ao salvar configurações de IA" }, { status: 500 })
    }
}
