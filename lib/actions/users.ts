"use server"

import { prisma } from "@/lib/prisma"
import { User, Vendedor } from "@/lib/types"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export async function getUsers(): Promise<User[]> {
  const dbUsers = await prisma.user.findMany({
    orderBy: { nome: "asc" },
  })
  return dbUsers.map(u => ({
    ...u,
    criadoEm: u.criadoEm.toISOString(),
  })) as unknown as User[]
}

export async function saveUser(data: Partial<User>, senha?: string) {
  const { id, ...rest } = data
  
  // Remove fields that shouldn't be updated directly via this method if necessary
  const prismaData: any = {
    nome: rest.nome,
    email: rest.email?.toLowerCase(),
    role: rest.role,
    vendedorId: rest.vendedorId || null,
    ativo: rest.ativo,
  }

  if (senha) {
    prismaData.senha = await bcrypt.hash(senha, 10)
  }

  if (!id || id > 1000000000) {
    // New user
    if (!senha) prismaData.senha = await bcrypt.hash("123456", 10) // Default password
    
    return prisma.user.create({
      data: prismaData
    })
  } else {
    // Update existing
    return prisma.user.update({
      where: { id: id as any },
      data: prismaData
    })
  }
}

export async function toggleUserActive(id: number) {
  const user = await prisma.user.findUnique({ where: { id: id as any } })
  if (!user) throw new Error("Usuário não encontrado")
  
  const updated = await prisma.user.update({
    where: { id: id as any },
    data: { ativo: !user.ativo },
  })
  revalidatePath("/usuarios")
  return updated
}

export async function updateUserPassword(id: number, senha: string) {
  const hashedPassword = await bcrypt.hash(senha, 10)
  return prisma.user.update({
    where: { id: id as any },
    data: { senha: hashedPassword },
  })
}
export async function verifySession(id: number) {
  const user = await prisma.user.findUnique({
    where: { id: id as any },
  })

  if (!user || !user.ativo) return null

  let vendor = null
  if (user.vendedorId) {
    vendor = await prisma.vendedor.findUnique({
      where: { id: user.vendedorId as any }
    })
  }

  return {
    user: {
      ...user,
      criadoEm: user.criadoEm.toISOString()
    } as unknown as User,
    vendor: vendor ? {
      ...vendor,
      criadoEm: vendor.criadoEm.toISOString()
    } as unknown as Vendedor : null
  }
}
