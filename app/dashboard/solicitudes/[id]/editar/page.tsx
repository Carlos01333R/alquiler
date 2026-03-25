"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
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
import { toast } from "sonner"
import { ArrowLeft, Trash2 } from "lucide-react"

export default function SolicitudEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [item, setItem] = useState<Solicitud | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [activos, setActivos] = useState<Activo[]>([])
  const [sets, setSets] = useState<SetActivo[]>([])

  const [form, setForm] = useState({
    cliente_id: "",
    activo_id: "",
    set_activo_id: "",
    nombre_cliente: "",
    nombre_activo: "",
    serie_activo: "",
    titulo: "",
    descripcion: "",
    tipo: "soporte",
    prioridad: "media",
    cliente_fue_notificado: false,
    estado: "abierto",
    fecha_inicio: "",
    fecha_resolucion: "",
    comentarios_cliente: "",
    comentario_proveedor: "",
  })

  useEffect(() => {
    Promise.all([
      supabase.from("solicitudes").select("*").eq("id", id).single(),
      supabase.from("empresas").select("id, razon_social").order("razon_social"),
      supabase.from("activos").select("id, nombre, serie").order("nombre"),
      supabase.from("sets_activos").select("id, nombre, serie").order("nombre"),
    ]).then(([{ data: s }, { data: e }, { data: a }, { data: st }]) => {
      const sol = s as Solicitud
      setItem(sol)
      setEmpresas((e as Empresa[]) || [])
      setActivos((a as Activo[]) || [])
      setSets((st as SetActivo[]) || [])
      if (sol) {
        setForm({
          cliente_id: sol.cliente_id || "",
          activo_id: sol.activo_id || "",
          set_activo_id: sol.set_activo_id || "",
          nombre_cliente: sol.nombre_cliente || "",
          nombre_activo: sol.nombre_activo || "",
          serie_activo: sol.serie_activo || "",
          titulo: sol.titulo || "",
          descripcion: sol.descripcion || "",
          tipo: sol.tipo || "soporte",
          prioridad: sol.prioridad || "media",
          cliente_fue_notificado: sol.cliente_fue_notificado || false,
          estado: sol.estado || "abierto",
          fecha_inicio: sol.fecha_inicio || "",
          fecha_resolucion: sol.fecha_resolucion || "",
          comentarios_cliente: sol.comentarios_cliente || "",
          comentario_proveedor: sol.comentario_proveedor || "",
        })
      }
      setLoading(false)
    })
  }, [id])

  const handleChange = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleEmpresaChange = (empId: string) => {
    const emp = empresas.find((e) => e.id === empId)
    setForm((prev) => ({ ...prev, cliente_id: empId, nombre_cliente: emp?.razon_social || "" }))
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
      toast.error("El título es obligatorio")
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
      const { error } = await supabase.from("solicitudes").update(payload).eq("id", id)
      if (error) throw error
      toast.success("Solicitud actualizada")
      router.push(`/dashboard/solicitudes/${id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar esta solicitud?")) return
    const { error } = await supabase.from("solicitudes").delete().eq("id", id)
    if (error) { toast.error(error.message); return }
    toast.success("Solicitud eliminada")
    router.push("/dashboard/solicitudes")
  }

  if (loading) return <div className="h-96 animate-pulse rounded bg-muted" />
  if (!item) return <p className="text-muted-foreground">Solicitud no encontrada</p>

  // Estilos reutilizables para los selects — fondo blanco explícito
  const triggerClass = "bg-white border border-input text-foreground hover:bg-gray-50 focus:ring-2 focus:ring-ring"
  const contentClass = "bg-white border border-input shadow-md z-50"
  const itemClass = "text-foreground hover:bg-gray-100 focus:bg-gray-100 cursor-pointer"

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6 w-[90%] md:max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <button
            className="bg-white text-black py-1.5 px-3 rounded-xl flex items-center cursor-pointer"
            onClick={() => router.push(`/dashboard/solicitudes`)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </button>
          <div className="">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Editar solicitud
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{id}</p>
          </div>
          <button 
           className="bg-red-500 text-white px-3 py-1.5 rounded-xl flex items-center cursor-pointer"
           onClick={handleDelete}>
            <Trash2 className="mr-1 h-4 w-4" />
            Eliminar
          </button>
        </div>

        {/* Sección: Información general */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground">
            Información general
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={(e) => handleChange("titulo", e.target.value)}
                required
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={handleEmpresaChange}>
                <SelectTrigger className={triggerClass}>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent className={contentClass}>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id} className={itemClass}>
                      {e.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Activo (individual)</Label>
              <Select value={form.activo_id} onValueChange={handleActivoChange}>
                <SelectTrigger className={triggerClass}>
                  <SelectValue placeholder="Seleccionar activo..." />
                </SelectTrigger>
                <SelectContent className={contentClass}>
                  {activos.map((a) => (
                    <SelectItem key={a.id} value={a.id} className={itemClass}>
                      {a.nombre} {a.serie ? `(${a.serie})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Set de Activos</Label>
              <Select value={form.set_activo_id} onValueChange={handleSetChange}>
                <SelectTrigger className={triggerClass}>
                  <SelectValue placeholder="Seleccionar set..." />
                </SelectTrigger>
                <SelectContent className={contentClass}>
                  {sets.map((s) => (
                    <SelectItem key={s.id} value={s.id} className={itemClass}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => handleChange("tipo", v)}>
                <SelectTrigger className={triggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={contentClass}>
                  <SelectItem value="soporte" className={itemClass}>Soporte</SelectItem>
                  <SelectItem value="consulta" className={itemClass}>Consulta</SelectItem>
                  <SelectItem value="devolucion" className={itemClass}>Devolución</SelectItem>
                  <SelectItem value="resena" className={itemClass}>Reseña</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={form.prioridad} onValueChange={(v) => handleChange("prioridad", v)}>
                <SelectTrigger className={triggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={contentClass}>
                  <SelectItem value="baja" className={itemClass}>Baja</SelectItem>
                  <SelectItem value="media" className={itemClass}>Media</SelectItem>
                  <SelectItem value="alta" className={itemClass}>Alta</SelectItem>
                  <SelectItem value="critica" className={itemClass}>Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => handleChange("estado", v)}>
                <SelectTrigger className={triggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={contentClass}>
                  <SelectItem value="abierto" className={itemClass}>Abierto</SelectItem>
                  <SelectItem value="en_proceso" className={itemClass}>En proceso</SelectItem>
                  <SelectItem value="resuelto" className={itemClass}>Resuelto</SelectItem>
                  <SelectItem value="cerrado" className={itemClass}>Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Sección: Fechas y notificación */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Fechas y seguimiento
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => handleChange("fecha_inicio", e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Resolución</Label>
              <Input
                type="date"
                value={form.fecha_resolucion}
                onChange={(e) => handleChange("fecha_resolucion", e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="notificado"
                checked={form.cliente_fue_notificado}
                onCheckedChange={(v) => handleChange("cliente_fue_notificado", !!v)}
              />
              <Label htmlFor="notificado" className="cursor-pointer">
                Cliente fue notificado
              </Label>
            </div>
          </div>
        </div>

        {/* Sección: Descripción y comentarios */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Descripción y comentarios
          </h2>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={form.descripcion}
              onChange={(e) => handleChange("descripcion", e.target.value)}
              rows={3}
              className="bg-white resize-none"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Comentarios del cliente</Label>
              <Textarea
                value={form.comentarios_cliente}
                onChange={(e) => handleChange("comentarios_cliente", e.target.value)}
                rows={4}
                className="bg-white resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>Comentario del proveedor</Label>
              <Textarea
                value={form.comentario_proveedor}
                onChange={(e) => handleChange("comentario_proveedor", e.target.value)}
                rows={4}
                className="bg-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 pb-6">
          <button 
          className="bg-green-500 text-white px-3 py-2 rounded-xl flex items-center gap-x-2"
          type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/solicitudes/${id}`)}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  )
}