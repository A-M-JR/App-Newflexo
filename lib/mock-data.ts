import {
  Cliente,
  Etiqueta,
  Orcamento,
  Pedido,
  Vendedor,
  User,
  AIConfig,
  Empresa
} from "./types"

export let empresaDefault: Empresa = {
  id: 1,
  razaoSocial: "M F LABELS INDUSTRIA GRAFICA LTDA",
  nomeFantasia: "Newflexo Rótulos e Etiquetas",
  cnpj: "18.330.143/0001-38",
  telefone: "(62) 3142-9993",
  email: "contato@newflexo.com",
  endereco: {
    cep: "74474-046",
    logradouro: "R Jg 17",
    numero: "S/N",
    complemento: "Qa 27 Lt 18 Ao 20",
    bairro: "Jardim Guanabara II",
    cidade: "Goiânia",
    estado: "GO",
  },
  corSidebar: "#0f264a"
}

export const vendedores: Vendedor[] = [
  {
    id: 1,
    nome: "Carlos Eduardo",
    email: "carlos.eduardo@newflexo.com.br",
    telefone: "(62) 99999-1111",
    comissao: 5,
    regiao: "Centro-Oeste",
    criadoEm: "2024-01-01",
  },
  {
    id: 2,
    nome: "Ana Silva",
    email: "ana.silva@newflexo.com.br",
    telefone: "(11) 99999-2222",
    comissao: 5,
    regiao: "Sudeste",
    criadoEm: "2024-01-01",
  },
  {
    id: 3,
    nome: "Roberto Costa",
    email: "roberto.costa@newflexo.com.br",
    telefone: "(85) 99999-3333",
    comissao: 5,
    regiao: "Nordeste",
    criadoEm: "2024-01-01",
  },
]

export const users: User[] = [
  {
    id: 1,
    nome: "Admin System",
    email: "admin@newflexo.com.br",
    role: "admin",
    criadoEm: "2024-01-01",
  },
  {
    id: 2,
    nome: "Carlos Eduardo",
    email: "carlos.eduardo@newflexo.com.br",
    role: "vendedor",
    vendedorId: 1,
    criadoEm: "2024-01-01",
  },
  {
    id: 3,
    nome: "Ana Silva",
    email: "ana.silva@newflexo.com.br",
    role: "vendedor",
    vendedorId: 2,
    criadoEm: "2024-01-01",
  },
  {
    id: 4,
    nome: "Roberto Costa",
    email: "roberto.costa@newflexo.com.br",
    role: "vendedor",
    vendedorId: 3,
    criadoEm: "2024-01-01",
  },
]

export const clientes: Cliente[] = [
  {
    id: 1,
    razaoSocial: "Santa Lucia Industria e Comercio de Carnes Ltda",
    endereco: "Rod. BR-153, Km 42 - Distrito Industrial",
    telefone: "(62) 3333-4455",
    cnpj: "12.345.678/0001-90",
    ie: "10.987.654-3",
    cep: "75000-000",
    cidade: "Anapolis",
    estado: "GO",
    observacoes: "Cliente preferencial. Entrega prioritaria.",
    criadoEm: "2024-01-15",
    ultimaCompra: "2024-06-06",
  },
  {
    id: 2,
    razaoSocial: "Alimentos Bom Sabor S.A.",
    endereco: "Av. das Industrias, 1500 - Bloco B",
    telefone: "(11) 4002-8922",
    cnpj: "98.765.432/0001-10",
    ie: "123.456.789.000",
    cep: "06454-000",
    cidade: "Barueri",
    estado: "SP",
    observacoes: "Solicitar aprovacao de cores antes da producao.",
    criadoEm: "2024-02-20",
    ultimaCompra: "2024-03-15",
  },
  {
    id: 3,
    razaoSocial: "Bebidas Tropical Ltda ME",
    endereco: "Rua dos Limoeiros, 320 - Sala 5",
    telefone: "(85) 3232-1010",
    cnpj: "55.123.456/0001-77",
    ie: "06.000.333-0",
    cep: "60160-230",
    cidade: "Fortaleza",
    estado: "CE",
    criadoEm: "2024-03-10",
    ultimaCompra: "2024-06-10",
  },
  {
    id: 4,
    razaoSocial: "Fazenda Sao Joao",
    endereco: "Estrada Rural Km 12",
    telefone: "(16) 9988-7766",
    cnpj: "11.222.333/0001-44",
    ie: "Isento",
    cep: "14000-000",
    cidade: "Ribeirao Preto",
    estado: "SP",
    criadoEm: "2023-11-05",
    ultimaCompra: "2024-02-10",
  },
]

