// app/documentos/[id]/detalles/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type {
  Database,
  Activo,
  SetActivo,
  Mantenimiento,
  Montaje,
  ActivoSeleccionado,
  MantenimientoDetalle,
  MontajeDetalle
} from '@/types/database.types'

type TabType = 'activos' | 'mantenimientos' | 'montajes'

export default function DetallesDocumentoPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  const documentoId = params.id as string
  const empresaId = searchParams.get('empresa_id')
  const docRelacionadoId = searchParams.get('doc_relacionado_id')

  const [activeTab, setActiveTab] = useState<TabType>('activos')
  const [loading, setLoading] = useState(false)
  const [cargandoRelacion, setCargandoRelacion] = useState(false)
  const [docRelacionadoInfo, setDocRelacionadoInfo] = useState<{ numero_documento: string; tipo_documento: string } | null>(null)

  // Estados para los datos disponibles
  const [activos, setActivos] = useState<(Activo | SetActivo)[]>([])
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [montajes, setMontajes] = useState<Montaje[]>([])

  // Estados para selecciones
  const [activosSeleccionados, setActivosSeleccionados] = useState<ActivoSeleccionado[]>([])
  const [mantenimientosSeleccionados, setMantenimientosSeleccionados] = useState<MantenimientoDetalle[]>([])
  const [montajesSeleccionados, setMontajesSeleccionados] = useState<MontajeDetalle[]>([])

  // Estado del formulario de detalles
  const [formData, setFormData] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    dias_totales: 0,
    lugar_trabajo: '',
    direccion: '',
    ciudad: '',
    observaciones_tecnicas: ''
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  // Si viene doc_relacionado_id, cargar sus datos para pre-llenar
  useEffect(() => {
    if (docRelacionadoId) {
      cargarDatosRelacionados(docRelacionadoId)
    }
  }, [docRelacionadoId])

  useEffect(() => {
    if (formData.fecha_inicio && formData.fecha_fin) {
      const [anioI, mesI, diaI] = formData.fecha_inicio.split('-').map(Number)
      const [anioF, mesF, diaF] = formData.fecha_fin.split('-').map(Number)
      const inicio = new Date(anioI, mesI - 1, diaI)
      const fin = new Date(anioF, mesF - 1, diaF)
      const dias = Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
      setFormData(prev => ({ ...prev, dias_totales: dias > 0 ? dias : 0 }))
    }
  }, [formData.fecha_inicio, formData.fecha_fin])

  const cargarDatos = async () => {
    try {
      const [activosRes, setsRes] = await Promise.all([
        supabase.from('activos').select('*').eq('estado_disponibilidad', 'disponible'),
        supabase.from('sets_activos').select('*').eq('estado_disponibilidad', 'disponible')
      ])
      if (activosRes.data && setsRes.data) {
        setActivos([...activosRes.data, ...setsRes.data])
      }

      const { data: mantData } = await supabase
        .from('mantenimientos')
        .select('*')
        .order('created_at', { ascending: false })
      if (mantData) setMantenimientos(mantData)

      const { data: montData } = await supabase
        .from('montajes')
        .select('*')
        .order('created_at', { ascending: false })
      if (montData) setMontajes(montData)
    } catch (error) {
      console.error('Error cargando datos:', error)
    }
  }

  // ── Carga los datos del documento relacionado y pre-llena el formulario ──
  const cargarDatosRelacionados = async (relId: string) => {
    setCargandoRelacion(true)
    try {
      // 1. Documento base
      const { data: docRel, error: docError } = await supabase
        .from('documentos_comerciales')
        .select('*')
        .eq('id', relId)
        .single()
      if (docError) throw docError

      setDocRelacionadoInfo({
        numero_documento: docRel.numero_documento,
        tipo_documento: docRel.tipo_documento
      })

      // 2. Detalles del documento relacionado
      const { data: detRel, error: detError } = await supabase
        .from('detalles_documentos_comerciales')
        .select('*')
        .eq('documento_comercial_id', relId)
        .maybeSingle()

      if (detError && detError.code !== 'PGRST116') throw detError

      if (detRel) {
        // Pre-llenar formulario de detalles
        setFormData({
          fecha_inicio: detRel.fecha_inicio || '',
          fecha_fin: detRel.fecha_fin || '',
          dias_totales: detRel.dias_totales || 0,
          lugar_trabajo: detRel.lugar_trabajo || '',
          direccion: detRel.direccion || '',
          ciudad: detRel.ciudad || '',
          observaciones_tecnicas: detRel.observaciones_tecnicas || ''
        })

        // Pre-llenar activos seleccionados
        const activosRel = (detRel.activos_seleccionados as unknown as ActivoSeleccionado[]) || []
        if (activosRel.length > 0) {
          setActivosSeleccionados(activosRel)
        }

        // Pre-llenar mantenimientos
        const mantsRel = (detRel.mantenimientos as unknown as MantenimientoDetalle[]) || []
        if (mantsRel.length > 0) {
          // Marcarlos como existentes (no nuevos)
          setMantenimientosSeleccionados(mantsRel.map((m: any) => ({ ...m, es_nuevo: false })))
        }

        // Pre-llenar montajes
        const montsRel = (detRel.montajes as unknown as MontajeDetalle[]) || []
        if (montsRel.length > 0) {
          setMontajesSeleccionados(montsRel.map((m: any) => ({ ...m, es_nuevo: false })))
        }

        toast.success('Datos del documento relacionado cargados correctamente')
      } else {
        toast.info(`El documento ${docRel.numero_documento} no tiene detalles registrados`)
      }
    } catch (error) {
      console.error('Error cargando datos del documento relacionado:', error)
      toast.error('Error al cargar los datos del documento relacionado')
    } finally {
      setCargandoRelacion(false)
    }
  }

  const agregarActivo = (activo: Activo | SetActivo) => {
    const existe = activosSeleccionados.find(a => a.activo_id === activo.id)
    if (existe) { alert('Este activo ya fue agregado'); return }
    setActivosSeleccionados([...activosSeleccionados, {
      activo_id: activo.id,
      nombre: activo.nombre,
      tipo: activo.tipo,
      cantidad: 1,
      precio_unitario: 0,
      precio_total: 0
    }])
  }

  const eliminarActivo = (activoId: string) =>
    setActivosSeleccionados(activosSeleccionados.filter(a => a.activo_id !== activoId))

  const actualizarActivo = (activoId: string, campo: keyof ActivoSeleccionado, valor: any) => {
    setActivosSeleccionados(activosSeleccionados.map(activo => {
      if (activo.activo_id === activoId) {
        const actualizado = { ...activo, [campo]: valor }
        if (campo === 'cantidad' || campo === 'precio_unitario') {
          actualizado.precio_total = Math.round(actualizado.cantidad * actualizado.precio_unitario * 100) / 100
        }
        return actualizado
      }
      return activo
    }))
  }

  const agregarMantenimiento = (mantenimiento: Mantenimiento | any) => {
    const id = mantenimiento.mantenimiento_id || mantenimiento.id
    const existe = mantenimientosSeleccionados.find(m => m.mantenimiento_id === id)
    if (existe) { alert('Este mantenimiento ya fue agregado'); return }
    setMantenimientosSeleccionados([...mantenimientosSeleccionados, {
      mantenimiento_id: id,
      titulo: mantenimiento.titulo,
      descripcion: mantenimiento.descripcion || '',
      tipo: mantenimiento.tipo,
      prioridad: mantenimiento.prioridad || 'media',
      fecha_inicio: mantenimiento.fecha_inicio || '',
      fecha_final: mantenimiento.fecha_final || '',
      actividades_programadas: mantenimiento.actividades_programadas || [],
      repuestos_requeridos: mantenimiento.repuestos_requeridos || [],
      costo: mantenimiento.costo || 0,
      es_nuevo: mantenimiento.es_nuevo || false
    } as any])
  }

  const eliminarMantenimiento = (mantId: string) =>
    setMantenimientosSeleccionados(mantenimientosSeleccionados.filter(m => m.mantenimiento_id !== mantId))

  const actualizarMantenimiento = (mantId: string, campo: keyof MantenimientoDetalle, valor: any) =>
    setMantenimientosSeleccionados(mantenimientosSeleccionados.map(m =>
      m.mantenimiento_id === mantId ? { ...m, [campo]: valor } : m
    ))

  const agregarMontaje = (montaje: Montaje | any) => {
    const id = montaje.montaje_id || montaje.id
    const existe = montajesSeleccionados.find(m => m.montaje_id === id)
    if (existe) { alert('Este montaje ya fue agregado'); return }
    setMontajesSeleccionados([...montajesSeleccionados, {
      montaje_id: id,
      titulo: montaje.titulo,
      descripcion: montaje.descripcion || '',
      tipo: montaje.tipo,
      prioridad: montaje.prioridad || 'media',
      fecha_inicio: montaje.fecha_inicio || '',
      fecha_final: montaje.fecha_final || '',
      actividades_programadas: montaje.actividades_programadas || [],
      repuestos_requeridos: montaje.repuestos_requeridos || [],
      costo: montaje.costo || 0,
      estado: montaje.estado || 'pendiente',
      es_nuevo: montaje.es_nuevo || false
    } as any])
  }

  const eliminarMontaje = (montId: string) =>
    setMontajesSeleccionados(montajesSeleccionados.filter(m => m.montaje_id !== montId))

  const actualizarMontaje = (montId: string, campo: keyof MontajeDetalle, valor: any) =>
    setMontajesSeleccionados(montajesSeleccionados.map(m =>
      m.montaje_id === montId ? { ...m, [campo]: valor } : m
    ))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Guardar mantenimientos nuevos
      const mantenimientosNuevos = mantenimientosSeleccionados.filter((m: any) => m.es_nuevo)
      const mantenimientosIds: string[] = []

      for (const mant of mantenimientosNuevos) {
        const { data: mantGuardado, error } = await supabase
          .from('mantenimientos')
          .insert([{
            titulo: mant.titulo,
            descripcion: mant.descripcion || null,
            tipo: mant.tipo,
            prioridad: mant.prioridad,
            fecha_inicio: mant.fecha_inicio || null,
            fecha_final: mant.fecha_final || null,
            actividades_programadas: mant.actividades_programadas || [],
            repuestos_requeridos: mant.repuestos_requeridos || [],
            cliente_id: empresaId || null,
            nombre_cliente: null
          }])
          .select()
          .single()
        if (error) throw new Error(`Error al guardar mantenimiento: ${mant.titulo} - ${error.message}`)
        if (mantGuardado) mantenimientosIds.push(mantGuardado.id)
      }

      const mantenimientosExistentes = mantenimientosSeleccionados.filter((m: any) => !m.es_nuevo)
      mantenimientosExistentes.forEach((m: any) => mantenimientosIds.push(m.mantenimiento_id))

      // 2. Guardar montajes nuevos
      const montajesNuevos = montajesSeleccionados.filter((m: any) => m.es_nuevo)
      const montajesIds: string[] = []

      for (const mont of montajesNuevos) {
        const { data: montGuardado, error } = await supabase
          .from('montajes')
          .insert([{
            titulo: mont.titulo,
            descripcion: mont.descripcion || null,
            tipo: mont.tipo,
            prioridad: mont.prioridad,
            fecha_inicio: mont.fecha_inicio || null,
            fecha_final: mont.fecha_final || null,
            actividades_programadas: mont.actividades_programadas || [],
            repuestos_requeridos: mont.repuestos_requeridos || [],
            cliente_id: empresaId || null,
            nombre_cliente: null,
            estado: 'pendiente'
          }])
          .select()
          .single()
        if (error) throw new Error(`Error al guardar montaje: ${mont.titulo} - ${error.message}`)
        if (montGuardado) montajesIds.push(montGuardado.id)
      }

      const montajesExistentes = montajesSeleccionados.filter((m: any) => !m.es_nuevo)
      montajesExistentes.forEach((m: any) => montajesIds.push(m.montaje_id))

      // 3. Construir datos de detalle con IDs correctos
      let mantNewIdx = 0
      let montNewIdx = 0

      const detalleData = {
        documento_comercial_id: documentoId,
        ...formData,
        activos_seleccionados: activosSeleccionados,
        mantenimientos: mantenimientosSeleccionados.map((m: any) => ({
          mantenimiento_id: m.es_nuevo ? mantenimientosIds[mantNewIdx++] : m.mantenimiento_id,
          titulo: m.titulo,
          tipo: m.tipo,
          prioridad: m.prioridad,
          fecha_inicio: m.fecha_inicio,
          fecha_final: m.fecha_final,
          costo: m.costo,
          descripcion: m.descripcion,
          actividades_programadas: m.actividades_programadas,
          repuestos_requeridos: m.repuestos_requeridos
        })),
        montajes: montajesSeleccionados.map((m: any) => ({
          montaje_id: m.es_nuevo ? montajesIds[montNewIdx++] : m.montaje_id,
          titulo: m.titulo,
          tipo: m.tipo,
          prioridad: m.prioridad,
          fecha_inicio: m.fecha_inicio,
          fecha_final: m.fecha_final,
          costo: m.costo,
          descripcion: m.descripcion,
          actividades_programadas: m.actividades_programadas,
          repuestos_requeridos: m.repuestos_requeridos
        }))
      }

      const { error: detalleError } = await supabase
        .from('detalles_documentos_comerciales')
        .insert([detalleData])
        .select()
        .single()

      if (detalleError) throw new Error('Error al guardar los detalles del documento')

      // 4. Redirigir a totales (pasando doc relacionado si existe)
      const params = new URLSearchParams()
      if (docRelacionadoId) params.set('doc_relacionado_id', docRelacionadoId)
      router.push(`/dashboard/documentos/${documentoId}/totales${params.toString() ? '?' + params.toString() : ''}`)
    } catch (error: any) {
      console.error('Error en handleSubmit:', error)
      alert(error.message || 'Error al guardar los datos. Por favor intente nuevamente.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-2">Detalles del Documento</h1>

        {/* Banner de documento relacionado */}
        {cargandoRelacion && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center gap-2 text-blue-700 text-sm">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Cargando datos del documento relacionado...
          </div>
        )}
        {docRelacionadoInfo && !cargandoRelacion && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-sm text-green-800">
              Datos pre-llenados desde{' '}
              <strong className="capitalize">{docRelacionadoInfo.tipo_documento.replace('_', ' ')}</strong>
              {' '}<strong>{docRelacionadoInfo.numero_documento}</strong>.
              Puede editar cualquier campo libremente.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información General */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">Información General</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
                <input
                  type="date"
                  value={formData.fecha_inicio}
                  onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fecha Fin</label>
                <input
                  type="date"
                  value={formData.fecha_fin}
                  onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Días Totales</label>
                <input
                  type="number"
                  value={formData.dias_totales}
                  readOnly
                  className="w-full px-3 py-2 border rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Lugar de Trabajo</label>
                <input
                  type="text"
                  value={formData.lugar_trabajo}
                  onChange={(e) => setFormData({ ...formData, lugar_trabajo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Ciudad</label>
                <input
                  type="text"
                  value={formData.ciudad}
                  onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Dirección</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Observaciones Técnicas</label>
              <textarea
                value={formData.observaciones_tecnicas}
                onChange={(e) => setFormData({ ...formData, observaciones_tecnicas: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          {/* Tabs */}
          <div>
            <div className="border-b mb-4">
              <div className="flex gap-4">
                {(['activos', 'mantenimientos', 'montajes'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors capitalize ${
                      activeTab === tab
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'activos' && `Activos (${activosSeleccionados.length})`}
                    {tab === 'mantenimientos' && `Mantenimientos (${mantenimientosSeleccionados.length})`}
                    {tab === 'montajes' && `Montajes (${montajesSeleccionados.length})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-100">
              {activeTab === 'activos' && (
                <TabActivos
                  activos={activos}
                  activosSeleccionados={activosSeleccionados}
                  onAgregar={agregarActivo}
                  onEliminar={eliminarActivo}
                  onActualizar={actualizarActivo}
                />
              )}
              {activeTab === 'mantenimientos' && (
                <TabMantenimientos
                  mantenimientos={mantenimientos}
                  mantenimientosSeleccionados={mantenimientosSeleccionados}
                  onAgregar={agregarMantenimiento}
                  onEliminar={eliminarMantenimiento}
                  onActualizar={actualizarMantenimiento}
                />
              )}
              {activeTab === 'montajes' && (
                <TabMontajes
                  montajes={montajes}
                  montajesSeleccionados={montajesSeleccionados}
                  onAgregar={agregarMontaje}
                  onEliminar={eliminarMontaje}
                  onActualizar={actualizarMontaje}
                />
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Guardando...' : 'Continuar a Totales'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Tab Activos (sin cambios funcionales, solo reutilizado)
// ──────────────────────────────────────────────────────────
function TabActivos({
  activos,
  activosSeleccionados,
  onAgregar,
  onEliminar,
  onActualizar
}: {
  activos: (Activo | SetActivo)[],
  activosSeleccionados: ActivoSeleccionado[]
  onAgregar: (activo: Activo | SetActivo) => void
  onEliminar: (id: string) => void
  onActualizar: (id: string, campo: keyof ActivoSeleccionado, valor: any) => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const activosFiltrados = activos.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.tipo.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Activos Seleccionados</h3>
        {activosSeleccionados.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay activos seleccionados</p>
        ) : (
          <div className="space-y-2">
            {activosSeleccionados.map((activo) => (
              <div key={activo.activo_id} className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-5 gap-4 items-center">
                  <div className="col-span-2">
                    <p className="font-medium">{activo.nombre}</p>
                    <p className="text-sm text-gray-600">{activo.tipo}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={activo.cantidad === 0 ? '' : activo.cantidad}
                      onChange={(e) => onActualizar(activo.activo_id, 'cantidad', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Precio Unit.</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={activo.precio_unitario || ''}
                      onChange={(e) => onActualizar(activo.activo_id, 'precio_unitario', Math.round(parseFloat(e.target.value) * 100) / 100 || 0)}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600">Total</p>
                      <p className="font-semibold">${activo.precio_total.toFixed(2)}</p>
                    </div>
                    <button type="button" onClick={() => onEliminar(activo.activo_id)} className="text-red-600 hover:text-red-800">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold mb-3">Agregar Activos</h3>
        <input
          type="text"
          placeholder="Buscar activos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-3 py-2 border rounded-md mb-3"
        />
        <div className="max-h-64 overflow-y-auto border rounded-md">
          {activosFiltrados.map((activo) => (
            <div key={activo.id} className="p-3 border-b hover:bg-gray-50 flex justify-between items-center">
              <div>
                <p className="font-medium">{activo.nombre}</p>
                <p className="text-sm text-gray-600">{activo.tipo} - Stock: {activo.stock}</p>
              </div>
              <button type="button" onClick={() => onAgregar(activo)} className="px-3 py-1 bg-black text-white rounded-md  text-sm flex items-center gap-2">
                Agregar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Tab Mantenimientos
// ──────────────────────────────────────────────────────────
function TabMantenimientos({
  mantenimientos,
  mantenimientosSeleccionados,
  onAgregar,
  onEliminar,
  onActualizar
}: {
  mantenimientos: Mantenimiento[]
  mantenimientosSeleccionados: MantenimientoDetalle[]
  onAgregar: (mant: Mantenimiento) => void
  onEliminar: (id: string) => void
  onActualizar: (id: string, campo: keyof MantenimientoDetalle, valor: any) => void
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevoMantenimiento, setNuevoMantenimiento] = useState({
    titulo: '', descripcion: '', tipo: 'preventivo' as const, prioridad: 'media' as const,
    fecha_inicio: '', fecha_final: '', actividades_programadas: '', repuestos_requeridos: '', costo: 0
  })

  const agregarNuevoMantenimiento = () => {
    if (!nuevoMantenimiento.titulo) { alert('El título es obligatorio'); return }
    onAgregar({
      mantenimiento_id: `temp-${Date.now()}`,
      titulo: nuevoMantenimiento.titulo,
      descripcion: nuevoMantenimiento.descripcion,
      tipo: nuevoMantenimiento.tipo,
      prioridad: nuevoMantenimiento.prioridad,
      fecha_inicio: nuevoMantenimiento.fecha_inicio,
      fecha_final: nuevoMantenimiento.fecha_final,
      actividades_programadas: nuevoMantenimiento.actividades_programadas
        ? nuevoMantenimiento.actividades_programadas.split('\n').filter(a => a.trim()) : [],
      repuestos_requeridos: nuevoMantenimiento.repuestos_requeridos
        ? nuevoMantenimiento.repuestos_requeridos.split('\n').filter(r => r.trim()) : [],
      costo: Number(nuevoMantenimiento.costo) || 0,
      es_nuevo: true
    } as any)
    setNuevoMantenimiento({ titulo: '', descripcion: '', tipo: 'preventivo', prioridad: 'media', fecha_inicio: '', fecha_final: '', actividades_programadas: '', repuestos_requeridos: '', costo: 0 })
    setMostrarFormulario(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Mantenimientos Agregados</h3>
        {mantenimientosSeleccionados.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay mantenimientos agregados</p>
        ) : (
          <div className="space-y-3">
            {mantenimientosSeleccionados.map((mant: any) => (
              <div key={mant.mantenimiento_id} className="bg-gray-50 p-4 rounded-md border">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-lg">{mant.titulo}</h4>
                    {mant.descripcion && <p className="text-sm text-gray-600 mt-1">{mant.descripcion}</p>}
                  </div>
                  <button type="button" onClick={() => onEliminar(mant.mantenimiento_id)} className="text-red-600 hover:text-red-800 ml-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Tipo', value: mant.tipo },
                    { label: 'Prioridad', value: mant.prioridad },
                    { label: 'Fecha Inicio', value: mant.fecha_inicio || 'N/A' },
                    { label: 'Fecha Final', value: mant.fecha_final || 'N/A' },
                    { label: 'Costo', value: `$${(Number(mant.costo) || 0).toFixed(2)}` }
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <label className="block text-xs text-gray-600 mb-1">{label}</label>
                      <span className="block px-2 py-1 bg-white border rounded text-sm capitalize">{value}</span>
                    </div>
                  ))}
                </div>
                {mant.actividades_programadas?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 font-medium mb-1">Actividades:</p>
                    <ul className="list-disc list-inside text-sm">{mant.actividades_programadas.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        {!mostrarFormulario ? (
          <button type="button" onClick={() => setMostrarFormulario(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Crear Nuevo Mantenimiento
          </button>
        ) : (
          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="font-semibold mb-4">Nuevo Mantenimiento</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Título *</label>
                  <input type="text" value={nuevoMantenimiento.titulo} onChange={(e) => setNuevoMantenimiento({ ...nuevoMantenimiento, titulo: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="Ej: Mantenimiento preventivo bomba" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Costo</label>
                  <input type="number" min="0" step="0.01" value={nuevoMantenimiento.costo || ''} onChange={(e) => setNuevoMantenimiento({ ...nuevoMantenimiento, costo: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-md" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <select value={nuevoMantenimiento.tipo} onChange={(e) => setNuevoMantenimiento({ ...nuevoMantenimiento, tipo: e.target.value as any })} className="w-full px-3 py-2 border rounded-md">
                    <option value="preventivo">Preventivo</option>
                    <option value="correctivo">Correctivo</option>
                    <option value="predictivo">Predictivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prioridad</label>
                  <select value={nuevoMantenimiento.prioridad} onChange={(e) => setNuevoMantenimiento({ ...nuevoMantenimiento, prioridad: e.target.value as any })} className="w-full px-3 py-2 border rounded-md">
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha Inicio</label>
                  <input type="date" value={nuevoMantenimiento.fecha_inicio} onChange={(e) => setNuevoMantenimiento({ ...nuevoMantenimiento, fecha_inicio: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha Final</label>
                  <input type="date" value={nuevoMantenimiento.fecha_final} onChange={(e) => setNuevoMantenimiento({ ...nuevoMantenimiento, fecha_final: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea value={nuevoMantenimiento.descripcion} onChange={(e) => setNuevoMantenimiento({ ...nuevoMantenimiento, descripcion: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-md" placeholder="Descripción del mantenimiento..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Actividades Programadas (una por línea)</label>
                <textarea value={nuevoMantenimiento.actividades_programadas} onChange={(e) => setNuevoMantenimiento({ ...nuevoMantenimiento, actividades_programadas: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Repuestos Requeridos (uno por línea)</label>
                <textarea value={nuevoMantenimiento.repuestos_requeridos} onChange={(e) => setNuevoMantenimiento({ ...nuevoMantenimiento, repuestos_requeridos: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={agregarNuevoMantenimiento} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Agregar Mantenimiento</button>
                <button type="button" onClick={() => setMostrarFormulario(false)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {mantenimientos.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Seleccionar Mantenimientos Existentes</h3>
          <div className="max-h-48 overflow-y-auto border rounded-md">
            {mantenimientos
              .filter(mant => !mantenimientosSeleccionados.some(s => s.mantenimiento_id === mant.id))
              .map((mant) => (
                <div key={mant.id} className="p-3 border-b hover:bg-gray-50 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{mant.titulo}</p>
                    <p className="text-sm text-gray-600">{mant.tipo} - Prioridad: {mant.prioridad}</p>
                  </div>
                  <button type="button" onClick={() => onAgregar(mant)} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">Agregar</button>
                </div>
              ))}
            {mantenimientos.filter(mant => !mantenimientosSeleccionados.some(s => s.mantenimiento_id === mant.id)).length === 0 && (
              <div className="p-4 text-center text-gray-500">Todos los mantenimientos han sido agregados</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Tab Montajes
// ──────────────────────────────────────────────────────────
function TabMontajes({
  montajes,
  montajesSeleccionados,
  onAgregar,
  onEliminar,
  onActualizar
}: {
  montajes: Montaje[]
  montajesSeleccionados: MontajeDetalle[]
  onAgregar: (mont: Montaje) => void
  onEliminar: (id: string) => void
  onActualizar: (id: string, campo: keyof MontajeDetalle, valor: any) => void
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevoMontaje, setNuevoMontaje] = useState({
    titulo: '', descripcion: '', tipo: 'instalacion' as const, prioridad: 'media' as const,
    fecha_inicio: '', fecha_final: '', actividades_programadas: '', repuestos_requeridos: '', costo: 0
  })

  const agregarNuevoMontaje = () => {
    if (!nuevoMontaje.titulo) { alert('El título es obligatorio'); return }
    onAgregar({
      montaje_id: `temp-${Date.now()}`,
      titulo: nuevoMontaje.titulo,
      descripcion: nuevoMontaje.descripcion,
      tipo: nuevoMontaje.tipo,
      prioridad: nuevoMontaje.prioridad,
      fecha_inicio: nuevoMontaje.fecha_inicio,
      fecha_final: nuevoMontaje.fecha_final,
      actividades_programadas: nuevoMontaje.actividades_programadas
        ? nuevoMontaje.actividades_programadas.split('\n').filter(a => a.trim()) : [],
      repuestos_requeridos: nuevoMontaje.repuestos_requeridos
        ? nuevoMontaje.repuestos_requeridos.split('\n').filter(r => r.trim()) : [],
      costo: nuevoMontaje.costo,
      estado: 'pendiente',
      es_nuevo: true
    } as any)
    setNuevoMontaje({ titulo: '', descripcion: '', tipo: 'instalacion', prioridad: 'media', fecha_inicio: '', fecha_final: '', actividades_programadas: '', repuestos_requeridos: '', costo: 0 })
    setMostrarFormulario(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Montajes Agregados</h3>
        {montajesSeleccionados.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay montajes agregados</p>
        ) : (
          <div className="space-y-3">
            {montajesSeleccionados.map((mont: any) => (
              <div key={mont.montaje_id} className="bg-gray-50 p-4 rounded-md border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-lg">{mont.titulo}</h4>
                    {mont.descripcion && <p className="text-sm text-gray-600 mt-1">{mont.descripcion}</p>}
                  </div>
                  <button type="button" onClick={() => onEliminar(mont.montaje_id)} className="text-red-600 hover:text-red-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Tipo', value: mont.tipo },
                    { label: 'Prioridad', value: mont.prioridad },
                    { label: 'Fecha Inicio', value: mont.fecha_inicio || 'N/A' },
                    { label: 'Fecha Final', value: mont.fecha_final || 'N/A' },
                    { label: 'Costo', value: `$${(Number(mont.costo) || 0).toFixed(2)}` }
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <label className="block text-xs text-gray-600 mb-1">{label}</label>
                      <span className="block px-2 py-1 bg-white border rounded text-sm capitalize">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        {!mostrarFormulario ? (
          <button type="button" onClick={() => setMostrarFormulario(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Crear Nuevo Montaje
          </button>
        ) : (
          <div className="bg-green-50 p-4 rounded-md">
            <h3 className="font-semibold mb-4">Nuevo Montaje</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Título *</label>
                  <input type="text" value={nuevoMontaje.titulo} onChange={(e) => setNuevoMontaje({ ...nuevoMontaje, titulo: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="Ej: Instalación de estructura metálica" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <select value={nuevoMontaje.tipo} onChange={(e) => setNuevoMontaje({ ...nuevoMontaje, tipo: e.target.value as any })} className="w-full px-3 py-2 border rounded-md">
                    <option value="instalacion">Instalación</option>
                    <option value="desmontaje">Desmontaje</option>
                    <option value="reubicacion">Reubicación</option>
                    <option value="expansion">Expansión</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prioridad</label>
                  <select value={nuevoMontaje.prioridad} onChange={(e) => setNuevoMontaje({ ...nuevoMontaje, prioridad: e.target.value as any })} className="w-full px-3 py-2 border rounded-md">
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Costo</label>
                  <input type="number" min="0" step="0.01" value={nuevoMontaje.costo} onChange={(e) => setNuevoMontaje({ ...nuevoMontaje, costo: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha Inicio</label>
                  <input type="date" value={nuevoMontaje.fecha_inicio} onChange={(e) => setNuevoMontaje({ ...nuevoMontaje, fecha_inicio: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha Final</label>
                  <input type="date" value={nuevoMontaje.fecha_final} onChange={(e) => setNuevoMontaje({ ...nuevoMontaje, fecha_final: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea value={nuevoMontaje.descripcion} onChange={(e) => setNuevoMontaje({ ...nuevoMontaje, descripcion: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-md" placeholder="Descripción del montaje..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Actividades Programadas (una por línea)</label>
                <textarea value={nuevoMontaje.actividades_programadas} onChange={(e) => setNuevoMontaje({ ...nuevoMontaje, actividades_programadas: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Repuestos/Materiales Requeridos (uno por línea)</label>
                <textarea value={nuevoMontaje.repuestos_requeridos} onChange={(e) => setNuevoMontaje({ ...nuevoMontaje, repuestos_requeridos: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={agregarNuevoMontaje} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Agregar Montaje</button>
                <button type="button" onClick={() => setMostrarFormulario(false)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {montajes.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Seleccionar Montajes Existentes</h3>
          <div className="max-h-48 overflow-y-auto border rounded-md">
            {montajes
              .filter(mont => !montajesSeleccionados.some(s => s.montaje_id === mont.id))
              .map((mont) => (
                <div key={mont.id} className="p-3 border-b hover:bg-gray-50 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{mont.titulo}</p>
                    <p className="text-sm text-gray-600">{mont.tipo} - Estado: {mont.estado}</p>
                  </div>
                  <button type="button" onClick={() => onAgregar(mont)} className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">Agregar</button>
                </div>
              ))}
            {montajes.filter(mont => !montajesSeleccionados.some(s => s.montaje_id === mont.id)).length === 0 && (
              <div className="p-4 text-center text-gray-500">Todos los montajes han sido agregados</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}