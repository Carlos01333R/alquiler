import { SolicitudForm } from "@/components/solicitud-form"

export default function NuevaSolicitudPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nueva Solicitud</h1>
        <p className="text-muted-foreground">Crear una nueva solicitud de servicio</p>
      </div>
      <SolicitudForm />
    </div>
  )
}
