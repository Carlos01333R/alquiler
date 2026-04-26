"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Mantenimiento } from "@/lib/types"
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
  FileSpreadsheet,
  FileArchive,
  ExternalLink,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EstadoMantenimiento = "Pendiente" | "En ejecución" | "Cumplido" | "Realizado" | "Cancelado"

interface ArchivoAdjunto {
  url: string
  name: string
  type: string
  size: number
  uploaded_at: string
}

// ─── InfoCard ─────────────────────────────────────────────────────────────────

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

// ─── Helpers de fecha (hora colombiana) ──────────────────────────────────────

function hoyEnColombia(): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const [year, month, day] = formatter.format(new Date()).split("-").map(Number)
  return new Date(year, month - 1, day)
}

function parseFecha(fechaStr: string): Date {
  const [year, month, day] = fechaStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}

// ─── Calcular estado ──────────────────────────────────────────────────────────

function calcularEstado(item: Mantenimiento, estadoOC: string | null): EstadoMantenimiento {
  if (estadoOC === "realizada") return "Realizado"
  // if (item.estado === "cancelado") return "Cancelado"

  const now    = hoyEnColombia()
  const inicio = item.fecha_inicio ? parseFecha(item.fecha_inicio) : null
  const fin    = item.fecha_final  ? parseFecha(item.fecha_final)  : null

  if (!inicio)          return "Pendiente"
  if (now < inicio)     return "Pendiente"
  if (fin && now > fin) return "Cumplido"
  return "En ejecución"
}

// ─── Badge de estado ──────────────────────────────────────────────────────────

const estadoConfig: Record<EstadoMantenimiento, { dot: string; className: string }> = {
  "Pendiente":    { dot: "bg-gray-400",    className: "bg-gray-100    text-gray-600    border border-gray-200"    },
  "En ejecución": { dot: "bg-blue-500",    className: "bg-blue-100    text-blue-700    border border-blue-200"    },
  "Cumplido":     { dot: "bg-green-500",   className: "bg-green-100   text-green-700   border border-green-200"   },
  "Realizado":    { dot: "bg-emerald-500", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  "Cancelado":    { dot: "bg-red-400",     className: "bg-red-100     text-red-600     border border-red-200"     },
}

function EstadoBadge({ item, estadoOC }: { item: Mantenimiento; estadoOC: string | null }) {
  const estado = calcularEstado(item, estadoOC)
  const cfg    = estadoConfig[estado]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {estado}
    </span>
  )
}

// ─── Helpers de archivos ──────────────────────────────────────────────────────

function getFileCategory(type: string, name: string): "pdf" | "excel" | "csv" | "archive" | "other" {
  if (type === "application/pdf") return "pdf"
  if (type.includes("spreadsheet") || type === "application/vnd.ms-excel" || name.endsWith(".xlsx") || name.endsWith(".xls")) return "excel"
  if (type === "text/csv" || type === "application/csv" || name.endsWith(".csv")) return "csv"
  if (type.includes("zip") || type.includes("rar") || type.includes("7z") || type.includes("gzip") || /\.(zip|rar|7z|gz)$/.test(name)) return "archive"
  return "other"
}

