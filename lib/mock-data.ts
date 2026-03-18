import {
  Cliente,
  Etiqueta,
  Orcamento,
  Pedido,
  ProducaoStatus,
  Vendedor,
  User,
  Notificacao,
  AIConfig,
  Empresa
} from "./types"

export let empresaDefault: Empresa = {
  id: "emp-1",
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
    id: "vnd-001",
    nome: "Carlos Eduardo",
    email: "carlos.eduardo@newflexo.com.br",
    telefone: "(62) 99999-1111",
    comissao: 5,
    regiao: "Centro-Oeste",
    criadoEm: "2024-01-01",
  },
  {
    id: "vnd-002",
    nome: "Ana Silva",
    email: "ana.silva@newflexo.com.br",
    telefone: "(11) 99999-2222",
    comissao: 5,
    regiao: "Sudeste",
    criadoEm: "2024-01-01",
  },
  {
    id: "vnd-003",
    nome: "Roberto Costa",
    email: "roberto.costa@newflexo.com.br",
    telefone: "(85) 99999-3333",
    comissao: 5,
    regiao: "Nordeste",
    criadoEm: "2024-01-01",
  },
]

// --- Módulo IA ---
export const aiConfigDefault: AIConfig = {
  provider: "gemini-flash",
  apiKey: "AIzaSyD_kCVvcfBvjN9P-_v5-godTnlrGBPXnJ8",
  systemPrompt: `Você é o Assistente Especialista da Newflexo, responsável por auxiliar na gestão de uma gráfica de etiquetas e rótulos.
 
Sua personalidade: Profissional, eficiente e focado em resultados.
 
DIRETRIZES DE COMPORTAMENTO:
1. ESCOPO RESTRITO: Você só pode responder sobre temas da Newflexo(Pedidos, Orçamentos, Clientes, CRM, Produção Gráfica).Se o usuário perguntar sobre outros temas(receitas, notícias, programação geral), recuse educadamente.
2. AÇÕES DO SISTEMA: Você tem permissão para usar ferramentas para:
- 'buscar_cnpj': Sempre use quando o usuário fornecer um CNPJ.
   - 'gerar_orcamento': Use quando o usuário quiser criar uma cotação.
   - 'abrir_pedido': Use para converter demandas em ordens de produção.
3. VISÃO(IMAGES): Se o usuário enviar uma imagem, analise como se fosse uma arte de etiqueta ou foto de produto gráfico.Verifique cores, faca e texto.
4. TONS E VALORES: Sempre use R$ para moedas e o formato brasileiro para datas.
5. CONTEXTO DE NEGÓCIO: Lembre - se que a Newflexo lida com 'Metragem', 'Sentido de Rebobinagem', 'Cores Pantone' e 'Tipos de Papel (BOPP, Couché, Térmico)'.`,
  monthlyLimit: 500
}

export const users: User[] = [
  {
    id: "usr-001",
    nome: "Admin System",
    email: "admin@newflexo.com.br",
    role: "admin",
    criadoEm: "2024-01-01",
  },
  {
    id: "usr-002",
    nome: "Carlos Eduardo",
    email: "carlos.eduardo@newflexo.com.br",
    role: "vendedor",
    vendedorId: "vnd-001",
    criadoEm: "2024-01-01",
  },
  {
    id: "usr-003",
    nome: "Ana Silva",
    email: "ana.silva@newflexo.com.br",
    role: "vendedor",
    vendedorId: "vnd-002",
    criadoEm: "2024-01-01",
  },
  {
    id: "usr-004",
    nome: "Roberto Costa",
    email: "roberto.costa@newflexo.com.br",
    role: "vendedor",
    vendedorId: "vnd-003",
    criadoEm: "2024-01-01",
  },
]

export const clientes: Cliente[] = [
  {
    id: "cli-001",
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
    ultimaCompra: "2024-06-06", // Recente
  },
  {
    id: "cli-002",
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
    ultimaCompra: "2024-03-15", // Mais de 30 dias atrÃ¡s
  },
  {
    id: "cli-003",
    razaoSocial: "Bebidas Tropical Ltda ME",
    endereco: "Rua dos Limoeiros, 320 - Sala 5",
    telefone: "(85) 3232-1010",
    cnpj: "55.123.456/0001-77",
    ie: "06.000.333-0",
    cep: "60160-230",
    cidade: "Fortaleza",
    estado: "CE",
    criadoEm: "2024-03-10",
    ultimaCompra: "2024-06-10", // Recente
  },
  {
    id: "cli-004",
    razaoSocial: "Fazenda Sao Joao",
    endereco: "Estrada Rural Km 12",
    telefone: "(16) 9988-7766",
    cnpj: "11.222.333/0001-44",
    ie: "Isento",
    cep: "14000-000",
    cidade: "Ribeirao Preto",
    estado: "SP",
    criadoEm: "2023-11-05",
    ultimaCompra: "2024-02-10", // Mais de 30 dias (Risco de churn)
  },
]

