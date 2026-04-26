import ModalSeleccionarCotizacion from "./ModalSeleCotizacion"
import { useState } from "react"
import { ActivoDB, ActivoSeleccionado } from "@/types/detallesTypes"

function TabActivos({
  activosDB, activosSeleccionados, onAgregar, onEliminar, onActualizar,
  esCotizacion, onImportarDesdeCotizacion
}: {
  activosDB: ActivoDB[]
  activosSeleccionados: ActivoSeleccionado[]
  onAgregar: (a: ActivoDB) => void
  onEliminar: (id: string) => void
  onActualizar: (id: string, campo: keyof ActivoSeleccionado, valor: any) => void
  esCotizacion?: boolean
  onImportarDesdeCotizacion?: (cotizacionId: string) => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const [modalCotizacion, setModalCotizacion] = useState(false)


  const filtrados = activosDB.filter(a =>
  !activosSeleccionados.some(sel => sel.activo_id === a.id) && (
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.tipo.toLowerCase().includes(busqueda.toLowerCase())
  )
)

  return (
    <div className="space-y-6">

      {/* Botón importar desde cotización — solo en cotizaciones */}
      {esCotizacion && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setModalCotizacion(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600  rounded-md text-sm hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="#fff" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
           <p className="text-white">Importar activos desde cotización</p> 
          </button>
        </div>
      )}

      {modalCotizacion && onImportarDesdeCotizacion && (
        <ModalSeleccionarCotizacion
          onSeleccionar={onImportarDesdeCotizacion}
          onCerrar={() => setModalCotizacion(false)}
        />
      )}

      {/* Activos seleccionados */}
      <div>
        <h3 className="font-semibold text-sm text-gray-700 mb-3">Activos en el documento</h3>
        {activosSeleccionados.length === 0 ? (
          <p className="text-sm text-gray-400">Ningún activo agregado aún</p>
        ) : (
          <div className="space-y-3">
            {activosSeleccionados.map(activo => {
              const meses = Math.floor(activo.dias_totales / 30)
              const diasRestantes = activo.dias_totales % 30
              return (
                <div key={activo.activo_id} className="border rounded-lg p-4 bg-gray-50">
                  {/* Fila 1: nombre + eliminar */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">{activo.nombre}</p>
                      <p className="text-xs text-gray-500">{activo.tipo}</p>
                    </div>
                    <button type="button" onClick={() => onEliminar(activo.activo_id)} className="text-red-400 hover:text-red-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Fila 2: cantidad + fechas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                      <input
                        type="number" min="1"
                        value={activo.cantidad || ''}
                        onChange={e => onActualizar(activo.activo_id, 'cantidad', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Fecha inicio (Colombia)</label>
                      <input
                        type="date"
                        value={activo.fecha_inicio}
                        onChange={e => onActualizar(activo.activo_id, 'fecha_inicio', e.target.value)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Fecha fin (Colombia)</label>
                      <input
                        type="date"
                        value={activo.fecha_fin}
                        onChange={e => onActualizar(activo.activo_id, 'fecha_fin', e.target.value)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Días totales</label>
                      <input
                        type="number" readOnly value={activo.dias_totales}
                        className="w-full px-2 py-1.5 border rounded text-sm bg-white"
                      />
                    </div>
                  </div>

                  {/* Fila 3: precios + descuento */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Precio / día</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={activo.precio_dia || ''}
                        onChange={e => onActualizar(activo.activo_id, 'precio_dia', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Precio / mes</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={activo.precio_mes || ''}
                        onChange={e => onActualizar(activo.activo_id, 'precio_mes', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Descuento ($)</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={activo.descuento || ''}
                        onChange={e => onActualizar(activo.activo_id, 'descuento', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Total</label>
                      <div className="w-full px-2 py-1.5 border rounded text-sm bg-blue-50 font-semibold text-blue-800">
                        ${(Number(activo.precio_total) || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Desglose del cálculo */}
                  {activo.dias_totales > 0 && (
                    <div className="text-xs text-gray-400 bg-white rounded px-3 py-1.5 border">
                      {meses > 0 ? (
                        <>
                          {meses} mes{meses > 1 ? 'es' : ''} × ${(Number(activo.precio_mes) || 0).toLocaleString('es-CO')}
                          {diasRestantes > 0 && <> + {diasRestantes} día{diasRestantes > 1 ? 's' : ''} × ${(Number(activo.precio_dia) || 0).toLocaleString('es-CO')}</>}
                        </>
                      ) : (
                        <>{activo.dias_totales} día{activo.dias_totales > 1 ? 's' : ''} × ${(Number(activo.precio_dia) || 0).toLocaleString('es-CO')}</>
                      )}
                      {activo.cantidad > 1 && <> × {activo.cantidad} und</>}
                      {(Number(activo.descuento) || 0) > 0 && <> − ${(Number(activo.descuento) || 0).toLocaleString('es-CO')} dto</>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Agregar activos */}
      <div>
        <h3 className="font-semibold text-sm text-gray-700 mb-3">Agregar activos disponibles</h3>
        <input
          type="text" placeholder="Buscar activos..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-full px-3 py-2 border rounded-md mb-3 text-sm"
        />
        <div className="max-h-56 overflow-y-auto border rounded-md">
          {filtrados.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">Sin resultados</div>
          ) : filtrados.map(a => (
            <div key={a.id} className="p-3 border-b hover:bg-gray-50 flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{a.nombre}</p>
                <p className="text-xs text-gray-500">
                  {a.tipo} · Stock: {a.stock}
                  {(a.precio_dia > 0 || a.precio_mes > 0) && (
                    <> · <span className="text-blue-600">${a.precio_dia.toLocaleString('es-CO')}/día · ${a.precio_mes.toLocaleString('es-CO')}/mes</span></>
                  )}
                </p>
              </div>
              <button type="button" onClick={() => onAgregar(a)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                + Agregar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


export default TabActivos