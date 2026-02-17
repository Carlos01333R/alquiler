"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Mantenimiento } from "@/lib/types"
import { MantenimientoForm } from "@/components/mantenimiento-form"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ArrowLeft, Trash2 } from "lucide-react"

export default function MantenimientoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [item, setItem] = useState<Mantenimiento | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("mantenimientos")
      .select("*, empresas(razon_social)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setItem(data as Mantenimiento)
        setLoading(false)
      })
  }, [id])

  const handleDelete = async () => {
    if (!confirm("Estas seguro de eliminar este mantenimiento?")) return
    const { error } = await supabase.from("mantenimientos").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Mantenimiento eliminado")
    router.push("/dashboard/mantenimientos")
  }

  if (loading) return <div className="h-96 animate-pulse rounded bg-muted" />
  if (!item) return <p className="text-muted-foreground">Mantenimiento no encontrado</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/mantenimientos")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{item.titulo}</h1>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-1 h-4 w-4" />
          Eliminar
        </Button>
      </div>
      <MantenimientoForm mantenimiento={item} />
    </div>
  )
}
