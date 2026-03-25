// components/shared/DetallesDocumentoPage.tsx
// Usado en:
//   app/dashboard/ordenes/[id]/detalles/page.tsx
//   app/dashboard/cotizaciones/[id]/detalles/page.tsx
//   app/dashboard/facturas/[id]/detalles/page.tsx
//
// Cada entry page pasa { backPath, nextPath }:
//   backPath = '/dashboard/ordenes/${id}/nuevo'  (o la ruta anterior)
//   nextPath = '/dashboard/ordenes/${id}/totales'

'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// ── Tipos básicos ──────────────────────────────────────────────────────────────
interface ActivoDB {
  id: string
  nombre: string
  tipo: string
  stock: number
  precio_dia: number
  precio_mes: number
}

interface ActivoSeleccionado {
  activo_id: string
  nombre: string
  tipo: string
  cantidad: number
  fecha_inicio: string
  fecha_fin: string
  dias_totales: number
  precio_dia: number
  precio_mes: number
  descuento: number          // valor fijo en pesos
  precio_total: number       // calculado
}

interface MantenimientoDetalle {
  mantenimiento_id: string
  titulo: string
  descripcion?: string
  tipo: string
  prioridad: string
  fecha_inicio?: string
  fecha_final?: string
  actividades_programadas?: string[]
  repuestos_requeridos?: string[]
  costo: number
  es_nuevo?: boolean
}

interface MontajeDetalle {
  montaje_id: string
  titulo: string
  descripcion?: string
  tipo: string
  prioridad: string
  fecha_inicio?: string
  fecha_final?: string
  actividades_programadas?: string[]
  repuestos_requeridos?: string[]
  costo: number
  estado?: string
  es_nuevo?: boolean
}

interface ProyectoDetalle {
  proyecto_id: string
  titulo: string
  descripcion?: string
  tipo: string
  prioridad: string
  fecha_inicio?: string
  fecha_final?: string
  actividades_programadas?: string[]
  repuestos_requeridos?: string[]
  costo: number
  es_nuevo?: boolean
}

// OtrosProyectos usa la misma estructura
type OtroProyectoDetalle = ProyectoDetalle

type TabType = 'activos' | 'mantenimientos' | 'montajes' | 'proyectos' | 'otros_proyectos'

// ── Helpers de precio ──────────────────────────────────────────────────────────
function obtenerFechaColombia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

/**
 * Calcula el precio de un activo dado un rango de fechas.
 * Lógica: meses completos × precio_mes  +  días sobrantes × precio_dia
 * Un "mes completo" = 30 días.
 */
function calcularPrecioActivo(
  dias: number,
  precioDia: number,
  precioMes: number,
  cantidad: number
): number {
  if (dias <= 0 || cantidad <= 0) return 0
  const meses = Math.floor(dias / 30)
  const diasRestantes = dias % 30
  const precio = meses * precioMes + diasRestantes * precioDia
  return Math.round(precio * cantidad * 100) / 100
}

