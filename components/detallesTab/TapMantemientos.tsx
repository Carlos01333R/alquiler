import { useState } from "react"
import { toast } from 'sonner'
import { MantenimientoDetalle } from "@/types/detallesTypes"

function TabMantenimientos({
  mantenimientosDB, seleccionados, onAgregar, onEliminar
}: {
  mantenimientosDB: any[]
  seleccionados: MantenimientoDetalle[]
  onAgregar: (m: any) => void
  onEliminar: (id: string) => void
}) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({
    titulo: '', descripcion: '', tipo: 'preventivo', prioridad: 'media',
    fecha_inicio: '', fecha_final: '', actividades_programadas: '', repuestos_requeridos: '', costo: 0
  })

  const agregar = () => {
    if (!form.titulo) { toast.error('Título obligatorio'); return }
    onAgregar({
      mantenimiento_id: `temp-${Date.now()}`, ...form,
      actividades_programadas: form.actividades_programadas.split('\n').filter(Boolean),
      repuestos_requeridos: form.repuestos_requeridos.split('\n').filter(Boolean),
      costo: Number(form.costo) || 0, es_nuevo: true
    })
    setForm({ titulo: '', descripcion: '', tipo: 'preventivo', prioridad: 'media', fecha_inicio: '', fecha_final: '', actividades_programadas: '', repuestos_requeridos: '', costo: 0 })
    setMostrarForm(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-sm text-gray-700 mb-3">Mantenimientos agregados</h3>
        {seleccionados.length === 0 ? (
          <p className="text-sm text-gray-400">Ningún mantenimiento agregado</p>
        ) : (
          <div className="space-y-2">
            {seleccionados.map(m => (
              <div key={m.mantenimiento_id} className="border rounded-md p-3 bg-gray-50 flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{m.titulo}</p>
                  <p className="text-xs text-gray-500">{m.tipo} · {m.prioridad} · ${(Number(m.costo) || 0).toLocaleString('es-CO')}</p>
                </div>
                <button type="button" onClick={() => onEliminar(m.mantenimiento_id)} className="text-red-400 hover:text-red-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        {!mostrarForm ? (
          <button type="button" onClick={() => setMostrarForm(true)} className="px-4 py-2 bg-green-600  rounded-md text-sm hover:bg-green-700">
            <p className="text-white">+ Crear nuevo mantenimiento</p>
          </button>
        ) : (
          <div className="bg-blue-50 p-4 rounded-md space-y-3">
            <h3 className="font-semibold text-sm">Nuevo mantenimiento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-xs font-medium block mb-1">Título *</label><input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} className="w-full px-3 py-2 border rounded text-sm" /></div>
              <div><label className="text-xs font-medium block mb-1">Costo</label><input type="number" min="0" value={form.costo || ''} onChange={e => setForm({...form, costo: parseFloat(e.target.value)||0})} className="w-full px-3 py-2 border rounded text-sm" /></div>
              <div><label className="text-xs font-medium block mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full px-3 py-2 border rounded text-sm">
                  <option value="preventivo">Preventivo</option><option value="correctivo">Correctivo</option><option value="predictivo">Predictivo</option>
                </select>
              </div>
              <div><label className="text-xs font-medium block mb-1">Prioridad</label>
                <select value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})} className="w-full px-3 py-2 border rounded text-sm">
                  <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Crítica</option>
                </select>
              </div>
              <div><label className="text-xs font-medium block mb-1">Fecha inicio</label><input type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} className="w-full px-3 py-2 border rounded text-sm" /></div>
              <div><label className="text-xs font-medium block mb-1">Fecha final</label><input type="date" value={form.fecha_final} onChange={e => setForm({...form, fecha_final: e.target.value})} className="w-full px-3 py-2 border rounded text-sm" /></div>
            </div>
            <div><label className="text-xs font-medium block mb-1">Descripción</label><textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded text-sm" /></div>
            <div><label className="text-xs font-medium block mb-1">Actividades (una por línea)</label><textarea value={form.actividades_programadas} onChange={e => setForm({...form, actividades_programadas: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded text-sm" /></div>
            <div><label className="text-xs font-medium block mb-1">Repuestos (uno por línea)</label><textarea value={form.repuestos_requeridos} onChange={e => setForm({...form, repuestos_requeridos: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded text-sm" /></div>
            <div className="flex gap-2">
              <button type="button" onClick={agregar} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Agregar</button>
              <button type="button" onClick={() => setMostrarForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-white">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {mantenimientosDB.filter(m => !seleccionados.some(s => s.mantenimiento_id === m.id)).length > 0 && (
        <div className="border-t pt-4 hidden">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">Seleccionar existentes</h3>
          <div className="max-h-40 overflow-y-auto border rounded-md">
            {mantenimientosDB.filter(m => !seleccionados.some(s => s.mantenimiento_id === m.id)).map(m => (
              <div key={m.id} className="p-3 border-b hover:bg-gray-50 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{m.titulo}</p>
                  <p className="text-xs text-gray-500">{m.tipo} · {m.prioridad}</p>
                </div>
                <button type="button" onClick={() => onAgregar(m)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Agregar</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TabMantenimientos