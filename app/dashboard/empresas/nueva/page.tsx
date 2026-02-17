import { EmpresaForm } from "@/components/empresa-form"

export default function NuevaEmpresaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nueva Empresa</h1>
        <p className="text-muted-foreground">Registrar una nueva empresa en el sistema</p>
      </div>
      <EmpresaForm />
    </div>
  )
}