function formatBytes(bytes: number): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const categoryConfig = {
  pdf:     { icon: FileText,        bg: "bg-red-50",     border: "border-red-100",     color: "text-red-500",     badge: "bg-red-100 text-red-700",         label: "PDF"     },
  excel:   { icon: FileSpreadsheet, bg: "bg-green-50",   border: "border-green-100",   color: "text-green-600",   badge: "bg-green-100 text-green-700",     label: "Excel"   },
  csv:     { icon: FileSpreadsheet, bg: "bg-emerald-50", border: "border-emerald-100", color: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700", label: "CSV"     },
  archive: { icon: FileArchive,     bg: "bg-amber-50",   border: "border-amber-100",   color: "text-amber-600",   badge: "bg-amber-100 text-amber-700",     label: "Archivo" },
  other:   { icon: FileIcon,        bg: "bg-gray-50",    border: "border-gray-100",    color: "text-gray-500",    badge: "bg-gray-100 text-gray-700",       label: "Archivo" },
}

// ─── Consulta estado OC solo para este mantenimiento ─────────────────────────
// Usa .contains() para filtrar en el jsonb solo los detalles que
// contengan un objeto con este mantenimiento_id — sin traer todos los registros.

async function fetchEstadoOC(mantenimientoId: string): Promise<string | null> {
  const { data: detalles, error } = await supabase
    .from("detalles_documentos_comerciales")
    .select("documento_comercial_id")
    .contains("mantenimientos", JSON.stringify([{ mantenimiento_id: mantenimientoId }]))
    .limit(1)

  if (error || !detalles || detalles.length === 0) return null

  const { data: doc, error: docError } = await supabase
    .from("documentos_comerciales")
    .select("estado")
    .eq("id", detalles[0].documento_comercial_id)
    .single()

  if (docError || !doc) return null
  return doc.estado
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function MantenimientoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [item, setItem]         = useState<Mantenimiento | null>(null)
  const [estadoOC, setEstadoOC] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      supabase
        .from("mantenimientos")
        .select("*, empresas(razon_social)")
        .eq("id", id)
        .single(),
      fetchEstadoOC(id),
    ]).then(([{ data }, oc]) => {
      setItem(data as Mantenimiento)
      setEstadoOC(oc)
      setLoading(false)
    })
  }, [id])

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar este mantenimiento?")) return
    const { error } = await supabase.from("mantenimientos").delete().eq("id", id)
    if (error) { toast.error(error.message); return }
    toast.success("Mantenimiento eliminado")
    router.push("/dashboard/mantenimientos")
  }

  if (loading) return <div className="h-96 animate-pulse rounded-xl bg-muted" />
  if (!item)   return <p className="text-muted-foreground">Mantenimiento no encontrado</p>

  // Actividades — soporta {actividad, completada} y {nombre, completada}
  const actividades: { label: string; completada: boolean }[] = (
    Array.isArray(item.actividades_programadas) ? item.actividades_programadas : []
  ).map((a: unknown) => {
    if (typeof a === "string") return { label: a, completada: false }
    if (typeof a === "object" && a !== null) {
      const obj = a as Record<string, unknown>
      const label = (obj.actividad ?? obj.nombre ?? JSON.stringify(a)) as string
      return { label, completada: Boolean(obj.completada) }
    }
    return { label: String(a), completada: false }
  })

  // Repuestos
  const repuestos: { nombre: string; cantidad?: number; unidad?: string }[] =
    Array.isArray(item.repuestos_requeridos) ? item.repuestos_requeridos : []

  // Archivos — nuevo campo archivos_adjuntos con fallback a archivo_adjunto legacy
  const archivos: ArchivoAdjunto[] = (() => {
    const lista = (item as unknown as Record<string, unknown>).archivos_adjuntos
    if (Array.isArray(lista) && lista.length > 0) return lista as ArchivoAdjunto[]
    const legacy = (item as unknown as Record<string, unknown>).archivo_adjunto as string | null
    if (legacy) return [{ url: legacy, name: legacy.split("/").pop() ?? "documento.pdf", type: "application/pdf", size: 0, uploaded_at: "" }]
    return []
  })()

  return (
    <div className="space-y-6 w-[90%] md:max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          className="bg-white text-black py-1.5 px-3 rounded-xl flex items-center gap-x-2 cursor-pointer"
          onClick={() => router.push("/dashboard/mantenimientos")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => router.push(`/dashboard/mantenimientos/${id}/editar`)}
          >
            <Pencil className="mr-1 h-4 w-4" />
            Editar
          </Button>
          <button
            className="bg-red-500 px-3 py-1.5 text-white rounded-xl flex items-center gap-x-2 cursor-pointer"
            onClick={handleDelete}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Eliminar
          </button>
        </div>
      </div>

      {/* Título + estado */}
      <div className="p-4 rounded-xl border bg-white shadow-sm flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">{item.titulo}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            ID: <span className="font-mono">{item.id}</span>
          </p>
        </div>
        <EstadoBadge item={item} estadoOC={estadoOC} />
      </div>

      {/* Descripción */}
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
        <InfoCard icon={Tag}         label="Tipo"         value={<StatusBadge value={item.tipo} />} />
        <InfoCard icon={AlertCircle} label="Prioridad"    value={<StatusBadge value={item.prioridad} />} />
        <InfoCard icon={User}        label="Cliente"      value={item.nombre_cliente || item.empresas?.razon_social} />
        <InfoCard icon={Calendar}    label="Fecha Inicio" value={item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString("es-CO", { dateStyle: "long" }) : undefined} />
        <InfoCard icon={Calendar}    label="Fecha Final"  value={item.fecha_final  ? new Date(item.fecha_final ).toLocaleDateString("es-CO", { dateStyle: "long" }) : undefined} />
        <InfoCard icon={Calendar}    label="Creado"       value={new Date(item.created_at).toLocaleDateString("es-CO", { dateStyle: "long" })} />
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
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${act.completada ? "bg-green-500" : "bg-gray-300"}`} />
                <span className={act.completada ? "line-through text-muted-foreground" : ""}>{act.label}</span>
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
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm">
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
          {archivos.length > 0 && (
            <span className="ml-1 bg-gray-100 text-gray-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {archivos.length}
            </span>
          )}
        </p>

        {archivos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Sin documentos adjuntos</p>
        ) : (
          <ul className="space-y-2">
            {archivos.map((archivo) => {
              const cat = getFileCategory(archivo.type, archivo.name)
              const cfg = categoryConfig[cat]
              const Icon = cfg.icon
              return (
                <li key={archivo.url}>
                  <a
                    href={archivo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors group"
                  >
                    <div className={`p-2 rounded-md border ${cfg.bg} ${cfg.border} flex-shrink-0`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{archivo.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.badge}`}>{cfg.label}</span>
                        {archivo.size > 0 && <span className="text-xs text-muted-foreground">{formatBytes(archivo.size)}</span>}
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}