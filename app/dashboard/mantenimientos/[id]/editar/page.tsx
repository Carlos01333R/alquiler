"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Mantenimiento } from "@/lib/types"
import { MantenimientoForm } from "@/components/mantenimiento-form"
import { toast } from "sonner"
import { ArrowLeft, Trash2 } from "lucide-react"
import { MantenimientoArchivos } from "@/components/MantemientoArchivos"

export default function MantenimientoEditPage() {
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
    if (!confirm("¿Estás seguro de eliminar este mantenimiento?")) return
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
    <div className="space-y-6 w-[90%] md:max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          className="bg-white px-3 py-1.5 text-black rounded-xl flex items-center cursor-pointer"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Editar: {item.titulo}
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.id}</p>
        </div>
        <button
          className="bg-red-500 text-white px-3 py-1.5 rounded-xl flex items-center"
          onClick={handleDelete}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Eliminar
        </button>
      </div>

      {/* Formulario principal */}
      <MantenimientoForm mantenimiento={item} />

      {/* Sección de archivos múltiples */}
      <MantenimientoArchivos
        mantenimientoId={id}
        archivos={item.archivos_adjuntos ?? []}
        onChange={(archivos) => setItem((prev) => prev ? { ...prev, archivos_adjuntos: archivos } : prev)}
      />
    </div>
  )
}