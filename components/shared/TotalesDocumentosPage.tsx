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
  MontajeDetalle,
  ProyectoDetalle,
} from '@/types/database.types'
import { toast } from "sonner"
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



// ── Clases reutilizables (Tailwind) ──────────────────────────────────────────
const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const btnSecondary = `${btnBase} bg-white border border-gray-300 text-gray-700 hover:bg-gray-50`
const btnGray = `${btnBase} bg-gray-700 text-white hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed`
const btnDanger = `${btnBase} bg-red-600 text-white hover:bg-red-700 cursor-pointer disabled:cursor-not-allowed`
const btnSuccess = `${btnBase} bg-green-600 text-white hover:bg-green-700`

const thCell = 'p-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600'
const thCellRight = `${thCell} text-right`
const tdCell = 'p-2 align-top text-sm text-gray-800'
const tdCellRight = `${tdCell} text-right`

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
    const proys = ((detalleData as any).proyectos as ProyectoDetalle[]) || []
    subtotal += proys.reduce((sum, p) => sum + (Number(p.costo) || 0), 0)
    const otrosProys = ((detalleData as any).otros_proyectos as ProyectoDetalle[]) || []
    subtotal += otrosProys.reduce((sum, p) => sum + (Number(p.costo) || 0), 0)
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

  // ── PDF generado (sin recortes, márgenes simétricos en todas las páginas) ───
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

      // 1. Medir en el DOM (antes de rasterizar) los bloques que NO se deben cortar.
      //    Los que tienen data-keep-with-next (título + thead de una tabla) se fusionan
      //    con el bloque siguiente (la primera fila) para que nunca quede un título o
      //    encabezado de tabla "huérfano" al final de una página.
      const scale = 2
      const contRectPre = elemento.getBoundingClientRect()
      const avoidElsPre = Array.from(
        elemento.querySelectorAll<HTMLElement>('[data-avoid-break]')
      ).filter(el => !el.closest('.pdf-exclude'))

      const rawRanges = avoidElsPre
        .map(el => {
          const r = el.getBoundingClientRect()
          return {
            top: (r.top - contRectPre.top) * scale,
            bottom: (r.bottom - contRectPre.top) * scale,
            keepWithNext: el.hasAttribute('data-keep-with-next'),
          }
        })
        .filter(r => r.bottom > r.top)
        .sort((a, b) => a.top - b.top)

      const avoidRanges: { top: number; bottom: number }[] = []
      for (let i = 0; i < rawRanges.length; i++) {
        let top = rawRanges[i].top
        let bottom = rawRanges[i].bottom
        while (rawRanges[i].keepWithNext && i + 1 < rawRanges.length) {
          i++
          bottom = Math.max(bottom, rawRanges[i].bottom)
        }
        avoidRanges.push({ top, bottom })
      }

      // 2. Rasterizar todo el documento a un único canvas de alta resolución
      const canvas = await html2canvas(elemento, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        ignoreElements: el => el.classList?.contains('no-print') ?? false,
        onclone: (_doc, clon) => sanitizar(clon),
      })

      // 3. Paginar dejando abajo solo el espacio justo para el pie de página
      //    (no un 20% fijo), sin cortar ningún bloque marcado a la mitad.
      const pageWidthMm = 215.9   // carta
      const pageHeightMm = 279.4
      const marginMm = 10
      const footerZoneMm = 22 // alto real que ocupa el pie de página, pegado al final de la hoja
      const contentWidthMm = pageWidthMm - marginMm * 2
      const contentHeightMm = pageHeightMm - marginMm - footerZoneMm

      const pxPerMm = canvas.width / contentWidthMm
      const pageHeightPx = contentHeightMm * pxPerMm

      // Pre-calculamos todas las rebanadas para saber el total de páginas
      // antes de dibujar el pie de página ("Página X de N").
      const slices: { data: string; heightMm: number }[] = []
      let cursor = 0
      const MIN_PROGRESS_PX = 20 // evita loops infinitos con bloques más altos que una página

      while (cursor < canvas.height - 1) {
        let sliceEnd = Math.min(cursor + pageHeightPx, canvas.height)

        // Si el corte cae dentro de un bloque "no partible", retrocedemos el corte
        // hasta el inicio de ese bloque, para que quede completo en la página siguiente.
        for (const range of avoidRanges) {
          if (range.top < sliceEnd && range.bottom > sliceEnd && range.top > cursor + MIN_PROGRESS_PX) {
            sliceEnd = range.top
            break
          }
        }
        if (sliceEnd - cursor < MIN_PROGRESS_PX) {
          sliceEnd = Math.min(cursor + pageHeightPx, canvas.height)
        }

        const sliceHeightPx = Math.max(1, Math.round(sliceEnd - cursor))

        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = sliceHeightPx
        const ctx = sliceCanvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
        ctx.drawImage(canvas, 0, cursor, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx)

        slices.push({
          data: sliceCanvas.toDataURL('image/jpeg', 0.95),
          heightMm: sliceHeightPx / pxPerMm,
        })

        cursor += sliceHeightPx
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true })
      const totalPaginas = slices.length

      slices.forEach((slice, i) => {
        if (i > 0) pdf.addPage()
        // Mismo margen (marginMm) arriba y a los lados en TODAS las páginas
        pdf.addImage(slice.data, 'JPEG', marginMm, marginMm, contentWidthMm, slice.heightMm, undefined, 'FAST')

        // ── Pie de página (repite en cada hoja, pegado al final) ──
        const footerTopMm = pageHeightMm - footerZoneMm
        pdf.setDrawColor(37, 99, 235) // azul, línea separadora
        pdf.setLineWidth(0.4)
        pdf.line(marginMm, footerTopMm, pageWidthMm - marginMm, footerTopMm)

        const nombreEmpresa = miEmpresa?.nombre_empresa || 'Mi Empresa'
        const nit = miEmpresa?.nit ? `NIT: ${miEmpresa.nit}` : ''
        const tituloDoc = documento?.subtipo_documento
          || tipoLabel[documento?.tipo_documento ?? '']
          || (documento?.tipo_documento ?? '').replace('_', ' ')
        const numeroDoc = documento?.numero_documento || ''

        let y = footerTopMm + 6
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor(30, 30, 30)
        pdf.text(nombreEmpresa, marginMm, y)

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        y += 4.5
        if (nit) { pdf.text(nit, marginMm, y); y += 4 }
        if (miEmpresa?.email) { pdf.text(miEmpresa.email, marginMm, y); y += 4 }
        if (miEmpresa?.telefono) { pdf.text(`Tel: ${miEmpresa.telefono}`, marginMm, y) }

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor(37, 99, 235)
        pdf.text(`${tituloDoc} ${numeroDoc}`.trim(), pageWidthMm - marginMm, footerTopMm + 6, { align: 'right' })

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.text(`Página ${i + 1} de ${totalPaginas}`, pageWidthMm - marginMm, footerTopMm + 10.5, { align: 'right' })
      })

      pdf.save(`${documento?.numero_documento || 'documento'}.pdf`)
      toast.success('PDF descargado exitosamente')
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar el PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-lg bg-white p-6 text-center shadow-md">
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!documento || !detalle || !empresa) return (
    <div className="mx-auto w-[90%] max-w-4xl rounded-lg bg-white px-4 py-6 shadow-md">

      <section className="flex items-center">
        <button onClick={() => router.back()} className={`${btnSecondary} mr-4`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </button>
      </section>

      <p className="text-center text-2xl font-bold text-red-500">
        No se pudo cargar los datos del documento
      </p>

      <section className="space-y-4 py-4">
        <p className="text-xl font-bold">Guia</p>
        <p>1. No se logro logro cargar los datos del documento o los detalles del documento. vuelve a los detalles del documento, seleccionas los servicios que quieras incluir para continuar.</p>

        <p>2. Ir a los detalles del documento
          <Link
            className="px-2 text-lg font-bold text-blue-500 underline"
            href={`/dashboard/${segmento}/${documentoId ?? ''}/detalles`}>aquí</Link> y selecciona los servicios que quieras incluir y luego <strong>PRESIONA EL BOTON DE &quot;CONTINUAR A TOTALES&quot;</strong> como se indica en la imagen.</p>
        <div className="flex items-center justify-center py-2">
          <Image src="/detalles.jpg" alt="Error cargando datos" width={600} height={600} />
        </div>

        <p>3. Una vez estes en el totales, donde puedes ver la factura de tus servicios, debes guardar la factura en <strong>&quot;GUARDAR DOCUMENTO (ORDEN DE COMPRA, COTIZACION, FACTURA)&quot;</strong> como se indica en la imagen.</p>

        <div className="flex items-center justify-center py-2">
          <Image src="/totales.png" alt="Guardar documento" width={600} height={600} />
        </div>
      </section>
    </div>
  )

  const activos = (detalle.activos_seleccionados as unknown as ActivoSeleccionado[]) || []
  const mantenimientos = (detalle.mantenimientos as unknown as MantenimientoDetalle[]) || []
  const montajes = (detalle.montajes as unknown as MontajeDetalle[]) || []
  const proyectos = ((detalle as any).proyectos as ProyectoDetalle[]) || []
  const otrosProyectos = ((detalle as any).otros_proyectos as ProyectoDetalle[]) || []

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
    <div className="min-h-screen bg-gray-100 py-6 print:min-h-0 print:bg-white print:py-0">
    
      <style>{`
        @page { size: letter; margin: 10mm 10mm 22mm 10mm; }
        @media print {
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .print-footer { display: block !important; }
        }
      `}</style>

      <div className="mx-auto max-w-5xl px-4">

        {/* ── Botones superiores + Toggle ── */}
        <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
          <button onClick={() => router.back()} className={btnSecondary}>Volver</button>

          {/* Botones de imprimir/descargar: solo visibles cuando modoSubirPDF está APAGADO */}
          {!modoSubirPDF && (
            <>
              <button onClick={() => window.print()} className={btnGray}>
                <p className="text-white">Imprimir</p>
                </button>
              <button
              
               onClick={descargarPDF} disabled={generatingPDF} className={btnDanger}>
                {generatingPDF && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                <p className=" text-white">
                  {generatingPDF ? 'Generando PDF...' : 'Descargar PDF'}
                </p>
              </button>
            </>
          )}

          {/* Toggle switch */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {modoSubirPDF ? 'Subir PDF externo' : 'Generar PDF'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={modoSubirPDF}
              onClick={() => setModoSubirPDF(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${modoSubirPDF ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${modoSubirPDF ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>

        {/* Banner documento relacionado */}
        {docRelacionadoInfo && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 print:hidden">
            <svg className="h-4 w-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-sm text-blue-800">
              Vinculado a <strong className="capitalize">{docRelacionadoInfo.tipo_documento.replace('_', ' ')}</strong>{' '}
              <strong>{docRelacionadoInfo.numero_documento}</strong>. Puede ajustar los valores libremente.
            </span>
          </div>
        )}

        {/* ── Documento imprimible ── */}
        <div ref={facturaRef} className="overflow-hidden rounded-lg bg-white shadow-md print:rounded-none print:shadow-none">

          {/* Header */}
          <div data-avoid-break className="avoid-break border-b-4 border-blue-600 p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                {miEmpresa?.logo_url && (
                  <div className="relative h-20 w-20 shrink-0">
                    <Image src={miEmpresa.logo_url} alt="Logo empresa" fill style={{ objectFit: 'contain' }} />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{miEmpresa?.nombre_empresa || 'Mi Empresa'}</h1>
                  <p className="text-sm text-gray-600">{miEmpresa?.razon_social}</p>
                  <p className="text-sm text-gray-600">NIT: {miEmpresa?.nit}</p>
                  {miEmpresa?.direccion && <p className="text-sm text-gray-600">{miEmpresa.direccion}</p>}
                  {miEmpresa?.ciudad && <p className="text-sm text-gray-600">{miEmpresa.ciudad}, {miEmpresa.pais || 'Colombia'}</p>}
                  {miEmpresa?.telefono && <p className="text-sm text-gray-600">Tel: {miEmpresa.telefono}</p>}
                  {miEmpresa?.email && <p className="text-sm text-gray-600">Email: {miEmpresa.email}</p>}
                </div>
              </div>

              <div className="text-right">
                {documento.subtipo_documento && (
                  <h2 className="text-lg font-bold uppercase text-blue-700">{documento.subtipo_documento}</h2>
                )}
                {!documento.subtipo_documento && (
                  <h2 className="text-lg font-bold uppercase text-blue-700">{tipoLabel[documento.tipo_documento] ?? documento.tipo_documento.replace('_', ' ')}</h2>
                )}
                <p className="text-2xl font-extrabold text-gray-900">{documento.numero_documento}</p>
                <p className="text-sm text-gray-600">
                  Fecha: {new Date(documento.fecha_emision + 'T00:00:00').toLocaleDateString('es-CO', {
                    timeZone: 'America/Bogota', year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>

                {docRelacionadoInfo && (
                  <p className="mt-2 text-xs text-gray-500">
                    Ref. {docRelacionadoInfo.tipo_documento.replace('_', ' ')}: {docRelacionadoInfo.numero_documento}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Cliente + Detalles del servicio: siempre en fila, una al lado de la otra */}
          <div className="flex flex-row gap-4 p-8 pt-6">
            <div data-avoid-break className="avoid-break min-w-0 flex-1 rounded-md border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Cliente</h3>
              <p className="font-bold text-gray-900">{empresa.razon_social}</p>
              <p className="text-sm text-gray-600">NIT: {empresa.nit}</p>
              {empresa.direccion_fiscal && <p className="text-sm text-gray-600">{empresa.direccion_fiscal}</p>}
              {empresa.ciudad && <p className="text-sm text-gray-600">{empresa.ciudad}</p>}
              {empresa.telefono && <p className="text-sm text-gray-600">Tel: {empresa.telefono}</p>}
              {empresa.email && <p className="text-sm text-gray-600">Email: {empresa.email}</p>}
            </div>

            <div data-avoid-break className="avoid-break min-w-0 flex-1 rounded-md border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Detalles del servicio</h3>
              {detalle.lugar_trabajo && <p className="text-sm text-gray-700"><strong>Lugar:</strong> {detalle.lugar_trabajo}</p>}
              {detalle.ciudad && <p className="text-sm text-gray-700"><strong>Ciudad:</strong> {detalle.ciudad}</p>}
              {detalle.direccion && <p className="text-sm text-gray-700"><strong>Dirección:</strong> {detalle.direccion}</p>}
              {detalle.fecha_inicio && <p className="text-sm text-gray-700"><strong>Inicio:</strong> {formatearFecha(detalle.fecha_inicio)}</p>}
              {detalle.fecha_fin && <p className="text-sm text-gray-700"><strong>Fin:</strong> {formatearFecha(detalle.fecha_fin)}</p>}
              {detalle.dias_totales != null && <p className="text-sm text-gray-700"><strong>Duración:</strong> {detalle.dias_totales} días</p>}
            </div>
          </div>

          {/* Tabla de Activos */}
          {activos.length > 0 && (
            <div className="px-8 pb-6">
              <h3 data-avoid-break data-keep-with-next className="avoid-break mb-2 text-sm font-bold uppercase text-gray-700">Activos y Equipos</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full border-collapse text-sm">
                  <thead data-avoid-break data-keep-with-next className="bg-gray-100">
                    <tr>
                      <th className={thCell}>Descripción</th>
                      <th className={thCell}>Tipo</th>
                      <th className={thCellRight}>Cant.</th>
                      <th className={thCellRight}>Fecha inicio</th>
                      <th className={thCellRight}>Fecha fin</th>
                      <th className={thCellRight}>Días</th>
                      <th className={thCellRight}>Precio/día</th>
                      <th className={thCellRight}>Precio/mes</th>
                      <th className={thCellRight}>Descuento</th>
                      <th className={thCellRight}>Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activos.map((activo, index) => (
                      <tr key={index} data-avoid-break className="avoid-break hover:bg-gray-50">
                        <td className={tdCell}>
                          {(activo.tipo === 'equipo' || activo.tipo === 'herramienta') && (
                            <button
                              onClick={() => router.push(`/dashboard/activos/${activo.activo_id}`)}
                              className="cursor-pointer font-medium text-blue-500 underline"
                            >
                              {activo.nombre}
                            </button>
                          )}

                          {(activo.tipo === 'kit_equipos' || activo.tipo === 'maleta_herramientas') && (
                            <button
                              onClick={() => router.push(`/dashboard/activos/set/${activo.activo_id}`)}
                              className="cursor-pointer font-medium text-blue-500 underline"
                            >
                              {activo.nombre}
                            </button>
                          )}

                         
                        </td>
                        <td className={`${tdCell} capitalize`}>{activo.tipo}</td>
                        <td className={tdCellRight}>{Number(activo.cantidad) || 1}</td>
                        <td className={tdCellRight}>
                          {activo.fecha_inicio
                            ? new Date(activo.fecha_inicio).toLocaleDateString('es-CO')
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className={tdCellRight}>
                          {activo.fecha_fin
                            ? new Date(activo.fecha_fin).toLocaleDateString('es-CO')
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className={tdCellRight}>{Number(activo.dias_totales) || 0}</td>
                        <td className={tdCellRight}>${fmt(activo.precio_dia)}</td>
                        <td className={tdCellRight}>${fmt(activo.precio_mes)}</td>
                        <td className={tdCellRight}>
                          {(Number(activo.descuento) || 0) > 0
                            ? <span className="text-red-600">-${fmt(activo.descuento)}</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className={`${tdCellRight} font-bold`}>${fmt(activo.precio_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla de Mantenimientos */}
          {mantenimientos.length > 0 && (
            <div className="px-8 pb-6">
              <h3 data-avoid-break data-keep-with-next className="avoid-break mb-2 text-sm font-bold uppercase text-gray-700">Servicios de Mantenimiento</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full border-collapse text-sm">
                  <thead data-avoid-break data-keep-with-next className="bg-gray-100">
                    <tr>
                      <th className={thCell}>Descripción</th>
                      <th className={thCell}>Tipo</th>
                      <th className={thCell}>Fecha inicio</th>
                      <th className={thCell}>Fecha fin</th>
                      <th className={thCell}>Prioridad</th>
                      <th className={thCellRight}>Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mantenimientos.map((mant: any, index) => (
                      <tr key={index} data-avoid-break className="avoid-break hover:bg-gray-50">
                        <td className={tdCell}>
                          <div className="font-bold text-gray-900">{mant.titulo}</div>
                          {mant.descripcion && <div className="text-sm text-gray-500">{mant.descripcion}</div>}
                        </td>
                        <td className={`${tdCell} capitalize`}>{mant.tipo}</td>
                        <td className={`${tdCell} capitalize`}>
                          {mant.fecha_inicio
                            ? new Date(mant.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CO')
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className={`${tdCell} capitalize`}>
                          {mant.fecha_final
                            ? new Date(mant.fecha_final + 'T00:00:00').toLocaleDateString('es-CO')
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className={`${tdCell} capitalize`}>{mant.prioridad || 'N/A'}</td>
                        <td className={`${tdCellRight} font-bold`}>${fmt(mant.costo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla de Montajes */}
          {montajes.length > 0 && (
            <div className="px-8 pb-6">
              <h3 data-avoid-break data-keep-with-next className="avoid-break mb-2 text-sm font-bold uppercase text-gray-700">Servicios de Montaje</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full border-collapse text-sm">
                  <thead data-avoid-break data-keep-with-next className="bg-gray-100">
                    <tr>
                      <th className={thCell}>Descripción</th>
                      <th className={thCell}>Tipo</th>
                      <th className={thCell}>Fecha inicio</th>
                      <th className={thCell}>Fecha final</th>
                      <th className={thCell}>Prioridad</th>
                      <th className={thCellRight}>Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {montajes.map((mont: any, index) => (
                      <tr key={index} data-avoid-break className="avoid-break hover:bg-gray-50">
                        <td className={tdCell}>
                          <div className="font-bold text-gray-900">{mont.titulo}</div>
                          {mont.descripcion && <div className="text-sm text-gray-500">{mont.descripcion}</div>}
                        </td>
                        <td className={`${tdCell} capitalize`}>{mont.tipo}</td>
                        <td className={`${tdCell} capitalize`}>
                          {mont.fecha_inicio
                            ? new Date(mont.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CO')
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className={`${tdCell} capitalize`}>
                          {mont.fecha_final
                            ? new Date(mont.fecha_final + 'T00:00:00').toLocaleDateString('es-CO')
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className={`${tdCell} capitalize`}>{mont.prioridad || 'N/A'}</td>
                        <td className={`${tdCellRight} font-bold`}>${fmt(mont.costo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla de Proyectos */}
          {proyectos.length > 0 && (
            <div className="px-8 pb-6">
              <h3 data-avoid-break data-keep-with-next className="avoid-break mb-2 text-sm font-bold uppercase text-gray-700">Proyectos</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full border-collapse text-sm">
                  <thead data-avoid-break data-keep-with-next className="bg-gray-100">
                    <tr>
                      <th className={thCell}>Descripción</th>
                      <th className={thCell}>Tipo</th>
                      <th className={thCell}>Fecha inicio</th>
                      <th className={thCell}>Fecha final</th>
                      <th className={thCell}>Prioridad</th>
                      <th className={thCellRight}>Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {proyectos.map((proy, index) => (
                      <tr key={index} data-avoid-break className="avoid-break hover:bg-gray-50">
                        <td className={tdCell}>
                          <div className="font-bold text-gray-900">{proy.titulo}</div>
                          {proy.descripcion && <div className="text-sm text-gray-500">{proy.descripcion}</div>}
                        </td>
                        <td className={`${tdCell} capitalize`}>{proy.tipo}</td>
                        <td className={`${tdCell} capitalize`}>
                          {proy.fecha_inicio
                            ? new Date(proy.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CO')
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className={`${tdCell} capitalize`}>
                          {proy.fecha_final
                            ? new Date(proy.fecha_final + 'T00:00:00').toLocaleDateString('es-CO')
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className={`${tdCell} capitalize`}>{proy.prioridad || 'N/A'}</td>
                        <td className={`${tdCellRight} font-bold`}>${fmt(proy.costo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla de Otros Proyectos */}
          {otrosProyectos.length > 0 && (
            <div className="px-8 pb-6">
              <h3 data-avoid-break data-keep-with-next className="avoid-break mb-2 text-sm font-bold uppercase text-gray-700">Otros Proyectos</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full border-collapse text-sm">
                  <thead data-avoid-break data-keep-with-next className="bg-gray-100">
                    <tr>
                      <th className={thCell}>Descripción</th>
                      <th className={thCell}>Tipo</th>
                      <th className={thCell}>Fecha inicio</th>
                      <th className={thCell}>Fecha final</th>
                      <th className={thCell}>Prioridad</th>
                      <th className={thCellRight}>Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {otrosProyectos.map((proy, index) => (
                      <tr key={index} data-avoid-break className="avoid-break hover:bg-gray-50">
                        <td className={tdCell}>
                          <div className="font-bold text-gray-900">{proy.titulo}</div>
                          {proy.descripcion && <div className="text-xs text-gray-500">{proy.descripcion}</div>}
                        </td>
                        <td className={`${tdCell} capitalize`}>{proy.tipo}</td>
                        <td className={tdCell}>
                          {proy.fecha_inicio
                            ? new Date(proy.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CO')
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className={tdCell}>
                          {proy.fecha_final
                            ? new Date(proy.fecha_final + 'T00:00:00').toLocaleDateString('es-CO')
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className={tdCell}>
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize">
                            {proy.prioridad || 'N/A'}
                          </span>
                        </td>
                        <td className={`${tdCellRight} font-semibold`}>${fmt(proy.costo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Observaciones */}
          {(documento.observaciones || detalle.observaciones_tecnicas) && (
            <div data-avoid-break className="avoid-break space-y-3 px-8 pb-6">
              {documento.observaciones && (
                <div>
                  <h4 className="mb-1 text-xs font-bold uppercase text-gray-500">Observaciones:</h4>
                  <p className="text-sm text-gray-700">{documento.observaciones}</p>
                </div>
              )}
              {detalle.observaciones_tecnicas && (
                <div>
                  <h4 className="mb-1 text-xs font-bold uppercase text-gray-500">Observaciones Técnicas:</h4>
                  <p className="text-sm text-gray-700">{detalle.observaciones_tecnicas}</p>
                </div>
              )}
            </div>
          )}

          {/* Totales */}
          <div className="px-8 pb-8">
            <div data-avoid-break className="avoid-break ml-auto w-full max-w-sm space-y-1">
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-bold text-gray-900">${fmt(totales.subtotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-4 py-1 text-sm print:hidden">
                <span className="text-gray-600">Descuento global ($):</span>
                <input
                  type="number" min="0" step="0.01"
                  value={totales.descuento}
                  onChange={e => setTotales(recalcular({ ...totales, descuento: parseFloat(e.target.value) || 0 }))}
                  className="w-32 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                />
              </div>
              <div className="hidden items-center justify-between py-1 text-sm print:flex">
                <span className="text-gray-600">Descuento:</span>
                <span className="font-bold text-gray-900">${fmt(totales.descuento)}</span>
              </div>

              <div className="flex items-center justify-between gap-4 py-1 text-sm print:hidden">
                <span className="text-gray-600">IVA (%):</span>
                <input
                  type="number" min="0" max="100" step="0.01"
                  value={totales.porcentaje_iva}
                  onChange={e => setTotales(recalcular({ ...totales, porcentaje_iva: parseFloat(e.target.value) || 0 }))}
                  className="w-32 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                />
              </div>

              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-gray-600">IVA ({totales.porcentaje_iva}%):</span>
                <span className="font-bold text-gray-900">${fmt(totales.iva)}</span>
              </div>

              <div className="flex items-center justify-between gap-4 py-1 text-sm print:hidden">
                <span className="text-gray-600">Otros impuestos ($):</span>
                <input
                  type="number" min="0" step="0.01"
                  value={totales.otros_impuestos}
                  onChange={e => setTotales(recalcular({ ...totales, otros_impuestos: parseFloat(e.target.value) || 0 }))}
                  className="w-32 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                />
              </div>
              <div className="hidden items-center justify-between py-1 text-sm print:flex">
                <span className="text-gray-600">Otros Impuestos:</span>
                <span className="font-bold text-gray-900">${fmt(totales.otros_impuestos)}</span>
              </div>

              <div className="mt-2 flex items-center justify-between border-t-2 border-gray-800 pt-3 text-lg font-extrabold text-gray-900">
                <span>TOTAL:</span>
                <span>${fmt(totales.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div data-avoid-break className="avoid-break border-t border-gray-100 py-6 text-center text-xs text-gray-400">
            <p>Gracias por su confianza</p>
            {miEmpresa?.email && <p>{miEmpresa.email} | {miEmpresa.telefono}</p>}
          </div>
        </div>

        {/* Pie de página fijo: se repite en CADA hoja al imprimir desde el navegador,
            pegado al final de la hoja (margen de @page ajustado a su altura real). No
            aparece en pantalla ni en el PDF generado con el botón (ese trae su propio
            pie de página dibujado). */}
        <div className="print-footer hidden" style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
          <div className="mx-auto flex max-w-4xl items-start justify-between border-t-2 border-blue-600 px-8 pt-2 text-xs text-gray-500">
            <div>
              <p className="font-bold text-gray-800">{miEmpresa?.nombre_empresa || 'Mi Empresa'}</p>
              {miEmpresa?.nit && <p>NIT: {miEmpresa.nit}</p>}
              {miEmpresa?.email && <p>{miEmpresa.email}</p>}
            </div>
            <div className="text-right">
              <p className="font-bold text-blue-700">
                {(documento.subtipo_documento || tipoLabel[documento.tipo_documento] || documento.tipo_documento.replace('_', ' '))} {documento.numero_documento}
              </p>
            </div>
          </div>
        </div>

        {/* ── Panel de subida de PDF (solo visible cuando el toggle está ON) ── */}
        {modoSubirPDF && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm print:hidden">
            <div className="mb-4 flex items-start gap-3">
              <svg className="h-6 w-6 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Adjuntar PDF externo</h3>
                <p className="text-sm text-gray-500">
                  Sube el PDF firmado, escaneado o generado por un sistema externo.
                  Máximo 10 MB.
                </p>
              </div>
            </div>

            {/* Zona de drop / selección */}
            {!archivoSeleccionado && !pdfSubidoUrl && (
              <div
                className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'}`}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="mx-auto mb-2 h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600">
                  Arrastra tu PDF aquí o <span className="font-medium text-blue-600 underline">haz clic para seleccionar</span>
                </p>
                <p className="mt-1 text-xs text-gray-400">Solo archivos .pdf — máx. 10 MB</p>
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
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-red-50">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-6 w-6 text-red-500">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{archivoSeleccionado.name}</p>
                    <p className="text-xs text-gray-500">{(archivoSeleccionado.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setArchivoSeleccionado(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Quitar archivo"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

          </div>
        )}

        {/* ── PDF adjunto: visible SIEMPRE que exista la URL, nunca en impresión/PDF ── */}
        {pdfSubidoUrl && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 print:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Documento PDF adjunto</p>
                <p className="text-xs text-gray-500">Este documento no aparece en la impresión ni en el PDF generado.</p>
              </div>
              {modoSubirPDF && (
                <button
                  type="button"
                  onClick={handleEliminarPDF}
                  className="ml-auto text-sm font-medium text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              )}
            </div>

            {/* Tarjeta con nombre del archivo y acciones */}
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex min-w-0 items-center gap-2">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate text-sm text-gray-700">
                  {decodeURIComponent(pdfSubidoUrl.split('/').pop()?.split('?')[0] ?? 'documento.pdf')}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <a href={pdfSubidoUrl} target="_blank" rel="noopener noreferrer" className={btnGray}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Ver
                </a>
                <a href={pdfSubidoUrl} download className={btnDanger}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
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
        <div className="mt-4 flex items-end justify-end gap-3 print:hidden">
          <button onClick={() => router.back()} className={btnSecondary}>Volver</button>
          <button onClick={handleGuardarTotales} disabled={saving || uploadingPDF} className={btnSuccess}>
            <p className="text-white">

            {(saving || uploadingPDF) ? 'Guardando...' : (guardarLabel[documento.tipo_documento] ?? 'Guardar documento')}
            </p>
          </button>
        </div>

      </div>
    </div>
  )
}