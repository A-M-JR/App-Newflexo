"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Edit2, UserCog, Power, Users, UserCheck, UserX, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { vendedores } from "@/lib/mock-data"
import { Vendedor } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { VendedorFormDialog } from "@/components/vendedor-form-dialog"
import { AppShell } from "@/components/app-shell"
import { Skeleton } from "@/components/ui/skeleton"

export default function VendedoresPage() {
  const { isAdmin, isLoading } = useAuth()
  const [vendedoresList, setVendedoresList] = useState<Vendedor[]>(vendedores.map(v => ({ ...v, ativo: v.ativo !== false })))
  const [showForm, setShowForm] = useState(false)
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null)
  const [fStatusFilter, setFStatusFilter] = useState<"todos" | "ativo" | "inativo">("todos")
  const [search, setSearch] = useState("")


  if (!isAdmin) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4 animate-in fade-in duration-200">
          <div className="bg-destructive/10 p-4 rounded-full">
            <UserCog className="size-10 text-destructive" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">Acesso Restrito</h2>
            <p className="text-muted-foreground">Apenas administradores podem gerenciar a equipe de vendedores.</p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="mt-2">
              <ArrowLeft className="size-4 mr-2" />
              Voltar ao Início
            </Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  const handleSaveVendedor = (vendedor: Vendedor) => {
    if (editingVendedor) {
      setVendedoresList(vendedoresList.map((v) => (v.id === vendedor.id ? vendedor : v)))
    } else {
      setVendedoresList([...vendedoresList, vendedor])
    }
    setEditingVendedor(null)
    setShowForm(false)
  }

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    const action = currentStatus ? "inativar" : "reativar"
    if (confirm(`Deseja realmente ${action} este vendedor? \nObs: Todos os relatórios ainda listarão os pedidos atrelados a ele.`)) {
      setVendedoresList(vendedoresList.map((v) => v.id === id ? { ...v, ativo: !currentStatus } : v))
    }
  }

  const handleEditVendedor = (vendedor: Vendedor) => {
    setEditingVendedor(vendedor)
    setShowForm(true)
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Vendedores</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie vendedores, comissões e regiões</p>
          </div>
          <Button
            onClick={() => {
              setEditingVendedor(null)
              setShowForm(true)
            }}
            size="lg"
            className="gap-2"
          >
            <Plus className="size-4" />
            Novo Vendedor
          </Button>
        </div>

        {/* KPI Filter Cards */}
        {(() => {
          const totalAtivos = vendedoresList.filter(v => v.ativo !== false).length;
          const totalInativos = vendedoresList.filter(v => v.ativo === false).length;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card
                className={`bg-gradient-to-br from-card to-card/50 border-border/50 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatusFilter === 'todos' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => setFStatusFilter('todos')}
              >
                <CardContent className="p-5 flex flex-col gap-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    Total de Vendedores
                  </p>
                  <h2 className="text-2xl font-bold text-foreground">{vendedoresList.length}</h2>
                  <p className="text-xs text-muted-foreground font-medium">Equipe comercial</p>
                </CardContent>
              </Card>

              <Card
                className={`bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatusFilter === 'ativo' ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => setFStatusFilter(fStatusFilter === 'ativo' ? 'todos' : 'ativo')}
              >
                <CardContent className="p-5 flex flex-col gap-1">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <UserCheck className="size-4" />
                    Ativos
                  </p>
                  <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{totalAtivos}</h2>
                  <p className="text-xs text-emerald-500 font-medium">Vendendo ativamente</p>
                </CardContent>
              </Card>

              <Card
                className={`bg-gradient-to-br from-red-50 to-background dark:from-red-950/20 dark:to-background border-red-100 dark:border-red-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatusFilter === 'inativo' ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => setFStatusFilter(fStatusFilter === 'inativo' ? 'todos' : 'inativo')}
              >
                <CardContent className="p-5 flex flex-col gap-1">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                    <UserX className="size-4" />
                    Pausados
                  </p>
                  <h2 className="text-2xl font-bold text-red-700 dark:text-red-300">{totalInativos}</h2>
                  <p className="text-xs text-red-500 font-medium">Operações suspensas</p>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Form Dialog */}
        {showForm && (
          <VendedorFormDialog
            vendedor={editingVendedor}
            onSave={handleSaveVendedor}
            onClose={() => {
              setShowForm(false)
              setEditingVendedor(null)
            }}
          />
        )}

        {/* Sellers Table */}
        <Card className="overflow-hidden border-border/50 shadow-sm">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background focus-visible:bg-background border-border"
                />
              </div>
              {(fStatusFilter !== 'todos' || search) && (
                <Button variant="ghost" size="sm" onClick={() => { setFStatusFilter('todos'); setSearch('') }} className="h-8 px-3 text-xs">
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Comissão
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Região
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {vendedoresList.filter(v => {
                  const term = search.toLowerCase();
                  const matchSearch = !search || v.nome.toLowerCase().includes(term) || v.email.toLowerCase().includes(term);
                  if (!matchSearch) return false;
                  if (fStatusFilter === 'ativo') return v.ativo !== false;
                  if (fStatusFilter === 'inativo') return v.ativo === false;
                  return true;
                }).map((vendedor) => {
                  const isActive = vendedor.ativo !== false;
                  return (
                    <tr key={vendedor.id} className={`hover:bg-muted/30 transition-colors ${!isActive ? "opacity-60 bg-muted/50" : ""}`}>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{vendedor.nome}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{vendedor.email}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{vendedor.telefone}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">{vendedor.comissao}%</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{vendedor.regiao}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-2 w-2 rounded-full ${isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-destructive"}`}></span>
                          <span className={`text-xs font-medium ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                            {isActive ? "Ativo" : "Pausado"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditVendedor(vendedor)}
                            title="Editar Vendedor"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10"
                          >
                            <Edit2 className="size-[15px]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(vendedor.id, isActive)}
                            title={isActive ? "Pausar Vendedor" : "Ativar Vendedor"}
                            className={`h-8 w-8 p-0 transition-colors ${isActive ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10" : "text-destructive hover:text-emerald-600 hover:bg-emerald-500/10"}`}
                          >
                            <Power className="size-[15px]" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Empty State */}
        {vendedoresList.length === 0 && (
          <Card className="p-12 text-center border-dashed border-2 shadow-none">
            <div className="flex flex-col items-center justify-center gap-2">
              <UserCog className="size-8 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum vendedor cadastrado. Crie o primeiro vendedor para começar.</p>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
