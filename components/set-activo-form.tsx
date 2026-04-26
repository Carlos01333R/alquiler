"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { SetActivo, Categoria, Activo } from "@/lib/types"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Upload, X, FileText, Image as ImageIcon, Download, Plus, Trash2,
  Package, Search, Loader2, CheckCircle2, Info,
} from "lucide-react"
import Image from "next/image"

interface SetActivoFormProps {
  set?: SetActivo
}

interface ArchivoAdjunto {
  id: string
  nombre: string
  url: string
  path: string
  tipo: string
  tamaño: number
}

interface ComponenteActivo {
  id: string
  activo_id: string
  nombre: string
  cantidad: number
  serie?: string
  modelo?: string
  fabricante?: string
  descripcion?: string
  imagen_url?: string
  tipo?: string
  estado_disponibilidad?: string
  estado_certificacion?: string
  estado_mantenimiento?: string
  categoria_id?: string
  ubicacion?: string
  responsable?: string
  accesorios_incluidos?: string
  stock?: number
  condicion?: string
  documentos_adjuntos?: any[]
  // Certification & maintenance dates from the source asset
  fecha_ultima_certificacion?: string | null
  fecha_proxima_certificacion?: string | null
  fecha_ultimo_mantenimiento?: string | null
  fecha_proximo_mantenimiento?: string | null
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Returns true if `s` is a non-empty, valid date string.
 */
const isValidDate = (s?: string | null): s is string =>
  !!s && !isNaN(Date.parse(s))

/**
 * Given a list of date strings (possibly null/undefined), returns:
 * - The **earliest** valid date (as "YYYY-MM-DD") or null if none exist.
 */
const earliestDate = (dates: (string | null | undefined)[]): string | null => {
  const valid = dates.filter(isValidDate).map((d) => new Date(d).getTime())
  if (valid.length === 0) return null
  return new Date(Math.min(...valid)).toISOString().split("T")[0]
}

/**
 * Given a list of date strings, returns the **latest** valid date or null.
 */
const latestDate = (dates: (string | null | undefined)[]): string | null => {
  const valid = dates.filter(isValidDate).map((d) => new Date(d).getTime())
  if (valid.length === 0) return null
  return new Date(Math.max(...valid)).toISOString().split("T")[0]
}

/**
 * Derives the estado (certificación or mantenimiento) from a pair of dates.
 *
 * Rules:
 *  - No valid dates at all           → "na"
 *  - today > fecha_proxima           → "vencido"
 *  - today === fecha_proxima (same day) → "en_certificacion" / "en_mantenimiento"
 *  - today < fecha_proxima AND within DAYS_ALERT days → "proximo_a_vencer"
 *  - today is between ultima and proxima (normal range) → "vigente"
 *  - Only ultima is set (no proxima)  → "vigente"
 *
 * @param ultima   Last certification/maintenance date (YYYY-MM-DD)
 * @param proxima  Next certification/maintenance date (YYYY-MM-DD)
 * @param DAYS_ALERT Number of days before expiry to show "proximo_a_vencer" (default 30)
 */
const calcEstadoFromDates = (
  ultima?: string | null,
  proxima?: string | null,
  DAYS_ALERT = 10
): string => {
  const hasUltima = isValidDate(ultima)
  const hasProxima = isValidDate(proxima)

  // Neither date set → N/A
  if (!hasUltima && !hasProxima) return "na"

  // If only ultima is set, consider vigente (we know the last event but not the next)
  if (hasUltima && !hasProxima) return "vigente"

  // proxima is set — compare against today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const proximaDate = new Date(proxima!)
  proximaDate.setHours(0, 0, 0, 0)

  const diffMs = proximaDate.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return "vencido"
  if (diffDays === 0) return "en_certificacion"
  if (diffDays <= DAYS_ALERT) return "proximo_a_vencer"
  return "vigente"
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SetActivoForm({ set }: SetActivoFormProps) {
  const router = useRouter()
  const isEdit = !!set

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [form, setForm] = useState({
    nombre: set?.nombre || "",
    tipo: set?.tipo || "kit_equipos",
    modelo: set?.modelo || "",
    serie: set?.serie || "",
    precio_dia: set?.precio_dia?.toString() ?? "",
    precio_mes: set?.precio_mes?.toString() ?? "",
    categoria_id: set?.categoria_id || "",
    fabricante: set?.fabricante || "",
    estado_disponibilidad: set?.estado_disponibilidad || "disponible",
    estado_certificacion: set?.estado_certificacion || "na",
    estado_mantenimiento: set?.estado_mantenimiento || "na",
    stock: set?.stock ?? 1,
    ubicacion: set?.ubicacion || "",
    responsable: set?.responsable || "",
    descripcion: set?.descripcion || "",
    accesorios_incluidos: set?.accesorios_incluidos || "",
    fecha_ultima_certificacion: set?.fecha_ultima_certificacion || "",
    fecha_proxima_certificacion: set?.fecha_proxima_certificacion || "",
    fecha_ultimo_mantenimiento: set?.fecha_ultimo_mantenimiento || "",
    fecha_proximo_mantenimiento: set?.fecha_proximo_mantenimiento || "",
  })

  // Track whether the user has manually overridden the auto-computed dates
  const [dateOverrides, setDateOverrides] = useState({
    fecha_ultima_certificacion: false,
    fecha_proxima_certificacion: false,
    fecha_ultimo_mantenimiento: false,
    fecha_proximo_mantenimiento: false,
  })

  // Track whether the user manually overrode the suggested monthly price
  const [precioMesOverride, setPrecioMesOverride] = useState(false)

  // Track whether the user has manually overridden the auto-computed estados
  const [estadoOverrides, setEstadoOverrides] = useState({
    estado_certificacion: false,
    estado_mantenimiento: false,
  })

  const [imagen, setImagen] = useState<{
    file: File | null
    preview: string | null
    path: string | null
  }>({
    file: null,
    preview: set?.imagen_url || null,
    path: set?.imagen_url || null,
  })

  const [documentos, setDocumentos] = useState<ArchivoAdjunto[]>(
    set?.documentos_adjuntos || [] as any
  )

  const [componentes, setComponentes] = useState<ComponenteActivo[]>(
    set?.componentes || [] as any
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [activosDisponibles, setActivosDisponibles] = useState<Activo[]>([])
  const [loadingActivos, setLoadingActivos] = useState(false)
  const [busquedaActivo, setBusquedaActivo] = useState("")
  // Multi-select: store a Set of selected activo IDs
  const [activosSeleccionados, setActivosSeleccionados] = useState<Set<string>>(new Set())

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const imagenInputRef = useRef<HTMLInputElement>(null)
  const documentosInputRef = useRef<HTMLInputElement>(null)

  // ─── Auto-compute dates from componentes ────────────────────────────────────

  /**
   * Recalculates the four date fields from the current componentes list,
   * unless the user has manually overridden them.
   */
  const recalcDatesFromComponentes = useCallback(
    (updatedComponentes: ComponenteActivo[]) => {
      const ultCerts = updatedComponentes.map((c) => c.fecha_ultima_certificacion)
      const proxCerts = updatedComponentes.map((c) => c.fecha_proxima_certificacion)
      const ultMants = updatedComponentes.map((c) => c.fecha_ultimo_mantenimiento)
      const proxMants = updatedComponentes.map((c) => c.fecha_proximo_mantenimiento)

      setForm((prev) => ({
        ...prev,
        // Última certificación = la más próxima (earliest) entre los activos
        ...(!dateOverrides.fecha_ultima_certificacion && {
          fecha_ultima_certificacion: earliestDate(ultCerts) ?? "",
        }),
        // Próxima certificación = la más lejana (latest) entre los activos
        ...(!dateOverrides.fecha_proxima_certificacion && {
          fecha_proxima_certificacion: latestDate(proxCerts) ?? "",
        }),
        // Último mantenimiento = más próximo (earliest)
        ...(!dateOverrides.fecha_ultimo_mantenimiento && {
          fecha_ultimo_mantenimiento: earliestDate(ultMants) ?? "",
        }),
        // Próximo mantenimiento = más lejano (latest)
        ...(!dateOverrides.fecha_proximo_mantenimiento && {
          fecha_proximo_mantenimiento: latestDate(proxMants) ?? "",
        }),
      }))
    },
    [dateOverrides]
  )

  // Re-run whenever componentes or overrides change
  useEffect(() => {
    recalcDatesFromComponentes(componentes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentes, dateOverrides])

  // ─── Auto-suggest precio_mes = precio_dia * 30 * 0.90 ──────────────────────

  useEffect(() => {
    if (precioMesOverride) return
    const dia = parseFloat(form.precio_dia)
    if (!isNaN(dia) && dia > 0) {
      const suggested = Math.round(dia * 30 * 0.9)
      setForm((prev) => ({ ...prev, precio_mes: suggested.toString() }))
    } else {
      setForm((prev) => ({ ...prev, precio_mes: "" }))
    }
  }, [form.precio_dia, precioMesOverride])

  // ─── Auto-calc estado_certificacion & estado_mantenimiento from dates ────────

  useEffect(() => {
    if (!estadoOverrides.estado_certificacion) {
      const estado = calcEstadoFromDates(
        form.fecha_ultima_certificacion,
        form.fecha_proxima_certificacion
      )
      setForm((prev : any) => ({ ...prev, estado_certificacion: estado }))
    }
  }, [form.fecha_ultima_certificacion, form.fecha_proxima_certificacion, estadoOverrides.estado_certificacion])

  useEffect(() => {
    if (!estadoOverrides.estado_mantenimiento) {
      const estado = calcEstadoFromDates(
        form.fecha_ultimo_mantenimiento,
        form.fecha_proximo_mantenimiento
      )
      setForm((prev: any) => ({ ...prev, estado_mantenimiento: estado }))
    }
  }, [form.fecha_ultimo_mantenimiento, form.fecha_proximo_mantenimiento, estadoOverrides.estado_mantenimiento])

  // ─── Load categories ─────────────────────────────────────────────────────────

  useEffect(() => {
    supabase
      .from("categorias")
      .select("*")
      .order("nombre")
      .then(({ data }) => setCategorias((data as Categoria[]) || []))
  }, [])

  // ─── Generate series on create ───────────────────────────────────────────────

  useEffect(() => {
    if (!isEdit) {
      const serie = generateSerie(form.tipo)
      setForm((prev) => ({ ...prev, serie }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Load available assets when dialog opens ─────────────────────────────────

  useEffect(() => {
    if (dialogOpen) {
      loadActivosDisponibles()
    } else {
      setBusquedaActivo("")
      setActivosSeleccionados(new Set())
    }
  }, [dialogOpen])

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const generateSerie = (tipo: string): string => {
    const prefix = tipo === "kit_equipos" ? "KIT" : "MAL"
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const random = Array.from(crypto.getRandomValues(new Uint8Array(9)))
      .map((b) => chars[b % chars.length])
      .join("")
    return `${prefix}${random}`
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  const handleChange = (key: string, value: string | number) => {
    if (key === "tipo") {
      const serie = generateSerie(value as string)
      setForm((prev: any) => ({ ...prev, tipo: value as string, serie }))
    } else {
      setForm((prev) => ({ ...prev, [key]: value }))
    }
  }

  /**
   * Handle manual edits to date fields — marks them as overridden so
   * auto-calculation won't overwrite the user's value.
   */
  const handleDateChange = (key: keyof typeof dateOverrides, value: string) => {
    setDateOverrides((prev) => ({ ...prev, [key]: true }))
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /**
   * Reset a date field back to auto-calculation mode.
   */
  const resetDateOverride = (key: keyof typeof dateOverrides) => {
    setDateOverrides((prev) => ({ ...prev, [key]: false }))
    // Immediately trigger recalc by bumping the componentes reference
    recalcDatesFromComponentes(componentes)
  }

  const loadActivosDisponibles = async () => {
    setLoadingActivos(true)
    try {
      const { data, error } = await supabase
        .from("activos")
        .select("*")
        .eq("estado_disponibilidad", "disponible")
        .order("nombre")
      if (error) throw error
      setActivosDisponibles((data as Activo[]) || [])
    } catch {
      toast.error("Error al cargar activos disponibles")
    } finally {
      setLoadingActivos(false)
    }
  }

  const activosFiltrados = activosDisponibles.filter((activo) => {
    const yaAgregado = componentes.some((c) => c.activo_id === activo.id)
    const coincideBusqueda =
      !busquedaActivo ||
      activo.nombre.toLowerCase().includes(busquedaActivo.toLowerCase()) ||
      activo.modelo?.toLowerCase().includes(busquedaActivo.toLowerCase()) ||
      activo.serie?.toLowerCase().includes(busquedaActivo.toLowerCase()) ||
      activo.fabricante?.toLowerCase().includes(busquedaActivo.toLowerCase())
    return !yaAgregado && coincideBusqueda
  })

  const toggleActivoSeleccion = (activo: Activo) => {
    setActivosSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(activo.id)) {
        next.delete(activo.id)
      } else {
        next.add(activo.id)
      }
      return next
    })
  }

  const handleImagenChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 5MB")
      return
    }
    const preview = URL.createObjectURL(file)
    setImagen({ file, preview, path: null })
  }

  const handleDocumentosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const nuevosDocumentos: ArchivoAdjunto[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} supera los 10MB`)
        continue
      }
      nuevosDocumentos.push({
        id: crypto.randomUUID(),
        nombre: file.name,
        url: URL.createObjectURL(file),
        path: "",
        tipo: file.type,
        tamaño: file.size,
      })
    }
    setDocumentos((prev) => [...prev, ...nuevosDocumentos])
  }

  const removeImagen = () => {
    if (imagen.preview && !imagen.path) URL.revokeObjectURL(imagen.preview)
    setImagen({ file: null, preview: null, path: null })
    if (imagenInputRef.current) imagenInputRef.current.value = ""
  }

  const removeDocumento = (id: string) => {
    setDocumentos((prev) => {
      const documento = prev.find((d) => d.id === id)
      if (documento?.url && !documento.path) URL.revokeObjectURL(documento.url)
      return prev.filter((d) => d.id !== id)
    })
  }

  const downloadDocumento = async (doc: ArchivoAdjunto) => {
    try {
      const response = await fetch(doc.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = doc.nombre
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      toast.error("Error al descargar el archivo")
    }
  }

  /**
   * Adds ALL selected activos as components in one operation.
   */
  const addComponentes = () => {
    if (activosSeleccionados.size === 0) {
      toast.error("Debes seleccionar al menos un activo")
      return
    }

    const nuevos: ComponenteActivo[] = activosDisponibles
      .filter((a) => activosSeleccionados.has(a.id))
      .map((activo) => ({
        id: crypto.randomUUID(),
        activo_id: activo.id,
        nombre: activo.nombre,
        cantidad: 1,
        serie: activo.serie ?? undefined,
        modelo: activo.modelo ?? undefined,
        fabricante: activo.fabricante ?? undefined,
        descripcion: activo.descripcion ?? undefined,
        imagen_url: activo.imagen_url ?? undefined,
        tipo: activo.tipo,
        estado_disponibilidad: activo.estado_disponibilidad,
        estado_certificacion: activo.estado_certificacion,
        estado_mantenimiento: activo.estado_mantenimiento,
        categoria_id: activo.categoria_id ?? undefined,
        ubicacion: activo.ubicacion ?? undefined,
        responsable: activo.responsable ?? undefined,
        accesorios_incluidos: activo.accesorios_incluidos ?? undefined,
        stock: activo.stock,
        condicion: activo.condicion ?? undefined,
        documentos_adjuntos: activo.documentos_adjuntos ?? [],
        fecha_ultima_certificacion: (activo as any).fecha_ultima_certificacion ?? null,
        fecha_proxima_certificacion: (activo as any).fecha_proxima_certificacion ?? null,
        fecha_ultimo_mantenimiento: (activo as any).fecha_ultimo_mantenimiento ?? null,
        fecha_proximo_mantenimiento: (activo as any).fecha_proximo_mantenimiento ?? null,
      }))

    const updated = [...componentes, ...nuevos]
    setComponentes(updated)
    setDialogOpen(false)
    toast.success(
      nuevos.length === 1
        ? `"${nuevos[0].nombre}" agregado al set`
        : `${nuevos.length} activos agregados al set`
    )
  }

  const removeComponente = (id: string) => {
    setComponentes((prev) => prev.filter((c) => c.id !== id))
    toast.success("Activo eliminado del set")
  }

  const updateCantidad = (id: string, nuevaCantidad: number) => {
    setComponentes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, cantidad: Math.max(1, nuevaCantidad) } : c))
    )
  }

  const uploadFiles = async (setId: string) => {
    setUploading(true)
    try {
      let imagenUrl = set?.imagen_url || null

      if (imagen.file) {
        const extension = imagen.file.name.split(".").pop()
        const fileName = `imagenes/${setId}-${Date.now()}.${extension}`
        const { error: imgError } = await supabase.storage
          .from("sets-activos")
          .upload(fileName, imagen.file, { cacheControl: "3600", upsert: true })

        if (imgError) {
          toast.error("Error al subir la imagen del set")
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("sets-activos").getPublicUrl(fileName)
          imagenUrl = publicUrl
        }
      }

      const documentosAdjuntos = []
      for (const doc of documentos) {
        if (!doc.path && doc.url.startsWith("blob:")) {
          const response = await fetch(doc.url)
          const blob = await response.blob()
          const file = new File([blob], doc.nombre, { type: doc.tipo })
          const fileName = `documentos/${setId}/${Date.now()}-${doc.nombre}`
          const { error: docError } = await supabase.storage
            .from("sets-activos")
            .upload(fileName, file, { cacheControl: "3600", upsert: true })

          if (docError) {
            toast.error(`Error al subir ${doc.nombre}`)
          } else {
            const {
              data: { publicUrl },
            } = supabase.storage.from("sets-activos").getPublicUrl(fileName)
            documentosAdjuntos.push({ ...doc, path: fileName, url: publicUrl })
          }
        } else {
          documentosAdjuntos.push(doc)
        }
      }

      return { imagenUrl, documentosAdjuntos, componentesActualizados: componentes }
    } catch (error) {
      console.error("Error uploading files:", error)
      toast.error("Error al subir archivos")
      return {
        imagenUrl: set?.imagen_url || null,
        documentosAdjuntos: documentos.filter((d) => d.path),
        componentesActualizados: componentes,
      }
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre) {
      toast.error("El nombre es obligatorio")
      return
    }

    const precioDia = parseFloat(form.precio_dia)
    const precioMes = parseFloat(form.precio_mes)

    if (!form.precio_dia || isNaN(precioDia) || precioDia <= 0) {
      toast.error("El precio por día es obligatorio y debe ser mayor a 0")
      return
    }
    if (!form.precio_mes || isNaN(precioMes) || precioMes <= 0) {
      toast.error("El precio por mes es obligatorio y debe ser mayor a 0")
      return
    }

    let latitude = null
    let longitude = null

    if (form.ubicacion) {
      const geoRes = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: form.ubicacion }),
      })
      const geoData = await geoRes.json()
      if (geoRes.ok) {
        latitude = geoData.latitude
        longitude = geoData.longitude
      } else {
        toast.error("No se pudo obtener coordenadas")
        return
      }
    }

    setSaving(true)
    try {
      const commonPayload = {
        ...form,
        categoria_id: form.categoria_id || null,
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
        const { imagenUrl, documentosAdjuntos, componentesActualizados } = await uploadFiles(set.id)
        const { error } = await supabase
          .from("sets_activos")
          .update({
            ...commonPayload,
            imagen_url: imagenUrl,
            documentos_adjuntos: documentosAdjuntos,
            componentes: componentesActualizados,
          })
          .eq("id", set.id)
        if (error) throw error
        toast.success("Set actualizado")
        router.push("/dashboard/activos")
      } else {
        const { data: nuevoSet, error: createError } = await supabase
          .from("sets_activos")
          .insert({
            ...commonPayload,
            imagen_url: null,
            documentos_adjuntos: [],
            componentes: [],
          })
          .select()
          .single()
        if (createError) throw createError

        const { imagenUrl, documentosAdjuntos, componentesActualizados } = await uploadFiles(nuevoSet.id)
        const { error: updateError } = await supabase
          .from("sets_activos")
          .update({
            imagen_url: imagenUrl,
            documentos_adjuntos: documentosAdjuntos,
            componentes: componentesActualizados,
          })
          .eq("id", nuevoSet.id)
        if (updateError) throw updateError
        toast.success("Set creado")
        router.push("/dashboard/activos")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al guardar"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const getBadgeVariant = (estado: string) => {
    switch (estado) {
      case "disponible": return "default"
      case "alquilado": return "destructive"
      case "en_mantenimiento": return "secondary"
      case "reservado": return "outline"
      default: return "outline"
    }
  }

  const getEstadoLabel = (estado: string) => {
    const map: Record<string, string> = {
      disponible: "Disponible",
      alquilado: "Alquilado",
      en_mantenimiento: "En mantenimiento",
      reservado: "Reservado",
    }
    return map[estado] ?? estado
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Editar Set de Activos" : "Nuevo Set de Activos"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* ── Archivos ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Imagen */}
            <div className="space-y-2">
              <Label>Imagen del set</Label>
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
                        <div className="flex gap-1 flex-shrink-0">
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

          {/* ── Campos principales ────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => handleChange("nombre", e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => handleChange("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kit_equipos">Kit de equipos</SelectItem>
                  <SelectItem value="maleta_herramientas">Maleta de herramientas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={form.categoria_id} onValueChange={(v) => handleChange("categoria_id", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={form.precio_dia}
                onChange={(e) => handleChange("precio_dia", e.target.value)}
              />
            </div>

            <div className="space-y-2">
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
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
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
                    title="Volver al valor sugerido con descuento del 10%"
                  >
                    Restaurar sugerido
                  </button>
                )}
              </div>
              {!precioMesOverride && form.precio_dia && parseFloat(form.precio_dia) > 0 && (
                <p className="text-xs text-gray-400">
                  Calculado como precio/día × 30 días con 10% de descuento
                </p>
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
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Label>Estado Certificación</Label>
                  {!estadoOverrides.estado_certificacion &&
                    (form.fecha_ultima_certificacion || form.fecha_proxima_certificacion) && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                        <Info className="w-3 h-3" />
                        Auto
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

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Label>Estado Mantenimiento</Label>
                  {!estadoOverrides.estado_mantenimiento &&
                    (form.fecha_ultimo_mantenimiento || form.fecha_proximo_mantenimiento) && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                        <Info className="w-3 h-3" />
                        Auto
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
              <Label>Stock</Label>
              <Input type="number" min={0} value={form.stock} onChange={(e) => handleChange("stock", parseInt(e.target.value) || 0)} />
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

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={form.descripcion} onChange={(e) => handleChange("descripcion", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Accesorios Incluidos</Label>
            <Textarea value={form.accesorios_incluidos} onChange={(e) => handleChange("accesorios_incluidos", e.target.value)} />
          </div>

          {/* ── Fechas (auto-calculadas desde componentes) ─────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold">Fechas de Certificación y Mantenimiento</Label>
              {componentes.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                  <Info className="w-3 h-3" />
                  Auto-calculadas desde los activos del set
                </span>
              )}
            </div>
            {componentes.length > 0 && (
              <p className="text-xs text-gray-500">
                Las fechas se derivan automáticamente de los activos agregados.
                Puedes editarlas manualmente; usa "Restaurar auto" para volver al cálculo automático.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                {
                  key: "fecha_ultima_certificacion" as const,
                  label: "Fecha Última Certificación",
                  hint: "Más próxima entre activos",
                },
                {
                  key: "fecha_proxima_certificacion" as const,
                  label: "Fecha Próxima Certificación",
                  hint: "Más lejana entre activos",
                },
                {
                  key: "fecha_ultimo_mantenimiento" as const,
                  label: "Fecha Último Mantenimiento",
                  hint: "Más próxima entre activos",
                },
                {
                  key: "fecha_proximo_mantenimiento" as const,
                  label: "Fecha Próximo Mantenimiento",
                  hint: "Más lejana entre activos",
                },
              ] as const
            ).map(({ key, label, hint }) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{label}</Label>
                  {dateOverrides[key] && componentes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => resetDateOverride(key)}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Restaurar auto
                    </button>
                  )}
                </div>
                <Input
                  type="date"
                  value={form[key]}
                  onChange={(e) => handleDateChange(key, e.target.value)}
                  className={dateOverrides[key] ? "border-amber-400 focus:ring-amber-400" : ""}
                />
                {componentes.length > 0 && !dateOverrides[key] && (
                  <p className="text-xs text-gray-400">{hint}</p>
                )}
              </div>
            ))}
          </div>

          {/* ── Activos del Set ───────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Activos del Set</Label>
                <p className="text-sm text-muted-foreground">
                  Selecciona los activos disponibles que forman parte de este set
                </p>
              </div>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Activo
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Seleccionar Activos</DialogTitle>
                  </DialogHeader>

                  <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                    {/* Buscador */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nombre, modelo, serie o fabricante..."
                        value={busquedaActivo}
                        onChange={(e) => setBusquedaActivo(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Selection counter */}
                    {activosSeleccionados.size > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-emerald-600 font-medium">
                          {activosSeleccionados.size} activo{activosSeleccionados.size !== 1 ? "s" : ""} seleccionado{activosSeleccionados.size !== 1 ? "s" : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActivosSeleccionados(new Set())}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Limpiar selección
                        </button>
                      </div>
                    )}

                    {/* Lista de activos — multi-select */}
                    <div className="flex-1 overflow-y-auto border rounded-lg divide-y min-h-0 max-h-[40vh]">
                      {loadingActivos ? (
                        <div className="flex items-center justify-center p-8 text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Cargando activos...
                        </div>
                      ) : activosFiltrados.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                          <Package className="w-10 h-10 mb-2 opacity-40" />
                          <p className="text-sm">
                            {busquedaActivo
                              ? "No se encontraron activos con esa búsqueda"
                              : "No hay activos disponibles"}
                          </p>
                        </div>
                      ) : (
                        activosFiltrados.map((activo) => {
                          const isSelected = activosSeleccionados.has(activo.id)
                          return (
                            <button
                              key={activo.id}
                              type="button"
                              onClick={() => toggleActivoSeleccion(activo)}
                              className={`w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${
                                isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
                              }`}
                            >
                              {/* Checkbox visual */}
                              <div
                                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-primary border-primary"
                                    : "border-gray-300"
                                }`}
                              >
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>

                              <div className="relative h-12 w-12 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                                {activo.imagen_url ? (
                                  <Image src={activo.imagen_url} alt={activo.nombre} fill className="object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{activo.nombre}</p>
                                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                  {activo.modelo && <span className="text-xs text-muted-foreground">Modelo: {activo.modelo}</span>}
                                  {activo.serie && <span className="text-xs text-muted-foreground">S/N: {activo.serie}</span>}
                                  {activo.fabricante && <span className="text-xs text-muted-foreground">{activo.fabricante}</span>}
                                </div>
                                {activo.ubicacion && (
                                  <p className="text-xs text-muted-foreground mt-0.5">📍 {activo.ubicacion}</p>
                                )}
                              </div>

                              <Badge variant={getBadgeVariant(activo.estado_disponibilidad) as any} className="text-xs flex-shrink-0">
                                {getEstadoLabel(activo.estado_disponibilidad)}
                              </Badge>
                            </button>
                          )
                        })
                      )}
                    </div>

