// app/dashboard/facturas/page.tsx
'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Documento {
  id: string
  numero_documento: string
  fecha_emision: string
  estado: string
  empresa: { razon_social: string; nit: string }
  total?: number
  empresa_id: string
}

const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  aprobado: 'bg-emerald-100 text-emerald-700',
  rechazado: 'bg-red-100 text-red-700',
  completado: 'bg-purple-100 text-purple-700',
}

export default function FacturasPage() {
  const router = useRouter()
  const [docs, setDocs] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [eliminando, setEliminando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const cargar = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documentos_comerciales')
        .select('*, empresa:empresas(razon_social, nit)')
        .eq('tipo_documento', 'factura')
        .order('created_at', { ascending: false })
      if (error) throw error

      const conTotales = await Promise.all((data || []).map(async (doc) => {
        const { data: t } = await supabase
          .from('totales_documentos_comerciales')
          .select('total').eq('documento_comercial_id', doc.id).single()
        return { ...doc, empresa: doc.empresa as any, total: t?.total }
      }))
      setDocs(conTotales)
    } catch {
      toast.error('Error al cargar facturas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

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
      toast.success(`${ids.length} factura${ids.length > 1 ? 's' : ''} eliminada${ids.length > 1 ? 's' : ''}`)
      setSeleccionados(new Set())
      setConfirmarEliminar(false)
      cargar()
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setEliminando(false)
    }
  }

  const filtradas = docs.filter(d => {
    const q = busqueda.toLowerCase()
    return (
      (!busqueda || d.numero_documento.toLowerCase().includes(q) || d.empresa.razon_social.toLowerCase().includes(q)) &&
      (!filtroEstado || d.estado === filtroEstado)
    )
  })

  const algunoSeleccionado = seleccionados.size > 0
  const todosSeleccionados = filtradas.length > 0 && seleccionados.size === filtradas.length

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md">

        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold">Facturas</h1>
              <p className="text-sm text-gray-500 mt-0.5">Documentos tipo FAC</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/facturas/nuevo')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Factura
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text" placeholder="Buscar por número o empresa..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            />
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="px-3 py-2 border rounded-md text-sm">
              <option value="">Todos los estados</option>
              {['borrador','enviado','aprobado','rechazado','completado'].map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        </div>

        {algunoSeleccionado && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-red-800">{seleccionados.size} seleccionada{seleccionados.size > 1 ? 's' : ''}</span>
              <button onClick={() => { setSeleccionados(new Set()); setConfirmarEliminar(false) }} className="text-xs text-red-600 underline">Cancelar</button>
            </div>
            {!confirmarEliminar ? (
              <button onClick={() => setConfirmarEliminar(true)} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">Eliminar</button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-700">¿Confirmar?</span>
                <button onClick={handleEliminar} disabled={eliminando} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm disabled:opacity-60">{eliminando ? 'Eliminando...' : 'Sí'}</button>
                <button onClick={() => setConfirmarEliminar(false)} className="px-3 py-1.5 border rounded text-sm">No</button>
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Cargando...</div>
          ) : filtradas.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No hay facturas</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                  </th>
                  {['Número','Empresa','Fecha','Estado','Total',''].map(h => (
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
                        <input type="checkbox" checked={sel} onChange={() => toggleSeleccion(doc.id)} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-sm text-gray-800">{doc.numero_documento}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-sm">{doc.empresa.razon_social}</p>
                        <p className="text-xs text-gray-400">{doc.empresa.nit}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(doc.fecha_emision + 'T00:00:00').toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${ESTADO_COLORS[doc.estado] || ''}`}>{doc.estado}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-sm">
                        {doc.total != null ? `$${Number(doc.total).toLocaleString('es-CO', { minimumFractionDigits: 2 })}` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => router.push(`/dashboard/facturas/${doc.id}/totales`)} className="text-emerald-600 hover:text-emerald-800 text-sm font-medium">Ver</button>
                          <button
                            onClick={() => router.push(`/dashboard/facturas/${doc.id}/detalles?empresa_id=${doc.empresa_id}&modo=editar`)}
                            className="text-gray-400 hover:text-emerald-600 transition-colors"
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
            <span>{filtradas.length} factura{filtradas.length !== 1 ? 's' : ''}</span>
            {algunoSeleccionado && <span className="text-red-500 font-medium">{seleccionados.size} seleccionada{seleccionados.size !== 1 ? 's' : ''}</span>}
          </div>
        )}
      </div>
    </div>
  )
}