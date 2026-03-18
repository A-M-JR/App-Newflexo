/**
 * =============================================
 *  MÓDULO IA — API Route (Proxy Backend)
 * =============================================
 * 
 * Endpoint POST /api/ai/chat
 * 
 * Proxy seguro entre o frontend e os provedores de IA.
 * A chave API nunca fica exposta no client-side.
 * 
 * Provedores suportados:
 *  - gpt-4o-mini  → OpenAI API
 *  - gemini-flash → Google Generative AI API
 * 
 * Estratégias de economia de tokens:
 *  - max_tokens limitado (500)
 *  - temperature baixa (0.3) → respostas mais diretas
 *  - Histórico truncado no frontend (últimas 6 msgs)
 */

import { NextRequest, NextResponse } from "next/server"

interface ChatMessage {
    role: "user" | "assistant" | "system"
    content: string
}

interface ChatRequestBody {
    messages: ChatMessage[]
    provider: "gpt-4o-mini" | "gemini-flash"
    apiKey: string
    systemPrompt: string
    includeTools?: boolean // Novo flag para ativar ferramentas
    image?: string | null // Imagem em Base64
}

// ── Definição das Ferramentas (Tools) ───────────────────────
const AI_TOOLS = [
    {
        type: "function",
        function: {
            name: "gerar_orcamento",
            description: "Prepara a criação de um novo orçamento para um cliente.",
            parameters: {
                type: "object",
                properties: {
                    cliente: { type: "string", description: "Nome ou CNPJ do cliente" },
                    itens: { type: "string", description: "Descrição dos produtos/itens" },
                    observacoes: { type: "string", description: "Detalhes técnicos ou observações" }
                },
                required: ["cliente"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "abrir_pedido",
            description: "Prepara a abertura de um pedido a partir de um orçamento ou demanda direta.",
            parameters: {
                type: "object",
                properties: {
                    cliente: { type: "string", description: "Nome ou CNPJ do cliente" },
                    valor_total: { type: "number", description: "Valor total do pedido" },
                    prazo_entrega: { type: "string", description: "Prazo ou data de entrega" }
                },
                required: ["cliente"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "buscar_cnpj",
            description: "Busca dados cadastrais de uma empresa através do CNPJ.",
            parameters: {
                type: "object",
                properties: {
                    cnpj: { type: "string", description: "O número do CNPJ (apenas números ou formatado)" }
                },
                required: ["cnpj"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "cadastrar_cliente",
            description: "Abre o formulário para cadastrar um novo cliente. Se tiver o CNPJ, os outros dados serão preenchidos automaticamente na tela.",
            parameters: {
                type: "object",
                properties: {
                    razao_social: { type: "string", description: "Razão Social ou Nome Fantasia" },
                    cnpj: { type: "string", description: "CNPJ (apenas números ou formatado)" },
                    email: { type: "string", description: "E-mail corporativo" },
                    telefone: { type: "string", description: "Telefone de contato" },
                    cep: { type: "string", description: "CEP" },
                    endereco: { type: "string", description: "Logradouro / Rua" },
                    numero: { type: "string", description: "Número" },
                    cidade: { type: "string", description: "Cidade" },
                    estado: { type: "string", description: "UF (2 letras)" }
                },
                required: ["cnpj"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "analisar_desempenho",
            description: "Obtém uma análise detalhada do desempenho de vendas, ranking de vendedores e métricas financeiras.",
            parameters: {
                type: "object",
                properties: {
                    periodo: { type: "string", description: "Período da análise (ex: este mês, últimos 30 dias, 2024)" },
                    vendedor_id: { type: "string", description: "Opcional: ID de um vendedor específico para filtrar" }
                }
            }
        }
    }
]

// ── Utilitários de Tradução de Erros ────────────────────────
function translateAIError(msg: string): string {
    const lower = msg.toLowerCase()

    if (lower.includes("high demand") || lower.includes("overloaded") || lower.includes("service unavailable")) {
        return "O assistente está com alta demanda no momento devido ao Plano Gratuito. Por favor, aguarde cerca de 30 a 60 segundos e tente novamente."
    }

    if (lower.includes("quota exceeded") || lower.includes("rate limit")) {
        return "Você atingiu o limite de velocidade de mensagens do Plano Gratuito. Por favor, aguarde um instante e tente novamente."
    }

    if (lower.includes("safety") || lower.includes("blocked")) {
        return "Esta mensagem foi filtrada pelos protocolos de segurança da IA. Tente reformular sua pergunta."
    }

    if (lower.includes("invalid api key") || lower.includes("unauthorized")) {
        return "A chave API configurada é inválida ou expirou. Verifique as configurações do Módulo IA."
    }

    return `Erro na IA: ${msg}`
}

// ── Handler POST ────────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const body: ChatRequestBody = await request.json()
        const { messages, provider, apiKey, systemPrompt } = body

        if (!apiKey || !provider || !messages?.length) {
            // console.error("[Módulo IA] Requisição inválida")
            return NextResponse.json(
                { error: "Configuração incompleta. Verifique a chave API e o provedor nas configurações do Módulo IA." },
                { status: 400 }
            )
        }

        // Roteamento por provedor
        if (provider === "gpt-4o-mini") {
            return await handleOpenAI(messages, apiKey, systemPrompt, body.includeTools, body.image)
        } else if (provider === "gemini-flash") {
            return await handleGemini(messages, apiKey, systemPrompt, body.includeTools, body.image)
        }

        return NextResponse.json({ error: "Provedor de IA não reconhecido." }, { status: 400 })
    } catch (error) {
        // console.error("[Módulo IA] Erro na API Route")
        return NextResponse.json(
            { error: "Ocorreu um erro interno na comunicação com o assistente. Tente novamente em instantes." },
            { status: 500 }
        )
    }
}

// ── OpenAI (GPT-4o-mini) ────────────────────────────────────
async function handleOpenAI(messages: ChatMessage[], apiKey: string, systemPrompt: string, includeTools?: boolean, image?: string | null) {
    const lastMsg = messages[messages.length - 1]
    const otherMsgs = messages.slice(0, -1)

    const openaiMessages: any[] = [
        { role: "system", content: systemPrompt },
        ...otherMsgs.map(m => ({ role: m.role, content: m.content })),
    ]

    // Formata a última mensagem (que pode conter a imagem)
    if (image) {
        openaiMessages.push({
            role: "user",
            content: [
                { type: "text", text: lastMsg.content },
                { type: "image_url", image_url: { url: image } }
            ]
        })
    } else {
        openaiMessages.push({ role: lastMsg.role, content: lastMsg.content })
    }

    const body: any = {
        model: "gpt-4o-mini",
        messages: openaiMessages,
        max_tokens: 500,
        temperature: 0.3,
    }

    if (includeTools) {
        body.tools = AI_TOOLS
        body.tool_choice = "auto"
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const rawError = errorData?.error?.message || `Erro ${response.status}`
        return NextResponse.json({ error: translateAIError(rawError) }, { status: response.status })
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message
    const reply = message?.content || ""
    const toolCalls = message?.tool_calls
    const tokensUsed = data.usage?.total_tokens || 0

    return NextResponse.json({ reply, toolCalls, tokensUsed })
}

// ── Google Gemini Flash ─────────────────────────────────────
async function handleGemini(messages: ChatMessage[], apiKey: string, systemPrompt: string, includeTools?: boolean, image?: string | null) {
    // Na v1beta, usamos o modelo 'latest' que é mais estável para ferramentas e instruções.
    const body: any = {
        system_instruction: {
            parts: [{ text: systemPrompt }],
        },
        contents: messages.map((m, idx) => {
            const isLast = idx === messages.length - 1
            const parts: any[] = [{ text: m.content }]

            if (isLast && image) {
                const [mimeData, base64Data] = image.split(",")
                const mimeType = mimeData.match(/:(.*?);/)?.[1] || "image/jpeg"
                parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                })
            }

            return {
                role: m.role === "assistant" ? "model" : "user",
                parts
            }
        }),
        generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.3,
        },
    }

    if (includeTools) {
        // Converte o formato do OpenAI para o formato do Gemini
        body.tools = [
            {
                function_declarations: AI_TOOLS.map(t => ({
                    name: t.function.name,
                    description: t.function.description,
                    parameters: t.function.parameters
                }))
            }
        ]
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }
    )

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const rawError = errorData?.error?.message || `Erro ${response.status}`
        return NextResponse.json({ error: translateAIError(rawError) }, { status: response.status })
    }

    const data = await response.json()
    const candidate = data.candidates?.[0]
    const reply = candidate?.content?.parts?.find((p: any) => p.text)?.text || ""
    const toolCallsRaw = candidate?.content?.parts?.filter((p: any) => p.functionCall)

    // Normaliza toolCalls do Gemini para o formato OpenAI-like para o frontend
    const toolCalls = toolCallsRaw?.map((tc: any) => ({
        id: tc.functionCall.name + "_" + Date.now(),
        type: "function",
        function: {
            name: tc.functionCall.name,
            arguments: JSON.stringify(tc.functionCall.args)
        }
    }))

    const tokensUsed = data.usageMetadata?.totalTokenCount || 0

    return NextResponse.json({ reply, toolCalls, tokensUsed })
}
