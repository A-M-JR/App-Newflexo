"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import {
  maskDecimalBR,
  maskInteiro,
  normalizarNumeroColado,
  numeroParaMascaraBR,
  parseDecimalBR,
} from "@/lib/masks"

interface NumeroBRInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "max"> {
  value: string | number | null | undefined
  /** Recebe o texto já mascarado ("1.234,56"). Converta com parseDecimalBR. */
  onValueChange: (valor: string) => void
  /** Casas decimais aceitas. 0 transforma o campo em inteiro. */
  casas?: number
  /** Teto do valor. Digitação/colagem acima disso é ignorada. */
  max?: number
}

/**
 * Reposiciona o cursor depois da remascarada, ancorando na quantidade de
 * dígitos que estavam à esquerda dele. Se o usuário acabou de digitar a
 * vírgula, o cursor precisa parar depois dela — senão o próximo dígito entra
 * antes da vírgula e o valor sai trocado.
 */
function posicaoDoCursor(paraMascarar: string, posBruta: number, mascarado: string): number {
  const antesDoCursor = paraMascarar.slice(0, Math.min(posBruta, paraMascarar.length))
  const digitosAntes = antesDoCursor.replace(/\D/g, "").length
  const terminaEmVirgula = antesDoCursor.endsWith(",")

  if (digitosAntes === 0) {
    return terminaEmVirgula ? mascarado.indexOf(",") + 1 : 0
  }

  let contados = 0
  let pos = mascarado.length
  for (let i = 0; i < mascarado.length; i++) {
    if (/\d/.test(mascarado[i])) {
      contados++
      if (contados === digitosAntes) {
        pos = i + 1
        break
      }
    }
  }
  if (terminaEmVirgula && mascarado[pos] === ",") pos++
  return pos
}

/**
 * Campo numérico no padrão brasileiro.
 *
 * Resolve duas coisas que a máscara sozinha não resolve:
 *
 * 1. **O ponto digitado.** A máscara trata todo ponto como separador de milhar
 *    (é o que a mantém estável durante a digitação). Aqui sabemos qual tecla foi
 *    apertada, então um "." ou "," digitado vira separador decimal de fato.
 *
 * 2. **A posição do cursor.** Como o valor é reformatado a cada tecla, o cursor
 *    saltaria para o fim do campo e editar no meio do número seria impossível.
 *    Guardamos quantos dígitos existiam antes do cursor e o recolocamos depois
 *    do mesmo dígito.
 */

export function NumeroBRInput({
  value,
  onValueChange,
  casas = 2,
  max,
  inputMode = "decimal",
  ...props
}: NumeroBRInputProps) {
  const ref = React.useRef<HTMLInputElement>(null)
  const cursorRef = React.useRef<number | null>(null)

  const texto =
    typeof value === "number"
      ? numeroParaMascaraBR(value, casas)
      : String(value ?? "")

  // Recoloca o cursor depois que o React repinta com o valor mascarado.
  React.useLayoutEffect(() => {
    const pos = cursorRef.current
    cursorRef.current = null
    if (pos === null || !ref.current) return
    if (document.activeElement !== ref.current) return
    ref.current.setSelectionRange(pos, pos)
  })

  const mascarar = (bruto: string) =>
    casas === 0 ? maskInteiro(bruto) : maskDecimalBR(bruto, casas)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const bruto = e.target.value
    const posBruta = e.target.selectionStart ?? bruto.length
    const anterior = texto

    let paraMascarar = bruto
    const diferenca = bruto.length - anterior.length

    if (diferenca === 1) {
      // Uma tecla. Se foi ponto ou vírgula, o usuário quis separar os decimais.
      const digitada = bruto[posBruta - 1]
      if (digitada === "." || digitada === ",") {
        const jaTemVirgula = anterior.includes(",")
        paraMascarar = jaTemVirgula || casas === 0
          ? anterior // ignora: só cabe uma vírgula
          : bruto.slice(0, posBruta - 1) + "," + bruto.slice(posBruta)
      }
    } else if (diferenca > 1) {
      // Colagem: aqui dá para resolver a ambiguidade do ponto com segurança.
      paraMascarar = casas === 0
        ? bruto
        : normalizarNumeroColado(bruto, casas)
    }

    const mascarado = mascarar(paraMascarar)

    // Teto: se o valor resultante passa do limite, ignora a alteração — o campo
    // volta ao valor anterior (input controlado) e o cursor fica onde estava.
    if (max != null && parseDecimalBR(mascarado) > max) {
      cursorRef.current = null
      onValueChange(anterior)
      return
    }

    cursorRef.current = posicaoDoCursor(paraMascarar, posBruta, mascarado)

    onValueChange(mascarado)
  }

  return (
    <Input
      ref={ref}
      type="text"
      inputMode={inputMode}
      value={texto}
      onChange={handleChange}
      {...props}
    />
  )
}
