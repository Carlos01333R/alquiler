"use client"

import React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Montaje } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Plus, Eye, Pencil } from "lucide-react"

export default function MontajesPage() {
  const router = useRouter()
  const [data, setData] = useState<Montaje[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("montajes")
      .select("*, empresas(razon_social)")
      .order("created_at", { ascending: false })
      .then(({ data: d }) => {
        setData((d as Montaje[]) || [])
        setLoading(false)
      })
  }, [])

  const columns = [
    { key: "titulo", label: "Título" },
    {
      key: "tipo",
      label: "Tipo",
      render: (item: Montaje) => <StatusBadge value={item.tipo} />,
    },
    {
      key: "prioridad",
      label: "Prioridad",
      render: (item: Montaje) => <StatusBadge value={item.prioridad} />,
    },
    {
      key: "estado",
      label: "Estado",
      render: (item: Montaje) => <StatusBadge value={item.estado} />,
    },
    {
      key: "cliente",
      label: "Cliente",
      render: (item: Montaje) =>
        item.nombre_cliente || item.empresas?.razon_social || "-",
    },
    { key: "fecha_inicio", label: "Fecha Inicio" },
    { key: "fecha_final", label: "Fecha Final" },
    {
      key: "acciones",
      label: "Acciones",
      render: (item: Montaje) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => router.push(`/dashboard/montajes/${item.id}`)}
          >
            <Eye className="h-3.5 w-3.5" />
            Ver
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => router.push(`/dashboard/montajes/${item.id}/editar`)}
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Montajes</h1>
          <p className="text-muted-foreground">Órdenes de montaje</p>
        </div>
        <button
          className="bg-gray-50 flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-black shadow-lg cursor-pointer"
         onClick={() => router.push("/dashboard/montajes/nuevo")}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Montaje
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
        onRowClick={(item) => router.push(`/dashboard/montajes/${item.id}`)}
      />
    </div>
  )
}