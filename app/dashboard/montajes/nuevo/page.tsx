import BackButton from "@/components/BackBotton"
import { MontajeForm } from "@/components/montaje-form"

export default function NuevoMontajePage() {
  return (
    <div className="w-[90%] md:max-w-5xl mx-auto">
      <div className="pb-3">
        <BackButton href="/dashboard/montajes" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nuevo Montaje</h1>
        <p className="text-muted-foreground">Registrar un nuevo montaje</p>
      </div>
      <MontajeForm />
    </div>
  )
}
