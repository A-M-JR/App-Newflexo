"use server"

import { prisma } from "@/lib/prisma"

export async function getOrCreateStatus(nome: string, modulo: 'pedido' | 'orcamento' = 'pedido') {
  // Tradução de texto para nome real no banco se necessário
  let searchName = nome
  if (nome === 'em_analise') searchName = 'Em Análise'
  if (nome === 'em_producao') searchName = 'Em Produção'
  if (nome === 'separacao') searchName = 'Separação'
  if (nome === 'entregue') searchName = 'Entregue'
  if (nome === 'aprovado' || nome === 'fechado') searchName = 'Aprovado'

  const status = await prisma.status.findFirst({
    where: { 
      modulo: modulo,
      nome: { contains: searchName, mode: 'insensitive' } 
    }
  })

  if (status) return status.id

  // Fallback se não encontrar (cria um padrão para não quebrar o sistema)
  const count = await prisma.status.count({ where: { modulo: modulo } })
  const created = await prisma.status.create({
    data: {
      nome: searchName,
      modulo: modulo,
      ordem: count + 1,
      cor: modulo === 'orcamento' ? '#10b981' : '#94a3b8'
    }
  })
  return created.id
}
