import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Empresa = {
  id: string
  nit: string
  razon_social: string
}

function ModalSeleccionarCotizacion({
  onSeleccionar,
  onCerrar
}: {
  onSeleccionar: (cotizacionId: string) => void
  onCerrar: () => void
}) {
  const [paso, setPaso] = useState<'cliente' | 'cotizacion'>('cliente')

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [busquedaEmpresa, setBusquedaEmpresa] = useState('')
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true)
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<Empresa | null>(null)

  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [busquedaCotizacion, setBusquedaCotizacion] = useState('')
  const [cargandoCotizaciones, setCargandoCotizaciones] = useState(false)

  // Cargar empresas al montar
  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('empresas')
        .select('id, nit, razon_social')
        .eq('estado', 'activo')
        .order('razon_social', { ascending: true })
      setEmpresas(data || [])
      setCargandoEmpresas(false)
    }
    cargar()
  }, [])

  // Cargar cotizaciones cuando se selecciona una empresa
  const seleccionarEmpresa = async (empresa: Empresa) => {
    setEmpresaSeleccionada(empresa)
    setPaso('cotizacion')
    setCargandoCotizaciones(true)
    const { data } = await supabase
      .from('documentos_comerciales')
      .select('id, numero_documento, fecha_emision, estado')
      .eq('tipo_documento', 'cotizacion')
      .eq('empresa_id', empresa.id)
      .neq('estado', 'rechazado')
      .order('created_at', { ascending: false })
    setCotizaciones(data || [])
    setCargandoCotizaciones(false)
  }

  const volverAClientes = () => {
    setPaso('cliente')
    setEmpresaSeleccionada(null)
    setCotizaciones([])
    setBusquedaCotizacion('')
  }

  const empresasFiltradas = empresas.filter(e =>
    e.razon_social.toLowerCase().includes(busquedaEmpresa.toLowerCase()) ||
    e.nit.toLowerCase().includes(busquedaEmpresa.toLowerCase())
  )

  const cotizacionesFiltradas = cotizaciones.filter(c =>
    c.numero_documento.toLowerCase().includes(busquedaCotizacion.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-3">
            {paso === 'cotizacion' && (
              <button
                onClick={volverAClientes}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="font-semibold text-gray-800">
                {paso === 'cliente' ? 'Seleccionar cliente' : 'Seleccionar cotización'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {paso === 'cliente'
                  ? 'Elige el cliente para ver sus cotizaciones'
                  : empresaSeleccionada?.razon_social}
              </p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Indicador de pasos */}
        <div className="flex px-5 pt-3 gap-2 items-center">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${paso === 'cliente' ? 'text-blue-600' : 'text-green-600'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${paso === 'cliente' ? 'bg-blue-600' : 'bg-green-500'}`}>
              {paso === 'cliente' ? '1' : '✓'}
            </span>
            Cliente
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className={`flex items-center gap-1.5 text-xs font-medium ${paso === 'cotizacion' ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${paso === 'cotizacion' ? 'bg-blue-600' : 'bg-gray-300'}`}>
              2
            </span>
            Cotización
          </div>
        </div>

        {/* Buscador */}
        <div className="px-5 pt-3">
          {paso === 'cliente' ? (
            <input
              key="busqueda-empresa"
              type="text"
              placeholder="Buscar por razón social o NIT..."
              value={busquedaEmpresa}
              onChange={e => setBusquedaEmpresa(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              autoFocus
            />
          ) : (
            <input
              key="busqueda-cotizacion"
              type="text"
              placeholder="Buscar por número de cotización..."
              value={busquedaCotizacion}
              onChange={e => setBusquedaCotizacion(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              autoFocus
            />
          )}
        </div>

        {/* Lista */}
        <div className="px-5 py-3 max-h-80 overflow-y-auto">

          {/* Paso 1: Empresas */}
          {paso === 'cliente' && (
            cargandoEmpresas ? (
              <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                Cargando clientes...
              </div>
            ) : empresasFiltradas.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No hay clientes disponibles</p>
            ) : (
              <div className="space-y-2">
                {empresasFiltradas.map(empresa => (
                  <button
                    key={empresa.id}
                    onClick={() => seleccionarEmpresa(empresa)}
                    className="w-full text-left px-4 py-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <p className="font-semibold text-sm text-gray-800">{empresa.razon_social}</p>
                    <p className="text-xs text-gray-500 mt-0.5">NIT: {empresa.nit}</p>
                  </button>
                ))}
              </div>
            )
          )}

          {/* Paso 2: Cotizaciones */}
          {paso === 'cotizacion' && (
            cargandoCotizaciones ? (
              <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                Cargando cotizaciones...
              </div>
            ) : cotizacionesFiltradas.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">
                {cotizaciones.length === 0
                  ? 'Este cliente no tiene cotizaciones disponibles'
                  : 'Sin resultados para tu búsqueda'}
              </p>
            ) : (
              <div className="space-y-2">
                {cotizacionesFiltradas.map(cot => (
                  <button
                    key={cot.id}
                    onClick={() => { onSeleccionar(cot.id); onCerrar() }}
                    className="w-full text-left px-4 py-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-gray-800">{cot.numero_documento}</p>
                      <div className="text-right">
                        <span className="text-xs text-gray-400 block">{cot.fecha_emision}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                          cot.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                          cot.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{cot.estado}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-gray-50 flex justify-between items-center">
          {paso === 'cotizacion' && (
            <button
              onClick={volverAClientes}
              className="px-4 py-2 text-sm border rounded-md hover:bg-white transition-colors flex items-center gap-1.5"
            >
              ← Cambiar cliente
            </button>
          )}
          <div className={paso === 'cliente' ? 'ml-auto' : ''}>
            <button onClick={onCerrar} className="px-4 py-2 text-sm border rounded-md hover:bg-white">
              Cancelar
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ModalSeleccionarCotizacion