"use server"

import { prisma } from "@/lib/prisma"

export async function getOrCreateStatus(nome: string) {
  // Tradução de texto para nome real no banco se necessário
  let searchName = nome
  if (nome === 'em_analise') searchName = 'Em Análise'
  if (nome === 'em_producao') searchName = 'Em Produção'
  if (nome === 'separacao') searchName = 'Separação'
  if (nome === 'entregue') searchName = 'Entregue'

  const status = await prisma.status.findFirst({
    where: { 
      modulo: 'pedido',
      nome: { contains: searchName, mode: 'insensitive' } 
    }
  })

  if (status) return status.id

  // Fallback se não encontrar (cria um padrão para não quebrar o sistema)
  const count = await prisma.status.count({ where: { modulo: 'pedido' } })
  const created = await prisma.status.create({
    data: {
      nome: searchName,
      modulo: 'pedido',
      ordem: count + 1,
      cor: '#94a3b8'
    }
  })
  return created.id
}
