"use client"

/**
 * =============================================
 *  MÓDULO IA — Painel de Chat Flutuante
 * =============================================
 * 
 * Componente global de chat com o assistente IA.
 * Acessível de qualquer tela da plataforma via
 * botão flutuante no canto inferior direito.
 * 
 * Estratégias de economia de tokens:
 *  - Envia apenas as últimas 6 mensagens como contexto
 *  - Não reenvia o system prompt no histórico (vai separado)
 *  - Respostas limitadas pelo backend (max_tokens: 500)
 */

import { useState, useRef, useEffect } from "react"
import { Bot, X, Send, Sparkles, AlertTriangle, Loader2, Trash2, Check, ExternalLink, Search, FilePlus, ShoppingCart, Paperclip, ImageIcon, ArrowRight, UserPlus, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAI } from "@/lib/ai-context"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getClientes, saveCliente } from "@/lib/actions/clientes"
import { getPedidos } from "@/lib/actions/pedidos"
import { getOrcamentos } from "@/lib/actions/orcamentos"

interface ChatMessage {
    role: "user" | "assistant"
    content: string
    timestamp: Date
    toolCalls?: any[] // Chamadas de ferramenta vindas da IA
}

// 🔒 ECONOMIA: Envia apenas as últimas N mensagens como contexto
const MAX_CONTEXT_MESSAGES = 6

