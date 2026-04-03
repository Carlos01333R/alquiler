import { ActivoForm } from "@/components/activo-form"

export default function NuevoActivoPage() {
  return (
    <div className="space-y-6 w-[90%] md:max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nuevo Activo</h1>
        <p className="text-muted-foreground">Registrar un nuevo equipo o herramienta</p>
      </div>
      <ActivoForm />
    </div>
  )
}
