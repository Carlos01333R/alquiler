"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Montaje } from "@/lib/types"
import { MontajeForm } from "@/components/montaje-form"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ArrowLeft, Trash2, Upload, FileIcon, X, Loader2 } from "lucide-react"

export default function MontajeEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [item, setItem] = useState<Montaje | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    supabase
      .from("montajes")
      .select("*, empresas(razon_social)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setItem(data as Montaje)
        setLoading(false)
      })
  }, [id])

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar este montaje?")) return
    const { error } = await supabase.from("montajes").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Montaje eliminado")
    router.push("/dashboard/montajes")
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return
    if (file.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo no puede superar los 10 MB")
      return
    }

    setUploading(true)
    try {
      const fileName = `montajes/${id}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`

      // Eliminar archivo anterior si existe
      if (item?.archivo_adjunto) {
        const oldPath = item.archivo_adjunto.split("/storage/v1/object/public/documentos/")[1]
        if (oldPath) {
          await supabase.storage.from("documentos").remove([oldPath])
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from("documentos")
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from("montajes")
        .update({ archivo_adjunto: urlData.publicUrl })
        .eq("id", id)

      if (updateError) throw updateError

      setItem((prev) => prev ? { ...prev, archivo_adjunto: urlData.publicUrl } : prev)
      toast.success("Documento subido correctamente")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al subir el archivo")
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveFile = async () => {
    if (!item?.archivo_adjunto) return
    if (!confirm("¿Eliminar el documento adjunto?")) return

    try {
      const oldPath = item.archivo_adjunto.split("/storage/v1/object/public/documentos/")[1]
      if (oldPath) {
        await supabase.storage.from("documentos").remove([oldPath])
      }
      await supabase.from("montajes").update({ archivo_adjunto: null }).eq("id", id)
      setItem((prev) => prev ? { ...prev, archivo_adjunto: null } : prev)
      toast.success("Documento eliminado")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar el archivo")
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  if (loading) return <div className="h-96 animate-pulse rounded bg-muted" />
  if (!item) return <p className="text-muted-foreground">Montaje no encontrado</p>

  return (
    <div className="space-y-6 w-[90%] md:max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <button
          className="bg-white text-black px-3 py-1.5 rounded-xl flex items-center cursor-pointer"
          onClick={() => router.push(`/dashboard/montajes`)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </button>
        <div className="">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Editar: {item.titulo}
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.id}</p>
        </div>
        <button 
        className="bg-red-500 text-white px-3 py-1.5 rounded-xl flex items-center cursor-pointer"
        onClick={handleDelete}>
          <Trash2 className="mr-1 h-4 w-4" />
          Eliminar
        </button>
      </div>

      {/* Formulario principal */}
      <MontajeForm montaje={item} />

      {/* Sección de documentos */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Documentos adjuntos</h2>
          <p className="text-sm text-muted-foreground">
            Sube documentos PDF relacionados a este montaje (máx. 10 MB)
          </p>
        </div>

        {/* Archivo actual */}
        {item.archivo_adjunto && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
            <div className="p-2 rounded-md bg-red-50 border border-red-100">
              <FileIcon className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {item.archivo_adjunto.split("/").pop()}
              </p>
              <a
                href={item.archivo_adjunto}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Ver documento
              </a>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleRemoveFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
              e.target.value = ""
            }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm font-medium">Subiendo documento...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="h-8 w-8" />
              <p className="text-sm font-medium">
                {item.archivo_adjunto ? "Reemplazar documento" : "Subir documento PDF"}
              </p>
              <p className="text-xs">Arrastra y suelta o haz clic para seleccionar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}