"use client"

import React, { useState, useEffect, useRef } from "react"
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
import { Upload, X, FileText, Image as ImageIcon, Download, Plus, Trash2, Package, Search, Loader2, CheckCircle2 } from "lucide-react"
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
}

export function SetActivoForm({ set }: SetActivoFormProps) {
  const router = useRouter()
  const isEdit = !!set

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [form, setForm] = useState({
    nombre: set?.nombre || "",
    tipo: set?.tipo || "kit_equipos",
    modelo: set?.modelo || "",
    serie: set?.serie || "",
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

  // Estados para el selector de activos
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activosDisponibles, setActivosDisponibles] = useState<Activo[]>([])
  const [loadingActivos, setLoadingActivos] = useState(false)
  const [busquedaActivo, setBusquedaActivo] = useState("")
  const [activoSeleccionado, setActivoSeleccionado] = useState<Activo | null>(null)
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState(1)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const imagenInputRef = useRef<HTMLInputElement>(null)
  const documentosInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from("categorias").select("*").order("nombre")
      .then(({ data }) => setCategorias((data as Categoria[]) || []))
  }, [])

  // Cargar activos disponibles cuando se abre el diálogo
  useEffect(() => {
    if (dialogOpen) {
      loadActivosDisponibles()
    } else {
      // Reset al cerrar
      setBusquedaActivo("")
      setActivoSeleccionado(null)
      setCantidadSeleccionada(1)
    }
  }, [dialogOpen])

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
    } catch (err) {
      toast.error("Error al cargar activos disponibles")
    } finally {
      setLoadingActivos(false)
    }
  }

  // Activos filtrados por búsqueda, excluyendo los ya agregados
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

  const handleChange = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }))
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

  const handleDocumentosChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
    if (imagen.preview && !imagen.path) {
      URL.revokeObjectURL(imagen.preview)
    }
    setImagen({ file: null, preview: null, path: null })
    if (imagenInputRef.current) {
      imagenInputRef.current.value = ""
    }
  }

  const removeDocumento = (id: string) => {
    setDocumentos((prev) => {
      const documento = prev.find((d) => d.id === id)
      if (documento?.url && !documento.path) {
        URL.revokeObjectURL(documento.url)
      }
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
    } catch (error) {
      toast.error("Error al descargar el archivo")
    }
  }

  // Agregar activo seleccionado al set
  const addComponente = () => {
    if (!activoSeleccionado) {
      toast.error("Debes seleccionar un activo")
      return
    }

    const nuevoComponente: ComponenteActivo = {
      id: crypto.randomUUID(),
      activo_id: activoSeleccionado.id,
      nombre: activoSeleccionado.nombre,
      cantidad: cantidadSeleccionada,
      serie: activoSeleccionado.serie ?? undefined,
      modelo: activoSeleccionado.modelo ?? undefined,
      fabricante: activoSeleccionado.fabricante ?? undefined,
      descripcion: activoSeleccionado.descripcion ?? undefined,
      imagen_url: activoSeleccionado.imagen_url ?? undefined,
      tipo: activoSeleccionado.tipo,
      estado_disponibilidad: activoSeleccionado.estado_disponibilidad,
      estado_certificacion: activoSeleccionado.estado_certificacion,
      estado_mantenimiento: activoSeleccionado.estado_mantenimiento,
      categoria_id: activoSeleccionado.categoria_id ?? undefined,
      ubicacion: activoSeleccionado.ubicacion ?? undefined,
      responsable: activoSeleccionado.responsable ?? undefined,
      accesorios_incluidos: activoSeleccionado.accesorios_incluidos ?? undefined,
      stock: activoSeleccionado.stock,
      condicion: activoSeleccionado.condicion ?? undefined,
      documentos_adjuntos: activoSeleccionado.documentos_adjuntos ?? [],
    }

    setComponentes([...componentes, nuevoComponente])
    setDialogOpen(false)
    toast.success(`${activoSeleccionado.nombre} agregado al set`)
  }

  const removeComponente = (id: string) => {
    setComponentes(componentes.filter(c => c.id !== id))
    toast.success("Activo eliminado del set")
  }

  const updateCantidad = (id: string, nuevaCantidad: number) => {
    setComponentes(componentes.map(c =>
      c.id === id
        ? { ...c, cantidad: Math.max(1, nuevaCantidad) }
        : c
    ))
  }

  const uploadFiles = async (setId: string) => {
    setUploading(true)
    try {
      let imagenUrl = set?.imagen_url || null

      // Subir imagen del set si hay una nueva
      if (imagen.file) {
        const extension = imagen.file.name.split(".").pop()
        const fileName = `imagenes/${setId}-${Date.now()}.${extension}`

        const { error: imgError } = await supabase.storage
          .from("sets-activos")
          .upload(fileName, imagen.file, { cacheControl: "3600", upsert: true })

        if (imgError) {
          console.error("Error uploading set image:", imgError)
          toast.error("Error al subir la imagen del set")
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from("sets-activos")
            .getPublicUrl(fileName)
          imagenUrl = publicUrl
        }
      }

      // Subir documentos del set
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
            console.error("Error uploading document:", docError)
            toast.error(`Error al subir ${doc.nombre}`)
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from("sets-activos")
              .getPublicUrl(fileName)

            documentosAdjuntos.push({
              ...doc,
              path: fileName,
              url: publicUrl,
            })
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
        documentosAdjuntos: documentos.filter(d => d.path),
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

    // 🔥 Geocoding antes de guardar
        let latitude = null;
        let longitude = null;
    
        if (form.ubicacion) {
          const geoRes = await fetch("/api/geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: form.ubicacion }),
          });
    
          const geoData = await geoRes.json();
    
          if (geoRes.ok) {
            latitude = geoData.latitude;
            longitude = geoData.longitude;
          } else {
            toast.error("No se pudo obtener coordenadas");
            setSaving(false);
            return;
          }
        }
    setSaving(true)

    try {
      if (isEdit) {
        const { imagenUrl, documentosAdjuntos, componentesActualizados } = await uploadFiles(set.id)

        const payload = {
          ...form,
          categoria_id: form.categoria_id || null,
            latitude,
           longitude,
          fecha_ultima_certificacion: form.fecha_ultima_certificacion || null,
          fecha_proxima_certificacion: form.fecha_proxima_certificacion || null,
          fecha_ultimo_mantenimiento: form.fecha_ultimo_mantenimiento || null,
          fecha_proximo_mantenimiento: form.fecha_proximo_mantenimiento || null,
          imagen_url: imagenUrl,
          documentos_adjuntos: documentosAdjuntos,
          componentes: componentesActualizados,
        }

        const { error } = await supabase
          .from("sets_activos")
          .update(payload)
          .eq("id", set.id)

        if (error) throw error
        toast.success("Set actualizado")
        router.push(`/dashboard/sets-activos/${set.id}`)
      } else {
        const { data: nuevoSet, error: createError } = await supabase
          .from("sets_activos")
          .insert({
            ...form,
            categoria_id: form.categoria_id || null,
            fecha_ultima_certificacion: form.fecha_ultima_certificacion || null,
            fecha_proxima_certificacion: form.fecha_proxima_certificacion || null,
            fecha_ultimo_mantenimiento: form.fecha_ultimo_mantenimiento || null,
            fecha_proximo_mantenimiento: form.fecha_proximo_mantenimiento || null,
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

  // Badge de estado de disponibilidad
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

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Editar Set de Activos" : "Nuevo Set de Activos"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sección de archivos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Imagen del set */}
            <div className="space-y-2">
              <Label>Imagen del set</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {imagen.preview ? (
                  <div className="space-y-2">
                    <div className="relative w-full h-48 mx-auto">
                      <Image
                        src={imagen.preview}
                        alt="Imagen preview"
                        fill
                        className="object-contain rounded"
                      />
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => imagenInputRef.current?.click()}
                        disabled={uploading}
                      >
                        Cambiar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeImagen}
                        disabled={uploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-full h-48 mx-auto flex items-center justify-center bg-gray-100 rounded">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => imagenInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Subir imagen
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Formatos: JPG, PNG, GIF. Máximo 5MB
              </p>
              <Input
                ref={imagenInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImagenChange}
              />
            </div>

            {/* Documentos adjuntos */}
            <div className="space-y-2">
              <Label>Documentos adjuntos</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <div className="text-center mb-3">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => documentosInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Agregar documentos
                  </Button>
                </div>

                {documentos.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {documentos.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded text-sm"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{doc.nombre}</p>
                            <p className="text-xs text-gray-500">
                              {(doc.tamaño / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {doc.path && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadDocumento(doc)}
                              className="p-1 h-auto"
                            >
                              <Download className="w-4 h-4 text-blue-500" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocumento(doc.id)}
                            className="p-1 h-auto"
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                PDF, Word, Excel, Imágenes. Máximo 10MB por archivo
              </p>
              <Input
                ref={documentosInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleDocumentosChange}
              />
            </div>
          </div>

          {/* Campos del formulario */}
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
              <Label>Categoria</Label>
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
              <Label>Serie</Label>
              <Input value={form.serie} onChange={(e) => handleChange("serie", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fabricante</Label>
              <Input value={form.fabricante} onChange={(e) => handleChange("fabricante", e.target.value)} />
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
            <div className="space-y-2">
              <Label>Estado Certificación</Label>
              <Select value={form.estado_certificacion} onValueChange={(v) => handleChange("estado_certificacion", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="en_certificacion">En certificación</SelectItem>
                  <SelectItem value="proximo_a_vencer">Próximo a vencer</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="na">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado Mantenimiento</Label>
              <Select value={form.estado_mantenimiento} onValueChange={(v) => handleChange("estado_mantenimiento", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="en_mantenimiento">En mantenimiento</SelectItem>
                  <SelectItem value="proximo_a_vencer">Próximo a vencer</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="na">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input type="number" min={0} value={form.stock} onChange={(e) => handleChange("stock", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Ubicacion</Label>
              <Input value={form.ubicacion} onChange={(e) => handleChange("ubicacion", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Input value={form.responsable} onChange={(e) => handleChange("responsable", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripcion</Label>
            <Textarea value={form.descripcion} onChange={(e) => handleChange("descripcion", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Accesorios Incluidos</Label>
            <Textarea value={form.accesorios_incluidos} onChange={(e) => handleChange("accesorios_incluidos", e.target.value)} />
          </div>

          {/* Fechas */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha Última Certificación</Label>
              <Input
                type="date"
                value={form.fecha_ultima_certificacion}
                onChange={(e) => handleChange("fecha_ultima_certificacion", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Próxima Certificación</Label>
              <Input
                type="date"
                value={form.fecha_proxima_certificacion}
                onChange={(e) => handleChange("fecha_proxima_certificacion", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Último Mantenimiento</Label>
              <Input
                type="date"
                value={form.fecha_ultimo_mantenimiento}
                onChange={(e) => handleChange("fecha_ultimo_mantenimiento", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Próximo Mantenimiento</Label>
              <Input
                type="date"
                value={form.fecha_proximo_mantenimiento}
                onChange={(e) => handleChange("fecha_proximo_mantenimiento", e.target.value)}
              />
            </div>
          </div>

          {/* Activos del Set */}
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
                    <DialogTitle>Seleccionar Activo</DialogTitle>
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

                    {/* Lista de activos */}
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
                          const isSelected = activoSeleccionado?.id === activo.id
                          return (
                            <button
                              key={activo.id}
                              type="button"
                              onClick={() => setActivoSeleccionado(isSelected ? null : activo)}
                              className={`w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${
                                isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
                              }`}
                            >
                              {/* Imagen miniatura */}
                              <div className="relative h-12 w-12 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                                {activo.imagen_url ? (
                                  <Image
                                    src={activo.imagen_url}
                                    alt={activo.nombre}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                              </div>

                              {/* Info del activo */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{activo.nombre}</p>
                                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                  {activo.modelo && (
                                    <span className="text-xs text-muted-foreground">
                                      Modelo: {activo.modelo}
                                    </span>
                                  )}
                                  {activo.serie && (
                                    <span className="text-xs text-muted-foreground">
                                      S/N: {activo.serie}
                                    </span>
                                  )}
                                  {activo.fabricante && (
                                    <span className="text-xs text-muted-foreground">
                                      {activo.fabricante}
                                    </span>
                                  )}
                                </div>
                                {activo.ubicacion && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    📍 {activo.ubicacion}
                                  </p>
                                )}
                              </div>

                              {/* Estado y check */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant={getBadgeVariant(activo.estado_disponibilidad) as any} className="text-xs">
                                  {getEstadoLabel(activo.estado_disponibilidad)}
                                </Badge>
                                {isSelected && (
                                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>

                
                    <Button
                      type="button"
                      onClick={addComponente}
                      disabled={!activoSeleccionado}
                      className="w-full"
                    >
                      {activoSeleccionado
                        ? `Agregar "${activoSeleccionado.nombre}" al Set`
                        : "Selecciona un activo para continuar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {componentes.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay activos agregados al set
                </p>
              </div>
            ) : (
              <div className="border rounded-lg divide-y">
                {componentes.map((componente) => (
                  <div
                    key={componente.id}
                    className="flex items-center gap-4 p-4"
                  >
                    {/* Imagen miniatura */}
                    <div className="relative h-16 w-16 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                      {componente.imagen_url ? (
                        <Image
                          src={componente.imagen_url}
                          alt={componente.nombre}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{componente.nombre}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        {componente.modelo && <span>Modelo: {componente.modelo}</span>}
                        {componente.modelo && componente.serie && <span>•</span>}
                        {componente.serie && <span>S/N: {componente.serie}</span>}
                      </div>
                      {componente.fabricante && (
                        <p className="text-sm text-muted-foreground">
                          Fabricante: {componente.fabricante}
                        </p>
                      )}
                      {componente.ubicacion && (
                        <p className="text-xs text-muted-foreground">
                          📍 {componente.ubicacion}
                        </p>
                      )}
                    </div>

                    {/* Controles de cantidad */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateCantidad(componente.id, componente.cantidad - 1)}
                          disabled={componente.cantidad <= 1}
                        >
                          -
                        </Button>
                        <span className="w-12 text-center font-medium">
                          {componente.cantidad}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateCantidad(componente.id, componente.cantidad + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeComponente(componente.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end">
            <Button
              type="submit"
              disabled={saving || uploading}
              className="min-w-32"
            >
              {saving || uploading
                ? "Guardando..."
                : isEdit
                ? "Actualizar"
                : "Crear Set"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving || uploading}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}