export function AIChatPanel() {
    const router = useRouter()
    const pathname = usePathname()
    const { currentUser } = useAuth()
    const { config, usage, isActive, isConfigured, isLimitReached, history, addMessage, clearHistory, incrementUsage } = useAI()
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isExecutingAction, setIsExecutingAction] = useState<string | null>(null)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)

    // 🕵️ Visibilidade: Não mostra no login ou se não estiver logado
    const isVisible = isActive && pathname !== '/login' && !!currentUser

    const quickSuggestions = [
        "Existem pedidos atrasados?",
        "Como está a saúde dos meus clientes?",
        "Qual o ranking de desempenho dos vendedores?",
        "Analisar etiqueta anexada"
    ]
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Auto-scroll ao receber novas mensagens
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [history, isOpen])

    // Focus no input ao abrir
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 200)
        }
    }, [isOpen])

    // Escuta evento do sidebar para abrir/fechar o chat
    useEffect(() => {
        const handler = () => setIsOpen(prev => !prev)
        window.addEventListener('toggle-ai-chat', handler)
        return () => window.removeEventListener('toggle-ai-chat', handler)
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("A imagem deve ter no máximo 2MB para economia de tokens.")
                return
            }
            const reader = new FileReader()
            reader.onloadend = () => {
                setSelectedImage(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    // Não renderiza se o módulo está desativado ou na tela de login
    if (!isVisible) return null

    const handleSend = async () => {
        const trimmed = input.trim()
        if (!trimmed || isLoading || isLimitReached) return

        if (!isConfigured) {
            addMessage({ role: "user", content: trimmed })
            addMessage({ role: "assistant", content: "⚠️ Chave API não configurada. Acesse Configurações → Módulo IA e insira sua chave para começar a usar o assistente." })
            setInput("")
            return
        }

        const userMsg = { role: "user" as const, content: trimmed, image: selectedImage || undefined }
        addMessage(userMsg)
        setInput("")
        setIsLoading(true)

        try {
            // 🔒 ECONOMIA: Envia o histórico + a mensagem atual
            const contextMessages = [
                ...history.slice(-(MAX_CONTEXT_MESSAGES - 1)).map(m => ({ role: m.role, content: m.content })),
                { role: "user" as const, content: trimmed }
            ]

            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: contextMessages,
                    provider: config.provider,
                    apiKey: config.apiKey,
                    systemPrompt: config.systemPrompt, // Context is now injected server-side
                    includeTools: true,
                    image: selectedImage,
                }),
            })

            const data = await res.json()
            setSelectedImage(null) // Limpa imagem após envio

            if (!res.ok) {
                addMessage({
                    role: "assistant",
                    content: `⚠️ ${data.error || "Erro ao processar sua mensagem."}`,
                })
            } else {
                addMessage({
                    role: "assistant",
                    content: data.reply || (data.toolCalls ? "Preparei uma ação para você:" : ""),
                    toolCalls: data.toolCalls,
                })
                incrementUsage()
            }
        } catch {
            addMessage({
                role: "assistant",
                content: "⚠️ Erro de conexão com o servidor. Verifique sua internet e tente novamente.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const clearChat = () => {
        clearHistory()
    }

    // ── Execução de Ações (Tools) ───────────────────────────
    const executeAction = async (toolCall: any) => {
        const { name } = toolCall.function
        const args = JSON.parse(toolCall.function.arguments)

        setIsExecutingAction(toolCall.id)

        try {
            if (name === 'gerar_orcamento') {
                const params = new URLSearchParams({
                    cliente: args.cliente || '',
                    itens: args.itens || '',
                    obs: args.observacoes || ''
                })
                router.push(`/orcamentos/novo?${params.toString()}`)
                addMessage({
                    role: "assistant",
                    content: `Abrindo tela de novo orçamento para **${args.cliente}**...`,
                })
            }
            else if (name === 'abrir_pedido') {
                router.push(`/pedidos?novo=true&cliente=${encodeURIComponent(args.cliente || '')}`)
                addMessage({
                    role: "assistant",
                    content: `Direcionando para abertura de pedido do cliente **${args.cliente}**...`,
                })
            }
            else if (name === 'buscar_cnpj') {
                addMessage({
                    role: "assistant",
                    content: `Buscando dados do CNPJ **${args.cnpj}** na BrasilAPI...`,
                })

                // Simulação de busca (integração real seria via server action ou nova API route)
                const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${args.cnpj.replace(/\D/g, '')}`)
                if (res.ok) {
                    const cnpjData = await res.json()
                    addMessage({
                        role: "assistant",
                        content: `Empresa encontrada: **${cnpjData.razao_social}**\nEndereço: ${cnpjData.logradouro}, ${cnpjData.numero} - ${cnpjData.municipio}/${cnpjData.uf}`,
                    })

                    // 💡 PROATIVIDADE: Oferece o botão de cadastro já preenchido
                    addMessage({
                        role: "assistant",
                        content: `Deseja abrir a ficha de cadastro completa para **${cnpjData.razao_social}**?`,
                        toolCalls: [{
                            id: 'auto_reg_' + Date.now(),
                            type: 'function',
                            function: {
                                name: 'cadastrar_cliente',
                                arguments: JSON.stringify({
                                    razao_social: cnpjData.razao_social,
                                    cnpj: args.cnpj,
                                    email: cnpjData.email,
                                    telefone: cnpjData.ddd_telefone_1,
                                    cep: cnpjData.cep,
                                    endereco: cnpjData.logradouro,
                                    numero: cnpjData.numero,
                                    cidade: cnpjData.municipio,
                                    estado: cnpjData.uf
                                })
                            }
                        }]
                    })
                } else {
                    addMessage({
                        role: "assistant",
                        content: "⚠️ Não consegui encontrar os dados deste CNPJ.",
                    })
                }
            }
            else if (name === 'cadastrar_cliente') {
                const params = new URLSearchParams({
                    razao: args.razao_social || '',
                    cnpj: args.cnpj || '',
                    email: args.email || '',
                    tel: args.telefone || '',
                    cep: args.cep || '',
                    end: args.endereco || '',
                    num: args.numero || '',
                    cid: args.cidade || '',
                    uf: args.estado || ''
                })
                router.push(`/clientes/novo?${params.toString()}`)
                addMessage({
                    role: "assistant",
                    content: args.razao_social
                        ? `Abrindo formulário de cadastro para **${args.razao_social}**...`
                        : `Abrindo formulário de cadastro para o CNPJ **${args.cnpj}**...`,
                })
            }
            else if (name === 'analisar_desempenho') {
                // Para desempenho, a IA já tem o contexto. 
                // Apenas confirmamos a ação para que a IA gere o texto baseado no resumo.
                addMessage({
                    role: "assistant",
                    content: `Gerando relatório de desempenho ${args.periodo || 'atual'}...`,
                })
                // Opcional: Redirecionar para um dashboard se quiser
            }
            else if (name === 'consultar_clientes') {
                const clientes = await getClientes()
                const filtrados = args.termo ? clientes.filter(c => c.razaoSocial.toLowerCase().includes(args.termo.toLowerCase()) || (c.cnpj && c.cnpj.includes(args.termo))) : clientes.slice(0, 5)
                
                let resposta = args.termo ? `Resultado da busca por "${args.termo}":\n\n` : `Últimos clientes cadastrados:\n\n`
                if (filtrados.length === 0) {
                    resposta = `Nenhum cliente encontrado com o termo "${args.termo}".`
                } else {
                    filtrados.forEach(c => {
                        resposta += `🏢 **${c.razaoSocial}**\nCNPJ: ${c.cnpj || 'ND'}\nContato: ${c.telefone || 'N/A'}\nStatus: ${c.ativo ? '🟢 Ativo' : '🔴 Inativo'}\n---\n`
                    })
                }

                addMessage({
                    role: "assistant",
                    content: resposta,
                })
            }
            else if (name === 'inserir_cliente') {
                try {
                    const novoCliente = await saveCliente({
                        razaoSocial: args.razao_social,
                        cnpj: args.cnpj,
                        email: args.email || "",
                        telefone: args.telefone || "",
                        ativo: true
                    })
                    addMessage({
                        role: "assistant",
                        content: `✅ Cliente **${args.razao_social}** inserido com sucesso direto no banco de dados! O ID oficial dele agora é **${novoCliente.id}**.`,
                    })
                } catch(e) {
                    addMessage({
                        role: "assistant",
                        content: `❌ Houve um erro ao gravar no banco do sistema. Detalhes: ${(e as Error).message}`,
                    })
                }
            }
            else if (name === 'consultar_pedidos') {
                let pedidos = await getPedidos()
                if (args.status) {
                    pedidos = pedidos.filter(p => p.status?.toLowerCase() === args.status.toLowerCase() || p.statusObj?.nome.toLowerCase().includes(args.status.toLowerCase()))
                }
                const topPedidos = pedidos.slice(0, 3)

                let resposta = `Últimos pedidos encontrados${args.status ? ' (filtro: ' + args.status + ')' : ''}:\n\n`
                if (topPedidos.length === 0) {
                    resposta = `Sem resultados detectados na base.`
                } else {
                    topPedidos.forEach(p => {
                        resposta += `📦 **${p.numero}** | R$ ${p.totalGeral}\nCliente: ${p.cliente?.razaoSocial || 'ND'}\nStatus: ${p.statusObj?.nome || 'ND'}\nCriado Em: ${new Date(p.criadoEm).toLocaleDateString()}\n---\n`
                    })
                }

                addMessage({
                    role: "assistant",
                    content: resposta,
                })
            }
            else if (name === 'consultar_orcamentos') {
                const orcs = await getOrcamentos()
                const topOrcs = orcs.slice(0, 3) 

                let resposta = `Últimos orçamentos emitidos:\n\n`
                if (topOrcs.length === 0) {
                    resposta = `Nenhum orçamento encontrado.`
                } else {
                    topOrcs.forEach(o => {
                        resposta += `📄 **${o.numero}** | R$ ${o.totalGeral}\nCliente: ${o.cliente?.razaoSocial}\nCriado em: ${new Date(o.criadoEm).toLocaleDateString()}\n---\n`
                    })
                }

                addMessage({
                    role: "assistant",
                    content: resposta,
                })
            }
        } catch (error) {
            console.error("Erro ao executar ação:", error)
        } finally {
            setIsExecutingAction(null)
        }
    }

    // Componente de Card de Ação
    const ActionCard = ({ toolCall }: { toolCall: any }) => {
        const { name } = toolCall.function
        const args = JSON.parse(toolCall.function.arguments)
        const isExecuting = isExecutingAction === toolCall.id

        const actionConfigs: any = {
            gerar_orcamento: {
                title: "Gerar Orçamento",
                icon: <FilePlus className="size-4" />,
                color: "bg-blue-500",
                description: `Criar orçamento para ${args.cliente}`
            },
            abrir_pedido: {
                title: "Abrir Pedido",
                icon: <ShoppingCart className="size-4" />,
                color: "bg-emerald-500",
                description: `Pedido de R$ ${args.valor_total || '---'} para ${args.cliente}`
            },
            buscar_cnpj: {
                title: "Consultar CNPJ",
                icon: <Search className="size-4" />,
                color: "bg-violet-500",
                description: `Buscar dados do CNPJ ${args.cnpj}`
            },
            cadastrar_cliente: {
                title: "Cadastrar Cliente",
                icon: <UserPlus className="size-4" />,
                color: "bg-indigo-600",
                description: `Criar ficha cadastral para ${args.razao_social}`
            },
            analisar_desempenho: {
                title: "Análise de Desempenho",
                icon: <BarChart3 className="size-4" />,
                color: "bg-orange-500",
                description: `Relatório de desempenho: ${args.periodo || 'Período Atual'}`
            },
            consultar_clientes: {
                title: "Consultar DB: Clientes",
                icon: <Search className="size-4" />,
                color: "bg-blue-600",
                description: `Buscar cliente: ${args.termo || 'Todos'}`
            },
            inserir_cliente: {
                title: "Inserção Direta: Cliente",
                icon: <UserPlus className="size-4" />,
                color: "bg-indigo-600",
                description: `Gravar no DB: ${args.razao_social}`
            },
            consultar_pedidos: {
                title: "Consultar DB: Pedidos",
                icon: <Search className="size-4" />,
                color: "bg-emerald-600",
                description: `Pesquisar Base de Produção`
            },
            consultar_orcamentos: {
                title: "Consultar DB: Orçamentos",
                icon: <Search className="size-4" />,
                color: "bg-cyan-600",
                description: `Pesquisar histórico comercial`
            }
        }

        const config = actionConfigs[name] || {
            title: "Ação sugerida",
            icon: <ExternalLink className="size-4" />,
            color: "bg-primary",
            description: name
        }

        return (
            <div className="mt-2 rounded-xl border border-border/50 bg-background shadow-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className={`px-3 py-2 flex items-center gap-2 text-white text-xs font-semibold ${config.color}`}>
                    {config.icon}
                    {config.title}
                </div>
                <div className="p-3 text-sm">
                    <p className="text-muted-foreground text-xs mb-3">{config.description}</p>
                    <Button
                        size="sm"
                        className="w-full h-8 gap-2 text-xs"
                        onClick={() => executeAction(toolCall)}
                        disabled={isExecuting}
                    >
                        {isExecuting ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                        Confirmar Ação
                    </Button>
                </div>
            </div>
        )
    }

    const usagePercent = config.monthlyLimit > 0
        ? Math.min(100, Math.round((usage.count / config.monthlyLimit) * 100))
        : 0

    const providerLabel = config.provider === "gpt-4o-mini" ? "GPT-4o Mini" : "Gemini Flash"

    return (
        <>
            {/* ── Botão Flutuante ──────────────────────────── */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 flex items-center justify-center size-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 group"
                    title="Assistente IA Newflexo"
                >
                    <Sparkles className="size-6 group-hover:rotate-12 transition-transform" />
                    {/* Badge de IA */}
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow-sm">
                        IA
                    </span>
                </button>
            )}

            {/* ── Painel de Chat ───────────────────────────── */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[600px] flex flex-col rounded-2xl border border-border/50 bg-background shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground border-b border-primary/20">
                        <div className="flex items-center gap-2">
                            <Bot className="size-5" />
                            <div>
                                <h3 className="text-sm font-semibold">Assistente IA</h3>
                                <p className="text-[10px] opacity-80">{providerLabel} • {usage.count}/{config.monthlyLimit} interações</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={clearChat} className="p-1.5 rounded-md hover:bg-white/20 transition-colors" title="Limpar conversa">
                                <Trash2 className="size-4" />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-md hover:bg-white/20 transition-colors" title="Fechar">
                                <X className="size-4" />
                            </button>
                        </div>
                    </div>

                    {/* Barra de uso */}
                    <div className="h-1 bg-muted">
                        <div
                            className={`h-full transition-all duration-500 ${usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>

                    {/* Corpo do Chat */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[420px]">
                        {/* Mensagem de boas-vindas e Sugestões */}
                        {history.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
                                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                                    <Sparkles className="size-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">Assistente Newflexo</p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                                        Como posso te ajudar com a gestão da sua gráfica hoje?
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 w-full mt-4">
                                    {quickSuggestions.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                                            className="text-left text-xs px-3 py-2.5 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all border border-border/50 flex items-center justify-between group"
                                        >
                                            {suggestion}
                                            <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mensagens */}
                        {history.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === "user"
                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                        : "bg-muted text-foreground rounded-bl-md border border-border/50"
                                        }`}
                                >
                                    {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                                    {/* Arte anexada no histórico */}
                                    {msg.image && (
                                        <div className="mt-2 rounded overflow-hidden border border-white/20">
                                            <img src={msg.image} alt="Anexo" className="max-h-48 w-full object-contain bg-black/5" />
                                        </div>
                                    )}

                                    {/* Renderização de Tools/Actions */}
                                    {msg.toolCalls?.map((toolCall: any) => (
                                        <ActionCard key={toolCall.id} toolCall={toolCall} />
                                    ))}

                                    <p className={`text-[9px] mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Indicador de digitando */}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 border border-border/50">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="size-3.5 animate-spin" />
                                        <span>Pensando...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bloqueio de cota */}
                    {isLimitReached && (
                        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 flex items-center gap-2">
                            <AlertTriangle className="size-4 text-destructive shrink-0" />
                            <p className="text-xs text-destructive font-medium">
                                Cota mensal atingida ({config.monthlyLimit} interações). A cota será renovada no próximo mês.
                            </p>
                        </div>
                    )}

                    {/* Preview da Imagem */}
                    {selectedImage && (
                        <div className="px-4 py-2 bg-muted/50 border-t border-border/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="size-8 rounded border border-border overflow-hidden bg-background">
                                    <img src={selectedImage} alt="Preview" className="size-full object-cover" />
                                </div>
                                <span className="text-[10px] text-muted-foreground italic">Imagem pronta para análise</span>
                            </div>
                            <button onClick={() => setSelectedImage(null)} className="p-1 hover:text-destructive transition-colors">
                                <X className="size-3" />
                            </button>
                        </div>
                    )}

                    {/* Input */}
                    <div className="border-t border-border/50 p-3 bg-muted/30">
                        <div className="flex items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLimitReached || isLoading}
                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50"
                                title="Anexar imagem de arte/etiqueta"
                            >
                                <Paperclip className="size-4" />
                            </button>
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={isLimitReached ? "Cota atingida..." : "Digite sua mensagem..."}
                                disabled={isLimitReached || isLoading}
                                className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                            />
                            <Button
                                size="sm"
                                onClick={handleSend}
                                disabled={(!input.trim() && !selectedImage) || isLoading || isLimitReached}
                                className="h-9 w-9 p-0 shrink-0"
                            >
                                <Send className="size-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
