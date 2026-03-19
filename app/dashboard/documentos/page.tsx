// app/documentos/page.tsx
'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Database } from '@/types/database.types'

interface DocumentoConEmpresa {
  id: string
  numero_documento: string
  tipo_documento: string
  fecha_emision: string
  estado: string
  observaciones: string | null
  empresa: {
    razon_social: string
    nit: string
  }
  total?: number
}

export default function DocumentosPage() {
  const router = useRouter()
  const [documentos, setDocumentos] = useState<DocumentoConEmpresa[]>([])
  const [loading, setLoading] = useState(true)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [eliminando, setEliminando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [filtros, setFiltros] = useState({
    busqueda: '',
    tipo: '',
    estado: ''
  })

  useEffect(() => {
    cargarDocumentos()
  }, [])

  const cargarDocumentos = async () => {
    try {
      const { data, error } = await supabase
        .from('documentos_comerciales')
        .select(`
          *,
          empresa:empresas(razon_social, nit)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const docsConTotales = await Promise.all(
        (data || []).map(async (doc) => {
          const { data: totalData } = await supabase
            .from('totales_documentos_comerciales')
            .select('total')
            .eq('documento_comercial_id', doc.id)
            .single()

          return {
            id: doc.id,
            numero_documento: doc.numero_documento,
            tipo_documento: doc.tipo_documento,
            fecha_emision: doc.fecha_emision,
            estado: doc.estado,
            observaciones: doc.observaciones,
            empresa: doc.empresa as { razon_social: string; nit: string },
            total: totalData?.total
          }
        })
      )

      setDocumentos(docsConTotales)
      setLoading(false)
    } catch (error) {
      console.error('Error cargando documentos:', error)
      toast.error('Error al cargar los documentos')
      setLoading(false)
    }
  }

  // ── Selección ──────────────────────────────────────────
  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSeleccionarTodos = () => {
    if (seleccionados.size === documentosFiltrados.length) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(documentosFiltrados.map(d => d.id)))
    }
  }

  const limpiarSeleccion = () => {
    setSeleccionados(new Set())
    setConfirmarEliminar(false)
  }

  // ── Eliminación ────────────────────────────────────────
  const handleEliminar = async () => {
    if (seleccionados.size === 0) return
    setEliminando(true)

    try {
      const ids = Array.from(seleccionados)

      // La tabla tiene CASCADE, pero eliminamos en orden por si acaso
      const { error } = await supabase
        .from('documentos_comerciales')
        .delete()
        .in('id', ids)

      if (error) throw error

      toast.success(`${ids.length} documento${ids.length > 1 ? 's' : ''} eliminado${ids.length > 1 ? 's' : ''} correctamente`)
      setSeleccionados(new Set())
      setConfirmarEliminar(false)
      await cargarDocumentos()
    } catch (error) {
      console.error('Error eliminando documentos:', error)
      toast.error('Error al eliminar los documentos')
    } finally {
      setEliminando(false)
    }
  }

  // ── Filtros ────────────────────────────────────────────
  const documentosFiltrados = documentos.filter((doc) => {
    const matchBusqueda =
      doc.numero_documento.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      doc.empresa.razon_social.toLowerCase().includes(filtros.busqueda.toLowerCase())
    const matchTipo = !filtros.tipo || doc.tipo_documento === filtros.tipo
    const matchEstado = !filtros.estado || doc.estado === filtros.estado
    return matchBusqueda && matchTipo && matchEstado
  })

  const todosSeleccionados =
    documentosFiltrados.length > 0 &&
    seleccionados.size === documentosFiltrados.length

  const algunoSeleccionado = seleccionados.size > 0

  // ── Helpers ────────────────────────────────────────────
  const getEstadoColor = (estado: string) => {
    const colores: Record<string, string> = {
      borrador: 'bg-gray-100 text-gray-800',
      enviado: 'bg-blue-100 text-blue-800',
      aprobado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800',
      completado: 'bg-purple-100 text-purple-800'
    }
    return colores[estado] || 'bg-gray-100 text-gray-800'
  }

  const getTipoColor = (tipo: string) => {
    const colores: Record<string, string> = {
      orden_compra: 'bg-indigo-50 text-indigo-700',
      cotizacion: 'bg-yellow-50 text-yellow-700',
      factura: 'bg-emerald-50 text-emerald-700'
    }
    return colores[tipo] || 'bg-gray-50 text-gray-700'
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md">

        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Documentos Comerciales</h1>
            <button
              onClick={() => router.push('/dashboard/documentos/nuevo')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Documento
            </button>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Buscar por número o empresa..."
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Todos los tipos</option>
              <option value="orden_compra">Orden de Compra</option>
              <option value="cotizacion">Cotización</option>
              <option value="factura">Factura</option>
            </select>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="enviado">Enviado</option>
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
              <option value="completado">Completado</option>
            </select>
          </div>
        </div>

        {/* Barra de acciones cuando hay selección */}
        {algunoSeleccionado && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-red-800">
                {seleccionados.size} documento{seleccionados.size > 1 ? 's' : ''} seleccionado{seleccionados.size > 1 ? 's' : ''}
              </span>
              <button
                onClick={limpiarSeleccion}
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                Cancelar selección
              </button>
            </div>

            {!confirmarEliminar ? (
              <button
                onClick={() => setConfirmarEliminar(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar seleccionados
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-700 font-medium">
                  ¿Confirmar eliminación?
                </span>
                <button
                  onClick={handleEliminar}
                  disabled={eliminando}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium disabled:opacity-60 transition-colors"
                >
                  {eliminando ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Sí, eliminar
                    </>
                  )}
                </button>
                <button
                  onClick={() => setConfirmarEliminar(false)}
                  disabled={eliminando}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-white transition-colors disabled:opacity-60"
                >
                  No
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tabla */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Cargando documentos...</p>
            </div>
          ) : documentosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No se encontraron documentos</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {/* Checkbox "seleccionar todos" */}
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={todosSeleccionados}
                      onChange={toggleSeleccionarTodos}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer accent-blue-600"
                      title="Seleccionar todos"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documentosFiltrados.map((doc) => {
                  const estaSeleccionado = seleccionados.has(doc.id)
                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-gray-50 transition-colors ${estaSeleccionado ? 'bg-red-50 hover:bg-red-50' : ''}`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={estaSeleccionado}
                          onChange={() => toggleSeleccion(doc.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer accent-blue-600"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium">{doc.numero_documento}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTipoColor(doc.tipo_documento)}`}>
                          {doc.tipo_documento.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{doc.empresa.razon_social}</p>
                          <p className="text-sm text-gray-500">{doc.empresa.nit}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(doc.fecha_emision + 'T00:00:00').toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getEstadoColor(doc.estado)}`}>
                          {doc.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {doc.total !== undefined ? (
                          <span className="font-semibold">
                            ${Number(doc.total).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => router.push(`/dashboard/documentos/${doc.id}/totales`)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer con conteo */}
        {!loading && documentosFiltrados.length > 0 && (
          <div className="px-6 py-3 border-t bg-gray-50 text-sm text-gray-500 flex justify-between items-center">
            <span>{documentosFiltrados.length} documento{documentosFiltrados.length !== 1 ? 's' : ''}</span>
            {algunoSeleccionado && (
              <span className="text-red-600 font-medium">
                {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}