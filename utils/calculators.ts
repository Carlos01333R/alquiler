// utils/calculators.ts

/**
 * Calcula la diferencia de días entre dos fechas
 */
export function calcularDiasTotales(fechaInicio: string, fechaFin: string): number {
  if (!fechaInicio || !fechaFin) return 0
  
  const inicio = new Date(fechaInicio)
  const fin = new Date(fechaFin)
  
  const diferencia = fin.getTime() - inicio.getTime()
  const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24)) + 1
  
  return dias > 0 ? dias : 0
}

/**
 * Calcula el subtotal de activos seleccionados
 */
export function calcularSubtotalActivos(activos: any[]): number {
  return activos.reduce((sum, activo) => sum + activo.precio_total, 0)
}

/**
 * Calcula el subtotal de mantenimientos
 */
export function calcularSubtotalMantenimientos(mantenimientos: any[]): number {
  return mantenimientos.reduce((sum, mant) => sum + mant.costo, 0)
}

/**
 * Calcula el subtotal de montajes
 */
export function calcularSubtotalMontajes(montajes: any[]): number {
  return montajes.reduce((sum, mont) => sum + mont.costo, 0)
}

/**
 * Calcula el IVA
 */
export function calcularIVA(
  subtotal: number,
  descuento: number,
  porcentajeIVA: number
): number {
  const base = subtotal - descuento
  return (base * porcentajeIVA) / 100
}

/**
 * Calcula el total final
 */
export function calcularTotal(
  subtotal: number,
  descuento: number,
  iva: number,
  otrosImpuestos: number
): number {
  return subtotal - descuento + iva + otrosImpuestos
}

/**
 * Calcula todos los totales de una vez
 */
export function calcularTodosLosTotales(data: {
  activos: any[]
  mantenimientos: any[]
  montajes: any[]
  descuento: number
  porcentajeIVA: number
  otrosImpuestos: number
}) {
  const subtotalActivos = calcularSubtotalActivos(data.activos)
  const subtotalMantenimientos = calcularSubtotalMantenimientos(data.mantenimientos)
  const subtotalMontajes = calcularSubtotalMontajes(data.montajes)
  
  const subtotal = subtotalActivos + subtotalMantenimientos + subtotalMontajes
  const iva = calcularIVA(subtotal, data.descuento, data.porcentajeIVA)
  const total = calcularTotal(subtotal, data.descuento, iva, data.otrosImpuestos)
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    descuento: parseFloat(data.descuento.toFixed(2)),
    iva: parseFloat(iva.toFixed(2)),
    porcentajeIVA: data.porcentajeIVA,
    otrosImpuestos: parseFloat(data.otrosImpuestos.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  }
}

// utils/formatters.ts

/**
 * Formatea un número como moneda
 */
export function formatearMoneda(valor: number, moneda: string = 'USD'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: moneda
  }).format(valor)
}

/**
 * Formatea una fecha
 */
export function formatearFecha(fecha: string, formato: 'corto' | 'largo' = 'corto'): string {
  const date = new Date(fecha)
  
  if (formato === 'corto') {
    return date.toLocaleDateString('es-CO')
  }
  
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Formatea un número de documento
 */
export function formatearNumeroDocumento(
  numero: number,
  tipo: string,
  anio?: number
): string {
  const year = anio || new Date().getFullYear()
  const prefix = tipo === 'orden_compra' ? 'OC' : tipo === 'cotizacion' ? 'COT' : 'FAC'
  return `${prefix}-${year}-${numero.toString().padStart(4, '0')}`
}

/**
 * Genera un número de documento automático
 */
export async function generarNumeroDocumento(
  supabase: any,
  tipo: string
): Promise<string> {
  const year = new Date().getFullYear()
  
  const { data, error } = await supabase
    .from('documentos_comerciales')
    .select('numero_documento')
    .eq('tipo_documento', tipo)
    .like('numero_documento', `%${year}%`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error

  let siguienteNumero = 1
  
  if (data && data.length > 0) {
    const ultimoNumero = data[0].numero_documento
    const partes = ultimoNumero.split('-')
    siguienteNumero = parseInt(partes[partes.length - 1]) + 1
  }

  return formatearNumeroDocumento(siguienteNumero, tipo, year)
}

// utils/validators.ts

/**
 * Valida un NIT colombiano
 */
export function validarNIT(nit: string): boolean {
  // Remover puntos y guiones
  const nitLimpio = nit.replace(/[.-]/g, '')
  
  if (!/^\d{9,10}$/.test(nitLimpio)) {
    return false
  }
  
  // Implementar algoritmo de validación de NIT si es necesario
  return true
}

/**
 * Valida un email
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Valida un teléfono colombiano
 */
export function validarTelefono(telefono: string): boolean {
  // Formato: +57 3XX XXX XXXX o 3XXXXXXXXX
  const regex = /^(\+57)?3\d{9}$/
  return regex.test(telefono.replace(/\s/g, ''))
}

/**
 * Valida que una fecha de inicio sea anterior a la fecha de fin
 */
export function validarRangoFechas(fechaInicio: string, fechaFin: string): boolean {
  const inicio = new Date(fechaInicio)
  const fin = new Date(fechaFin)
  return inicio <= fin
}

/**
 * Valida que un precio sea válido
 */
export function validarPrecio(precio: number): boolean {
  return precio >= 0 && !isNaN(precio) && isFinite(precio)
}

// utils/export.ts

/**
 * Exporta datos a CSV
 */
export function exportarCSV(datos: any[], nombreArchivo: string) {
  if (datos.length === 0) return

  const headers = Object.keys(datos[0])
  const csv = [
    headers.join(','),
    ...datos.map(row =>
      headers.map(header => JSON.stringify(row[header] || '')).join(',')
    )
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${nombreArchivo}.csv`
  link.click()
}

/**
 * Imprime un documento
 */
export function imprimirDocumento(elementId?: string) {
  if (elementId) {
    const elemento = document.getElementById(elementId)
    if (elemento) {
      const contenido = elemento.innerHTML
      const ventana = window.open('', '_blank')
      if (ventana) {
        ventana.document.write(`
          <html>
            <head>
              <title>Imprimir</title>
              <style>
                body { font-family: Arial, sans-serif; }
                @media print {
                  button { display: none; }
                }
              </style>
            </head>
            <body>${contenido}</body>
          </html>
        `)
        ventana.document.close()
        ventana.print()
      }
    }
  } else {
    window.print()
  }
}

// utils/errors.ts

export class DocumentoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DocumentoError'
  }
}

export function manejarError(error: any): string {
  console.error('Error:', error)

  if (error.code === '23505') {
    return 'Este documento ya existe. Por favor use un número diferente.'
  }

  if (error.code === '23503') {
    return 'Referencia inválida. Verifique que todos los datos existan.'
  }

  if (error.message) {
    return error.message
  }

  return 'Ha ocurrido un error inesperado. Por favor intente nuevamente.'
}