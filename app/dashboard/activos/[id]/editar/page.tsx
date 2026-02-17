"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Activo } from "@/lib/types"
import { ActivoForm } from "@/components/activo-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function ActivoEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [activo, setActivo] = useState<Activo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadActivo = async () => {
      const { data, error } = await supabase
        .from("activos")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        console.error("Error loading activo:", error)
        router.push("/dashboard/activos")
        return
      }

      setActivo(data as Activo)
      setLoading(false)
    }

    loadActivo()
  }, [id, router])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (!activo) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/activos")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </Button>
        <p className="text-muted-foreground">Activo no encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/activos/${id}`)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al perfil
        </Button>
      </div>

      <ActivoForm activo={activo} />
    </div>
  )
}