                    {/* Confirm button */}
                    <button
                      type="button"
                      onClick={addComponentes}
                      disabled={activosSeleccionados.size === 0}
                      className={`bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-x-2 shadow mx-auto transition-opacity ${
                        activosSeleccionados.size === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-emerald-600"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {activosSeleccionados.size === 0
                        ? "Selecciona activos para continuar"
                        : `Agregar ${activosSeleccionados.size} activo${activosSeleccionados.size !== 1 ? "s" : ""} al Set`}
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {componentes.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-muted-foreground">No hay activos agregados al set</p>
              </div>
            ) : (
              <div className="border rounded-lg divide-y">
                {componentes.map((componente) => (
                  <div key={componente.id} className="flex items-center gap-4 p-4">
                    <div className="relative h-16 w-16 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                      {componente.imagen_url ? (
                        <Image src={componente.imagen_url} alt={componente.nombre} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{componente.nombre}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        {componente.modelo && <span>Modelo: {componente.modelo}</span>}
                        {componente.modelo && componente.serie && <span>•</span>}
                        {componente.serie && <span>S/N: {componente.serie}</span>}
                      </div>
                      {componente.fabricante && (
                        <p className="text-sm text-muted-foreground">Fabricante: {componente.fabricante}</p>
                      )}
                      {componente.ubicacion && (
                        <p className="text-xs text-muted-foreground">📍 {componente.ubicacion}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => updateCantidad(componente.id, componente.cantidad - 1)} disabled={componente.cantidad <= 1}>-</Button>
                        <span className="w-12 text-center font-medium">{componente.cantidad}</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => updateCantidad(componente.id, componente.cantidad + 1)}>+</Button>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeComponente(componente.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Botones ───────────────────────────────────────────────────────── */}
          <div className="flex gap-3 justify-end">
            <button
              className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-x-2 shadow-2xl disabled:opacity-60"
              type="submit"
              disabled={saving || uploading}
            >
              {saving || uploading ? "Guardando..." : isEdit ? "Actualizar" : "Crear Set"}
            </button>
            <button
              className="bg-red-500 text-white px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-x-2 shadow-2xl disabled:opacity-60"
              type="button"
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