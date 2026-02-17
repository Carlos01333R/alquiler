"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Montaje } from "@/lib/types"
import { MontajeForm } from "@/components/montaje-form"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ArrowLeft, Trash2 } from "lucide-react"

export default function MontajeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [item, setItem] = useState<Montaje | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("montajes")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setItem(data as Montaje)
        setLoading(false)
      })
  }, [id])

  const handleDelete = async () => {
    if (!confirm("Estas seguro de eliminar este montaje?")) return
    const { error } = await supabase.from("montajes").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Montaje eliminado")
    router.push("/dashboard/montajes")
  }

  if (loading) return <div className="h-96 animate-pulse rounded bg-muted" />
  if (!item) return <p className="text-muted-foreground">Montaje no encontrado</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/montajes")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Montaje {item.numero || item.id.slice(0, 8)}
          </h1>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-1 h-4 w-4" />
          Eliminar
        </Button>
      </div>
      <MontajeForm montaje={item} />
    </div>
  )
}
