// Types for the Newflexo order management system

export type UserRole = "admin" | "vendedor"

export interface User {
  id: string
  nome: string
  email: string
  role: UserRole
  vendedorId?: string
  criadoEm: string
  ativo?: boolean
}

export interface Vendedor {
  id: string
  nome: string
  email: string
  telefone: string
  comissao: number // percentage (0-100)
  regiao: string
  criadoEm: string
  ativo?: boolean
}

export interface Cliente {
  id: string
  razaoSocial: string
  endereco: string
  telefone: string
  cnpj: string
  ie: string
  cep: string
  cidade: string
  estado: string
  observacoes?: string
  criadoEm: string
  ultimaCompra?: string // Adicionado
}

export interface Etiqueta {
  id: string
  nome: string
  codigo: string
  material: string
  tipoAdesivo: string
  largura: number
  altura: number
  numeroCores: number
  tipoTubete: string
  quantidadePorRolo: number
  observacoesTecnicas?: string
  clientesIds?: string[] // Relacionamento M:N (Etiquetas Exclusivas)
  pasta?: string
  metragem?: number
  coresDescricao?: string
  aplicacoesEspeciais?: string[]
  orientacaoRebobinagem?: string
}

export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado"

export interface ItemOrcamento {
  id: string
  orcamentoId: string
  etiquetaId?: string
  descricao: string
  quantidade: number
  unidade: string
  precoUnitario: number
  total: number
}

export interface Orcamento {
  id: string
  numero: string
  clienteId: string
  cliente?: Cliente
  vendedorId: string
  itens: ItemOrcamento[]
  status: StatusOrcamento
  observacoes?: string
  criadoEm: string
  atualizadoEm: string
  totalGeral: number
  dataEmissao?: string
  dataValidade?: string
  desconto?: number
}

export type StatusPedido = "em_analise" | "em_producao" | "separacao" | "faturado" | "entregue" | "cancelado"

export interface ItemPedido {
  id: string
  pedidoId: string
  etiquetaId?: string
  descricao: string
  quantidade: number
  unidade: string
  precoUnitario: number
  total: number
}

export interface Pedido {
  id: string
  numero: string
  orcamentoId: string
  orcamento?: Orcamento
  clienteId: string
  cliente?: Cliente
  vendedorId: string
  itens: ItemPedido[]
  status: StatusPedido
  sentidoSaidaRolo: string
  tipoTubete: string
  gapEntreEtiquetas: string
  numeroPistas: number
  observacoesEmbalagem?: string
  observacoesFaturamento?: string
  prazoEntrega: string
  formaPagamento: string
  comprador: string
  frete: string
  observacoesGerais?: string
  criadoEm: string
  atualizadoEm: string
  totalGeral: number
  dataEmissao?: string
  dataEntrega?: string
  prioridade?: string
  desconto?: number
}

export interface Empresa {
  id: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  inscricaoEstadual?: string
  telefone: string
  email: string
  endereco: {
    cep: string
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
    cidade: string
    estado: string // UF
  }
  corSidebar?: string
}

// ── Tipos do Módulo IA (Fase 3) ──────────────────────────────

export interface AIChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  toolCalls?: any[]
  image?: string
  timestamp: string
}

export interface AIUsage {
  count: number
  monthYear: string
  tokensUsed: number
}

export interface AIConfig {
  id?: string
  provider: "desativado" | "gpt-4o-mini" | "gemini-flash"
  apiKey: string
  systemPrompt: string
  monthlyLimit: number
}

export interface ProducaoStatus {
  id: string
  nome: string
  cor: string
  ordem: number
}

export interface Notificacao {
  id: string
  titulo: string
  mensagem: string
  lida: boolean
  data: string
  tipo: "info" | "success" | "warning" | "error"
}

