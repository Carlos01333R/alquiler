"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Mantenimiento, Empresa } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

interface MantenimientoFormProps {
  mantenimiento?: Mantenimiento
}

export function MantenimientoForm({ mantenimiento }: MantenimientoFormProps) {
  const router = useRouter()
  const isEdit = !!mantenimiento

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [form, setForm] = useState({
    titulo: mantenimiento?.titulo || "",
    descripcion: mantenimiento?.descripcion || "",
    cliente_id: mantenimiento?.cliente_id || "",
    nombre_cliente: mantenimiento?.nombre_cliente || "",
    tipo: mantenimiento?.tipo || "preventivo",
    prioridad: mantenimiento?.prioridad || "media",
    fecha_inicio: mantenimiento?.fecha_inicio || "",
    fecha_final: mantenimiento?.fecha_final || "",
    actividades_programadas: JSON.stringify(mantenimiento?.actividades_programadas || [], null, 2),
    repuestos_requeridos: JSON.stringify(mantenimiento?.repuestos_requeridos || [], null, 2),
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from("empresas").select("id, razon_social").order("razon_social")
      .then(({ data }) => setEmpresas((data as Empresa[]) || []))
  }, [])

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleEmpresaChange = (empresaId: string) => {
    const emp = empresas.find((e) => e.id === empresaId)
    setForm((prev) => ({
      ...prev,
      cliente_id: empresaId,
      nombre_cliente: emp?.razon_social || "",
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo) {
      toast.error("El titulo es obligatorio")
      return
    }
    let actividades, repuestos
    try {
      actividades = JSON.parse(form.actividades_programadas)
      repuestos = JSON.parse(form.repuestos_requeridos)
    } catch {
      toast.error("Actividades o repuestos deben ser JSON valido")
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      cliente_id: form.cliente_id || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_final: form.fecha_final || null,
      actividades_programadas: actividades,
      repuestos_requeridos: repuestos,
    }
    try {
      if (isEdit) {
        const { error } = await supabase.from("mantenimientos").update(payload).eq("id", mantenimiento.id)
        if (error) throw error
        toast.success("Mantenimiento actualizado")
      } else {
        const { error } = await supabase.from("mantenimientos").insert(payload)
        if (error) throw error
        toast.success("Mantenimiento creado")
        router.push("/dashboard/mantenimientos")
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
          <CardTitle>{isEdit ? "Editar Mantenimiento" : "Nuevo Mantenimiento"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Titulo *</Label>
              <Input value={form.titulo} onChange={(e) => handleChange("titulo", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={handleEmpresaChange}>
                <SelectTrigger><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.razon_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => handleChange("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventivo">Preventivo</SelectItem>
                  <SelectItem value="correctivo">Correctivo</SelectItem>
                  <SelectItem value="predictivo">Predictivo</SelectItem>
                  <SelectItem value="emergencia">Emergencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={form.prioridad} onValueChange={(v) => handleChange("prioridad", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Critica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input type="date" value={form.fecha_inicio} onChange={(e) => handleChange("fecha_inicio", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha Final</Label>
              <Input type="date" value={form.fecha_final} onChange={(e) => handleChange("fecha_final", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descripcion</Label>
            <Textarea value={form.descripcion} onChange={(e) => handleChange("descripcion", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Actividades Programadas (JSON)</Label>
            <Textarea
              rows={4}
              className="font-mono text-sm"
              value={form.actividades_programadas}
              onChange={(e) => handleChange("actividades_programadas", e.target.value)}
              placeholder={'[{ "actividad": "Limpieza", "completada": false }]'}
            />
          </div>
          <div className="space-y-2">
            <Label>Repuestos Requeridos (JSON)</Label>
            <Textarea
              rows={4}
              className="font-mono text-sm"
              value={form.repuestos_requeridos}
              onChange={(e) => handleChange("repuestos_requeridos", e.target.value)}
              placeholder={'[{ "nombre": "Filtro", "cantidad": 2, "notas": "" }]'}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : isEdit ? "Actualizar" : "Crear Mantenimiento"}
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
