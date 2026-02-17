// app/documentos/page.tsx
'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

      // Cargar totales para cada documento
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
      alert('Error al cargar los documentos')
      setLoading(false)
    }
  }

  const documentosFiltrados = documentos.filter((doc) => {
    const matchBusqueda = 
      doc.numero_documento.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      doc.empresa.razon_social.toLowerCase().includes(filtros.busqueda.toLowerCase())
    
    const matchTipo = !filtros.tipo || doc.tipo_documento === filtros.tipo
    const matchEstado = !filtros.estado || doc.estado === filtros.estado

    return matchBusqueda && matchTipo && matchEstado
  })

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

  return (
    <div className="max-w-7xl mx-auto ">
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
            <div>
              <input
                type="text"
                placeholder="Buscar por número o empresa..."
                value={filtros.busqueda}
                onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
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
            </div>
            <div>
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
        </div>

        {/* Lista de documentos */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documentosFiltrados.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium">{doc.numero_documento}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="capitalize">{doc.tipo_documento.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{doc.empresa.razon_social}</p>
                        <p className="text-sm text-gray-500">{doc.empresa.nit}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(doc.fecha_emision).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(doc.estado)}`}>
                        {doc.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {doc.total !== undefined ? (
                        <span className="font-semibold">${doc.total.toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => router.push(`/dashboard/documentos/${doc.id}/totales`)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