export const etiquetas: Etiqueta[] = [
  {
    id: "etq-001",
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
    id: "etq-002",
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
    id: "etq-003",
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
    id: "etq-004",
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
    id: "etq-005",
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
    id: "orc-001",
    numero: "ORC-2024-001",
    clienteId: "cli-001",
    vendedorId: "vnd-001",
    status: "aprovado",
    observacoes: "Cliente solicitou urgencia na entrega.",
    criadoEm: "2024-06-01",
    atualizadoEm: "2024-06-05",
    itens: [
      {
        id: "item-orc-001",
        orcamentoId: "orc-001",
        etiquetaId: "etq-001",
        descricao: "Rotulo Linguica Toscana 100x150mm - BOPP Brilho - 4 cores - 1000 unid/rolo - Tubete 76mm",
        quantidade: 50000,
        unidade: "unid",
        precoUnitario: 0.08,
        total: 4000,
      },
      {
        id: "item-orc-002",
        orcamentoId: "orc-001",
        etiquetaId: "etq-002",
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
    id: "orc-002",
    numero: "ORC-2024-002",
    clienteId: "cli-003",
    vendedorId: "vnd-003",
    status: "rascunho",
    observacoes: "",
    criadoEm: "2024-06-10",
    atualizadoEm: "2024-06-10",
    itens: [
      {
        id: "item-orc-003",
        orcamentoId: "orc-002",
        etiquetaId: "etq-003",
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
    id: "ped-001",
    numero: "PED-2024-001",
    orcamentoId: "orc-001",
    clienteId: "cli-001",
    vendedorId: "vnd-001",
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
        id: "item-ped-001",
        pedidoId: "ped-001",
        etiquetaId: "etq-001",
        descricao: "Rotulo Linguica Toscana 100x150mm - BOPP Brilho - 4 cores - 1000 unid/rolo - Tubete 76mm\nModelo: Santa Lucia Premium\nDestino: Linha de producao SP",
        quantidade: 50000,
        unidade: "unid",
        precoUnitario: 0.08,
        total: 4000,
      },
      {
        id: "item-ped-002",
        pedidoId: "ped-001",
        etiquetaId: "etq-002",
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
export function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id)
}

export function getUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email === email)
}

export function getVendedorById(id: string): Vendedor | undefined {
  return vendedores.find((v) => v.id === id)
}

export function getVendedorByEmail(email: string): Vendedor | undefined {
  return vendedores.find((v) => v.email === email)
}

export function getClienteById(id: string): Cliente | undefined {
  return clientes.find((c) => c.id === id)
}

export function getEtiquetaById(id: string): Etiqueta | undefined {
  return etiquetas.find((e) => e.id === id)
}

export function getOrcamentoById(id: string): Orcamento | undefined {
  return orcamentos.find((o) => o.id === id)
}

export function getPedidoById(id: string): Pedido | undefined {
  return pedidos.find((p) => p.id === id)
}

export function getOrcamentosByCliente(clienteId: string): Orcamento[] {
  return orcamentos.filter((o) => o.clienteId === clienteId)
}

export function getOrcamentosByVendedor(vendedorId: string): Orcamento[] {
  return orcamentos.filter((o) => o.vendedorId === vendedorId)
}

export function getPedidosByVendedor(vendedorId: string): Pedido[] {
  return pedidos.filter((p) => p.vendedorId === vendedorId)
}

export function getPedidosByCliente(clienteId: string): Pedido[] {
  return pedidos.filter((p) => p.clienteId === clienteId)
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
    enviado: "Enviado",
    aprovado: "Aprovado",
    recusado: "Recusado",
    em_producao: "Em Producao",
    faturado: "Faturado",
    entregue: "Entregue",
    cancelado: "Cancelado",
  }
  return map[status] || status
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    rascunho: "bg-muted text-muted-foreground",
    enviado: "bg-blue-100 text-blue-800",
    aprovado: "bg-emerald-100 text-emerald-800",
    recusado: "bg-red-100 text-red-800",
    em_producao: "bg-amber-100 text-amber-800",
    faturado: "bg-emerald-100 text-emerald-800",
    entregue: "bg-teal-100 text-teal-800",
    cancelado: "bg-red-100 text-red-800",
  }
  return map[status] || "bg-muted text-muted-foreground"
}
