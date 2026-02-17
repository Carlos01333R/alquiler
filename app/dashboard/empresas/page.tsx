"use client"

import React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Empresa } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function EmpresasPage() {
  const router = useRouter()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("empresas")
        .select("*")
        .order("created_at", { ascending: false })
      setEmpresas((data as Empresa[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const columns = [
    { key: "nit", label: "NIT" },
    { key: "razon_social", label: "Razon Social" },
    {
      key: "tipo",
      label: "Tipo",
      render: (item: Empresa) => <StatusBadge value={item.tipo} />,
    },
    { key: "email", label: "Email" },
    { key: "telefono", label: "Telefono" },
    { key: "ciudad", label: "Ciudad" },
    {
      key: "estado",
      label: "Estado",
      render: (item: Empresa) => <StatusBadge value={item.estado} />,
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Empresas</h1>
          <p className="text-muted-foreground">Gestion de empresas y clientes</p>
        </div>
        <Button onClick={() => router.push("/dashboard/empresas/nueva")}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Empresa
        </Button>
      </div>
      <DataTable
        data={empresas as unknown as Record<string, unknown>[]}
        columns={columns as { key: string; label: string; render?: (item: Record<string, unknown>) => React.ReactNode }[]}
        searchKey="razon_social"
        searchPlaceholder="Buscar por razon social..."
        onRowClick={(item) => router.push(`/dashboard/empresas/${item.id}`)}
      />
    </div>
  )
}
