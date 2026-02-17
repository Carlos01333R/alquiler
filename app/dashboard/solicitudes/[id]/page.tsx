"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Solicitud } from "@/lib/types"
import { SolicitudForm } from "@/components/solicitud-form"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ArrowLeft, Trash2 } from "lucide-react"

export default function SolicitudDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [item, setItem] = useState<Solicitud | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("solicitudes")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setItem(data as Solicitud)
        setLoading(false)
      })
  }, [id])

  const handleDelete = async () => {
    if (!confirm("Estas seguro de eliminar esta solicitud?")) return
    const { error } = await supabase.from("solicitudes").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Solicitud eliminada")
    router.push("/dashboard/solicitudes")
  }

  if (loading) return <div className="h-96 animate-pulse rounded bg-muted" />
  if (!item) return <p className="text-muted-foreground">Solicitud no encontrada</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/solicitudes")}>
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
      <SolicitudForm solicitud={item} />
    </div>
  )
}
