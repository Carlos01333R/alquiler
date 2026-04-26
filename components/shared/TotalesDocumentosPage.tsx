// app/dashboard/ordenes/[id]/totales/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import type {
  Database,
  DocumentoComercial,
  DetalleDocumentoComercial,
  MantenimientoDetalle,
  MontajeDetalle
} from '@/types/database.types'
import { toast } from "sonner"
// @ts-ignore
import "./totales.css"
import { formatearFecha } from "@/utils/FormatDate"
import Link from 'next/link'
import BackButton from '../BackBotton'
import { ArrowLeft } from 'lucide-react'

interface ActivoSeleccionado {
  activo_id: string
  nombre: string
  tipo: string
  cantidad: number
  fecha_inicio: string
  fecha_fin: string
  dias_totales: number
  precio_dia: number
  precio_mes: number
  descuento: number
  precio_total: number
}

interface MiEmpresa {
  id: string
  nombre_empresa: string
  nit: string
  razon_social: string
  email: string | null
  telefono: string | null
  celular: string | null
  sitio_web: string | null
  direccion: string | null
  ciudad: string | null
  pais: string | null
  logo_url: string | null
}

function fmt(value: unknown): string {
  return (Number(value) || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })
}

function desgloseActivo(activo: ActivoSeleccionado): string {
  const dias = Number(activo.dias_totales) || 0
  const meses = Math.floor(dias / 30)
  const diasRestantes = dias % 30
  const pdia = Number(activo.precio_dia) || 0
  const pmes = Number(activo.precio_mes) || 0
  const cant = Number(activo.cantidad) || 1

  let texto = ''
  if (meses > 0) {
    texto += `${meses} mes${meses > 1 ? 'es' : ''} × $${pmes.toLocaleString('es-CO')}`
    if (diasRestantes > 0) texto += ` + ${diasRestantes} día${diasRestantes > 1 ? 's' : ''} × $${pdia.toLocaleString('es-CO')}`
  } else {
    texto += `${dias} día${dias !== 1 ? 's' : ''} × $${pdia.toLocaleString('es-CO')}`
  }
  if (cant > 1) texto += ` × ${cant} und`
  return texto
}

