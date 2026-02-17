import { MontajeForm } from "@/components/montaje-form"

export default function NuevoMontajePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nuevo Montaje</h1>
        <p className="text-muted-foreground">Registrar un nuevo montaje</p>
      </div>
      <MontajeForm />
    </div>
  )
}
