/**
 * Máscaras de campo da plataforma.
 *
 * Antes cada tela trazia a sua própria cópia de maskCNPJ/maskPhone/maskCEP —
 * quatro implementações levemente diferentes entre clientes/novo, clientes/[id],
 * configurações e o cadastro de vendedor. Aqui fica a versão única, coberta por
 * `scripts/test-masks.mjs`.
 *
 * Convenção: toda máscara aceita valor parcial (o usuário está digitando) e
 * nunca lança. Todo parser devolve 0 em vez de NaN.
 */

export function somenteDigitos(valor: string | number | null | undefined): string {
  return String(valor ?? "").replace(/\D/g, "")
}

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

/** 00.000.000/0000-00 */
export function maskCNPJ(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/** 000.000.000-00 */
export function maskCPF(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/**
 * Escolhe CPF ou CNPJ pelo tamanho. Até 11 dígitos formata como CPF; acima
 * disso, como CNPJ. Enquanto o usuário digita um CNPJ ele passa pelo formato de
 * CPF, o que é o comportamento normal desse tipo de campo combinado.
 */
export function maskCpfCnpj(valor: string): string {
  const d = somenteDigitos(valor)
  return d.length <= 11 ? maskCPF(d) : maskCNPJ(d)
}

/** Inscrição estadual: só dígitos, formato varia por UF — no máximo 14. */
export function maskInscricaoEstadual(valor: string): string {
  const limpo = String(valor ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "")
  if (limpo === "ISENTO" || "ISENTO".startsWith(limpo)) return limpo
  return somenteDigitos(valor).slice(0, 14)
}

// ---------------------------------------------------------------------------
// Contato e endereço
// ---------------------------------------------------------------------------

/** (00) 0000-0000 para fixo e (00) 00000-0000 para celular. */
export function maskTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11)
  if (d.length <= 2) return d
  // Até 10 dígitos trata como fixo (4 dígitos antes do traço).
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** 00000-000 */
export function maskCEP(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

/** Duas letras maiúsculas. */
export function maskUF(valor: string): string {
  return String(valor ?? "").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2)
}

// ---------------------------------------------------------------------------
// Números
// ---------------------------------------------------------------------------

/** Insere o ponto de milhar a cada três dígitos, da direita para a esquerda. */
function agruparMilhar(digitos: string): string {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

/**
 * Máscara de digitação para números no padrão brasileiro: ponto separa milhar,
 * vírgula separa decimal — o campo já aparece formatado enquanto se digita.
 *
 * A regra aqui é estrita e sem adivinhação: **todo ponto é separador de milhar
 * e é descartado; só a vírgula separa decimais**. Isso é o que torna a máscara
 * idempotente durante a digitação. Uma versão anterior tentava deduzir, pelo
 * padrão da pontuação, se o ponto era agrupamento nosso ou decimal digitado no
 * teclado numérico — e quebrava justamente no meio da digitação: ao teclar o
 * quinto dígito de "2.500" o texto virava "2.5000", que não bate com nenhum
 * agrupamento válido, e o valor era reinterpretado como "2,5000".
 *
 * Quem cuida do ponto digitado como decimal é o componente de entrada, que sabe
 * qual tecla o usuário acabou de apertar (ver NumeroBRInput). Para texto colado,
 * use `normalizarNumeroColado`.
 */
export function maskDecimalBR(valor: string, casas: number = 2, comMilhar: boolean = true): string {
  let s = String(valor ?? "")

  // Ponto é agrupamento; a vírgula é o único separador decimal.
  s = s.replace(/[^\d,]/g, "")

  const [inteiroBruto, ...resto] = s.split(",")
  // Remove zeros à esquerda, mas preserva o "0" sozinho e o "0," inicial.
  const inteiroDigitos = inteiroBruto.replace(/^0+(?=\d)/, "")
  const inteiro = comMilhar ? agruparMilhar(inteiroDigitos) : inteiroDigitos

  if (resto.length === 0) return inteiro
  if (casas === 0) return inteiro

  const decimais = resto.join("").slice(0, casas)
  return `${inteiro},${decimais}`
}

/**
 * Normaliza um texto colado para o formato da máscara.
 *
 * Diferente da digitação, aqui o texto chega inteiro e a ambiguidade do ponto
 * pode ser resolvida com segurança: `parseDecimalBR` entende "1.234,56",
 * "1234,56", "1234.56" e "R$ 1.234,56".
 */
export function normalizarNumeroColado(texto: string, casas: number = 2, comMilhar: boolean = true): string {
  if (!String(texto ?? "").trim()) return ""
  return numeroParaMascaraBR(parseDecimalBR(texto), casas, comMilhar)
}

/** Só dígitos, para campos inteiros (parcelas, número de cores, quantidade por rolo). */
export function maskInteiro(valor: string, maximo?: number, comMilhar: boolean = true): string {
  const d = somenteDigitos(valor).replace(/^0+(?=\d)/, "")
  if (!d) return ""
  if (maximo != null && Number(d) > maximo) return String(maximo)
  return comMilhar ? agruparMilhar(d) : d
}

/**
 * Formata um número no mesmo formato que `maskDecimalBR` produz, para semear o
 * campo com o valor vindo do banco ou do catálogo. Sem isso o input mostraria o
 * `toString()` do número — "83.9" com ponto, fora do padrão do campo.
 *
 * Não força zeros à direita: 250000 vira "250.000", não "250.000,0000".
 */
export function numeroParaMascaraBR(
  valor: number | string | null | undefined,
  casas: number = 2,
  comMilhar: boolean = true,
): string {
  if (valor === null || valor === undefined || valor === "") return ""
  const n = Number(valor)
  if (!Number.isFinite(n)) return ""
  const texto = n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  })
  return comMilhar ? texto : texto.replace(/\./g, "")
}

