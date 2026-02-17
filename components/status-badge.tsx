import { Badge } from "@/components/ui/badge"

const statusColors: Record<string, string> = {
  activo: "bg-emerald-100 text-emerald-800 border-emerald-200",
  inactivo: "bg-zinc-100 text-zinc-600 border-zinc-200",
  disponible: "bg-emerald-100 text-emerald-800 border-emerald-200",
  alquilado: "bg-sky-100 text-sky-800 border-sky-200",
  en_mantenimiento: "bg-amber-100 text-amber-800 border-amber-200",
  reservado: "bg-violet-100 text-violet-800 border-violet-200",
  vigente: "bg-emerald-100 text-emerald-800 border-emerald-200",
  en_certificacion: "bg-sky-100 text-sky-800 border-sky-200",
  proximo_a_vencer: "bg-amber-100 text-amber-800 border-amber-200",
  vencido: "bg-red-100 text-red-800 border-red-200",
  na: "bg-zinc-100 text-zinc-500 border-zinc-200",
  baja: "bg-zinc-100 text-zinc-600 border-zinc-200",
  media: "bg-sky-100 text-sky-800 border-sky-200",
  alta: "bg-amber-100 text-amber-800 border-amber-200",
  critica: "bg-red-100 text-red-800 border-red-200",
  abierto: "bg-sky-100 text-sky-800 border-sky-200",
  en_proceso: "bg-amber-100 text-amber-800 border-amber-200",
  resuelto: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cerrado: "bg-zinc-100 text-zinc-600 border-zinc-200",
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  completado: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelado: "bg-red-100 text-red-800 border-red-200",
  preventivo: "bg-sky-100 text-sky-800 border-sky-200",
  correctivo: "bg-amber-100 text-amber-800 border-amber-200",
  predictivo: "bg-violet-100 text-violet-800 border-violet-200",
  emergencia: "bg-red-100 text-red-800 border-red-200",
}

const statusLabels: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  disponible: "Disponible",
  alquilado: "Alquilado",
  en_mantenimiento: "En mantenimiento",
  reservado: "Reservado",
  vigente: "Vigente",
  en_certificacion: "En certificacion",
  proximo_a_vencer: "Proximo a vencer",
  vencido: "Vencido",
  na: "N/A",
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Critica",
  abierto: "Abierto",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
  pendiente: "Pendiente",
  completado: "Completado",
  cancelado: "Cancelado",
  preventivo: "Preventivo",
  correctivo: "Correctivo",
  predictivo: "Predictivo",
  emergencia: "Emergencia",
  natural: "Natural",
  juridico: "Juridico",
  equipo: "Equipo",
  herramienta: "Herramienta",
  kit_equipos: "Kit de equipos",
  maleta_herramientas: "Maleta herramientas",
  soporte: "Soporte",
  consulta: "Consulta",
  devolucion: "Devolucion",
  resena: "Resena",
  orden_compra: "Orden de compra",
  cotizacion: "Cotizacion",
  factura: "Factura",
  otro: "Otro",
  alquiler: "Alquiler",
  mantenimiento: "Mantenimiento",
  proyecto: "Proyecto",
  material: "Material",
}

export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">-</span>
  const colorClass = statusColors[value] || "bg-zinc-100 text-zinc-600 border-zinc-200"
  const label = statusLabels[value] || value.replace(/_/g, " ")
  return (
    <Badge variant="outline" className={`${colorClass} font-medium`}>
      {label}
    </Badge>
  )
}
