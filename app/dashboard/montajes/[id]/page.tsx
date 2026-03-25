"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Montaje } from "@/lib/types"
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
  Wrench,
  Package,
  FileIcon,
  ExternalLink,
  Activity,
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
        <div className="text-sm font-medium text-foreground">{value || "-"}</div>
      </div>
    </div>
  )
}

export default function MontajeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [item, setItem] = useState<Montaje | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("montajes")
      .select("*, empresas(razon_social)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setItem(data as Montaje)
        setLoading(false)
      })
  }, [id])

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar este montaje?")) return
    const { error } = await supabase.from("montajes").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Montaje eliminado")
    router.push("/dashboard/montajes")
  }

  if (loading) return <div className="h-96 animate-pulse rounded-xl bg-muted" />
  if (!item) return <p className="text-muted-foreground">Montaje no encontrado</p>

  const actividades: { nombre: string; completada?: boolean }[] =
    Array.isArray(item.actividades_programadas) ? item.actividades_programadas : []
  const repuestos: { nombre: string; cantidad?: number; unidad?: string }[] =
    Array.isArray(item.repuestos_requeridos) ? item.repuestos_requeridos : []

  return (
    <div className="space-y-6 w-[90%] md:max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
        className="bg-white text-black px-3 py-1.5 rounded-xl flex items-center cursor-pointer"
        onClick={() => router.push("/dashboard/montajes")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </button>
       
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/montajes/${id}/editar`)}
          >
            <Pencil className="mr-1 h-4 w-4" />
            Editar
          </Button>
          <button 
          className="bg-red-500 text-white px-3 py-1.5 rounded-xl flex items-center cursor-pointer"
          onClick={handleDelete}>
            <Trash2 className="mr-1 h-4 w-4" />
            Eliminar
          </button>
        </div>
      </div>

      {/* Descripción */}

       <div className="p-4 rounded-xl border bg-white shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
            {item.titulo}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            ID: <span className="font-mono">{item.id}</span>
          </p>
        </div>
      {item.descripcion && (
        <div className="p-4 rounded-xl border bg-white shadow-sm">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Descripción
          </p>
          <p className="text-sm text-foreground leading-relaxed">{item.descripcion}</p>
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <InfoCard icon={Tag} label="Tipo" value={<StatusBadge value={item.tipo} />} />
        <InfoCard icon={AlertCircle} label="Prioridad" value={<StatusBadge value={item.prioridad} />} />
        <InfoCard icon={Activity} label="Estado" value={<StatusBadge value={item.estado} />} />
        <InfoCard
          icon={User}
          label="Cliente"
          value={item.nombre_cliente || item.empresas?.razon_social}
        />
        <InfoCard
          icon={Calendar}
          label="Fecha Inicio"
          value={item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString("es-CO", { dateStyle: "long" }) : undefined}
        />
        <InfoCard
          icon={Calendar}
          label="Fecha Final"
          value={item.fecha_final ? new Date(item.fecha_final).toLocaleDateString("es-CO", { dateStyle: "long" }) : undefined}
        />
      </div>

      {/* Actividades */}
      {actividades.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm p-4 space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Actividades programadas ({actividades.length})
          </p>
          <ul className="space-y-2">
            {actividades.map((act, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span
                  className={`h-2 w-2 rounded-full flex-shrink-0 ${act.completada ? "bg-green-500" : "bg-gray-300"}`}
                />
                <span className={act.completada ? "line-through text-muted-foreground" : ""}>
                  {act.nombre || String(act)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Repuestos */}
      {repuestos.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm p-4 space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Repuestos requeridos ({repuestos.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {repuestos.map((rep, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm"
              >
                <span>{rep.nombre || String(rep)}</span>
                {rep.cantidad != null && (
                  <span className="text-muted-foreground text-xs font-medium">
                    {rep.cantidad} {rep.unidad || ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentos adjuntos */}
      <div className="rounded-xl border bg-white shadow-sm p-4 space-y-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
          <FileIcon className="h-3.5 w-3.5" /> Documentos adjuntos
        </p>
        {item.archivo_adjunto ? (
          <a
            href={item.archivo_adjunto}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors group"
          >
            <div className="p-2 rounded-md bg-red-50 border border-red-100">
              <FileIcon className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {item.archivo_adjunto.split("/").pop()}
              </p>
              <p className="text-xs text-muted-foreground">PDF adjunto</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>
        ) : (
          <p className="text-sm text-muted-foreground py-2">Sin documentos adjuntos</p>
        )}
      </div>
    </div>
  )
}