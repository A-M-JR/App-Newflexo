/**
 * Unidades de venda dos itens de orçamento e pedido.
 *
 * O campo era texto livre, então o mesmo conceito aparecia como "unid", "un",
 * "Unidade", "mil", "milheiro"... A lista abaixo é a referência; valores
 * antigos fora dela continuam sendo aceitos e exibidos (ver UnidadeSelect).
 */
export const UNIDADES = [
  { value: "unid", label: "Unidade" },
  { value: "mil", label: "Milheiro" },
  { value: "rolo", label: "Rolo" },
  { value: "cx", label: "Caixa" },
  { value: "pct", label: "Pacote" },
  { value: "m", label: "Metro" },
] as const

/**
 * Traduz a unidade de venda cadastrada na etiqueta (MILHEIRO/UNIDADE) para a
 * unidade do item. É o padrão ao trazer uma etiqueta do catálogo.
 */
export function unidadeDaEtiqueta(unidadeVenda?: string | null): string {
  return unidadeVenda === "MILHEIRO" ? "mil" : "unid"
}

/** Rótulo legível de uma unidade; devolve o próprio valor se não for conhecida. */
export function rotuloUnidade(valor?: string | null): string {
  if (!valor) return ""
  const encontrada = UNIDADES.find((u) => u.value.toLowerCase() === valor.trim().toLowerCase())
  return encontrada ? encontrada.label : valor
}
