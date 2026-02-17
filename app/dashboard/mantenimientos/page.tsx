"use client"

import React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Mantenimiento } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function MantenimientosPage() {
  const router = useRouter()
  const [data, setData] = useState<Mantenimiento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("mantenimientos")
      .select("*, empresas(razon_social)")
      .order("created_at", { ascending: false })
      .then(({ data: d }) => {
        setData((d as Mantenimiento[]) || [])
        setLoading(false)
      })
  }, [])

  const columns = [
    { key: "titulo", label: "Titulo" },
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
      render: (item: Mantenimiento) => item.nombre_cliente || item.empresas?.razon_social || "-",
    },
    { key: "fecha_inicio", label: "Fecha Inicio" },
    { key: "fecha_final", label: "Fecha Final" },
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
          <p className="text-muted-foreground">Ordenes de mantenimiento</p>
        </div>
        <Button onClick={() => router.push("/dashboard/mantenimientos/nuevo")}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Mantenimiento
        </Button>
      </div>
      <DataTable
        data={data as unknown as Record<string, unknown>[]}
        columns={columns as { key: string; label: string; render?: (item: Record<string, unknown>) => React.ReactNode }[]}
        searchKey="titulo"
        searchPlaceholder="Buscar por titulo..."
        onRowClick={(item) => router.push(`/dashboard/mantenimientos/${item.id}`)}
      />
    </div>
  )
}
