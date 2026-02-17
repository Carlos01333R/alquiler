"use client"

import React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Solicitud } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function SolicitudesPage() {
  const router = useRouter()
  const [data, setData] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("solicitudes")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data: d }) => {
        setData((d as Solicitud[]) || [])
        setLoading(false)
      })
  }, [])

  const columns = [
    { key: "titulo", label: "Titulo" },
    {
      key: "tipo",
      label: "Tipo",
      render: (item: Solicitud) => <StatusBadge value={item.tipo} />,
    },
    {
      key: "prioridad",
      label: "Prioridad",
      render: (item: Solicitud) => <StatusBadge value={item.prioridad} />,
    },
    {
      key: "estado",
      label: "Estado",
      render: (item: Solicitud) => <StatusBadge value={item.estado} />,
    },
    { key: "nombre_cliente", label: "Cliente" },
    { key: "nombre_activo", label: "Activo" },
    { key: "fecha_inicio", label: "Fecha Inicio" },
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Solicitudes</h1>
          <p className="text-muted-foreground">Gestion de solicitudes de servicio</p>
        </div>
        <Button onClick={() => router.push("/dashboard/solicitudes/nueva")}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Solicitud
        </Button>
      </div>
      <DataTable
        data={data as unknown as Record<string, unknown>[]}
        columns={columns as { key: string; label: string; render?: (item: Record<string, unknown>) => React.ReactNode }[]}
        searchKey="titulo"
        searchPlaceholder="Buscar por titulo..."
        onRowClick={(item) => router.push(`/dashboard/solicitudes/${item.id}`)}
      />
    </div>
  )
}
