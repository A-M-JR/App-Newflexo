"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export type FilterOption = {
  value: string
  label: string
  /** Contador ou detalhe curto, alinhado à direita da linha. */
  hint?: string | number
  /** Cabeçalho do bloco. Opções sem grupo aparecem primeiro, sem cabeçalho. */
  group?: string
}

interface FilterComboboxProps {
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  /** Texto do botão quando nada está selecionado. */
  placeholder?: string
  /** Texto dentro do campo de busca. */
  searchPlaceholder?: string
  emptyText?: string
  /** Mostra o campo de busca. Por padrão aparece a partir de 8 opções. */
  searchable?: boolean
  className?: string
  contentClassName?: string
  disabled?: boolean
  "aria-label"?: string
}

/**
 * Filtro suspenso padrão das listas.
 *
 * Existe para as barras de filtro pararem de misturar `<select>` nativo (que
 * não pesquisa, ignora o tema e abre uma lista interminável) com combobox feito
 * à mão em cada tela.
 */
export function FilterCombobox({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nada encontrado.",
  searchable,
  className,
  contentClassName,
  disabled,
  "aria-label": ariaLabel,
}: FilterComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const mostrarBusca = searchable ?? options.length >= 8
  const selecionada = options.find((o) => o.value === value)

  const semGrupo = options.filter((o) => !o.group)
  const grupos = React.useMemo(() => {
    const mapa = new Map<string, FilterOption[]>()
    for (const o of options) {
      if (!o.group) continue
      const atual = mapa.get(o.group)
      if (atual) atual.push(o)
      else mapa.set(o.group, [o])
    }
    return Array.from(mapa.entries())
  }, [options])

  const renderItem = (opcao: FilterOption) => (
    <CommandItem
      key={opcao.value || "__todos__"}
      // O cmdk filtra por este texto; usamos o rótulo visível.
      value={opcao.label}
      onSelect={() => {
        onChange(opcao.value)
        setOpen(false)
      }}
    >
      <Check className={cn("mr-2 size-4 shrink-0", value === opcao.value ? "opacity-100" : "opacity-0")} />
      <span className="flex-1 truncate">{opcao.label}</span>
      {opcao.hint != null && (
        <span className="ml-2 shrink-0 text-[10px] tabular-nums text-muted-foreground">{opcao.hint}</span>
      )}
    </CommandItem>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn("h-9 justify-between bg-background/50 px-3 font-normal", className)}
        >
          <span className={cn("truncate", !selecionada && "text-muted-foreground")}>
            {selecionada?.label ?? placeholder}
          </span>
          <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[280px] p-0", contentClassName)} align="start">
        <Command>
          {mostrarBusca && <CommandInput placeholder={searchPlaceholder} />}
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {semGrupo.length > 0 && <CommandGroup>{semGrupo.map(renderItem)}</CommandGroup>}
            {grupos.map(([nome, itens]) => (
              <CommandGroup key={nome} heading={nome}>
                {itens.map(renderItem)}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
