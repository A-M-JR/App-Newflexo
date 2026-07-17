import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, decimals: number = 2) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Formata uma data "somente dia" (string "YYYY-MM-DD", ISO ou Date) em DD/MM/AAAA
 * SEM aplicar fuso horário. Usa a parte da data da string, evitando o clássico
 * "volta um dia" que acontece quando `new Date("2026-08-07")` é lido como UTC e
 * depois exibido em horário local (UTC-3).
 */
export function formatDateBR(value?: string | Date | null): string {
  if (!value) return ''
  const s = typeof value === 'string' ? value : value.toISOString()
  const datePart = s.slice(0, 10)
  const [y, m, d] = datePart.split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

export function maskCurrency(value: string, decimals: number = 2) {
  const cleanValue = value.replace(/\D/g, '')
  if (!cleanValue) return ''
  const numberValue = Number(cleanValue) / Math.pow(10, decimals)
  return numberValue.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function parseCurrencyToNumber(value: string): number {
  if (!value) return 0
  return Number(value.replace(/\D/g, '')) / 10000 // Fixo para 4 casas no parse de etiquetas
}

export function formatEtiquetaMedida(etiqueta: {
  formato?: string | null
  largura: number
  altura: number
}): string {
  if (etiqueta.formato === "REDONDA") {
    return `Ø ${etiqueta.largura}mm`
  }
  return `${etiqueta.largura}x${etiqueta.altura}mm`
}

export function formatUnidadeVenda(unidadeVenda?: string | null): string {
  return unidadeVenda === "MILHEIRO" ? "mil" : "un"
}