function calcularDias(inicio: string, fin: string): number {
  if (!inicio || !fin) return 0
  const [ai, mi, di] = inicio.split('-').map(Number)
  const [af, mf, df] = fin.split('-').map(Number)
  const i = new Date(ai, mi - 1, di)
  const f = new Date(af, mf - 1, df)
  const d = Math.round((f.getTime() - i.getTime()) / 86400000)
  return d > 0 ? d : 0
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface Props {
  backPath: string  // ej: /dashboard/ordenes
  nextBasePath: string  // ej: /dashboard/ordenes  → se añade /${id}/totales
}

// ── Componente principal ───────────────────────────────────────────────────────
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

  // ── Activos ────────────────────────────────────────────────────────────────
  /** Garantiza que todos los campos numéricos/string del activo estén definidos */
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
                  {activosSeleccionados.length > 0 && activosSeleccionados.some(a => a.fecha_inicio) && (
                    <span className="ml-1 text-xs font-normal text-blue-500">(calculada desde activos)</span>
                  )}
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
                  {activosSeleccionados.length > 0 && activosSeleccionados.some(a => a.fecha_fin) && (
                    <span className="ml-1 text-xs font-normal text-blue-500">(calculada desde activos)</span>
                  )}
                </label>
                <input
                  type="date"
                  value={formData.fecha_fin}
                  onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Días totales</label>
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

            <div className="min-h-[400px]">
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
            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Guardando...' : modoEditar ? 'Guardar cambios →' : 'Continuar a totales →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: seleccionar cotización para importar activos ───────────────────────
function ModalSeleccionarCotizacion({
  onSeleccionar,
  onCerrar
}: {
  onSeleccionar: (cotizacionId: string) => void
  onCerrar: () => void
}) {
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('documentos_comerciales')
        .select('id, numero_documento, fecha_emision, estado, empresas(razon_social)')
        .eq('tipo_documento', 'cotizacion')
        .neq('estado', 'rechazado')
        .order('created_at', { ascending: false })
      setCotizaciones(data || [])
      setCargando(false)
    }
    cargar()
  }, [])

  const filtradas = cotizaciones.filter(c =>
    c.numero_documento.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.empresas?.razon_social || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-semibold text-gray-800">Importar activos desde cotización</h2>
            <p className="text-xs text-gray-500 mt-0.5">Selecciona una cotización para copiar sus activos</p>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Buscador */}
        <div className="px-5 pt-4">
          <input
            type="text" placeholder="Buscar por número o empresa..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
            autoFocus
          />
        </div>

        {/* Lista */}
        <div className="px-5 py-3 max-h-80 overflow-y-auto">
          {cargando ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              Cargando cotizaciones...
            </div>
          ) : filtradas.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No hay cotizaciones disponibles</p>
          ) : (
            <div className="space-y-2">
              {filtradas.map(cot => (
                <button
                  key={cot.id}
                  onClick={() => { onSeleccionar(cot.id); onCerrar() }}
                  className="w-full text-left px-4 py-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{cot.numero_documento}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{cot.empresas?.razon_social || '—'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400">{cot.fecha_emision}</span>
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                          cot.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                          cot.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{cot.estado}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-gray-50 flex justify-end">
          <button onClick={onCerrar} className="px-4 py-2 text-sm border rounded-md hover:bg-white">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tab Activos (rediseñado con fechas y precios) ──────────────────────────────
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
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.tipo.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="space-y-6">

      {/* Botón importar desde cotización — solo en cotizaciones */}
      {esCotizacion && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setModalCotizacion(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Importar activos desde cotización
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

// ── Tab Mantenimientos (simplificado) ─────────────────────────────────────────
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
          <button type="button" onClick={() => setMostrarForm(true)} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">
            + Crear nuevo mantenimiento
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
        <div className="border-t pt-4">
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

// ── Tab Montajes (simplificado) ───────────────────────────────────────────────
function TabMontajes({
  montajesDB, seleccionados, onAgregar, onEliminar
}: {
  montajesDB: any[]
  seleccionados: MontajeDetalle[]
  onAgregar: (m: any) => void
  onEliminar: (id: string) => void
}) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({
    titulo: '', descripcion: '', tipo: 'instalacion', prioridad: 'media',
    fecha_inicio: '', fecha_final: '', actividades_programadas: '', repuestos_requeridos: '', costo: 0
  })

  const agregar = () => {
    if (!form.titulo) { toast.error('Título obligatorio'); return }
    onAgregar({
      montaje_id: `temp-${Date.now()}`, ...form,
      actividades_programadas: form.actividades_programadas.split('\n').filter(Boolean),
      repuestos_requeridos: form.repuestos_requeridos.split('\n').filter(Boolean),
      costo: Number(form.costo) || 0, estado: 'pendiente', es_nuevo: true
    })
    setForm({ titulo: '', descripcion: '', tipo: 'instalacion', prioridad: 'media', fecha_inicio: '', fecha_final: '', actividades_programadas: '', repuestos_requeridos: '', costo: 0 })
    setMostrarForm(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-sm text-gray-700 mb-3">Montajes agregados</h3>
        {seleccionados.length === 0 ? (
          <p className="text-sm text-gray-400">Ningún montaje agregado</p>
        ) : (
          <div className="space-y-2">
            {seleccionados.map(m => (
              <div key={m.montaje_id} className="border rounded-md p-3 bg-gray-50 flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{m.titulo}</p>
                  <p className="text-xs text-gray-500">{m.tipo} · {m.prioridad} · ${(Number(m.costo)||0).toLocaleString('es-CO')}</p>
                </div>
                <button type="button" onClick={() => onEliminar(m.montaje_id)} className="text-red-400 hover:text-red-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        {!mostrarForm ? (
          <button type="button" onClick={() => setMostrarForm(true)} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">
            + Crear nuevo montaje
          </button>
        ) : (
          <div className="bg-green-50 p-4 rounded-md space-y-3">
            <h3 className="font-semibold text-sm">Nuevo montaje</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-xs font-medium block mb-1">Título *</label><input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} className="w-full px-3 py-2 border rounded text-sm" /></div>
              <div><label className="text-xs font-medium block mb-1">Costo</label><input type="number" min="0" value={form.costo || ''} onChange={e => setForm({...form, costo: parseFloat(e.target.value)||0})} className="w-full px-3 py-2 border rounded text-sm" /></div>
              <div><label className="text-xs font-medium block mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full px-3 py-2 border rounded text-sm">
                  <option value="instalacion">Instalación</option><option value="desmontaje">Desmontaje</option><option value="reubicacion">Reubicación</option><option value="expansion">Expansión</option>
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
            <div className="flex gap-2">
              <button type="button" onClick={agregar} className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">Agregar</button>
              <button type="button" onClick={() => setMostrarForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-white">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {montajesDB.filter(m => !seleccionados.some(s => s.montaje_id === m.id)).length > 0 && (
        <div className="border-t pt-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">Seleccionar existentes</h3>
          <div className="max-h-40 overflow-y-auto border rounded-md">
            {montajesDB.filter(m => !seleccionados.some(s => s.montaje_id === m.id)).map(m => (
              <div key={m.id} className="p-3 border-b hover:bg-gray-50 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{m.titulo}</p>
                  <p className="text-xs text-gray-500">{m.tipo} · {m.estado}</p>
                </div>
                <button type="button" onClick={() => onAgregar(m)} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Agregar</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab Proyectos / Otros proyectos ──────────────────────────────────────────
// Reutilizable para "proyectos" y "otros_proyectos" con diferente color y título
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
          <button type="button" onClick={() => setMostrarForm(true)} className={`px-4 py-2 ${col.btn} text-white rounded-md text-sm`}>
            + Crear nuevo {titulo.toLowerCase().replace('otros ', '')}
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