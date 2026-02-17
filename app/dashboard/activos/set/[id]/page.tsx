"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { SetActivo } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  FileText,
  Upload,
  Eye,
  Package,
  Calendar,
  MapPin,
  User,
  Boxes,
  FileCheck,
  Activity,
  List,
} from "lucide-react"
import Image from "next/image"

interface DocumentoAdjunto {
  id: string
  nombre: string
  url: string
  path: string
  tipo: string
  tamaño: number
}

interface ComponenteActivo {
  id: string
  nombre: string
  cantidad: number
  serie?: string
  modelo?: string
  fabricante?: string
  descripcion?: string
  imagen_url?: string
  imagen_path?: string
  documento_url?: string
  documento_path?: string
  documento_nombre?: string
}

export default function SetActivoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [set, setSet] = useState<SetActivo | null>(null)
  const [documentos, setDocumentos] = useState<DocumentoAdjunto[]>([])
  const [componentes, setComponentes] = useState<ComponenteActivo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)

  const loadData = useCallback(async () => {
    const { data, error } = await supabase
      .from("sets_activos")
      .select("*, categorias(nombre)")
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error loading set:", error)
      return
    }

    setSet(data as SetActivo)

    // Parse documentos from jsonb
    if (data?.documentos_adjuntos) {
      const docs = Array.isArray(data.documentos_adjuntos) ? data.documentos_adjuntos : []
      setDocumentos(docs)
    }

    // Parse componentes from jsonb
    if (data?.componentes) {
      const comps = Array.isArray(data.componentes) ? data.componentes : []
      setComponentes(comps)
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo no debe superar los 10MB")
      return
    }

    setUploadingDoc(true)
    try {
      const fileName = `documentos/${id}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('sets-activos')
        .upload(fileName, file, { cacheControl: "3600", upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('sets-activos')
        .getPublicUrl(fileName)

      const newDoc: DocumentoAdjunto = {
        id: crypto.randomUUID(),
        nombre: file.name,
        url: publicUrl,
        path: fileName,
        tipo: file.type,
        tamaño: file.size,
      }

      const updatedDocs = [...documentos, newDoc]

      const { error: updateError } = await supabase
        .from('sets_activos')
        .update({ documentos_adjuntos: updatedDocs })
        .eq('id', id)

      if (updateError) throw updateError

      toast.success("Documento subido correctamente")
      setUploadOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.message || "Error al subir el documento")
    } finally {
      setUploadingDoc(false)
    }
  }

  const downloadDocument = async (doc: DocumentoAdjunto) => {
    try {
      const response = await fetch(doc.url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.nombre
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Documento descargado")
    } catch (error: any) {
      toast.error(error.message || "Error al descargar el documento")
    }
  }

  const viewDocument = async (doc: DocumentoAdjunto) => {
    try {
      window.open(doc.url, '_blank')
    } catch (error: any) {
      toast.error("Error al abrir el documento")
    }
  }

  const deleteDocument = async (doc: DocumentoAdjunto) => {
    if (!confirm(`¿Eliminar el documento "${doc.nombre}"?`)) return

    try {
      const { error: storageError } = await supabase.storage
        .from('sets-activos')
        .remove([doc.path])

      if (storageError) throw storageError

      const updatedDocs = documentos.filter(d => d.id !== doc.id)

      const { error: updateError } = await supabase
        .from('sets_activos')
        .update({ documentos_adjuntos: updatedDocs })
        .eq('id', id)

      if (updateError) throw updateError

      toast.success("Documento eliminado")
      loadData()
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar el documento")
    }
  }

  const deleteSet = async () => {
    if (!confirm("¿Estás seguro de eliminar este set de activos?")) return
    const { error } = await supabase.from("sets_activos").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Set eliminado")
    router.push("/dashboard/sets-activos")
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getEstadoBadge = (estado: string, tipo: 'disponibilidad' | 'certificacion' | 'mantenimiento') => {
    const colors: Record<string, string> = {
      disponible: 'bg-green-100 text-green-800',
      alquilado: 'bg-blue-100 text-blue-800',
      en_mantenimiento: 'bg-orange-100 text-orange-800',
      reservado: 'bg-purple-100 text-purple-800',
      vigente: 'bg-green-100 text-green-800',
      en_certificacion: 'bg-blue-100 text-blue-800',
      proximo_a_vencer: 'bg-yellow-100 text-yellow-800',
      vencido: 'bg-red-100 text-red-800',
      na: 'bg-gray-100 text-gray-800',
    }

    const labels: Record<string, string> = {
      disponible: 'Disponible',
      alquilado: 'Alquilado',
      en_mantenimiento: 'En Mantenimiento',
      reservado: 'Reservado',
      vigente: 'Vigente',
      en_certificacion: 'En Certificación',
      proximo_a_vencer: 'Próximo a Vencer',
      vencido: 'Vencido',
      na: 'N/A',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[estado] || 'bg-gray-100 text-gray-800'}`}>
        {labels[estado] || estado}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (!set) {
    return <p className="text-muted-foreground">Set no encontrado</p>
  }

  const totalActivos = componentes.reduce((sum, comp) => sum + comp.cantidad, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/sets-activos")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/sets-activos/${id}/editar`)}
          >
            <Edit className="mr-1 h-4 w-4" />
            Editar
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteSet}>
            <Trash2 className="mr-1 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Set Profile Card */}
      <Card className="overflow-hidden">
       
        <CardContent className="relative pt-0 pb-6">
          {/* Imagen */}
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-lg p-2 shadow-lg">
              {set.imagen_url ? (
                <div className="relative h-32 w-32">
                  <Image
                    src={set.imagen_url}
                    alt={set.nombre}
                    fill
                    className="rounded-lg object-cover"
                  />
                </div>
              ) : (
                <div className="h-32 w-32 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Set Info */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {set.nombre}
            </h1>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              {set.serie && <span>S/N: {set.serie}</span>}
              {set.serie && set.modelo && <span>•</span>}
              {set.modelo && <span>{set.modelo}</span>}
            </div>
            <div className="flex items-center justify-center gap-2">
              {getEstadoBadge(set.estado_disponibilidad, 'disponibilidad')}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                {set.tipo === 'kit_equipos' ? 'Kit de Equipos' : 'Maleta de Herramientas'}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {set.fabricante && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fabricante</p>
                  <p className="font-medium">{set.fabricante}</p>
                </div>
              </div>
            )}

            {set.categorias?.nombre && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categoría</p>
                  <p className="font-medium">{set.categorias.nombre}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Boxes className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stock</p>
                <p className="font-medium">{set.stock} unidad(es)</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1">
                <List className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Activos</p>
                <p className="font-medium">{totalActivos} activo(s)</p>
              </div>
            </div>

            {set.ubicacion && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ubicación</p>
                  <p className="font-medium">{set.ubicacion}</p>
                </div>
              </div>
            )}

            {set.responsable && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Responsable</p>
                  <p className="font-medium">{set.responsable}</p>
                </div>
              </div>
            )}

            {set.created_at && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Registro</p>
                  <p className="font-medium">{formatDate(set.created_at)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {set.descripcion && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Descripción</h3>
              <p className="text-sm text-muted-foreground">{set.descripcion}</p>
            </div>
          )}

          {/* Accesorios */}
          {set.accesorios_incluidos && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Accesorios Incluidos</h3>
              <p className="text-sm text-muted-foreground">{set.accesorios_incluidos}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="componentes">
        <TabsList>
          <TabsTrigger value="componentes">
            <List className="h-4 w-4 mr-1" />
            Componentes ({componentes.length})
          </TabsTrigger>
          <TabsTrigger value="certificacion">
            <FileCheck className="h-4 w-4 mr-1" />
            Certificación
          </TabsTrigger>
          <TabsTrigger value="mantenimiento">
            <Activity className="h-4 w-4 mr-1" />
            Mantenimiento
          </TabsTrigger>
          <TabsTrigger value="documentos">
            Documentos ({documentos.length})
          </TabsTrigger>
        </TabsList>

        {/* Componentes Tab */}
        <TabsContent value="componentes" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {componentes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay activos en este set</p>
                </div>
              ) : (
                <div className="divide-y">
                  {componentes.map((comp) => (
                    <div
                      key={comp.id}
                      className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      {/* Imagen */}
                      {comp.imagen_url ? (
                        <div className="relative h-20 w-20 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                          <Image
                            src={comp.imagen_url}
                            alt={comp.nombre}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-20 w-20 flex-shrink-0 rounded bg-gray-100 flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-lg">{comp.nombre}</h4>
                          <span className="flex-shrink-0 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            x{comp.cantidad}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {comp.modelo && (
                            <p><span className="font-medium">Modelo:</span> {comp.modelo}</p>
                          )}
                          {comp.serie && (
                            <p><span className="font-medium">Serie:</span> {comp.serie}</p>
                          )}
                          {comp.fabricante && (
                            <p><span className="font-medium">Fabricante:</span> {comp.fabricante}</p>
                          )}
                          {comp.descripcion && (
                            <p className="mt-2">{comp.descripcion}</p>
                          )}
                        </div>

                        {/* Documento del componente */}
                        {comp.documento_url && comp.documento_nombre && (
                          <div className="mt-3 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(comp.documento_url, '_blank')}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              {comp.documento_nombre}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificacion Tab */}
        <TabsContent value="certificacion" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Estado de Certificación</h2>
                {getEstadoBadge(set.estado_certificacion, 'certificacion')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Última Certificación
                  </Label>
                  <p className="text-lg font-semibold">
                    {formatDate(set.fecha_ultima_certificacion as string)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Próxima Certificación
                  </Label>
                  <p className="text-lg font-semibold">
                    {formatDate(set.fecha_proxima_certificacion as string)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mantenimiento Tab */}
        <TabsContent value="mantenimiento" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Estado de Mantenimiento</h2>
                {getEstadoBadge(set.estado_mantenimiento, 'mantenimiento')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Último Mantenimiento
                  </Label>
                  <p className="text-lg font-semibold">
                    {formatDate(set.fecha_ultimo_mantenimiento as string)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Próximo Mantenimiento
                  </Label>
                  <p className="text-lg font-semibold">
                    {formatDate(set.fecha_proximo_mantenimiento as string)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documentos" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Documentos Adjuntos del Set</h2>
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Upload className="mr-1 h-4 w-4" />
                  Subir Documento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Subir Documento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Seleccionar archivo</label>
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploadingDoc}
                    />
                  </div>
                  {uploadingDoc && (
                    <p className="text-sm text-muted-foreground">Subiendo documento...</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {documentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay documentos adjuntos</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setUploadOpen(true)}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    Subir primer documento
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(doc.tamaño)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDocument(doc)}
                          title="Ver documento"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadDocument(doc)}
                          title="Descargar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDocument(doc)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>
}