export const etiquetas: Etiqueta[] = [
  {
    id: 1,
    nome: "Rotulo Linguica Toscana",
    codigo: "RTL-001",
    material: "BOPP Brilho",
    tipoAdesivo: "Acrilico permanente",
    largura: 100,
    altura: 150,
    numeroCores: 4,
    tipoTubete: "76mm",
    quantidadePorRolo: 1000,
    observacoesTecnicas: "Impressao flexografica. Resistente a baixa temperatura.",
  },
  {
    id: 2,
    nome: "Etiqueta Codigo de Barras",
    codigo: "ECB-002",
    material: "Papel Couche",
    tipoAdesivo: "Hot-melt",
    largura: 50,
    altura: 30,
    numeroCores: 1,
    tipoTubete: "40mm",
    quantidadePorRolo: 5000,
    observacoesTecnicas: "Impressao termica direta compativel.",
  },
  {
    id: 3,
    nome: "Rotulo Suco Tropical Manga",
    codigo: "RST-003",
    material: "BOPP Fosco",
    tipoAdesivo: "Acrilico permanente",
    largura: 120,
    altura: 80,
    numeroCores: 6,
    tipoTubete: "76mm",
    quantidadePorRolo: 2000,
    observacoesTecnicas: "Acabamento com verniz UV. Resistente a umidade.",
  },
  {
    id: 4,
    nome: "Etiqueta Lacre Seguranca",
    codigo: "ELS-004",
    material: "PVC Destrutivel",
    tipoAdesivo: "Acrilico ultra permanente",
    largura: 40,
    altura: 20,
    numeroCores: 2,
    tipoTubete: "40mm",
    quantidadePorRolo: 10000,
    observacoesTecnicas: "Material void/destrutivel para lacre de garantia.",
  },
  {
    id: 5,
    nome: "Rotulo Cerveja Artesanal",
    codigo: "RCA-005",
    material: "Papel Adesivo Metalizado",
    tipoAdesivo: "Acrilico permanente",
    largura: 90,
    altura: 110,
    numeroCores: 5,
    tipoTubete: "76mm",
    quantidadePorRolo: 1500,
    observacoesTecnicas: "Acabamento com hot stamping dourado. Resistente a umidade.",
  },
]

export const orcamentos: Orcamento[] = [
  {
    id: 1,
    numero: "ORC-2024-001",
    clienteId: 1,
    vendedorId: 1,
    status: "aprovado",
    observacoes: "Cliente solicitou urgencia na entrega.",
    criadoEm: "2024-06-01",
    atualizadoEm: "2024-06-05",
    itens: [
      {
        id: 1,
        orcamentoId: 1,
        etiquetaId: 1,
        descricao: "Rotulo Linguica Toscana 100x150mm - BOPP Brilho - 4 cores - 1000 unid/rolo - Tubete 76mm",
        quantidade: 50000,
        unidade: "unid",
        precoUnitario: 0.08,
        total: 4000,
      },
      {
        id: 2,
        orcamentoId: 1,
        etiquetaId: 2,
        descricao: "Etiqueta Codigo de Barras 50x30mm - Papel Couche - 1 cor - 5000 unid/rolo - Tubete 40mm",
        quantidade: 100000,
        unidade: "unid",
        precoUnitario: 0.02,
        total: 2000,
      },
    ],
    totalGeral: 6000,
  },
  {
    id: 2,
    numero: "ORC-2024-002",
    clienteId: 3,
    vendedorId: 3,
    status: "rascunho",
    observacoes: "",
    criadoEm: "2024-06-10",
    atualizadoEm: "2024-06-10",
    itens: [
      {
        id: 3,
        orcamentoId: 2,
        etiquetaId: 3,
        descricao: "Rotulo Suco Tropical Manga 120x80mm - BOPP Fosco - 6 cores - 2000 unid/rolo - Tubete 76mm",
        quantidade: 30000,
        unidade: "unid",
        precoUnitario: 0.12,
        total: 3600,
      },
    ],
    totalGeral: 3600,
  },
]

