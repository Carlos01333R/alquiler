import BackButton from '@/components/BackBotton'
import NuevoDocumentoPage from '@/components/shared/NuevoDocumentoPage'
 export default function Page() {
return (
<div>
   <section className='w-[90%] max-w-4xl mx-auto px-4 '>
     
      <BackButton href="/dashboard/otros_documentos" />
    </section>

<NuevoDocumentoPage tipo="otros_documentos" prefix="OTR" backPath="/dashboard/otros_documentos" />
 
    </div>
    
)}