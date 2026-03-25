"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Solicitud } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { toast } from "sonner"
import {
  ArrowLeft,
  Trash2,
  Pencil,
  Calendar,
  User,
  Tag,
  AlertCircle,
  FileText,
  Cpu,
  MessageSquare,
  MessageCircle,
  CheckCircle2,
  Activity,
  Hash,
} from "lucide-react"

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100">
      <div className="mt-0.5 p-1.5 rounded-md bg-white border border-gray-200 text-gray-500">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
          {label}
        </p>
        <div className="text-sm font-medium text-foreground break-words">{value ?? "-"}</div>
      </div>
    </div>
  )
}

function CommentBlock({
  icon: Icon,
  label,
  text,
}: {
  icon: React.ElementType
  label: string
  text: string | null
}) {
  if (!text) return null
  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 space-y-2">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  )
}

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
    if (!confirm("¿Estás seguro de eliminar esta solicitud?")) return
    const { error } = await supabase.from("solicitudes").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Solicitud eliminada")
    router.push("/dashboard/solicitudes")
  }

  if (loading) return <div className="h-96 animate-pulse rounded-xl bg-muted" />
  if (!item) return <p className="text-muted-foreground">Solicitud no encontrada</p>

  return (
    <div className="space-y-6 w-[90%] md:max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button 
        className="bg-white text-black py-1.5 px-3 rounded-xl flex items-center cursor-pointer"
        onClick={() => router.push("/dashboard/solicitudes")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </button>
       
        <div className="flex items-center gap-2">
          <button
            className="bg-white text-black px-3 py-1.5 rounded-xl flex items-center cursor-pointer"
            onClick={() => router.push(`/dashboard/solicitudes/${id}/editar`)}
          >
            <Pencil className="mr-1 h-4 w-4" />
            Editar
          </button>
          <button
           className="bg-red-500 text-white px-3 py-1.5 rounded-xl flex items-center cursor-pointer"
          onClick={handleDelete}>
            <Trash2 className="mr-1 h-4 w-4" />
            Eliminar
          </button>
        </div>
      </div>

 <div className="p-4 rounded-xl border bg-white shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
            {item.titulo}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            ID: <span className="font-mono">{item.id}</span>
          </p>
        </div>

      {/* Badges de estado rápido */}
      <div className="flex flex-wrap gap-2 p-4 rounded-xl border bg-white shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium">Tipo:</span>
          <StatusBadge value={item.tipo} />
        </div>
        <span className="text-gray-200">|</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium">Prioridad:</span>
          <StatusBadge value={item.prioridad} />
        </div>
        <span className="text-gray-200">|</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium">Estado:</span>
          <StatusBadge value={item.estado} />
        </div>
        {item.cliente_fue_notificado && (
          <>
            <span className="text-gray-200">|</span>
            <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Cliente notificado
            </div>
          </>
        )}
      </div>

      {/* Descripción */}
      {item.descripcion && (
        <div className="p-4 rounded-xl border bg-white shadow-sm">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Descripción
          </p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {item.descripcion}
          </p>
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <InfoCard icon={User} label="Cliente" value={item.nombre_cliente} />
        <InfoCard icon={Cpu} label="Activo" value={item.nombre_activo} />
        <InfoCard icon={Hash} label="Serie del activo" value={item.serie_activo} />
        <InfoCard
          icon={Calendar}
          label="Fecha Inicio"
          value={
            item.fecha_inicio
              ? new Date(item.fecha_inicio).toLocaleDateString("es-CO", { dateStyle: "long" })
              : null
          }
        />
        <InfoCard
          icon={Calendar}
          label="Fecha Resolución"
          value={
            item.fecha_resolucion
              ? new Date(item.fecha_resolucion).toLocaleDateString("es-CO", { dateStyle: "long" })
              : null
          }
        />
        <InfoCard
          icon={Activity}
          label="Última actualización"
          value={new Date(item.updated_at).toLocaleDateString("es-CO", { dateStyle: "long" })}
        />
      </div>

      {/* Comentarios */}
      <CommentBlock
        icon={MessageSquare}
        label="Comentarios del cliente"
        text={item.comentarios_cliente}
      />
      <CommentBlock
        icon={MessageCircle}
        label="Comentario del proveedor"
        text={item.comentario_proveedor}
      />
    </div>
  )
}