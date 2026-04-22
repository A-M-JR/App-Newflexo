// Types for the Newflexo order management system

export type UserRole = "admin" | "vendedor"

export interface User {
  id: number
  nome: string
  email: string
  role: UserRole
  vendedorId?: number
  criadoEm: string
  ativo?: boolean
}

export interface Vendedor {
  id: number
  nome: string
  email: string
  telefone: string
  comissao: number // percentage (0-100)
  regiao: string
  criadoEm: string
  ativo?: boolean
}

export interface Cliente {
  id: number
  razaoSocial: string
  endereco: string
  telefone: string
  cnpj: string
  ie?: string | null
  cep: string
  cidade: string
  estado: string
  email?: string | null
  observacoes?: string | null
  criadoEm: string
  updatedAt?: string
  ultimaCompra?: string | null
  saldoCreditoValor: number
  saldoCreditoEtiquetas: number
  itensExclusivos?: any[]
}

export interface ClienteVinculado {
  id: number
  razaoSocial: string
  preco?: number | null
}

export interface Etiqueta {
  id: number
  nome: string
  codigo: string
  material: string
  tipoAdesivo: string
  largura: number
  altura: number
  numeroCores: number
  tipoTubete: string
  quantidadePorRolo: number
  observacoesTecnicas?: string | null
  clientesIds?: number[]
  pasta?: string | null
  metragem?: number | null
  preco?: number | null
  coresDescricao?: string | null
  aplicacoesEspeciais?: string[]
  orientacaoRebobinagem?: string | null
  clientesVinculados?: ClienteVinculado[]
}

export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado"

export interface ItemOrcamento {
  id: number
  orcamentoId: number
  etiquetaId?: number
  descricao: string
  quantidade: number
  quantidadeCredito: number
  unidade: string
  precoUnitario: number
  total: number
  observacao?: string
}

export interface Orcamento {
  id: number
  numero: string
  clienteId: number
  cliente?: Cliente
  vendedorId: number
  itens: ItemOrcamento[]
  status: StatusOrcamento
  observacoes?: string
  criadoEm: string
  atualizadoEm: string
  totalGeral: number
  descontoCredito: number
  formaPagamentoId?: number
  formaPagamentoObj?: { id: number, nome: string }
  dataEmissao?: string
  desconto?: number
  ocCliente?: string
}

export type StatusPedido = "em_analise" | "em_producao" | "separacao" | "faturado" | "entregue" | "cancelado"

export interface ItemPedido {
  id: number
  pedidoId: number
  etiquetaId?: number
  descricao: string
  quantidade: number
  quantidadeCredito: number
  unidade: string
  precoUnitario: number
  total: number
  observacao?: string
}

export interface Pedido {
  id: number
  numero: string
  orcamentoId: number
  orcamento?: Orcamento
  clienteId: number
  cliente?: Cliente
  vendedorId: number
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
  formaPagamentoId?: number
  formaPagamentoObj?: { id: number, nome: string }
  dataEmissao?: string
  dataEntrega?: string
  prioridade?: string
  desconto?: number
  ocCliente?: string
}

export interface Empresa {
  id: number
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
    estado: string
  }
  corSidebar?: string
}

export interface AIChatMessage {
  id: number
  userId: number
  role: "user" | "assistant"
  content: string
  toolCalls?: any[]
  image?: string
  timestamp: string
}

export interface AIUsage {
  id: number
  count: number
  monthYear: string
  tokensUsed: number
}

export interface AIConfig {
  id?: number
  provider: "desativado" | "gpt-4o-mini" | "gemini-flash"
  apiKey: string
  systemPrompt: string
  monthlyLimit: number
}

export interface ProducaoStatus {
  id: number
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

