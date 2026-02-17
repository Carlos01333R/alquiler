// types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string
          nit: string
          razon_social: string
          tipo: 'juridico' | 'natural'
          email: string | null
          telefono: string | null
          pais: string | null
          ciudad: string | null
          direccion_fiscal: string | null
          estado: 'activo' | 'inactivo'
          logo_url: string | null
          logo_path: string | null
          documentos_adjuntos: Json
          documentos_paths: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['empresas']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['empresas']['Insert']>
      }
      activos: {
        Row: {
          id: string
          nombre: string
          tipo: string
          modelo: string | null
          serie: string | null
          categoria_id: string | null
          fabricante: string | null
          imagen_url: string | null
          estado_disponibilidad: string
          estado_certificacion: string
          estado_mantenimiento: string
          stock: number
          ubicacion: string | null
          responsable: string | null
          descripcion: string | null
          accesorios_incluidos: string | null
          fecha_ultima_certificacion: string | null
          fecha_proxima_certificacion: string | null
          fecha_ultimo_mantenimiento: string | null
          fecha_proximo_mantenimiento: string | null
          documentos_adjuntos: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['activos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['activos']['Insert']>
      }
      sets_activos: {
        Row: {
          id: string
          nombre: string
          tipo: string
          modelo: string | null
          serie: string | null
          categoria_id: string | null
          fabricante: string | null
          imagen_url: string | null
          estado_disponibilidad: string
          estado_certificacion: string
          estado_mantenimiento: string
          stock: number
          ubicacion: string | null
          responsable: string | null
          descripcion: string | null
          accesorios_incluidos: string | null
          fecha_ultima_certificacion: string | null
          fecha_proxima_certificacion: string | null
          fecha_ultimo_mantenimiento: string | null
          fecha_proximo_mantenimiento: string | null
          documentos_adjuntos: Json
          componentes: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sets_activos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['sets_activos']['Insert']>
      }
      mantenimientos: {
        Row: {
          id: string
          titulo: string
          descripcion: string | null
          cliente_id: string | null
          nombre_cliente: string | null
          tipo: 'preventivo' | 'correctivo' | 'predictivo'
          prioridad: 'baja' | 'media' | 'alta' | 'critica'
          fecha_inicio: string | null
          fecha_final: string | null
          actividades_programadas: Json
          repuestos_requeridos: Json
          archivo_adjunto: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['mantenimientos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['mantenimientos']['Insert']>
      }
      montajes: {
        Row: {
          id: string
          titulo: string
          descripcion: string | null
          cliente_id: string | null
          nombre_cliente: string | null
          tipo: 'instalacion' | 'desmontaje' | 'reubicacion' | 'expansion'
          prioridad: 'baja' | 'media' | 'alta' | 'critica'
          fecha_inicio: string | null
          fecha_final: string | null
          actividades_programadas: Json
          repuestos_requeridos: Json
          archivo_adjunto: string | null
          estado: 'pendiente' | 'en_proceso' | 'completado' | 'cancelado'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['montajes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['montajes']['Insert']>
      }
      documentos_comerciales: {
        Row: {
          id: string
          numero_documento: string
          tipo_documento: string
          empresa_id: string
          fecha_emision: string
          estado: 'borrador' | 'enviado' | 'aprobado' | 'rechazado' | 'completado'
          observaciones: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['documentos_comerciales']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['documentos_comerciales']['Insert']>
      }
      detalles_documentos_comerciales: {
        Row: {
          id: string
          documento_comercial_id: string
          fecha_inicio: string | null
          fecha_fin: string | null
          dias_totales: number | null
          lugar_trabajo: string | null
          direccion: string | null
          ciudad: string | null
          activos_seleccionados: Json
          mantenimientos: Json
          montajes: Json
          observaciones_tecnicas: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['detalles_documentos_comerciales']['Row'], 'id' | 'created_at' | 'updated_at' | 'dias_totales'>
        Update: Partial<Database['public']['Tables']['detalles_documentos_comerciales']['Insert']>
      }
      totales_documentos_comerciales: {
        Row: {
          id: string
          documento_comercial_id: string
          subtotal: number
          descuento: number
          iva: number
          porcentaje_iva: number
          otros_impuestos: number
          total: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['totales_documentos_comerciales']['Row'], 'id' | 'created_at' | 'updated_at' | 'iva' | 'total'>
        Update: Partial<Database['public']['Tables']['totales_documentos_comerciales']['Insert']>
      }
    }
  }
}

// Tipos de utilidad
export type Empresa = Database['public']['Tables']['empresas']['Row']
export type Activo = Database['public']['Tables']['activos']['Row']
export type SetActivo = Database['public']['Tables']['sets_activos']['Row']
export type Mantenimiento = Database['public']['Tables']['mantenimientos']['Row']
export type Montaje = Database['public']['Tables']['montajes']['Row']
export type DocumentoComercial = Database['public']['Tables']['documentos_comerciales']['Row']
export type DetalleDocumentoComercial = Database['public']['Tables']['detalles_documentos_comerciales']['Row']
export type TotalDocumentoComercial = Database['public']['Tables']['totales_documentos_comerciales']['Row']

// Tipos para activos seleccionados
export interface ActivoSeleccionado {
  activo_id: string
  nombre: string
  tipo: string
  cantidad: number
  precio_unitario: number
  precio_total: number
}

// Tipos para mantenimientos y montajes en detalles
export interface MantenimientoDetalle {
  mantenimiento_id: string
  titulo: string
  tipo: string
  fecha_inicio: string
  fecha_final: string
  costo: number
  descripcion: string | null
  prioridad : 'baja' | 'media' | 'alta' | 'critica'
  actividades_programadas: string[]
  repuestos_requeridos: string[]
}

export interface MontajeDetalle {
  montaje_id: string
  titulo: string
  tipo: string
  fecha_inicio: string
  fecha_final: string
  costo: number
  descripcion: string | null
  prioridad : 'baja' | 'media' | 'alta' | 'critica'
  actividades_programadas: string[]
  repuestos_requeridos: string[]
}