export const pedidos: Pedido[] = [
  {
    id: 1,
    numero: "PED-2024-001",
    orcamentoId: 1,
    clienteId: 1,
    vendedorId: 1,
    status: "em_producao",
    sentidoSaidaRolo: "Externo / Lado esquerdo",
    tipoTubete: "76mm",
    gapEntreEtiquetas: "3mm",
    numeroPistas: 2,
    observacoesEmbalagem: "Embalar individualmente em filme stretch. Identificar cada rolo.",
    observacoesFaturamento: "Faturar CNPJ principal. NF com CFOP 5101.",
    prazoEntrega: "15/07/2024",
    formaPagamento: "Boleto 30/60 dias",
    comprador: "Maria Helena",
    frete: "CIF - por conta da Newflexo",
    observacoesGerais: "URGENTE: Producao prioritaria conforme acordado com diretoria. Entregar no deposito 2 - Doca B.",
    criadoEm: "2024-06-06",
    atualizadoEm: "2024-06-06",
    itens: [
      {
        id: 1,
        pedidoId: 1,
        etiquetaId: 1,
        descricao: "Rotulo Linguica Toscana 100x150mm - BOPP Brilho - 4 cores - 1000 unid/rolo - Tubete 76mm\nModelo: Santa Lucia Premium\nDestino: Linha de producao SP",
        quantidade: 50000,
        unidade: "unid",
        precoUnitario: 0.08,
        total: 4000,
      },
      {
        id: 2,
        pedidoId: 1,
        etiquetaId: 2,
        descricao: "Etiqueta Codigo de Barras 50x30mm - Papel Couche - 1 cor - 5000 unid/rolo - Tubete 40mm\nModelo: EAN-13 padrao\nDestino: Logistica e expedicao",
        quantidade: 100000,
        unidade: "unid",
        precoUnitario: 0.02,
        total: 2000,
      },
    ],
    totalGeral: 6000,
  },
]

// Helper functions
export function getUserById(id: number | string): User | undefined {
  return users.find((u) => u.id === Number(id))
}

export function getUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email === email)
}

export function getVendedorById(id: number | string): Vendedor | undefined {
  return vendedores.find((v) => v.id === Number(id))
}

export function getVendedorByEmail(email: string): Vendedor | undefined {
  return vendedores.find((v) => v.email === email)
}

export function getClienteById(id: number | string): Cliente | undefined {
  return clientes.find((c) => c.id === Number(id))
}

export function getEtiquetaById(id: number | string): Etiqueta | undefined {
  return etiquetas.find((e) => e.id === Number(id))
}

export function getOrcamentoById(id: number | string): Orcamento | undefined {
  return orcamentos.find((o) => o.id === Number(id))
}

export function getPedidoById(id: number | string): Pedido | undefined {
  return pedidos.find((p) => p.id === Number(id))
}

export function getOrcamentosByCliente(clienteId: number | string): Orcamento[] {
  return orcamentos.filter((o) => o.clienteId === Number(clienteId))
}

export function getOrcamentosByVendedor(vendedorId: number | string): Orcamento[] {
  return orcamentos.filter((o) => o.vendedorId === Number(vendedorId))
}

export function getPedidosByVendedor(vendedorId: number | string): Pedido[] {
  return pedidos.filter((p) => p.vendedorId === Number(vendedorId))
}

export function getPedidosByCliente(clienteId: number | string): Pedido[] {
  return pedidos.filter((p) => p.clienteId === Number(clienteId))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    rascunho: "Rascunho",
    em_analise: "Em Análise",
    enviado: "Enviado",
    aprovado: "Aprovado",
    recusado: "Recusado",
    em_producao: "Em Produção",
    separacao: "Em Separação",
    faturado: "Faturado",
    entregue: "Entregue",
    cancelado: "Cancelado",
  }
  return map[status] || status
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    rascunho: "bg-muted/50 text-muted-foreground border-border/50 border",
    em_analise: "bg-violet-500/10 text-violet-700 border-violet-500/20 border dark:text-violet-400",
    enviado: "bg-blue-500/10 text-blue-700 border-blue-500/20 border dark:text-blue-400",
    aprovado: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 border dark:text-emerald-400",
    recusado: "bg-red-500/10 text-red-700 border-red-500/20 border dark:text-red-400",
    em_producao: "bg-amber-500/10 text-amber-700 border-amber-500/20 border dark:text-amber-400",
    separacao: "bg-purple-500/10 text-purple-700 border-purple-500/20 border dark:text-purple-400",
    faturado: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 border dark:text-emerald-400",
    entregue: "bg-teal-500/10 text-teal-700 border-teal-500/20 border dark:text-teal-400",
    cancelado: "bg-red-500/10 text-red-700 border-red-500/20 border dark:text-red-400",
  }
  return map[status] || "bg-muted/50 text-muted-foreground border-border/50 border"
}
