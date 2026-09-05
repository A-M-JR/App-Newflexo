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
  Boxes,
  Ruler,
  Palette,
  DollarSign,
  Disc,
  Droplet,
  Settings,
  FileText,
  CheckCircle2,
  Circle,
  Square,
  Layers,
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

type SpecRow = {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

const DASH = "—"

function formatPreco(preco: number | null | undefined) {
  return Number(preco || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

/**
 * Faixa de destaque. Usa gap-px sobre o fundo da borda em vez de cards soltos:
 * as células ficam sempre com a mesma altura e a separação acompanha qualquer
 * quebra de linha do grid.
 */
function SummaryStrip({ items }: { items: SpecRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.label} className="flex flex-col gap-1 bg-card px-4 py-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {Icon && <Icon className="size-3 shrink-0 text-primary/70" />}
              {item.label}
            </p>
            <p className="text-sm font-semibold leading-snug text-foreground break-words">
              {item.value}
            </p>
          </div>
        )
      })}
    </div>
  )
}

/** Lista rótulo/valor. Mais leve e previsível que uma grade de caixinhas. */
function SpecList({ rows }: { rows: SpecRow[] }) {
  return (
    <dl className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-card">
      {rows.map((row) => {
        const Icon = row.icon
        const isEmpty = row.value === DASH
        return (
          <div key={row.label} className="flex items-start justify-between gap-3 px-4 py-2.5">
            <dt className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {Icon && <Icon className="size-3 shrink-0 text-primary/70" />}
              {row.label}
            </dt>
            <dd className={`min-w-0 break-words text-right text-[13px] font-semibold ${isEmpty ? "text-muted-foreground/50" : "text-foreground"}`}>
              {row.value}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      <Icon className="size-3.5 shrink-0 text-primary" />
      {children}
    </h3>
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

  const resumo: SpecRow[] = [
    { label: "Medida", value: medida, icon: Ruler },
    { label: "Formato", value: isRedonda ? "Redonda" : "Retangular", icon: isRedonda ? Circle : Square },
    { label: "Venda", value: isMilheiro ? "Por milheiro" : "Por unidade", icon: DollarSign },
  ]

  const fichaTecnica: SpecRow[] = [
    { label: "Material", value: etiqueta.material || DASH, icon: Layers },
    { label: "Adesivo", value: etiqueta.tipoAdesivo || DASH, icon: Droplet },
    { label: "Pasta", value: etiqueta.pasta || DASH, icon: FileText },
  ]

  const producao: SpecRow[] = [
    {
      label: "Cores",
      value:
        etiqueta.numeroCores != null
          ? etiqueta.coresDescricao
            ? `${etiqueta.numeroCores} (${etiqueta.coresDescricao})`
            : `${etiqueta.numeroCores}`
          : DASH,
      icon: Palette,
    },
    { label: "Tubete", value: etiqueta.tipoTubete || DASH, icon: Disc },
    {
      label: "Volume / Rolo",
      value: etiqueta.quantidadePorRolo != null ? `${etiqueta.quantidadePorRolo.toLocaleString("pt-BR")} un` : DASH,
      icon: Boxes,
    },
    { label: "Metragem", value: etiqueta.metragem ? `${etiqueta.metragem} m` : DASH, icon: Ruler },
  ]

  const fichaVazia = [...fichaTecnica, ...producao].every((r) => r.value === DASH)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-5xl flex-col overflow-hidden border-0 bg-background p-0 gap-0 shadow-2xl sm:max-w-5xl">

        {/* Header */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 px-5 py-4 pr-14 text-white sm:px-6 sm:py-5">
          <div className="pointer-events-none absolute -right-6 -top-6 opacity-[0.08]">
            <Box className="size-40 rotate-12" />
          </div>

          <div className="relative z-10 min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Badge className="border-0 bg-white/20 text-[10px] font-mono text-white">
                REF {etiqueta.codigo}
              </Badge>
              <Badge className="flex items-center gap-1 border-0 bg-white/15 text-[10px] text-white">
                {isRedonda ? <Circle className="size-2.5" /> : <Square className="size-2.5" />}
                {isRedonda ? "Redonda" : "Retangular"}
              </Badge>
              {isExclusiva && (
                <Badge className="flex items-center gap-1 border-amber-300/30 bg-amber-400/20 text-[10px] text-amber-100">
                  <CheckCircle2 className="size-2.5" />
                  Exclusiva
                </Badge>
              )}
            </div>

            <DialogTitle className="text-base font-bold leading-tight text-white sm:text-xl">
              {etiqueta.nome}
            </DialogTitle>
            <p className="mt-1 text-[11px] text-white/60 sm:text-xs">Matriz de produção · {medida}</p>
          </div>
        </div>

        {/* Corpo: rola inteiro no mobile, duas colunas independentes no desktop */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">

          {/* Coluna esquerda — preview + preço */}
          <aside className="flex shrink-0 flex-row flex-wrap gap-4 border-b border-border/50 bg-muted/10 p-4 sm:p-5 md:w-[280px] md:flex-col md:flex-nowrap md:overflow-y-auto md:border-b-0 md:border-r lg:w-[300px]">
            <div className="flex min-h-[150px] min-w-0 flex-1 flex-col items-center justify-center rounded-2xl border border-border/50 bg-background p-4 shadow-inner md:min-h-[210px] md:flex-none md:p-5">
              <LabelPreview
                largura={etiqueta.largura}
                altura={etiqueta.altura}
                material={etiqueta.material}
                cores={etiqueta.numeroCores ?? 0}
                aplicacoes={etiqueta.aplicacoesEspeciais || []}
                formato={etiqueta.formato}
              />
            </div>

            <div className="flex min-w-[125px] flex-1 shrink-0 flex-col justify-center gap-3 md:w-full md:min-w-0 md:flex-none md:justify-start">
              {etiqueta.material && (
                <Badge variant="outline" className="hidden w-full justify-center bg-background py-1.5 text-[11px] font-medium md:flex">
                  {etiqueta.material}
                </Badge>
              )}

              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3.5 sm:p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary/70">
                  {isMilheiro ? "Preço por milheiro" : "Preço unitário"}
                </p>
                <div className="flex flex-wrap items-baseline gap-x-1">
                  <span className="text-xs font-medium text-muted-foreground">R$</span>
                  <span className="text-xl font-black tabular-nums text-primary sm:text-2xl">{formatPreco(etiqueta.preco)}</span>
                  <span className="ml-0.5 text-xs text-muted-foreground">/ {unidadeLabel}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Coluna direita — detalhes */}
          <main className="min-w-0 flex-1 space-y-5 p-4 sm:p-6 md:overflow-y-auto">

            <SummaryStrip items={resumo} />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <section className="space-y-2.5">
                <SectionTitle icon={Ruler}>Ficha Técnica</SectionTitle>
                <SpecList rows={fichaTecnica} />
              </section>

              <section className="space-y-2.5">
                <SectionTitle icon={Settings}>Produção e Acabamento</SectionTitle>
                <SpecList rows={producao} />
              </section>
            </div>

            {etiqueta.aplicacoesEspeciais && etiqueta.aplicacoesEspeciais.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
                  <Sparkles className="size-3 text-amber-500" />
                  Aplicações:
                </span>
                {etiqueta.aplicacoesEspeciais.map((app) => (
                  <Badge key={app} variant="secondary" className="h-5 border-amber-200/50 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400">
                    {app}
                  </Badge>
                ))}
              </div>
            )}

            {(etiqueta.clientesVinculados?.length || etiqueta.observacoesTecnicas) && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {etiqueta.clientesVinculados && etiqueta.clientesVinculados.length > 0 && (
                  <section className="space-y-2.5">
                    <SectionTitle icon={DollarSign}>Preços por Cliente</SectionTitle>
                    <div className="overflow-hidden rounded-xl border border-border/60">
                      <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-border/50 bg-muted/40 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Cliente</span>
                        <span className="text-right">Preço / {unidadeLabel}</span>
                      </div>
                      {etiqueta.clientesVinculados.map((cv, i) => (
                        <div
                          key={cv.id}
                          className={`grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 text-[13px] transition-colors hover:bg-muted/20 ${
                            i < etiqueta.clientesVinculados!.length - 1 ? "border-b border-border/40" : ""
                          }`}
                        >
                          <span className="min-w-0 break-words font-medium text-foreground">{cv.razaoSocial}</span>
                          <span className="whitespace-nowrap text-right font-bold tabular-nums text-primary">
                            R$ {formatPreco(cv.preco ?? etiqueta.preco)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {etiqueta.observacoesTecnicas && (
                  <section className="space-y-2.5">
                    <SectionTitle icon={FileText}>Observações de Produção</SectionTitle>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-[13px] leading-relaxed text-muted-foreground">
                      {etiqueta.observacoesTecnicas}
                    </div>
                  </section>
                )}
              </div>
            )}

            {fichaVazia && !etiqueta.observacoesTecnicas && (
              <div className="rounded-xl border border-dashed border-border/60 p-5 text-center text-[13px] text-muted-foreground">
                Apenas os dados essenciais foram cadastrados. Use <strong>Editar</strong> para completar a ficha técnica.
              </div>
            )}
          </main>
        </div>

        {/* Rodapé — ações longe do botão de fechar */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border/50 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          {onEdit && (
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                onOpenChange(false)
                onEdit()
              }}
            >
              <Pencil className="mr-1.5 size-4" />
              Editar etiqueta
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
