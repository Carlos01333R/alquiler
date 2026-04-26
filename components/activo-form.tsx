"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Activo, Categoria } from "@/lib/types"
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
import { Upload, X, FileText, Image as ImageIcon, Download, Info } from "lucide-react"
import Image from "next/image"

interface ActivoFormProps {
  activo?: Activo
}

interface ArchivoAdjunto {
  id: string
  nombre: string
  url: string
  path: string
  tipo: string
  tamaño: number
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const isValidDate = (s?: string | null): s is string =>
  !!s && !isNaN(Date.parse(s))

/**
 * Derives estado_certificacion / estado_mantenimiento from a pair of dates.
 *
 * Rules (DAYS_ALERT = 10):
 *  - No valid dates              → "na"
 *  - Only ultima set, no proxima → "vigente"
 *  - today > proxima             → "vencido"
 *  - today === proxima (same day)→ "en_certificacion"
 *  - proxima within DAYS_ALERT   → "proximo_a_vencer"
 *  - otherwise                   → "vigente"
 */
const calcEstadoFromDates = (
  ultima?: string | null,
  proxima?: string | null,
  DAYS_ALERT = 10
): string => {
  const hasUltima = isValidDate(ultima)
  const hasProxima = isValidDate(proxima)

  if (!hasUltima && !hasProxima) return "na"
  if (hasUltima && !hasProxima) return "vigente"

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const proximaDate = new Date(proxima!)
  proximaDate.setHours(0, 0, 0, 0)

  const diffDays = Math.round(
    (proximaDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays < 0) return "vencido"
  if (diffDays === 0) return "en_certificacion"
  if (diffDays <= DAYS_ALERT) return "proximo_a_vencer"
  return "vigente"
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivoForm({ activo }: ActivoFormProps) {
  const router = useRouter()
  const isEdit = !!activo

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  const [form, setForm] = useState({
    nombre: activo?.nombre || "",
    tipo: activo?.tipo || "equipo",
    modelo: activo?.modelo || "",
    serie: activo?.serie || "",
    precio_dia: activo?.precio_dia?.toString() ?? "",
    precio_mes: activo?.precio_mes?.toString() ?? "",
    categoria_id: activo?.categoria_id || "",
    fabricante: activo?.fabricante || "",
    estado_disponibilidad: activo?.estado_disponibilidad || "disponible",
    estado_certificacion: activo?.estado_certificacion || "na",
    estado_mantenimiento: activo?.estado_mantenimiento || "na",
    stock: activo?.stock ?? 1,
    ubicacion: activo?.ubicacion || "",
    responsable: activo?.responsable || "",
    descripcion: activo?.descripcion || "",
    accesorios_incluidos: activo?.accesorios_incluidos || "",
    fecha_ultima_certificacion: activo?.fecha_ultima_certificacion || "",
    fecha_proxima_certificacion: activo?.fecha_proxima_certificacion || "",
    fecha_ultimo_mantenimiento: activo?.fecha_ultimo_mantenimiento || "",
    fecha_proximo_mantenimiento: activo?.fecha_proximo_mantenimiento || "",
  })

  // Track manual overrides so auto-calc doesn't stomp user edits
  const [estadoOverrides, setEstadoOverrides] = useState({
    estado_certificacion: false,
    estado_mantenimiento: false,
  })
  const [precioMesOverride, setPrecioMesOverride] = useState(false)

  const [imagen, setImagen] = useState<{
    file: File | null
    preview: string | null
    path: string | null
  }>({
    file: null,
    preview: activo?.imagen_url || null,
    path: activo?.imagen_url || null,
  })

  const [documentos, setDocumentos] = useState<ArchivoAdjunto[]>(
    activo?.documentos_adjuntos || [] as any
  )

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const imagenInputRef = useRef<HTMLInputElement>(null)
  const documentosInputRef = useRef<HTMLInputElement>(null)

  // ─── Load categories ───────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from("categorias")
      .select("*")
      .order("nombre")
      .then(({ data }) => setCategorias((data as Categoria[]) || []))
  }, [])

  // ─── Generate series on create ─────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit && categorias.length > 0) {
      const serie = generateSerie(form.tipo)
      setForm((prev) => {
        const extra: Partial<typeof prev> = {}
        if (prev.tipo === "herramienta" && !prev.categoria_id) {
          const categoriaNa = findCategoriaNa(categorias)
          if (categoriaNa) extra.categoria_id = categoriaNa.id
        }
        return { ...prev, serie, ...extra }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorias])

  // ─── Auto-suggest precio_mes = precio_dia × 30 × 0.90 ─────────────────────
  useEffect(() => {
    if (precioMesOverride) return
    const dia = parseFloat(form.precio_dia)
    if (!isNaN(dia) && dia > 0) {
      setForm((prev) => ({ ...prev, precio_mes: Math.round(dia * 30 * 0.9).toString() }))
    } else {
      setForm((prev) => ({ ...prev, precio_mes: "" }))
    }
  }, [form.precio_dia, precioMesOverride])

  // ─── Auto-calc estado_certificacion from dates ─────────────────────────────
  useEffect(() => {
    if (estadoOverrides.estado_certificacion) return
    const estado = calcEstadoFromDates(
      form.fecha_ultima_certificacion,
      form.fecha_proxima_certificacion
    )
    setForm((prev : any) => ({ ...prev, estado_certificacion: estado }))
  }, [
    form.fecha_ultima_certificacion,
    form.fecha_proxima_certificacion,
    estadoOverrides.estado_certificacion,
  ])

  // ─── Auto-calc estado_mantenimiento from dates ─────────────────────────────
  useEffect(() => {
    if (estadoOverrides.estado_mantenimiento) return
    const estado = calcEstadoFromDates(
      form.fecha_ultimo_mantenimiento,
      form.fecha_proximo_mantenimiento
    )
    setForm((prev : any) => ({ ...prev, estado_mantenimiento: estado }))
  }, [
    form.fecha_ultimo_mantenimiento,
    form.fecha_proximo_mantenimiento,
    estadoOverrides.estado_mantenimiento,
  ])

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const findCategoriaNa = (lista: Categoria[]) =>
    lista.find((c) => c.nombre.trim().toLowerCase() === "n/a")

  const generateSerie = (tipo: string): string => {
    const prefix = tipo === "equipo" ? "EQU" : "HER"
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const random = Array.from(crypto.getRandomValues(new Uint8Array(9)))
      .map((b) => chars[b % chars.length])
      .join("")
    return `${prefix}${random}`
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleChange = (key: string, value: string | number) => {
    if (key === "tipo") {
      const serie = generateSerie(value as string)
      const isHerramienta = value === "herramienta"
      const categoriaNa = findCategoriaNa(categorias)
      setForm((prev: any) => ({
        ...prev,
        tipo: value as string,
        serie,
        ...(isHerramienta && categoriaNa ? { categoria_id: categoriaNa.id } : {}),
        ...(value === "equipo" ? { categoria_id: "" } : {}),
      }))
    } else {
      setForm((prev) => ({ ...prev, [key]: value }))
    }
  }

  const handleCategoryChange = (value: string) => {
    if (value === "crear_nueva") {
      setShowNewCategory(true)
      setForm((prev) => ({ ...prev, categoria_id: "" }))
    } else {
      setShowNewCategory(false)
      setForm((prev) => ({ ...prev, categoria_id: value }))
    }
  }

  const createNewCategory = async (): Promise<string | null> => {
    if (!newCategoryName.trim()) {
      toast.error("El nombre de la categoría es obligatorio")
      return null
    }
    try {
      const { data, error } = await supabase
        .from("categorias")
        .insert({ nombre: newCategoryName.trim(), tipo: "otro", descripcion: null })
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          toast.error("Ya existe una categoría con ese nombre")
        } else {
          throw error
        }
        return null
      }

      toast.success("Categoría creada exitosamente")
      setCategorias((prev) => [...prev, data as Categoria])
      setNewCategoryName("")
      setShowNewCategory(false)
      return data.id
    } catch (error: any) {
      toast.error(error.message || "Error al crear la categoría")
      return null
    }
  }

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes"); return }
    if (file.size > 5 * 1024 * 1024) { toast.error("La imagen no debe superar los 5MB"); return }
    setImagen({ file, preview: URL.createObjectURL(file), path: null })
  }

  const handleDocumentosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const nuevos: ArchivoAdjunto[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} supera los 10MB`); continue }
      nuevos.push({ id: crypto.randomUUID(), nombre: file.name, url: URL.createObjectURL(file), path: "", tipo: file.type, tamaño: file.size })
    }
    setDocumentos((prev) => [...prev, ...nuevos])
  }

  const removeImagen = () => {
    if (imagen.preview && !imagen.path) URL.revokeObjectURL(imagen.preview)
    setImagen({ file: null, preview: null, path: null })
    if (imagenInputRef.current) imagenInputRef.current.value = ""
  }

  const removeDocumento = (id: string) => {
    setDocumentos((prev) => {
      const doc = prev.find((d) => d.id === id)
      if (doc?.url && !doc.path) URL.revokeObjectURL(doc.url)
      return prev.filter((d) => d.id !== id)
    })
  }

  const downloadDocumento = async (doc: ArchivoAdjunto) => {
    try {
      const blob = await (await fetch(doc.url)).blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = doc.nombre
      document.body.appendChild(a); a.click()
      window.URL.revokeObjectURL(url); document.body.removeChild(a)
    } catch { toast.error("Error al descargar el archivo") }
  }

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { error } = await supabase.storage.from("activos").upload(path, file, { cacheControl: "3600", upsert: true })
    if (error) return null
    return supabase.storage.from("activos").getPublicUrl(path).data.publicUrl
  }

  const uploadFiles = async (activoId: string) => {
    setUploading(true)
    try {
      let imagenUrl = activo?.imagen_url || null
      if (imagen.file) {
        const ext = imagen.file.name.split(".").pop()
        const url = await uploadFile(imagen.file, `imagenes/${activoId}-${Date.now()}.${ext}`)
        if (url) imagenUrl = url
        else toast.error("Error al subir la imagen")
      }

      const documentosAdjuntos = [...documentos]
      for (const doc of documentos) {
        if (!doc.path && doc.url.startsWith("blob:")) {
          const blob = await (await fetch(doc.url)).blob()
          const file = new File([blob], doc.nombre, { type: doc.tipo })
          const url = await uploadFile(file, `documentos/${activoId}/${Date.now()}-${doc.nombre}`)
          if (url) { doc.path = url; doc.url = url }
          else toast.error(`Error al subir ${doc.nombre}`)
        }
      }
      return { imagenUrl, documentosAdjuntos }
    } catch {
      toast.error("Error al subir archivos")
      return { imagenUrl: activo?.imagen_url || null, documentosAdjuntos: [] }
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre) { toast.error("El nombre es obligatorio"); return }

    const precioDia = parseFloat(form.precio_dia)
    const precioMes = parseFloat(form.precio_mes)
    if (!form.precio_dia || isNaN(precioDia) || precioDia <= 0) {
      toast.error("El precio por día es obligatorio y debe ser mayor a 0"); return
    }
    if (!form.precio_mes || isNaN(precioMes) || precioMes <= 0) {
      toast.error("El precio por mes es obligatorio y debe ser mayor a 0"); return
    }

    let latitude = null, longitude = null
    if (form.ubicacion) {
      const geoRes = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: form.ubicacion }),
      })
      const geoData = await geoRes.json()
      if (geoRes.ok) { latitude = geoData.latitude; longitude = geoData.longitude }
      else { toast.error("No se pudo obtener coordenadas"); return }
    }

    setSaving(true)
    try {
      let categoriaId = form.categoria_id
      if (showNewCategory) {
        const newCatId = await createNewCategory()
        if (!newCatId) { setSaving(false); return }
        categoriaId = newCatId
      }

      const commonPayload = {
        ...form,
        categoria_id: categoriaId || null,
        latitude,
        longitude,
        fecha_ultima_certificacion: form.fecha_ultima_certificacion || null,
        fecha_proxima_certificacion: form.fecha_proxima_certificacion || null,
        fecha_ultimo_mantenimiento: form.fecha_ultimo_mantenimiento || null,
        fecha_proximo_mantenimiento: form.fecha_proximo_mantenimiento || null,
        precio_dia: Math.round(Number(form.precio_dia)),
        precio_mes: Math.round(Number(form.precio_mes)),
      }

      if (isEdit) {
        const { imagenUrl, documentosAdjuntos } = await uploadFiles(activo.id)
        const { error } = await supabase
          .from("activos")
          .update({ ...commonPayload, imagen_url: imagenUrl, documentos_adjuntos: documentosAdjuntos })
          .eq("id", activo.id)
        if (error) throw error
        toast.success("Activo actualizado")
        router.push(`/dashboard/activos/${activo.id}`)
      } else {
        const { data: nuevoActivo, error: createError } = await supabase
          .from("activos")
          .insert({ ...commonPayload, imagen_url: null, documentos_adjuntos: [] })
          .select()
          .single()
        if (createError) throw createError

        const { imagenUrl, documentosAdjuntos } = await uploadFiles(nuevoActivo.id)
        const { error: updateError } = await supabase
          .from("activos")
          .update({ imagen_url: imagenUrl, documentos_adjuntos: documentosAdjuntos })
          .eq("id", nuevoActivo.id)
        if (updateError) throw updateError
        toast.success("Activo creado")
        router.push("/dashboard/activos")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Editar Activo" : "Nuevo Activo"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* ── Archivos ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Imagen */}
            <div className="space-y-2">
              <Label>Imagen del activo</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {imagen.preview ? (
                  <div className="space-y-2">
                    <div className="relative w-full h-48 mx-auto">
                      <Image src={imagen.preview} alt="Imagen preview" fill className="object-contain rounded" />
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button type="button" variant="outline" size="sm" onClick={() => imagenInputRef.current?.click()} disabled={uploading}>Cambiar</Button>
                      <Button type="button" variant="outline" size="sm" onClick={removeImagen} disabled={uploading}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-full h-48 mx-auto flex items-center justify-center bg-gray-100 rounded">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => imagenInputRef.current?.click()} disabled={uploading}>
                      <Upload className="w-4 h-4 mr-2" />Subir imagen
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">Formatos: JPG, PNG, GIF. Máximo 5MB</p>
              <Input ref={imagenInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagenChange} />
            </div>

            {/* Documentos */}
            <div className="space-y-2">
              <Label>Documentos adjuntos</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <div className="text-center mb-3">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <Button type="button" variant="outline" size="sm" onClick={() => documentosInputRef.current?.click()} disabled={uploading}>
                    <Upload className="w-4 h-4 mr-2" />Agregar documentos
                  </Button>
                </div>
                {documentos.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {documentos.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{doc.nombre}</p>
                            <p className="text-xs text-gray-500">{(doc.tamaño / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {doc.path && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => downloadDocumento(doc)} className="p-1 h-auto">
                              <Download className="w-4 h-4 text-blue-500" />
                            </Button>
                          )}
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeDocumento(doc.id)} className="p-1 h-auto">
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">PDF, Word, Excel, Imágenes. Máximo 10MB por archivo</p>
              <Input ref={documentosInputRef} type="file" multiple className="hidden" onChange={handleDocumentosChange} />
            </div>
          </div>

          {/* ── Campos principales ──────────────────────────────────────────── */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => handleChange("nombre", e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => handleChange("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipo">Equipo</SelectItem>
                  <SelectItem value="herramienta">Herramienta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={showNewCategory ? "crear_nueva" : form.categoria_id} onValueChange={handleCategoryChange}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                  <SelectItem value="crear_nueva" className="text-blue-600 font-medium">+ Crear nueva categoría</SelectItem>
                </SelectContent>
              </Select>
              {showNewCategory && (
                <div className="mt-3 p-3 border-2 border-blue-200 rounded-lg bg-blue-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-blue-900 font-semibold text-sm">Nueva Categoría</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setShowNewCategory(false); setNewCategoryName("") }} className="h-6 w-6 p-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nombre de la categoría" className="bg-white" />
                  <p className="text-xs text-blue-700">La categoría se creará automáticamente al guardar</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={form.modelo} onChange={(e) => handleChange("modelo", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Serie <span className="text-xs text-gray-400 font-normal">(generada automáticamente, editable)</span></Label>
              <Input value={form.serie} onChange={(e) => handleChange("serie", e.target.value)} className="font-mono" />
            </div>

            <div className="space-y-2">
              <Label>Fabricante</Label>
              <Input value={form.fabricante} onChange={(e) => handleChange("fabricante", e.target.value)} />
            </div>

            {/* ── Precios ──────────────────────────────────────────────────── */}
            <div className="space-y-2">
              <Label>Precio por Día *</Label>
              <Input
                type="number" min={0} step="0.01" placeholder="0.00"
                value={form.precio_dia}
                onChange={(e) => handleChange("precio_dia", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label>Precio por Mes *</Label>
                {!precioMesOverride && form.precio_dia && parseFloat(form.precio_dia) > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                    <Info className="w-3 h-3" />
                    Sugerido (−10%)
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type="number" min={0} step="0.01" placeholder="0.00"
                  value={form.precio_mes}
                  onChange={(e) => {
                    setPrecioMesOverride(true)
                    handleChange("precio_mes", e.target.value)
                  }}
                />
                {precioMesOverride && (
                  <button
                    type="button"
                    onClick={() => setPrecioMesOverride(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-500 hover:underline whitespace-nowrap"
                  >
                    Restaurar sugerido
                  </button>
                )}
              </div>
              {!precioMesOverride && form.precio_dia && parseFloat(form.precio_dia) > 0 && (
                <p className="text-xs text-gray-400">Calculado como precio/día × 30 días con 10% de descuento</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Disponibilidad</Label>
              <Select value={form.estado_disponibilidad} onValueChange={(v) => handleChange("estado_disponibilidad", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="alquilado">Alquilado</SelectItem>
                  <SelectItem value="en_mantenimiento">En mantenimiento</SelectItem>
                  <SelectItem value="reservado">Reservado</SelectItem>
                  <SelectItem value="en_set">En set</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── Estado Certificación (auto) ───────────────────────────────── */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Label>Estado Certificación</Label>
                  {!estadoOverrides.estado_certificacion &&
                    (form.fecha_ultima_certificacion || form.fecha_proxima_certificacion) && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                        <Info className="w-3 h-3" />Auto
                      </span>
                    )}
                </div>
                {estadoOverrides.estado_certificacion && (
                  <button
                    type="button"
                    onClick={() => setEstadoOverrides((prev) => ({ ...prev, estado_certificacion: false }))}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Restaurar auto
                  </button>
                )}
              </div>
              <Select
                value={form.estado_certificacion}
                onValueChange={(v) => {
                  setEstadoOverrides((prev) => ({ ...prev, estado_certificacion: true }))
                  handleChange("estado_certificacion", v)
                }}
              >
                <SelectTrigger className={estadoOverrides.estado_certificacion ? "border-amber-400" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="en_certificacion">En certificación</SelectItem>
                  <SelectItem value="proximo_a_vencer">Próximo a vencer</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="na">N/A</SelectItem>
                </SelectContent>
              </Select>
              {!estadoOverrides.estado_certificacion &&
                (form.fecha_ultima_certificacion || form.fecha_proxima_certificacion) && (
                  <p className="text-xs text-gray-400">Calculado automáticamente desde las fechas de certificación</p>
                )}
            </div>

            {/* ── Estado Mantenimiento (auto) ───────────────────────────────── */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Label>Estado Mantenimiento</Label>
                  {!estadoOverrides.estado_mantenimiento &&
                    (form.fecha_ultimo_mantenimiento || form.fecha_proximo_mantenimiento) && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                        <Info className="w-3 h-3" />Auto
                      </span>
                    )}
                </div>
                {estadoOverrides.estado_mantenimiento && (
                  <button
                    type="button"
                    onClick={() => setEstadoOverrides((prev) => ({ ...prev, estado_mantenimiento: false }))}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Restaurar auto
                  </button>
                )}
              </div>
              <Select
                value={form.estado_mantenimiento}
                onValueChange={(v) => {
                  setEstadoOverrides((prev) => ({ ...prev, estado_mantenimiento: true }))
                  handleChange("estado_mantenimiento", v)
                }}
              >
                <SelectTrigger className={estadoOverrides.estado_mantenimiento ? "border-amber-400" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="en_mantenimiento">En mantenimiento</SelectItem>
                  <SelectItem value="proximo_a_vencer">Próximo a vencer</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="na">N/A</SelectItem>
                </SelectContent>
              </Select>
              {!estadoOverrides.estado_mantenimiento &&
                (form.fecha_ultimo_mantenimiento || form.fecha_proximo_mantenimiento) && (
                  <p className="text-xs text-gray-400">Calculado automáticamente desde las fechas de mantenimiento</p>
                )}
            </div>

            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Input value={form.ubicacion} onChange={(e) => handleChange("ubicacion", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Responsable</Label>
              <Input value={form.responsable} onChange={(e) => handleChange("responsable", e.target.value)} />
            </div>
          </div>

          {/* ── Fechas ──────────────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha Última Certificación</Label>
              <Input type="date" value={form.fecha_ultima_certificacion} onChange={(e) => handleChange("fecha_ultima_certificacion", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha Próxima Certificación</Label>
              <Input type="date" value={form.fecha_proxima_certificacion} onChange={(e) => handleChange("fecha_proxima_certificacion", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha Último Mantenimiento</Label>
              <Input type="date" value={form.fecha_ultimo_mantenimiento} onChange={(e) => handleChange("fecha_ultimo_mantenimiento", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha Próximo Mantenimiento</Label>
              <Input type="date" value={form.fecha_proximo_mantenimiento} onChange={(e) => handleChange("fecha_proximo_mantenimiento", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={form.descripcion} onChange={(e) => handleChange("descripcion", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Accesorios Incluidos</Label>
            <Textarea value={form.accesorios_incluidos} onChange={(e) => handleChange("accesorios_incluidos", e.target.value)} />
          </div>

          {/* ── Botones ─────────────────────────────────────────────────────── */}
          <div className="flex gap-3 justify-end">
            <button
              className="bg-[#009966] text-white flex items-center gap-x-2 px-3 py-1.5 cursor-pointer rounded-lg disabled:opacity-60"
              type="submit"
              disabled={saving || uploading}
            >
              {saving || uploading ? "Guardando..." : isEdit ? "Actualizar" : "Crear Activo"}
            </button>
            <button
              type="button"
              className="bg-red-500 text-white flex items-center gap-x-2 px-3 py-1.5 cursor-pointer rounded-lg disabled:opacity-60"
              onClick={() => router.back()}
              disabled={saving || uploading}
            >
              Cancelar
            </button>
          </div>

        </CardContent>
      </Card>
    </form>
  )
}