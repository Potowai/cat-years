import { useEffect, useState } from 'react'
import { getOwnership } from './tokens'

export function useOwnership(catId: string): string | null {
  const [token, setToken] = useState<string | null>(null)
  useEffect(() => {
    setToken(getOwnership(catId))
  }, [catId])
  return token
}
