"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { clientes } from "@/lib/mock-data"
import { Check, X } from "lucide-react"
import type { Etiqueta } from "@/lib/types"

const etiquetaSchema = z.object({
  nome: z.string().min(3, "Nome obrigatorio"),
  codigo: z.string().min(2, "Codigo obrigatorio"),
  material: z.string().min(2, "Material obrigatorio"),
  tipoAdesivo: z.string().min(2, "Tipo de adesivo obrigatorio"),
  largura: z.coerce.number().positive("Largura deve ser positiva"),
  altura: z.coerce.number().positive("Altura deve ser positiva"),
  numeroCores: z.coerce.number().int().min(1, "Minimo 1 cor"),
  tipoTubete: z.string().min(1, "Tipo de tubete obrigatorio"),
  quantidadePorRolo: z.coerce.number().int().positive("Quantidade deve ser positiva"),
  observacoesTecnicas: z.string().optional(),
  pasta: z.string().optional(),
  metragem: z.coerce.number().optional(),
  coresDescricao: z.string().optional(),
  aplicacoesEspeciais: z.array(z.string()).optional(),
  orientacaoRebobinagem: z.string().optional(),
})

type EtiquetaFormData = z.infer<typeof etiquetaSchema>

interface EtiquetaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  etiquetaToEdit?: Etiqueta | null // Para edicao
}

