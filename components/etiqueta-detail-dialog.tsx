"use client"

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LabelPreview } from "./etiqueta-preview"
import {
  Box,
  Ruler,
  Palette,
  DollarSign,
  Settings,
  FileText,
  CheckCircle2,
  Circle,
  Square,
  Layers,
  Package,
  Sparkles,
  Pencil,
} from "lucide-react"
import type { Etiqueta } from "@/lib/types"
import { formatEtiquetaMedida, formatUnidadeVenda } from "@/lib/utils"

interface EtiquetaDetailDialogProps {
  etiqueta: Etiqueta | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

function formatPreco(preco: number | null | undefined) {
  return Number(preco || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

function SpecCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  highlight?: boolean
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm hover:border-primary/20 transition-colors">
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="size-3 text-primary/70" />}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className={`text-sm font-semibold leading-snug ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  )
}

export function EtiquetaDetailDialog({
  etiqueta,
  open,
  onOpenChange,
  onEdit,
}: EtiquetaDetailDialogProps) {
  if (!etiqueta) return null

  const isRedonda = etiqueta.formato === "REDONDA"
  const isMilheiro = etiqueta.unidadeVenda === "MILHEIRO"
  const isExclusiva = (etiqueta.clientesIds?.length ?? 0) > 0
  const medida = formatEtiquetaMedida(etiqueta)
  const unidadeLabel = formatUnidadeVenda(etiqueta.unidadeVenda)

  const specsProducao = [
    etiqueta.numeroCores != null && {
      label: "Cores",
      value: etiqueta.coresDescricao
        ? `${etiqueta.numeroCores} (${etiqueta.coresDescricao})`
        : `${etiqueta.numeroCores}`,
      icon: Palette,
    },
    etiqueta.tipoTubete && { label: "Tubete", value: etiqueta.tipoTubete, icon: Package },
    etiqueta.quantidadePorRolo != null && {
      label: "Volume / Rolo",
      value: `${etiqueta.quantidadePorRolo.toLocaleString("pt-BR")} un`,
      icon: Layers,
    },
    etiqueta.metragem && { label: "Metragem", value: `${etiqueta.metragem} m`, icon: Ruler },
  ].filter(Boolean) as { label: string; value: string; icon: React.ComponentType<{ className?: string }> }[]

  const specsTecnicas = [
    etiqueta.material && { label: "Material", value: etiqueta.material },
    etiqueta.tipoAdesivo && { label: "Adesivo", value: etiqueta.tipoAdesivo },
    etiqueta.pasta && { label: "Pasta", value: etiqueta.pasta },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-7xl sm:max-w-7xl p-0 gap-0 border-0 shadow-2xl overflow-hidden bg-background">

        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary via-primary to-primary/85 px-6 py-5 pr-14 text-white overflow-hidden">
          <div className="absolute -right-6 -top-6 opacity-[0.08] pointer-events-none">
            <Box className="size-40 rotate-12" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className="bg-white/20 text-white border-0 text-[10px] font-mono">
                  REF {etiqueta.codigo}
                </Badge>
                <Badge className="bg-white/15 text-white border-0 text-[10px] flex items-center gap-1">
                  {isRedonda ? <Circle className="size-2.5" /> : <Square className="size-2.5" />}
                  {isRedonda ? "Redonda" : "Retangular"}
                </Badge>
                {isExclusiva && (
                  <Badge className="bg-amber-400/20 text-amber-100 border-amber-300/30 text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="size-2.5" />
                    Exclusiva
                  </Badge>
                )}
                {etiqueta.pasta && (
                  <Badge className="bg-white/10 text-white/90 border-white/20 text-[10px]">
                    Pasta {etiqueta.pasta}
                  </Badge>
                )}
              </div>

              <DialogTitle className="text-lg sm:text-xl font-bold text-white leading-tight pr-2">
                {etiqueta.nome}
              </DialogTitle>
              <p className="text-xs text-white/60 mt-1">Matriz de produção · {medida}</p>
            </div>

            {onEdit && (
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 bg-white/15 text-white border-white/20 hover:bg-white/25 backdrop-blur-sm h-8 text-xs"
                onClick={() => {
                  onOpenChange(false)
                  onEdit()
                }}
              >
                <Pencil className="size-3 mr-1.5" />
                Editar
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row max-h-[80vh] overflow-hidden">

          {/* Coluna esquerda — preview + preço */}
          <aside className="md:w-[300px] lg:w-[320px] shrink-0 border-b md:border-b-0 md:border-r border-border/50 bg-muted/10 p-5 flex flex-row md:flex-col gap-4">
            <div className="flex-1 md:flex-none rounded-2xl border border-border/50 bg-background p-4 md:p-5 shadow-inner min-h-[180px] md:min-h-[220px] flex flex-col items-center justify-center">
              <LabelPreview
                largura={etiqueta.largura}
                altura={etiqueta.altura}
                material={etiqueta.material}
                cores={etiqueta.numeroCores ?? 0}
                aplicacoes={etiqueta.aplicacoesEspeciais || []}
                formato={etiqueta.formato}
              />
            </div>

            {etiqueta.material && (
              <Badge variant="outline" className="hidden md:flex w-full justify-center py-1.5 text-[11px] font-medium bg-background">
                {etiqueta.material}
              </Badge>
            )}

            <div className="flex flex-col justify-center md:mt-auto shrink-0 md:w-full min-w-[140px]">
            <div className="rounded-xl bg-primary/5 border border-primary/15 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70 mb-1">
                {isMilheiro ? "Preço por milheiro" : "Preço unitário"}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-muted-foreground font-medium">R$</span>
                <span className="text-2xl font-black text-primary tabular-nums">{formatPreco(etiqueta.preco)}</span>
                <span className="text-xs text-muted-foreground ml-0.5">/ {unidadeLabel}</span>
              </div>
            </div>
            </div>
          </aside>

          {/* Coluna direita — detalhes */}
          <main className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 min-w-0">

            {/* Métricas principais — sempre 4 colunas em telas médias+ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SpecCard label="Medida" value={medida} icon={Ruler} highlight />
              <SpecCard
                label="Formato"
                value={isRedonda ? "Redonda" : "Retangular"}
                icon={isRedonda ? Circle : Square}
              />
              <SpecCard
                label="Venda"
                value={isMilheiro ? "Por milheiro" : "Por unidade"}
                icon={DollarSign}
              />
              <SpecCard
                label="Cores"
                value={etiqueta.numeroCores != null ? String(etiqueta.numeroCores) : "—"}
                icon={Palette}
              />
            </div>

            {/* Ficha técnica + Produção lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Ficha técnica */}
            {specsTecnicas.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Ruler className="size-3.5 text-primary" />
                  Ficha Técnica
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {specsTecnicas.map((s) => (
                    <SpecCard key={s.label} label={s.label} value={s.value} />
                  ))}
                </div>
              </section>
            )}

            {/* Produção */}
            {specsProducao.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Settings className="size-3.5 text-primary" />
                  Produção e Acabamento
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {specsProducao.map((s) => (
                    <SpecCard key={s.label} label={s.label} value={s.value} icon={s.icon} />
                  ))}
                </div>

                {etiqueta.aplicacoesEspeciais && etiqueta.aplicacoesEspeciais.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center gap-1 mr-1">
                      <Sparkles className="size-3 text-amber-500" />
                      Aplicações:
                    </span>
                    {etiqueta.aplicacoesEspeciais.map((app) => (
                      <Badge key={app} variant="secondary" className="text-[10px] h-5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50">
                        {app}
                      </Badge>
                    ))}
                  </div>
                )}
              </section>
            )}

            </div>

            {/* Preços + Observações lado a lado */}
            {(etiqueta.clientesVinculados?.length || etiqueta.observacoesTecnicas) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {etiqueta.clientesVinculados && etiqueta.clientesVinculados.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <DollarSign className="size-3.5 text-primary" />
                  Preços por Cliente
                </h3>
                <div className="rounded-xl border border-border/60 overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2 bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                    <span>Cliente</span>
                    <span>Preço / {unidadeLabel}</span>
                  </div>
                  {etiqueta.clientesVinculados.map((cv, i) => (
                    <div
                      key={cv.id}
                      className={`grid grid-cols-[1fr_auto] gap-4 items-center px-4 py-3 text-sm ${
                        i < etiqueta.clientesVinculados!.length - 1 ? "border-b border-border/40" : ""
                      } hover:bg-muted/20 transition-colors`}
                    >
                      <span className="font-medium text-foreground">{cv.razaoSocial}</span>
                      <span className="font-bold text-primary tabular-nums whitespace-nowrap">
                        R$ {formatPreco(cv.preco ?? etiqueta.preco)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              )}

              {etiqueta.observacoesTecnicas && (
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <FileText className="size-3.5 text-primary" />
                  Observações de Produção
                </h3>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-relaxed text-muted-foreground h-full">
                  {etiqueta.observacoesTecnicas}
                </div>
              </section>
              )}
            </div>
            )}

            {/* Estado vazio — só dados essenciais preenchidos */}
            {specsTecnicas.length === 0 && specsProducao.length === 0 && !etiqueta.observacoesTecnicas && (
              <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                Apenas os dados essenciais foram cadastrados. Use <strong>Editar</strong> para completar a ficha técnica.
              </div>
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}
