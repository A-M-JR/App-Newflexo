"use client"

import React, { useEffect } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname, useRouter } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"
import { useAuth } from "@/lib/auth-context"

const breadcrumbMap: Record<string, string> = {
  clientes: "Clientes",
  etiquetas: "Catalogo de Etiquetas",
  orcamentos: "Orcamentos",
  pedidos: "Pedidos de Producao",
  novo: "Novo",
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, isLoading } = useAuth()
  const segments = pathname.split("/").filter(Boolean)

  const applyTheme = (savedColor: string) => {
    if (!savedColor) return
    // Aplica no CSS Variable padrão (para cor sólida)
    document.documentElement.style.setProperty('--sidebar', savedColor.startsWith('#') ? savedColor : 'transparent')
    document.documentElement.style.setProperty('--sidebar-border', savedColor.startsWith('#') ? `${savedColor}40` : '#ffffff20')

    // Para gradiente, aplica inline diretamente no elemento DOM
    if (!savedColor.startsWith('#')) {
      // É um preset de gradiente — aguarda a sidebar montar para injetar o estilo
      const tryApply = (attempts = 0) => {
        const sidebarEl = document.querySelector('[data-sidebar="sidebar-inner"]') as HTMLElement | null
        if (sidebarEl) {
          sidebarEl.style.background = savedColor
        } else if (attempts < 10) {
          setTimeout(() => tryApply(attempts + 1), 50)
        }
      }
      tryApply()
    } else {
      // Cor sólida — limpa qualquer gradient inline anterior
      const sidebarEl = document.querySelector('[data-sidebar="sidebar-inner"]') as HTMLElement | null
      if (sidebarEl) sidebarEl.style.background = ''
    }
  }

  useEffect(() => {
    const savedColor = localStorage.getItem('flexo_theme_sidebar')
    if (savedColor) {
      applyTheme(savedColor)
    }
  }, [])

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push("/login")
    }
  }, [currentUser, isLoading, router])

  // Se não estiver carregando e não tiver usuário, o useEffect acima cuidará do redirecionamento.
  // Enquanto estiver carregando ou sem usuário, mostramos uma versão simplificada do layout 
  // para evitar o flash total de tela branca.
  const showContent = !isLoading && !!currentUser;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Inicio</BreadcrumbLink>
              </BreadcrumbItem>
              {segments.map((segment, i) => {
                const href = "/" + segments.slice(0, i + 1).join("/")
                const isLast = i === segments.length - 1
                const label = breadcrumbMap[segment] || segment
                return (
                  <React.Fragment key={href}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {!showContent && isLoading ? (
            <div className="flex flex-col gap-6 animate-pulse">
              <div className="space-y-2">
                <div className="h-10 w-64 bg-muted rounded-md" />
                <div className="h-4 w-48 bg-muted rounded-md" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="h-28 w-full bg-muted rounded-xl" />
                <div className="h-28 w-full bg-muted rounded-xl" />
                <div className="h-28 w-full bg-muted rounded-xl" />
              </div>
              <div className="h-[400px] w-full bg-muted rounded-xl" />
            </div>
          ) : !showContent ? (
            <div className="flex h-[50vh] w-full items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            children
          )}
        </div>
      </SidebarInset>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  )
}
