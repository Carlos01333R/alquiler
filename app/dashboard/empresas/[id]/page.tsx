"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Empresa, Contacto } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Plus,
  Trash2,
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  Edit,
  Download,
  FileText,
  Upload,
  Eye,
  User,
  Users,
  Package,
  Wrench,
  Hammer,
  ShoppingCart,
  BookOpen,
} from "lucide-react"
import ConfirmModal from "@/components/ConfirModal"

interface DocumentoAdjunto {
  id: string
  nombre: string
  url: string
  path: string
  tipo: string
  tamaño: number
}

interface Usuario {
  id: string
  nombre: string
  email: string
  rol: "admin" | "tecnico"
  created_at?: string
}

interface DocumentoComercial {
  id: string
  numero_documento: string
  tipo_documento: string
  fecha_emision: string
  estado: string
  empresa_id: string
}
export default function EmpresaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [documentos, setDocumentos] = useState<DocumentoAdjunto[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [documentosComerciales, setDocumentosComerciales] = useState<DocumentoComercial[]>([])
  const [activos, setActivos] = useState<any[]>([])
  const [mantenimientos, setMantenimientos] = useState<any[]>([])
  const [montajes, setMontajes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [busquedaUsuario, setBusquedaUsuario] = useState("")

  // ── Estado para modales de confirmación ──────────────────────────────────
  const [confirmDeleteUsuario, setConfirmDeleteUsuario] = useState<{
    open: boolean
    usuario: Usuario | null
    loading: boolean
  }>({ open: false, usuario: null, loading: false })

  const [confirmDeleteContacto, setConfirmDeleteContacto] = useState<{
    open: boolean
    contactoId: string | null
    loading: boolean
  }>({ open: false, contactoId: null, loading: false })

  const [confirmDeleteEmpresa, setConfirmDeleteEmpresa] = useState<{
    open: boolean
    loading: boolean
  }>({ open: false, loading: false })

  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<{
    open: boolean
    doc: DocumentoAdjunto | null
    loading: boolean
  }>({ open: false, doc: null, loading: false })

  // Contact form
  const [contactOpen, setContactOpen] = useState(false)
  const [contactForm, setContactForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    cargo: "",
  })

  // Usuario form
  const [usuarioOpen, setUsuarioOpen] = useState(false)
  const [savingUsuario, setSavingUsuario] = useState(false)
  const [usuarioForm, setUsuarioForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "tecnico" as "admin" | "tecnico",
  })

  // Document upload
  const [uploadOpen, setUploadOpen] = useState(false)

  // ── Carga de datos ────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const { data: emp } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", id)
        .single()

      setEmpresa(emp as Empresa)

      const { data: conts } = await supabase
        .from("contactos")
        .select("*")
        .eq("empresa_id", id)
        .order("created_at", { ascending: false })

      setContactos((conts as Contacto[]) || [])

      if (emp?.documentos_adjuntos) {
        const docs = Array.isArray(emp.documentos_adjuntos)
          ? emp.documentos_adjuntos
          : []
        setDocumentos(docs)
      }

      const { data: usuariosData, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("empresa_id", id)

      if (error) {
        console.error("Error cargando usuarios:", error)
      }
      setUsuarios(usuariosData ?? [])

      const { data: docsComerciales } = await supabase
        .from("documentos_comerciales")
        .select("*")
        .eq("empresa_id", id)
        .eq("tipo_documento", "orden_compra")
        .order("fecha_emision", { ascending: false })

      setDocumentosComerciales((docsComerciales as DocumentoComercial[]) || [])

      if (docsComerciales && docsComerciales.length > 0) {
        const documentoIds = docsComerciales.map((doc: any) => doc.id)

        const { data: detalles } = await supabase
          .from("detalles_documentos_comerciales")
          .select("*")
          .in("documento_comercial_id", documentoIds)

        if (detalles && detalles.length > 0) {
          let allActivos: any[] = []
          let allMantenimientos: any[] = []
          let allMontajes: any[] = []

          detalles.forEach((detalle: any) => {
            const findDoc = (docId: string) =>
              docsComerciales.find((d: any) => d.id === docId)

            if (Array.isArray(detalle.activos_seleccionados)) {
              allActivos = [
                ...allActivos,
                ...detalle.activos_seleccionados.map((a: any) => ({
                  ...a,
                  documento_id: detalle.documento_comercial_id,
                  documento_numero: findDoc(detalle.documento_comercial_id)
                    ?.numero_documento,
                })),
              ]
            }
            if (Array.isArray(detalle.mantenimientos)) {
              allMantenimientos = [
                ...allMantenimientos,
                ...detalle.mantenimientos.map((m: any) => ({
                  ...m,
                  documento_id: detalle.documento_comercial_id,
                  documento_numero: findDoc(detalle.documento_comercial_id)
                    ?.numero_documento,
                })),
              ]
            }
            if (Array.isArray(detalle.montajes)) {
              allMontajes = [
                ...allMontajes,
                ...detalle.montajes.map((m: any) => ({
                  ...m,
                  documento_id: detalle.documento_comercial_id,
                  documento_numero: findDoc(detalle.documento_comercial_id)
                    ?.numero_documento,
                })),
              ]
            }
          })

          setActivos(allActivos)
          setMantenimientos(allMantenimientos)
          setMontajes(allMontajes)
        }
      }

      setLoading(false)
    } catch (error: any) {
      console.error("Error cargando datos:", error)
      toast.error("Error al cargar los datos")
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtradas = usuarios.filter(u => {
    const q = busquedaUsuario.toLowerCase()
    return !busquedaUsuario || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  // ── CONTACTOS ─────────────────────────────────────────────────────────────
  const addContact = async () => {
    if (!contactForm.nombre) {
      toast.error("El nombre es obligatorio")
      return
    }
    const { error } = await supabase.from("contactos").insert({
      ...contactForm,
      empresa_id: id,
      nombre_empresa: empresa?.razon_social,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Contacto agregado")
    setContactForm({ nombre: "", email: "", telefono: "", cargo: "" })
    setContactOpen(false)
    loadData()
  }

  const deleteContact = async () => {
    if (!confirmDeleteContacto.contactoId) return
    setConfirmDeleteContacto((p) => ({ ...p, loading: true }))
    const { error } = await supabase
      .from("contactos")
      .delete()
      .eq("id", confirmDeleteContacto.contactoId)
    setConfirmDeleteContacto({ open: false, contactoId: null, loading: false })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Contacto eliminado")
    loadData()
  }

  // ── USUARIOS ──────────────────────────────────────────────────────────────
  /**
   * Crea el usuario llamando a nuestra API Route (usa service_role key en el servidor),
   * por lo que NO cierra la sesión del admin actual.
   */
  const addUsuario = async () => {
    if (!usuarioForm.email || !usuarioForm.password || !usuarioForm.nombre) {
      toast.error("Nombre, email y contraseña son obligatorios")
      return
    }

    setSavingUsuario(true)
    try {
      const res = await fetch("/api/usuarios/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: usuarioForm.email,
          password: usuarioForm.password,
          nombre: usuarioForm.nombre,
          rol: usuarioForm.rol,
          empresa_id: id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al crear usuario")
      }

      toast.success("Usuario creado exitosamente")
      setUsuarioForm({ nombre: "", email: "", password: "", rol: "tecnico" })
      setUsuarioOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.message || "Error al crear usuario")
    } finally {
      setSavingUsuario(false)
    }
  }

  /**
   * Elimina el usuario de Auth Y de la tabla usuarios usando nuestra API Route.
   */
  const deleteUsuario = async () => {
    if (!confirmDeleteUsuario.usuario) return
    setConfirmDeleteUsuario((p) => ({ ...p, loading: true }))

    try {
      const res = await fetch(
        `/api/usuarios/delete?userId=${confirmDeleteUsuario.usuario.id}`,
        { method: "DELETE" }
      )
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar usuario")
      }

      toast.success("Usuario eliminado correctamente")
      loadData()
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar usuario")
    } finally {
      setConfirmDeleteUsuario({ open: false, usuario: null, loading: false })
    }
  }

  // ── DOCUMENTOS ────────────────────────────────────────────────────────────
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
        .from("empresas")
        .upload(fileName, file, { cacheControl: "3600", upsert: true })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("empresas").getPublicUrl(fileName)

      const newDoc: DocumentoAdjunto = {
        id: crypto.randomUUID(),
        nombre: file.name,
        url: publicUrl,
        path: fileName,
        tipo: file.type,
        tamaño: file.size,
      }

      const updatedDocs = [...documentos, newDoc]
      const updatedPaths = [
        ...(empresa?.documentos_paths || []),
        fileName,
      ]

      const { error: updateError } = await supabase
        .from("empresas")
        .update({
          documentos_adjuntos: updatedDocs,
          documentos_paths: updatedPaths,
        })
        .eq("id", id)

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
      const a = document.createElement("a")
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

  const deleteDocument = async () => {
    if (!confirmDeleteDoc.doc) return
    const doc = confirmDeleteDoc.doc
    setConfirmDeleteDoc((p) => ({ ...p, loading: true }))

    try {
      const { error: storageError } = await supabase.storage
        .from("empresas")
        .remove([doc.path])

      if (storageError) throw storageError

      const updatedDocs = documentos.filter((d) => d.id !== doc.id)
      const updatedPaths = (empresa?.documentos_paths || []).filter(
        (p: string) => p !== doc.path
      )

      const { error: updateError } = await supabase
        .from("empresas")
        .update({
          documentos_adjuntos: updatedDocs,
          documentos_paths: updatedPaths,
        })
        .eq("id", id)

      if (updateError) throw updateError

      toast.success("Documento eliminado")
      loadData()
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar el documento")
    } finally {
      setConfirmDeleteDoc({ open: false, doc: null, loading: false })
    }
  }

  // ── EMPRESA ───────────────────────────────────────────────────────────────
  const deleteEmpresa = async () => {
    setConfirmDeleteEmpresa((p) => ({ ...p, loading: true }))
    const { error } = await supabase.from("empresas").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
      setConfirmDeleteEmpresa({ open: false, loading: false })
      return
    }
    toast.success("Empresa eliminada")
    router.push("/dashboard/empresas")
  }

  // ── UTILIDADES ────────────────────────────────────────────────────────────
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A"
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (!empresa) {
    return <p className="text-muted-foreground">Empresa no encontrada</p>
  }

  return (
    <div className="space-y-6">
      {/* ── Modales de confirmación ── */}
      <ConfirmModal
        open={confirmDeleteUsuario.open}
        onOpenChange={(v) =>
          setConfirmDeleteUsuario((p) => ({ ...p, open: v }))
        }
        title="Eliminar usuario"
        description={`¿Estás seguro de eliminar a "${confirmDeleteUsuario.usuario?.nombre}"? Esta acción eliminará su acceso al sistema y no se puede deshacer.`}
        onConfirm={deleteUsuario}
        loading={confirmDeleteUsuario.loading}
      />

      <ConfirmModal
        open={confirmDeleteContacto.open}
        onOpenChange={(v) =>
          setConfirmDeleteContacto((p) => ({ ...p, open: v }))
        }
        title="Eliminar contacto"
        description="¿Estás seguro de eliminar este contacto? Esta acción no se puede deshacer."
        onConfirm={deleteContact}
        loading={confirmDeleteContacto.loading}
      />

      <ConfirmModal
        open={confirmDeleteEmpresa.open}
        onOpenChange={(v) =>
          setConfirmDeleteEmpresa((p) => ({ ...p, open: v }))
        }
        title="Eliminar empresa"
        description="¿Estás seguro de eliminar esta empresa? Se eliminarán todos los datos asociados y esta acción no se puede deshacer."
        onConfirm={deleteEmpresa}
        loading={confirmDeleteEmpresa.loading}
      />

      <ConfirmModal
        open={confirmDeleteDoc.open}
        onOpenChange={(v) => setConfirmDeleteDoc((p) => ({ ...p, open: v }))}
        title="Eliminar documento"
        description={`¿Estás seguro de eliminar "${confirmDeleteDoc.doc?.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={deleteDocument}
        loading={confirmDeleteDoc.loading}
      />

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <button
          className="bg-white px-3 py-1.5 rounded-lg text-black cursor-pointer flex items-center gap-x-1"
          onClick={() => router.push("/dashboard/empresas")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/empresas/${id}/editar`)}
          >
            <Edit className="mr-1 h-4 w-4" />
            Editar
          </Button>
          <button
            className="bg-red-500 text-white px-3 py-1.5 rounded-xl flex items-center gap-x-2 cursor-pointer"
            onClick={() =>
              setConfirmDeleteEmpresa({ open: true, loading: false })
            }
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Eliminar
          </button>
        </div>
      </div>

      {/* ── Company Profile Card ── */}
      <Card className="overflow-hidden bg-white">
        <CardContent className="relative pt-0 pb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-full p-2 shadow-lg">
              {empresa.logo_url ? (
                <img
                  src={empresa.logo_url}
                  alt={empresa.razon_social}
                  className="h-32 w-32 rounded-full object-cover"
                />
              ) : (
                <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center">
                  <Building2 className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {empresa.razon_social}
            </h1>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <span>NIT: {empresa.nit}</span>
              <span>•</span>
              <StatusBadge value={empresa.estado} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {empresa.email && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{empresa.email}</p>
                </div>
              </div>
            )}
            {empresa.telefono && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{empresa.telefono}</p>
                </div>
              </div>
            )}
            {empresa.tipo && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium capitalize">{empresa.tipo}</p>
                </div>
              </div>
            )}
            {empresa.pais && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">País</p>
                  <p className="font-medium">{empresa.pais}</p>
                </div>
              </div>
            )}
            {empresa.ciudad && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ciudad</p>
                  <p className="font-medium">{empresa.ciudad}</p>
                </div>
              </div>
            )}
            {empresa.direccion_fiscal && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Dirección Fiscal
                  </p>
                  <p className="font-medium">{empresa.direccion_fiscal}</p>
                </div>
              </div>
            )}
            {empresa.created_at && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Fecha de Registro
                  </p>
                  <p className="font-medium">{formatDate(empresa.created_at)}</p>
                </div>
              </div>
            )}
            {empresa.nombre_ordenes && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Nombre de Órdenes
                  </p>
                  <p className="font-medium">{empresa.nombre_ordenes}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs defaultValue="documentos" className="">
        <TabsList className="grid w-full grid-cols-7 bg-white">
          <TabsTrigger value="documentos">
            <FileText className="mr-1 h-4 w-4" />
            Documentos ({documentos.length})
          </TabsTrigger>
          <TabsTrigger value="contactos">
            <Users className="mr-1 h-4 w-4" />
            Contactos ({contactos.length})
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <User className="mr-1 h-4 w-4" />
            Usuarios ({usuarios.length})
          </TabsTrigger>
          <TabsTrigger value="ordenes">
            <ShoppingCart className="mr-1 h-4 w-4" />
            Órdenes ({documentosComerciales.length})
          </TabsTrigger>
          <TabsTrigger value="activos">
            <Package className="mr-1 h-4 w-4" />
            Activos ({activos.length})
          </TabsTrigger>
          <TabsTrigger value="mantenimientos">
            <Wrench className="mr-1 h-4 w-4" />
            Mantenimientos ({mantenimientos.length})
          </TabsTrigger>
          <TabsTrigger value="montajes">
            <Hammer className="mr-1 h-4 w-4" />
            Montajes ({montajes.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB: DOCUMENTOS ADJUNTOS */}
        <TabsContent value="documentos" className="mt-4 space-y-4 ">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Documentos Adjuntos
            </h2>
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen} >
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
                    <Label>Seleccionar archivo</Label>
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploadingDoc}
                    />
                  </div>
                  {uploadingDoc && (
                    <p className="text-sm text-muted-foreground">
                      Subiendo documento...
                    </p>
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
                  <p className="text-muted-foreground">
                    No hay documentos adjuntos
                  </p>
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
                          onClick={() => window.open(doc.url, "_blank")}
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
                          onClick={() =>
                            setConfirmDeleteDoc({
                              open: true,
                              doc,
                              loading: false,
                            })
                          }
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

        {/* TAB: CONTACTOS */}
        <TabsContent value="contactos" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Contactos</h2>
            <Dialog open={contactOpen} onOpenChange={setContactOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Agregar Contacto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Contacto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={contactForm.nombre}
                      onChange={(e) =>
                        setContactForm((p) => ({
                          ...p,
                          nombre: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) =>
                        setContactForm((p) => ({
                          ...p,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={contactForm.telefono}
                      onChange={(e) =>
                        setContactForm((p) => ({
                          ...p,
                          telefono: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Input
                      value={contactForm.cargo}
                      onChange={(e) =>
                        setContactForm((p) => ({
                          ...p,
                          cargo: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <button
                    className="bg-[#009966] text-white flex items-center gap-x-2 px-3 py-1.5 rounded-lg cursor-pointer mx-auto"
                    onClick={addContact}
                  >
                    Guardar Contacto
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactos.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No hay contactos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    contactos.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nombre}</TableCell>
                        <TableCell>{c.email || "-"}</TableCell>
                        <TableCell>{c.telefono || "-"}</TableCell>
                        <TableCell>{c.cargo || "-"}</TableCell>
                        <TableCell>
                          <StatusBadge value={c.estado} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirmDeleteContacto({
                                open: true,
                                contactoId: c.id,
                                loading: false,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: USUARIOS */}
        <TabsContent value="usuarios" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Usuarios de la Empresa
            </h2>
            <Dialog open={usuarioOpen} onOpenChange={setUsuarioOpen}>
              <DialogTrigger asChild>
                <button 
                className="bg-[#009966] text-white px-3 py-1.5 rounded-lg flex items-center gap-x-2 cursor-pointer"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Agregar Usuario
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Usuario</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={usuarioForm.nombre}
                      onChange={(e) =>
                        setUsuarioForm((p) => ({
                          ...p,
                          nombre: e.target.value,
                        }))
                      }
                      placeholder="Nombre usuario"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={usuarioForm.email}
                      onChange={(e) =>
                        setUsuarioForm((p) => ({
                          ...p,
                          email: e.target.value,
                        }))
                      }
                      placeholder="usuario@empresa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contraseña *</Label>
                    <Input
                      type="password"
                      value={usuarioForm.password}
                      onChange={(e) =>
                        setUsuarioForm((p) => ({
                          ...p,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rol *</Label>
                    <Select
                      value={usuarioForm.rol}
                      onValueChange={(value: "admin" | "tecnico") =>
                        setUsuarioForm((p) => ({ ...p, rol: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    className="bg-[#009966] text-white flex items-center gap-x-2 px-3 py-1.5 rounded-lg cursor-pointer mx-auto disabled:opacity-50"
                    onClick={addUsuario}
                    disabled={savingUsuario}
                  >
                    {savingUsuario ? "Guardando..." : "Guardar Usuario"}
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <section className="flex items-center gap-x-3 ">
          
            <input type="text" placeholder="Buscar por nombre, email..." value={busquedaUsuario} onChange={e => setBusquedaUsuario(e.target.value)} className="px-3 py-2 border rounded-md text-sm bg-white max-w-xs" />
          </section>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No hay usuarios registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtradas.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">
                          {usuario.nombre}
                        </TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              usuario.rol === "admin"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {usuario.rol === "admin"
                              ? "Administrador"
                              : "Técnico"}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(usuario.created_at)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirmDeleteUsuario({
                                open: true,
                                usuario,
                                loading: false,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: DOCUMENTOS COMERCIALES / ÓRDENES */}
        <TabsContent value="ordenes" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Documentos Comerciales
            </h2>
            <Button
              size="sm"
              onClick={() => router.push("/dashboard/dasdocumentos/nuevo")}
            >
              <Plus className="mr-1 h-4 w-4" />
              Nueva Orden
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentosComerciales.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No hay documentos comerciales
                      </TableCell>
                    </TableRow>
                  ) : (
                    documentosComerciales.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          {doc.numero_documento}
                        </TableCell>
                        <TableCell className="capitalize">
                          {doc.tipo_documento.replace("_", " ")}
                        </TableCell>
                        <TableCell>{formatDate(doc.fecha_emision)}</TableCell>
                        <TableCell>
                          <StatusBadge value={doc.estado} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/dashboard/documentos/${doc.id}/totales`
                              )
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: ACTIVOS */}
        <TabsContent value="activos" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Activos Asignados
            </h2>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio Unit.</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Documento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activos.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No hay activos asignados
                      </TableCell>
                    </TableRow>
                  ) : (
                    activos.map((activo, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {activo.nombre}
                        </TableCell>
                        <TableCell className="capitalize">
                          {activo.tipo}
                        </TableCell>
                        <TableCell>{activo.cantidad}</TableCell>
                        <TableCell>
                          $
                          {activo.precio_unitario?.toLocaleString("es-CO", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="font-semibold">
                          $
                          {activo.precio_total?.toLocaleString("es-CO", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/documentos/${activo.documento_id}/totales`
                              )
                            }
                          >
                            {activo.documento_numero}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: MANTENIMIENTOS */}
        <TabsContent value="mantenimientos" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Mantenimientos
            </h2>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Fecha Fin</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>Documento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mantenimientos.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No hay mantenimientos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    mantenimientos.map((mant, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {mant.titulo}
                        </TableCell>
                        <TableCell className="capitalize">{mant.tipo}</TableCell>
                        <TableCell className="capitalize">
                          {mant.prioridad}
                        </TableCell>
                        <TableCell>{formatDate(mant.fecha_inicio)}</TableCell>
                        <TableCell>{formatDate(mant.fecha_final)}</TableCell>
                        <TableCell className="font-semibold">
                          $
                          {(mant.costo || 0).toLocaleString("es-CO", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/documentos/${mant.documento_id}/totales`
                              )
                            }
                          >
                            {mant.documento_numero}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: MONTAJES */}
        <TabsContent value="montajes" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Montajes</h2>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Fecha Fin</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>Documento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {montajes.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No hay montajes registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    montajes.map((mont, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {mont.titulo}
                        </TableCell>
                        <TableCell className="capitalize">{mont.tipo}</TableCell>
                        <TableCell className="capitalize">
                          {mont.prioridad}
                        </TableCell>
                        <TableCell>{formatDate(mont.fecha_inicio)}</TableCell>
                        <TableCell>{formatDate(mont.fecha_final)}</TableCell>
                        <TableCell className="font-semibold">
                          $
                          {(mont.costo || 0).toLocaleString("es-CO", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/documentos/${mont.documento_id}/totales`
                              )
                            }
                          >
                            {mont.documento_numero}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}