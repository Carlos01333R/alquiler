import { EmpresaForm } from "@/components/empresa-form"
import BackButton from "@/components/BackBotton"

export default function NuevaEmpresaPage() {
  return (
    <div className="w-[90%] md:max-w-5xl mx-auto">
      <div className="flex flex-col  gap-y-3 pb-4">
        <section>
          <BackButton href="/dashboard/empresas" />
        </section>
        <section>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nueva Empresa</h1>
        <p className="text-muted-foreground">Registrar una nueva empresa en el sistema</p>
        </section>
      
      </div>
      <EmpresaForm />
    </div>
  )
}
