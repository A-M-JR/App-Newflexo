"use client"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Plus, Ruler, Palette, Layers, Eye } from "lucide-react"
import { FilterCombobox, type FilterOption } from "@/components/ui/filter-combobox"
import { useState, useMemo } from "react"
import { EtiquetaFormDialog } from "@/components/etiqueta-form-dialog"
import { EtiquetaDetailDialog } from "@/components/etiqueta-detail-dialog"
import { getEtiquetas } from "@/lib/actions/etiquetas"
import { useDataQuery } from "@/hooks/use-data-query"
import { Skeleton } from "@/components/ui/skeleton"
import type { Etiqueta } from "@/lib/types"
import { formatEtiquetaMedida } from "@/lib/utils"

export default function EtiquetasPage() {
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [detailEtiqueta, setDetailEtiqueta] = useState<Etiqueta | null>(null)

  // States para Edit e Filtros Avancados
  const [etiquetaToEdit, setEtiquetaToEdit] = useState<Etiqueta | null>(null)
  const [fMaterial, setFMaterial] = useState("")
  const [fTubete, setFTubete] = useState("")
  // "" = todas | "geral" = sem cliente vinculado | "<id>" = exclusivas do cliente
  const [fCliente, setFCliente] = useState("")

  const { data: etiquetasList, isLoading: loading, refetch: revalidate } = useDataQuery<Etiqueta[]>({
    key: 'etiquetas',
    fetcher: getEtiquetas
  })

  const filtered = useMemo(() => {
    const list = etiquetasList || []
    return list.filter(
        (e) => {
          const termo = search.toLowerCase()
          const matchSearch = e.nome.toLowerCase().includes(termo) ||
            e.codigo.toLowerCase().includes(termo) ||
            e.material.toLowerCase().includes(termo) ||
            (e.clientesVinculados || []).some(cv => cv.razaoSocial.toLowerCase().includes(termo))
    
          const matchMaterial = fMaterial ? e.material.toLowerCase() === fMaterial.toLowerCase() : true
          // Comparação exata sem diferenciar caixa, igual à do material: as opções
          // do filtro já são os valores distintos que existem no cadastro.
          const matchTubete = fTubete ? (e.tipoTubete || "").trim().toLowerCase() === fTubete.toLowerCase() : true

          const vinculos = e.clientesVinculados || []
          const matchCliente = !fCliente
            ? true
            : fCliente === "geral"
              ? vinculos.length === 0
              : vinculos.some(cv => String(cv.id) === fCliente)

          return matchSearch && matchMaterial && matchTubete && matchCliente
        }
      )
  }, [etiquetasList, search, fMaterial, fTubete, fCliente])

  /**
   * Agrupa valores ignorando maiúsculas/minúsculas e espaços sobrando. O
   * cadastro tem o mesmo material gravado de várias formas ("Pead" e "PEAD",
   * "Bopp Metal" e "BOPP METAL"), o que enchia o filtro de opções repetidas.
   * O filtro em si já compara sem diferenciar caixa, então mostrar uma linha
   * por valor distinto é suficiente — a grafia exibida é a mais frequente.
   */
  const agruparPorTexto = (valores: string[]) => {
    const mapa = new Map<string, Map<string, number>>()
    for (const bruto of valores) {
      const valor = (bruto || "").trim()
      if (!valor) continue
      const chave = valor.toLowerCase()
      const grafias = mapa.get(chave) ?? new Map<string, number>()
      grafias.set(valor, (grafias.get(valor) || 0) + 1)
      mapa.set(chave, grafias)
    }
    return Array.from(mapa.values())
      .map(grafias => {
        const ordenadas = Array.from(grafias.entries()).sort((a, b) => b[1] - a[1])
        const total = ordenadas.reduce((soma, [, n]) => soma + n, 0)
        return { label: ordenadas[0][0], total }
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }

  const opcoesMaterial = useMemo<FilterOption[]>(() => [
    { value: "", label: "Todos os materiais" },
    ...agruparPorTexto((etiquetasList || []).map(e => e.material)).map(m => ({
      value: m.label, label: m.label, hint: m.total,
    })),
  ], [etiquetasList])

  const opcoesTubete = useMemo<FilterOption[]>(() => [
    { value: "", label: "Todos os tubetes" },
    ...agruparPorTexto((etiquetasList || []).map(e => e.tipoTubete)).map(t => ({
      value: t.label, label: t.label, hint: t.total,
    })),
  ], [etiquetasList])

  // Empresas que têm etiqueta exclusiva, com a contagem de matrizes de cada uma.
  const empresas = useMemo(() => {
    const mapa = new Map<number, { id: number; razaoSocial: string; total: number }>()
    for (const e of etiquetasList || []) {
      for (const cv of e.clientesVinculados || []) {
        const atual = mapa.get(cv.id)
        if (atual) atual.total++
        else mapa.set(cv.id, { id: cv.id, razaoSocial: cv.razaoSocial, total: 1 })
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR'))
  }, [etiquetasList])

  const totalSemCliente = useMemo(
    () => (etiquetasList || []).filter(e => (e.clientesVinculados || []).length === 0).length,
    [etiquetasList]
  )

  const opcoesEmpresa = useMemo<FilterOption[]>(() => [
    { value: "", label: "Todas as empresas" },
    { value: "geral", label: "Catálogo geral", hint: totalSemCliente },
    ...empresas.map(emp => ({
      value: String(emp.id), label: emp.razaoSocial, hint: emp.total, group: "Empresas",
    })),
  ], [empresas, totalSemCliente])

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
              Registro técnico, medidas e vinculação as etiquetas de rótulos
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
                placeholder="Buscar por nome, código, material ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/50 focus-visible:bg-background border-border w-full"
              />
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
              <FilterCombobox
                aria-label="Filtrar por empresa"
                value={fCliente}
                onChange={setFCliente}
                options={opcoesEmpresa}
                searchPlaceholder="Buscar empresa..."
                emptyText="Nenhuma empresa encontrada."
                className="w-56 shrink-0"
                contentClassName="w-[320px]"
              />

              <FilterCombobox
                aria-label="Filtrar por material"
                value={fMaterial}
                onChange={setFMaterial}
                options={opcoesMaterial}
                searchPlaceholder="Buscar material..."
                emptyText="Nenhum material encontrado."
                className="w-44 shrink-0"
              />

              <FilterCombobox
                aria-label="Filtrar por tubete"
                value={fTubete}
                onChange={setFTubete}
                options={opcoesTubete}
                searchPlaceholder="Buscar tubete..."
                emptyText="Nenhum tubete encontrado."
                className="w-40 shrink-0"
              />

              {(fMaterial || fTubete || fCliente) && (
                <Button variant="ghost" size="sm" onClick={() => { setFMaterial(""); setFTubete(""); setFCliente("") }} className="shrink-0 h-9 px-2">
                  Limpar
                </Button>
              )}
            </div>

          </CardHeader>

          <CardContent className="p-0 border-t border-border/50">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Etiqueta</TableHead><TableHead>Empresa</TableHead><TableHead className="hidden sm:table-cell">Medida</TableHead><TableHead className="hidden lg:table-cell text-center">Cores</TableHead><TableHead className="hidden md:table-cell text-center">Tubete</TableHead><TableHead className="hidden xl:table-cell text-right">Volume Rolo</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right pr-6">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading && (!etiquetasList || etiquetasList.length === 0) ? (
                    <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground"><div className="flex justify-center items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div> Carregando dados...</div></TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground"><div className="flex flex-col items-center justify-center gap-2"><Layers className="size-8 opacity-20" /><p>Nenhuma etiqueta encontrada.</p></div></TableCell></TableRow>
                  ) : filtered.map((etiqueta) => (
                    <TableRow
                      key={etiqueta.id}
                      onClick={() => setDetailEtiqueta(etiqueta)}
                      className="hover:bg-muted/30 transition-colors border-border/30 bg-card cursor-pointer"
                    >
                      <TableCell className="max-w-[260px]">
                        <div className="flex flex-col">
                          <span className="font-medium text-[13px] text-foreground truncate">{etiqueta.nome}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">REF: {etiqueta.codigo}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        {(etiqueta.clientesVinculados || []).length === 0 ? (
                          <span className="text-[11px] text-muted-foreground/60 italic">Catálogo geral</span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[12px] text-foreground truncate" title={(etiqueta.clientesVinculados || []).map(cv => cv.razaoSocial).join(", ")}>
                              {etiqueta.clientesVinculados![0].razaoSocial}
                            </span>
                            {etiqueta.clientesVinculados!.length > 1 && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">
                                +{etiqueta.clientesVinculados!.length - 1} outra(s)
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5 text-[12px] text-foreground"><Ruler className="size-3 text-primary/70" />{formatEtiquetaMedida(etiqueta)}</span>
                          <span className="text-[10px] text-muted-foreground/70">{etiqueta.formato === "REDONDA" ? "Redonda" : "Retangular"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center text-[12px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><Palette className="size-3 text-primary/70" />{etiqueta.numeroCores != null ? etiqueta.numeroCores : "—"}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary hover:bg-primary/20">Tb. {etiqueta.tipoTubete}</Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-right text-[12px] text-muted-foreground">{etiqueta.quantidadePorRolo != null ? `${etiqueta.quantidadePorRolo} un` : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-foreground text-[13px]">{etiqueta.preco ? `R$ ${etiqueta.preco.toFixed(4)}` : "R$ 0,0000"}</span>
                          <span className="text-[10px] text-muted-foreground/70 uppercase font-semibold">{etiqueta.unidadeVenda === "MILHEIRO" ? "por mil" : "unitário"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => setDetailEtiqueta(etiqueta)} className="h-8 w-8 p-0 border border-border/50"><Eye className="size-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
        onSuccess={() => revalidate()}
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
