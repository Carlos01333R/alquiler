
export interface ActivoDB {
  id: string
  nombre: string
  tipo: string
  stock: number
  precio_dia: number
  precio_mes: number
}

export  interface ActivoSeleccionado {
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

export interface MantenimientoDetalle {
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

export interface MontajeDetalle {
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

export interface ProyectoDetalle {
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