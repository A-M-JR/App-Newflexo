"use client"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Ruler, Palette, Layers } from "lucide-react"
import { etiquetas } from "@/lib/mock-data"
import { useState } from "react"
import { EtiquetaFormDialog } from "@/components/etiqueta-form-dialog"
import { EtiquetaDetailDialog } from "@/components/etiqueta-detail-dialog"
import type { Etiqueta } from "@/lib/types"

export default function EtiquetasPage() {
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [detailEtiqueta, setDetailEtiqueta] = useState<Etiqueta | null>(null)

  // States para Edit e Filtros Avancados
  const [etiquetaToEdit, setEtiquetaToEdit] = useState<Etiqueta | null>(null)
  const [fMaterial, setFMaterial] = useState("")
  const [fTubete, setFTubete] = useState("")

  const filtered = etiquetas.filter(
    (e) => {
      const matchSearch = e.nome.toLowerCase().includes(search.toLowerCase()) ||
        e.codigo.toLowerCase().includes(search.toLowerCase()) ||
        e.material.toLowerCase().includes(search.toLowerCase())

      const matchMaterial = fMaterial ? e.material.toLowerCase() === fMaterial.toLowerCase() : true
      const matchTubete = fTubete ? e.tipoTubete.includes(fTubete) : true

      return matchSearch && matchMaterial && matchTubete
    }
  )

  const uniqueMaterials = Array.from(new Set(etiquetas.map(e => e.material)))
  const uniqueTubetes = Array.from(new Set(etiquetas.map(e => e.tipoTubete)))

  const handleEdit = () => {
    setEtiquetaToEdit(detailEtiqueta)
    setFormOpen(true)
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header Area */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Catálogo de Etiquetas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Registro técnico, medidas e vinculação as matrizes de rótulos
            </p>
          </div>
          <Button onClick={() => { setEtiquetaToEdit(null); setFormOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all hover:scale-[1.02]">
            <Plus className="size-4 mr-2" />
            Nova Etiqueta
          </Button>
        </div>

        {/* Action / Filter Bar */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4 flex flex-col items-stretch md:flex-row md:items-center justify-between gap-4">

            <div className="flex items-center gap-2 flex-1 relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome da matriz, código ou faca..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/50 focus-visible:bg-background border-border w-full"
              />
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Mat:</label>
                <select
                  className="h-9 rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-32"
                  value={fMaterial}
                  onChange={e => setFMaterial(e.target.value)}
                >
                  <option value="">Todos</option>
                  {uniqueMaterials.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Tub:</label>
                <select
                  className="h-9 rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-28"
                  value={fTubete}
                  onChange={e => setFTubete(e.target.value)}
                >
                  <option value="">Todos</option>
                  {uniqueTubetes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {(fMaterial || fTubete) && (
                <Button variant="ghost" size="sm" onClick={() => { setFMaterial(""); setFTubete("") }} className="shrink-0 h-9 px-2">
                  Limpar
                </Button>
              )}
            </div>

          </CardHeader>

          <CardContent className="bg-muted/5 border-t border-border/50 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((etiqueta) => (
                <Card
                  key={etiqueta.id}
                  className="group hover:shadow-md transition-all cursor-pointer border-border/50 hover:border-primary/30 relative overflow-hidden"
                  onClick={() => setDetailEtiqueta(etiqueta)}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                    <Layers className="size-24" />
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                          {etiqueta.nome}
                        </h3>
                        <p className="text-[11px] text-muted-foreground font-mono mt-1 px-1.5 py-0.5 bg-muted rounded inline-block">
                          REF: {etiqueta.codigo}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-background shadow-sm shrink-0">
                        {etiqueta.material}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1.5 bg-muted/30 p-1.5 rounded-md">
                          <Ruler className="size-3 text-primary/70" />
                          {etiqueta.largura}x{etiqueta.altura}mm
                        </span>
                        <span className="flex items-center gap-1.5 bg-muted/30 p-1.5 rounded-md">
                          <Palette className="size-3 text-primary/70" />
                          {etiqueta.numeroCores} cor(es)
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70 uppercase font-semibold">Volume Rolo</span>
                          <span className="text-xs font-medium">{etiqueta.quantidadePorRolo} un</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary hover:bg-primary/20">
                            Tb. {etiqueta.tipoTubete}
                          </Badge>
                          {etiqueta.clientesIds && etiqueta.clientesIds.length > 0 && (
                            <Badge variant="outline" className="text-[9px] border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400">
                              Exclusiva ({etiqueta.clientesIds.length})
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground bg-background rounded-lg border border-dashed">
                  <Layers className="size-8 opacity-20 mb-2" />
                  <p>Nenhuma etiqueta ou matriz encontrada.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <EtiquetaFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v)
          if (!v) setTimeout(() => setEtiquetaToEdit(null), 300)
        }}
        etiquetaToEdit={etiquetaToEdit}
      />
      <EtiquetaDetailDialog
        etiqueta={detailEtiqueta}
        open={!!detailEtiqueta}
        onOpenChange={(open) => !open && setDetailEtiqueta(null)}
        onEdit={handleEdit}
      />
    </AppShell>
  )
}
