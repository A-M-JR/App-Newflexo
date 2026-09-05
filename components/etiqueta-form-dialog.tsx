"use client"

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useState, useEffect, useMemo } from "react"
import { getClientes } from "@/lib/actions/clientes"
import { saveEtiqueta, getNextEtiquetaCode } from "@/lib/actions/etiquetas"
import { useDataQuery } from "@/hooks/use-data-query"
import { Check, X, Info, Sparkles, Box, Ruler, Palette, Layers, MousePointer2, Loader2, DollarSign, Circle, Square } from "lucide-react"
import { formatEtiquetaMedida, formatUnidadeVenda } from "@/lib/utils"
import { maskCurrency, currencyParaMascara, parseDecimalBR } from "@/lib/masks"
import type { Etiqueta, FormatoEtiqueta, UnidadeVendaEtiqueta } from "@/lib/types"
import { LabelPreview } from "./etiqueta-preview"
import { Separator } from "@/components/ui/separator"

const optionalNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
  z.number().optional()
)

const optionalInt = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
  z.number().int().positive().optional()
)

const etiquetaSchema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),
  formato: z.enum(["RETANGULAR", "REDONDA"]),
  unidadeVenda: z.enum(["UNIDADE", "MILHEIRO"]),
  codigo: z.string().optional(),
  largura: optionalNumber,
  altura: optionalNumber,
  diametro: optionalNumber,
  material: z.string().optional(),
  tipoAdesivo: z.string().optional(),
  numeroCores: optionalInt,
  tipoTubete: z.string().optional(),
  quantidadePorRolo: optionalInt,
  preco: z.union([z.string(), z.number()]).optional(),
  observacoesTecnicas: z.string().optional().nullable(),
  pasta: z.string().optional().nullable(),
  metragem: optionalNumber,
  coresDescricao: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.formato === "RETANGULAR") {
    if (!data.largura || data.largura <= 0) {
      ctx.addIssue({ code: "custom", message: "Largura deve ser positiva", path: ["largura"] })
    }
    if (!data.altura || data.altura <= 0) {
      ctx.addIssue({ code: "custom", message: "Altura deve ser positiva", path: ["altura"] })
    }
  } else {
    if (!data.diametro || data.diametro <= 0) {
      ctx.addIssue({ code: "custom", message: "Diâmetro deve ser positivo", path: ["diametro"] })
    }
  }
})

type EtiquetaFormData = z.infer<typeof etiquetaSchema>

interface EtiquetaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  etiquetaToEdit?: Etiqueta | null
  onSuccess?: () => void
}

