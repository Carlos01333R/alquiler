import BackButton from '@/components/BackBotton'
import NuevoDocumentoPage from '@/components/shared/NuevoDocumentoPage'
export default function Page() {
  return (
  <div>
    <section className='w-[90%] max-w-4xl mx-auto px-4 '>
     
      <BackButton href="/dashboard/ordenes" />
    </section>
  <NuevoDocumentoPage tipo="orden_compra" prefix="OC" backPath="/dashboard/ordenes" />
  </div>
  )  
}