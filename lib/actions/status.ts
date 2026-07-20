"use server"

import { prisma } from "@/lib/prisma"

// Cache em memória dos IDs de status. Status são dados de referência praticamente
// fixos (o ID nunca muda mesmo se renomeado), então evitamos repetir a mesma
// consulta ao banco a cada carregamento de lista — reduz muito os round-trips.
const globalForStatus = global as unknown as { __statusCache?: Map<string, number> }
const statusCache = globalForStatus.__statusCache ?? new Map<string, number>()
globalForStatus.__statusCache = statusCache

export async function clearStatusCache() {
  statusCache.clear()
}

export async function getOrCreateStatus(nome: string, modulo: 'pedido' | 'orcamento' = 'pedido') {
  // Tradução de texto para nome real no banco se necessário
  let searchName = nome
  if (nome === 'em_analise') searchName = 'Em Análise'
  if (nome === 'em_producao') searchName = 'Em Produção'
  if (nome === 'separacao') searchName = 'Separação'
  if (nome === 'entregue') searchName = 'Entregue'
  if (nome === 'cancelado') searchName = 'Cancelado'
  if (nome === 'aprovado' || nome === 'fechado') searchName = 'Aprovado'

  const cacheKey = `${modulo}:${searchName.toLowerCase()}`
  const cached = statusCache.get(cacheKey)
  if (cached !== undefined) return cached

  const status = await prisma.status.findFirst({
    where: {
      modulo: modulo,
      nome: { contains: searchName, mode: 'insensitive' }
    }
  })

  if (status) {
    statusCache.set(cacheKey, status.id)
    return status.id
  }

  // Fallback se não encontrar (cria um padrão para não quebrar o sistema)
  const count = await prisma.status.count({ where: { modulo: modulo } })
  const created = await prisma.status.create({
    data: {
      nome: searchName,
      modulo: modulo,
      ordem: count + 1,
      cor: searchName === 'Cancelado' ? '#ef4444' : (modulo === 'orcamento' ? '#10b981' : '#94a3b8')
    }
  })
  statusCache.set(cacheKey, created.id)
  return created.id
}
