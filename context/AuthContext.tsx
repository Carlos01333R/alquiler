"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

// ✅ IDs de usuarios autorizados
const AUTHORIZED_USER_IDS = new Set([
  "d4d7ca79-e3c8-400a-bc53-75ffd11f57a8",
  "48cf5b04-1ad8-4aed-9189-99cf97f75067",
  "5601fa3a-5399-4daf-9e90-7510c426e670"
])

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthorized: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; unauthorized?: boolean }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      const sessionUser = data.session?.user ?? null

      // Si hay sesión pero el usuario no está autorizado, cerrar sesión
      if (sessionUser && !AUTHORIZED_USER_IDS.has(sessionUser.id)) {
        await supabase.auth.signOut()
        setUser(null)
      } else {
        setUser(sessionUser)
      }

      setIsLoading(false)
    }
    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null

      if (sessionUser && !AUTHORIZED_USER_IDS.has(sessionUser.id)) {
        await supabase.auth.signOut()
        setUser(null)
      } else {
        setUser(sessionUser)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; unauthorized?: boolean }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) return { success: false }

    // Verificar autorización tras autenticarse
    if (!AUTHORIZED_USER_IDS.has(data.user.id)) {
      await supabase.auth.signOut()
      return { success: false, unauthorized: true }
    }

    setUser(data.user)
    return { success: true }
  }

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const isAuthorized = user !== null && AUTHORIZED_USER_IDS.has(user.id)

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthorized,
      login,
      logout,
    }),
    [user, isLoading, isAuthorized],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}