"use client"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, ArrowRight, FileDown, AlertTriangle, CheckCircle2, Circle, Truck, Package, Settings, MessageSquare, Plus, CreditCard, Trash2, Edit, Save } from "lucide-react"
import { formatCurrency } from "@/lib/mock-data"
import { formatDateBR } from "@/lib/utils"
import { parseDecimalBR } from "@/lib/masks"
import { NumeroBRInput } from "@/components/ui/numero-br-input"
import { UnidadeSelect } from "@/components/ui/unidade-select"
import { StatusBadge } from "@/components/ui/status-badge"
import { getPedidoById, updatePedidoStatus, cancelarPedido, savePedido } from "@/lib/actions/pedidos"
import { useAuth } from "@/lib/auth-context"
import { clearDataCache } from "@/hooks/use-data-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { use, useState, useEffect } from "react"
import { PDFDownloadButton } from "@/components/pdf-download-button"
import { PDFProductionOrderButton } from "@/components/pdf-production-order-button"
import { toast } from "sonner"
import type { Pedido, Cliente, Vendedor } from "@/lib/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { currentUser, isLoading: authLoading } = useAuth()
  
  const [pedido, setPedido] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentStatus, setCurrentStatus] = useState<Pedido['status']>('em_analise')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  // --- Edição do pedido ---
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formasPagamento, setFormasPagamento] = useState<any[]>([])
  const [editItens, setEditItens] = useState<any[]>([])
  const [editPrazo, setEditPrazo] = useState("")
  const [editFormaPagamentoId, setEditFormaPagamentoId] = useState("")
  const [editOcCliente, setEditOcCliente] = useState("")
  const [editFrete, setEditFrete] = useState("")
  const [editSentido, setEditSentido] = useState("")
  const [editTubete, setEditTubete] = useState("")
  const [editGap, setEditGap] = useState("")
  const [editPistas, setEditPistas] = useState<number | string>(1)
  const [editObsGerais, setEditObsGerais] = useState("")
  const [editObsEmbalagem, setEditObsEmbalagem] = useState("")
  const [editObsFaturamento, setEditObsFaturamento] = useState("")

  // Cadastro rápido de forma de pagamento (sem sair da edição do pedido)
  const [openNovaForma, setOpenNovaForma] = useState(false)
  const [novaFormaNome, setNovaFormaNome] = useState("")
  const [novaFormaParcelas, setNovaFormaParcelas] = useState(1)
  const [savingForma, setSavingForma] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!currentUser) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    getPedidoById(Number(id), currentUser.id)
      .then(data => {
        if (cancelled) return
        setPedido(data)
        if (data) setCurrentStatus(data.status as Pedido['status'])
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setPedido(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [id, currentUser?.id, authLoading])

  useEffect(() => {
    fetch("/api/formas-pagamento")
      .then(res => res.json())
      .then(data => setFormasPagamento(Array.isArray(data) ? data : []))
      .catch(() => setFormasPagamento([]))
  }, [])

  if (loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground animate-pulse">Carregando detalhes do pedido...</p>
        </div>
      </AppShell>
    )
  }

  if (!pedido) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Pedido nao encontrado.</p>
          <Link href="/pedidos">
            <Button variant="outline" className="mt-4">Voltar</Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  const cliente = pedido.cliente
  const vendedor = pedido.vendedor

  // Status mapping for the visual steps
  const steps = [
    { id: 'enviado', label: 'Em Análise', icon: Settings, nextId: 'em_producao', nextLabel: 'Iniciar Produção', prevId: null, prevLabel: null },
    { id: 'em_producao', label: 'Em Produção', icon: Package, nextId: 'separacao', nextLabel: 'Enviar p/ Separação', prevId: 'enviado', prevLabel: 'Voltar p/ Análise' },
    { id: 'separacao', label: 'Separação', icon: Package, nextId: 'entregue', nextLabel: 'Marcar Entregue', prevId: 'em_producao', prevLabel: 'Voltar p/ Produção' },
    { id: 'entregue', label: 'Entregue / Faturado', icon: Truck, nextId: null, nextLabel: null, prevId: 'separacao', prevLabel: 'Voltar p/ Separação' },
  ]

  // Mock function to determine active step based on status
  const getStepIndex = (status: string) => {
    switch (status) {
      case 'rascunho':
      case 'enviado':
      case 'aprovado':
        return 0; // Em análise
      case 'em_producao':
        return 1; // Em produção
      case 'separacao':
      case 'faturado':
        return 2;
      case 'entregue':
        return 3;
      default:
        return 1; // Fallback to producao
    }
  }

  const currentStepIndex = getStepIndex(currentStatus)

  const handleAdvanceStatus = async () => {
    const nextStep = steps[currentStepIndex].nextId;
    if (nextStep) {
      setIsUpdatingStatus(true)
      try {
        const updated = await updatePedidoStatus(pedido.id, nextStep)
        setPedido(updated)
        setCurrentStatus(nextStep as Pedido['status']);
        router.refresh()
        toast.success("Status Atualizado!", {
          description: `O pedido agora está na fase: ${steps[currentStepIndex + 1].label}`
        })
      } catch (err) {
        console.error(err)
        toast.error("Erro ao atualizar o status.")
      } finally {
        setIsUpdatingStatus(false)
      }
    }
  }

  const handleBackStatus = async () => {
    const prevStep = steps[currentStepIndex].prevId;
    if (prevStep) {
      setIsUpdatingStatus(true)
      try {
        const updated = await updatePedidoStatus(pedido.id, prevStep)
        setPedido(updated)
        setCurrentStatus(prevStep as Pedido['status']);
        router.refresh()
        toast.success("Status Revertido!", {
          description: `O pedido voltou para a fase: ${steps[currentStepIndex - 1].label}`
        })
      } catch (err) {
        console.error(err)
        toast.error("Erro ao reverter o status.")
      } finally {
        setIsUpdatingStatus(false)
      }
    }
  }

  const handleCancelarPedido = async () => {
    setIsUpdatingStatus(true)
    try {
      await cancelarPedido(pedido.id, currentUser?.id)
      setCancelOpen(false)
      // Invalida o cache em memória para a lista/orçamentos refletirem o cancelamento na hora.
      clearDataCache()
      toast.success("Pedido cancelado com sucesso.")
      router.push("/pedidos")
    } catch (err: any) {
      console.error("Erro ao cancelar pedido:", err)
      toast.error(err?.message || "Erro ao cancelar pedido.")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const parseNum = (v: any) =>
    parseDecimalBR(v)

  const iniciarEdicao = () => {
    setEditItens((pedido.itens || []).map((it: any) => ({
      id: it.id,
      etiquetaId: it.etiquetaId ?? null,
      descricao: it.descricao ?? "",
      quantidade: it.quantidade ?? 0,
      unidade: it.unidade ?? "",
      precoUnitario: it.precoUnitario ?? 0,
      observacao: it.observacao ?? "",
    })))
    setEditPrazo(pedido.prazoEntrega ? String(pedido.prazoEntrega).slice(0, 10) : "")
    setEditFormaPagamentoId(pedido.formaPagamentoId ? String(pedido.formaPagamentoId) : "")
    setEditOcCliente(pedido.ocCliente || "")
    setEditFrete(pedido.frete || "")
    setEditSentido(pedido.sentidoSaidaRolo || "")
    setEditTubete(pedido.tipoTubete || "")
    setEditGap(pedido.gapEntreEtiquetas || "")
    setEditPistas(pedido.numeroPistas ?? 1)
    setEditObsGerais(pedido.observacoesGerais || "")
    setEditObsEmbalagem(pedido.observacoesEmbalagem || "")
    setEditObsFaturamento(pedido.observacoesFaturamento || "")
    setIsEditing(true)
  }

  const atualizarItemEdit = (id: any, field: string, value: any) => {
    setEditItens(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it))
  }

  const removerItemEdit = (id: any) => {
    setEditItens(prev => prev.length <= 1 ? prev : prev.filter(it => it.id !== id))
  }

  const adicionarItemEdit = () => {
    setEditItens(prev => [...prev, {
      id: `novo-${Math.random().toString(36).slice(2, 9)}`,
      etiquetaId: null,
      descricao: "",
      quantidade: 1,
      unidade: "unid",
      precoUnitario: 0,
      observacao: "",
    }])
  }

  const editTotalGeral = editItens.reduce(
    (s, it) => s + parseNum(it.quantidade) * parseNum(it.precoUnitario), 0
  )

  const handleSalvarEdicao = async () => {
    if (isSaving) return
    if (editItens.length === 0) {
      toast.error("O pedido precisa ter pelo menos 1 item.")
      return
    }
    if (!editPrazo) {
      toast.error("Informe o prazo de entrega.")
      return
    }
    setIsSaving(true)
    try {
      await savePedido({
        id: pedido.id,
        numero: pedido.numero,
        orcamentoId: pedido.orcamentoId,
        clienteId: pedido.clienteId,
        vendedorId: pedido.vendedorId,
        statusId: pedido.statusId,
        nomeVendedor: pedido.nomeVendedor,
        nomeComprador: pedido.nomeComprador,
        formaPagamento: pedido.formaPagamento,
        formaPagamentoId: editFormaPagamentoId ? Number(editFormaPagamentoId) : null,
        prazoEntrega: editPrazo || null,
        ocCliente: editOcCliente || null,
        frete: editFrete,
        sentidoSaidaRolo: editSentido,
        tipoTubete: editTubete,
        gapEntreEtiquetas: editGap,
        numeroPistas: Number(editPistas) || 1,
        observacoesGerais: editObsGerais,
        observacoesEmbalagem: editObsEmbalagem,
        observacoesFaturamento: editObsFaturamento,
        totalGeral: editTotalGeral,
        itens: editItens.map(it => ({
          id: typeof it.id === 'number' ? it.id : undefined,
          etiquetaId: it.etiquetaId ?? null,
          descricao: it.descricao,
          quantidade: parseNum(it.quantidade),
          unidade: it.unidade,
          precoUnitario: parseNum(it.precoUnitario),
          total: parseNum(it.quantidade) * parseNum(it.precoUnitario),
          observacao: it.observacao || "",
        })),
      }, currentUser?.id)

      const refreshed = await getPedidoById(Number(id), currentUser?.id)
      if (refreshed) {
        setPedido(refreshed)
        setCurrentStatus(refreshed.status as Pedido['status'])
      }
      clearDataCache()
      setIsEditing(false)
      toast.success("Pedido atualizado com sucesso!")
    } catch (err: any) {
      console.error("Erro ao salvar pedido:", err)
      toast.error(err?.message || "Erro ao salvar as alterações.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCriarFormaPagamento = async () => {
    if (!novaFormaNome.trim()) {
      toast.error("Informe o nome da forma de pagamento.")
      return
    }
    setSavingForma(true)
    try {
      const res = await fetch("/api/formas-pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novaFormaNome.trim(),
          quantidadeParcelas: Number(novaFormaParcelas) || 1,
          ativo: true,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.details || err?.error || "Falha ao salvar a forma de pagamento.")
      }
      const created = await res.json()
      setFormasPagamento(prev =>
        [...prev, created].sort((a: any, b: any) => a.nome.localeCompare(b.nome))
      )
      setEditFormaPagamentoId(created.id.toString())
      toast.success("Forma de pagamento cadastrada e selecionada!")
      setNovaFormaNome("")
      setNovaFormaParcelas(1)
      setOpenNovaForma(false)
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Erro ao cadastrar forma de pagamento.")
    } finally {
      setSavingForma(false)
    }
  }

  const isCancelado = currentStatus === 'cancelado' || pedido.ativo === false
  const podeEditar = !isCancelado && currentStatus !== 'entregue'

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <Link href="/pedidos">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  {pedido.numero}
                </h1>
                <StatusBadge statusObj={pedido.statusObj} fallback={currentStatus} />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 break-words">
                Criado em {pedido.criadoEm ? new Date(pedido.criadoEm).toLocaleDateString('pt-BR') : 'N/D'} | Orcamento: {pedido.orcamentoId}
                {pedido.ocCliente && <span className="block sm:inline sm:ml-2 sm:border-l sm:pl-2 border-border/50 mt-1 sm:mt-0">OC Cliente: <b className="text-foreground">{pedido.ocCliente}</b></span>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSalvarEdicao}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="size-4 mr-2" />
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                {podeEditar && (
                  <Button variant="secondary" onClick={iniciarEdicao} className="bg-secondary/80 hover:bg-secondary">
                    <Edit className="size-4 mr-2" />
                    Editar Pedido
                  </Button>
                )}
                <PDFProductionOrderButton
                  pedido={pedido}
                  cliente={cliente as Cliente}
                  vendedor={vendedor as Vendedor}
                />
                <PDFDownloadButton
                  pedido={pedido}
                  cliente={cliente as Cliente}
                  vendedor={vendedor as Vendedor}
                />
              </>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/50 shadow-sm p-6 mt-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Progresso da Produção</h3>
              {!isCancelado && currentStatus !== 'entregue' && (
                <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 text-xs px-4 w-full sm:w-auto border-destructive/40 text-destructive hover:bg-destructive/10">
                      <Trash2 className="size-3.5 mr-1.5" />
                      Cancelar Pedido
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar pedido?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O pedido {pedido.numero} será marcado como cancelado e removido da lista ativa.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">Voltar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault()
                          handleCancelarPedido()
                        }}
                        disabled={isUpdatingStatus}
                        className="w-full sm:w-auto bg-destructive text-white hover:bg-destructive/90"
                      >
                        {isUpdatingStatus ? "Cancelando..." : "Confirmar Cancelamento"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {isCancelado && (
              <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
                Este pedido foi cancelado e não aparece mais na fila ativa de produção.
              </div>
            )}

            {!isCancelado && (
            <div className="relative flex flex-col gap-6 sm:flex-row sm:justify-between">
              {/* Connecting line */}
              <div className="absolute top-5 left-[10%] right-[10%] h-[2px] bg-muted/50 -z-10 hidden sm:block" />
              <div
                className="absolute top-5 left-[10%] h-[2px] bg-primary -z-10 transition-all duration-500 ease-in-out hidden sm:block"
                style={{ width: `${(currentStepIndex / (steps.length - 1)) * 80}%` }}
              />

              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = index === currentStepIndex
                const isCompleted = index < currentStepIndex

                return (
                  <div key={step.id} className="flex flex-row sm:flex-col items-center gap-3 sm:w-1/4">
                    <div className={`
                      size-10 rounded-full flex items-center justify-center border-2 bg-background transition-colors duration-300
                      ${isCompleted ? 'border-primary text-primary' : ''}
                      ${isActive ? 'border-primary ring-4 ring-primary/20 text-primary shadow-sm' : ''}
                      ${!isCompleted && !isActive ? 'border-muted-foreground/30 text-muted-foreground/50' : ''}
                    `}>
                      {isCompleted ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
                    </div>
                    <span className={`text-xs font-semibold uppercase tracking-wider text-center
                      ${isCompleted ? 'text-foreground' : ''}
                      ${isActive ? 'text-primary' : ''}
                      ${!isCompleted && !isActive ? 'text-muted-foreground' : ''}
                    `}>
                      {step.label}
                    </span>

                    {/* Botões de navegação apenas no step ativo */}
                    {isActive && (
                      <div className="mt-2 flex flex-col gap-2">
                        {step.nextLabel && (
                          <Button
                            size="sm"
                            onClick={handleAdvanceStatus}
                            disabled={isUpdatingStatus}
                            className="h-7 text-[10px] uppercase font-bold tracking-wider rounded-full px-4 shadow-md hover:scale-105 transition-transform"
                          >
                            {isUpdatingStatus ? "..." : step.nextLabel} <ArrowRight className="size-3 ml-1" />
                          </Button>
                        )}
                        {step.prevLabel && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleBackStatus}
                            disabled={isUpdatingStatus}
                            className="h-7 text-[10px] uppercase font-bold tracking-wider rounded-full px-4 border-primary/30 text-primary hover:bg-primary/5"
                          >
                            <ArrowLeft className="size-3 mr-1" /> {isUpdatingStatus ? "..." : step.prevLabel}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-border/50 shadow-sm">
            <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
              <CardTitle className="text-base">Informações de Entrega e Cliente</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {cliente && (
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div>
                      <h4 className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Empresa Destinatária</h4>
                      <p className="text-base font-semibold text-foreground">{cliente.razaoSocial}</p>
                      <p className="text-sm font-mono text-muted-foreground mt-0.5">{[cliente.cnpj && `CNPJ: ${cliente.cnpj}`, cliente.ie && `IE: ${cliente.ie}`].filter(Boolean).join(" | ")}</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <h4 className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Contato</h4>
                        <p className="text-sm font-medium">{cliente.telefone}</p>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Comprador</h4>
                        <p className="text-sm font-medium">{pedido.comprador}</p>
                      </div>
                    </div>
                  </div>

                  {/* Destacando o card de entrega */}
                  <div className="flex-1 bg-amber-50/50 dark:bg-amber-950/20 p-5 rounded-xl border border-amber-200 dark:border-amber-900 relative shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                      <Truck className="size-16 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div className="flex items-center gap-2 mb-3 relative z-10">
                      <div className="bg-amber-100 dark:bg-amber-900/50 p-1.5 rounded-md">
                        <Truck className="size-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h4 className="text-[13px] text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider">Local de Entrega</h4>
                    </div>

                    <div className="relative z-10">
                      <p className="text-sm font-bold text-foreground leading-relaxed">
                        {cliente.endereco}
                      </p>
                      <p className="text-sm text-foreground/80 mt-1 font-medium">
                        {cliente.cidade} / {cliente.estado}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">CEP: {cliente.cep}</p>

                      <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800/50 flex flex-col gap-3 sm:flex-row sm:justify-between">
                        <div>
                          <span className="text-[10px] uppercase text-amber-600 dark:text-amber-400 font-bold block mb-0.5">Prazo Acordado</span>
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editPrazo}
                              onChange={(e) => setEditPrazo(e.target.value)}
                              className="h-8 w-full sm:w-40 bg-background"
                            />
                          ) : (
                            <span className="text-sm font-black text-foreground">{pedido.prazoEntrega ? formatDateBR(pedido.prazoEntrega) : 'A definir'}</span>
                          )}
                        </div>
                        <div className="sm:text-right">
                          <span className="text-[10px] uppercase text-amber-600 dark:text-amber-400 font-bold block mb-0.5">Tipo de Frete</span>
                          {isEditing ? (
                            <Input
                              value={editFrete}
                              onChange={(e) => setEditFrete(e.target.value)}
                              placeholder="CIF / FOB..."
                              className="h-8 w-full sm:w-32 bg-background sm:text-right"
                            />
                          ) : (
                            <span className="text-sm font-bold text-foreground">{pedido.frete}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm flex flex-col">
            <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
              <CardTitle className="text-base">Condições Comerciais</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Forma de Pagamento</h4>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenNovaForma(true)}
                      className="h-6 text-[11px] text-primary hover:bg-primary/5 px-1.5"
                    >
                      <Plus className="size-3 mr-1" /> Nova forma
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <Select value={editFormaPagamentoId} onValueChange={setEditFormaPagamentoId}>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Selecione uma forma de pagamento..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formasPagamento.filter((f: any) => f.ativo).map((f: any) => (
                        <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="bg-background border border-border/60 rounded-lg p-3 text-sm font-medium shadow-sm flex items-center gap-2">
                    <CreditCard className="size-4 text-primary" />
                    {pedido.formaPagamentoObj?.nome || pedido.formaPagamento}
                  </div>
                )}

                <Dialog open={openNovaForma} onOpenChange={setOpenNovaForma}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Nova forma de pagamento</DialogTitle>
                      <DialogDescription>
                        Cadastre sem sair da edição do pedido — ela já fica selecionada aqui.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="ped-nova-forma-nome">Nome da Forma *</Label>
                        <Input
                          id="ped-nova-forma-nome"
                          placeholder="Ex: 30/60/90 Dias"
                          value={novaFormaNome}
                          onChange={(e) => setNovaFormaNome(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleCriarFormaPagamento()
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ped-nova-forma-parcelas">Parcelas</Label>
                        <Input
                          id="ped-nova-forma-parcelas"
                          type="number"
                          min={1}
                          value={novaFormaParcelas}
                          onChange={(e) => setNovaFormaParcelas(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button type="button" variant="outline" onClick={() => setOpenNovaForma(false)}>
                        Cancelar
                      </Button>
                      <Button type="button" onClick={handleCriarFormaPagamento} disabled={savingForma}>
                        {savingForma ? "Salvando..." : "Cadastrar e usar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div>
                <h4 className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">OC do Cliente</h4>
                {isEditing ? (
                  <Input
                    value={editOcCliente}
                    onChange={(e) => setEditOcCliente(e.target.value)}
                    placeholder="Número da OC do cliente..."
                    className="h-9 bg-background"
                  />
                ) : (
                  <div className="text-sm font-medium text-foreground">{pedido.ocCliente || "Não informada"}</div>
                )}
              </div>
              <Separator />
              <div>
                <h4 className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Vendedor Responsável</h4>
                <div className="text-sm font-medium text-foreground flex items-center gap-2">
                  <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    {vendedor?.nome?.charAt(0) || "V"}
                  </div>
                  {vendedor?.nome || "Vendedor não identificado"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="size-4 text-primary" />
              Especificações de Produção
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="bg-muted/20 p-3 rounded-lg border border-border/40">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Sentido de Saída</p>
                {isEditing ? (
                  <Input value={editSentido} onChange={(e) => setEditSentido(e.target.value)} className="h-8 bg-background" />
                ) : (
                  <p className="text-sm font-medium text-foreground">{pedido.sentidoSaidaRolo}</p>
                )}
              </div>
              <div className="bg-muted/20 p-3 rounded-lg border border-border/40">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Tipo de Tubete</p>
                {isEditing ? (
                  <Input value={editTubete} onChange={(e) => setEditTubete(e.target.value)} className="h-8 bg-background" />
                ) : (
                  <p className="text-sm font-medium text-foreground">{pedido.tipoTubete}</p>
                )}
              </div>
              <div className="bg-muted/20 p-3 rounded-lg border border-border/40">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Gap entre Etiquetas</p>
                {isEditing ? (
                  <Input value={editGap} onChange={(e) => setEditGap(e.target.value)} className="h-8 bg-background" />
                ) : (
                  <p className="text-sm font-medium text-foreground">{pedido.gapEntreEtiquetas}</p>
                )}
              </div>
              <div className="bg-muted/20 p-3 rounded-lg border border-border/40">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Número de Pistas</p>
                {isEditing ? (
                  <Input type="number" min={1} value={editPistas} onChange={(e) => setEditPistas(e.target.value)} className="h-8 bg-background" />
                ) : (
                  <p className="text-sm font-medium text-foreground">{pedido.numeroPistas}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Itens do Pedido</CardTitle>
              {isEditing && (
                <Button variant="outline" size="sm" onClick={adicionarItemEdit} className="h-8 text-xs text-primary">
                  <Plus className="size-3.5 mr-1" /> Adicionar item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="flex flex-col gap-4">
                {editItens.map((item, idx) => (
                  <div key={item.id} className="relative rounded-xl border border-border/60 bg-card p-4 pt-6 shadow-sm">
                    <div className="absolute -top-3 -left-3 size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md border-4 border-background">
                      {idx + 1}
                    </div>
                    <div className="absolute top-2 right-2">
                      <Button variant="ghost" size="icon" onClick={() => removerItemEdit(item.id)} className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-1">
                      <div className="md:col-span-12">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Descrição</Label>
                        <Textarea
                          rows={2}
                          value={item.descricao}
                          onChange={(e) => atualizarItemEdit(item.id, "descricao", e.target.value)}
                          className="bg-muted/10 resize-none text-sm"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-xs font-semibold mb-1 block">Quantidade</Label>
                        <NumeroBRInput aria-label="Quantidade do item" casas={0} value={item.quantidade} onValueChange={(v) => atualizarItemEdit(item.id, "quantidade", v)} className="bg-muted/20" />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-xs font-semibold mb-1 block">Unidade</Label>
                        <UnidadeSelect aria-label="Unidade do item" value={item.unidade} onChange={(v) => atualizarItemEdit(item.id, "unidade", v)} />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-xs font-semibold mb-1 block">Valor Unitário (R$)</Label>
                        <NumeroBRInput aria-label="Valor unitário do item" casas={4} max={1_000_000_000} value={item.precoUnitario} onValueChange={(v) => atualizarItemEdit(item.id, "precoUnitario", v)} className="bg-muted/20 font-mono" />
                      </div>
                      <div className="md:col-span-3 min-w-0">
                        <Label className="text-xs font-semibold text-primary mb-1 block">Subtotal</Label>
                        {(() => {
                          const subtotalStr = formatCurrency(parseNum(item.quantidade) * parseNum(item.precoUnitario))
                          return (
                            <div className="flex h-9 items-center justify-end rounded-md bg-primary/10 px-3 text-base font-bold text-primary border border-primary/20 min-w-0">
                              <span className="truncate tabular-nums min-w-0" title={subtotalStr}>{subtotalStr}</span>
                            </div>
                          )
                        })()}
                      </div>
                      <div className="md:col-span-12">
                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase mb-1 block">Observação do Item</Label>
                        <Input value={item.observacao || ""} onChange={(e) => atualizarItemEdit(item.id, "observacao", e.target.value)} className="bg-muted/10 h-8 text-xs border-dashed border-border/60" />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end items-baseline gap-3 border-t border-border/50 pt-4 min-w-0">
                  <span className="text-sm font-bold text-foreground shrink-0">Total R$</span>
                  <span className="text-lg font-bold text-primary truncate tabular-nums text-right" title={formatCurrency(editTotalGeral)}>{formatCurrency(editTotalGeral)}</span>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Quant.</TableHead>
                      <TableHead className="w-16">Unid.</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead className="text-right w-24">P.Unit.</TableHead>
                      <TableHead className="text-right w-24">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedido.itens.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-foreground">
                          {item.quantidade.toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.unidade}</TableCell>
                        <TableCell className="text-foreground whitespace-pre-line">
                          {item.descricao}
                          {item.observacao && (
                            <span className="block mt-1 text-xs text-muted-foreground italic">
                              Obs: {item.observacao}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {formatCurrency(item.precoUnitario)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-bold text-foreground">
                        Total R$
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg text-primary">
                        {formatCurrency(pedido.totalGeral)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {isEditing && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" />
                Observações
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Observações Gerais</Label>
                <Textarea rows={3} value={editObsGerais} onChange={(e) => setEditObsGerais(e.target.value)} className="bg-muted/10 resize-none" />
              </div>
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Instruções de Embalagem</Label>
                  <Textarea rows={2} value={editObsEmbalagem} onChange={(e) => setEditObsEmbalagem(e.target.value)} className="bg-muted/10 resize-none" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Instruções de Faturamento</Label>
                  <Textarea rows={2} value={editObsFaturamento} onChange={(e) => setEditObsFaturamento(e.target.value)} className="bg-muted/10 resize-none" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isEditing && pedido.observacoesGerais && (
          <Card className="border-2 border-foreground/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-amber-600" />
                Observacoes Gerais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground font-medium whitespace-pre-line">
                {pedido.observacoesGerais}
              </p>
            </CardContent>
          </Card>
        )}

        {!isEditing && (pedido.observacoesEmbalagem || pedido.observacoesFaturamento) && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {pedido.observacoesEmbalagem && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/10 border-b border-border/50 pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Instruções de Embalagem</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-foreground font-medium">{pedido.observacoesEmbalagem}</p>
                </CardContent>
              </Card>
            )}
            {pedido.observacoesFaturamento && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/10 border-b border-border/50 pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Instruções de Faturamento</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-foreground font-medium">{pedido.observacoesFaturamento}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card className="border-border/50 shadow-sm overflow-hidden border-l-4 border-l-primary/50">
          <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              Evolução e Comentários do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="relative pl-6 border-l-2 border-border/50 ml-2 space-y-6">

                {/* Timeline mock Item */}
                <div className="relative">
                  <div className="absolute -left-[31px] bg-background border-2 border-primary size-4 rounded-full" />
                  <div className="bg-card border border-border/50 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-1 rounded">Sistema</span>
                      <span className="text-xs text-muted-foreground font-mono">Hoje às 10:45</span>
                    </div>
                    <p className="text-sm text-foreground/90">Pedido criado a partir do orçamento {pedido.orcamentoId} e enviado para a fila de Produção.</p>
                  </div>
                </div>

                {/* Initial observation if any */}
                {pedido.observacoesGerais && (
                  <div className="relative">
                    <div className="absolute -left-[31px] bg-amber-500 border-2 border-amber-500 size-4 rounded-full" />
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider bg-amber-500/20 px-2 py-1 rounded">Atenção Integrada</span>
                        <span className="text-xs text-amber-600/70 font-mono">Na crianção</span>
                      </div>
                      <p className="text-sm text-amber-800 font-medium whitespace-pre-line">{pedido.observacoesGerais}</p>
                    </div>
                  </div>
                )}

              </div>

              <div className="pt-4 border-t border-border/50">
                <h4 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
                  Novo Comentário
                </h4>
                <div className="flex flex-col gap-3">
                  <Textarea
                    placeholder="Adicione uma anotação, registre uma ocorrência ou detalhe a evolução da produção..."
                    className="resize-none bg-muted/10 focus-visible:ring-primary/50"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Plus className="size-4 mr-1" /> Registrar Evolução
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
