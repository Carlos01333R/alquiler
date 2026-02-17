"use client"

import React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Activo, SetActivo } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"

export default function ActivosPage() {
  const router = useRouter()
  const [activos, setActivos] = useState<Activo[]>([])
  const [sets, setSets] = useState<SetActivo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: a }, { data: s }] = await Promise.all([
        supabase.from("activos").select("*, categorias(nombre)").order("created_at", { ascending: false }),
        supabase.from("sets_activos").select("*, categorias(nombre)").order("created_at", { ascending: false }),
      ])
      setActivos((a as Activo[]) || [])
      setSets((s as SetActivo[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const activoColumns = [
    { key: "nombre", label: "Nombre" },
    {
      key: "tipo",
      label: "Tipo",
      render: (item: Activo) => <StatusBadge value={item.tipo} />,
    },
    { key: "serie", label: "Serie" },
    { key: "modelo", label: "Modelo" },
    {
      key: "categoria",
      label: "Categoria",
      render: (item: Activo) => item.categorias?.nombre || "-",
    },
    {
      key: "estado_disponibilidad",
      label: "Disponibilidad",
      render: (item: Activo) => <StatusBadge value={item.estado_disponibilidad} />,
    },
    { key: "stock", label: "Stock" },
    {
      key: "estado_certificacion",
      label: "Certificacion",
      render: (item: Activo) => <StatusBadge value={item.estado_certificacion} />,
    },
  ]

  const setColumns = [
    { key: "nombre", label: "Nombre" },
    {
      key: "tipo",
      label: "Tipo",
      render: (item: SetActivo) => <StatusBadge value={item.tipo} />,
    },
    { key: "serie", label: "Serie" },
    {
      key: "categoria",
      label: "Categoria",
      render: (item: SetActivo) => item.categorias?.nombre || "-",
    },
    {
      key: "estado_disponibilidad",
      label: "Disponibilidad",
      render: (item: SetActivo) => <StatusBadge value={item.estado_disponibilidad} />,
    },
    { key: "stock", label: "Stock" },
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Activos</h1>
          <p className="text-muted-foreground">Equipos, herramientas y sets de activos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/dashboard/activos/nuevo")} >
            <Plus className="mr-2 h-4 w-4 text-white" />
         
            <p className="text-white">   Nuevo Activo</p>
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard/activos/nuevo-set")}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Set
          </Button>
        </div>
      </div>

      <Tabs defaultValue="activos">
        <TabsList>
          <TabsTrigger value="activos">Activos ({activos.length})</TabsTrigger>
          <TabsTrigger value="sets">Sets de Activos ({sets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="mt-4">
          <DataTable
            data={activos as unknown as Record<string, unknown>[]}
            columns={activoColumns as { key: string; label: string; render?: (item: Record<string, unknown>) => React.ReactNode }[]}
            searchKey="nombre"
            searchPlaceholder="Buscar activo..."
            onRowClick={(item) => router.push(`/dashboard/activos/${item.id}`)}
          />
        </TabsContent>

        <TabsContent value="sets" className="mt-4">
          <DataTable
            data={sets as unknown as Record<string, unknown>[]}
            columns={setColumns as { key: string; label: string; render?: (item: Record<string, unknown>) => React.ReactNode }[]}
            searchKey="nombre"
            searchPlaceholder="Buscar set..."
            onRowClick={(item) => router.push(`/dashboard/activos/set/${item.id}`)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
