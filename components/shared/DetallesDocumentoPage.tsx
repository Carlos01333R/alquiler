
'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import TabActivos from '../detallesTab/TapActivos'
import TabMantenimientos from '../detallesTab/TapMantemientos'
import TabMontajes from '../detallesTab/TapMontajes'
import TabProyectos from '../detallesTab/TapProyectos'
import { ActivoDB, ActivoSeleccionado, MantenimientoDetalle, MontajeDetalle, ProyectoDetalle } from '@/types/detallesTypes'
import { calcularDias, calcularPrecioActivo } from '@/utils/calculators'

type OtroProyectoDetalle = ProyectoDetalle

type TabType = 'activos' | 'mantenimientos' | 'montajes' | 'proyectos' | 'otros_proyectos'

function obtenerFechaColombia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}
interface Props {
  backPath: string 
  nextBasePath: string 
}

export default function DetallesDocumentoPage({ backPath, nextBasePath }: Props) {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  const documentoId = params.id as string
  const empresaId = searchParams.get('empresa_id')
  const docRelacionadoId = searchParams.get('doc_relacionado_id')
  const modoEditar = searchParams.get('modo') === 'editar'
  // IDs adicionales de cotizaciones a combinar (solo en ordenes, separados por coma)
  const cotizacionesExtra = (searchParams.get('cotizaciones_extra') || '').split(',').filter(Boolean)

  const [activeTab, setActiveTab] = useState<TabType>('activos')
  const [loading, setLoading] = useState(false)
  const [cargandoRelacion, setCargandoRelacion] = useState(false)
  const [docRelacionadoInfo, setDocRelacionadoInfo] = useState<{ numero_documento: string; tipo_documento: string } | null>(null)
  const [tipoDocumento, setTipoDocumento] = useState<string>('')

  const [activosDB, setActivosDB] = useState<ActivoDB[]>([])
  const [mantenimientosDB, setMantenimientosDB] = useState<any[]>([])
  const [montajesDB, setMontajesDB] = useState<any[]>([])

  const [activosSeleccionados, setActivosSeleccionados] = useState<ActivoSeleccionado[]>([])
  const [mantenimientosSeleccionados, setMantenimientosSeleccionados] = useState<MantenimientoDetalle[]>([])
  const [montajesSeleccionados, setMontajesSeleccionados] = useState<MontajeDetalle[]>([])
  const [proyectosSeleccionados, setProyectosSeleccionados] = useState<ProyectoDetalle[]>([])
  const [otrosProyectosSeleccionados, setOtrosProyectosSeleccionados] = useState<OtroProyectoDetalle[]>([])
  // Rastrear cotizaciones origen (id + número) para guardarlas en el detalle
  const [cotizacionesOrigen, setCotizacionesOrigen] = useState<{ id: string; numero_documento: string }[]>([])

  const [formData, setFormData] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    dias_totales: 0,
    lugar_trabajo: '',
    direccion: '',
    ciudad: '',
    observaciones_tecnicas: ''
  })

  // ── useEffects ─────────────────────────────────────────────────────────────
  useEffect(() => { cargarDatos() }, [])

  useEffect(() => {
    if (modoEditar) cargarDetallesExistentes()
  }, [modoEditar])

  useEffect(() => {
    if (docRelacionadoId) cargarDatosRelacionados(docRelacionadoId)
  }, [docRelacionadoId])

  useEffect(() => {
    if (cotizacionesExtra.length > 0) {
      cotizacionesExtra.forEach(id => cargarYCombinarCotizacion(id))
    }
  }, [])

  useEffect(() => {
    if (formData.fecha_inicio && formData.fecha_fin) {
      const dias = calcularDias(formData.fecha_inicio, formData.fecha_fin)
      setFormData(prev => ({ ...prev, dias_totales: dias }))
    }
  }, [formData.fecha_inicio, formData.fecha_fin])

  // ── Cargar detalles existentes (modo editar) ──────────────────────────────
  const cargarDetallesExistentes = async () => {
    try {
      const { data: det } = await supabase
        .from('detalles_documentos_comerciales')
        .select('*')
        .eq('documento_comercial_id', documentoId)
        .maybeSingle()

      if (!det) return  // documento nuevo sin detalles aún, no pasa nada

      setFormData({
        fecha_inicio: det.fecha_inicio || '',
        fecha_fin: det.fecha_fin || '',
        dias_totales: det.dias_totales || 0,
        lugar_trabajo: det.lugar_trabajo || '',
        direccion: det.direccion || '',
        ciudad: det.ciudad || '',
        observaciones_tecnicas: det.observaciones_tecnicas || ''
      })

      const acts = (det.activos_seleccionados as unknown as ActivoSeleccionado[]) || []
      if (acts.length) setActivosSeleccionados(acts.map(a => normalizarActivo(a as any)))

      const mants = (det.mantenimientos as unknown as MantenimientoDetalle[]) || []
      if (mants.length) setMantenimientosSeleccionados(mants.map(m => ({ ...m, es_nuevo: false })))

      const monts = (det.montajes as unknown as MontajeDetalle[]) || []
      if (monts.length) setMontajesSeleccionados(monts.map(m => ({ ...m, es_nuevo: false })))

      const projs = ((det as any).proyectos as unknown as ProyectoDetalle[]) || []
      if (projs.length) setProyectosSeleccionados(projs.map(p => ({ ...p, es_nuevo: false })))

      const otrosProjs = ((det as any).otros_proyectos as unknown as OtroProyectoDetalle[]) || []
      if (otrosProjs.length) setOtrosProyectosSeleccionados(otrosProjs.map(p => ({ ...p, es_nuevo: false })))

      const cotsOrigen = ((det as any).cotizaciones_origen as { id: string; numero_documento: string }[]) || []
      if (cotsOrigen.length) setCotizacionesOrigen(cotsOrigen)
    } catch (e) {
      console.error('Error cargando detalles existentes:', e)
    }
  }

  // ── Combinar datos de cotizacion extra (multi-selección) ─────────────────────
  const cargarYCombinarCotizacion = async (cotId: string) => {
    try {
      // Obtener número de documento de esta cotización
      const { data: docCot } = await supabase
        .from('documentos_comerciales')
        .select('numero_documento, tipo_documento')
        .eq('id', cotId)
        .single()

      if (docCot) {
        setCotizacionesOrigen(prev => {
          if (prev.find(x => x.id === cotId)) return prev
          return [...prev, { id: cotId, numero_documento: docCot.numero_documento }]
        })
      }

      const { data: det } = await supabase
        .from('detalles_documentos_comerciales')
        .select('activos_seleccionados, mantenimientos, montajes, proyectos, otros_proyectos')
        .eq('documento_comercial_id', cotId)
        .maybeSingle()
      if (!det) return

      // Combinar activos — obtener precios actualizados desde DB
      const acts = (det.activos_seleccionados as unknown as ActivoSeleccionado[]) || []
      if (acts.length) {
        const ids = acts.map(a => a.activo_id)
        const { data: activosDB } = await supabase.from('activos').select('id, nombre, tipo, stock, precio_dia, precio_mes').in('id', ids)
        const { data: setsDB } = await supabase.from('sets_activos').select('id, nombre, tipo, stock, precio_dia, precio_mes').in('id', ids)
        const todosDB = [...(activosDB || []), ...(setsDB || [])] as ActivoDB[]

        setActivosSeleccionados(prev => {
          const nuevos = acts
            .filter(a => !prev.find(p => p.activo_id === a.activo_id))
            .map(a => {
              const db = todosDB.find(d => d.id === a.activo_id)
              return normalizarActivo({
                activo_id: a.activo_id,
                nombre: a.nombre || db?.nombre || '',
                tipo: a.tipo || db?.tipo || '',
                cantidad: Number(a.cantidad) || 1,
                fecha_inicio: '',
                fecha_fin: '',
                dias_totales: 0,
                precio_dia: Number(a.precio_dia) || db?.precio_dia || 0,
                precio_mes: Number(a.precio_mes) || db?.precio_mes || 0,
                descuento: Number(a.descuento) || 0,
                precio_total: 0,
              }, true)
            })
          return [...prev, ...nuevos]
        })
      }

      // Combinar mantenimientos
      const mants = (det.mantenimientos as unknown as MantenimientoDetalle[]) || []
      if (mants.length) {
        setMantenimientosSeleccionados(prev => {
          const nuevos = mants.filter(m => !prev.find(p => p.mantenimiento_id === m.mantenimiento_id))
          return [...prev, ...nuevos.map(m => ({ ...m, es_nuevo: false }))]
        })
      }

      // Combinar montajes
      const monts = (det.montajes as unknown as MontajeDetalle[]) || []
      if (monts.length) {
        setMontajesSeleccionados(prev => {
          const nuevos = monts.filter(m => !prev.find(p => p.montaje_id === m.montaje_id))
          return [...prev, ...nuevos.map(m => ({ ...m, es_nuevo: false }))]
        })
      }

      // Combinar proyectos
      const projs = ((det as any).proyectos as unknown as ProyectoDetalle[]) || []
      if (projs.length) {
        setProyectosSeleccionados(prev => {
          const nuevos = projs.filter(p => !prev.find(x => x.proyecto_id === p.proyecto_id))
          return [...prev, ...nuevos.map(p => ({ ...p, es_nuevo: false }))]
        })
      }

      // Combinar otros proyectos
      const otrosProjs = ((det as any).otros_proyectos as unknown as OtroProyectoDetalle[]) || []
      if (otrosProjs.length) {
        setOtrosProyectosSeleccionados(prev => {
          const nuevos = otrosProjs.filter(p => !prev.find(x => x.proyecto_id === p.proyecto_id))
          return [...prev, ...nuevos.map(p => ({ ...p, es_nuevo: false }))]
        })
      }

      toast.success(`Datos combinados desde cotización adicional`)
    } catch (e) {
      console.error('Error combinando cotización extra:', e)
    }
  }

  // ── Actualizar fecha_inicio/fin del form desde el rango de activos ──────────
  const actualizarFechasDesdeActivos = (lista: ActivoSeleccionado[]) => {
    const fechasInicio = lista.map(a => a.fecha_inicio).filter(Boolean)
    const fechasFin = lista.map(a => a.fecha_fin).filter(Boolean)
    if (fechasInicio.length === 0) return
    const minInicio = fechasInicio.sort()[0]
    const maxFin = fechasFin.sort().reverse()[0]
    setFormData(prev => ({
      ...prev,
      fecha_inicio: minInicio,
      fecha_fin: maxFin,
      dias_totales: calcularDias(minInicio, maxFin)
    }))
  }

  // ── Carga datos ────────────────────────────────────────────────────────────
  const cargarDatos = async () => {
    // Cargar tipo de documento actual
    const { data: docData } = await supabase
      .from('documentos_comerciales')
      .select('tipo_documento')
      .eq('id', documentoId)
      .single()
    if (docData) setTipoDocumento(docData.tipo_documento)

    const [activosRes, setsRes, mantRes, montRes] = await Promise.all([
      supabase.from('activos').select('id, nombre, tipo, stock, precio_dia, precio_mes').eq('estado_disponibilidad', 'disponible'),
      supabase.from('sets_activos').select('id, nombre, tipo, stock, precio_dia, precio_mes').eq('estado_disponibilidad', 'disponible'),
      supabase.from('mantenimientos').select('*').order('created_at', { ascending: false }),
      supabase.from('montajes').select('*').order('created_at', { ascending: false }),
    ])
    if (activosRes.data && setsRes.data) setActivosDB([...activosRes.data, ...setsRes.data] as ActivoDB[])
    if (mantRes.data) setMantenimientosDB(mantRes.data)
    if (montRes.data) setMontajesDB(montRes.data)
  }

  const cargarDatosRelacionados = async (relId: string) => {
    setCargandoRelacion(true)
    try {
      const { data: docRel } = await supabase.from('documentos_comerciales').select('*').eq('id', relId).single()
      if (docRel) {
        setDocRelacionadoInfo({ numero_documento: docRel.numero_documento, tipo_documento: docRel.tipo_documento })
        // Registrar como cotización origen si es cotizacion
        if (docRel.tipo_documento === 'cotizacion') {
          setCotizacionesOrigen(prev => {
            if (prev.find(x => x.id === relId)) return prev
            return [...prev, { id: relId, numero_documento: docRel.numero_documento }]
          })
        }
      }

      const { data: detRel } = await supabase
        .from('detalles_documentos_comerciales')
        .select('*').eq('documento_comercial_id', relId).maybeSingle()

      if (detRel) {
        setFormData({
          fecha_inicio: detRel.fecha_inicio || '',
          fecha_fin: detRel.fecha_fin || '',
          dias_totales: detRel.dias_totales || 0,
          lugar_trabajo: detRel.lugar_trabajo || '',
          direccion: detRel.direccion || '',
          ciudad: detRel.ciudad || '',
          observaciones_tecnicas: detRel.observaciones_tecnicas || ''
        })
        const acts = (detRel.activos_seleccionados as unknown as ActivoSeleccionado[]) || []
        if (acts.length) setActivosSeleccionados(acts.map(a => normalizarActivo(a as any)))
        const mants = (detRel.mantenimientos as unknown as MantenimientoDetalle[]) || []
        if (mants.length) setMantenimientosSeleccionados(mants.map(m => ({ ...m, es_nuevo: false })))
        const monts = (detRel.montajes as unknown as MontajeDetalle[]) || []
        if (monts.length) setMontajesSeleccionados(monts.map(m => ({ ...m, es_nuevo: false })))

        const projs = ((detRel as any).proyectos as unknown as ProyectoDetalle[]) || []
        if (projs.length) setProyectosSeleccionados(projs.map(p => ({ ...p, es_nuevo: false })))

        const otrosProjs = ((detRel as any).otros_proyectos as unknown as OtroProyectoDetalle[]) || []
        if (otrosProjs.length) setOtrosProyectosSeleccionados(otrosProjs.map(p => ({ ...p, es_nuevo: false })))

        toast.success('Datos del documento relacionado cargados')
      } else {
        toast.info('El documento relacionado no tiene detalles aún')
      }
    } catch (e) {
      toast.error('Error al cargar datos del documento relacionado')
    } finally {
      setCargandoRelacion(false)
    }
  }


  const normalizarActivo = (a: Partial<ActivoSeleccionado> & { activo_id: string }, mantenerFechasVacias = false): ActivoSeleccionado => {
    const hoy = obtenerFechaColombia()
    const fi = a.fecha_inicio !== undefined ? (a.fecha_inicio || '') : (mantenerFechasVacias ? '' : hoy)
    const ff = a.fecha_fin !== undefined ? (a.fecha_fin || '') : (mantenerFechasVacias ? '' : hoy)
    const dias = a.dias_totales != null ? Number(a.dias_totales) : calcularDias(fi, ff)
    const pdia = Number(a.precio_dia) || 0
    const pmes = Number(a.precio_mes) || 0
    const cant = Number(a.cantidad) || 1
    const desc = Number(a.descuento) || 0
    const total = a.precio_total != null
      ? Number(a.precio_total)
      : Math.max(0, calcularPrecioActivo(dias, pdia, pmes, cant) - desc)
    return {
      activo_id: a.activo_id,
      nombre: a.nombre || '',
      tipo: a.tipo || '',
      cantidad: cant,
      fecha_inicio: fi,
      fecha_fin: ff,
      dias_totales: dias,
      precio_dia: pdia,
      precio_mes: pmes,
      descuento: desc,
      precio_total: total,
    }
  }

  const agregarActivo = (activo: ActivoDB, fechaInicio = '', fechaFin = '') => {
    if (activosSeleccionados.find(a => a.activo_id === activo.id)) {
      toast.error('Este activo ya fue agregado'); return
    }
    const nuevo = normalizarActivo({
      activo_id: activo.id,
      nombre: activo.nombre,
      tipo: activo.tipo,
      cantidad: 1,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      dias_totales: fechaInicio && fechaFin ? calcularDias(fechaInicio, fechaFin) : 0,
      precio_dia: activo.precio_dia ?? 0,
      precio_mes: activo.precio_mes ?? 0,
      descuento: 0,
      precio_total: 0,
    })
    setActivosSeleccionados(prev => {
      const nueva = [...prev, nuevo]
      actualizarFechasDesdeActivos(nueva)
      return nueva
    })
  }

  const agregarActivosDesdeCotizacion = async (cotizacionId: string) => {
    const { data: det } = await supabase
      .from('detalles_documentos_comerciales')
      .select('activos_seleccionados')
      .eq('documento_comercial_id', cotizacionId)
      .maybeSingle()

    if (!det?.activos_seleccionados) {
      toast.error('La cotización seleccionada no tiene activos'); return
    }

    const activosCot = det.activos_seleccionados as unknown as ActivoSeleccionado[]
    if (!activosCot.length) { toast.error('La cotización no tiene activos'); return }

    // Necesitamos los precios actuales de cada activo de la DB
    const ids = activosCot.map(a => a.activo_id)
    const { data: activosDB } = await supabase
      .from('activos')
      .select('id, nombre, tipo, stock, precio_dia, precio_mes')
      .in('id', ids)

    const setsDB = await supabase
      .from('sets_activos')
      .select('id, nombre, tipo, stock, precio_dia, precio_mes')
      .in('id', ids)

    const todosDB: ActivoDB[] = [
      ...(activosDB || []),
      ...(setsDB.data || [])
    ] as ActivoDB[]

    let agregados = 0
    const nuevaLista = [...activosSeleccionados]

    for (const act of activosCot) {
      if (nuevaLista.find(a => a.activo_id === act.activo_id)) continue
      const dbData = todosDB.find(d => d.id === act.activo_id)
      nuevaLista.push(normalizarActivo({
        activo_id: act.activo_id,
        nombre: act.nombre || dbData?.nombre || '',
        tipo: act.tipo || dbData?.tipo || '',
        cantidad: Number(act.cantidad) || 1,
        fecha_inicio: '',   // fechas vacías intencionalmente
        fecha_fin: '',
        dias_totales: 0,
        precio_dia: Number(act.precio_dia) || dbData?.precio_dia || 0,
        precio_mes: Number(act.precio_mes) || dbData?.precio_mes || 0,
        descuento: Number(act.descuento) || 0,
        precio_total: 0,
      }))
      agregados++
    }

    setActivosSeleccionados(nuevaLista)
    // No actualizamos fechas del form porque las fechas de los activos están vacías
    toast.success(`${agregados} activo${agregados !== 1 ? 's' : ''} importado${agregados !== 1 ? 's' : ''} de la cotización`)
  }

  const eliminarActivo = (id: string) => {
    setActivosSeleccionados(prev => {
      const nueva = prev.filter(a => a.activo_id !== id)
      actualizarFechasDesdeActivos(nueva)
      return nueva
    })
  }

  const actualizarActivo = (id: string, campo: keyof ActivoSeleccionado, valor: any) => {
    setActivosSeleccionados(prev => {
      const nueva = prev.map(a => {
        if (a.activo_id !== id) return a
        const updated = { ...a, [campo]: valor }
        if (campo === 'fecha_inicio' || campo === 'fecha_fin') {
          updated.dias_totales = calcularDias(updated.fecha_inicio, updated.fecha_fin)
        }
        updated.precio_total = Math.max(
          0,
          calcularPrecioActivo(updated.dias_totales, updated.precio_dia, updated.precio_mes, updated.cantidad) - (updated.descuento || 0)
        )
        return updated
      })
      // Recalcular rango global de fechas si cambió una fecha
      if (campo === 'fecha_inicio' || campo === 'fecha_fin') {
        actualizarFechasDesdeActivos(nueva)
      }
      return nueva
    })
  }

  // ── Mantenimientos ──────────────────────────────────────────────────────────
  const agregarMantenimiento = (m: any) => {
    const id = m.mantenimiento_id || m.id
    if (mantenimientosSeleccionados.find(x => x.mantenimiento_id === id)) {
      toast.error('Ya fue agregado'); return
    }
    setMantenimientosSeleccionados(prev => [...prev, {
      mantenimiento_id: id,
      titulo: m.titulo, descripcion: m.descripcion || '',
      tipo: m.tipo, prioridad: m.prioridad || 'media',
      fecha_inicio: m.fecha_inicio || '', fecha_final: m.fecha_final || '',
      actividades_programadas: m.actividades_programadas || [],
      repuestos_requeridos: m.repuestos_requeridos || [],
      costo: m.costo || 0, es_nuevo: m.es_nuevo || false
    }])
  }

  // ── Montajes ────────────────────────────────────────────────────────────────
  const agregarMontaje = (m: any) => {
    const id = m.montaje_id || m.id
    if (montajesSeleccionados.find(x => x.montaje_id === id)) {
      toast.error('Ya fue agregado'); return
    }
    setMontajesSeleccionados(prev => [...prev, {
      montaje_id: id,
      titulo: m.titulo, descripcion: m.descripcion || '',
      tipo: m.tipo, prioridad: m.prioridad || 'media',
      fecha_inicio: m.fecha_inicio || '', fecha_final: m.fecha_final || '',
      actividades_programadas: m.actividades_programadas || [],
      repuestos_requeridos: m.repuestos_requeridos || [],
      costo: m.costo || 0, estado: m.estado || 'pendiente', es_nuevo: m.es_nuevo || false
    }])
  }

  // ── Proyectos ────────────────────────────────────────────────────────────────
  const agregarProyecto = (p: any) => {
    const id = p.proyecto_id || `temp-${Date.now()}`
    if (proyectosSeleccionados.find(x => x.proyecto_id === id)) { toast.error('Ya fue agregado'); return }
    setProyectosSeleccionados(prev => [...prev, {
      proyecto_id: id, titulo: p.titulo, descripcion: p.descripcion || '',
      tipo: p.tipo, prioridad: p.prioridad || 'media',
      fecha_inicio: p.fecha_inicio || '', fecha_final: p.fecha_final || '',
      actividades_programadas: p.actividades_programadas || [],
      repuestos_requeridos: p.repuestos_requeridos || [],
      costo: p.costo || 0, es_nuevo: p.es_nuevo ?? true
    }])
  }

  const agregarOtroProyecto = (p: any) => {
    const id = p.proyecto_id || `temp-${Date.now()}`
    if (otrosProyectosSeleccionados.find(x => x.proyecto_id === id)) { toast.error('Ya fue agregado'); return }
    setOtrosProyectosSeleccionados(prev => [...prev, {
      proyecto_id: id, titulo: p.titulo, descripcion: p.descripcion || '',
      tipo: p.tipo, prioridad: p.prioridad || 'media',
      fecha_inicio: p.fecha_inicio || '', fecha_final: p.fecha_final || '',
      actividades_programadas: p.actividades_programadas || [],
      repuestos_requeridos: p.repuestos_requeridos || [],
      costo: p.costo || 0, es_nuevo: p.es_nuevo ?? true
    }])
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const totalItems =
    activosSeleccionados.length +
    mantenimientosSeleccionados.length +
    montajesSeleccionados.length +
    proyectosSeleccionados.length +
    otrosProyectosSeleccionados.length

  if (totalItems === 0) {
    toast.error('Debes agregar al menos un servicio (activo, mantenimiento, montaje o proyecto) para continuar.')
    return
  }

    const activoSinFechas = activosSeleccionados.find(a => !a.fecha_inicio || !a.fecha_fin)
  if (activoSinFechas) {
    toast.error(`El activo "${activoSinFechas.nombre}" no tiene fechas de inicio y fin completas.`)
    return
  }

  // ── Validación: fechas del formulario general ─────────────────────────
  if (activosSeleccionados.length > 0 && (!formData.fecha_inicio || !formData.fecha_fin)) {
    toast.error('Las fechas de inicio y fin del documento son obligatorias.')
    return
  }

    setLoading(true)
    try {
      // Guardar mantenimientos nuevos
      const mantsNuevos = mantenimientosSeleccionados.filter(m => (m as any).es_nuevo)
      const mantsIds: string[] = []
      for (const m of mantsNuevos) {
        const { data, error } = await supabase.from('mantenimientos').insert([{
          titulo: m.titulo, descripcion: m.descripcion || null,
          tipo: m.tipo, prioridad: m.prioridad,
          fecha_inicio: m.fecha_inicio || null, fecha_final: m.fecha_final || null,
          actividades_programadas: m.actividades_programadas || [],
          repuestos_requeridos: m.repuestos_requeridos || [],
          cliente_id: empresaId || null, nombre_cliente: null
        }]).select().single()
        if (error) throw error
        if (data) mantsIds.push(data.id)
      }
      mantenimientosSeleccionados.filter(m => !(m as any).es_nuevo).forEach(m => mantsIds.push(m.mantenimiento_id))

      // Guardar montajes nuevos
      const montsNuevos = montajesSeleccionados.filter(m => (m as any).es_nuevo)
      const montsIds: string[] = []
      for (const m of montsNuevos) {
        const { data, error } = await supabase.from('montajes').insert([{
          titulo: m.titulo, descripcion: m.descripcion || null,
          tipo: m.tipo, prioridad: m.prioridad,
          fecha_inicio: m.fecha_inicio || null, fecha_final: m.fecha_final || null,
          actividades_programadas: m.actividades_programadas || [],
          repuestos_requeridos: m.repuestos_requeridos || [],
          cliente_id: empresaId || null, nombre_cliente: null, estado: 'pendiente'
        }]).select().single()
        if (error) throw error
        if (data) montsIds.push(data.id)
      }
      montajesSeleccionados.filter(m => !(m as any).es_nuevo).forEach(m => montsIds.push(m.montaje_id))

      // Construir payload
      let mantNewIdx = 0, montNewIdx = 0
      const detalleData = {
        documento_comercial_id: documentoId,
        ...formData,
        activos_seleccionados: activosSeleccionados,
        mantenimientos: mantenimientosSeleccionados.map(m => ({
          mantenimiento_id: (m as any).es_nuevo ? mantsIds[mantNewIdx++] : m.mantenimiento_id,
          titulo: m.titulo, tipo: m.tipo, prioridad: m.prioridad,
          fecha_inicio: m.fecha_inicio, fecha_final: m.fecha_final,
          costo: m.costo, descripcion: m.descripcion,
          actividades_programadas: m.actividades_programadas,
          repuestos_requeridos: m.repuestos_requeridos
        })),
        montajes: montajesSeleccionados.map(m => ({
          montaje_id: (m as any).es_nuevo ? montsIds[montNewIdx++] : m.montaje_id,
          titulo: m.titulo, tipo: m.tipo, prioridad: m.prioridad,
          fecha_inicio: m.fecha_inicio, fecha_final: m.fecha_final,
          costo: m.costo, descripcion: m.descripcion,
          actividades_programadas: m.actividades_programadas,
          repuestos_requeridos: m.repuestos_requeridos
        })),
        proyectos: proyectosSeleccionados.map(p => ({
          proyecto_id: p.proyecto_id,
          titulo: p.titulo, tipo: p.tipo, prioridad: p.prioridad,
          fecha_inicio: p.fecha_inicio, fecha_final: p.fecha_final,
          costo: p.costo, descripcion: p.descripcion,
          actividades_programadas: p.actividades_programadas,
          repuestos_requeridos: p.repuestos_requeridos
        })),
        otros_proyectos: otrosProyectosSeleccionados.map(p => ({
          proyecto_id: p.proyecto_id,
          titulo: p.titulo, tipo: p.tipo, prioridad: p.prioridad,
          fecha_inicio: p.fecha_inicio, fecha_final: p.fecha_final,
          costo: p.costo, descripcion: p.descripcion,
          actividades_programadas: p.actividades_programadas,
          repuestos_requeridos: p.repuestos_requeridos
        })),
        cotizaciones_origen: cotizacionesOrigen
      }

      let detError
      if (modoEditar) {
        // Borrar el registro existente y reinsertar con los nuevos datos
        const { error: delError } = await supabase
          .from('detalles_documentos_comerciales')
          .delete()
          .eq('documento_comercial_id', documentoId)
        if (delError) throw delError
        const { error: insertError } = await supabase
          .from('detalles_documentos_comerciales').insert([detalleData])
        detError = insertError
      } else {
        const { error: insertError } = await supabase
          .from('detalles_documentos_comerciales').insert([detalleData]).select().single()
        detError = insertError
      }
      if (detError) throw detError

      const qp = new URLSearchParams()
      if (docRelacionadoId) qp.set('doc_relacionado_id', docRelacionadoId)
      router.push(`${nextBasePath}/${documentoId}/totales${qp.toString() ? '?' + qp.toString() : ''}`)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Error al guardar los detalles')
      setLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-2">
          {modoEditar ? 'Editar detalles del documento' : 'Detalles del documento'}
        </h1>

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
              Pre-llenado desde <strong>{docRelacionadoInfo.numero_documento}</strong>. Puede editar libremente.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Información General */}
          <div className="border-b pb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Información general</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha inicio
                
                    <span className="ml-1 text-xs font-normal text-blue-500">(calculada desde servicios)</span>
                
                </label>
                <input
                  type="date"
                  value={formData.fecha_inicio}
                  onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha fin
              
                    <span className="ml-1 text-xs font-normal text-blue-500">(calculada desde servicios)</span>
             
                </label>
                <input
                  type="date"
                  value={formData.fecha_fin}
                  onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <div className="flex items-center gap-x-1">
                  <label className="block text-sm font-medium ">Días totales</label>
                   <span className="ml-1 text-xs font-normal text-blue-500">(calculada desde servicios)</span>
             
                </div>
              
                <input type="number" value={formData.dias_totales} readOnly className="w-full px-3 py-2 border rounded-md text-sm bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lugar de trabajo</label>
                <input type="text" value={formData.lugar_trabajo} onChange={e => setFormData({ ...formData, lugar_trabajo: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ciudad</label>
                <input type="text" value={formData.ciudad} onChange={e => setFormData({ ...formData, ciudad: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dirección</label>
                <input type="text" value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Observaciones técnicas</label>
              <textarea value={formData.observaciones_tecnicas} onChange={e => setFormData({ ...formData, observaciones_tecnicas: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
          </div>

          {/* Tabs */}
          <div>
            <div className="border-b mb-4 flex gap-1 flex-wrap">
              {([
                { key: 'activos', label: `Activos (${activosSeleccionados.length})` },
                { key: 'mantenimientos', label: `Mantenimientos (${mantenimientosSeleccionados.length})` },
                { key: 'montajes', label: `Montajes (${montajesSeleccionados.length})` },
                { key: 'proyectos', label: `Proyectos (${proyectosSeleccionados.length})` },
                { key: 'otros_proyectos', label: `Otros proyectos (${otrosProyectosSeleccionados.length})` },
              ] as { key: TabType; label: string }[]).map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setActiveTab(key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-100">
              {activeTab === 'activos' && (
                <TabActivos
                  activosDB={activosDB}
                  activosSeleccionados={activosSeleccionados}
                  onAgregar={agregarActivo}
                  onEliminar={eliminarActivo}
                  onActualizar={actualizarActivo}
                  esCotizacion={tipoDocumento === 'cotizacion'}
                  onImportarDesdeCotizacion={agregarActivosDesdeCotizacion}
                />
              )}
              {activeTab === 'mantenimientos' && (
                <TabMantenimientos
                  mantenimientosDB={mantenimientosDB}
                  seleccionados={mantenimientosSeleccionados}
                  onAgregar={agregarMantenimiento}
                  onEliminar={id => setMantenimientosSeleccionados(prev => prev.filter(m => m.mantenimiento_id !== id))}
                />
              )}
              {activeTab === 'montajes' && (
                <TabMontajes
                  montajesDB={montajesDB}
                  seleccionados={montajesSeleccionados}
                  onAgregar={agregarMontaje}
                  onEliminar={id => setMontajesSeleccionados(prev => prev.filter(m => m.montaje_id !== id))}
                />
              )}
              {activeTab === 'proyectos' && (
                <TabProyectos
                  seleccionados={proyectosSeleccionados}
                  onAgregar={agregarProyecto}
                  onEliminar={id => setProyectosSeleccionados(prev => prev.filter(p => p.proyecto_id !== id))}
                  titulo="Proyectos"
                  color="violet"
                />
              )}
              {activeTab === 'otros_proyectos' && (
                <TabProyectos
                  seleccionados={otrosProyectosSeleccionados}
                  onAgregar={agregarOtroProyecto}
                  onEliminar={id => setOtrosProyectosSeleccionados(prev => prev.filter(p => p.proyecto_id !== id))}
                  titulo="Otros proyectos"
                  color="teal"
                />
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" onClick={() => router.back()} className="px-5 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">Volver</button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600  rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <p className='text-white'>{loading ? 'Guardando...' : modoEditar ? 'Guardar cambios →' : 'Continuar a totales →'}</p>
              
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

