"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Mantenimiento } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Plus, Eye, Pencil } from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EstadoMantenimiento = "Pendiente" | "En ejecución" | "Cumplido" | "Realizado" | "Cancelado"

// Map: mantenimiento_id → estado del documento comercial asociado
type EstadoOCMap = Record<string, string>

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

function calcularEstado(item: Mantenimiento, estadoOCMap: EstadoOCMap): EstadoMantenimiento {
  // Realizado: si la OC asociada tiene estado "realizada"
  const estadoOC = estadoOCMap[item.id]
  if (estadoOC === "realizada") return "Realizado"

  // Cancelado: descomenta cuando tengas el campo
  // if (item.estado === "cancelado") return "Cancelado"

  const now    = hoyEnColombia()
  const inicio = item.fecha_inicio ? parseFecha(item.fecha_inicio) : null
  const fin    = item.fecha_final  ? parseFecha(item.fecha_final)  : null

  if (!inicio)          return "Pendiente"     // sin fecha aún
  if (now < inicio)     return "Pendiente"     // now < fecha_inicio
  if (fin && now > fin) return "Cumplido"      // fecha_final < now
  return "En ejecución"                        // fecha_inicio <= now <= fecha_final
}

// ─── Badge de estado ──────────────────────────────────────────────────────────

const estadoConfig: Record<EstadoMantenimiento, { dot: string; className: string }> = {
  "Pendiente":    { dot: "bg-gray-400",    className: "bg-gray-100    text-gray-600    border border-gray-200"    },
  "En ejecución": { dot: "bg-blue-500",    className: "bg-blue-100    text-blue-700    border border-blue-200"    },
  "Cumplido":     { dot: "bg-green-500",   className: "bg-green-100   text-green-700   border border-green-200"   },
  "Realizado":    { dot: "bg-emerald-500", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  "Cancelado":    { dot: "bg-red-400",     className: "bg-red-100     text-red-600     border border-red-200"     },
}

function EstadoBadge({ item, estadoOCMap }: { item: Mantenimiento; estadoOCMap: EstadoOCMap }) {
  const estado = calcularEstado(item, estadoOCMap)
  const cfg    = estadoConfig[estado]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {estado}
    </span>
  )
}

// ─── Cargar mapa OC ───────────────────────────────────────────────────────────
// Busca todos los detalles que tengan mantenimientos referenciados,
// cruza con documentos_comerciales y devuelve { mantenimiento_id: estado_oc }

async function cargarEstadoOCMap(): Promise<EstadoOCMap> {
  // 1. Traer todos los detalles con su campo mantenimientos (jsonb) y documento_comercial_id
  const { data: detalles, error } = await supabase
    .from("detalles_documentos_comerciales")
    .select("documento_comercial_id, mantenimientos")

  if (error || !detalles) return {}

  // 2. Construir mapa: mantenimiento_id → documento_comercial_id
  const mantenimientoToDoc: Record<string, string> = {}
  for (const detalle of detalles) {
    const lista = Array.isArray(detalle.mantenimientos) ? detalle.mantenimientos : []
    for (const m of lista) {
      if (m?.mantenimiento_id) {
        mantenimientoToDoc[m.mantenimiento_id] = detalle.documento_comercial_id
      }
    }
  }

  if (Object.keys(mantenimientoToDoc).length === 0) return {}

  // 3. Traer los documentos comerciales únicos referenciados
  const docIds = [...new Set(Object.values(mantenimientoToDoc))]
  const { data: documentos, error: docError } = await supabase
    .from("documentos_comerciales")
    .select("id, estado")
    .in("id", docIds)

  if (docError || !documentos) return {}

  // 4. Mapa: documento_id → estado
  const docEstado: Record<string, string> = {}
  for (const doc of documentos) {
    docEstado[doc.id] = doc.estado
  }

  // 5. Resultado final: mantenimiento_id → estado_oc
  const result: EstadoOCMap = {}
  for (const [mantId, docId] of Object.entries(mantenimientoToDoc)) {
    if (docEstado[docId]) {
      result[mantId] = docEstado[docId]
    }
  }

  return result
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function MantenimientosPage() {
  const router = useRouter()
  const [data, setData]               = useState<Mantenimiento[]>([])
  const [estadoOCMap, setEstadoOCMap] = useState<EstadoOCMap>({})
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      supabase
        .from("mantenimientos")
        .select("*, empresas(razon_social)")
        .order("created_at", { ascending: false }),
      cargarEstadoOCMap(),
    ]).then(([{ data: d }, ocMap]) => {
      setData((d as Mantenimiento[]) || [])
      setEstadoOCMap(ocMap)
      setLoading(false)
    })
  }, [])

  const columns = [
    { key: "titulo", label: "Título" },
    {
      key: "estado",
      label: "Estado",
      render: (item: Mantenimiento) => <EstadoBadge item={item} estadoOCMap={estadoOCMap} />,
    },
    {
      key: "tipo",
      label: "Tipo",
      render: (item: Mantenimiento) => <StatusBadge value={item.tipo} />,
    },
    {
      key: "prioridad",
      label: "Prioridad",
      render: (item: Mantenimiento) => <StatusBadge value={item.prioridad} />,
    },
    {
      key: "cliente",
      label: "Cliente",
      render: (item: Mantenimiento) =>
        item.nombre_cliente || item.empresas?.razon_social || "-",
    },
    { key: "fecha_inicio", label: "Fecha Inicio" },
    { key: "fecha_final",  label: "Fecha Final" },
    {
      key: "acciones",
      label: "Acciones",
      render: (item: Mantenimiento) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => router.push(`/dashboard/mantenimientos/${item.id}`)}
          >
            <Eye className="h-3.5 w-3.5" />
            Ver
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => router.push(`/dashboard/mantenimientos/${item.id}/editar`)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-white p-6 rounded-xl shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mantenimientos</h1>
          <p className="text-muted-foreground">Órdenes de mantenimiento</p>
        </div>
        <button
          className="bg-gray-50 flex items-center rounded-md px-3 py-2 text-sm font-medium text-black shadow-lg cursor-pointer"
          onClick={() => router.push("/dashboard/mantenimientos/nuevo")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Mantenimiento
        </button>
      </div>

      <DataTable
        data={data as unknown as Record<string, unknown>[]}
        columns={
          columns as {
            key: string
            label: string
            render?: (item: Record<string, unknown>) => React.ReactNode
          }[]
        }
        searchKey="titulo"
        searchPlaceholder="Buscar por título..."
        onRowClick={(item) => router.push(`/dashboard/mantenimientos/${item.id}`)}
      />
    </div>
  )
}