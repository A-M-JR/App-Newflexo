"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UNIDADES } from "@/lib/unidades"

interface UnidadeSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  "aria-label"?: string
}

/**
 * Seletor da unidade de venda do item.
 *
 * Substitui o campo de texto livre que deixava "unid", "un" e "Unidade"
 * convivendo no mesmo cadastro. Um valor gravado fora da lista padrão continua
 * aparecendo como opção, para não sumir da tela ao abrir um pedido antigo.
 */
export function UnidadeSelect({
  value,
  onChange,
  className,
  disabled,
  "aria-label": ariaLabel,
}: UnidadeSelectProps) {
  const atual = (value || "").trim()
  const conhecida = UNIDADES.some((u) => u.value.toLowerCase() === atual.toLowerCase())

  return (
    <Select value={atual} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} className={cn("bg-muted/20", className)}>
        <SelectValue placeholder="Unidade" />
      </SelectTrigger>
      <SelectContent>
        {UNIDADES.map((u) => (
          <SelectItem key={u.value} value={u.value}>
            {u.label} <span className="text-muted-foreground">({u.value})</span>
          </SelectItem>
        ))}
        {atual && !conhecida && (
          <SelectItem value={atual}>
            {atual} <span className="text-muted-foreground">(cadastrado)</span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}
