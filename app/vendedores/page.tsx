"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Edit2, UserCog, Power, Users, UserCheck, UserX, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Vendedor } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { getVendedores, saveVendedor, toggleVendedorActive } from "@/lib/actions/vendedores"
import { VendedorFormDialog } from "@/components/vendedor-form-dialog"
import { AppShell } from "@/components/app-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"

export default function VendedoresPage() {
  const { isAdmin, isLoading: isAuthLoading } = useAuth()
  const [vendedoresList, setVendedoresList] = useState<Vendedor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null)
  const [fStatusFilter, setFStatusFilter] = useState<"todos" | "ativo" | "inativo">("todos")
  const [search, setSearch] = useState("")
  const [kpis, setKpis] = useState({ total: 0, ativos: 0, pausados: 0 })
  const [toggleWarning, setToggleWarning] = useState<{ id: number; currentStatus: boolean; nome: string } | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const res = await getVendedores({ search, status: fStatusFilter, mode: 'full' })
      if (res && 'data' in res) {
        setVendedoresList(res.data)
        setKpis(res.kpis || { total: 0, ativos: 0, pausados: 0 })
      }
    } catch (error) {
      console.error("Erro ao carregar vendedores:", error)
      toast.error("Erro ao carregar dados do banco.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, fStatusFilter])

  if (isAuthLoading) {
    return <AppShell><div className="p-8"><Skeleton className="h-40 w-full" /></div></AppShell>
  }

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

  const handleSaveVendedor = async (vendedor: Vendedor) => {
    try {
      await saveVendedor(vendedor)
      await loadData()
      toast.success(editingVendedor ? "Vendedor atualizado" : "Vendedor cadastrado")
      setEditingVendedor(null)
      setShowForm(false)
    } catch (error) {
      console.error("Erro ao salvar vendedor:", error)
      toast.error("Erro ao salvar no banco de dados.")
    }
  }

  const handleToggleActive = (id: number, currentStatus: boolean, nome: string) => {
    setToggleWarning({ id, currentStatus, nome })
  }

  const confirmToggleActive = async () => {
    if (!toggleWarning) return
    const { id, currentStatus, nome } = toggleWarning
    const actionState = currentStatus ? "inativado" : "reativado"
    
    try {
      await toggleVendedorActive(id)
      await loadData()
      toast.success("Status Atualizado!", {
        description: `O vendedor(a) ${nome} foi ${actionState} no sistema com sucesso.`,
      })
    } catch (error) {
      console.error("Erro ao alterar status:", error)
      toast.error("Erro ao atualizar status no servidor.")
    } finally {
      setToggleWarning(null)
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
              <h2 className="text-2xl font-bold text-foreground">{kpis.total}</h2>
              <p className="text-xs text-muted-foreground font-medium">Equipe comercial</p>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatusFilter === 'ativo' ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => setFStatusFilter('ativo')}
          >
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <UserCheck className="size-4" />
                Ativos
              </p>
              <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{kpis.ativos}</h2>
              <p className="text-xs text-emerald-500 font-medium">Vendendo ativamente</p>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-red-50 to-background dark:from-red-950/20 dark:to-background border-red-100 dark:border-red-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatusFilter === 'inativo' ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => setFStatusFilter('inativo')}
          >
            <CardContent className="p-5 flex flex-col gap-1">
              <p className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                <UserX className="size-4" />
                Pausados
              </p>
              <h2 className="text-2xl font-bold text-red-700 dark:text-red-300">{kpis.pausados}</h2>
              <p className="text-xs text-red-500 font-medium">Operações suspensas</p>
            </CardContent>
          </Card>
        </div>

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

        {/* Status AlertDialog */}
        <AlertDialog open={!!toggleWarning} onOpenChange={(open) => !open && setToggleWarning(null)}>
          <AlertDialogContent className="sm:max-w-md border-border/50 shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Power className={`size-5 ${toggleWarning?.currentStatus ? "text-destructive" : "text-emerald-500"}`} />
                Confirmar Ação
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                Tem certeza que deseja <strong>{toggleWarning?.currentStatus ? "inativar" : "reativar"}</strong> o vendedor(a) <span className="font-semibold text-foreground">{toggleWarning?.nome}</span>?
                <br /><br />
                {toggleWarning?.currentStatus 
                  ? "Ao inativar, a pessoa não poderá mais acessar o sistema e nem aparecerá como opção em novos orçamentos. Históricos e relatórios antigos continuarão intactos." 
                  : "Ao reativar, a pessoa voltará a ter acesso normal ao sistema e voltará a aparecer nos cadastros de orçamentos."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="hover:bg-muted">Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmToggleActive} 
                className={toggleWarning?.currentStatus ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"}
              >
                {toggleWarning?.currentStatus ? "Sim, Inativar Vendedor" : "Sim, Reativar Vendedor"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                  autoComplete="off"
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
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/30">
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                  <TableHead className="text-center">Comissão</TableHead>
                  <TableHead className="hidden lg:table-cell">Região</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && vendedoresList.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground"><div className="flex justify-center items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div> Carregando dados...</div></TableCell></TableRow>
                ) : vendedoresList.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground"><div className="flex flex-col items-center justify-center gap-2"><UserCog className="size-8 opacity-20" /><p>Nenhum vendedor cadastrado. Crie o primeiro vendedor para começar.</p></div></TableCell></TableRow>
                ) : vendedoresList.map((vendedor) => {
                  const isActive = vendedor.ativo !== false;
                  return (
                    <TableRow
                      key={vendedor.id}
                      onClick={() => handleEditVendedor(vendedor)}
                      className={`hover:bg-muted/30 transition-colors border-border/30 bg-card cursor-pointer ${!isActive ? "opacity-60 bg-muted/50" : ""}`}
                    >
                      <TableCell className="text-[13px] font-medium text-foreground">{vendedor.nome}</TableCell>
                      <TableCell className="hidden md:table-cell text-[12px] text-muted-foreground">{vendedor.email}</TableCell>
                      <TableCell className="hidden lg:table-cell text-[12px] text-muted-foreground">{vendedor.telefone}</TableCell>
                      <TableCell className="text-center text-[13px] font-semibold text-foreground">{vendedor.comissao}%</TableCell>
                      <TableCell className="hidden lg:table-cell text-[12px] text-muted-foreground">{vendedor.regiao}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`flex h-2 w-2 rounded-full ${isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-destructive"}`}></span>
                          <span className={`text-xs font-medium ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                            {isActive ? "Ativo" : "Pausado"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
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
                            onClick={() => handleToggleActive(vendedor.id, isActive, vendedor.nome)}
                            title={isActive ? "Pausar Vendedor" : "Ativar Vendedor"}
                            className={`h-8 w-8 p-0 transition-colors ${isActive ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10" : "text-destructive hover:text-emerald-600 hover:bg-emerald-500/10"}`}
                          >
                            <Power className="size-[15px]" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

      </div>
    </AppShell>
  )
}
