// Simula a digitação tecla a tecla no NumeroBRInput, incluindo a posição do
// cursor. É o teste que faltava: a máscara passava em todos os casos isolados e
// ainda assim transformava "250000" digitado em "2,5000", porque o defeito só
// aparecia na sequência de teclas.
//   node --experimental-strip-types scripts/test-digitacao.mjs
import {
  maskDecimalBR,
  maskInteiro,
  normalizarNumeroColado,
} from "../lib/masks.ts";

let ok = 0;
const falhas = [];
function eq(rotulo, obtido, esperado) {
  if (Object.is(obtido, esperado)) ok++;
  else falhas.push(`${rotulo}\n     esperado: ${JSON.stringify(esperado)}\n     obtido:   ${JSON.stringify(obtido)}`);
}

/** Réplica da lógica de NumeroBRInput.handleChange, sem o DOM. */
function aplicar(anterior, bruto, posBruta, casas) {
  let paraMascarar = bruto;
  const diferenca = bruto.length - anterior.length;

  if (diferenca === 1) {
    const digitada = bruto[posBruta - 1];
    if (digitada === "." || digitada === ",") {
      const jaTemVirgula = anterior.includes(",");
      paraMascarar = jaTemVirgula || casas === 0
        ? anterior
        : bruto.slice(0, posBruta - 1) + "," + bruto.slice(posBruta);
    }
  } else if (diferenca > 1) {
    paraMascarar = casas === 0 ? bruto : normalizarNumeroColado(bruto, casas);
  }

  const mascarado = casas === 0 ? maskInteiro(paraMascarar) : maskDecimalBR(paraMascarar, casas);

  const antesDoCursor = paraMascarar.slice(0, Math.min(posBruta, paraMascarar.length));
  const digitosAntes = antesDoCursor.replace(/\D/g, "").length;
  const terminaEmVirgula = antesDoCursor.endsWith(",");

  let novaPos;
  if (digitosAntes === 0) {
    novaPos = terminaEmVirgula ? mascarado.indexOf(",") + 1 : 0;
  } else {
    let contados = 0;
    novaPos = mascarado.length;
    for (let i = 0; i < mascarado.length; i++) {
      if (/\d/.test(mascarado[i])) {
        contados++;
        if (contados === digitosAntes) { novaPos = i + 1; break; }
      }
    }
    if (terminaEmVirgula && mascarado[novaPos] === ",") novaPos++;
  }
  return { valor: mascarado, cursor: novaPos };
}

/** Digita `teclas` uma a uma a partir de `inicial`, com o cursor em `posInicial`. */
function digitar(inicial, teclas, casas = 4, posInicial = null) {
  let valor = inicial;
  let cursor = posInicial === null ? inicial.length : posInicial;
  for (const t of teclas) {
    const bruto = valor.slice(0, cursor) + t + valor.slice(cursor);
    const r = aplicar(valor, bruto, cursor + 1, casas);
    valor = r.valor;
    cursor = r.cursor;
  }
  return valor;
}

/** Apaga `n` caracteres à esquerda do cursor (Backspace). */
function apagar(inicial, n, casas = 4, posInicial = null) {
  let valor = inicial;
  let cursor = posInicial === null ? inicial.length : posInicial;
  for (let i = 0; i < n; i++) {
    if (cursor === 0) break;
    const bruto = valor.slice(0, cursor - 1) + valor.slice(cursor);
    const r = aplicar(valor, bruto, cursor - 1, casas);
    valor = r.valor;
    cursor = r.cursor;
  }
  return valor;
}

// --- REGRESSÃO: o defeito que apareceu em produção -------------------------
eq("digita 250000", digitar("", "250000"), "250.000");
eq("digita 100", digitar("", "100"), "100");
eq("digita 1000", digitar("", "1000"), "1.000");
eq("digita 10000", digitar("", "10000"), "10.000");
eq("digita 1234567", digitar("", "1234567"), "1.234.567");

// --- decimais --------------------------------------------------------------
eq("digita 100,50", digitar("", "100,50"), "100,50");
eq("digita 100.50 (numpad)", digitar("", "100.50"), "100,50");
eq("digita 250000,99", digitar("", "250000,99"), "250.000,99");
eq("digita 0,0839", digitar("", "0,0839"), "0,0839");
eq("digita 3,2322", digitar("", "3,2322"), "3,2322");
eq("segunda vírgula é ignorada", digitar("", "1,5,7"), "1,57");
eq("respeita o teto de casas", digitar("", "1,23456", 4), "1,2345");
eq("2 casas corta em 2", digitar("", "1,23456", 2), "1,23");

// --- edição no meio do número ---------------------------------------------
eq("insere no início de 1.000", digitar("1.000", "2", 4, 0), "21.000");
eq("insere no início de 3,2322", digitar("3,2322", "1", 4, 0), "13,2322");
eq("insere 100 no início de 3,2322", digitar("3,2322", "100", 4, 0), "1.003,2322");

// --- apagar ----------------------------------------------------------------
eq("backspace em 250.000", apagar("250.000", 1), "25.000");
eq("backspace até esvaziar", apagar("250.000", 6), "");
eq("backspace sobre o ponto de milhar", apagar("1.000", 1), "100");
eq("backspace apaga os decimais", apagar("100,50", 2), "100,");
eq("backspace remove também a vírgula", apagar("100,50", 3), "100");

// --- colagem ---------------------------------------------------------------
eq("cola 1.234,56", digitar("", ["1.234,56"], 4), "1.234,56");
eq("cola 1234.56 (formato US)", digitar("", ["1234.56"], 4), "1.234,56");
eq("cola R$ 250.000,00", digitar("", ["R$ 250.000,00"], 4), "250.000");
eq("cola 250000", digitar("", ["250000"], 4), "250.000");

// --- inteiro (quantidade) --------------------------------------------------
eq("inteiro digita 1000", digitar("", "1000", 0), "1.000");
eq("inteiro ignora vírgula", digitar("", "1,5", 0), "15");
eq("inteiro backspace", apagar("1.000", 1, 0), "100");

// ---------------------------------------------------------------------------
console.log(`\n  ${ok} passaram, ${falhas.length} falharam\n`);
if (falhas.length) {
  falhas.forEach((f) => console.log("  ✗ " + f + "\n"));
  process.exit(1);
}
console.log("  Digitação OK.\n");
