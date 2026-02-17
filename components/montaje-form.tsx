"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Montaje, Empresa } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

interface MontajeFormProps {
  montaje?: Montaje
}

export function MontajeForm({ montaje }: MontajeFormProps) {
  const router = useRouter()
  const isEdit = !!montaje

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [form, setForm] = useState({
    tipo: montaje?.tipo || "",
    numero: montaje?.numero || "",
    fecha: montaje?.fecha || "",
    fecha_inicio: montaje?.fecha_inicio || "",
    fecha_fin: montaje?.fecha_fin || "",
    empresa_id: montaje?.empresa_id || "",
    nombre_empresa_cliente: montaje?.nombre_empresa_cliente || "",
    telefono_empresa_cliente: montaje?.telefono_empresa_cliente || "",
    correo_empresa_cliente: montaje?.correo_empresa_cliente || "",
    direccion_empresa_cliente: montaje?.direccion_empresa_cliente || "",
    nit_empresa_cliente: montaje?.nit_empresa_cliente || "",
    estado: montaje?.estado || "pendiente",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from("empresas").select("*").order("razon_social")
      .then(({ data }) => setEmpresas((data as Empresa[]) || []))
  }, [])

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleEmpresaChange = (empresaId: string) => {
    const emp = empresas.find((e) => e.id === empresaId)
    if (emp) {
      setForm((prev) => ({
        ...prev,
        empresa_id: empresaId,
        nombre_empresa_cliente: emp.razon_social,
        telefono_empresa_cliente: emp.telefono || "",
        correo_empresa_cliente: emp.email || "",
        direccion_empresa_cliente: emp.direccion_fiscal || "",
        nit_empresa_cliente: emp.nit,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      empresa_id: form.empresa_id || null,
      fecha: form.fecha || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
    }
    try {
      if (isEdit) {
        const { error } = await supabase.from("montajes").update(payload).eq("id", montaje.id)
        if (error) throw error
        toast.success("Montaje actualizado")
      } else {
        const { error } = await supabase.from("montajes").insert(payload)
        if (error) throw error
        toast.success("Montaje creado")
        router.push("/dashboard/montajes")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al guardar"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Editar Montaje" : "Nuevo Montaje"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Input value={form.tipo} onChange={(e) => handleChange("tipo", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Numero</Label>
              <Input value={form.numero} onChange={(e) => handleChange("numero", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={form.empresa_id} onValueChange={handleEmpresaChange}>
                <SelectTrigger><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.razon_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => handleChange("estado", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en_proceso">En proceso</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={(e) => handleChange("fecha", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input type="date" value={form.fecha_inicio} onChange={(e) => handleChange("fecha_inicio", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input type="date" value={form.fecha_fin} onChange={(e) => handleChange("fecha_fin", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre Empresa Cliente</Label>
              <Input value={form.nombre_empresa_cliente} onChange={(e) => handleChange("nombre_empresa_cliente", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>NIT Cliente</Label>
              <Input value={form.nit_empresa_cliente} onChange={(e) => handleChange("nit_empresa_cliente", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefono Cliente</Label>
              <Input value={form.telefono_empresa_cliente} onChange={(e) => handleChange("telefono_empresa_cliente", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Correo Cliente</Label>
              <Input value={form.correo_empresa_cliente} onChange={(e) => handleChange("correo_empresa_cliente", e.target.value)} />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Direccion Cliente</Label>
              <Input value={form.direccion_empresa_cliente} onChange={(e) => handleChange("direccion_empresa_cliente", e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : isEdit ? "Actualizar" : "Crear Montaje"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
