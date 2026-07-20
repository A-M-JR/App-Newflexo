"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, Vendedor } from "./types"
import { verifySession } from "./actions/users"
import { clearDataCache } from "@/hooks/use-data-query"

export type LoginResult = "success" | "invalid_credentials" | "user_blocked" | "user_not_found"

interface AuthContextType {
  currentUser: User | null
  vendedor: Vendedor | null
  isAdmin: boolean
  isVendedor: boolean
  isLoading: boolean
  login: (email: string, senha?: string) => Promise<LoginResult>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [vendedor, setVendedor] = useState<Vendedor | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const router = useRouter()


  useEffect(() => {
    checkSession()

    // Configura um vigia que checa a expiração a cada 1 minuto
    const interval = setInterval(checkSession, 60000)
    return () => clearInterval(interval)
  }, [])

  const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000

  // Grava/renova a sessão com uma janela deslizante de 8h e guarda um snapshot
  // (sem a senha) do usuário. Esse snapshot deixa o login sobreviver a falhas
  // transitórias de verificação (banco/rede) sem derrubar o usuário.
  const persistSession = (userId: number, user: any, vendor: any) => {
    let safeUser = user ?? null
    if (safeUser && typeof safeUser === 'object') {
      const { senha, ...rest } = safeUser as any
      safeUser = rest
    }
    localStorage.setItem("flexo_session", JSON.stringify({
      userId,
      expiresAt: Date.now() + EIGHT_HOURS_MS,
      user: safeUser,
      vendor: vendor ?? null,
    }))
  }

  // Atualiza o estado só quando algo muda de fato (evita re-render/recarga
  // desnecessária das telas a cada verificação de 60s).
  const applyUser = (nextUser: any, nextVendor: any) => {
    setCurrentUser(prev => {
      const next = nextUser
      if (
        prev &&
        next &&
        prev.id === next.id &&
        prev.role === next.role &&
        (prev as any).ativo === (next as any).ativo &&
        (prev as any).vendedorId === (next as any).vendedorId
      ) {
        return prev
      }
      return next
    })
    setVendedor(prev => {
      const next = nextVendor
      if (!prev && !next) return prev
      if (prev && next && prev.id === next.id) return prev
      return next ?? null
    })
  }

  const checkSession = async () => {
    const sessionData = localStorage.getItem("flexo_session")
    if (!sessionData) {
      setIsLoading(false)
      return
    }

    let parsed: any
    try {
      parsed = JSON.parse(sessionData)
    } catch {
      logout() // Objeto corrompido
      setIsLoading(false)
      return
    }

    const { userId, expiresAt, user: cachedUser, vendor: cachedVendor } = parsed || {}

    // Só derruba de verdade quando a janela de 8h realmente expirou.
    if (!userId || (expiresAt && Date.now() > expiresAt)) {
      logout()
      setIsLoading(false)
      return
    }

    // Autentica na hora pelo snapshot salvo (evita o "flash" de login e mantém
    // logado mesmo se a verificação no servidor falhar por um erro transitório).
    // Se já temos o snapshot, autentica na hora e libera a tela; sem snapshot
    // (sessão antiga), mantém o loading até a verificação terminar para não
    // redirecionar ao login indevidamente.
    if (cachedUser) {
      setCurrentUser(prev => prev ?? cachedUser)
      setVendedor(prev => prev ?? (cachedVendor ?? null))
      setIsLoading(false)
    }

    // Valida no servidor e desliza a janela de 8h.
    try {
      const result = await verifySession(userId)
      if (result && result.user) {
        applyUser(result.user, result.vendor)
        persistSession(userId, result.user, result.vendor)
      } else {
        logout() // Usuário foi realmente deletado ou inativado
      }
    } catch (e) {
      // Erro transitório (rede/banco): NÃO desloga — mantém a sessão e renova a janela.
      console.error("Sessão: verificação falhou, mantendo o login.", e)
      persistSession(userId, cachedUser, cachedVendor)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, senha?: string): Promise<LoginResult> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: senha }),
      })

      if (!response.ok) {
        if (response.status === 404) return "user_not_found"
        if (response.status === 403) return "user_blocked"
        return "invalid_credentials"
      }

      const { user, vendor: dbVendor } = await response.json()
      setCurrentUser(user)
      setVendedor(dbVendor || null)

      // Cria a sessão de 8h (janela deslizante) já com o snapshot do usuário.
      persistSession(user.id, user, dbVendor || null)

      // Limpa cache de dados anteriores para a nova sessão
      clearDataCache()

      return "success"
    } catch (error) {
      console.error("Login Error:", error)
      return "invalid_credentials"
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setVendedor(null)
    localStorage.removeItem("flexo_session")
    // O legacy identifier se existir
    localStorage.removeItem("currentUserId")
    
    // Limpa cache ao sair também por segurança
    clearDataCache()

    router.push("/login")
  }

  const isAdmin = currentUser?.role === "admin"
  const isVendedor = currentUser?.role === "vendedor"

  return (
    <AuthContext.Provider value={{ currentUser, vendedor, isAdmin, isVendedor, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
