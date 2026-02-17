"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { SetActivo } from "@/lib/types"
import { SetActivoForm } from "@/components/set-activo-form"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ArrowLeft, Trash2 } from "lucide-react"

export default function SetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [set, setSet] = useState<SetActivo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("sets_activos")
      .select("*, categorias(nombre)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setSet(data as SetActivo)
        setLoading(false)
      })
  }, [id])

  const deleteSet = async () => {
    if (!confirm("Estas seguro de eliminar este set?")) return
    const { error } = await supabase.from("sets_activos").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Set eliminado")
    router.push("/dashboard/activos")
  }

  if (loading) return <div className="h-96 animate-pulse rounded bg-muted" />
  if (!set) return <p className="text-muted-foreground">Set no encontrado</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/activos")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{set.nombre}</h1>
          <p className="text-muted-foreground">Serie: {set.serie || "N/A"}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={deleteSet}>
          <Trash2 className="mr-1 h-4 w-4" />
          Eliminar
        </Button>
      </div>
      <SetActivoForm set={set} />
    </div>
  )
}
