"use server"

import { prisma } from "@/lib/prisma"

// Cache em memória dos IDs de status. Status são dados de referência praticamente
// fixos (o ID nunca muda mesmo se renomeado), então evitamos repetir a mesma
// consulta ao banco a cada carregamento de lista — reduz muito os round-trips.
const globalForStatus = global as unknown as {
  __statusCache?: Map<string, number>
  __statusList?: Map<string, { id: number; nome: string }[]>
}
const statusCache = globalForStatus.__statusCache ?? new Map<string, number>()
globalForStatus.__statusCache = statusCache

// Lista completa por módulo. Uma única query resolve todos os status daquele
// módulo, em vez de uma consulta por nome procurado.
const statusList = globalForStatus.__statusList ?? new Map<string, { id: number; nome: string }[]>()
globalForStatus.__statusList = statusList

export async function clearStatusCache() {
  statusCache.clear()
  statusList.clear()
}

function traduzNome(nome: string) {
  if (nome === 'em_analise') return 'Em Análise'
  if (nome === 'em_producao') return 'Em Produção'
  if (nome === 'separacao') return 'Separação'
  if (nome === 'entregue') return 'Entregue'
  if (nome === 'cancelado') return 'Cancelado'
  if (nome === 'aprovado' || nome === 'fechado') return 'Aprovado'
  return nome
}

async function carregarModulo(modulo: string) {
  const cached = statusList.get(modulo)
  if (cached) return cached
  const todos = await prisma.status.findMany({
    where: { modulo },
    select: { id: true, nome: true },
  })
  statusList.set(modulo, todos)
  return todos
}

export async function getOrCreateStatus(nome: string, modulo: 'pedido' | 'orcamento' = 'pedido') {
  const searchName = traduzNome(nome)

  const cacheKey = `${modulo}:${searchName.toLowerCase()}`
  const cached = statusCache.get(cacheKey)
  if (cached !== undefined) return cached

  // Uma consulta traz o módulo inteiro; o "contains insensitive" é resolvido em
  // memória com a mesma semântica do filtro que existia aqui.
  const todos = await carregarModulo(modulo)
  const alvo = searchName.toLowerCase()
  const status = todos.find((s) => s.nome.toLowerCase().includes(alvo))

  if (status) {
    statusCache.set(cacheKey, status.id)
    return status.id
  }

  // Fallback se não encontrar (cria um padrão para não quebrar o sistema)
  const created = await prisma.status.create({
    data: {
      nome: searchName,
      modulo: modulo,
      ordem: todos.length + 1,
      cor: searchName === 'Cancelado' ? '#ef4444' : (modulo === 'orcamento' ? '#10b981' : '#94a3b8')
    }
  })
  statusCache.set(cacheKey, created.id)
  statusList.set(modulo, [...todos, { id: created.id, nome: created.nome }])
  return created.id
}
