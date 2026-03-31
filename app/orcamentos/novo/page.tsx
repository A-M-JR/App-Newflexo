"use client"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ArrowLeft, Plus, Trash2, RotateCcw, ChevronDown, Tag, Sparkles, Building2, MapPin, Calculator, UserCircle, Save, Check } from "lucide-react"
import { etiquetas, formatCurrency } from "@/lib/mock-data"
import { getClientes } from "@/lib/actions/clientes"
import { getVendedores } from "@/lib/actions/vendedores"
import { getOrcamentos, saveOrcamento } from "@/lib/actions/orcamentos"
import { getEtiquetas } from "@/lib/actions/etiquetas"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

interface NovoItem {
  id: string
  descricao: string
  quantidade: number | string
  unidade: string
  precoUnitario: number | string
  observacao: string
}

export default function NovoOrcamentoPage() {
  return (
    <AppShell>
      <Suspense fallback={<div>Carregando...</div>}>
        <NovoOrcamentoContent />
      </Suspense>
    </AppShell>
  )
}

function NovoOrcamentoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentUser } = useAuth()

  const [clienteId, setClienteId] = useState<number | "">("")
  const [vendedorId, setVendedorId] = useState<number | "">("")
  const [itens, setItens] = useState<NovoItem[]>([])
  const [observacoes, setObservacoes] = useState("")
  const [showRecompra, setShowRecompra] = useState(false)
  const [openCatalogo, setOpenCatalogo] = useState(false)

  const [clientes, setClientes] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [todosOrcamentos, setTodosOrcamentos] = useState<any[]>([])
  const [etiquetasList, setEtiquetasList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    Promise.all([getClientes({ limit: 1000 }), getVendedores(), getOrcamentos({ limit: 50 }), getEtiquetas()]).then(([cls, vds, orcs, etqs]) => {
      setClientes(cls.data || [])
      setVendedores(vds)
      setTodosOrcamentos(orcs.data || [])
      setEtiquetasList(etqs)
      setLoading(false)
    })
  }, [])

  // Auto-seleção do vendedor logado
  useEffect(() => {
    if (currentUser?.vendedorId && !vendedorId) {
      setVendedorId(currentUser.vendedorId)
    }
  }, [currentUser])

  // 🤖 Automação via IA: Preenchimento proativo baseado na URL
  useEffect(() => {
    const aiCliente = searchParams.get("cliente")
    const aiItens = searchParams.get("itens")
    const aiObs = searchParams.get("obs")

    if (aiCliente && clientes.length > 0) {
      // Busca inteligente: tenta encontrar o cliente mais próximo por nome
      const match = clientes.find(c =>
        c.razaoSocial.toLowerCase().includes(aiCliente.toLowerCase())
      )
      if (match) {
        handleClienteChange(match.id.toString())
      }
    }

    if (aiItens && itens.length === 0) {
      // Converte a descrição da IA em um item inicial
      setItens([{
        id: "ai-item-1",
        descricao: aiItens,
        quantidade: 1,
        unidade: "unid",
        precoUnitario: 0,
        observacao: "Item sugerido pela IA"
      }])
    }

    if (aiObs) {
      setObservacoes(aiObs)
    }

    if (aiCliente || aiItens || aiObs) {
      toast.info("Orçamento pré-montado pelo Assistente IA", {
        description: "Revise os dados antes de salvar."
      })
    }
  }, [searchParams, clientes])

  const clienteSelecionado = clientes.find((c) => c.id === clienteId)
  const historicoOrcamentos = clienteId ? todosOrcamentos.filter(o => o.clienteId === clienteId) : []
  const itensAnteriores = historicoOrcamentos.flatMap((o) => o.itens || [])

  // Auto-expand repurchase section when customer with history is selected
  const handleClienteChange = (id: string) => {
    const numId = Number(id)
    setClienteId(numId)
    const hasHistory = todosOrcamentos.filter(o => o.clienteId === numId).length > 0
    setShowRecompra(hasHistory)
  }

  // Sugestões de Etiquetas para o Cliente Selecionado
  const etiquetasSugeridas = clienteId ? etiquetasList.filter(e => e.clientesIds?.includes(Number(clienteId))) : []

  function adicionarItem() {
    setItens([...itens, { id: Math.random().toString(36).substr(2, 9), descricao: "", quantidade: 1, unidade: "unid", precoUnitario: "", observacao: "" }])
  }

  function removerItem(id: string) {
    setItens(itens.filter(i => i.id !== id))
  }

  function atualizarItem(id: string, field: keyof NovoItem, value: string | number) {
    setItens(itens.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  function adicionarRecompra(descricao: string, precoUnitario: number | string) {
    setItens([...itens, { id: Math.random().toString(36).substr(2, 9), descricao, quantidade: 1, unidade: "unid", precoUnitario, observacao: "" }])
    setShowRecompra(false)
    toast.success("Item de recompra adicionado!")
  }

  function adicionarEtiquetaCatalogo(etqId: string) {
    const etq = etiquetasList.find((e) => e.id === Number(etqId))
    if (!etq) return
    const descricao = `${etq.nome} \nRef: ${etq.codigo} | Medida: ${etq.largura}x${etq.altura}mm | Mat: ${etq.material} | Cores: ${etq.numeroCores} | Tubete: ${etq.tipoTubete}`
    setItens([...itens, { 
      id: Math.random().toString(36).substr(2, 9), 
      descricao, 
      quantidade: 1, 
      unidade: "unid", 
      precoUnitario: etq.preco || "", 
      observacao: "" 
    }])
    toast.success("Etiqueta adicionada ao orçamento!")
    setOpenCatalogo(false)
  }

  const totalGeral = itens.reduce((sum, item) => {
    const qtd = typeof item.quantidade === 'string' ? parseFloat(item.quantidade.replace(',','.')) || 0 : item.quantidade
    const preco = typeof item.precoUnitario === 'string' ? parseFloat(item.precoUnitario.replace(',','.')) || 0 : item.precoUnitario
    return sum + qtd * preco
  }, 0)

  async function handleSalvar() {
    if (isSaving) return
    if (!clienteId) {
      toast.error("Selecione um cliente.")
      return
    }
    if (!vendedorId) {
      toast.error("Selecione o vendedor responsável.")
      return
    }
    if (itens.length === 0) {
      toast.error("Adicione pelo menos um item.")
      return
    }
    
    setIsSaving(true)
    try {
      await saveOrcamento({
        clienteId,
        vendedorId,
        observacoes,
        totalGeral
      }, itens)

      toast.success("Orcamento salvo com sucesso!", {
        description: `Total: ${formatCurrency(totalGeral)}`,
      })
      router.push("/orcamentos")
    } catch (error) {
      console.error(error)
      toast.error("Falha ao salvar orçamento no banco de dados.")
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center py-20 animate-pulse text-muted-foreground">Carregando formulário...</div>
  }

  return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link href="/orcamentos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Novo Orcamento</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Crie um novo orcamento para um cliente
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Dados do Cliente (6 Colunas) */}
          <Card className="lg:col-span-6 border-border/50 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                DADOS DO CLIENTE
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label>Selecionar Cliente *</Label>
                  <Select value={clienteId?.toString()} onValueChange={handleClienteChange}>
                    <SelectTrigger className="mt-1.5 h-10 bg-muted/30">
                      <SelectValue placeholder="Busque ou selecione um cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.razaoSocial}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {clienteId && itensAnteriores.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowRecompra(!showRecompra)}
                    className="shrink-0 h-10"
                  >
                    <RotateCcw className="size-4 mr-2" />
                    Histórico ({itensAnteriores.length})
                  </Button>
                )}
              </div>

              {clienteSelecionado && (
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-base font-semibold text-foreground leading-tight">
                    {clienteSelecionado.razaoSocial}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <p className="font-mono">CNPJ: {clienteSelecionado.cnpj}</p>
                    <p className="flex items-center gap-1">
                      <MapPin className="size-3 text-primary" />
                      {clienteSelecionado.endereco}, {clienteSelecionado.cidade}/{clienteSelecionado.estado}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados do Vendedor (6 Colunas) */}
          <Card className="lg:col-span-6 border-border/50 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCircle className="size-4 text-primary" />
                VENDEDOR RESPONSÁVEL
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Vendedor Responsável *</Label>
                <Select value={vendedorId?.toString()} onValueChange={(val) => setVendedorId(Number(val))}>
                  <SelectTrigger className="h-10 bg-muted/30">
                    <SelectValue placeholder="Selecione o vendedor responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map((v) => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        {v.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {vendedorId && (
                <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Comissão e Região</p>
                  <p className="text-sm font-medium text-foreground">
                    {vendedores.find(v => v.id === Number(vendedorId))?.regiao} • {vendedores.find(v => v.id === Number(vendedorId))?.comissao}% de comissão fixa
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Seção Sugestões de Etiquetas do Cliente */}
        {etiquetasSugeridas.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-amber-500" />
              <h3 className="text-sm font-bold text-foreground">Matrizes Exclusivas Deste Cliente</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {etiquetasSugeridas.map(etq => (
                <div
                  key={etq.id}
                  onClick={() => adicionarEtiquetaCatalogo(etq.id.toString())}
                  className="min-w-[280px] max-w-[280px] border border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 rounded-lg p-3 cursor-pointer transition-all shadow-sm group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm text-amber-900 dark:text-amber-400 group-hover:underline truncate pr-2">
                      {etq.nome}
                    </span>
                    <Badge variant="outline" className="text-[9px] bg-background shrink-0 border-amber-200">{etq.codigo}</Badge>
                  </div>
                  <p className="text-xs text-amber-700/80 dark:text-amber-500/80 line-clamp-1 mb-2">
                    {etq.material} | {etq.largura}x{etq.altura}mm | {etq.numeroCores} Cor(es)
                  </p>
                  <Button variant="secondary" size="sm" className="w-full h-7 text-[10px] bg-amber-200/50 hover:bg-amber-300/50 text-amber-800 dark:bg-amber-800/50 dark:text-amber-200">
                    <Plus className="size-3 mr-1" /> Adicionar ao Orçamento
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico de Recompra (Full Width se aberto) */}
        {showRecompra && itensAnteriores.length > 0 && (
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-4">
              <RotateCcw className="size-4 text-primary" />
              <p className="text-sm font-bold text-foreground">Itens de Pedidos Anteriores (Recompra Rápida)</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2">
              {itensAnteriores.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-md border border-primary/20 bg-background/80 p-3 hover:bg-background hover:border-primary/50 transition-all cursor-pointer shadow-sm group"
                  onClick={() => adicionarRecompra(item.descricao, item.precoUnitario)}
                >
                  <span className="text-xs text-foreground line-clamp-2 font-medium mb-2 group-hover:text-primary transition-colors">
                    {item.descricao}
                  </span>
                  <div className="flex justify-between items-center mt-auto">
                    <span className="text-[10px] text-muted-foreground uppercase">Adicionar</span>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {formatCurrency(item.precoUnitario)}/{item.unidade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="size-4 text-primary" />
                Itens e Produtos
              </CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Popover open={openCatalogo} onOpenChange={setOpenCatalogo}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCatalogo}
                      className="w-full sm:w-[250px] h-9 text-xs justify-between bg-background font-normal"
                    >
                      Pesquisar catálogo geral...
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Buscar etiqueta (cód ou nome)..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma etiqueta encontrada.</CommandEmpty>
                        <CommandGroup>
                          {etiquetasList.map((etq) => (
                            <CommandItem
                              key={etq.id}
                              value={`${etq.codigo} ${etq.nome}`}
                              onSelect={() => adicionarEtiquetaCatalogo(etq.id.toString())}
                            >
                              {etq.codigo} - {etq.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button variant="default" size="sm" onClick={adicionarItem} className="h-9 shrink-0">
                  <Plus className="size-4 mr-1" />
                  Item Avulso
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 bg-muted/5">
            {itens.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-border/60 rounded-xl bg-background">
                <Tag className="size-8 opacity-20 mb-3" />
                <p className="text-sm font-medium">Nenhum produto adicionado.</p>
                <p className="text-xs opacity-70 mt-1">Selecione uma matriz acima ou adicione um item avulso.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {itens.map((item, idx) => (
                  <div key={item.id} className="relative rounded-xl border border-border/60 bg-card p-5 pt-8 sm:pt-5 shadow-sm group animate-in fade-in slide-in-from-bottom-2">

                    <div className="absolute -top-3 -left-3 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-md border-4 border-background">
                      {idx + 1}
                    </div>

                    <div className="flex justify-end mb-2 absolute top-4 right-4 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => removerItem(item.id)} className="size-8 hover:bg-destructive/10 hover:text-destructive text-muted-foreground">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-2">
                      <div className="md:col-span-12">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Descrição do Produto</Label>
                        <Textarea
                          rows={2}
                          value={item.descricao}
                          onChange={(e) => atualizarItem(item.id, "descricao", e.target.value)}
                          className="bg-muted/10 font-medium resize-none border-border/50 focus-visible:ring-primary/50 text-sm py-3"
                          placeholder="Ex: Etiqueta BOPP 100x50mm..."
                        />
                      </div>

                      <div className="md:col-span-3">
                        <Label className="text-xs font-semibold mb-1 block">Quantidade</Label>
                        <Input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => atualizarItem(item.id, "quantidade", e.target.value)}
                          className="bg-muted/20"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <Label className="text-xs font-semibold mb-1 block">Unidade</Label>
                        <Input
                          value={item.unidade}
                          onChange={(e) => atualizarItem(item.id, "unidade", e.target.value)}
                          className="bg-muted/20"
                          placeholder="Ex: Milheiro, Rolo..."
                        />
                      </div>

                      <div className="md:col-span-3">
                        <Label className="text-xs font-semibold mb-1 block">Valor Unitário (R$)</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={item.precoUnitario}
                          onChange={(e) => atualizarItem(item.id, "precoUnitario", e.target.value)}
                          className="bg-muted/20 font-mono"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <Label className="text-xs font-semibold text-primary mb-1 block">Subtotal</Label>
                        <div className="flex h-10 items-center justify-end rounded-md bg-primary/10 px-3 text-lg font-bold text-primary border border-primary/20">
                          {formatCurrency(
                            (typeof item.quantidade === 'string' ? parseFloat(item.quantidade.replace(',','.')) || 0 : item.quantidade) * 
                            (typeof item.precoUnitario === 'string' ? parseFloat(item.precoUnitario.replace(',','.')) || 0 : item.precoUnitario)
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-12">
                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase mb-1 block">Observações do Item (Opcional)</Label>
                        <Input
                          value={item.observacao}
                          onChange={(e) => atualizarItem(item.id, "observacao", e.target.value)}
                          className="bg-muted/10 h-8 text-xs border-dashed border-border/60"
                          placeholder="Ex: Adicionar tratamento corona, refile especial..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/50 shadow-sm">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-3">
              <CardTitle className="text-base text-foreground font-semibold">Condições Gerais e Observações</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                rows={4}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Condição de pagamento 30/60 dias. Validade da proposta: 15 dias. Frete FOB..."
                className="bg-muted/10 border-border/50 resize-none font-medium h-full"
              />
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md bg-gradient-to-b from-card to-muted/20 border-t-4 border-t-primary">
            <CardContent className="p-6 flex flex-col h-full justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                  <Calculator className="size-5" />
                  <h3 className="font-semibold text-sm uppercase tracking-wider">Resumo do Pedido</h3>
                </div>

                <div className="space-y-3 pb-4 border-b border-border/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantidade de Itens</span>
                    <span className="font-medium bg-muted/50 px-2 rounded">{itens.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal Base</span>
                    <span className="font-medium">{formatCurrency(totalGeral)}</span>
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold mb-1">Total Geral Aprovado</p>
                  <p className="text-4xl font-black text-primary truncate">{formatCurrency(totalGeral)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-auto">
                <Button onClick={handleSalvar} disabled={isSaving} className="w-full h-12 text-base font-bold shadow-sm" size="lg">
                  {isSaving ? "Gerando..." : "Salvar e Gerar Proposta"}
                </Button>
                <Link href="/orcamentos" className="w-full">
                  <Button variant="outline" className="w-full border-border/50 hover:bg-muted/50">Cancelar Envio</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div >
  )
}
