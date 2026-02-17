import { supabase } from './supabase'


export async function getEmpresas() {
  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .eq('estado', 'activo')
    .order('razon_social')

  if (error) throw error
  return data
}

export async function getActivos() {
  const { data: activos, error: activosError } = await supabase
    .from('activos')
    .select('*')
    .eq('estado_disponibilidad', 'disponible')

  const { data: sets, error: setsError } = await supabase
    .from('sets_activos')
    .select('*')
    .eq('estado_disponibilidad', 'disponible')

  if (activosError) throw activosError
  if (setsError) throw setsError

  return [...(activos || []), ...(sets || [])]
}

export async function getMantenimientos() {
  const { data, error } = await supabase
    .from('mantenimientos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getMontajes() {
  const { data, error } = await supabase
    .from('montajes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getDocumentoCompleto(documentoId: string) {
  const { data: documento, error: docError } = await supabase
    .from('documentos_comerciales')
    .select(`
      *,
      empresa:empresas(*)
    `)
    .eq('id', documentoId)
    .single()

  if (docError) throw docError

  const { data: detalle, error: detError } = await supabase
    .from('detalles_documentos_comerciales')
    .select('*')
    .eq('documento_comercial_id', documentoId)
    .single()

  if (detError) throw detError

  const { data: totales, error: totError } = await supabase
    .from('totales_documentos_comerciales')
    .select('*')
    .eq('documento_comercial_id', documentoId)
    .single()

  // Los totales pueden no existir aún
  if (totError && totError.code !== 'PGRST116') throw totError

  return {
    documento,
    detalle,
    totales
  }
}

export async function crearDocumento(data: {
  numero_documento: string
  tipo_documento: string
  empresa_id: string
  fecha_emision: string
  estado: string
  observaciones?: string
}) {
  const { data: documento, error } = await supabase
    .from('documentos_comerciales')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return documento
}

export async function guardarDetalles(data: {
  documento_comercial_id: string
  fecha_inicio?: string
  fecha_fin?: string
  lugar_trabajo?: string
  direccion?: string
  ciudad?: string
  activos_seleccionados: any[]
  mantenimientos: any[]
  montajes: any[]
  observaciones_tecnicas?: string
}) {
  const { data: detalle, error } = await supabase
    .from('detalles_documentos_comerciales')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return detalle
}

export async function guardarTotales(data: {
  documento_comercial_id: string
  subtotal: number
  descuento: number
  porcentaje_iva: number
  otros_impuestos: number
}) {
  const { data: totales, error } = await supabase
    .from('totales_documentos_comerciales')
    .upsert([data])
    .select()
    .single()

  if (error) throw error
  return totales
}

export async function actualizarEstadoDocumento(
  documentoId: string,
  nuevoEstado: string
) {
  const { error } = await supabase
    .from('documentos_comerciales')
    .update({ estado: nuevoEstado })
    .eq('id', documentoId)

  if (error) throw error
}