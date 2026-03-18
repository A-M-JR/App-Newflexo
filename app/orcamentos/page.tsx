"use client"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Plus, Eye, TrendingUp, AlertCircle, Clock, CheckCircle2, ChevronDown, Filter } from "lucide-react"
import { orcamentos, clientes, formatCurrency, formatStatus, getStatusColor } from "@/lib/mock-data"
import { useState, useMemo } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

export default function OrcamentosPage() {
  const [search, setSearch] = useState("")
  const [fStatus, setFStatus] = useState("")
  const [fValorOrder, setFValorOrder] = useState("")
  const [fDataOrder, setFDataOrder] = useState("")

  const { isVendedor, vendedor } = useAuth()

  // Filter by current user if vendedor, show all if admin
  const userOrcamentos = useMemo(() => {
    return isVendedor && vendedor ? orcamentos.filter((o) => o.vendedorId === vendedor.id) : orcamentos
  }, [isVendedor, vendedor])

  const filtered = useMemo(() => {
    let result = userOrcamentos.filter((o) => {
      const cliente = clientes.find((c) => c.id === o.clienteId)
      const term = search.toLowerCase()
      const matchSearch = o.numero.toLowerCase().includes(term) ||
        cliente?.razaoSocial.toLowerCase().includes(term)

      const matchStatus = fStatus ? o.status === fStatus : true

      // Filtro de Data (Mês atual/anterior)
      let matchDate = true
      if (fDataOrder === "mesAtual" || fDataOrder === "mesAnterior") {
        const itemDate = new Date(o.criadoEm.split('/').reverse().join('-')) // converte DD/MM/YYYY
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

    // Ordenação de Valor e Data
    if (fValorOrder === "maior") {
      result = result.sort((a, b) => b.totalGeral - a.totalGeral)
    } else if (fValorOrder === "menor") {
      result = result.sort((a, b) => a.totalGeral - b.totalGeral)
    }

    if (fDataOrder === "recente") {
      result = result.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
    } else if (fDataOrder === "antigo") {
      result = result.sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime())
    }

    return result
  }, [userOrcamentos, search, fStatus, fValorOrder, fDataOrder])

  // Cálculos de KPIs (Agora baseados nos dados filtrados na tela)
  const vigentes = filtered.filter(o => o.status === 'enviado').length
  const aprovados = filtered.filter(o => o.status === 'aprovado').length
  const parados = filtered.filter(o => o.status === 'rascunho' || o.status === 'recusado').length
  // Valor Total em Filtro não desconta o recusado a menos que o próprio filtro já tenha retirado da lista
  const totalValor = filtered.reduce((acc, obj) => acc + (obj.status !== 'recusado' ? obj.totalGeral : 0), 0)

  return (
    <AppShell>
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Orçamentos e Propostas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Funil de vendas e acompanhamento de propostas comerciais ativas.
            </p>
          </div>
          <Link href="/orcamentos/novo">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all hover:scale-[1.02]">
              <Plus className="size-4 mr-2" />
              Novo Orçamento
            </Button>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className={`bg-gradient-to-br from-card to-card/50 border-border/50 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${!fStatus ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => setFStatus('')}
          >
            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
              <TrendingUp className="size-16" />
            </div>
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                Valor Total (Todos)
              </p>
              <h2 className="text-2xl font-bold block truncate">{formatCurrency(totalValor)}</h2>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-indigo-50 to-background dark:from-indigo-950/20 dark:to-background border-indigo-100 dark:border-indigo-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatus === 'enviado' ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => setFStatus(fStatus === 'enviado' ? '' : 'enviado')}
          >
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                <Clock className="size-4" />
                Vigentes / Aguardando
              </p>
              <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{vigentes}</h2>
              <p className="text-xs text-indigo-500 font-medium">Propostas enviadas</p>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatus === 'aprovado' ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => setFStatus(fStatus === 'aprovado' ? '' : 'aprovado')}
          >
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                Aprovados
              </p>
              <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{aprovados}</h2>
              <p className="text-xs text-emerald-500 font-medium">Ganhos recentes</p>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-rose-50 to-background dark:from-rose-950/20 dark:to-background border-rose-100 dark:border-rose-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${['rascunho', 'recusado'].includes(fStatus) ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => setFStatus(['rascunho', 'recusado'].includes(fStatus) ? '' : 'recusado')}
          >
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="size-4" />
                Vencidos / Sem Mov.
              </p>
              <h2 className="text-2xl font-bold text-rose-700 dark:text-rose-300">{parados}</h2>
              <p className="text-xs text-rose-500 font-medium">Necessitam atenção</p>
            </CardContent>
          </Card>
        </div>

        {/* Funil / Filters & Table */}
        <Card className="border-border/50 shadow-sm mt-2">
          <CardHeader className="pb-4 pt-5 flex flex-col items-stretch md:flex-row md:items-center justify-between gap-4 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-2 flex-1 relative max-w-sm">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou nº doc..."
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
                  <option value="rascunho">Rascunho</option>
                  <option value="enviado">Vigente (Enviado)</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="recusado">Vencido/Recusado</option>
                </select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor:</label>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={fValorOrder}
                  onChange={e => setFValorOrder(e.target.value)}
                >
                  <option value="">Padrão</option>
                  <option value="maior">Maior Valor</option>
                  <option value="menor">Menor Valor</option>
                </select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data:</label>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={fDataOrder}
                  onChange={e => setFDataOrder(e.target.value)}
                >
                  <option value="">Padrão</option>
                  <option value="recente">Mais Recentes</option>
                  <option value="antigo">Mais Antigos</option>
                  <option value="mesAtual">Mês Atual</option>
                  <option value="mesAnterior">Mês Anterior</option>
                </select>
              </div>

              {(fStatus || fValorOrder || fDataOrder) && (
                <Button variant="ghost" size="sm" onClick={() => { setFStatus(""); setFValorOrder(""); setFDataOrder("") }} className="h-8 px-2 text-xs">
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
                    <TableHead className="font-semibold text-muted-foreground text-[13px] h-11">Orçamento / Data</TableHead>
                    <TableHead className="font-semibold text-muted-foreground text-[13px] h-11 max-w-[200px]">Cliente</TableHead>
                    <TableHead className="font-semibold text-muted-foreground text-[13px] h-11 hidden sm:table-cell text-center">Itens</TableHead>
                    <TableHead className="font-semibold text-muted-foreground text-[13px] h-11 text-center">Status</TableHead>
                    <TableHead className="font-semibold text-muted-foreground text-[13px] h-11 text-right">Total Base</TableHead>
                    <TableHead className="font-semibold text-muted-foreground text-[13px] h-11 text-right pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((orc) => {
                    const cliente = clientes.find((c) => c.id === orc.clienteId)
                    return (
                      <TableRow key={orc.id} className="hover:bg-muted/10 transition-colors border-border/30 group bg-card">
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium font-mono text-blue-500 text-[13px]">{orc.numero}</span>
                            <span className="text-[11px] text-muted-foreground">{orc.criadoEm}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="font-medium text-[13px] text-foreground truncate">{cliente?.razaoSocial}</div>
                          <div className="text-[11px] text-muted-foreground truncate font-mono">CNPJ: {cliente?.cnpj}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-center">
                          <Badge variant="outline" className="bg-background text-muted-foreground border-border/50 font-mono text-xs rounded-lg px-2 shadow-sm font-medium">
                            {orc.itens.length}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className={`${getStatusColor(orc.status)} shadow-sm font-medium capitalize`}>
                            {formatStatus(orc.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground text-[13px]">
                          {formatCurrency(orc.totalGeral)}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Link href={`/orcamentos/${orc.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity hover:text-primary hover:bg-primary/10">
                              <Eye className="size-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground bg-card">
                        Nenhum orcamento encontrado.
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
