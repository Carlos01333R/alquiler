'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Documento {
  id: string
  numero_documento: string
  tipo_documento: string
  fecha_emision: string
  estado: string
  empresa_id: string
  empresa: { razon_social: string; nit: string }
  total?: number
  documento_relacionado_id?: string | null
}

interface Cotizacion {
  id: string
  numero_documento: string
  fecha_emision: string
  estado: string
  empresa: { razon_social: string; nit: string }
  total?: number
}

const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  aprobado: 'bg-emerald-100 text-emerald-700',
  rechazado: 'bg-red-100 text-red-700',
  completado: 'bg-purple-100 text-purple-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
  en_ejecucion: 'bg-blue-100 text-blue-800',
  realizada: 'bg-green-100 text-green-700',
  finalizada: 'bg-purple-100 text-purple-700',
}

const ESTADOS_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  completado: 'Completado',
  pendiente: 'Pendiente',
  en_ejecucion: 'En ejecución',
  realizada: 'Realizada',
  finalizada: 'Finalizada',
}

const ESTADOS_MANUALES = ['pendiente', 'en_ejecucion', 'realizada', 'finalizada']

export default function OrdenesPage() {
  const router = useRouter()
  const [ordenes, setOrdenes] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [eliminando, setEliminando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [sincronizando, setSincronizando] = useState(false)

  // Modal cotizaciones
  const [modalAbierto, setModalAbierto] = useState(false)
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loadingModal, setLoadingModal] = useState(false)
  const [busquedaModal, setBusquedaModal] = useState('')

  const cargarOrdenes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documentos_comerciales')
        .select('*, empresa:empresas(razon_social, nit)')
        .eq('tipo_documento', 'orden_compra')
        .order('created_at', { ascending: false })
      if (error) throw error

      const conTotales = await Promise.all((data || []).map(async (doc) => {
        const { data: t } = await supabase
          .from('totales_documentos_comerciales')
          .select('total').eq('documento_comercial_id', doc.id).single()
        return { ...doc, empresa: doc.empresa as any, total: t?.total }
      }))
      setOrdenes(conTotales)
    } catch (e) {
      toast.error('Error al cargar órdenes de compra')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargarOrdenes() }, [cargarOrdenes])

  const cargarCotizaciones = async () => {
    setLoadingModal(true)
    try {
      const { data, error } = await supabase
        .from('documentos_comerciales')
        .select('*, empresa:empresas(razon_social, nit)')
        .eq('tipo_documento', 'cotizacion')
        .not('estado', 'eq', 'rechazado')
        .order('created_at', { ascending: false })
      if (error) throw error

      const conTotales = await Promise.all((data || []).map(async (doc) => {
        const { data: t } = await supabase
          .from('totales_documentos_comerciales')
          .select('total').eq('documento_comercial_id', doc.id).single()
        return { ...doc, empresa: doc.empresa as any, total: t?.total }
      }))
      setCotizaciones(conTotales)
    } catch (e) {
      toast.error('Error al cargar cotizaciones')
    } finally {
      setLoadingModal(false)
    }
  }

  const abrirModal = () => {
    setModalAbierto(true)
    cargarCotizaciones()
  }

  const seleccionarCotizacion = (cotId: string) => {
    setModalAbierto(false)
    router.push(`/dashboard/ordenes/nuevo?doc_relacionado_id=${cotId}`)
  }

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('documentos_comerciales')
        .update({ estado: nuevoEstado })
        .eq('id', id)
      if (error) throw error
      toast.success('Estado actualizado')
      setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado: nuevoEstado } : o))
    } catch (e) {
      toast.error('Error al actualizar estado')
    }
  }

  const sincronizarEstados = async () => {
    setSincronizando(true)
    try {
      const { error } = await supabase.rpc('sincronizar_estados_documentos')
      if (error) throw error
      toast.success('Estados sincronizados correctamente')
      cargarOrdenes()
    } catch (e) {
      toast.error('Error al sincronizar estados')
    } finally {
      setSincronizando(false)
    }
  }

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleTodos = () => {
    if (seleccionados.size === filtradas.length) setSeleccionados(new Set())
    else setSeleccionados(new Set(filtradas.map(d => d.id)))
  }

  const handleEliminar = async () => {
    setEliminando(true)
    try {
      const ids = Array.from(seleccionados)
      const { error } = await supabase.from('documentos_comerciales').delete().in('id', ids)
      if (error) throw error
      toast.success(`${ids.length} orden${ids.length > 1 ? 'es' : ''} eliminada${ids.length > 1 ? 's' : ''}`)
      setSeleccionados(new Set())
      setConfirmarEliminar(false)
      cargarOrdenes()
    } catch (e) {
      toast.error('Error al eliminar')
    } finally {
      setEliminando(false)
    }
  }

  const filtradas = ordenes.filter(d => {
    const q = busqueda.toLowerCase()
    return (
      (!busqueda || d.numero_documento.toLowerCase().includes(q) || d.empresa.razon_social.toLowerCase().includes(q)) &&
      (!filtroEstado || d.estado === filtroEstado)
    )
  })

  const cotizacionesFiltradas = cotizaciones.filter(c => {
    const q = busquedaModal.toLowerCase()
    return !busquedaModal || c.numero_documento.toLowerCase().includes(q) || c.empresa.razon_social.toLowerCase().includes(q)
  })

  const algunoSeleccionado = seleccionados.size > 0
  const todosSeleccionados = filtradas.length > 0 && seleccionados.size === filtradas.length

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md">

        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold">Órdenes de Compra</h1>
              <p className="text-sm text-gray-500 mt-0.5">Documentos tipo OC</p>
            </div>
            <div className="flex gap-2">
              {/* Botón sincronizar */}
              <button
                onClick={sincronizarEstados}
                disabled={sincronizando}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
                title="Recalcular estados según fechas de inicio y fin"
              >
                <svg
                  className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
              </button>

              <button
                onClick={abrirModal}
                className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Agregar desde cotización
              </button>

              <button
                onClick={() => router.push('/dashboard/ordenes/nuevo')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva OC
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text" placeholder="Buscar por número o empresa..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            />
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Barra de selección */}
        {algunoSeleccionado && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-red-800">{seleccionados.size} seleccionada{seleccionados.size > 1 ? 's' : ''}</span>
              <button onClick={() => { setSeleccionados(new Set()); setConfirmarEliminar(false) }} className="text-xs text-red-600 underline">Cancelar</button>
            </div>
            {!confirmarEliminar ? (
              <button onClick={() => setConfirmarEliminar(true)} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-700 font-medium">¿Confirmar?</span>
                <button onClick={handleEliminar} disabled={eliminando} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm disabled:opacity-60">
                  {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button onClick={() => setConfirmarEliminar(false)} className="px-3 py-1.5 border rounded text-sm">No</button>
              </div>
            )}
          </div>
        )}

        {/* Tabla */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Cargando...</div>
          ) : filtradas.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 mb-2">No hay órdenes de compra</p>
              <button onClick={abrirModal} className="text-sm text-indigo-600 underline">Crear desde una cotización</button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                  </th>
                  {['Número', 'Empresa', 'Fecha', 'Estado', 'Total', ''].map(h => (
                    <th key={h} className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase ${h === 'Total' || h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtradas.map(doc => {
                  const sel = seleccionados.has(doc.id)
                  return (
                    <tr key={doc.id} className={`hover:bg-gray-50 transition-colors ${sel ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={sel} onChange={() => toggleSeleccion(doc.id)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold text-gray-800">{doc.numero_documento}</span>
                        {doc.documento_relacionado_id && (
                          <span className="ml-2 text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">desde COT</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-sm">{doc.empresa.razon_social}</p>
                        <p className="text-xs text-gray-400">{doc.empresa.nit}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(doc.fecha_emision + 'T00:00:00').toLocaleDateString('es-CO')}
                      </td>

                      {/* Estado editable */}
                      <td className="px-6 py-4">
                        <select
                          value={doc.estado}
                          onChange={e => cambiarEstado(doc.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${ESTADO_COLORS[doc.estado] || 'bg-gray-100 text-gray-700'}`}
                        >
                          {ESTADOS_MANUALES.map(e => (
                            <option key={e} value={e}>{ESTADOS_LABEL[e]}</option>
                          ))}
                          {/* Mostrar estado actual si no está en la lista manual (ej: borrador, enviado) */}
                          {!ESTADOS_MANUALES.includes(doc.estado) && (
                            <option value={doc.estado}>{ESTADOS_LABEL[doc.estado] || doc.estado}</option>
                          )}
                        </select>
                      </td>

                      <td className="px-6 py-4 text-right font-semibold text-sm">
                        {doc.total != null
                          ? `$${Number(doc.total).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => router.push(`/dashboard/ordenes/${doc.id}/totales`)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Ver</button>
                          <button
                            onClick={() => router.push(`/dashboard/ordenes/${doc.id}/detalles?empresa_id=${doc.empresa_id}&modo=editar`)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filtradas.length > 0 && (
          <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-400 flex justify-between">
            <span>{filtradas.length} orden{filtradas.length !== 1 ? 'es' : ''}</span>
            {algunoSeleccionado && <span className="text-red-500 font-medium">{seleccionados.size} seleccionada{seleccionados.size !== 1 ? 's' : ''}</span>}
          </div>
        )}
      </div>

      {/* Modal cotizaciones */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Seleccionar Cotización</h2>
                <p className="text-sm text-gray-500">La OC heredará todos los datos de la cotización</p>
              </div>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 border-b">
              <input
                type="text" placeholder="Buscar cotización..." value={busquedaModal}
                onChange={e => setBusquedaModal(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto flex-1">
              {loadingModal ? (
                <div className="p-8 text-center text-gray-400 text-sm">Cargando cotizaciones...</div>
              ) : cotizacionesFiltradas.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No hay cotizaciones disponibles</div>
              ) : (
                cotizacionesFiltradas.map(cot => (
                  <div
                    key={cot.id}
                    onClick={() => seleccionarCotizacion(cot.id)}
                    className="px-5 py-4 border-b hover:bg-indigo-50 cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-semibold text-sm">{cot.numero_documento}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${ESTADO_COLORS[cot.estado] || ''}`}>{cot.estado}</span>
                      </div>
                      <p className="text-sm text-gray-600">{cot.empresa.razon_social}</p>
                      <p className="text-xs text-gray-400">{new Date(cot.fecha_emision + 'T00:00:00').toLocaleDateString('es-CO')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {cot.total != null && (
                        <span className="text-sm font-semibold text-gray-700">
                          ${Number(cot.total).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 text-right">
              <button onClick={() => setModalAbierto(false)} className="px-4 py-2 border rounded-md text-sm hover:bg-white transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}