// Bateria de testes das máscaras de campo. Não toca no banco.
//   node scripts/test-masks.mjs
import {
  maskCNPJ, maskCPF, maskCpfCnpj, maskTelefone, maskCEP, maskUF,
  maskInscricaoEstadual, maskDecimalBR, maskInteiro, parseDecimalBR,
  maskCurrency, currencyParaMascara, numeroParaMascaraBR, normalizarNumeroColado,
} from "../lib/masks.ts";

let ok = 0;
const falhas = [];

function eq(rotulo, obtido, esperado) {
  if (Object.is(obtido, esperado)) ok++;
  else falhas.push(`${rotulo}\n     esperado: ${JSON.stringify(esperado)}\n     obtido:   ${JSON.stringify(obtido)}`);
}

// --- CNPJ ------------------------------------------------------------------
eq("CNPJ completo", maskCNPJ("12345678000199"), "12.345.678/0001-99");
eq("CNPJ já formatado (reaplicar)", maskCNPJ("12.345.678/0001-99"), "12.345.678/0001-99");
eq("CNPJ com lixo", maskCNPJ("abc12345678000199xyz"), "12.345.678/0001-99");
eq("CNPJ excedente é cortado", maskCNPJ("123456780001999999"), "12.345.678/0001-99");
eq("CNPJ vazio", maskCNPJ(""), "");
// digitação progressiva
eq("CNPJ 2 dig", maskCNPJ("12"), "12");
eq("CNPJ 3 dig", maskCNPJ("123"), "12.3");
eq("CNPJ 5 dig", maskCNPJ("12345"), "12.345");
eq("CNPJ 6 dig", maskCNPJ("123456"), "12.345.6");
eq("CNPJ 8 dig", maskCNPJ("12345678"), "12.345.678");
eq("CNPJ 9 dig", maskCNPJ("123456780"), "12.345.678/0");
eq("CNPJ 12 dig", maskCNPJ("123456780001"), "12.345.678/0001");
eq("CNPJ 13 dig", maskCNPJ("1234567800019"), "12.345.678/0001-9");
// apagar caractere a caractere não pode travar
eq("CNPJ backspace no traço", maskCNPJ("12.345.678/0001-"), "12.345.678/0001");
eq("CNPJ backspace na barra", maskCNPJ("12.345.678/"), "12.345.678");

// --- CPF -------------------------------------------------------------------
eq("CPF completo", maskCPF("12345678901"), "123.456.789-01");
eq("CPF 4 dig", maskCPF("1234"), "123.4");
eq("CPF/CNPJ escolhe CPF", maskCpfCnpj("12345678901"), "123.456.789-01");
eq("CPF/CNPJ escolhe CNPJ", maskCpfCnpj("12345678000199"), "12.345.678/0001-99");

// --- Telefone --------------------------------------------------------------
eq("Tel celular 11 dig", maskTelefone("11987654321"), "(11) 98765-4321");
eq("Tel fixo 10 dig", maskTelefone("1132654321"), "(11) 3265-4321");
eq("Tel já formatado", maskTelefone("(11) 98765-4321"), "(11) 98765-4321");
eq("Tel 2 dig", maskTelefone("11"), "11");
eq("Tel 3 dig", maskTelefone("119"), "(11) 9");
eq("Tel 6 dig", maskTelefone("119876"), "(11) 9876");
eq("Tel 7 dig", maskTelefone("1198765"), "(11) 9876-5");
eq("Tel excedente cortado", maskTelefone("119876543219999"), "(11) 98765-4321");
eq("Tel vazio", maskTelefone(""), "");

// --- CEP / UF / IE ---------------------------------------------------------
eq("CEP completo", maskCEP("01310100"), "01310-100");
eq("CEP 5 dig", maskCEP("01310"), "01310");
eq("CEP já formatado", maskCEP("01310-100"), "01310-100");
eq("UF minúscula", maskUF("sp"), "SP");
eq("UF com número", maskUF("s1p"), "SP");
eq("UF excedente", maskUF("sped"), "SP");
eq("IE numérica", maskInscricaoEstadual("110.042.490.114"), "110042490114");
eq("IE isento", maskInscricaoEstadual("ISENTO"), "ISENTO");

