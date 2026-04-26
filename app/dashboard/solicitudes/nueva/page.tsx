import BackButton from "@/components/BackBotton"
import { SolicitudForm } from "@/components/solicitud-form"

export default function NuevaSolicitudPage() {
  return (
    <div className="w-[90%] md:max-w-5xl mx-auto">
      <div className="pb-3">
        <BackButton href="/dashboard/solicitudes" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nueva Solicitud</h1>
        <p className="text-muted-foreground">Crear una nueva solicitud de servicio</p>
      </div>
      <SolicitudForm />
    </div>
  )
}
