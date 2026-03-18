"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, Vendedor } from "./types"
import { getUserById, getVendedorById, users } from "./mock-data"

export type LoginResult = "success" | "invalid_credentials" | "user_blocked" | "user_not_found"

interface AuthContextType {
  currentUser: User | null
  vendedor: Vendedor | null
  isAdmin: boolean
  isVendedor: boolean
  isLoading: boolean
  login: (email: string, senha?: string) => LoginResult
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

  const checkSession = () => {
    const sessionData = localStorage.getItem("flexo_session")

    if (sessionData) {
      try {
        const { userId, expiresAt } = JSON.parse(sessionData)

        // Verifica se a sessão de 12 horas expirou
        if (Date.now() > expiresAt) {
          logout()
          setIsLoading(false)
          return
        }

        const user = getUserById(userId)
        if (user) {
          setCurrentUser(user)
          if (user.vendedorId) {
            const vnd = getVendedorById(user.vendedorId)
            if (vnd) setVendedor(vnd)
          }
        } else {
          logout() // Usuário foi deletado do mock/banco
        }
      } catch (e) {
        logout() // Objeto corrompido
      }
    }

    setIsLoading(false)
  }

  const login = (email: string, senha?: string): LoginResult => {
    // Busca por e-mail nos mocks
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())

    if (!user) {
      return "user_not_found"
    }

    if (user.ativo === false) {
      return "user_blocked"
    }

    setCurrentUser(user)

    // Cria Sessão de 12 Horas em Milissegundos
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000
    const sessionObject = {
      userId: user.id,
      expiresAt: Date.now() + TWELVE_HOURS_MS
    }

    localStorage.setItem("flexo_session", JSON.stringify(sessionObject))

    if (user.vendedorId) {
      const vnd = getVendedorById(user.vendedorId)
      if (vnd) setVendedor(vnd)
    } else {
      setVendedor(null)
    }
    return "success"
  }

  const logout = () => {
    setCurrentUser(null)
    setVendedor(null)
    localStorage.removeItem("flexo_session")
    // O legacy identifier se existir
    localStorage.removeItem("currentUserId")
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
