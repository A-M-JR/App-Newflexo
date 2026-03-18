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
import { Search, Eye, Clock, AlertCircle, AlertTriangle, Truck, Factory, PackageOpen, LayoutDashboard, Filter } from "lucide-react"
import { pedidos, clientes, formatCurrency, formatStatus, getStatusColor, getVendedorById } from "@/lib/mock-data"
import { useState, useMemo } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

export default function PedidosPage() {
  const [search, setSearch] = useState("")
  const [fStatus, setFStatus] = useState("")
  const [fSlaOnly, setFSlaOnly] = useState(false)
  const [fDataOrder, setFDataOrder] = useState("") // Default empty to list all on load

  const { isVendedor, vendedor } = useAuth()

  // Filter by current user if vendedor, show all if admin
  const userPedidos = useMemo(() => {
    return isVendedor && vendedor ? pedidos.filter((p) => p.vendedorId === vendedor.id) : pedidos
  }, [isVendedor, vendedor])

  const filtered = useMemo(() => {
    let result = userPedidos.filter((p) => {
      const cliente = clientes.find((c) => c.id === p.clienteId)
      const term = search.toLowerCase()

      const matchSearch = p.numero.toLowerCase().includes(term) ||
        cliente?.razaoSocial.toLowerCase().includes(term) ||
        getVendedorById(p.vendedorId)?.nome.toLowerCase().includes(term)

      const matchStatus = fStatus ? p.status === fStatus : true

      // Filtro de Data (Mês atual/anterior) via Prazo de Entrega ou premissa
      let matchDate = true
      if (fDataOrder === "mesAtual" || fDataOrder === "mesAnterior") {
        const itemDate = new Date(p.prazoEntrega.split('/').reverse().join('-')) // converte DD/MM/YYYY
        const now = new Date()
        const isCurrentMonth = itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()

        let isLastMonth = false
        if (now.getMonth() === 0) {
          isLastMonth = itemDate.getMonth() === 11 && itemDate.getFullYear() === now.getFullYear() - 1
        } else {
          isLastMonth = itemDate.getMonth() === now.getMonth() - 1 && itemDate.getFullYear() === now.getFullYear()
        }

        if (fDataOrder === "mesAtual" && !isCurrentMonth) matchDate = false
        if (fDataOrder === "mesAnterior" && !isLastMonth) matchDate = false
      }

      return matchSearch && matchStatus && matchDate
    })

    // Filtro de SLA urgente (atrasado ou vence em 3 dias)
    if (fSlaOnly) {
      result = result.filter(p => {
        if (p.status === 'entregue') return false
        const [d, m, y] = p.prazoEntrega.split('/')
        const prazoDate = new Date(Number(y), Number(m) - 1, Number(d))
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((prazoDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays <= 3
      })
    }

    if (fDataOrder === "recente") {
      result = result.sort((a, b) => new Date(b.prazoEntrega.split('/').reverse().join('-')).getTime() - new Date(a.prazoEntrega.split('/').reverse().join('-')).getTime())
    } else if (fDataOrder === "antigo") {
      result = result.sort((a, b) => new Date(a.prazoEntrega.split('/').reverse().join('-')).getTime() - new Date(b.prazoEntrega.split('/').reverse().join('-')).getTime())
    }

    return result
  }, [userPedidos, search, fStatus, fSlaOnly, fDataOrder])

  // SLA Calculation Logic (Current state)
  const getSlaStatus = (prazo: string, status: string) => {
    if (status === 'entregue') return { class: '', icon: null, text: 'Entregue', urgent: false }

    const [d, m, y] = prazo.split('/')
    const prazoDate = new Date(Number(y), Number(m) - 1, Number(d))
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

  // Cálculos de KPIs Dinâmicos baseados no Filtro Atual
  const KPIs = useMemo(() => {
    let totalValor = 0;
    let emAnalise = 0;
    let emProducao = 0;
    let atrasados = 0;

    filtered.forEach(p => {
      totalValor += p.totalGeral;
      if (p.status === 'em_analise') emAnalise++;
      if (p.status === 'em_producao' || p.status === 'separacao') emProducao++;

      const sla = getSlaStatus(p.prazoEntrega, p.status)
      if (sla.urgent) atrasados++;
    })

    return { totalValor, emAnalise, emProducao, atrasados }
  }, [filtered])

  return (
    <AppShell>
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Pedidos de Produção</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acompanhamento operacional e SLAs de entregas.
            </p>
          </div>
        </div>

        {/* Dynamic KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className={`bg-gradient-to-br from-card to-card/50 border-border/50 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${!fStatus && !fSlaOnly ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => { setFStatus(''); setFSlaOnly(false) }}
          >
            <div className="absolute -right-4 -top-4 p-3 opacity-5 pointer-events-none">
              <LayoutDashboard className="size-24" />
            </div>
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <LayoutDashboard className="size-4 text-primary" />
                Valor Total (Todos)
              </p>
              <h2 className="text-2xl font-bold block truncate">{formatCurrency(KPIs.totalValor)}</h2>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-1">{fDataOrder === 'mesAtual' ? 'Competência: Mês Atual' : (fDataOrder === 'mesAnterior' ? 'Competência: Mês Anterior' : 'Todos os períodos')}</p>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20 dark:to-background border-blue-100 dark:border-blue-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatus === 'em_analise' && !fSlaOnly ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => { setFStatus(fStatus === 'em_analise' ? '' : 'em_analise'); setFSlaOnly(false) }}
          >
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <PackageOpen className="size-4" />
                Em Análise Comercial
              </p>
              <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-300">{KPIs.emAnalise}</h2>
              <p className="text-xs text-blue-500 font-medium">Aguardando OP</p>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20 dark:to-background border-purple-100 dark:border-purple-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatus === 'em_producao' && !fSlaOnly ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => { setFStatus(fStatus === 'em_producao' ? '' : 'em_producao'); setFSlaOnly(false) }}
          >
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <Factory className="size-4" />
                Em Chão de Fábrica
              </p>
              <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-300">{KPIs.emProducao}</h2>
              <p className="text-xs text-purple-500 font-medium">Produção e Separação</p>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-red-50 to-background dark:from-red-950/20 dark:to-background border-red-100 dark:border-red-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fSlaOnly ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => { setFSlaOnly(!fSlaOnly); setFStatus('') }}
          >
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                <Truck className="size-4" />
                Alerta de SLA
              </p>
              <h2 className="text-2xl font-bold text-red-700 dark:text-red-300">{KPIs.atrasados}</h2>
              <p className="text-xs text-red-500 font-medium">Atrasados ou Fechando Prazo</p>
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
              <div className="flex items-center gap-2 shrink-0">
                <Filter className="size-3.5 text-muted-foreground" />
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status:</label>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={fStatus}
                  onChange={e => setFStatus(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="em_analise">Em Análise</option>
                  <option value="em_producao">Em Produção</option>
                  <option value="separacao">Separação/Faturamento</option>
                  <option value="entregue">Entregue</option>
                </select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mês (Entrega):</label>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={fDataOrder}
                  onChange={e => setFDataOrder(e.target.value)}
                >
                  <option value="">Exibir Todos</option>
                  <option value="mesAtual">Mês Atual</option>
                  <option value="mesAnterior">Mês Anterior</option>
                  <option value="recente">Mais Recentes</option>
                  <option value="antigo">Mais Antigos</option>
                </select>
              </div>

              {(fStatus || fSlaOnly || search || fDataOrder) && (
                <Button variant="ghost" size="sm" onClick={() => { setFStatus(""); setFSlaOnly(false); setSearch(""); setFDataOrder("") }} className="h-8 px-2 text-xs">
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-transparent">
                  <TableRow className="hover:bg-transparent border-b border-border/40">
                    <TableHead className="font-semibold text-muted-foreground text-[13px] h-11">Pedido</TableHead>
                    <TableHead className="font-semibold text-muted-foreground text-[13px] h-11">Cliente</TableHead>
                    <TableHead className="hidden lg:table-cell font-semibold text-muted-foreground text-[13px] h-11">Vendedor</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold text-muted-foreground text-[13px] h-11">Prazo SLA</TableHead>
                    <TableHead className="text-right font-semibold text-muted-foreground text-[13px] h-11">Status Fila</TableHead>
                    <TableHead className="text-right font-semibold text-muted-foreground text-[13px] h-11 pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ped) => {
                    const cliente = clientes.find((c) => c.id === ped.clienteId)
                    const sla = getSlaStatus(ped.prazoEntrega, ped.status)

                    return (
                      <TableRow key={ped.id} className={`hover:bg-muted/10 transition-colors border-border/30 group bg-card ${sla.class}`}>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium font-mono text-blue-500 text-[13px]">{ped.numero}</span>
                            <span className="text-[11px] font-medium text-muted-foreground">R$ {ped.totalGeral.toFixed(2)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="font-medium text-[13px] text-foreground truncate">{cliente?.razaoSocial}</div>
                          <div className="text-[11px] text-muted-foreground truncate font-mono">CNPJ: {cliente?.cnpj}</div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-[12px]">
                          {getVendedorById(ped.vendedorId)?.nome || "N/A"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                              <Clock className="size-3.5 text-muted-foreground" />
                              {ped.prazoEntrega}
                            </span>
                            {sla.urgent && (
                              <span className={`flex items-center gap-1 text-[10px] font-bold ${sla.isLate ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                {sla.icon}
                                {sla.text}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={`${getStatusColor(ped.status)} font-medium border-current/20`}>
                            {formatStatus(ped.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Link href={`/pedidos/${ped.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 border border-border/50 bg-background/50 backdrop-blur-sm shadow-sm hover:bg-primary/10 hover:text-primary">
                              <Eye className="size-4" />
                              <span className="sr-only">Ver</span>
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Factory className="size-8 text-muted-foreground/30" />
                          <p>Nenhum pedido de produção encontrado neste período ou filtro.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