// --- Decimais: máscara de digitação ---------------------------------------
eq("Dec vírgula", maskDecimalBR("1234,56"), "1.234,56");
// Contrato estrito: para a máscara, todo ponto é separador de milhar. O ponto
// digitado como decimal é tratado no NumeroBRInput (ver test-digitacao.mjs).
eq("Dec ponto é sempre milhar", maskDecimalBR("1234.56"), "123.456");
eq("Dec colado com milhar", maskDecimalBR("1.234,56"), "1.234,56");
eq("Dec corta casas extras", maskDecimalBR("10,98765", 2), "10,98");
eq("Dec 4 casas", maskDecimalBR("10,98765", 4), "10,9876");
eq("Dec duas vírgulas", maskDecimalBR("1,2,3"), "1,23");
eq("Dec zeros à esquerda", maskDecimalBR("007"), "7");
eq("Dec zero sozinho", maskDecimalBR("0"), "0");
eq("Dec começando com vírgula", maskDecimalBR("0,5"), "0,5");
eq("Dec vírgula pendente (digitando)", maskDecimalBR("12,"), "12,");
eq("Dec casas=0 descarta decimal", maskDecimalBR("12,5", 0), "12");
eq("Dec vazio", maskDecimalBR(""), "");
eq("Dec sem milhar quando desligado", maskDecimalBR("1234,56", 2, false), "1234,56");

// Milhar enquanto digita (o caso do campo Valor Unitário)
eq("Dec agrupa 250000", maskDecimalBR("250000", 4), "250.000");
eq("Dec agrupa 1234567,89", maskDecimalBR("1234567,89"), "1.234.567,89");
eq("Dec 3 dígitos não agrupa", maskDecimalBR("250"), "250");
eq("Dec 4 dígitos agrupa", maskDecimalBR("2500"), "2.500");
eq("Colado 1.5 vira decimal", normalizarNumeroColado("1.5", 4), "1,5");
eq("Colado 1234.56 formato US", normalizarNumeroColado("1234.56", 2), "1.234,56");
eq("Colado 1.234,56", normalizarNumeroColado("1.234,56", 2), "1.234,56");
eq("Colado R$ 250.000,00", normalizarNumeroColado("R$ 250.000,00", 2), "250.000");
eq("Colado vazio", normalizarNumeroColado("", 2), "");
eq("Dec X.YYY resolve como milhar", maskDecimalBR("1.500"), "1.500");

// Idempotência: reaplicar a máscara sobre a própria saída não pode mudar nada
for (const entrada of ["250000", "1234567,89", "1,5", "0,0839", "12,", "250", "2500", "1.500"]) {
  const uma = maskDecimalBR(entrada, 4);
  eq(`Idempotente maskDecimalBR(${entrada})`, maskDecimalBR(uma, 4), uma);
}
for (const entrada of ["1000", "250000", "7", "1.000"]) {
  const uma = maskInteiro(entrada);
  eq(`Idempotente maskInteiro(${entrada})`, maskInteiro(uma), uma);
}

// A saída da máscara tem que voltar ao número certo
eq("Round-trip 250000", parseDecimalBR(maskDecimalBR("250000", 4)), 250000);
eq("Round-trip 1234567,89", parseDecimalBR(maskDecimalBR("1234567,89")), 1234567.89);
eq("Round-trip 1.5 colado", parseDecimalBR(normalizarNumeroColado("1.5", 4)), 1.5);
eq("Round-trip 0,0839", parseDecimalBR(maskDecimalBR("0,0839", 4)), 0.0839);
eq("Round-trip inteiro 250000", parseDecimalBR(maskInteiro("250000")), 250000);

