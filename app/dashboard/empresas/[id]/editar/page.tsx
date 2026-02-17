"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Empresa } from "@/lib/types"
import { EmpresaForm } from "@/components/empresa-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function EmpresaEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEmpresa = async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        console.error("Error loading empresa:", error)
        router.push("/dashboard/empresas")
        return
      }

      setEmpresa(data as Empresa)
      setLoading(false)
    }

    loadEmpresa()
  }, [id, router])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (!empresa) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/empresas")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </Button>
        <p className="text-muted-foreground">Empresa no encontrada</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/empresas/${id}`)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al perfil
        </Button>
      </div>

      <EmpresaForm empresa={empresa} />
    </div>
  )
}