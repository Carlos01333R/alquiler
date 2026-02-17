export type Empresa = {
  id: string
  nit: string
  razon_social: string
  tipo: "natural" | "juridico"
  email: string | null
  telefono: string | null
  pais: string | null
  ciudad: string | null
  direccion_fiscal: string | null
  estado: "activo" | "inactivo"
  logo_url: string | null
  documentos_adjuntos: unknown[]
  created_at: string
  updated_at: string
  logo_path: string | null
  documentos_paths: string[]
}

export type Contacto = {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
  empresa_id: string
  nombre_empresa: string | null
  estado: "activo" | "inactivo"
  cargo: string | null
  created_at: string
  updated_at: string
}

export type UsuarioEmpresaRow = {
  id: string
  empresa_id: string
  usuarios: UsuarioItem[]
  created_at: string
  updated_at: string
}

export type UsuarioItem = {
  nombre: string
  email: string
  password: string
  estado: "activo" | "inactivo"
  rol: "admin" | "tecnico"
}

export type Categoria = {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  created_at: string
}

export type Activo = {
  id: string
  nombre: string
  tipo: "equipo" | "herramienta"
  modelo: string | null
  serie: string | null
  categoria_id: string | null
  fabricante: string | null
  imagen_url: string | null
  estado_disponibilidad: "disponible" | "alquilado" | "en_mantenimiento" | "reservado"
  estado_certificacion: "vigente" | "en_certificacion" | "proximo_a_vencer" | "vencido" | "na"
  estado_mantenimiento: "vigente" | "en_mantenimiento" | "proximo_a_vencer" | "vencido" | "na"
  stock: number
  ubicacion: string | null
  responsable: string | null
  descripcion: string | null
  accesorios_incluidos: string | null
  fecha_ultima_certificacion: string | null
  fecha_proxima_certificacion: string | null
  fecha_ultimo_mantenimiento: string | null
  fecha_proximo_mantenimiento: string | null
  documentos_adjuntos: unknown[]
  created_at: string
  updated_at: string
  categorias?: Categoria
}

export type SetActivo = {
  id: string
  nombre: string
  tipo: "kit_equipos" | "maleta_herramientas"
  modelo: string | null
  serie: string | null
  categoria_id: string | null
  fabricante: string | null
  imagen_url: string | null
  estado_disponibilidad: "disponible" | "alquilado" | "en_mantenimiento" | "reservado"
  estado_certificacion: "vigente" | "en_certificacion" | "proximo_a_vencer" | "vencido" | "na"
  estado_mantenimiento: "vigente" | "en_mantenimiento" | "proximo_a_vencer" | "vencido" | "na"
  stock: number
  ubicacion: string | null
  responsable: string | null
  descripcion: string | null
  accesorios_incluidos: string | null
  fecha_ultima_certificacion: string | null
  fecha_proxima_certificacion: string | null
  fecha_ultimo_mantenimiento: string | null
  fecha_proximo_mantenimiento: string | null
  documentos_adjuntos: unknown[]
  componentes: unknown[]
  created_at: string
  updated_at: string
  categorias?: Categoria
}

export type Mantenimiento = {
  id: string
  titulo: string
  descripcion: string | null
  cliente_id: string | null
  nombre_cliente: string | null
  tipo: "preventivo" | "correctivo" | "predictivo" | "emergencia"
  prioridad: "baja" | "media" | "alta" | "critica"
  fecha_inicio: string | null
  fecha_final: string | null
  actividades_programadas: { actividad: string; completada: boolean }[]
  repuestos_requeridos: { nombre: string; cantidad: number; notas: string }[]
  archivo_adjunto: string | null
  created_at: string
  updated_at: string
  empresas?: Empresa
}

export type Montaje = {
  id: string
  tipo: string | null
  numero: string | null
  fecha: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  empresa_id: string | null
  nombre_empresa_cliente: string | null
  telefono_empresa_cliente: string | null
  correo_empresa_cliente: string | null
  direccion_empresa_cliente: string | null
  nit_empresa_cliente: string | null
  estado: "pendiente" | "en_proceso" | "completado" | "cancelado"
  created_at: string
  updated_at: string
}

export type DocumentoComercial = {
  id: string
  empresa_id: string
  tipo: "orden_compra" | "cotizacion" | "factura" | "otro"
  generado: "si" | "no"
  numero: string | null
  fecha: string | null
  archivo_url: string | null
  activos_seleccionados: { tipo: string; id: string; nombre: string }[]
  created_at: string
  updated_at: string
}

export type DetalleDocumentoComercial = {
  id: string
  documento_comercial_id: string
  fecha_inicio: string | null
  fecha_fin: string | null
  tipo_item: "alquiler" | "mantenimiento" | "proyecto" | "material"
  descripcion: string | null
  cantidad: number
  valor_unitario: number
  descuento: number
  subtotal: number
  activo_id: string | null
  set_activo_id: string | null
  created_at: string
  updated_at: string
}

export type TotalDocumentoComercial = {
  id: string
  documento_comercial_id: string
  subtotal: number
  descuento: number
  iva: number
  total: number
  created_at: string
  updated_at: string
}

export type Solicitud = {
  id: string
  cliente_id: string | null
  activo_id: string | null
  set_activo_id: string | null
  nombre_cliente: string | null
  nombre_activo: string | null
  serie_activo: string | null
  titulo: string
  descripcion: string | null
  tipo: "soporte" | "consulta" | "devolucion" | "resena"
  prioridad: "baja" | "media" | "alta" | "critica"
  cliente_fue_notificado: boolean
  estado: "abierto" | "en_proceso" | "resuelto" | "cerrado"
  fecha_inicio: string | null
  fecha_resolucion: string | null
  comentarios_cliente: string | null
  comentario_proveedor: string | null
  created_at: string
  updated_at: string
  empresas?: Empresa
}
