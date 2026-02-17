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
import { Upload, X, FileText, Image as ImageIcon, Download } from "lucide-react"
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

  useEffect(() => {
    supabase
      .from("categorias")
      .select("*")
      .order("nombre")
      .then(({ data }) => setCategorias((data as Categoria[]) || []))
  }, [])

  const handleChange = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }))
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
        .insert({
          nombre: newCategoryName.trim(),
          tipo: 'otro', // Siempre activo por defecto
          descripcion: null, // Siempre vacío
        })
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
      
      // Actualizar lista de categorías
      setCategorias((prev) => [...prev, data as Categoria])
      
      // Resetear campos
      setNewCategoryName("")
      setShowNewCategory(false)

      return data.id
    } catch (error: any) {
      console.error("Error creating category:", error)
      toast.error(error.message || "Error al crear la categoría")
      return null
    }
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

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { error } = await supabase.storage
      .from("activos")
      .upload(path, file, { cacheControl: "3600", upsert: true })

    if (error) {
      console.error("Error uploading file:", error)
      return null
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("activos").getPublicUrl(path)

    return publicUrl
  }

  const uploadFiles = async (activoId: string) => {
    setUploading(true)
    try {
      let imagenUrl = activo?.imagen_url || null

      // Subir imagen si hay una nueva
      if (imagen.file) {
        const extension = imagen.file.name.split(".").pop()
        const fileName = `imagenes/${activoId}-${Date.now()}.${extension}`
        const publicUrl = await uploadFile(imagen.file, fileName)
        if (publicUrl) {
          imagenUrl = publicUrl
        } else {
          toast.error("Error al subir la imagen")
        }
      }

      // Subir documentos nuevos
      const documentosAdjuntos = [...documentos]

      for (const doc of documentos) {
        if (!doc.path && doc.url.startsWith("blob:")) {
          const response = await fetch(doc.url)
          const blob = await response.blob()
          const file = new File([blob], doc.nombre, { type: doc.tipo })
          const fileName = `documentos/${activoId}/${Date.now()}-${doc.nombre}`
          const publicUrl = await uploadFile(file, fileName)

          if (publicUrl) {
            doc.path = fileName
            doc.url = publicUrl
          } else {
            toast.error(`Error al subir ${doc.nombre}`)
          }
        }
      }

      return { imagenUrl, documentosAdjuntos }
    } catch (error) {
      console.error("Error uploading files:", error)
      toast.error("Error al subir archivos")
      return { imagenUrl: activo?.imagen_url || null, documentosAdjuntos: [] }
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

    setSaving(true)
    
    try {
      // Crear nueva categoría si es necesario
      let categoriaId = form.categoria_id
      if (showNewCategory) {
        const newCatId = await createNewCategory()
        if (!newCatId) {
          setSaving(false)
          return
        }
        categoriaId = newCatId
      }

      if (isEdit) {
        // Subir archivos primero
        const { imagenUrl, documentosAdjuntos } = await uploadFiles(activo.id)

        const payload = {
          ...form,
          categoria_id: categoriaId || null,
          fecha_ultima_certificacion: form.fecha_ultima_certificacion || null,
          fecha_proxima_certificacion: form.fecha_proxima_certificacion || null,
          fecha_ultimo_mantenimiento: form.fecha_ultimo_mantenimiento || null,
          fecha_proximo_mantenimiento: form.fecha_proximo_mantenimiento || null,
          imagen_url: imagenUrl,
          documentos_adjuntos: documentosAdjuntos,
        }

        const { error } = await supabase
          .from("activos")
          .update(payload)
          .eq("id", activo.id)

        if (error) throw error
        toast.success("Activo actualizado")
        // Redirect to detail page after successful edit
        router.push(`/dashboard/activos/${activo.id}`)
      } else {
        // Crear activo primero sin archivos
        const { data: nuevoActivo, error: createError } = await supabase
          .from("activos")
          .insert({
            ...form,
            categoria_id: categoriaId || null,
            fecha_ultima_certificacion: form.fecha_ultima_certificacion || null,
            fecha_proxima_certificacion: form.fecha_proxima_certificacion || null,
            fecha_ultimo_mantenimiento: form.fecha_ultimo_mantenimiento || null,
            fecha_proximo_mantenimiento: form.fecha_proximo_mantenimiento || null,
            imagen_url: null,
            documentos_adjuntos: [],
          })
          .select()
          .single()

        if (createError) throw createError

        // Subir archivos después
        const { imagenUrl, documentosAdjuntos } = await uploadFiles(nuevoActivo.id)

        // Actualizar con URLs de archivos
        const { error: updateError } = await supabase
          .from("activos")
          .update({
            imagen_url: imagenUrl,
            documentos_adjuntos: documentosAdjuntos,
          })
          .eq("id", nuevoActivo.id)

        if (updateError) throw updateError
        toast.success("Activo creado")
        router.push("/dashboard/activos")
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
          <CardTitle>{isEdit ? "Editar Activo" : "Nuevo Activo"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sección de archivos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Imagen del activo */}
            <div className="space-y-2">
              <Label>Imagen del activo</Label>
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
              <Select value={form.tipo} onValueChange={(v: any) => handleChange("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipo">Equipo</SelectItem>
                  <SelectItem value="herramienta">Herramienta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select 
                value={showNewCategory ? "crear_nueva" : form.categoria_id} 
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                  <SelectItem value="crear_nueva" className="text-blue-600 font-medium">
                    + Crear nueva categoría
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Campo para crear nueva categoría */}
              {showNewCategory && (
                <div className="mt-3 p-3 border-2 border-blue-200 rounded-lg bg-blue-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-blue-900 font-semibold text-sm">Nueva Categoría</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowNewCategory(false)
                        setNewCategoryName("")
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nombre de la categoría"
                    className="bg-white"
                  />

                  <p className="text-xs text-blue-700">
                    La categoría se creará automáticamente al guardar
                  </p>
                </div>
              )}
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
              <Label>Estado Certificacion</Label>
              <Select value={form.estado_certificacion} onValueChange={(v) => handleChange("estado_certificacion", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="en_certificacion">En certificacion</SelectItem>
                  <SelectItem value="proximo_a_vencer">Proximo a vencer</SelectItem>
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
                  <SelectItem value="proximo_a_vencer">Proximo a vencer</SelectItem>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha Ultima Certificacion</Label>
              <Input type="date" value={form.fecha_ultima_certificacion} onChange={(e) => handleChange("fecha_ultima_certificacion", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha Proxima Certificacion</Label>
              <Input type="date" value={form.fecha_proxima_certificacion} onChange={(e) => handleChange("fecha_proxima_certificacion", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha Ultimo Mantenimiento</Label>
              <Input type="date" value={form.fecha_ultimo_mantenimiento} onChange={(e) => handleChange("fecha_ultimo_mantenimiento", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha Proximo Mantenimiento</Label>
              <Input type="date" value={form.fecha_proximo_mantenimiento} onChange={(e) => handleChange("fecha_proximo_mantenimiento", e.target.value)} />
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
                : "Crear Activo"}
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