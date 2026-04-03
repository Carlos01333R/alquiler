import DetallesDocumentoPage from '@/components/shared/DetallesDocumentoPage'
 export default function Page() {
return  <DetallesDocumentoPage
      backPath="/dashboard/otros_documentos"
      nextBasePath="/dashboard/otros_documentos"  // ← debe ser esto, no '/dashboard/facturas'
    />
}