import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.status.upsert({
    where: { id: 1 },
    update: { nome: 'Rascunho', cor: 'slate', ordem: 1, modulo: 'orcamento' },
    create: { id: 1, nome: 'Rascunho', cor: 'slate', ordem: 1, modulo: 'orcamento', ativo: true }
  })
  
  await prisma.status.upsert({
    where: { id: 4 },
    update: { nome: 'Enviado', cor: 'indigo', ordem: 2, modulo: 'orcamento' },
    create: { id: 4, nome: 'Enviado', cor: 'indigo', ordem: 2, modulo: 'orcamento', ativo: true }
  })

  await prisma.status.upsert({
    where: { id: 2 },
    update: { nome: 'Aprovado', cor: 'emerald', ordem: 3, modulo: 'orcamento' },
    create: { id: 2, nome: 'Aprovado', cor: 'emerald', ordem: 3, modulo: 'orcamento', ativo: true }
  })

  await prisma.status.upsert({
    where: { id: 5 },
    update: { nome: 'Recusado', cor: 'rose', ordem: 4, modulo: 'orcamento' },
    create: { id: 5, nome: 'Recusado', cor: 'rose', ordem: 4, modulo: 'orcamento', ativo: true }
  })

  console.log('Status de Orcamento seed finalizdo.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