export function EtiquetaFormDialog({ open, onOpenChange, etiquetaToEdit, onSuccess }: EtiquetaFormDialogProps) {
  const [selectedClientes, setSelectedClientes] = useState<{ id: number, preco: number | string | null }[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAplicacoes, setSelectedAplicacoes] = useState<string[]>([])
  const [loadingAutoCode, setLoadingAutoCode] = useState(false)

  const { data: dbClientes = [], isLoading: loadingClientes } = useDataQuery<any[]>({
    key: 'clientes-dropdown',
    fetcher: async () => {
      const res = await getClientes({ limit: 100, mode: 'dropdown' })
      return res.data || []
    },
    enabled: open
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EtiquetaFormData>({
    resolver: zodResolver(etiquetaSchema),
    defaultValues: {
      formato: "RETANGULAR",
      unidadeVenda: "UNIDADE",
      largura: undefined,
      altura: undefined,
      diametro: undefined,
      preco: "",
    }
  })

  const watchValues = watch()
  const isRedonda = watchValues.formato === "REDONDA"
  const unidadeLabel = watchValues.unidadeVenda === "MILHEIRO" ? "/ mil" : "/ un"

  useEffect(() => {
    async function loadInitialData() {
      if (open) {
        if (etiquetaToEdit) {
          const formato = (etiquetaToEdit.formato || "RETANGULAR") as FormatoEtiqueta
          reset({
            nome: etiquetaToEdit.nome,
            codigo: etiquetaToEdit.codigo,
            formato,
            unidadeVenda: (etiquetaToEdit.unidadeVenda || "UNIDADE") as UnidadeVendaEtiqueta,
            material: etiquetaToEdit.material || "",
            tipoAdesivo: etiquetaToEdit.tipoAdesivo || "",
            largura: formato === "RETANGULAR" ? etiquetaToEdit.largura : undefined,
            altura: formato === "RETANGULAR" ? etiquetaToEdit.altura : undefined,
            diametro: formato === "REDONDA" ? etiquetaToEdit.largura : undefined,
            numeroCores: etiquetaToEdit.numeroCores ?? undefined,
            tipoTubete: etiquetaToEdit.tipoTubete || "",
            quantidadePorRolo: etiquetaToEdit.quantidadePorRolo ?? undefined,
            preco: etiquetaToEdit.preco ? currencyParaMascara(etiquetaToEdit.preco, 4) : "",
            observacoesTecnicas: etiquetaToEdit.observacoesTecnicas || "",
            pasta: etiquetaToEdit.pasta || "",
            metragem: etiquetaToEdit.metragem ?? undefined,
            coresDescricao: etiquetaToEdit.coresDescricao || "",
          })
          setSelectedClientes(etiquetaToEdit.clientesVinculados?.map(cv => ({
            id: cv.id,
            preco: cv.preco ? currencyParaMascara(cv.preco, 4) : null
          })) || [])
          setSelectedAplicacoes(etiquetaToEdit.aplicacoesEspeciais || [])
        } else {
          reset({
            nome: "",
            codigo: "",
            formato: "RETANGULAR",
            unidadeVenda: "UNIDADE",
            material: "",
            tipoAdesivo: "",
            largura: undefined,
            altura: undefined,
            diametro: undefined,
            numeroCores: undefined,
            tipoTubete: "",
            quantidadePorRolo: undefined,
            observacoesTecnicas: "",
            pasta: "",
            coresDescricao: "",
            metragem: undefined,
            preco: "",
          })
          setSelectedClientes([])
          setSelectedAplicacoes([])

          setLoadingAutoCode(true)
          try {
            const nextCode = await getNextEtiquetaCode()
            setValue("codigo", nextCode)
          } catch (err) {
            console.error("Erro ao buscar próximo código", err)
          } finally {
            setLoadingAutoCode(false)
          }
        }
        setSearchTerm("")
      }
    }
    loadInitialData()
  }, [open, etiquetaToEdit, reset, setValue])

  const toggleCliente = (id: number) => {
    setSelectedClientes(prev => {
      const exists = prev.find(c => c.id === id)
      if (exists) return prev.filter(c => c.id !== id)
      return [...prev, { id, preco: null }]
    })
  }

  const updateClientePreco = (id: number, maskedValue: string) => {
    const formatted = maskCurrency(maskedValue, 4)
    setSelectedClientes(prev => prev.map(c =>
      c.id === id ? { ...c, preco: formatted as any } : c
    ))
  }

  const toggleAplicacao = (app: string) => {
    setSelectedAplicacoes(prev => prev.includes(app) ? prev.filter(a => a !== app) : [...prev, app])
  }

  async function onSubmit(data: EtiquetaFormData) {
    try {
      const finalData = {
        ...data,
        id: etiquetaToEdit?.id,
        preco: typeof data.preco === 'string' && data.preco ? parseDecimalBR(data.preco) : (typeof data.preco === 'number' ? data.preco : 0),
        clientes: selectedClientes.map(c => ({
          ...c,
          preco: typeof c.preco === 'string' ? parseDecimalBR(c.preco) : c.preco
        })),
        aplicacoesEspeciais: selectedAplicacoes
      }

      await saveEtiqueta(finalData)

      toast.success(etiquetaToEdit ? "Etiqueta atualizada!" : "Nova etiqueta cadastrada!", {
        description: data.nome,
        icon: <Check className="size-4 text-green-500" />
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro ao salvar etiqueta"
      toast.error(msg)
    }
  }

  const filteredClientes = useMemo(() => {
    if (!dbClientes) return []
    return dbClientes.filter(c =>
      c.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj.includes(searchTerm)
    )
  }, [dbClientes, searchTerm])

  const previewLargura = isRedonda ? Number(watchValues.diametro || 0) : Number(watchValues.largura || 0)
  const previewAltura = isRedonda ? Number(watchValues.diametro || 0) : Number(watchValues.altura || 0)

  const medidaResumo = formatEtiquetaMedida({
    formato: watchValues.formato,
    largura: previewLargura,
    altura: previewAltura,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl lg:max-w-5xl p-0 border-0 shadow-2xl overflow-hidden bg-background">

        <div className="relative h-20 bg-gradient-to-r from-primary/90 to-primary p-6 pr-14 flex flex-col justify-center overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Layers className="size-32 rotate-12" />
          </div>
          <div className="z-10 flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Box className="size-5" />
                {etiquetaToEdit ? `Editando Matriz: ${etiquetaToEdit.codigo}` : "Cadastro de Etiqueta"}
              </DialogTitle>
              <p className="text-xs text-white/70 mt-1">Nome, dimensões e unidade de venda são obrigatórios.</p>
            </div>
            {etiquetaToEdit && <Badge className="bg-white/20 text-white border-0">Edição Ativa</Badge>}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row h-full max-h-[80vh]">

          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 flex flex-col">
            <div className="space-y-8 animate-in fade-in duration-500">

              {/* BLOCO A — ESSENCIAL */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <MousePointer2 className="size-4" />
                  <h4>Dados Essenciais</h4>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-medium">Nome da Matriz / Produto *</Label>
                    <Input id="nome" {...register("nome")} placeholder="Ex: Rótulo de Vinho - Syrah 750ml" className="bg-muted/30 focus-visible:ring-primary h-9" />
                    {errors.nome && <p className="text-[10px] text-destructive italic">{errors.nome.message}</p>}
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-xs font-medium">Formato da Etiqueta *</Label>
                    <Controller
                      name="formato"
                      control={control}
                      render={({ field }) => (
                        <div className="flex gap-2">
                          {(["RETANGULAR", "REDONDA"] as const).map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => field.onChange(f)}
                              className={`flex-1 flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-lg border transition-all ${field.value === f
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/50'}`}
                            >
                              {f === "RETANGULAR" ? <Square className="size-3.5" /> : <Circle className="size-3.5" />}
                              {f === "RETANGULAR" ? "Retangular" : "Redonda"}
                            </button>
                          ))}
                        </div>
                      )}
                    />
                  </div>

                  {isRedonda ? (
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium">Diâmetro (mm) *</Label>
                      <Input type="number" step="0.1" {...register("diametro")} placeholder="Ex: 40" className="bg-muted/30 h-9" />
                      {errors.diametro && <p className="text-[10px] text-destructive">{errors.diametro.message}</p>}
                      <p className="text-[10px] text-muted-foreground italic">Medida salva como equivalente quadrado para compatibilidade.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-xs font-medium">Largura (mm) *</Label>
                        <Input type="number" step="0.1" {...register("largura")} className="bg-muted/30 h-9" />
                        {errors.largura && <p className="text-[10px] text-destructive">{errors.largura.message}</p>}
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs font-medium">Altura (mm) *</Label>
                        <Input type="number" step="0.1" {...register("altura")} className="bg-muted/30 h-9" />
                        {errors.altura && <p className="text-[10px] text-destructive">{errors.altura.message}</p>}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label className="text-xs font-medium">Unidade de Venda *</Label>
                    <Controller
                      name="unidadeVenda"
                      control={control}
                      render={({ field }) => (
                        <div className="flex gap-2">
                          {(["UNIDADE", "MILHEIRO"] as const).map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => field.onChange(u)}
                              className={`flex-1 text-xs px-3 py-2 rounded-lg border transition-all ${field.value === u
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/50'}`}
                            >
                              {u === "UNIDADE" ? "Por unidade" : "Por milheiro"}
                            </button>
                          ))}
                        </div>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium flex items-center gap-2">
                        Código Sequencial
                        {loadingAutoCode && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                      </Label>
                      <Input id="codigo" {...register("codigo")} placeholder="123" className="bg-muted/30 h-9 font-mono" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium">Pasta de Arquivo</Label>
                      <Input id="pasta" {...register("pasta")} placeholder="X-1234" className="bg-muted/30 h-9" />
                    </div>
                    <div className="hidden lg:grid gap-2">
                      <Label className="text-xs font-medium">Metragem Rolo</Label>
                      <Input type="number" {...register("metragem")} placeholder="Ex: 500" className="bg-muted/30 h-9" />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* BLOCO B — FICHA TÉCNICA (opcional) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Ruler className="size-4" />
                  <h4>Ficha Técnica <span className="text-muted-foreground font-normal text-xs">(opcional)</span></h4>
                </div>

                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium">Material Base / Papel</Label>
                      <Input {...register("material")} placeholder="Ex: BOPP Branco" className="bg-muted/30 h-9" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium">Tipo de Adesivo</Label>
                      <Input {...register("tipoAdesivo")} placeholder="Ex: Acrílico 20g" className="bg-muted/30 h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        Número de Cores
                        <Palette className="size-3 text-primary/70" />
                      </Label>
                      <Input type="number" {...register("numeroCores")} placeholder="Ex: 4" className="bg-muted/30 h-9" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium">Descrição das Cores</Label>
                      <Input {...register("coresDescricao")} placeholder="Ex: CMYK + Pantone" className="bg-muted/30 h-9" />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* BLOCO C — COMERCIAL (opcional) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <DollarSign className="size-4" />
                  <h4>Comercial e Produção <span className="text-muted-foreground font-normal text-xs">(opcional)</span></h4>
                </div>

                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        Preço Base {unidadeLabel}
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                        <Input
                          type="text"
                          {...register("preco")}
                          onChange={(e) => {
                            const masked = maskCurrency(e.target.value, 4)
                            setValue("preco", masked as any)
                          }}
                          placeholder="0,0000"
                          className="bg-amber-500/5 focus-visible:ring-amber-500 pl-9 h-10 font-bold font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium">Volume por Rolo (Un)</Label>
                      <Input type="number" {...register("quantidadePorRolo")} placeholder="Ex: 1000" className="bg-muted/30 h-10" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium">Tubete (Polegadas)</Label>
                      <Input {...register("tipoTubete")} placeholder="Ex: 3 polegadas" className="bg-muted/30 h-9" />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Sparkles className="size-3 text-amber-500" />
                      Aplicações Especiais
                    </Label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {["Verniz UV Local", "Verniz UV Total", "Cold Stamp", "Hot Stamping", "Laminação"].map(app => (
                        <button
                          key={app} type="button" onClick={() => toggleAplicacao(app)}
                          className={`text-[10px] px-3 py-1.5 rounded-full border transition-all ${selectedAplicacoes.includes(app)
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20'
                            : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/50'}`}
                        >
                          {app}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                      <Check className="size-3 text-primary" />
                      Vincular Clientes (Exclusividade)
                    </Label>
                    <div className="border border-border p-3 rounded-lg bg-muted/10 space-y-3">
                      <div className="relative">
                        <Input
                          placeholder="Buscar cliente para vincular..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="h-8 text-xs bg-background pr-8"
                        />
                        {loadingClientes && <Loader2 className="absolute right-2 top-2 size-3 animate-spin text-muted-foreground" />}
                      </div>

                      {searchTerm.length > 0 && !loadingClientes && (
                        <div className="border border-border/50 rounded-md max-h-32 overflow-y-auto bg-background/80 shadow-md">
                          {filteredClientes.map(cliente => (
                            <button key={cliente.id} type="button" onClick={() => toggleCliente(cliente.id)} className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-primary/10">
                              <span className="truncate">{cliente.razaoSocial}</span>
                              {selectedClientes.some(c => c.id === cliente.id) && <Check className="size-3 text-primary" />}
                            </button>
                          ))}
                          {filteredClientes.length === 0 && (
                            <div className="p-2 text-center text-[10px] text-muted-foreground">Nenhum cliente encontrado</div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        {selectedClientes.map(sel => {
                          const cl = dbClientes?.find(c => c.id === sel.id)
                          return (
                            <div key={sel.id} className="flex items-center gap-2 bg-muted/20 p-2 rounded-lg border border-border/50 animate-in fade-in slide-in-from-left-2">
                              <span className="text-[11px] font-medium flex-1 truncate">{cl?.razaoSocial || `Cliente #${sel.id}`}</span>
                              <div className="flex items-center gap-1.5 w-32 shrink-0">
                                <span className="text-[10px] text-muted-foreground font-bold">R$</span>
                                <Input
                                  type="text"
                                  placeholder="0,0000"
                                  value={sel.preco ? (typeof sel.preco === 'number' ? currencyParaMascara(sel.preco, 4) : sel.preco) : ""}
                                  onChange={(e) => updateClientePreco(sel.id, e.target.value)}
                                  className="h-7 text-[11px] px-1 bg-background border-primary/20 focus-visible:ring-primary/50 font-mono"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-destructive"
                                onClick={() => toggleCliente(sel.id)}
                              >
                                <X className="size-3.5" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-xs font-medium">Observações e Instruções de Rebobinagem</Label>
                    <Textarea {...register("observacoesTecnicas")} rows={3} placeholder="Instruções específicas para a produção..." className="bg-muted/30 resize-none text-xs" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-10 mt-6 border-t border-border/50">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 px-8 shadow-md">
                {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                {etiquetaToEdit ? 'Atualizar Matriz' : 'Salvar no Catálogo'}
              </Button>
            </div>
          </form>

          <aside className="hidden lg:flex w-72 xl:w-80 bg-muted/20 border-l border-border/50 p-6 flex-col items-center gap-6 overflow-y-auto">
            <div className="w-full">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center mb-6">Prévia em Tempo Real</h4>
              <div className="min-h-[220px] flex items-center justify-center p-4 bg-white/50 dark:bg-black/20 rounded-xl border border-border/50 shadow-inner">
                <LabelPreview
                  largura={previewLargura}
                  altura={previewAltura}
                  material={watchValues.material || ""}
                  cores={Number(watchValues.numeroCores || 0)}
                  aplicacoes={selectedAplicacoes}
                  formato={watchValues.formato}
                />
              </div>
            </div>

            <div className="w-full space-y-4">
              <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 shadow-sm ring-1 ring-primary/5">
                <h5 className="text-[11px] font-bold mb-3 flex items-center gap-1.5 text-primary uppercase tracking-wider">
                  <DollarSign className="size-3" /> Valor Comercial
                </h5>
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] font-medium text-muted-foreground">R$</span>
                  <span className="text-2xl font-black text-foreground">
                    {typeof watchValues.preco === 'string' && watchValues.preco ? watchValues.preco : (watchValues.preco ? Number(watchValues.preco).toFixed(4).replace('.', ',') : "0,0000")}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-1">{unidadeLabel}</span>
                </div>
              </div>

              <div className="p-3 bg-white/80 dark:bg-slate-900/50 rounded-lg border border-border shadow-sm">
                <h5 className="text-[11px] font-bold mb-2 flex items-center gap-1.5 text-primary"><Info className="size-3" /> Resumo do Registro</h5>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">Produto:</span> <span className="font-medium truncate max-w-[120px]">{watchValues.nome || '---'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Medidas:</span> <span className="font-medium">{medidaResumo || '---'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Formato:</span> <span className="font-medium">{isRedonda ? 'Redonda' : 'Retangular'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Venda:</span> <span className="font-medium">{formatUnidadeVenda(watchValues.unidadeVenda)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Material:</span> <span className="font-medium">{watchValues.material || '---'}</span></div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}