export function EtiquetaFormDialog({ open, onOpenChange, etiquetaToEdit }: EtiquetaFormDialogProps) {
  const [selectedClientes, setSelectedClientes] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Checkboxes list para Aplicações Especiais
  const opcoesAplicacoes = ["Verniz UV Local", "Verniz UV Total", "Cold Stamp", "Hot Stamping", "Laminação"]
  const [selectedAplicacoes, setSelectedAplicacoes] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EtiquetaFormData>({
    resolver: zodResolver(etiquetaSchema),
  })

  useEffect(() => {
    if (open) {
      if (etiquetaToEdit) {
        reset({
          nome: etiquetaToEdit.nome,
          codigo: etiquetaToEdit.codigo,
          material: etiquetaToEdit.material,
          tipoAdesivo: etiquetaToEdit.tipoAdesivo,
          largura: etiquetaToEdit.largura,
          altura: etiquetaToEdit.altura,
          numeroCores: etiquetaToEdit.numeroCores,
          tipoTubete: etiquetaToEdit.tipoTubete,
          quantidadePorRolo: etiquetaToEdit.quantidadePorRolo,
          observacoesTecnicas: etiquetaToEdit.observacoesTecnicas || "",
          pasta: etiquetaToEdit.pasta || "",
          metragem: etiquetaToEdit.metragem || undefined,
          coresDescricao: etiquetaToEdit.coresDescricao || "",
          orientacaoRebobinagem: etiquetaToEdit.orientacaoRebobinagem || "",
        })
        setSelectedClientes(etiquetaToEdit.clientesIds || [])
        setSelectedAplicacoes(etiquetaToEdit.aplicacoesEspeciais || [])
      } else {
        reset({
          nome: "", codigo: "", material: "", tipoAdesivo: "", largura: 0, altura: 0,
          numeroCores: 1, tipoTubete: "", quantidadePorRolo: 0, observacoesTecnicas: "",
          pasta: "", coresDescricao: "", orientacaoRebobinagem: ""
        })
        setSelectedClientes([])
        setSelectedAplicacoes([])
      }
      setSearchTerm("")
    }
  }, [open, etiquetaToEdit, reset])

  const toggleCliente = (id: string) => {
    setSelectedClientes(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const removeCliente = (id: string) => {
    setSelectedClientes(prev => prev.filter(c => c !== id))
  }

  const toggleAplicacao = (app: string) => {
    setSelectedAplicacoes(prev =>
      prev.includes(app) ? prev.filter(a => a !== app) : [...prev, app]
    )
  }

  function onSubmit(data: EtiquetaFormData) {
    const finalData = {
      ...data,
      clientesIds: selectedClientes.length > 0 ? selectedClientes : undefined,
      aplicacoesEspeciais: selectedAplicacoes.length > 0 ? selectedAplicacoes : undefined
    }

    toast.success(etiquetaToEdit ? "Etiqueta atualizada com sucesso!" : "Etiqueta matriz cadastrada com sucesso!", {
      description: data.nome,
    })
    onOpenChange(false)
  }

  const filteredClientes = clientes.filter(c =>
    c.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj.includes(searchTerm)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground p-0 border-0 shadow-lg">
        <div className="p-6 pb-4 border-b border-border/50 bg-muted/20">
          <DialogTitle className="text-xl font-bold text-foreground">
            {etiquetaToEdit ? "Editar Matriz/Etiqueta" : "Nova Matriz e Rótulo"}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {etiquetaToEdit ? "Altere as especificações técnicas gerais da etiqueta base." : "Cadastre as especificações da etiqueta e vincule-a a clientes caso seja exclusiva."}
          </DialogDescription>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-5 flex flex-col gap-8">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">

            {/* Coluna Esquerda: Dados Basicos */}
            <div className="space-y-4 lg:col-span-3">
              <h3 className="text-sm font-semibold text-primary mb-2">Características Físicas</h3>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome" className={errors.nome ? "text-destructive" : ""}>Nome da Matriz / Descrição *</Label>
                  <Input id="nome" {...register("nome")} className={`bg-muted/30 ${errors.nome ? "border-destructive focus-visible:ring-destructive" : ""}`} />
                  {errors.nome && <p className="text-[10px] text-destructive">{errors.nome.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="codigo" className={errors.codigo ? "text-destructive" : ""}>Ref / Código *</Label>
                    <Input id="codigo" placeholder="EXT-01" {...register("codigo")} className={`bg-muted/30 ${errors.codigo ? "border-destructive" : ""}`} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="material" className={errors.material ? "text-destructive" : ""}>Material (Faca) *</Label>
                    <Input id="material" placeholder="BOPP, Couchê..." {...register("material")} className={`bg-muted/30 ${errors.material ? "border-destructive" : ""}`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tipoAdesivo">Carga/Adesivo *</Label>
                    <Input id="tipoAdesivo" placeholder="Borracha 20g" {...register("tipoAdesivo")} className="bg-muted/30" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="numeroCores">Número de Cores *</Label>
                    <Input id="numeroCores" type="number" {...register("numeroCores")} className="bg-muted/30" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="largura">Largura (mm) *</Label>
                    <Input id="largura" type="number" {...register("largura")} className="bg-muted/30" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="altura">Altura (mm) *</Label>
                    <Input id="altura" type="number" {...register("altura")} className="bg-muted/30" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tipoTubete">Tubete (Polegadas) *</Label>
                    <Input id="tipoTubete" placeholder="40, 76..." {...register("tipoTubete")} className="bg-muted/30" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quantidadePorRolo">Vol. p/ Rolo (Un) *</Label>
                    <Input id="quantidadePorRolo" type="number" {...register("quantidadePorRolo")} className="bg-muted/30" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pasta">Pasta Archivo</Label>
                    <Input id="pasta" placeholder="Ex: X-4045" {...register("pasta")} className="bg-muted/30" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="metragem">Metragem Rolo</Label>
                    <Input id="metragem" type="number" placeholder="Ex: 100" {...register("metragem")} className="bg-muted/30" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="coresDescricao">Cores (Descrição)</Label>
                  <Input id="coresDescricao" placeholder="Ex: Preto, Vermelho" {...register("coresDescricao")} className="bg-muted/30" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="orientacaoRebobinagem">Orientação de Rebobinagem</Label>
                  <Input id="orientacaoRebobinagem" placeholder="Ex: Ext 0º, Ext 90º..." {...register("orientacaoRebobinagem")} className="bg-muted/30" />
                </div>
              </div>
            </div>

            {/* Coluna Direita: Exclusividade e Observacoes */}
            <div className="space-y-4 lg:col-span-2">
              <h3 className="text-sm font-semibold text-primary mb-2">Acabamentos e Vinculações</h3>

              <div className="grid gap-2 mb-4">
                <Label>Aplicações Especiais (Opcional)</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {opcoesAplicacoes.map(app => (
                    <button
                      key={app}
                      type="button"
                      onClick={() => toggleAplicacao(app)}
                      className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${selectedAplicacoes.includes(app)
                        ? 'bg-primary/10 border-primary text-primary font-medium'
                        : 'bg-background hover:bg-muted border-border text-muted-foreground'
                        }`}
                    >
                      {app}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Clientes Vinculados (Opcional)</Label>
                <p className="text-[10px] text-muted-foreground pb-1">Selecione para quais clientes esta etiqueta ficará destacada como disponível.</p>

                <Input
                  placeholder="Buscar Cliente para vincular..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs bg-background"
                />

                {/* Lista Dropdown Fake de Clientes */}
                {searchTerm.length > 0 && (
                  <div className="border border-border/50 rounded-md max-h-32 overflow-y-auto bg-background/50 shadow-inner mt-1">
                    {filteredClientes.map(cliente => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => toggleCliente(cliente.id)}
                        className="w-full flex items-center justify-between text-left px-3 py-2 text-xs hover:bg-muted/50 border-b border-border/30 last:border-0"
                      >
                        <span className="truncate max-w-[80%]">{cliente.razaoSocial}</span>
                        {selectedClientes.includes(cliente.id) && (
                          <Check className="size-3 text-primary" />
                        )}
                      </button>
                    ))}
                    {filteredClientes.length === 0 && (
                      <div className="text-center text-[10px] text-muted-foreground p-3">Cliente não encontrado.</div>
                    )}
                  </div>
                )}

                {/* Tags Selecionadas */}
                {selectedClientes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-muted/20 border border-border/30 rounded-md min-h-12 max-h-24 overflow-y-auto">
                    {selectedClientes.map(id => {
                      const cl = clientes.find(c => c.id === id)
                      if (!cl) return null
                      return (
                        <Badge key={id} variant="secondary" className="text-[9px] px-1.5 py-0 items-center gap-1 shadow-sm border border-border/50">
                          <span className="max-w-[120px] truncate">{cl.razaoSocial}</span>
                          <button type="button" onClick={() => removeCliente(id)} className="hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 transition-colors">
                            <X className="size-2.5" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="grid gap-2 mt-4">
                <Label htmlFor="observacoesTecnicas">Especificações de Produção</Label>
                <Textarea id="observacoesTecnicas" rows={5} placeholder="Ex: Rolo com saída para fora..." {...register("observacoesTecnicas")} className="bg-muted/30 resize-none" />
              </div>
            </div>

          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/50 mt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">Registrar Etiqueta</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
