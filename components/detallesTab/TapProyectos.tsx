import { useState } from "react"
import { toast } from 'sonner'
import { ProyectoDetalle } from "@/types/detallesTypes"

function TabProyectos({
  seleccionados, onAgregar, onEliminar, titulo, color
}: {
  seleccionados: ProyectoDetalle[]
  onAgregar: (p: any) => void
  onEliminar: (id: string) => void
  titulo: string
  color: 'violet' | 'teal'
}) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({
    titulo: '', descripcion: '', tipo: 'interno', prioridad: 'media',
    fecha_inicio: '', fecha_final: '', actividades_programadas: '', repuestos_requeridos: '', costo: 0
  })

  const colorMap = {
    violet: { btn: 'bg-violet-600 hover:bg-violet-700', bg: 'bg-violet-50', badge: 'text-violet-700' },
    teal:   { btn: 'bg-teal-600 hover:bg-teal-700',   bg: 'bg-teal-50',   badge: 'text-teal-700' },
  }
  const col = colorMap[color]

  const agregar = () => {
    if (!form.titulo) { toast.error('Título obligatorio'); return }
    onAgregar({
      proyecto_id: `temp-${Date.now()}`,
      ...form,
      actividades_programadas: form.actividades_programadas.split('\n').filter(Boolean),
      repuestos_requeridos: form.repuestos_requeridos.split('\n').filter(Boolean),
      costo: Number(form.costo) || 0,
      es_nuevo: true
    })
    setForm({ titulo: '', descripcion: '', tipo: 'interno', prioridad: 'media', fecha_inicio: '', fecha_final: '', actividades_programadas: '', repuestos_requeridos: '', costo: 0 })
    setMostrarForm(false)
  }

  return (
    <div className="space-y-5">
      {/* Lista */}
      <div>
        <h3 className="font-semibold text-sm text-gray-700 mb-3">{titulo} agregados</h3>
        {seleccionados.length === 0 ? (
          <p className="text-sm text-gray-400">Ningún elemento agregado</p>
        ) : (
          <div className="space-y-2">
            {seleccionados.map(p => (
              <div key={p.proyecto_id} className="border rounded-md p-3 bg-gray-50 flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{p.titulo}</p>
                  <p className={`text-xs ${col.badge} mt-0.5`}>{p.tipo} · {p.prioridad} · ${(Number(p.costo) || 0).toLocaleString('es-CO')}</p>
                  {p.descripcion && <p className="text-xs text-gray-400 mt-0.5">{p.descripcion}</p>}
                </div>
                <button type="button" onClick={() => onEliminar(p.proyecto_id)} className="text-red-400 hover:text-red-600 ml-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulario nuevo */}
      <div className="border-t pt-4">
        {!mostrarForm ? (
          <button type="button" onClick={() => setMostrarForm(true)} className={`px-4 py-2 ${col.btn}  rounded-md text-sm`}>
           <p className="text-white">+ Crear nuevo {titulo.toLowerCase().replace('otros ', '')}</p>
          </button>
        ) : (
          <div className={`${col.bg} p-4 rounded-md space-y-3`}>
            <h3 className="font-semibold text-sm">Nuevo {titulo.toLowerCase().replace('otros ', '')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} className="w-full px-3 py-2 border rounded text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Costo</label>
                <input type="number" min="0" value={form.costo || ''} onChange={e => setForm({...form, costo: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border rounded text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full px-3 py-2 border rounded text-sm">
                  <option value="interno">Interno</option>
                  <option value="externo">Externo</option>
                  <option value="consultoría">Consultoría</option>
                  <option value="desarrollo">Desarrollo</option>
                  <option value="infraestructura">Infraestructura</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Prioridad</label>
                <select value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})} className="w-full px-3 py-2 border rounded text-sm">
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Fecha inicio</label>
                <input type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} className="w-full px-3 py-2 border rounded text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Fecha final</label>
                <input type="date" value={form.fecha_final} onChange={e => setForm({...form, fecha_final: e.target.value})} className="w-full px-3 py-2 border rounded text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Descripción</label>
              <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Actividades (una por línea)</label>
              <textarea value={form.actividades_programadas} onChange={e => setForm({...form, actividades_programadas: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Repuestos / recursos (uno por línea)</label>
              <textarea value={form.repuestos_requeridos} onChange={e => setForm({...form, repuestos_requeridos: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={agregar} className={`px-4 py-2 ${col.btn} text-white rounded text-sm`}>Agregar</button>
              <button type="button" onClick={() => setMostrarForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-white">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TabProyectos