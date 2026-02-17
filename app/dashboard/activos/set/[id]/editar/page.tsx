"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { SetActivo } from "@/lib/types"
import { SetActivoForm } from "@/components/set-activo-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function SetActivoEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [set, setSet] = useState<SetActivo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSet = async () => {
      const { data, error } = await supabase
        .from("sets_activos")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        console.error("Error loading set:", error)
        router.push("/dashboard/sets-activos")
        return
      }

      setSet(data as SetActivo)
      setLoading(false)
    }

    loadSet()
  }, [id, router])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (!set) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/sets-activos")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </Button>
        <p className="text-muted-foreground">Set no encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/sets-activos/${id}`)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al perfil
        </Button>
      </div>

      <SetActivoForm set={set} />
    </div>
  )
}