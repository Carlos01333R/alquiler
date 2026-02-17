"use client"

import React, { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Empresa } from "@/lib/types"
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
import { Upload, X, FileText, Image as ImageIcon, Download } from "lucide-react"
import Image from "next/image"

interface EmpresaFormProps {
  empresa?: Empresa
}

interface ArchivoAdjunto {
  id: string
  nombre: string
  url: string
  path: string
  tipo: string
  tamaño: number
}

export function EmpresaForm({ empresa }: EmpresaFormProps) {
  const router = useRouter()
  const isEdit = !!empresa

  const [form, setForm] = useState({
    nit: empresa?.nit || "",
    razon_social: empresa?.razon_social || "",
    tipo: empresa?.tipo || "juridico",
    email: empresa?.email || "",
    telefono: empresa?.telefono || "",
    pais: empresa?.pais || "",
    ciudad: empresa?.ciudad || "",
    direccion_fiscal: empresa?.direccion_fiscal || "",
    estado: empresa?.estado || "activo",
  })

  const [logo, setLogo] = useState<{
    file: File | null
    preview: string | null
    path: string | null
  }>({
    file: null,
    preview: empresa?.logo_url || null,
    path: empresa?.logo_path || null,
  })

  const [documentos, setDocumentos] = useState<ArchivoAdjunto[]>(
    empresa?.documentos_adjuntos || [] as any
  )

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const documentosInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 2MB")
      return
    }

    const preview = URL.createObjectURL(file)
    setLogo({ file, preview, path: null })
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

  const removeLogo = () => {
    if (logo.preview && !logo.path) {
      URL.revokeObjectURL(logo.preview)
    }
    setLogo({ file: null, preview: null, path: null })
    if (logoInputRef.current) {
      logoInputRef.current.value = ""
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
      .from("empresas")
      .upload(path, file, { cacheControl: "3600", upsert: true })

    if (error) {
      console.error("Error uploading file:", error)
      return null
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("empresas").getPublicUrl(path)

    return publicUrl
  }

  const uploadFiles = async (empresaId: string) => {
    setUploading(true)
    try {
      let logoUrl = empresa?.logo_url || null
      let logoPath = empresa?.logo_path || null

      if (logo.file) {
        const extension = logo.file.name.split(".").pop()
        const fileName = `logos/${empresaId}-${Date.now()}.${extension}`
        const publicUrl = await uploadFile(logo.file, fileName)
        if (publicUrl) {
          logoUrl = publicUrl
          logoPath = fileName
        }
      }

      const documentosPaths = [...(empresa?.documentos_paths || [])]
      const documentosAdjuntos = [...documentos]

      for (const doc of documentos) {
        if (!doc.path && doc.url.startsWith("blob:")) {
          const response = await fetch(doc.url)
          const blob = await response.blob()
          const file = new File([blob], doc.nombre, { type: doc.tipo })
          const fileName = `documentos/${empresaId}/${Date.now()}-${doc.nombre}`
          const publicUrl = await uploadFile(file, fileName)

          if (publicUrl) {
            doc.path = fileName
            doc.url = publicUrl
            documentosPaths.push(fileName)
          }
        }
      }

      return { logoUrl, logoPath, documentosPaths, documentosAdjuntos }
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.nit || !form.razon_social) {
      toast.error("NIT y Razón Social son obligatorios")
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        const { logoUrl, logoPath, documentosPaths, documentosAdjuntos } =
          await uploadFiles(empresa.id)

        const { error } = await supabase
          .from("empresas")
          .update({
            ...form,
            logo_url: logoUrl,
            logo_path: logoPath,
            documentos_adjuntos: documentosAdjuntos,
            documentos_paths: documentosPaths,
          })
          .eq("id", empresa.id)

        if (error) throw error
        toast.success("Empresa actualizada")
        router.refresh()
      } else {
        const { data: nuevaEmpresa, error: createError } = await supabase
          .from("empresas")
          .insert({
            ...form,
            logo_url: null,
            logo_path: null,
            documentos_adjuntos: [],
            documentos_paths: [],
          })
          .select()
          .single()

        if (createError) throw createError

        const { logoUrl, logoPath, documentosPaths, documentosAdjuntos } =
          await uploadFiles(nuevaEmpresa.id)

        const { error: updateError } = await supabase
          .from("empresas")
          .update({
            logo_url: logoUrl,
            logo_path: logoPath,
            documentos_adjuntos: documentosAdjuntos,
            documentos_paths: documentosPaths,
          })
          .eq("id", nuevaEmpresa.id)

        if (updateError) throw updateError
        toast.success("Empresa creada")
        router.push("/dashboard/empresas")
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
          <CardTitle>{isEdit ? "Editar Empresa" : "Nueva Empresa"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sección de archivos en fila */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo de la empresa</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {logo.preview ? (
                  <div className="space-y-2">
                    <div className="relative w-32 h-32 mx-auto">
                      <Image
                        src={logo.preview}
                        alt="Logo preview"
                        fill
                        className="object-contain rounded"
                      />
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploading}
                      >
                        Cambiar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeLogo}
                        disabled={uploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-32 h-32 mx-auto flex items-center justify-center bg-gray-100 rounded">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Subir logo
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Formatos: JPG, PNG, GIF. Máximo 2MB
              </p>
              <Input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
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
                  <div className="space-y-2 max-h-40 overflow-y-auto">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nit">NIT *</Label>
              <Input
                id="nit"
                value={form.nit}
                onChange={(e) => handleChange("nit", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="razon_social">Razón Social *</Label>
              <Input
                id="razon_social"
                value={form.razon_social}
                onChange={(e) => handleChange("razon_social", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => handleChange("tipo", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Natural</SelectItem>
                  <SelectItem value="juridico">Jurídico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={form.estado}
                onValueChange={(v) => handleChange("estado", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={form.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pais">País</Label>
              <Input
                id="pais"
                value={form.pais}
                onChange={(e) => handleChange("pais", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input
                id="ciudad"
                value={form.ciudad}
                onChange={(e) => handleChange("ciudad", e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="direccion_fiscal">Dirección Fiscal</Label>
              <Input
                id="direccion_fiscal"
                value={form.direccion_fiscal}
                onChange={(e) => handleChange("direccion_fiscal", e.target.value)}
              />
            </div>
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
                : "Crear Empresa"}
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