"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Etiqueta } from "@/lib/types"

interface EtiquetaDetailDialogProps {
  etiqueta: Etiqueta | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function EtiquetaDetailDialog({
  etiqueta,
  open,
  onOpenChange,
  onEdit
}: EtiquetaDetailDialogProps) {
  if (!etiqueta) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card text-card-foreground">
        <DialogHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <DialogTitle className="text-xl text-foreground flex items-center gap-2">
              {etiqueta.nome}
              {etiqueta.pasta && (
                <Badge variant="outline" className="text-[10px] font-mono bg-muted/30">
                  Pasta: {etiqueta.pasta}
                </Badge>
              )}
            </DialogTitle>
          </div>
          {onEdit && (
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => {
                onOpenChange(false)
                onEdit()
              }}
            >
              Editar Matriz
            </button>
          )}
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">{etiqueta.codigo}</Badge>
            <Badge variant="outline">{etiqueta.material}</Badge>
            {etiqueta.clientesIds && etiqueta.clientesIds.length > 0 && (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400">
                Matriz Exclusiva
              </Badge>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Medidas</p>
              <p className="text-sm font-medium text-foreground">{etiqueta.largura} x {etiqueta.altura} mm</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cores</p>
              <p className="text-sm font-medium text-foreground">
                {etiqueta.numeroCores} {etiqueta.coresDescricao ? `(${etiqueta.coresDescricao})` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo de Adesivo</p>
              <p className="text-sm font-medium text-foreground">{etiqueta.tipoAdesivo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo de Tubete</p>
              <p className="text-sm font-medium text-foreground">{etiqueta.tipoTubete}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Qtd. por Rolo</p>
              <p className="text-sm font-medium text-foreground">{etiqueta.quantidadePorRolo.toLocaleString("pt-BR")}</p>
            </div>
            {etiqueta.metragem && (
              <div>
                <p className="text-xs text-muted-foreground">Metragem</p>
                <p className="text-sm font-medium text-foreground">{etiqueta.metragem} m</p>
              </div>
            )}
            {etiqueta.orientacaoRebobinagem && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Orientação Rebobinagem</p>
                <p className="text-sm font-medium text-foreground">{etiqueta.orientacaoRebobinagem}</p>
              </div>
            )}
          </div>

          {(etiqueta.aplicacoesEspeciais && etiqueta.aplicacoesEspeciais.length > 0) && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Aplicações Especiais</p>
                <div className="flex gap-2 flex-wrap">
                  {etiqueta.aplicacoesEspeciais.map(app => (
                    <Badge key={app} variant="secondary" className="bg-primary/10 text-primary border-primary/20 shrink-0">
                      {app}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {etiqueta.observacoesTecnicas && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Especificações de Produção / Observações</p>
                <p className="text-sm text-foreground bg-muted/40 p-3 rounded-md border border-border/50">{etiqueta.observacoesTecnicas}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
