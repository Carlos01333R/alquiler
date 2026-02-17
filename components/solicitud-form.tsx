"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Solicitud, Empresa, Activo, SetActivo } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

interface SolicitudFormProps {
  solicitud?: Solicitud
}

export function SolicitudForm({ solicitud }: SolicitudFormProps) {
  const router = useRouter()
  const isEdit = !!solicitud

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [activos, setActivos] = useState<Activo[]>([])
  const [sets, setSets] = useState<SetActivo[]>([])

  const [form, setForm] = useState({
    cliente_id: solicitud?.cliente_id || "",
    activo_id: solicitud?.activo_id || "",
    set_activo_id: solicitud?.set_activo_id || "",
    nombre_cliente: solicitud?.nombre_cliente || "",
    nombre_activo: solicitud?.nombre_activo || "",
    serie_activo: solicitud?.serie_activo || "",
    titulo: solicitud?.titulo || "",
    descripcion: solicitud?.descripcion || "",
    tipo: solicitud?.tipo || "soporte",
    prioridad: solicitud?.prioridad || "media",
    cliente_fue_notificado: solicitud?.cliente_fue_notificado || false,
    estado: solicitud?.estado || "abierto",
    fecha_inicio: solicitud?.fecha_inicio || "",
    fecha_resolucion: solicitud?.fecha_resolucion || "",
    comentarios_cliente: solicitud?.comentarios_cliente || "",
    comentario_proveedor: solicitud?.comentario_proveedor || "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from("empresas").select("id, razon_social").order("razon_social"),
      supabase.from("activos").select("id, nombre, serie").order("nombre"),
      supabase.from("sets_activos").select("id, nombre, serie").order("nombre"),
    ]).then(([{ data: e }, { data: a }, { data: s }]) => {
      setEmpresas((e as Empresa[]) || [])
      setActivos((a as Activo[]) || [])
      setSets((s as SetActivo[]) || [])
    })
  }, [])

  const handleChange = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleEmpresaChange = (empId: string) => {
    const emp = empresas.find((e) => e.id === empId)
    setForm((prev) => ({
      ...prev,
      cliente_id: empId,
      nombre_cliente: emp?.razon_social || "",
    }))
  }

  const handleActivoChange = (activoId: string) => {
    const act = activos.find((a) => a.id === activoId)
    setForm((prev) => ({
      ...prev,
      activo_id: activoId,
      set_activo_id: "",
      nombre_activo: act?.nombre || "",
      serie_activo: act?.serie || "",
    }))
  }

  const handleSetChange = (setId: string) => {
    const s = sets.find((x) => x.id === setId)
    setForm((prev) => ({
      ...prev,
      set_activo_id: setId,
      activo_id: "",
      nombre_activo: s?.nombre || "",
      serie_activo: s?.serie || "",
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo) {
      toast.error("El titulo es obligatorio")
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      cliente_id: form.cliente_id || null,
      activo_id: form.activo_id || null,
      set_activo_id: form.set_activo_id || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_resolucion: form.fecha_resolucion || null,
    }
    try {
      if (isEdit) {
        const { error } = await supabase.from("solicitudes").update(payload).eq("id", solicitud.id)
        if (error) throw error
        toast.success("Solicitud actualizada")
      } else {
        const { error } = await supabase.from("solicitudes").insert(payload)
        if (error) throw error
        toast.success("Solicitud creada")
        router.push("/dashboard/solicitudes")
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
          <CardTitle>{isEdit ? "Editar Solicitud" : "Nueva Solicitud"}</CardTitle>
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
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.razon_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Activo (individual)</Label>
              <Select value={form.activo_id} onValueChange={handleActivoChange}>
                <SelectTrigger><SelectValue placeholder="Seleccionar activo..." /></SelectTrigger>
                <SelectContent>
                  {activos.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nombre} {a.serie ? `(${a.serie})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Set de Activos</Label>
              <Select value={form.set_activo_id} onValueChange={handleSetChange}>
                <SelectTrigger><SelectValue placeholder="Seleccionar set..." /></SelectTrigger>
                <SelectContent>
                  {sets.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => handleChange("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="soporte">Soporte</SelectItem>
                  <SelectItem value="consulta">Consulta</SelectItem>
                  <SelectItem value="devolucion">Devolucion</SelectItem>
                  <SelectItem value="resena">Resena</SelectItem>
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
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => handleChange("estado", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="abierto">Abierto</SelectItem>
                  <SelectItem value="en_proceso">En proceso</SelectItem>
                  <SelectItem value="resuelto">Resuelto</SelectItem>
                  <SelectItem value="cerrado">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input type="date" value={form.fecha_inicio} onChange={(e) => handleChange("fecha_inicio", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha Resolucion</Label>
              <Input type="date" value={form.fecha_resolucion} onChange={(e) => handleChange("fecha_resolucion", e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="notificado"
                checked={form.cliente_fue_notificado}
                onCheckedChange={(v) => handleChange("cliente_fue_notificado", !!v)}
              />
              <Label htmlFor="notificado">Cliente fue notificado</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descripcion</Label>
            <Textarea value={form.descripcion} onChange={(e) => handleChange("descripcion", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Comentarios del Cliente</Label>
              <Textarea value={form.comentarios_cliente} onChange={(e) => handleChange("comentarios_cliente", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Comentario del Proveedor</Label>
              <Textarea value={form.comentario_proveedor} onChange={(e) => handleChange("comentario_proveedor", e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : isEdit ? "Actualizar" : "Crear Solicitud"}
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
