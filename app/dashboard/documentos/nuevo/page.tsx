// app/documentos/nuevo/page.tsx
'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Database, Empresa } from '@/types/database.types'
import { toast } from "sonner"

interface DocumentoRelacionable {
  id: string
  numero_documento: string
  tipo_documento: string
  fecha_emision: string
  estado: string
  empresa_id: string
  empresa?: { razon_social: string; nit: string }
}

export default function NuevoDocumentoPage() {
  const router = useRouter()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(false)
  const [documentosRelacionables, setDocumentosRelacionables] = useState<DocumentoRelacionable[]>([])
  const [documentoRelacionado, setDocumentoRelacionado] = useState<DocumentoRelacionable | null>(null)
  const [cargandoRelacion, setCargandoRelacion] = useState(false)
  const [busquedaDoc, setBusquedaDoc] = useState('')

  const generarNumeroDocumento = () => {
    const caracteres =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&"
    let resultado = ""
    for (let i = 0; i < 12; i++) {
      resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length))
    }
    return resultado
  }

  const obtenerFechaColombia = () => {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
  }

  const [formData, setFormData] = useState({
    numero_documento: generarNumeroDocumento(),
    tipo_documento: "orden_compra",
    empresa_id: "",
    fecha_emision: obtenerFechaColombia(),
    estado: "borrador",
    observaciones: "",
    documento_relacionado_id: "" as string | null,
  })

  useEffect(() => {
    cargarEmpresas()
  }, [])

  // Cuando cambia tipo_documento a orden_compra, cargar documentos relacionables
  useEffect(() => {
    if (formData.tipo_documento === 'orden_compra') {
      cargarDocumentosRelacionables()
    } else {
      setDocumentosRelacionables([])
      setDocumentoRelacionado(null)
      setFormData(prev => ({ ...prev, documento_relacionado_id: null }))
    }
  }, [formData.tipo_documento])

  const cargarEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('estado', 'activo')
        .order('razon_social')
      if (error) throw error
      setEmpresas(data || [])
    } catch (error) {
      console.error('Error cargando empresas:', error)
      toast.error('Error al cargar las empresas')
    }
  }

  const cargarDocumentosRelacionables = async () => {
    try {
      const { data, error } = await supabase
        .from('documentos_comerciales')
        .select(`
          id, numero_documento, tipo_documento, fecha_emision, estado, empresa_id,
          empresas:empresa_id ( razon_social, nit )
        `)
        .in('tipo_documento', ['cotizacion', 'factura'])
        .order('fecha_emision', { ascending: false })

      if (error) throw error
      // Supabase devuelve la relación como objeto, lo normalizamos
      const docs = (data || []).map((d: any) => ({
        ...d,
        empresa: Array.isArray(d.empresas) ? d.empresas[0] : d.empresas
      }))
      setDocumentosRelacionables(docs)
    } catch (error) {
      console.error('Error cargando documentos relacionables:', error)
      toast.error('Error al cargar documentos disponibles')
    }
  }

  const seleccionarDocumentoRelacionado = async (docId: string) => {
    if (!docId) {
      setDocumentoRelacionado(null)
      setFormData(prev => ({ ...prev, documento_relacionado_id: null, empresa_id: '' }))
      return
    }

    setCargandoRelacion(true)
    try {
      // Cargar documento con todos sus detalles
      const { data: doc, error: docError } = await supabase
        .from('documentos_comerciales')
        .select(`
          *,
          empresas:empresa_id ( razon_social, nit )
        `)
        .eq('id', docId)
        .single()

      if (docError) throw docError

      const docNormalizado = {
        ...doc,
        empresa: Array.isArray(doc.empresas) ? doc.empresas[0] : doc.empresas
      }

      setDocumentoRelacionado(docNormalizado)

      // Pre-llenar empresa y observaciones del documento relacionado
      setFormData(prev => ({
        ...prev,
        documento_relacionado_id: docId,
        empresa_id: doc.empresa_id,
        observaciones: doc.observaciones || prev.observaciones
      }))

      toast.success(`Documento ${doc.numero_documento} seleccionado`)
    } catch (error) {
      console.error('Error cargando documento relacionado:', error)
      toast.error('Error al cargar el documento seleccionado')
    } finally {
      setCargandoRelacion(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.empresa_id) {
      toast.error('Por favor seleccione una empresa')
      return
    }

    setLoading(true)

    try {
      const dataToInsert: any = {
        numero_documento: formData.numero_documento,
        tipo_documento: formData.tipo_documento,
        empresa_id: formData.empresa_id,
        fecha_emision: formData.fecha_emision,
        estado: formData.estado,
        observaciones: formData.observaciones || null,
      }

      // Solo agregar documento_relacionado_id si existe
      if (formData.documento_relacionado_id) {
        dataToInsert.documento_relacionado_id = formData.documento_relacionado_id
      }

      const { data: documento, error } = await supabase
        .from('documentos_comerciales')
        .insert([dataToInsert])
        .select()
        .single()

      if (error) throw error

      // Redirigir pasando también el documento relacionado para pre-llenar detalles
      const params = new URLSearchParams({
        empresa_id: formData.empresa_id
      })
      if (formData.documento_relacionado_id) {
        params.set('doc_relacionado_id', formData.documento_relacionado_id)
      }

      router.push(`/dashboard/documentos/${documento.id}/detalles?${params.toString()}`)
    } catch (error) {
      console.error('Error creando documento:', error)
      toast.error('Error al crear el documento')
      setLoading(false)
    }
  }

  const empresaSeleccionada = empresas.find(e => e.id === formData.empresa_id)

  const documentosFiltrados = documentosRelacionables.filter(doc => {
    const q = busquedaDoc.toLowerCase()
    return (
      doc.numero_documento.toLowerCase().includes(q) ||
      doc.tipo_documento.toLowerCase().includes(q) ||
      (doc.empresa?.razon_social || '').toLowerCase().includes(q)
    )
  })

  const tipoDocLabel = (tipo: string) => {
    const map: Record<string, string> = {
      cotizacion: 'Cotización',
      factura: 'Factura',
      orden_compra: 'Orden de Compra'
    }
    return map[tipo] || tipo
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Nuevo Documento Comercial</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Documento */}
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-4">Información del Documento</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Número de Documento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.numero_documento}
                  onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="OC-2025-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tipo de Documento *
                </label>
                <select
                  value={formData.tipo_documento}
                  onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="orden_compra">Orden de Compra</option>
                  <option value="cotizacion">Cotización</option>
                  <option value="factura">Factura</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Fecha de Emisión *
                </label>
                <input
                  type="date"
                  required
                  value={formData.fecha_emision}
                  onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Estado *
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="borrador">Borrador</option>
                  <option value="enviado">Enviado</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="rechazado">Rechazado</option>
                  <option value="completado">Completado</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN: Documento Relacionado (solo para Orden de Compra) ── */}
          {formData.tipo_documento === 'orden_compra' && (
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-1">Documento Relacionado</h2>
              <p className="text-sm text-gray-500 mb-4">
                Opcional: vincule esta orden de compra a una cotización o factura existente para pre-llenar los datos automáticamente.
              </p>

              {/* Buscador */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Buscar por número, tipo o empresa..."
                  value={busquedaDoc}
                  onChange={(e) => setBusquedaDoc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Lista de documentos */}
              <div className="border rounded-md max-h-56 overflow-y-auto">
                {/* Opción "sin relacionar" */}
                <div
                  onClick={() => seleccionarDocumentoRelacionado('')}
                  className={`px-4 py-3 cursor-pointer border-b flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    !formData.documento_relacionado_id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-600">Sin documento relacionado</p>
                    <p className="text-xs text-gray-400">Crear orden de compra desde cero</p>
                  </div>
                  {!formData.documento_relacionado_id && (
                    <span className="text-blue-600 text-xs font-semibold">✓ Seleccionado</span>
                  )}
                </div>

                {documentosFiltrados.length === 0 && (
                  <div className="px-4 py-6 text-center text-gray-400 text-sm">
                    No se encontraron cotizaciones o facturas disponibles
                  </div>
                )}

                {documentosFiltrados.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => seleccionarDocumentoRelacionado(doc.id)}
                    className={`px-4 py-3 cursor-pointer border-b hover:bg-gray-50 transition-colors ${
                      formData.documento_relacionado_id === doc.id
                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{doc.numero_documento}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            doc.tipo_documento === 'cotizacion'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {tipoDocLabel(doc.tipo_documento)}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">{doc.estado}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {doc.empresa?.razon_social} · {new Date(doc.fecha_emision + 'T00:00:00').toLocaleDateString('es-CO')}
                        </p>
                      </div>
                      {formData.documento_relacionado_id === doc.id && (
                        <span className="text-blue-600 text-xs font-semibold ml-2">✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen del documento relacionado seleccionado */}
              {cargandoRelacion && (
                <div className="mt-3 bg-blue-50 p-3 rounded-md text-sm text-blue-600 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Cargando datos del documento...
                </div>
              )}

              {documentoRelacionado && !cargandoRelacion && (
                <div className="mt-3 bg-green-50 border border-green-200 p-4 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-semibold text-green-700">Documento vinculado correctamente</span>
                  </div>
                  <p className="text-sm text-green-800">
                    Los datos de la empresa, detalles del servicio, activos, mantenimientos, montajes y totales
                    serán cargados automáticamente desde <strong>{documentoRelacionado.numero_documento}</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Selección de Empresa */}
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-4">
              Empresa Cliente *
              {documentoRelacionado && (
                <span className="ml-2 text-sm font-normal text-green-600">
                  (pre-llenada desde documento relacionado)
                </span>
              )}
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Seleccionar Empresa
              </label>
              <select
                required
                value={formData.empresa_id}
                onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleccione una empresa --</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.razon_social} - {empresa.nit}
                  </option>
                ))}
              </select>
            </div>

            {empresaSeleccionada && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium mb-2">Información de la Empresa</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Razón Social:</strong> {empresaSeleccionada.razon_social}</div>
                  <div><strong>NIT:</strong> {empresaSeleccionada.nit}</div>
                  <div><strong>Email:</strong> {empresaSeleccionada.email || 'N/A'}</div>
                  <div><strong>Teléfono:</strong> {empresaSeleccionada.telefono || 'N/A'}</div>
                  <div><strong>Ciudad:</strong> {empresaSeleccionada.ciudad || 'N/A'}</div>
                  <div><strong>Dirección:</strong> {empresaSeleccionada.direccion_fiscal || 'N/A'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones || ''}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Observaciones adicionales del documento..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Guardando...' : 'Continuar a Detalles'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}