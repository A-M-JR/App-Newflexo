"use client"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Search, Eye, Clock, Users, FileText, Factory, ArrowUpRight, DollarSign } from "lucide-react"
import { pedidos, clientes, orcamentos, vendedores, formatCurrency, formatStatus, getStatusColor } from "@/lib/mock-data"
import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"

const chartData = [
  { name: "Jan", orcamentos: 45, conversoes: 24 },
  { name: "Fev", orcamentos: 38, conversoes: 18 },
  { name: "Mar", orcamentos: 30, conversoes: 12 },
  { name: "Abr", orcamentos: 41, conversoes: 22 },
  { name: "Mai", orcamentos: 34, conversoes: 19 },
  { name: "Jun", orcamentos: 52, conversoes: 33 },
]

export default function DashboardPage() {
  const [search, setSearch] = useState("")
  const { isVendedor, vendedor } = useAuth()

  // Filter by current user if vendedor, show all if admin
  const userPedidos = isVendedor && vendedor ? pedidos.filter((p) => p.vendedorId === vendedor.id) : pedidos

  const filtered = userPedidos.filter((p) => {
    const cliente = clientes.find((c) => c.id === p.clienteId)
    const vend = vendedores.find((v) => v.id === p.vendedorId)
    const term = search.toLowerCase()
    return (
      p.numero.toLowerCase().includes(term) ||
      cliente?.razaoSocial.toLowerCase().includes(term) ||
      p.status.includes(term) ||
      vend?.nome.toLowerCase().includes(term)
    )
  })

  // Basic Metrics
  const totalReceita = userPedidos.reduce((acc, ped) => acc + (ped.totalGeral || 0), 0)
  const ativos = userPedidos.filter(p => p.status === 'em_producao').length
  const totalOrcamentos = orcamentos.length

  // Clientes Inativos (+40 dias sem compra)
  const quarentaDiasAtras = new Date()
  quarentaDiasAtras.setDate(quarentaDiasAtras.getDate() - 40)

  const clientesInativos = clientes.filter(c => {
    if (!c.ultimaCompra) return false
    const dataUltimaCompra = new Date(c.ultimaCompra)
    return dataUltimaCompra < quarentaDiasAtras
  })

  return (
    <AppShell>
      <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header Section */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Lista principal de requisições e acompanhamento de faturamento.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild className="shadow-sm">
              <Link href="/orcamentos/novo">Novo Orçamento</Link>
            </Button>
          </div>
        </div>

        {/* Global Search and Pedidos Table */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Todos os Pedidos</CardTitle>
              <CardDescription>Busque e gerencie a lista completa de pedidos</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-muted/50 focus-visible:bg-background border-border"
                />
              </div>
            </div>
            <div className="rounded-md border border-border/50 overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Número</TableHead>
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold">Vendedor</TableHead>
                    <TableHead className="hidden lg:table-cell font-semibold">Prazo</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                    <TableHead className="text-center font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ped) => {
                    const cliente = clientes.find((c) => c.id === ped.clienteId)
                    return (
                      <TableRow key={ped.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                          {ped.numero}
                        </TableCell>
                        <TableCell className="text-foreground max-w-[200px] truncate font-medium">
                          {cliente?.razaoSocial}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {vendedores.find(v => v.id === ped.vendedorId)?.nome || '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="size-3" />
                            {ped.prazoEntrega}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatCurrency(ped.totalGeral)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className={`${getStatusColor(ped.status)} shadow-none`}>
                            {formatStatus(ped.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/pedidos/${ped.id}`}>
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                              <Eye className="size-4" />
                              <span className="sr-only">Ver detalhes</span>
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Nenhum pedido encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Footer Statistics */}
        <div className="pt-2">
          <h2 className="text-lg font-bold tracking-tight text-foreground mb-4">Estatísticas e Resumo</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:shadow-md hover:border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Estimado</CardTitle>
                <div className="p-2 bg-primary/10 rounded-full">
                  <DollarSign className="size-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalReceita)}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ArrowUpRight className="size-3 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">+14.2%</span> no período
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:shadow-md hover:border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos Ativos</CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-full">
                  <Factory className="size-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ativos}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Produzindo atualmente
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:shadow-md hover:border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Orçamentos Totais</CardTitle>
                <div className="p-2 bg-amber-500/10 rounded-full">
                  <FileText className="size-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrcamentos}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Aguardando aprovação
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:shadow-md hover:border-orange-500/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Aviso de Inatividade</CardTitle>
                <div className="p-2 bg-orange-500/10 rounded-full">
                  <Users className="size-4 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">{clientesInativos.length} clientes</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sem comprar há +40 dias
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 mt-4">
            {/* Gráfico de Conversão */}
            <Card className="shadow-sm border-border/50">
              <CardHeader>
                <CardTitle>Evolução e Conversão</CardTitle>
                <CardDescription>
                  Orçamentos Criados vs Pedidos Fechados (Mensal)
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                      />
                      <Tooltip
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '8px',
                          color: '#0f172a',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                        }}
                        itemStyle={{ color: '#0f172a', fontWeight: 500 }}
                        labelStyle={{ color: '#64748b', marginBottom: '8px', fontWeight: 600 }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "10px" }} />
                      <Bar
                        dataKey="orcamentos"
                        name="Orçamentos Gerados"
                        fill="#94a3b8"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                      <Bar
                        dataKey="conversoes"
                        name="Conversões Fechadas"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Painel Follow-Up (+40 dias) */}
            <Card className="shadow-sm border-border/50 flex flex-col border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-orange-500/10 to-transparent">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-orange-600 dark:text-orange-500 text-base">Alerta de Follow-up (Retenção)</CardTitle>
                  <CardDescription>Clientes há mais de 40 dias sem orçar/comprar</CardDescription>
                </div>
                <Users className="size-4 text-orange-500" />
              </CardHeader>
              <CardContent className="flex-1 overflow-auto pt-4 max-h-[300px]">
                <div className="space-y-4 pr-2">
                  {clientesInativos.length > 0 ? clientesInativos.map(cliente => {
                    const dataCompra = new Date(cliente.ultimaCompra!)
                    const diasInt = Math.floor((new Date().getTime() - dataCompra.getTime()) / (1000 * 3600 * 24))
                    return (
                      <div key={cliente.id} className="flex items-center justify-between gap-4 py-2 border-b border-border/50 last:border-0 hover:bg-muted/30 p-2 rounded-md transition-colors">
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium tracking-tight truncate">{cliente.razaoSocial}</span>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                            <Clock className="size-3" />
                            <span>Última Compra: {dataCompra.toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-orange-600 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950 text-[10px] whitespace-nowrap">
                          {diasInt} dias
                        </Badge>
                      </div>
                    )
                  }) : (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      Todos os clientes estão com compras ativas em menos de 40 dias! 🎉
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </AppShell>
  )
}
