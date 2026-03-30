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
import { Search, Plus, Eye, TrendingUp, AlertCircle, Clock, CheckCircle2, Filter } from "lucide-react"
import { formatCurrency, formatStatus, getStatusColor } from "@/lib/mock-data"
import { getOrcamentos } from "@/lib/actions/orcamentos"
import { useState, useMemo } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useDataQuery } from "@/hooks/use-data-query"
import { Skeleton } from "@/components/ui/skeleton"

export default function OrcamentosPage() {
  const [search, setSearch] = useState("")
  const [fStatus, setFStatus] = useState("")
  const [fValorOrder, setFValorOrder] = useState("")
  const [fDataOrder, setFDataOrder] = useState("")

  const { data: orcamentosList = [], isLoading: loading } = useDataQuery<any[]>({
    key: 'orcamentos',
    fetcher: getOrcamentos
  })

  const { isVendedor, vendedor } = useAuth()

  // Filter by current user if vendedor, show all if admin
  const userOrcamentos = useMemo(() => {
    const list = orcamentosList || []
    return isVendedor && vendedor ? list.filter((o: any) => o.vendedorId === vendedor.id) : list
  }, [isVendedor, vendedor, orcamentosList])

  const filtered = useMemo(() => {
    let result = userOrcamentos.filter((o: any) => {
      const cliente = o.cliente
      const term = search.toLowerCase()
      const matchSearch = o.numero.toLowerCase().includes(term) ||
        (cliente?.razaoSocial || "").toLowerCase().includes(term)

      const matchStatus = fStatus ? o.status === fStatus : true

      let matchDate = true
      if (fDataOrder === "mesAtual" || fDataOrder === "mesAnterior") {
        const itemDate = new Date(o.criadoEm.split('/').reverse().join('-'))
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

    if (fValorOrder === "maior") {
      result = result.sort((a: any, b: any) => b.totalGeral - a.totalGeral)
    } else if (fValorOrder === "menor") {
      result = result.sort((a: any, b: any) => a.totalGeral - b.totalGeral)
    }

    if (fDataOrder === "recente") {
      result = result.sort((a: any, b: any) => new Date(b.criadoEm.split('/').reverse().join('-')).getTime() - new Date(a.criadoEm.split('/').reverse().join('-')).getTime())
    } else if (fDataOrder === "antigo") {
      result = result.sort((a: any, b: any) => new Date(a.criadoEm.split('/').reverse().join('-')).getTime() - new Date(b.criadoEm.split('/').reverse().join('-')).getTime())
    }

    return result
  }, [userOrcamentos, search, fStatus, fValorOrder, fDataOrder])

  const vigentes = filtered.filter((o: any) => o.status === 'enviado').length
  const aprovados = filtered.filter((o: any) => o.status === 'aprovado').length
  const parados = filtered.filter((o: any) => o.status === 'rascunho' || o.status === 'recusado').length
  const totalValor = filtered.reduce((acc, obj: any) => acc + (obj.status !== 'recusado' ? obj.totalGeral : 0), 0)

  return (
    <AppShell>
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Orçamentos e Propostas</h1>
            <p className="text-sm text-muted-foreground mt-1">Funil de vendas e acompanhamento de propostas comerciais ativas.</p>
          </div>
          <Link href="/orcamentos/novo">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all hover:scale-[1.02]">
              <Plus className="size-4 mr-2" />
              Novo Orçamento
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className={`bg-gradient-to-br from-card to-card/50 border-border/50 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${!fStatus ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => setFStatus('')}
          >
            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none"><TrendingUp className="size-16" /></div>
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="size-4 text-primary" />Valor Total</p>
              <h2 className="text-2xl font-bold block truncate">{loading && orcamentosList?.length === 0 ? <Skeleton className="h-8 w-32" /> : formatCurrency(totalValor)}</h2>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-indigo-50 to-background dark:from-indigo-950/20 dark:to-background border-indigo-100 dark:border-indigo-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatus === 'enviado' ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => setFStatus(fStatus === 'enviado' ? '' : 'enviado')}
          >
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-2"><Clock className="size-4" />Vigentes</p>
              <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{loading && orcamentosList?.length === 0 ? <Skeleton className="h-8 w-12" /> : vigentes}</h2>
              <p className="text-xs text-indigo-500 font-medium">Aguardando</p>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatus === 'aprovado' ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => setFStatus(fStatus === 'aprovado' ? '' : 'aprovado')}
          >
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2"><CheckCircle2 className="size-4" />Aprovados</p>
              <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{loading && orcamentosList?.length === 0 ? <Skeleton className="h-8 w-12" /> : aprovados}</h2>
              <p className="text-xs text-emerald-500 font-medium">Ganhos recentes</p>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-rose-50 to-background dark:from-rose-950/20 dark:to-background border-rose-100 dark:border-rose-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${['rascunho', 'recusado'].includes(fStatus) ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => setFStatus(['rascunho', 'recusado'].includes(fStatus) ? '' : 'recusado')}
          >
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400 flex items-center gap-2"><AlertCircle className="size-4" />Parados</p>
              <h2 className="text-2xl font-bold text-rose-700 dark:text-rose-300">{loading && orcamentosList?.length === 0 ? <Skeleton className="h-8 w-12" /> : parados}</h2>
              <p className="text-xs text-rose-500 font-medium">Rascunho/Recusado</p>
            </CardContent>
          </Card>
        </div>

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
              <select className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs" value={fStatus} onChange={e => setFStatus(e.target.value)}>
                <option value="">Todos Status</option>
                <option value="rascunho">Rascunho</option>
                <option value="enviado">Vigente</option>
                <option value="aprovado">Aprovado</option>
                <option value="recusado">Recusado</option>
              </select>
              <select className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs" value={fValorOrder} onChange={e => setFValorOrder(e.target.value)}>
                <option value="">Ordenar Valor</option>
                <option value="maior">Maior</option>
                <option value="menor">Menor</option>
              </select>
              <select className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs" value={fDataOrder} onChange={e => setFDataOrder(e.target.value)}>
                <option value="">Ordenar Data</option>
                <option value="recente">Recentes</option>
                <option value="antigo">Antigos</option>
                <option value="mesAtual">Mês Atual</option>
                <option value="mesAnterior">Mês Anterior</option>
              </select>
              {(fStatus || fValorOrder || fDataOrder) && (
                <Button variant="ghost" size="sm" onClick={() => { setFStatus(""); setFValorOrder(""); setFDataOrder("") }} className="h-8 px-2 text-xs">Limpar</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Orçamento</TableHead><TableHead>Cliente</TableHead><TableHead className="hidden sm:table-cell text-center">Itens</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right pr-6">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading && orcamentosList?.length === 0 ? (
                    [1,2,3,4,5].map(i => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground"><p>Nenhum orçamento encontrado.</p></TableCell></TableRow>
                  ) : filtered.map((orc: any) => (
                    <TableRow key={orc.id} className="hover:bg-muted/10 transition-colors border-border/30 bg-card">
                      <TableCell><div className="flex flex-col"><span className="font-medium font-mono text-blue-500 text-[13px]">{orc.numero}</span><span className="text-[11px] text-muted-foreground">{orc.criadoEm}</span></div></TableCell>
                      <TableCell className="max-w-[200px]"><div className="font-medium text-[13px] text-foreground truncate">{orc.cliente?.razaoSocial}</div><div className="text-[11px] text-muted-foreground truncate font-mono font-normal">CNPJ: {orc.cliente?.cnpj}</div></TableCell>
                      <TableCell className="hidden sm:table-cell text-center"><Badge variant="outline" className="font-mono text-[10px]">{orc.itens.length}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="secondary" className={`${getStatusColor(orc.status)} font-medium`}>{formatStatus(orc.status)}</Badge></TableCell>
                      <TableCell className="text-right font-bold text-foreground text-[13px]">{formatCurrency(orc.totalGeral)}</TableCell>
                      <TableCell className="text-right pr-6"><Link href={`/orcamentos/${orc.id}`}><Button variant="ghost" size="sm" className="h-8 w-8 p-0 border border-border/50"><Eye className="size-4" /></Button></Link></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
