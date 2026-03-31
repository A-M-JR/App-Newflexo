import { useState, useEffect, useCallback, useRef } from "react"

// Cache global em memória (não persiste após F5, mas persiste entre trocas de abas)
const globalCache: Record<string, { data: any; timestamp: number }> = {}

export function clearDataCache() {
  Object.keys(globalCache).forEach(key => delete globalCache[key])
  console.log("Cache de dados zerado para nova sessão.")
}

interface UseDataQueryOptions<T> {
  key: string | any[] | object
  fetcher: () => Promise<T>
  refetchInterval?: number
  enabled?: boolean
}

export function useDataQuery<T>({ 
  key, 
  fetcher, 
  refetchInterval = 0,
  enabled = true 
}: UseDataQueryOptions<T>) {
  const cacheKey = typeof key === 'string' ? key : JSON.stringify(key)
  const [data, setData] = useState<T | null>(globalCache[cacheKey]?.data || null)
  const [isLoading, setIsLoading] = useState(!globalCache[cacheKey])
  const [error, setError] = useState<Error | null>(null)

  const fetcherRef = useRef(fetcher)
  
  // Mantém sempre a última versão da função `fetcher` sem disparar side effects.
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true)
    try {
      const result = await fetcherRef.current()
      globalCache[cacheKey] = { data: result, timestamp: Date.now() }
      setData(result)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [cacheKey])

  useEffect(() => {
    if (enabled) {
      // Se já temos no cache, carregamos instantaneamente
      if (globalCache[cacheKey]) {
        setData(globalCache[cacheKey].data)
        setIsLoading(false)
        // Atualiza em background mesmo se tiver cache
        fetchData(true)
      } else {
        fetchData()
      }
    }
  }, [enabled, cacheKey, fetchData])

  // Refetch opcional
  useEffect(() => {
    if (enabled && refetchInterval > 0) {
      const interval = setInterval(() => fetchData(true), refetchInterval)
      return () => clearInterval(interval)
    }
  }, [enabled, refetchInterval, fetchData])

  return { data, isLoading, error, refetch: () => fetchData() }
}
