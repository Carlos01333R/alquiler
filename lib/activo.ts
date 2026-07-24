import type { Activo , SetActivo} from "@/lib/types"

const isValidDate = (s?: string | null): s is string =>
  !!s && !isNaN(Date.parse(s))


export const calcEstadoFromDates = (
  ultima?: string | null,
  proxima?: string | null,
  DAYS_ALERT = 10
): string => {
  const hasUltima = isValidDate(ultima)
  const hasProxima = isValidDate(proxima)

  if (!hasUltima && !hasProxima) return "na"
  if (hasUltima && !hasProxima) return "vigente"

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const proximaDate = new Date(proxima!)
  proximaDate.setHours(0, 0, 0, 0)

  const diffDays = Math.round(
    (proximaDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays < 0) return "vencido"
  if (diffDays === 0) return "en_certificacion"
  if (diffDays <= DAYS_ALERT) return "proximo_a_vencer"
  return "vigente"
}


export const calcEstadoFromDatesSet = (
  ultima?: string | null,
  proxima?: string | null,
  DAYS_ALERT = 10
): string => {
  const hasUltima = isValidDate(ultima)
  const hasProxima = isValidDate(proxima)

  // Neither date set → N/A
  if (!hasUltima && !hasProxima) return "na"

  // If only ultima is set, consider vigente (we know the last event but not the next)
  if (hasUltima && !hasProxima) return "vigente"

  // proxima is set — compare against today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const proximaDate = new Date(proxima!)
  proximaDate.setHours(0, 0, 0, 0)

  const diffMs = proximaDate.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return "vencido"
  if (diffDays === 0) return "en_certificacion"
  if (diffDays <= DAYS_ALERT) return "proximo_a_vencer"
  return "vigente"
}

export const ESTADO_CERT_LABELS: Record<string, string> = {
  vigente: "Vigente",
  en_certificacion: "En certificación",
  proximo_a_vencer: "Próximo a vencer",
  vencido: "Vencido",
  na: "N/A",
}

export const ESTADO_MANT_LABELS: Record<string, string> = {
  vigente: "Vigente",
  en_mantenimiento: "En mantenimiento",
  proximo_a_vencer: "Próximo a vencer",
  vencido: "Vencido",
  na: "N/A",
}


export interface ActivoFormProps {
  activo?: Activo
}





export interface SetActivoFormProps {
  set?: SetActivo
}

export interface ArchivoAdjunto {
  id: string
  nombre: string
  url: string
  path: string
  tipo: string
  tamaño: number
}



export interface ComponenteActivo {
  id: string
  activo_id: string
  nombre: string
  cantidad: number
  serie?: string
  modelo?: string
  fabricante?: string
  descripcion?: string
  imagen_url?: string
  tipo?: string
  estado_disponibilidad?: string
  estado_certificacion?: string
  estado_mantenimiento?: string
  categoria_id?: string
  ubicacion?: string
  responsable?: string
  accesorios_incluidos?: string
  stock?: number
  condicion?: string
  documentos_adjuntos?: any[]
  // Certification & maintenance dates from the source asset
  fecha_ultima_certificacion?: string | null
  fecha_proxima_certificacion?: string | null
  fecha_ultimo_mantenimiento?: string | null
  fecha_proximo_mantenimiento?: string | null
}



export const earliestDate = (dates: (string | null | undefined)[]): string | null => {
  const valid = dates.filter(isValidDate).map((d) => new Date(d).getTime())
  if (valid.length === 0) return null
  return new Date(Math.min(...valid)).toISOString().split("T")[0]
}


export const latestDate = (dates: (string | null | undefined)[]): string | null => {
  const valid = dates.filter(isValidDate).map((d) => new Date(d).getTime())
  if (valid.length === 0) return null
  return new Date(Math.max(...valid)).toISOString().split("T")[0]
}


 export const generateSerieActivo = (tipo: string): string => {
    const prefix = tipo === "equipo" ? "EQU" : "HER"
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const random = Array.from(crypto.getRandomValues(new Uint8Array(9)))
      .map((b) => chars[b % chars.length])
      .join("")
    return `${prefix}${random}`
  }



export const generateSerieSet = (tipo: string): string => {
    const prefix = tipo === "kit_equipos" ? "KIT" : "MAL"
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const random = Array.from(crypto.getRandomValues(new Uint8Array(9)))
      .map((b) => chars[b % chars.length])
      .join("")
    return `${prefix}${random}`
  }