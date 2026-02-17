"use client"

import React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Montaje } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function MontajesPage() {
  const router = useRouter()
  const [data, setData] = useState<Montaje[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("montajes")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data: d }) => {
        setData((d as Montaje[]) || [])
        setLoading(false)
      })
  }, [])

  const columns = [
    { key: "numero", label: "Numero" },
    { key: "tipo", label: "Tipo" },
    { key: "nombre_empresa_cliente", label: "Cliente" },
    { key: "nit_empresa_cliente", label: "NIT" },
    { key: "fecha_inicio", label: "Fecha Inicio" },
    { key: "fecha_fin", label: "Fecha Fin" },
    {
      key: "estado",
      label: "Estado",
      render: (item: Montaje) => <StatusBadge value={item.estado} />,
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
          <p className="text-muted-foreground">Gestion de montajes y alquileres</p>
        </div>
        <Button onClick={() => router.push("/dashboard/montajes/nuevo")}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Montaje
        </Button>
      </div>
      <DataTable
        data={data as unknown as Record<string, unknown>[]}
        columns={columns as { key: string; label: string; render?: (item: Record<string, unknown>) => React.ReactNode }[]}
        searchKey="nombre_empresa_cliente"
        searchPlaceholder="Buscar por cliente..."
        onRowClick={(item) => router.push(`/dashboard/montajes/${item.id}`)}
      />
    </div>
  )
}