export default function TotalesDocumentoPage() {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname();
  const searchParams = useSearchParams()
  const facturaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const documentoId = params.id as string
   const segmento = pathname.split("/")[2]; 
  const docRelacionadoId = searchParams.get('doc_relacionado_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  // ── Toggle: false = modo normal (imprimir/descargar), true = modo subir PDF ──
  const [modoSubirPDF, setModoSubirPDF] = useState(false)

  // ── Estado de subida de PDF ─────────────────────────────────────────────────
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const [uploadingPDF, setUploadingPDF] = useState(false)
  const [pdfSubidoUrl, setPdfSubidoUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const [documento, setDocumento] = useState<DocumentoComercial | null>(null)
  const [detalle, setDetalle] = useState<DetalleDocumentoComercial | null>(null)
  const [empresa, setEmpresa] = useState<any>(null)
  const [miEmpresa, setMiEmpresa] = useState<MiEmpresa | null>(null)
  const [docRelacionadoInfo, setDocRelacionadoInfo] = useState<{ numero_documento: string; tipo_documento: string } | null>(null)

  const [totales, setTotales] = useState({
    subtotal: 0,
    descuento: 0,
    porcentaje_iva: 19,
    iva: 0,
    otros_impuestos: 0,
    total: 0
  })

  useEffect(() => { cargarDatos() }, [])

  const cargarDatos = async () => {
    try {
      const { data: docData, error: docError } = await supabase
        .from('documentos_comerciales').select('*').eq('id', documentoId).single()
      if (docError) throw docError
      setDocumento(docData)

      const { data: empData, error: empError } = await supabase
        .from('empresas').select('*').eq('id', docData.empresa_id).single()
      if (empError) throw empError
      setEmpresa(empData)

      const { data: miEmpData, error: miEmpError } = await supabase
        .from('mi_empresa')
        .select('id, nombre_empresa, nit, razon_social, email, telefono, celular, sitio_web, direccion, ciudad, pais, logo_url')
        .single()
      if (miEmpError && miEmpError.code !== 'PGRST116') console.error('mi_empresa:', miEmpError)
      else if (miEmpData) setMiEmpresa(miEmpData)

      const { data: detData, error: detError } = await supabase
        .from('detalles_documentos_comerciales').select('*').eq('documento_comercial_id', documentoId).single()
      if (detError) throw detError
      setDetalle(detData)

      const subtotalBase = calcularSubtotalDesdeDetalle(detData)

      const { data: totalesExistentes } = await supabase
        .from('totales_documentos_comerciales')
        .select('*')
        .eq('documento_comercial_id', documentoId)
        .maybeSingle()

      // Cargar URL de PDF subido si existe
      if (totalesExistentes?.documento_pdf_url) {
        setPdfSubidoUrl(totalesExistentes.documento_pdf_url)
      }

      if (totalesExistentes && !docRelacionadoId) {
        const base = {
          subtotal: subtotalBase,
          descuento: Number(totalesExistentes.descuento),
          porcentaje_iva: Number(totalesExistentes.porcentaje_iva),
          iva: 0,
          otros_impuestos: Number(totalesExistentes.otros_impuestos),
          total: 0
        }
        setTotales(recalcular(base))
        setLoading(false)
        return
      }

      if (docRelacionadoId) {
        const { data: docRel } = await supabase
          .from('documentos_comerciales').select('numero_documento, tipo_documento').eq('id', docRelacionadoId).single()
        if (docRel) setDocRelacionadoInfo(docRel)

        const { data: totalesRel } = await supabase
          .from('totales_documentos_comerciales').select('*').eq('documento_comercial_id', docRelacionadoId).maybeSingle()

        if (totalesRel) {
          const base = {
            subtotal: subtotalBase,
            descuento: Number(totalesRel.descuento),
            porcentaje_iva: Number(totalesRel.porcentaje_iva),
            iva: 0,
            otros_impuestos: Number(totalesRel.otros_impuestos),
            total: 0
          }
          setTotales(recalcular(base))
          toast.info('Configuración de impuestos cargada desde el documento relacionado')
          setLoading(false)
          return
        }
      }

      setTotales(prev => recalcular({ ...prev, subtotal: subtotalBase }))
      setLoading(false)
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar los datos del documento')
      setLoading(false)
    }
  }

  const calcularSubtotalDesdeDetalle = (detalleData: DetalleDocumentoComercial): number => {
    let subtotal = 0
    const activos = (detalleData.activos_seleccionados as unknown as ActivoSeleccionado[]) || []
    subtotal += activos.reduce((sum, a) => sum + (Number(a.precio_total) || 0), 0)
    const mants = (detalleData.mantenimientos as unknown as MantenimientoDetalle[]) || []
    subtotal += mants.reduce((sum, m) => sum + (Number(m.costo) || 0), 0)
    const monts = (detalleData.montajes as unknown as MontajeDetalle[]) || []
    subtotal += monts.reduce((sum, m) => sum + (Number(m.costo) || 0), 0)
    return subtotal
  }

  const recalcular = (vals: typeof totales) => {
    const iva = (vals.subtotal - vals.descuento) * (vals.porcentaje_iva / 100)
    const total = vals.subtotal - vals.descuento + iva + vals.otros_impuestos
    return { ...vals, iva: parseFloat(iva.toFixed(2)), total: parseFloat(total.toFixed(2)) }
  }

  // ── Subida de PDF ───────────────────────────────────────────────────────────
  const validarArchivo = (file: File): boolean => {
    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF')
      return false
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 10 MB')
      return false
    }
    return true
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && validarArchivo(file)) {
      setArchivoSeleccionado(file)
      setPdfSubidoUrl(null) // resetear URL previa si se elige nuevo archivo
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && validarArchivo(file)) {
      setArchivoSeleccionado(file)
      setPdfSubidoUrl(null)
    }
  }

  const handleSubirPDF = async (): Promise<string | null> => {
    if (!archivoSeleccionado) return pdfSubidoUrl

    setUploadingPDF(true)
    try {
      const extension = 'pdf'
      const nombreArchivo = `documentos/${documentoId}/${Date.now()}.${extension}`

      const { data, error } = await supabase.storage
        .from('documentos-pdf')
        .upload(nombreArchivo, archivoSeleccionado, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('documentos-pdf')
        .getPublicUrl(data.path)

      const url = urlData.publicUrl
      setPdfSubidoUrl(url)
      toast.success('PDF subido correctamente')
      return url
    } catch (error) {
      console.error('Error subiendo PDF:', error)
      toast.error('Error al subir el PDF')
      return null
    } finally {
      setUploadingPDF(false)
    }
  }

  const handleEliminarPDF = async () => {
    setArchivoSeleccionado(null)
    setPdfSubidoUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    // Si ya estaba guardado en DB, limpiar el campo
    try {
      await supabase
        .from('totales_documentos_comerciales')
        .update({ documento_pdf_url: null })
        .eq('documento_comercial_id', documentoId)
    } catch (e) {
      // ignorar si aún no existe el registro
    }
  }

  // ── Guardar ─────────────────────────────────────────────────────────────────
  const handleGuardarTotales = async () => {
    setSaving(true)
    try {
      // Si modo subir PDF, primero subir el archivo
      let urlPDF: string | null = pdfSubidoUrl
      if (modoSubirPDF && archivoSeleccionado) {
        urlPDF = await handleSubirPDF()
        if (!urlPDF) {
          setSaving(false)
          return
        }
      }

      await supabase
        .from('totales_documentos_comerciales')
        .delete()
        .eq('documento_comercial_id', documentoId)

      const { error } = await supabase
        .from('totales_documentos_comerciales')
        .insert({
          documento_comercial_id: documentoId,
          subtotal: totales.subtotal,
          descuento: totales.descuento,
          porcentaje_iva: totales.porcentaje_iva,
          iva: totales.iva,
          otros_impuestos: totales.otros_impuestos,
          total: totales.total,
          documento_pdf_url: urlPDF ?? null,
        })
      if (error) throw error

      if (documento?.tipo_documento === 'orden_compra' && detalle) {
  const activosDoc = (detalle.activos_seleccionados as unknown as ActivoSeleccionado[]) || []
  
  if (activosDoc.length > 0) {
    const ids = activosDoc.map(a => a.activo_id)

    // Consultar cuáles IDs existen en cada tabla
    const [{ data: idsEnActivos }, { data: idsEnSets }] = await Promise.all([
      supabase.from('activos').select('id').in('id', ids),
      supabase.from('sets_activos').select('id').in('id', ids),
    ])

    const errores: string[] = []

    // Actualizar activos normales
    if (idsEnActivos && idsEnActivos.length > 0) {
      const { error } = await supabase
        .from('activos')
        .update({ estado_disponibilidad: 'alquilado' })
        .in('id', idsEnActivos.map(a => a.id))
      if (error) errores.push('activos')
    }

    // Actualizar sets de activos
    if (idsEnSets && idsEnSets.length > 0) {
      const { error } = await supabase
        .from('sets_activos')
        .update({ estado_disponibilidad: 'alquilado' })
        .in('id', idsEnSets.map(s => s.id))
      if (error) errores.push('sets')
    }

    if (errores.length > 0) {
      toast.warning(`Documento guardado, pero hubo un error al actualizar: ${errores.join(', ')}`)
    } else {
      const total = (idsEnActivos?.length ?? 0) + (idsEnSets?.length ?? 0)
      toast.success(
        `Orden guardada. ${total} ítem${total !== 1 ? 's' : ''} marcado${total !== 1 ? 's' : ''} como alquilado`
      )
    }
  } else {
    toast.success('Orden de compra guardada')
  }

  router.push('/dashboard/ordenes')
  return
}

      toast.success('Documento guardado exitosamente')
      const tipo = documento?.tipo_documento
      if (tipo === 'cotizacion') router.push('/dashboard/cotizaciones')
      else if (tipo === 'otros_documentos') router.push('/dashboard/otros_documentos')
      else router.push('/dashboard/ordenes')
    } catch (error) {
      console.error('Error guardando totales:', error)
      toast.error('Error al guardar los totales')
      setSaving(false)
    }
  }

  // ── PDF generado ────────────────────────────────────────────────────────────
  const descargarPDF = async () => {
    setGeneratingPDF(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const html2canvas = (await import('html2canvas')).default
      const elemento = facturaRef.current
      if (!elemento) return

      const COLOR_PROPS = [
        'color', 'background-color', 'border-color',
        'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
        'outline-color', 'text-decoration-color',
      ]
      const UNSAFE = ['lab(', 'oklch(', 'color(display', 'color(srgb']

      const sanitizar = (nodo: HTMLElement) => {
        const computed = window.getComputedStyle(nodo)
        COLOR_PROPS.forEach(prop => {
          const val = computed.getPropertyValue(prop)
          if (val && UNSAFE.some(u => val.includes(u))) {
            try {
              const tmp = document.createElement('canvas')
              tmp.width = tmp.height = 1
              const ctx = tmp.getContext('2d')!
              ctx.fillStyle = val
              ctx.fillRect(0, 0, 1, 1)
              const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
                ;(nodo.style as any)[prop.replace(/-([a-z])/g, (_, l) => l.toUpperCase())] =
                `rgb(${r},${g},${b})`
            } catch {
              ;(nodo.style as any)[prop.replace(/-([a-z])/g, (_, l) => l.toUpperCase())] =
                prop.includes('background') ? '#ffffff' : '#000000'
            }
          }
        })
        Array.from(nodo.children).forEach(c => sanitizar(c as HTMLElement))
      }

      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        ignoreElements: el => el.classList?.contains('no-print') ?? false,
        onclone: (_doc, clon) => sanitizar(clon),
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true })
      const imgWidth = 215.9
      const pageHeight = 279.4
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
      heightLeft -= pageHeight
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
        heightLeft -= pageHeight
      }
      pdf.save(`${documento?.numero_documento || 'documento'}.pdf`)
      toast.success('PDF descargado exitosamente')
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar el PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }


  if (loading) return <div className="page-container"><div className="card"><p>Cargando...</p></div></div>
  if (!documento || !detalle || !empresa) return(
    <div className="w-[90%] max-w-4xl mx-auto px-4 py-6 bg-white rounded-lg shadow-md">
      
      <section className='flex items-center'>
        <button onClick={() => router.back()} className="btn btn-secondary mr-4">
          <ArrowLeft  className="mr-1 h-4 w-4" />
          Volver</button>
         
      </section>
  
  <p className='text-center font-bold  text-2xl text-red-500'>
       No se pudo cargar los datos del documento
     </p>

     <section className='py-4 space-y-4'>
      <p className="font-bold text-xl">Guia</p>
      <p>1. No se logro logro cargar los datos del documento o los detalles del documento. vuelve a los detalles del documento, seleccionas los servicios que quieras incluir para continuar.</p>

       <p>2. Ir a los detalles del documento
       <Link
       className='text-blue-500 underline text-lg font-bold px-2'
     href={`/dashboard/${segmento}/${documentoId ?? ''}/detalles`}>aquí</Link> y selecciona los servicios que quieras incluir y luego <strong>PRESIONA EL BOTON DE "CONTINUAR A TOTALES"</strong> como se indica en la imagen.</p>
    <div className='flex items-center justify-center py-2'>
      <Image src="/detalles.jpg" alt="Error cargando datos" width={600} height={600} />
  
    </div>

   
      
    <p>3. Una vez estes en el totales, donde puedes ver la factura de tus servicios, debes guardar la factura en <strong>"GUARDAR DOCUMENTO (ORDEN DE COMPRA, COTIZACION, FACTURA)"</strong>como se indica en la imagen.</p>
    
      <div className='flex items-center justify-center py-2'>
        <Image src="/totales.png" alt="Guardar documento" width={600} height={600} />
    
      </div>
    
     </section>
    </div>
  )

  const activos = (detalle.activos_seleccionados as unknown as ActivoSeleccionado[]) || []
 

  const mantenimientos = (detalle.mantenimientos as unknown as MantenimientoDetalle[]) || []
  console.log('Mantenimientos para totales:', mantenimientos) // Log para verificar datos
  const montajes = (detalle.montajes as unknown as MontajeDetalle[]) || []

  const tipoLabel: Record<string, string> = {
    orden_compra: 'Orden de Compra',
    cotizacion: 'Cotización',
    factura: 'Factura',
  }

  const guardarLabel: Record<string, string> = {
    orden_compra: 'Guardar Orden de Compra',
    cotizacion: 'Guardar Cotización',
    factura: 'Guardar Factura',
  }



  return (
    <div className="totales-page-wrapper">
      <div className="page-container">

        {/* ── Botones superiores + Toggle ── */}
        <div className="action-buttons no-print">
          <button onClick={() => router.back()} className="btn btn-secondary">Volver</button>

          {/* Botones de imprimir/descargar: solo visibles cuando modoSubirPDF está APAGADO */}
          {!modoSubirPDF && (
            <>
              <button onClick={() => window.print()} className="btn btn-gray">Imprimir</button>
              <button onClick={descargarPDF} disabled={generatingPDF} className="btn btn-danger">
                {generatingPDF && <div className="spinner" />}
                {generatingPDF ? 'Generando PDF...' : 'Descargar PDF'}
              </button>
            </>
          )}

          {/* Toggle switch */}
          <div className="pdf-toggle-wrapper">
            <span className="pdf-toggle-label">
              {modoSubirPDF ? 'Subir PDF externo' : 'Generar PDF'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={modoSubirPDF}
              onClick={() => setModoSubirPDF(v => !v)}
              className={`pdf-toggle-btn ${modoSubirPDF ? 'pdf-toggle-btn--on' : 'pdf-toggle-btn--off'}`}
            >
              <span className={`pdf-toggle-thumb ${modoSubirPDF ? 'pdf-toggle-thumb--on' : 'pdf-toggle-thumb--off'}`} />
            </button>
          </div>
        </div>

        {/* Banner documento relacionado */}
        {docRelacionadoInfo && (
          <div className="no-print mb-4 bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-sm text-blue-800">
              Vinculado a <strong className="capitalize">{docRelacionadoInfo.tipo_documento.replace('_', ' ')}</strong>{' '}
              <strong>{docRelacionadoInfo.numero_documento}</strong>. Puede ajustar los valores libremente.
            </span>
          </div>
        )}

        {/* ── Documento imprimible ── */}
        <div ref={facturaRef} className="factura">

          {/* Header */}
          <div className="factura-header">
            <div className="header-content">
              <div className="empresa-info">
                {miEmpresa?.logo_url && (
                  <div className="logo-container">
                    <Image src={miEmpresa.logo_url} alt="Logo empresa" fill style={{ objectFit: 'contain' }} />
                  </div>
                )}
                <div>
                  <h1 className="empresa-nombre">{miEmpresa?.nombre_empresa || 'Mi Empresa'}</h1>
                  <p className="text-sm">{miEmpresa?.razon_social}</p>
                  <p className="text-sm">NIT: {miEmpresa?.nit}</p>
                  {miEmpresa?.direccion && <p className="text-sm">{miEmpresa.direccion}</p>}
                  {miEmpresa?.ciudad && <p className="text-sm">{miEmpresa.ciudad}, {miEmpresa.pais || 'Colombia'}</p>}
                  {miEmpresa?.telefono && <p className="text-sm">Tel: {miEmpresa.telefono}</p>}
                  {miEmpresa?.email && <p className="text-sm">Email: {miEmpresa.email}</p>}
                </div>
              </div>

              <div className="documento-info">
               {documento.subtipo_documento && (
                <h2 className="documento-tipo">
                  {documento.subtipo_documento}
                </h2>
               )}
               {!documento.subtipo_documento && (
                <h2 className="documento-tipo">{tipoLabel[documento.tipo_documento] ?? documento.tipo_documento.replace('_', ' ')}</h2>
               )}
                <p className="documento-numero">{documento.numero_documento}</p>
                <p className="text-sm">
                  Fecha: {new Date(documento.fecha_emision + 'T00:00:00').toLocaleDateString('es-CO', {
                    timeZone: 'America/Bogota', year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              
                {docRelacionadoInfo && (
                  <p className="text-xs mt-2 text-gray-500">
                    Ref. {docRelacionadoInfo.tipo_documento.replace('_', ' ')}: {docRelacionadoInfo.numero_documento}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Cliente + Detalles del servicio */}
          <div className="info-grid">
            <div className="info-box">
              <h3 className="info-title">CLIENTE</h3>
              <p className="font-bold">{empresa.razon_social}</p>
              <p className="text-sm">NIT: {empresa.nit}</p>
              {empresa.direccion_fiscal && <p className="text-sm">{empresa.direccion_fiscal}</p>}
              {empresa.ciudad && <p className="text-sm">{empresa.ciudad}</p>}
              {empresa.telefono && <p className="text-sm">Tel: {empresa.telefono}</p>}
              {empresa.email && <p className="text-sm">Email: {empresa.email}</p>}
            </div>

            <div className="info-box">
              <h3 className="info-title">DETALLES DEL SERVICIO</h3>
              {detalle.lugar_trabajo && <p className="text-sm"><strong>Lugar:</strong> {detalle.lugar_trabajo}</p>}
              {detalle.ciudad && <p className="text-sm"><strong>Ciudad:</strong> {detalle.ciudad}</p>}
              {detalle.direccion && <p className="text-sm"><strong>Dirección:</strong> {detalle.direccion}</p>}
              {detalle.fecha_inicio && <p className="text-sm"><strong>Inicio:</strong> {formatearFecha(detalle.fecha_inicio)}</p>}
              {detalle.fecha_fin && <p className="text-sm"><strong>Fin:</strong> {formatearFecha(detalle.fecha_fin)}</p>}
              {detalle.dias_totales != null && <p className="text-sm"><strong>Duración:</strong> {detalle.dias_totales} días</p>}
            </div>
          </div>

          {/* Tabla de Activos */}
          {activos.length > 0 && (
            <div className="table-section">
              <h3 className="section-title">ACTIVOS Y EQUIPOS</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Tipo</th>
                    <th className="text-right">Cant.</th>
                    <th className="text-right">Fecha inicio</th>
                    <th className="text-right">Fecha fin</th>
                    <th className="text-right">Días</th>
                    <th className="text-right">Precio/día</th>
                    <th className="text-right">Precio/mes</th>
                    <th className="text-right">Descuento</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activos.map((activo, index) => (

                    
                    <tr key={index}>
                      <td>
                     {(activo.tipo === 'equipo' || activo.tipo === 'herramienta') && (
                      <button
                        onClick={() => router.push(`/dashboard/activos/${activo.activo_id}`)}
                        className="font-medium text-blue-500 underline cursor-pointer"
                      >
                        {activo.nombre}
                      </button>
                    )}

                    {(activo.tipo === 'kit_equipos' || activo.tipo === 'maleta_herramientas') && (
                      <button
                        onClick={() => router.push(`/dashboard/activos/set/${activo.activo_id}`)}
                        className="font-medium text-blue-500 underline cursor-pointer"
                      >
                        {activo.nombre}
                      </button>
                    )}

                        {(Number(activo.dias_totales) || 0) > 0 && (
                          <div className="text-xs text-gray-400 mt-0.5">{desgloseActivo(activo)}</div>
                        )}
                        {activo.fecha_inicio && activo.fecha_fin && (
                          <div className="text-xs text-gray-400">
                            {formatearFecha(activo.fecha_inicio)} → {formatearFecha(activo.fecha_fin)}
                          </div>
                        )}
                      </td>
                      <td className="text-sm">{activo.tipo}</td>
                      <td className="text-right">{Number(activo.cantidad) || 1}</td>
                      <td className="text-right">
                         {activo.fecha_inicio
                          ? new Date(activo.fecha_inicio).toLocaleDateString('es-CO')
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="text-right">
                         {activo.fecha_fin
                          ? new Date(activo.fecha_fin).toLocaleDateString('es-CO')
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      
                      <td className="text-right">{Number(activo.dias_totales) || 0}</td>
                      <td className="text-right">${fmt(activo.precio_dia)}</td>
                      <td className="text-right">${fmt(activo.precio_mes)}</td>
                      <td className="text-right">
                        {(Number(activo.descuento) || 0) > 0
                          ? <span className="text-red-600">-${fmt(activo.descuento)}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="text-right font-bold">${fmt(activo.precio_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabla de Mantenimientos */}
          {mantenimientos.length > 0 && (
            <div className="table-section">
              <h3 className="section-title">SERVICIOS DE MANTENIMIENTO</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Tipo</th>
                    <th>Fecha inicio</th>
                    <th>Fecha fin</th>
                    <th>Prioridad</th>
                    <th className="text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {mantenimientos.map((mant: any, index) => (
                    <tr key={index}>
                      
                      <td>
                        <div className="font-bold">{mant.titulo}</div>
                        {mant.descripcion && <div
                         className="text-sm text-gray-500">{mant.descripcion}</div>}
                      </td>
                      
                      <td className="text-sm capitalize">{mant.tipo}</td>
                      <td className="text-sm capitalize">
                        {mant.fecha_inicio
                          ? new Date(mant.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CO')
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                        <td className="text-sm capitalize">
                       {mant.fecha_final
                          ? new Date(mant.fecha_final + 'T00:00:00').toLocaleDateString('es-CO')
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                    
                      
                      <td className="text-sm capitalize">{mant.prioridad || 'N/A'}</td>
                      <td className="text-right font-bold">${fmt(mant.costo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabla de Montajes */}
          {montajes.length > 0 && (
            <div className="table-section">
              <h3 className="section-title">SERVICIOS DE MONTAJE</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Tipo</th>
                    <th>Fecha inicio</th>
                    <th>Fecha final</th>
                    <th>Prioridad</th>
                    <th className="text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {montajes.map((mont: any, index) => (
                    <tr key={index}>
                      <td>
                        <div className="font-bold">{mont.titulo}</div>
                        {mont.descripcion && <div className="text-sm text-gray-500">{mont.descripcion}</div>}
                      </td>
                      <td className="text-sm capitalize">{mont.tipo}</td>
                        <td className="text-sm capitalize">
                        {mont.fecha_inicio
                          ? new Date(mont.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CO')
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                        <td className="text-sm capitalize">
                       {mont.fecha_final
                          ? new Date(mont.fecha_final + 'T00:00:00').toLocaleDateString('es-CO')
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="text-sm capitalize">{mont.prioridad || 'N/A'}</td>
                      <td className="text-right font-bold">${fmt(mont.costo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Observaciones */}
          {(documento.observaciones || detalle.observaciones_tecnicas) && (
            <div className="observaciones-box">
              {documento.observaciones && (
                <div>
                  <h4 className="obs-title">Observaciones:</h4>
                  <p className="text-sm">{documento.observaciones}</p>
                </div>
              )}
              {detalle.observaciones_tecnicas && (
                <div>
                  <h4 className="obs-title">Observaciones Técnicas:</h4>
                  <p className="text-sm">{detalle.observaciones_tecnicas}</p>
                </div>
              )}
            </div>
          )}

          {/* Totales */}
          <div className="totales-section">
            <div className="totales-container">
              <div className="totales-row">
                <span>Subtotal:</span>
                <span className="font-bold">${fmt(totales.subtotal)}</span>
              </div>

              <div className="totales-row no-print">
                <span>Descuento global ($):</span>
                <input
                  type="number" min="0" step="0.01"
                  value={totales.descuento}
                  onChange={e => setTotales(recalcular({ ...totales, descuento: parseFloat(e.target.value) || 0 }))}
                  className="totales-input"
                />
              </div>
              <div className="totales-row print-only">
                <span>Descuento:</span>
                <span className="font-bold">${fmt(totales.descuento)}</span>
              </div>

              <div className="totales-row no-print">
                <span>IVA (%):</span>
                <input
                  type="number" min="0" max="100" step="0.01"
                  value={totales.porcentaje_iva}
                  onChange={e => setTotales(recalcular({ ...totales, porcentaje_iva: parseFloat(e.target.value) || 0 }))}
                  className="totales-input"
                />
              </div>

              <div className="totales-row">
                <span>IVA ({totales.porcentaje_iva}%):</span>
                <span className="font-bold">${fmt(totales.iva)}</span>
              </div>

              <div className="totales-row no-print">
                <span>Otros impuestos ($):</span>
                <input
                  type="number" min="0" step="0.01"
                  value={totales.otros_impuestos}
                  onChange={e => setTotales(recalcular({ ...totales, otros_impuestos: parseFloat(e.target.value) || 0 }))}
                  className="totales-input"
                />
              </div>
              <div className="totales-row print-only">
                <span>Otros Impuestos:</span>
                <span className="font-bold">${fmt(totales.otros_impuestos)}</span>
              </div>

              <div className="totales-total">
                <span>TOTAL:</span>
                <span>${fmt(totales.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="factura-footer">
            <p>Gracias por su confianza</p>
            {miEmpresa?.email && <p>{miEmpresa.email} | {miEmpresa.telefono}</p>}
          </div>
        </div>

        {/* ── Panel de subida de PDF (solo visible cuando el toggle está ON) ── */}
        {modoSubirPDF && (
          <div className="no-print pdf-upload-panel">
            <div className="pdf-upload-header">
              <svg className="pdf-upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <h3 className="pdf-upload-title">Adjuntar PDF externo</h3>
                <p className="pdf-upload-subtitle">
                  Sube el PDF firmado, escaneado o generado por un sistema externo.
                  Máximo 10 MB.
                </p>
              </div>
            </div>

            {/* Zona de drop / selección */}
            {!archivoSeleccionado && !pdfSubidoUrl && (
              <div
                className={`pdf-dropzone ${isDragOver ? 'pdf-dropzone--active' : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="pdf-dropzone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="pdf-dropzone-text">
                  Arrastra tu PDF aquí o <span className="pdf-dropzone-link">haz clic para seleccionar</span>
                </p>
                <p className="pdf-dropzone-hint">Solo archivos .pdf — máx. 10 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}

            {/* Vista previa del archivo seleccionado (aún no subido) */}
            {archivoSeleccionado && !pdfSubidoUrl && (
              <div className="pdf-preview-card">
                <div className="pdf-preview-info">
                  <div className="pdf-preview-thumb">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6 text-red-500">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="pdf-preview-name">{archivoSeleccionado.name}</p>
                    <p className="pdf-preview-size">{(archivoSeleccionado.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setArchivoSeleccionado(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="pdf-preview-remove"
                  title="Quitar archivo"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

          </div>
        )}

        {/* ── PDF adjunto: visible SIEMPRE que exista la URL, nunca en impresión/PDF ── */}
        {pdfSubidoUrl && (
          <div className="no-print pdf-adjunto-panel">
            <div className="pdf-adjunto-header">
              <div className="pdf-adjunto-badge">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="pdf-adjunto-title">Documento PDF adjunto</p>
                <p className="pdf-adjunto-subtitle">Este documento no aparece en la impresión ni en el PDF generado.</p>
              </div>
              {modoSubirPDF && (
                <button
                  type="button"
                  onClick={handleEliminarPDF}
                  className="pdf-saved-remove ml-auto"
                >
                  Eliminar
                </button>
              )}
            </div>

            {/* Tarjeta con nombre del archivo y acciones */}
            <div className="pdf-adjunto-file-card">
              <div className="pdf-adjunto-file-info">
                <div className="pdf-adjunto-file-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="pdf-adjunto-file-name">
                  {decodeURIComponent(pdfSubidoUrl.split('/').pop()?.split('?')[0] ?? 'documento.pdf')}
                </span>
              </div>
              <div className="pdf-adjunto-file-actions">
                <a href={pdfSubidoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-gray">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Ver
                </a>
                <a href={pdfSubidoUrl} download className="btn btn-danger">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── Botones inferiores ── */}
        <div className="action-buttons-bottom no-print">
          <button onClick={() => router.back()} className="btn btn-secondary">Volver</button>
          <button onClick={handleGuardarTotales} disabled={saving || uploadingPDF} className="btn btn-success">
            {(saving || uploadingPDF) ? 'Guardando...' : (guardarLabel[documento.tipo_documento] ?? 'Guardar documento')}
          </button>
        </div>

      </div>
    </div>
  )
}