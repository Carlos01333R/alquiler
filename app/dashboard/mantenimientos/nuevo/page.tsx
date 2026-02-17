import { MantenimientoForm } from "@/components/mantenimiento-form"

export default function NuevoMantenimientoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nuevo Mantenimiento</h1>
        <p className="text-muted-foreground">Crear una nueva orden de mantenimiento</p>
      </div>
      <MantenimientoForm />
    </div>
  )
}
