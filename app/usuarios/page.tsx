"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Edit2, KeyRound, Power, Users, UserCheck, UserX, ShieldCheck, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { users, vendedores, getVendedorById } from "@/lib/mock-data"
import { User } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { UsuarioFormDialog } from "@/components/usuario-form-dialog"
import { AppShell } from "@/components/app-shell"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

export default function UsuariosPage() {
  const { isAdmin, isLoading } = useAuth()
  const [usuariosList, setUsuariosList] = useState<User[]>(users.map(u => ({ ...u, ativo: u.ativo !== false })))
  const [showForm, setShowForm] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<User | null>(null)
  const [fStatusFilter, setFStatusFilter] = useState<"todos" | "ativo" | "inativo">("todos")
  const [search, setSearch] = useState("")

  // Password Change State
  const [passwordUser, setPasswordUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState("")


  if (!isAdmin) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4 animate-in fade-in duration-200">
          <div className="bg-destructive/10 p-4 rounded-full">
            <ShieldCheck className="size-10 text-destructive" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">Acesso Restrito</h2>
            <p className="text-muted-foreground">Você não tem permissão para acessar a gestão de usuários.</p>
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

  const handleSaveUsuario = (usuario: User) => {
    if (editingUsuario) {
      setUsuariosList(usuariosList.map((u) => (u.id === usuario.id ? usuario : u)))
    } else {
      setUsuariosList([...usuariosList, usuario])
    }
    setEditingUsuario(null)
    setShowForm(false)
  }

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    const action = currentStatus ? "inativar" : "reativar"
    if (confirm(`Deseja realmente ${action} este acesso? O usuário ${currentStatus ? "perderá" : "recuperará"} o acesso ao sistema imediatamente.`)) {
      setUsuariosList(usuariosList.map((u) => u.id === id ? { ...u, ativo: !currentStatus } : u))
    }
  }

  const handleEditUsuario = (usuario: User) => {
    setEditingUsuario(usuario)
    setShowForm(true)
  }

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      toast.error("Erro na Senha", {
        description: "A senha deve ter pelo menos 6 caracteres"
      })
      return
    }
    // Lógica para salvar a senha no backend ficaria aqui
    toast.success("Senha Redefinida", {
      description: `Senha do usuário ${passwordUser?.nome} atualizada com sucesso!`
    })
    setPasswordUser(null)
    setNewPassword("")
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Usuários</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie usuários, funções e acessos do sistema</p>
          </div>
          <Button
            onClick={() => {
              setEditingUsuario(null)
              setShowForm(true)
            }}
            size="lg"
            className="gap-2"
          >
            <Plus className="size-4" />
            Novo Usuário
          </Button>
        </div>

        {/* KPI Filter Cards */}
        {(() => {
          const totalAtivos = usuariosList.filter(u => u.ativo !== false).length;
          const totalInativos = usuariosList.filter(u => u.ativo === false).length;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card
                className={`bg-gradient-to-br from-card to-card/50 border-border/50 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatusFilter === 'todos' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => setFStatusFilter('todos')}
              >
                <CardContent className="p-5 flex flex-col gap-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    Total de Usuários
                  </p>
                  <h2 className="text-2xl font-bold text-foreground">{usuariosList.length}</h2>
                  <p className="text-xs text-muted-foreground font-medium">Base completa</p>
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
                  <p className="text-xs text-emerald-500 font-medium">Com acesso liberado</p>
                </CardContent>
              </Card>

              <Card
                className={`bg-gradient-to-br from-red-50 to-background dark:from-red-950/20 dark:to-background border-red-100 dark:border-red-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${fStatusFilter === 'inativo' ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => setFStatusFilter(fStatusFilter === 'inativo' ? 'todos' : 'inativo')}
              >
                <CardContent className="p-5 flex flex-col gap-1">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                    <UserX className="size-4" />
                    Bloqueados
                  </p>
                  <h2 className="text-2xl font-bold text-red-700 dark:text-red-300">{totalInativos}</h2>
                  <p className="text-xs text-red-500 font-medium">Acesso suspenso</p>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Form Dialog */}
        {showForm && (
          <UsuarioFormDialog
            usuario={editingUsuario}
            onSave={handleSaveUsuario}
            onClose={() => {
              setShowForm(false)
              setEditingUsuario(null)
            }}
          />
        )}

        {/* Users Table */}
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
                    Nome / Acesso
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Função
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
                {usuariosList.filter(u => {
                  const term = search.toLowerCase();
                  const matchSearch = !search || u.nome.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
                  if (!matchSearch) return false;
                  if (fStatusFilter === 'ativo') return u.ativo !== false;
                  if (fStatusFilter === 'inativo') return u.ativo === false;
                  return true;
                }).map((usuario) => {
                  const vendedor = usuario.vendedorId ? getVendedorById(usuario.vendedorId) : null
                  const isActive = usuario.ativo !== false;
                  return (
                    <tr key={usuario.id} className={`hover:bg-muted/30 transition-colors ${!isActive ? "opacity-60 bg-muted/50" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">{usuario.nome}</span>
                          {usuario.role === "vendedor" && vendedor && (
                            <span className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px] truncate" title={`Vinculado a: ${vendedor.nome}`}>
                              🔗 Perfil Vendas: {vendedor.nome}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{usuario.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${usuario.role === "admin"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-500 border border-blue-500/20"
                            }`}
                        >
                          {usuario.role === "admin" ? "Administrador" : "Acesso Vendedor"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-2 w-2 rounded-full ${isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-destructive"}`}></span>
                          <span className={`text-xs font-medium ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                            {isActive ? "Ativo" : "Bloqueado"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPasswordUser(usuario)}
                            title="Redefinir Senha"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10"
                          >
                            <KeyRound className="size-[15px]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUsuario(usuario)}
                            title="Editar Usuário"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10"
                          >
                            <Edit2 className="size-[15px]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(usuario.id, isActive)}
                            title={isActive ? "Bloquear Acesso" : "Desbloquear Acesso"}
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
        {usuariosList.length === 0 && (
          <Card className="p-12 text-center border-dashed border-2 shadow-none">
            <div className="flex flex-col items-center justify-center gap-2">
              <Users className="size-8 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum usuário cadastrado em sua base.</p>
            </div>
          </Card>
        )}

        {/* Change Password Dialog */}
        <Dialog open={!!passwordUser} onOpenChange={(open) => !open && setPasswordUser(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Redefinir Senha de Acesso</DialogTitle>
              <DialogDescription>
                Insira a nova senha para o usuário <span className="font-semibold text-foreground">{passwordUser?.nome}</span>.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSavePassword}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="text"
                    placeholder="Mínimo de 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-muted/50 focus-visible:bg-background"
                    autoComplete="off"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setPasswordUser(null)
                  setNewPassword("")
                }}>
                  Cancelar
                </Button>
                <Button type="submit">Atualizar Senha</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
