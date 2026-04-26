"use client"

import { useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  FileIcon,
  FileSpreadsheet,
  FileArchive,
  FileText,
  Upload,
  X,
  Loader2,
  ExternalLink,
  AlertCircle,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ArchivoAdjunto {
  url: string
  name: string
  type: string
  size: number
  uploaded_at: string
}

interface Props {
  mantenimientoId: string
  archivos: ArchivoAdjunto[]
  onChange?: (archivos: ArchivoAdjunto[]) => void
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/zip": [".zip"],
  "application/x-zip-compressed": [".zip"],
  "application/x-rar-compressed": [".rar"],
  "application/x-7z-compressed": [".7z"],
  "application/gzip": [".gz"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/csv": [".csv"],
  "application/csv": [".csv"],
}

const ACCEPT_STRING = Object.keys(ACCEPTED_TYPES).join(",") + ",.csv,.xlsx,.xls,.zip,.rar,.7z,.gz"
const MAX_SIZE_MB = 20
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileCategory(type: string, name: string): "pdf" | "excel" | "csv" | "archive" | "other" {
  if (type === "application/pdf") return "pdf"
  if (
    type.includes("spreadsheet") ||
    type === "application/vnd.ms-excel" ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
  )
    return "excel"
  if (type === "text/csv" || type === "application/csv" || name.endsWith(".csv")) return "csv"
  if (
    type.includes("zip") ||
    type.includes("rar") ||
    type.includes("7z") ||
    type.includes("gzip") ||
    name.endsWith(".zip") ||
    name.endsWith(".rar") ||
    name.endsWith(".7z") ||
    name.endsWith(".gz")
  )
    return "archive"
  return "other"
}

const categoryConfig = {
  pdf: {
    icon: FileText,
    bg: "bg-red-50",
    border: "border-red-100",
    color: "text-red-500",
    label: "PDF",
    badge: "bg-red-100 text-red-700",
  },
  excel: {
    icon: FileSpreadsheet,
    bg: "bg-green-50",
    border: "border-green-100",
    color: "text-green-600",
    label: "Excel",
    badge: "bg-green-100 text-green-700",
  },
  csv: {
    icon: FileSpreadsheet,
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    color: "text-emerald-600",
    label: "CSV",
    badge: "bg-emerald-100 text-emerald-700",
  },
  archive: {
    icon: FileArchive,
    bg: "bg-amber-50",
    border: "border-amber-100",
    color: "text-amber-600",
    label: "Archivo",
    badge: "bg-amber-100 text-amber-700",
  },
  other: {
    icon: FileIcon,
    bg: "bg-gray-50",
    border: "border-gray-100",
    color: "text-gray-500",
    label: "Archivo",
    badge: "bg-gray-100 text-gray-700",
  },
}

function isValidType(file: File): boolean {
  const typeOk = Object.keys(ACCEPTED_TYPES).includes(file.type)
  const extOk = [".pdf", ".zip", ".rar", ".7z", ".gz", ".xls", ".xlsx", ".csv"].some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  )
  return typeOk || extOk
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function MantenimientoArchivos({ mantenimientoId, archivos: initialArchivos, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [archivos, setArchivos] = useState<ArchivoAdjunto[]>(initialArchivos ?? [])
  const [uploading, setUploading] = useState<string[]>([]) // nombres de archivos en progreso
  const [dragOver, setDragOver] = useState(false)

  const updateArchivos = async (newList: ArchivoAdjunto[]) => {
    const { error } = await supabase
      .from("mantenimientos")
      .update({ archivos_adjuntos: newList })
      .eq("id", mantenimientoId)

    if (error) {
      toast.error("Error al actualizar los archivos: " + error.message)
      return false
    }
    setArchivos(newList)
    onChange?.(newList)
    return true
  }

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)

    const invalid = fileArray.filter((f) => !isValidType(f))
    if (invalid.length > 0) {
      toast.error(`Formato no permitido: ${invalid.map((f) => f.name).join(", ")}`)
    }

    const tooLarge = fileArray.filter((f) => f.size > MAX_SIZE_BYTES)
    if (tooLarge.length > 0) {
      toast.error(`Demasiado grande (máx ${MAX_SIZE_MB} MB): ${tooLarge.map((f) => f.name).join(", ")}`)
    }

    const valid = fileArray.filter((f) => isValidType(f) && f.size <= MAX_SIZE_BYTES)
    if (valid.length === 0) return

    setUploading((prev) => [...prev, ...valid.map((f) => f.name)])

    const uploaded: ArchivoAdjunto[] = []

    await Promise.all(
      valid.map(async (file) => {
        try {
          const safeName = file.name.replace(/\s+/g, "_")
          const path = `mantenimientos/${mantenimientoId}/${Date.now()}_${safeName}`

          const { error: uploadError } = await supabase.storage
            .from("documentos")
            .upload(path, file, { upsert: false })

          if (uploadError) throw uploadError

          const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(path)

          uploaded.push({
            url: urlData.publicUrl,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            uploaded_at: new Date().toISOString(),
          })
        } catch (err: unknown) {
          toast.error(`Error subiendo ${file.name}: ${err instanceof Error ? err.message : "Error"}`)
        }
      })
    )

    setUploading((prev) => prev.filter((n) => !valid.map((f) => f.name).includes(n)))

    if (uploaded.length > 0) {
      const newList = [...archivos, ...uploaded]
      const ok = await updateArchivos(newList)
      if (ok) toast.success(`${uploaded.length} archivo${uploaded.length > 1 ? "s" : ""} subido${uploaded.length > 1 ? "s" : ""} correctamente`)
    }
  }

  const handleRemove = async (archivo: ArchivoAdjunto) => {
    if (!confirm(`¿Eliminar "${archivo.name}"?`)) return

    try {
      // Eliminar del storage
      const path = archivo.url.split("/storage/v1/object/public/documentos/")[1]
      if (path) {
        await supabase.storage.from("documentos").remove([path])
      }

      const newList = archivos.filter((a) => a.url !== archivo.url)
      const ok = await updateArchivos(newList)
      if (ok) toast.success("Archivo eliminado")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar")
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }

  const isUploadingAny = uploading.length > 0

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-foreground">Documentos adjuntos</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          PDF, Excel, CSV, ZIP, RAR, 7z — máx. {MAX_SIZE_MB} MB por archivo
        </p>
      </div>

      {/* Lista de archivos */}
      {archivos.length > 0 && (
        <ul className="space-y-2">
          {archivos.map((archivo) => {
            const cat = getFileCategory(archivo.type, archivo.name)
            const cfg = categoryConfig[cat]
            const Icon = cfg.icon

            return (
              <li
                key={archivo.url}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                {/* Icono */}
                <div className={`p-2 rounded-md border ${cfg.bg} ${cfg.border} flex-shrink-0`}>
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{archivo.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatBytes(archivo.size)}</span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={archivo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"
                    title="Ver archivo"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleRemove(archivo)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                    title="Eliminar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Archivos en proceso de subida */}
      {uploading.length > 0 && (
        <ul className="space-y-2">
          {uploading.map((name) => (
            <li key={name} className="flex items-center gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
              <span className="text-sm text-blue-700 truncate">{name}</span>
              <span className="ml-auto text-xs text-blue-500">Subiendo...</span>
            </li>
          ))}
        </ul>
      )}

      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !isUploadingAny && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STRING}
          className="hidden"
          multiple
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files)
            e.target.value = ""
          }}
        />

        {isUploadingAny ? (
          <div className="flex flex-col items-center gap-2 text-blue-500">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium">Subiendo {uploading.length} archivo{uploading.length > 1 ? "s" : ""}...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-8 w-8" />
            <p className="text-sm font-medium">Arrastra archivos aquí o haz clic para seleccionar</p>
            <p className="text-xs">Puedes subir varios archivos a la vez</p>

            {/* Tipos aceptados */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center">
              {[
                { label: "PDF", badge: "bg-red-100 text-red-700" },
                { label: "Excel", badge: "bg-green-100 text-green-700" },
                { label: "CSV", badge: "bg-emerald-100 text-emerald-700" },
                { label: "ZIP / RAR / 7z", badge: "bg-amber-100 text-amber-700" },
              ].map((t) => (
                <span key={t.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.badge}`}>
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nota de límite */}
      {archivos.length >= 10 && (
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Tienes {archivos.length} archivos adjuntos. Considera eliminar los que ya no necesites.
        </div>
      )}
    </div>
  )
}