// --- Decimais: parse -------------------------------------------------------
eq("Parse BR simples", parseDecimalBR("1234,56"), 1234.56);
eq("Parse BR com milhar", parseDecimalBR("1.234,56"), 1234.56);
eq("Parse milhar sem decimal", parseDecimalBR("1.234"), 1234);
eq("Parse milhar duplo", parseDecimalBR("1.234.567,89"), 1234567.89);
eq("Parse formato US", parseDecimalBR("1234.56"), 1234.56);
eq("Parse inteiro", parseDecimalBR("1234"), 1234);
eq("Parse com R$", parseDecimalBR("R$ 1.234,56"), 1234.56);
eq("Parse número puro", parseDecimalBR(83.9), 83.9);
eq("Parse vazio", parseDecimalBR(""), 0);
eq("Parse null", parseDecimalBR(null), 0);
eq("Parse lixo", parseDecimalBR("abc"), 0);
eq("Parse negativo", parseDecimalBR("-12,5"), -12.5);
eq("Parse 4 casas", parseDecimalBR("83,9000"), 83.9);
eq("Parse 0,0839", parseDecimalBR("0,0839"), 0.0839);

// O caso que estava quebrado em produção:
eq("REGRESSAO preço com milhar não vira 1.234 nem 0",
   parseDecimalBR("1.234,56"), 1234.56);

// --- Moeda por centavos ----------------------------------------------------
eq("Currency 2 casas", maskCurrency("123456", 2), "1.234,56");
eq("Currency 4 casas", maskCurrency("839000", 4), "83,9000");
eq("Currency vazio", maskCurrency(""), "");
eq("Ida e volta 4 casas", currencyParaMascara(83.9, 4), "83,9000");
eq("Ida e volta 2 casas", currencyParaMascara(1234.56, 2), "1.234,56");
eq("Ida e volta null", currencyParaMascara(null, 4), "");
eq("Ida e volta zero", currencyParaMascara(0, 4), "0,0000");

// O bug do campo de preço por cliente (usava toString() sem toFixed):
eq("REGRESSAO preço por cliente 83,9 não vira 0,0839",
   parseDecimalBR(currencyParaMascara(83.9, 4)), 83.9);

// --- Número vindo do banco para o campo ------------------------------------
eq("Semente 250000", numeroParaMascaraBR(250000, 4), "250.000");
eq("Semente 83.9", numeroParaMascaraBR(83.9, 4), "83,9");
eq("Semente 0.0839", numeroParaMascaraBR(0.0839, 4), "0,0839");
eq("Semente 1234567.89", numeroParaMascaraBR(1234567.89, 2), "1.234.567,89");
eq("Semente null", numeroParaMascaraBR(null), "");
eq("Semente zero", numeroParaMascaraBR(0, 4), "0");
// a semente tem que ser estável ao passar pela máscara e voltar ao número
for (const n of [250000, 83.9, 0.0839, 1234567.89, 1, 0]) {
  const texto = numeroParaMascaraBR(n, 4);
  eq(`Semente idempotente ${n}`, maskDecimalBR(texto, 4), texto);
  eq(`Semente round-trip ${n}`, parseDecimalBR(texto), n);
}

// --- Inteiros --------------------------------------------------------------
eq("Inteiro tira letras", maskInteiro("12a3"), "123");
eq("Inteiro zeros à esquerda", maskInteiro("007"), "7");
eq("Inteiro com teto", maskInteiro("500", 100), "100");
eq("Inteiro vazio", maskInteiro(""), "");
eq("Inteiro agrupa milhar", maskInteiro("250000"), "250.000");
eq("Inteiro sem milhar quando desligado", maskInteiro("250000", undefined, false), "250000");

// ---------------------------------------------------------------------------
console.log(`\n  ${ok} passaram, ${falhas.length} falharam\n`);
if (falhas.length) {
  falhas.forEach((f) => console.log("  ✗ " + f + "\n"));
  process.exit(1);
}
console.log("  Todas as máscaras OK.\n");
