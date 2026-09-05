"use client"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Eye, Clock, AlertCircle, AlertTriangle, Truck, Factory, PackageOpen, LayoutDashboard, CheckCircle2, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/mock-data"
import { formatDateBR } from "@/lib/utils"
import { StatusBadge } from "@/components/ui/status-badge"
import { getPedidos, updatePedidoStatus } from "@/lib/actions/pedidos"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useDataQuery } from "@/hooks/use-data-query"
import { Skeleton } from "@/components/ui/skeleton"
import { FilterCombobox } from "@/components/ui/filter-combobox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range"
import { DateRange } from "react-day-picker"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"

export default function PedidosPage() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [fStatus, setFStatus] = useState("")
  const [fSlaOnly, setFSlaOnly] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [page, setPage] = useState(1)

  const router = useRouter()
  const { isVendedor, vendedor, currentUser, isLoading: authLoading } = useAuth()

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(handler)
  }, [search])

  const apiParams = useMemo(() => {
    return {
      type: 'pedidos',
      page,
      limit: 15,
      search: debouncedSearch,
      status: fStatus || undefined,
      apenasSla: fSlaOnly,
      dataInicio: dateRange?.from?.toISOString(),
      dataFim: dateRange?.to?.toISOString(),
      vendedorId: isVendedor ? vendedor?.id : undefined,
      requesterId: currentUser?.id
    }
  }, [page, debouncedSearch, fStatus, fSlaOnly, dateRange, isVendedor, vendedor, currentUser])

  // A chave da consulta inclui o requesterId. Sem esperar a sessão resolver, a
  // tela disparava a consulta duas vezes (uma sem usuário, outra com) — e a
  // primeira ainda vinha sem o filtro de vendedor.
  const { data: dbData, isLoading: loading, refetch } = useDataQuery<any>({
    key: apiParams,
    fetcher: () => getPedidos({
      page,
      limit: 15,
      search: debouncedSearch,
      status: fStatus || undefined,
      apenasSla: fSlaOnly,
      dataInicio: dateRange?.from?.toISOString(),
      dataFim: dateRange?.to?.toISOString(),
      vendedorId: isVendedor ? vendedor?.id : undefined,
      requesterId: currentUser?.id
    }),
    enabled: !authLoading,
  })

  // Confirmação rápida de entrega direto da lista.
  const [entregaPedido, setEntregaPedido] = useState<any | null>(null)
  const [confirmandoEntrega, setConfirmandoEntrega] = useState(false)

  const confirmarEntrega = async () => {
    if (!entregaPedido) return
    setConfirmandoEntrega(true)
    try {
      await updatePedidoStatus(entregaPedido.id, 'entregue', currentUser?.id)
      toast.success(`Pedido ${entregaPedido.numero} marcado como entregue.`)
      setEntregaPedido(null)
      refetch()
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível confirmar a entrega.")
    } finally {
      setConfirmandoEntrega(false)
    }
  }

  const pedidosList = dbData?.data || []
  const KPIs = dbData?.kpis || { totalValor: 0, emAnalise: 0, emProducao: 0, separacao: 0, entregue: 0, slaAlerta: 0 }
  const totalPages = dbData?.totalPages || 1

  const getSlaStatus = (prazo: string | null, status: string) => {
    if (status === 'entregue' || status === 'cancelado') return { class: '', icon: null, text: status === 'cancelado' ? 'Cancelado' : 'Entregue', urgent: false, isLate: false }
    if (!prazo) return { class: '', icon: null, text: 'Sem prazo', urgent: false, isLate: false }

    // Constrói a data a partir da parte "YYYY-MM-DD" como data local (meia-noite),
    // evitando o deslocamento de fuso que colocava o prazo um dia antes.
    const [py, pm, pd] = String(prazo).slice(0, 10).split('-').map(Number)
    const prazoDate = new Date(py, (pm || 1) - 1, pd || 1)
    if (isNaN(prazoDate.getTime())) return { class: '', icon: null, text: 'Prazo inválido', urgent: false, isLate: false }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const diffTime = prazoDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { class: 'bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500', icon: <AlertCircle className="size-4 text-red-500" />, text: `Atrasado ${Math.abs(diffDays)} dias`, urgent: true, isLate: true }
    } else if (diffDays <= 3) {
      return { class: 'bg-orange-50 dark:bg-orange-950/20 border-l-4 border-l-orange-500', icon: <AlertTriangle className="size-4 text-orange-500" />, text: `Vence em ${diffDays} dias`, urgent: true, isLate: false }
    }
    return { class: '', icon: null, text: 'No prazo', urgent: false, isLate: false }
  }

  const handleStatusFilter = (status: string) => {
    if (fStatus === status) {
      setFStatus('')
    } else {
      setFStatus(status)
      setFSlaOnly(false)
    }
    setPage(1)
  }

  const handleSlaFilter = () => {
    setFSlaOnly(!fSlaOnly)
    setFStatus('')
    setPage(1)
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Pedidos de Produção</h1>
            <p className="text-sm text-muted-foreground mt-1">Acompanhamento operacional e SLAs de entregas.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className={`bg-gradient-to-br from-card to-card/50 border-border/50 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${!fStatus && !fSlaOnly ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => { setFStatus(''); setFSlaOnly(false); setPage(1) }}
          >
            <div className="absolute -right-4 -top-4 p-3 opacity-5 pointer-events-none"><LayoutDashboard className="size-24" /></div>
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><LayoutDashboard className="size-4 text-primary" />Valor Total</p>
              <h2 className="text-2xl font-bold block truncate">{loading && !dbData ? "..." : formatCurrency(KPIs.totalValor)}</h2>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-1">{dateRange?.from ? 'Período Filtrado' : 'Todos os períodos'}</p>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20 dark:to-background border-blue-100 dark:border-blue-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatus === 'em_analise' && !fSlaOnly ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => handleStatusFilter('em_analise')}
          >
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2"><PackageOpen className="size-4" />Em Análise</p>
              <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-300">{loading && !dbData ? "..." : KPIs.emAnalise}</h2>
              <p className="text-xs text-blue-500 font-medium">Aguardando OP</p>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20 dark:to-background border-purple-100 dark:border-purple-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatus === 'em_producao' && !fSlaOnly ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => handleStatusFilter('em_producao')}
          >
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2"><Factory className="size-4" />Em Produção</p>
              <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-300">{loading && !dbData ? "..." : KPIs.emProducao}</h2>
              <p className="text-xs text-purple-500 font-medium">Fábrica e Separação</p>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-red-50 to-background dark:from-red-950/20 dark:to-background border-red-100 dark:border-red-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fSlaOnly ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={handleSlaFilter}
          >
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2"><Truck className="size-4" />Alerta de SLA</p>
              <h2 className="text-2xl font-bold text-red-700 dark:text-red-300">{loading && !dbData ? "..." : KPIs.slaAlerta}</h2>
              <p className="text-xs text-red-500 font-medium">Atrasados ou Urgentes</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50 shadow-sm mt-2">
          <CardHeader className="pb-4 pt-5 flex flex-col items-stretch md:flex-row md:items-center justify-between gap-4 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-2 flex-1 relative max-w-sm">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pedido, cliente ou OP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background focus-visible:bg-background border-border"
              />
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
              <DatePickerWithRange 
                date={dateRange}
                setDate={(date) => {
                  setDateRange(date)
                  setPage(1)
                }}
                className="w-full md:w-auto"
              />
              <FilterCombobox
                aria-label="Filtrar por status"
                value={fStatus}
                onChange={(v) => { setFStatus(v); setFSlaOnly(false); setPage(1) }}
                options={[
                  { value: "", label: "Todos Status" },
                  { value: "em_analise", label: "Em Análise" },
                  { value: "em_producao", label: "Em Produção" },
                  { value: "separacao", label: "Separação" },
                  { value: "entregue", label: "Entregue" },
                  { value: "cancelado", label: "Cancelado" },
                ]}
                className="w-48 shrink-0"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead className="hidden lg:table-cell">Vendedor</TableHead><TableHead className="hidden md:table-cell">Prazo SLA</TableHead><TableHead className="text-right">Status</TableHead><TableHead className="text-right pr-6">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading && !dbData ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground"><div className="flex justify-center items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div> Carregando dados...</div></TableCell></TableRow>
                  ) : pedidosList.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground"><p>Nenhum pedido encontrado.</p></TableCell></TableRow>
                  ) : pedidosList.map((ped: any) => {
                    const sla = getSlaStatus(ped.prazoEntrega, ped.status)
                    return (
                      <TableRow key={ped.id} onClick={() => router.push(`/pedidos/${ped.id}`)} className={`hover:bg-muted/30 transition-colors border-border/30 bg-card cursor-pointer ${sla.class}`}>
                        <TableCell><div className="flex flex-col"><span className="font-medium font-mono text-blue-500 text-[13px]">{ped.numero}</span><span className="text-[11px] font-medium text-muted-foreground">R$ {ped.totalGeral.toFixed(2)}</span></div></TableCell>
                        <TableCell><div className="font-medium text-[13px] text-foreground truncate">{ped.cliente?.razaoSocial}</div><div className="text-[11px] text-muted-foreground truncate font-mono">CNPJ: {ped.cliente?.cnpj}</div></TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-[12px]">{ped.vendedor?.nome || "N/A"}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                              <Clock className="size-3.5 text-muted-foreground" />
                              {ped.prazoEntrega ? formatDateBR(ped.prazoEntrega) : 'N/D'}
                            </span>
                            {sla.urgent && (
                              <span className={`flex items-center gap-1 text-[10px] font-bold ${sla.isLate ? 'text-red-600' : 'text-orange-600'}`}>
                                {sla.icon}{sla.text}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right"><StatusBadge statusObj={ped.statusObj} fallback={ped.status} /></TableCell>
                        <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {ped.status !== 'entregue' && ped.status !== 'cancelado' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Confirmar entrega"
                                onClick={() => setEntregaPedido(ped)}
                                className="h-8 w-8 p-0 border border-border/50 text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/40 hover:bg-emerald-500/10"
                              >
                                <Truck className="size-4" />
                              </Button>
                            )}
                            <Link href={`/pedidos/${ped.id}`}>
                              <Button variant="ghost" size="sm" title="Abrir pedido" className="h-8 w-8 p-0 border border-border/50"><Eye className="size-4" /></Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="py-4 border-t border-border/50 overflow-x-auto">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPage(p => Math.max(1, p - 1))} 
                        className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        aria-disabled={page === 1}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1;
                      if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                        return (
                          <PaginationItem key={p}>
                            <PaginationLink className="cursor-pointer" isActive={page === p} onClick={() => setPage(p)}>
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      if (p === 2 && page > 3) return <PaginationItem key={p}><PaginationEllipsis /></PaginationItem>;
                      if (p === totalPages - 1 && page < totalPages - 2) return <PaginationItem key={p}><PaginationEllipsis /></PaginationItem>;
                      return null;
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                        className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        aria-disabled={page === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confirmação de entrega */}
        <AlertDialog open={!!entregaPedido} onOpenChange={(open) => !open && !confirmandoEntrega && setEntregaPedido(null)}>
          <AlertDialogContent className="sm:max-w-md border-border/50 shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Truck className="size-5 text-emerald-600" />
                Confirmar entrega?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                O pedido <span className="font-semibold text-foreground font-mono">{entregaPedido?.numero}</span> de{" "}
                <span className="font-semibold text-foreground">{entregaPedido?.cliente?.razaoSocial}</span> passa para o status <strong>Entregue</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={confirmandoEntrega} className="hover:bg-muted">Não</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  // Impede o AlertDialog de fechar antes da action responder.
                  e.preventDefault()
                  confirmarEntrega()
                }}
                disabled={confirmandoEntrega}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {confirmandoEntrega ? (
                  <><Loader2 className="size-4 mr-1.5 animate-spin" /> Confirmando...</>
                ) : (
                  <><CheckCircle2 className="size-4 mr-1.5" /> Sim</>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  )
}
