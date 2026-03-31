"use client"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Building2, MapPin, Contact, FileText, Factory } from "lucide-react"
import { formatCurrency } from "@/lib/mock-data"
import { StatusBadge } from "@/components/ui/status-badge"
import { getClienteById, saveCliente } from "@/lib/actions/clientes"
import Link from "next/link"
import { use, useState, useEffect } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Helpers para Mascaras
const maskCNPJ = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .substring(0, 18)
}

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{4,5})(\d{4})/, "$1-$2")
    .substring(0, 15)
}

const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{5})(\d)/, "$1-$2")
    .substring(0, 9)
}

const maskUF = (value: string) => {
  return value.replace(/[^A-Za-z]/g, "").toUpperCase().substring(0, 2)
}

export default function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  
  const [clienteOrig, setClienteOrig] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    razaoSocial: "",
    cnpj: "",
    ie: "",
    telefone: "",
    email: "",
    cep: "",
    endereco: "",
    numero: "",
    cidade: "",
    estado: "",
    observacoes: ""
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    getClienteById(Number(id)).then(data => {
      if (data) {
        setClienteOrig(data)
        setFormData({
          razaoSocial: data.razaoSocial || "",
          cnpj: data.cnpj || "",
          ie: data.ie || "",
          telefone: data.telefone || "",
          email: data.email || "",
          cep: data.cep || "",
          endereco: data.endereco || "",
          numero: "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          observacoes: data.observacoes || ""
        })
      }
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <p className="text-muted-foreground">Carregando dados do cliente...</p>
        </div>
      </AppShell>
    )
  }

  if (!clienteOrig) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Cliente não encontrado.</p>
          <Link href="/clientes">
            <Button variant="outline" className="mt-4">Voltar</Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  const clienteOrcamentos = clienteOrig.orcamentos || []
  const clientePedidos = clienteOrig.pedidos || []

  const fetchCNPJ = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, "")
    if (cleanCnpj.length !== 14) return

    const loadingId = toast.loading("Verificando CNPJ na Receita Federal...")

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`)
      const data = await res.json()

      if (res.ok) {
        setFormData(prev => ({
          ...prev,
          razaoSocial: data.razao_social || data.nome_fantasia || prev.razaoSocial,
          cep: data.cep ? maskCEP(data.cep.toString()) : prev.cep,
          endereco: data.logradouro || prev.endereco,
          numero: data.numero || prev.numero,
          cidade: data.municipio || prev.cidade,
          estado: data.uf || prev.estado,
          telefone: data.ddd_telefone_1 ? maskPhone(data.ddd_telefone_1.toString()) : prev.telefone,
          email: data.email || prev.email,
        }))
        setErrors(prev => ({
          ...prev, razaoSocial: "", cep: "", cidade: "", estado: "", telefone: ""
        }))
        toast.success("Dados da Receita atualizados no formulário!", { id: loadingId })
      } else {
        toast.error("CNPJ não encontrado na base da Receita.", { id: loadingId })
      }
    } catch (error) {
      console.error("Erro ao buscar CNPJ:", error)
      toast.error("Falha ao comunicar com a Receita Federal.", { id: loadingId })
    }
  }

  const fetchCEP = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "")
    if (cleanCep.length !== 8) return

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await res.json()

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro ? `${data.logradouro}${data.bairro ? ` - ${data.bairro}` : ""}` : prev.endereco,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }))
        setErrors(prev => ({ ...prev, cidade: "", estado: "" }))
        toast.success("Endereço encontrado e autocompletado!")
      } else {
        toast.error("CEP não encontrado na base dos Correios.")
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error)
      toast.error("Falha ao buscar CEP. Verifique sua conexão.")
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target

    if (name === "cnpj") {
      value = maskCNPJ(value)
      if (value.length === 18) {
        fetchCNPJ(value)
      }
    }
    if (name === "telefone") value = maskPhone(value)
    if (name === "cep") {
      value = maskCEP(value)
      if (value.length === 9) {
        fetchCEP(value)
      }
    }
    if (name === "estado") value = maskUF(value)

    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    const newErrors: Record<string, string> = {}

    if (!formData.razaoSocial) newErrors.razaoSocial = "Razão Social é obrigatória"
    if (!formData.cnpj) newErrors.cnpj = "CNPJ é obrigatório"
    if (!formData.telefone) newErrors.telefone = "Telefone é obrigatório"
    if (!formData.cidade) newErrors.cidade = "Cidade é obrigatória"
    if (!formData.estado) newErrors.estado = "UF é obrigatório"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    setIsSaving(true)
    try {
      await saveCliente({ id: Number(id), ...formData })
      toast.success("Cliente atualizado com sucesso!", {
        description: `Os dados de ${formData.razaoSocial} foram salvos.`
      })
      router.push("/clientes")
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error("Erro ao atualizar o cliente no banco de dados.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppShell>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/clientes">
              <Button type="button" variant="outline" size="icon" className="size-8 rounded-full shadow-sm hover:bg-muted">
                <ArrowLeft className="size-4" />
                <span className="sr-only">Voltar</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Editar Cliente</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Cliente desde {clienteOrig.criadoEm ? new Date(clienteOrig.criadoEm).toLocaleDateString("pt-BR") : "Desconhecido"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button type="button" variant="ghost" asChild>
              <Link href="/clientes">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground shadow-sm hover:scale-[1.02] transition-transform">
              {isSaving ? "Salvando..." : (
                <>
                  <Save className="size-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* Coluna de Edicao (Esquerda) */}
          <div className="xl:col-span-7 flex flex-col gap-6">

            {/* Secao Empresa */}
            <Card className="shadow-sm border-border/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Building2 className="size-32" />
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <Building2 className="size-4" />
                  <h3>Dados da Empresa</h3>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="razaoSocial" className={errors.razaoSocial ? "text-destructive" : ""}>Razão Social *</Label>
                  <Input
                    id="razaoSocial" name="razaoSocial" value={formData.razaoSocial} onChange={handleChange}
                    className={`bg-muted/30 focus-visible:bg-background ${errors.razaoSocial ? "border-destructive" : ""}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj" className={errors.cnpj ? "text-destructive" : ""}>CNPJ *</Label>
                  <Input
                    id="cnpj" name="cnpj" value={formData.cnpj} onChange={handleChange} maxLength={18}
                    className={`bg-muted/30 focus-visible:bg-background ${errors.cnpj ? "border-destructive" : ""}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ie">Inscrição Estadual</Label>
                  <Input
                    id="ie" name="ie" value={formData.ie} onChange={handleChange}
                    className="bg-muted/30 focus-visible:bg-background"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Secao Endereco */}
            <Card className="shadow-sm border-border/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <MapPin className="size-32" />
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <MapPin className="size-4" />
                  <h3>Endereço</h3>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-12">
                <div className="sm:col-span-4 space-y-2">
                  <Label htmlFor="cep">CEP *</Label>
                  <Input id="cep" name="cep" value={formData.cep} onChange={handleChange} maxLength={9} className="bg-muted/30" />
                </div>
                <div className="sm:col-span-8 space-y-2">
                  <Label htmlFor="endereco">Logradouro / Rua</Label>
                  <Input id="endereco" name="endereco" value={formData.endereco} onChange={handleChange} className="bg-muted/30" />
                </div>
                <div className="sm:col-span-3 space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" name="numero" value={formData.numero} onChange={handleChange} className="bg-muted/30" />
                </div>
                <div className="sm:col-span-6 space-y-2">
                  <Label htmlFor="cidade" className={errors.cidade ? "text-destructive" : ""}>Cidade *</Label>
                  <Input id="cidade" name="cidade" value={formData.cidade} onChange={handleChange} className={`bg-muted/30 ${errors.cidade ? "border-destructive" : ""}`} />
                </div>
                <div className="sm:col-span-3 space-y-2">
                  <Label htmlFor="estado">UF *</Label>
                  <Input id="estado" name="estado" value={formData.estado} onChange={handleChange} maxLength={2} className="bg-muted/30 uppercase" />
                </div>
              </CardContent>
            </Card>

            {/* Contato & Obs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="shadow-sm border-border/50">
                <CardHeader className="pb-4 text-primary font-medium flex-row gap-2 items-center">
                  <Contact className="size-4" /> Contato
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone Principal *</Label>
                    <Input id="telefone" name="telefone" value={formData.telefone} onChange={handleChange} maxLength={15} className="bg-muted/30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="bg-muted/30" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50">
                <CardHeader className="pb-4 font-medium flex-row gap-2 items-center">
                  Observações Adicionais
                </CardHeader>
                <CardContent>
                  <Textarea
                    name="observacoes" value={formData.observacoes} onChange={handleChange}
                    className="min-h-[135px] bg-muted/30 resize-none"
                  />
                </CardContent>
              </Card>
            </div>

          </div>

          {/* Coluna de Historico (Direita) */}
          <div className="xl:col-span-5 flex flex-col gap-6">

            {/* Metricas Rapidas */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-primary/5 border-primary/10">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="text-4xl font-black text-primary">{clienteOrcamentos.length}</div>
                  <p className="text-xs font-medium text-primary/70 uppercase tracking-widest mt-1">Orçamentos</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/5 border-blue-500/10">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="text-4xl font-black text-blue-600">{clientePedidos.length}</div>
                  <p className="text-xs font-medium text-blue-600/70 uppercase tracking-widest mt-1">Pedidos</p>
                </CardContent>
              </Card>
            </div>

            {/* Lista Orcamentos */}
            <Card className="flex-1 shadow-sm border-border/50 flex flex-col">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-base text-primary">
                  <FileText className="size-4" /> Últimos Orçamentos
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-auto max-h-[300px]">
                {clienteOrcamentos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum orçamento.</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {clienteOrcamentos.map((orc: any) => (
                      <Link
                        key={orc.id}
                        href={`/orcamentos/${orc.id}`}
                        className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium group-hover:text-primary transition-colors">{orc.numero}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            {orc.criadoEm ? new Date(orc.criadoEm).toLocaleDateString('pt-BR') : 'N/D'}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-sm font-bold text-foreground">{formatCurrency(orc.totalGeral)}</span>
                          <StatusBadge statusObj={orc.statusObj} fallback={orc.status} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lista Pedidos */}
            <Card className="flex-1 shadow-sm border-border/50 flex flex-col">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-base text-blue-600">
                  <Factory className="size-4" /> Últimos Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-auto max-h-[300px]">
                {clientePedidos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido de produção.</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {clientePedidos.map((ped: any) => (
                      <Link
                        key={ped.id}
                        href={`/pedidos/${ped.id}`}
                        className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium group-hover:text-blue-600 transition-colors">{ped.numero}</span>
                          <span className="text-xs text-muted-foreground">Prazo: {ped.prazoEntrega}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-sm font-bold text-foreground">{formatCurrency(ped.totalGeral)}</span>
                          <StatusBadge statusObj={ped.statusObj} fallback={ped.status} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </form>
    </AppShell>
  )
}
