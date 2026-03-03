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
import { Plus, Trash2, GripVertical, CheckSquare, Square, Package } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Actividad {
  id: string
  actividad: string
  completada: boolean
}

interface Repuesto {
  id: string
  nombre: string
  cantidad: number
  notas: string
}

interface MontajeFormProps {
  montaje?: Mantenimiento
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ActividadesEditor({
  actividades,
  onChange,
}: {
  actividades: Actividad[]
  onChange: (items: Actividad[]) => void
}) {
  const addActividad = () => {
    onChange([
      ...actividades,
      { id: crypto.randomUUID(), actividad: "", completada: false },
    ])
  }

  const removeActividad = (id: string) => {
    onChange(actividades.filter((a) => a.id !== id))
  }

  const updateActividad = (id: string, field: keyof Actividad, value: string | boolean) => {
    onChange(
      actividades.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    )
  }

  return (
    <div className="space-y-2">
      {actividades.length === 0 && (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-6 text-sm text-slate-400">
          Sin actividades. Agrega la primera.
        </div>
      )}

      {actividades.map((act, idx) => (
        <div
          key={act.id}
          className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-shadow hover:shadow-md"
        >
          {/* Número */}
          <span className="w-5 shrink-0 text-center text-xs font-semibold text-slate-400">
            {idx + 1}
          </span>

          {/* Toggle completada */}
          <button
            type="button"
            onClick={() => updateActividad(act.id, "completada", !act.completada)}
            className="shrink-0 text-slate-400 transition-colors hover:text-emerald-500"
            title={act.completada ? "Marcar pendiente" : "Marcar completada"}
          >
            {act.completada ? (
              <CheckSquare className="h-4 w-4 text-emerald-500" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>

          {/* Input actividad */}
          <input
            type="text"
            className={`flex-1 bg-transparent text-sm outline-none placeholder:text-slate-300 ${
              act.completada ? "line-through text-slate-400" : "text-slate-700"
            }`}
            placeholder="Descripción de la actividad..."
            value={act.actividad}
            onChange={(e) => updateActividad(act.id, "actividad", e.target.value)}
          />

          {/* Eliminar */}
          <button
            type="button"
            onClick={() => removeActividad(act.id)}
            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-slate-300 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addActividad}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
      >
        <Plus className="h-4 w-4" />
        Agregar actividad
      </button>
    </div>
  )
}

function RepuestosEditor({
  repuestos,
  onChange,
}: {
  repuestos: Repuesto[]
  onChange: (items: Repuesto[]) => void
}) {
  const addRepuesto = () => {
    onChange([
      ...repuestos,
      { id: crypto.randomUUID(), nombre: "", cantidad: 1, notas: "" },
    ])
  }

  const removeRepuesto = (id: string) => {
    onChange(repuestos.filter((r) => r.id !== id))
  }

  const updateRepuesto = (id: string, field: keyof Repuesto, value: string | number) => {
    onChange(
      repuestos.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )
  }

  return (
    <div className="space-y-2">
      {repuestos.length === 0 && (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-6 text-sm text-slate-400">
          Sin repuestos. Agrega el primero.
        </div>
      )}

      {repuestos.length > 0 && (
        <div className="grid grid-cols-12 gap-2 px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span className="col-span-5">Nombre</span>
          <span className="col-span-2 text-center">Cant.</span>
          <span className="col-span-4">Notas</span>
          <span className="col-span-1" />
        </div>
      )}

      {repuestos.map((rep) => (
        <div
          key={rep.id}
          className="group grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-shadow hover:shadow-md"
        >
          {/* Icono */}
          <div className="col-span-5 flex items-center gap-2">
            <Package className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            <input
              type="text"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-300"
              placeholder="Nombre del repuesto..."
              value={rep.nombre}
              onChange={(e) => updateRepuesto(rep.id, "nombre", e.target.value)}
            />
          </div>

          {/* Cantidad */}
          <div className="col-span-2 flex items-center justify-center">
            <input
              type="number"
              min={1}
              className="w-16 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-center text-sm text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
              value={rep.cantidad}
              onChange={(e) =>
                updateRepuesto(rep.id, "cantidad", parseInt(e.target.value) || 1)
              }
            />
          </div>

          {/* Notas */}
          <div className="col-span-4">
            <input
              type="text"
              className="w-full bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-300"
              placeholder="Notas opcionales..."
              value={rep.notas}
              onChange={(e) => updateRepuesto(rep.id, "notas", e.target.value)}
            />
          </div>

          {/* Eliminar */}
          <div className="col-span-1 flex justify-end">
            <button
              type="button"
              onClick={() => removeRepuesto(rep.id)}
              className="opacity-0 transition-opacity group-hover:opacity-100 text-slate-300 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addRepuesto}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-500 transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600"
      >
        <Plus className="h-4 w-4" />
        Agregar repuesto
      </button>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseActividades(raw: unknown): Actividad[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item: unknown) => {
    if (typeof item === "string") {
      return { id: crypto.randomUUID(), actividad: item, completada: false }
    }
    const obj = item as Record<string, unknown>
    return {
      id: crypto.randomUUID(),
      actividad: String(obj.actividad ?? ""),
      completada: Boolean(obj.completada ?? false),
    }
  })
}

function parseRepuestos(raw: unknown): Repuesto[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item: unknown) => {
    if (typeof item === "string") {
      return { id: crypto.randomUUID(), nombre: item, cantidad: 1, notas: "" }
    }
    const obj = item as Record<string, unknown>
    return {
      id: crypto.randomUUID(),
      nombre: String(obj.nombre ?? ""),
      cantidad: Number(obj.cantidad ?? 1),
      notas: String(obj.notas ?? ""),
    }
  })
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function MontajeForm({ montaje }: MontajeFormProps) {
  const router = useRouter()
  const isEdit = !!montaje

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    titulo: montaje?.titulo || "",
    descripcion: montaje?.descripcion || "",
    cliente_id: montaje?.cliente_id || "",
    nombre_cliente: montaje?.nombre_cliente || "",
    tipo: montaje?.tipo || "preventivo",
    prioridad: montaje?.prioridad || "media",
    fecha_inicio: montaje?.fecha_inicio || "",
    fecha_final: montaje?.fecha_final || "",
  })

  const [actividades, setActividades] = useState<Actividad[]>(() =>
    parseActividades(montaje?.actividades_programadas)
  )

  const [repuestos, setRepuestos] = useState<Repuesto[]>(() =>
    parseRepuestos(montaje?.repuestos_requeridos)
  )

  useEffect(() => {
    supabase
      .from("empresas")
      .select("id, razon_social")
      .order("razon_social")
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
      toast.error("El título es obligatorio")
      return
    }

    setSaving(true)

    // Serializar — eliminar el campo `id` interno antes de guardar
    const actividadesPayload = actividades
      .filter((a) => a.actividad.trim())
      .map(({ id, ...rest }) => rest)

    const repuestosPayload = repuestos
      .filter((r) => r.nombre.trim())
      .map(({ id, ...rest }) => rest)

    const payload = {
      ...form,
      cliente_id: form.cliente_id || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_final: form.fecha_final || null,
      actividades_programadas: actividadesPayload,
      repuestos_requeridos: repuestosPayload,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from("montajes")
          .update(payload)
          .eq("id", montaje.id)
        if (error) throw error
        toast.success("Montaje actualizado")
      } else {
        const { error } = await supabase.from("montajes").insert(payload)
        if (error) throw error
        toast.success("montaje creado")
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
          <CardTitle>
            {isEdit ? "Editar Montaje" : "Nuevo Montaje"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* ── Campos base ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={(e) => handleChange("titulo", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={handleEmpresaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => handleChange("tipo", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              <Select
                value={form.prioridad}
                onValueChange={(v) => handleChange("prioridad", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => handleChange("fecha_inicio", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Final</Label>
              <Input
                type="date"
                value={form.fecha_final}
                onChange={(e) => handleChange("fecha_final", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={form.descripcion}
              onChange={(e) => handleChange("descripcion", e.target.value)}
            />
          </div>

          {/* ── Actividades ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Actividades Programadas
                {actividades.length > 0 && (
                  <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {actividades.filter((a) => a.completada).length}/{actividades.length}
                  </span>
                )}
              </Label>
            </div>
            <ActividadesEditor actividades={actividades} onChange={setActividades} />
          </div>

          {/* ── Repuestos ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Repuestos Requeridos
                {repuestos.length > 0 && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {repuestos.length} {repuestos.length === 1 ? "ítem" : "ítems"}
                  </span>
                )}
              </Label>
            </div>
            <RepuestosEditor repuestos={repuestos} onChange={setRepuestos} />
          </div>

          {/* ── Acciones ── */}
          <div className="flex gap-3 pt-2 border-t">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : isEdit ? "Actualizar" : "Crear Mantenimiento"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          </div>

        </CardContent>
      </Card>
    </form>
  )
}