/**
 * Converte texto para número aceitando o padrão brasileiro.
 *
 * Substitui o `parseFloat(v.replace(',', '.'))` que estava espalhado pelas
 * telas: naquele formato "1.234,56" virava `parseFloat("1.234.56")` = 1.234 no
 * navegador e `Number("1.234.56")` = NaN → 0 no servidor, ou seja, a tela
 * mostrava um total e o banco gravava outro.
 *
 * Nunca devolve NaN.
 */
export function parseDecimalBR(valor: string | number | null | undefined): number {
  if (valor == null || valor === "") return 0
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0

  const s = String(valor).trim().replace(/[^\d,.-]/g, "")
  if (!s || s === "-") return 0

  const negativo = s.startsWith("-")
  const corpo = s.replace(/-/g, "")

  const posVirgula = corpo.lastIndexOf(",")
  const posPonto = corpo.lastIndexOf(".")
  const separador = Math.max(posVirgula, posPonto)

  let n: number
  if (separador === -1) {
    n = Number(corpo)
  } else {
    const decimais = corpo.slice(separador + 1)
    const temVirgula = posVirgula !== -1
    // "1.234" (ponto, exatamente 3 casas, sem vírgula nenhuma) é milhar, não decimal.
    const ehMilhar = !temVirgula && corpo[separador] === "." && decimais.length === 3
    if (ehMilhar) {
      n = Number(corpo.replace(/\./g, ""))
    } else {
      const inteiro = corpo.slice(0, separador).replace(/[.,]/g, "")
      n = Number(`${inteiro || "0"}.${decimais.replace(/[.,]/g, "")}`)
    }
  }

  if (!Number.isFinite(n)) return 0
  return negativo ? -n : n
}

/**
 * Máscara de moeda "por centavos": os dígitos preenchem as casas decimais da
 * direita para a esquerda. Usada no cadastro de etiqueta, que trabalha com 4
 * casas. Devolve o número já formatado em pt-BR, com separador de milhar.
 */
export function maskCurrency(valor: string, casas: number = 2): string {
  const d = somenteDigitos(valor)
  if (!d) return ""
  const numero = Number(d) / Math.pow(10, casas)
  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

/**
 * Converte um número para o texto que `maskCurrency` produziria.
 * Existe porque as telas precisavam fazer `preco.toFixed(4).replace('.', '')`
 * na mão para reidratar o campo — e um dos pontos usava `toString()` sem o
 * toFixed, transformando 83,9 em 0,0839.
 */
export function currencyParaMascara(valor: number | null | undefined, casas: number = 2): string {
  if (valor == null) return ""
  return maskCurrency(Number(valor).toFixed(casas).replace(".", ""), casas)
}
