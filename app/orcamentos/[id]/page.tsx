"use client"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, ArrowRight, Printer, MapPin, Building2, Tag, Edit, Save, Trash2, Calculator, CheckCircle2 } from "lucide-react"
import {
  orcamentos,
  clientes,
  pedidos,
  formatCurrency,
  formatStatus,
  getStatusColor,
  getVendedorById,
} from "@/lib/mock-data"
import Link from "next/link"
import { toast } from "sonner"
import { use, useState, useEffect } from "react"
import { PDFDownloadQuotationButton } from "@/components/pdf-download-quotation-button"

export default function OrcamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const orcamento = orcamentos.find((o) => o.id === id)

  if (!orcamento) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Orcamento nao encontrado.</p>
          <Link href="/orcamentos">
            <Button variant="outline" className="mt-4">Voltar</Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  const cliente = clientes.find((c) => c.id === orcamento.clienteId)
  const pedidoExistente = pedidos.find((p) => p.orcamentoId === orcamento.id)
  const vendedor = getVendedorById(orcamento.vendedorId)

  // Modos de Edição
  const [isEditing, setIsEditing] = useState(false)

  // Estado Local para Edição
  const [status, setStatus] = useState<string>(orcamento.status)
  const [observacoes, setObservacoes] = useState(orcamento.observacoes || "")
  const [itens, setItens] = useState(orcamento.itens.map(i => ({ ...i, observacao: "" })))

  // Totalizador dinâmico na edição
  const totalGeral = itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0)

  useEffect(() => {
    // Sincroniza se trocar de orçamento
    setStatus(orcamento.status)
    setObservacoes(orcamento.observacoes || "")
    setItens(orcamento.itens.map(i => ({ ...i, observacao: "" })))
  }, [orcamento])

  function handleConverterPedido() {
    if (pedidoExistente) {
      toast.info("Ja existe um pedido para este orcamento.", {
        description: pedidoExistente.numero,
      })
    } else {
      toast.success("Pedido de producao criado com sucesso!", {
        description: `Orcamento ${orcamento!.numero} convertido em pedido.`,
      })
    }
  }

  function handleSalvarEdicao() {
    setIsEditing(false)
    toast.success("Orçamento atualizado!", {
      description: "As alterações foram salvas com sucesso no banco de dados."
    })
  }

  function atualizarItem(id: string, field: keyof typeof itens[0], value: string | number) {
    setItens(itens.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  function removerItem(id: string) {
    if (itens.length === 1) {
      toast.error("O orçamento deve ter pelo menos 1 item.")
      return
    }
    setItens(itens.filter(i => i.id !== id))
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm relative overflow-hidden">
          {/* Subtle background gradient based on status */}
          <div className={`absolute inset-0 opacity-5 pointer-events-none ${status === 'aprovado' ? 'bg-emerald-500' :
            status === 'enviado' ? 'bg-indigo-500' :
              status === 'recusado' ? 'bg-rose-500' : 'bg-slate-500'
            }`} />

          <div className="flex items-center gap-4 relative z-10">
            <Link href="/orcamentos">
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Proposta #{orcamento.numero}
                </h1>
                {!isEditing ? (
                  <Badge variant="secondary" className={`${getStatusColor(status)} shadow-sm px-3 py-1 text-xs uppercase tracking-wider`}>
                    {formatStatus(status)}
                  </Badge>
                ) : (
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-8 w-[140px] text-xs font-bold border-primary bg-primary/10 text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="enviado">Vigente (Enviado)</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="recusado">Recusado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Criado em {orcamento.criadoEm} | Editado em {orcamento.atualizadoEm}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            {!isEditing ? (
              <Button
                variant="secondary"
                onClick={() => setIsEditing(true)}
                className="bg-secondary/80 hover:bg-secondary"
                disabled={!!pedidoExistente}
                title={pedidoExistente ? "Não é possível editar pois já existe um pedido vinculado." : ""}
              >
                <Edit className="size-4 mr-2" />
                Editar Proposta
              </Button>
            ) : (
              <Button onClick={handleSalvarEdicao} className="bg-green-600 hover:bg-green-700 text-white">
                <Save className="size-4 mr-2" />
                Salvar Alterações
              </Button>
            )}

            {cliente && !isEditing && (
              <PDFDownloadQuotationButton
                orcamento={orcamento}
                cliente={cliente}
                vendedor={vendedor}
                variant="outline"
              />
            )}

            {status !== "recusado" && !isEditing && !pedidoExistente && (
              <Link href={`/pedidos/novo?orcamentoId=${orcamento.id}`}>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                  <ArrowRight className="size-4 mr-2" />
                  Criar Pedido
                </Button>
              </Link>
            )}
          </div>
        </div>

        {pedidoExistente && !isEditing && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-2 rounded-full hidden sm:block">
                <CheckCircle2 className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Pedido de Produção Vinculado</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Este orçamento já foi convertido e possui um pedido ativo: <span className="font-mono font-medium text-foreground">{pedidoExistente.numero}</span>
                </p>
              </div>
            </div>
            <Link href={`/pedidos/${pedidoExistente.id}`}>
              <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/20 w-full sm:w-auto">
                Acessar Pedido <ArrowRight className="size-3 ml-2" />
              </Button>
            </Link>
          </div>
        )}

        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {cliente && (
              <div className="rounded-xl border border-border/50 bg-muted/10 p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-foreground flex items-center gap-2">
                    {cliente.razaoSocial}
                  </p>
                  <p className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                    CNPJ: {cliente.cnpj} | Tel: {cliente.telefone}
                  </p>
                </div>
                <div className="space-y-1 text-right md:max-w-[50%]">
                  <p className="text-sm text-foreground flex items-center md:justify-end gap-1.5">
                    <MapPin className="size-3.5 text-primary" />
                    {cliente.endereco}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cliente.cidade} / {cliente.estado} - CEP: {cliente.cep}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm overflow-hidden mt-2">
          <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="size-4 text-primary" />
                Itens e Produtos
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className={isEditing ? "pt-6 bg-muted/5" : "pt-0 border-t border-border/50"}>
            {isEditing ? (
              <div className="flex flex-col gap-5">
                {itens.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative rounded-xl border border-border/60 bg-card p-5 pt-8 sm:pt-5 shadow-sm group animate-in fade-in slide-in-from-bottom-2"
                  >

                    <div className="absolute -top-3 -left-3 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-md border-4 border-background">
                      {idx + 1}
                    </div>

                    <div className="flex justify-end mb-2 absolute top-4 right-4 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => removerItem(item.id)} className="size-8 hover:bg-destructive/10 hover:text-destructive text-muted-foreground">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-2">
                      <div className="md:col-span-12">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Descrição do Produto</Label>
                        <Textarea
                          rows={2}
                          value={item.descricao}
                          onChange={(e) => atualizarItem(item.id, "descricao", e.target.value)}
                          className="bg-muted/10 font-medium resize-none border-border/50 focus-visible:ring-primary/50 text-sm py-3"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <Label className="text-xs font-semibold mb-1 block">Quantidade</Label>
                        <Input
                          type="number"
                          value={item.quantidade || ""}
                          onChange={(e) => atualizarItem(item.id, "quantidade", Number(e.target.value))}
                          className="bg-muted/20"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <Label className="text-xs font-semibold mb-1 block">Unidade</Label>
                        <Input
                          value={item.unidade}
                          onChange={(e) => atualizarItem(item.id, "unidade", e.target.value)}
                          className="bg-muted/20"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <Label className="text-xs font-semibold mb-1 block">Valor Unitário (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.precoUnitario || ""}
                          onChange={(e) => atualizarItem(item.id, "precoUnitario", Number(e.target.value))}
                          className="bg-muted/20 font-mono"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <Label className="text-xs font-semibold text-primary mb-1 block">Subtotal</Label>
                        <div className="flex h-10 items-center justify-end rounded-md bg-primary/10 px-3 text-lg font-bold text-primary border border-primary/20">
                          {formatCurrency(item.quantidade * item.precoUnitario)}
                        </div>
                      </div>

                      <div className="md:col-span-12 mt-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase mb-1 block mt-2">Observações do Item</Label>
                        <Input
                          value={item.observacao || ""}
                          onChange={(e) => atualizarItem(item.id, "observacao", e.target.value)}
                          className="bg-muted/10 h-8 text-xs border-dashed border-border/60"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6 pb-2">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 hover:bg-transparent">
                      <TableHead className="w-20 font-semibold text-muted-foreground text-[13px] h-11">Quant.</TableHead>
                      <TableHead className="w-16 font-semibold text-muted-foreground text-[13px] h-11">Unid.</TableHead>
                      <TableHead className="font-semibold text-muted-foreground text-[13px] h-11">Descricao</TableHead>
                      <TableHead className="text-right w-24 font-semibold text-muted-foreground text-[13px] h-11">P.Unit.</TableHead>
                      <TableHead className="text-right w-24 font-semibold text-muted-foreground text-[13px] h-11">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item) => (
                      <TableRow key={item.id} className="border-border/30 hover:bg-muted/10">
                        <TableCell className="text-foreground font-medium text-[13px]">
                          {item.quantidade.toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[13px]">{item.unidade}</TableCell>
                        <TableCell className="text-foreground whitespace-pre-line text-[13px]">
                          {item.descricao}
                          {item.observacao && (
                            <span className="block mt-1 text-xs text-muted-foreground italic">
                              Obs: {item.observacao}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground text-[13px] min-w-[90px]">
                          {formatCurrency(item.precoUnitario)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground text-[13px]">
                          {formatCurrency(item.quantidade * item.precoUnitario)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/50 shadow-sm">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-3">
              <CardTitle className="text-base text-foreground font-semibold">Condições Gerais e Observações</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isEditing ? (
                <Textarea
                  rows={4}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Condição de pagamento 30/60 dias..."
                  className="bg-muted/10 border-border/50 resize-none font-medium h-full min-h-[120px]"
                />
              ) : (
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line p-1">
                  {observacoes || "Nenhuma observação geral adicionada na proposta."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md bg-gradient-to-b from-card to-muted/20 border-t-4 border-t-primary">
            <CardContent className="p-6 flex flex-col h-full justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                  <Calculator className="size-5" />
                  <h3 className="font-semibold text-sm uppercase tracking-wider">Resumo do Pedido</h3>
                </div>

                <div className="space-y-3 pb-4 border-b border-border/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantidade de Itens</span>
                    <span className="font-medium bg-muted/50 px-2 rounded">{itens.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal Base</span>
                    <span className="font-medium">{formatCurrency(totalGeral)}</span>
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold mb-1">Total Geral da Proposta</p>
                  <p className="text-4xl font-black text-primary truncate">{formatCurrency(totalGeral)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-auto">
                {isEditing && (
                  <Button onClick={handleSalvarEdicao} className="w-full h-12 text-base font-bold shadow-sm bg-green-600 hover:bg-green-700 text-white" size="lg">
                    Salvar Alterações
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
