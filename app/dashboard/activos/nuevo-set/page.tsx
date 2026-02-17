import { SetActivoForm } from "@/components/set-activo-form"

export default function NuevoSetPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nuevo Set de Activos</h1>
        <p className="text-muted-foreground">Registrar un nuevo kit de equipos o maleta de herramientas</p>
      </div>
      <SetActivoForm />
    </div>
  )
}
