// app/documentos/[id]/totales/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import type {
  Database,
  DocumentoComercial,
  DetalleDocumentoComercial,
  ActivoSeleccionado,
  MantenimientoDetalle,
  MontajeDetalle
} from '@/types/database.types'
import { toast } from "sonner"
import { formatearFecha } from "@/utils/FormatDate"

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

export default function TotalesDocumentoPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const facturaRef = useRef<HTMLDivElement>(null)

  const documentoId = params.id as string
  const docRelacionadoId = searchParams.get('doc_relacionado_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)

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

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    calcularTotales()
  }, [totales.subtotal, totales.descuento, totales.porcentaje_iva, totales.otros_impuestos])

  const cargarDatos = async () => {
    try {
      // 1. Cargar documento actual
      const { data: docData, error: docError } = await supabase
        .from('documentos_comerciales')
        .select('*')
        .eq('id', documentoId)
        .single()
      if (docError) throw docError
      setDocumento(docData)

      // 2. Cargar empresa del documento actual
      const { data: empData, error: empError } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', docData.empresa_id)
        .single()
      if (empError) throw empError
      setEmpresa(empData)

      // 3. Cargar mi empresa
      const { data: miEmpData, error: miEmpError } = await supabase
        .from('mi_empresa')
        .select('id, nombre_empresa, nit, razon_social, email, telefono, celular, sitio_web, direccion, ciudad, pais, logo_url')
        .single()
      if (miEmpError && miEmpError.code !== 'PGRST116') {
        console.error('Error cargando mi empresa:', miEmpError)
      } else if (miEmpData) {
        setMiEmpresa(miEmpData)
      }

      // 4. Cargar detalles del documento actual
      const { data: detData, error: detError } = await supabase
        .from('detalles_documentos_comerciales')
        .select('*')
        .eq('documento_comercial_id', documentoId)
        .single()
      if (detError) throw detError
      setDetalle(detData)

      // 5. Calcular subtotal desde detalles actuales
      let subtotalBase = calcularSubtotalDesdeDetalle(detData)

      // 6. Si hay documento relacionado, cargar sus totales para pre-llenar descuento/IVA/otros
      if (docRelacionadoId) {
        const { data: docRel } = await supabase
          .from('documentos_comerciales')
          .select('numero_documento, tipo_documento')
          .eq('id', docRelacionadoId)
          .single()
        if (docRel) setDocRelacionadoInfo(docRel)

        const { data: totalesRel } = await supabase
          .from('totales_documentos_comerciales')
          .select('*')
          .eq('documento_comercial_id', docRelacionadoId)
          .maybeSingle()

        if (totalesRel) {
          // Pre-llenar configuración de impuestos del documento relacionado
          // pero usando el subtotal recién calculado del documento actual
          const ivaCalc = (subtotalBase - Number(totalesRel.descuento)) * (Number(totalesRel.porcentaje_iva) / 100)
          const totalCalc = subtotalBase - Number(totalesRel.descuento) + ivaCalc + Number(totalesRel.otros_impuestos)

          setTotales({
            subtotal: subtotalBase,
            descuento: Number(totalesRel.descuento),
            porcentaje_iva: Number(totalesRel.porcentaje_iva),
            iva: parseFloat(ivaCalc.toFixed(2)),
            otros_impuestos: Number(totalesRel.otros_impuestos),
            total: parseFloat(totalCalc.toFixed(2))
          })

          toast.info('Configuración de impuestos cargada desde el documento relacionado')
          setLoading(false)
          return // evitar re-setear subtotal abajo
        }
      }

      setTotales(prev => ({ ...prev, subtotal: subtotalBase }))
      setLoading(false)
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar los datos del documento')
      setLoading(false)
    }
  }

  const calcularSubtotalDesdeDetalle = (detalleData: DetalleDocumentoComercial): number => {
    let subtotal = 0
    const activos = detalleData.activos_seleccionados as unknown as ActivoSeleccionado[]
    if (activos && Array.isArray(activos)) {
      subtotal += activos.reduce((sum, a) => sum + a.precio_total, 0)
    }
    const mantenimientos = detalleData.mantenimientos as unknown as MantenimientoDetalle[]
    if (mantenimientos && Array.isArray(mantenimientos)) {
      subtotal += mantenimientos.reduce((sum, m) => sum + (m.costo || 0), 0)
    }
    const montajes = detalleData.montajes as unknown as MontajeDetalle[]
    if (montajes && Array.isArray(montajes)) {
      subtotal += montajes.reduce((sum, m) => sum + (m.costo || 0), 0)
    }
    return subtotal
  }

  const calcularTotales = () => {
    const iva = (totales.subtotal - totales.descuento) * (totales.porcentaje_iva / 100)
    const total = totales.subtotal - totales.descuento + iva + totales.otros_impuestos
    setTotales(prev => ({
      ...prev,
      iva: parseFloat(iva.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    }))
  }

  const handleGuardarTotales = async () => {
    setSaving(true)
    try {
      // 1. Guardar totales del documento
      const { error } = await supabase
        .from('totales_documentos_comerciales')
        .upsert({
          documento_comercial_id: documentoId,
          subtotal: totales.subtotal,
          descuento: totales.descuento,
          porcentaje_iva: totales.porcentaje_iva,
          iva: totales.iva,
          otros_impuestos: totales.otros_impuestos,
          total: totales.total
        })
      if (error) throw error

      // 2. Si es orden de compra, marcar activos como "alquilado"
      if (documento?.tipo_documento === 'orden_compra' && detalle) {
        const activosEnDocumento = (detalle.activos_seleccionados as unknown as ActivoSeleccionado[]) || []

        if (activosEnDocumento.length > 0) {
          const idsActivos = activosEnDocumento.map(a => a.activo_id)

          const { error: activosError } = await supabase
            .from('activos')
            .update({ estado_disponibilidad: 'alquilado' })
            .in('id', idsActivos)

          if (activosError) {
            console.error('Error actualizando estado de activos:', activosError)
            // No bloqueamos el flujo, pero avisamos
            toast.warning('Documento guardado, pero hubo un error al actualizar el estado de algunos activos')
            router.push('/dashboard/documentos')
            return
          }

          toast.success(`Orden de compra guardada. ${idsActivos.length} activo${idsActivos.length !== 1 ? 's' : ''} marcado${idsActivos.length !== 1 ? 's' : ''} como alquilado`)
        } else {
          toast.success('Orden de compra guardada exitosamente')
        }
      } else {
        toast.success('Documento guardado exitosamente')
      }

      router.push('/dashboard/documentos')
    } catch (error) {
      console.error('Error guardando totales:', error)
      toast.error('Error al guardar los totales')
      setSaving(false)
    }
  }

  const descargarPDF = async () => {
    setGeneratingPDF(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const html2canvas = (await import('html2canvas')).default
      const elemento = facturaRef.current
      if (!elemento) return
      const canvas = await html2canvas(elemento, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff'
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

  if (loading) {
    return (
      <div className="page-container">
        <div className="card"><p>Cargando...</p></div>
      </div>
    )
  }

  if (!documento || !detalle || !empresa) {
    return (
      <div className="page-container">
        <div className="card"><p>No se encontraron los datos del documento</p></div>
      </div>
    )
  }

  const activos = (detalle.activos_seleccionados as unknown as ActivoSeleccionado[]) || []
  const mantenimientos = (detalle.mantenimientos as unknown as MantenimientoDetalle[]) || []
  const montajes = (detalle.montajes as unknown as MontajeDetalle[]) || []

  return (
    <div className="totales-page-wrapper">
      <div className="page-container">

        {/* Botones de acción */}
        <div className="action-buttons no-print">
          <button onClick={() => router.back()} className="btn btn-secondary">Volver</button>
          <button onClick={() => window.print()} className="btn btn-gray">Imprimir</button>
          <button onClick={descargarPDF} disabled={generatingPDF} className="btn btn-danger">
            {generatingPDF && <div className="spinner"></div>}
            {generatingPDF ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
        </div>

        {/* Banner de documento relacionado */}
        {docRelacionadoInfo && (
          <div className="no-print mb-4 bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-sm text-blue-800">
              Orden de compra vinculada a{' '}
              <strong className="capitalize">{docRelacionadoInfo.tipo_documento.replace('_', ' ')}</strong>
              {' '}<strong>{docRelacionadoInfo.numero_documento}</strong>.
              La configuración de impuestos fue pre-cargada. Puede ajustarla libremente.
            </span>
          </div>
        )}

        {/* Factura */}
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
                <h2 className="documento-tipo">{documento.tipo_documento.replace('_', ' ')}</h2>
                <p className="documento-numero">{documento.numero_documento}</p>
                <p className="text-sm">
                  Fecha: {new Date(documento.fecha_emision + "T00:00:00").toLocaleDateString("es-CO", {
                    timeZone: "America/Bogota", year: "numeric", month: "long", day: "numeric"
                  })}
                </p>
                <div className="estado-badge">
                  <span>{documento.estado.toUpperCase()}</span>
                </div>
                {/* Referencia al documento relacionado visible en el impreso */}
                {docRelacionadoInfo && (
                  <p className="text-xs mt-2 text-gray-500">
                    Ref. {docRelacionadoInfo.tipo_documento.replace('_', ' ')}: {docRelacionadoInfo.numero_documento}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Información del Cliente */}
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

            {detalle && (
              <div className="info-box">
                <h3 className="info-title">DETALLES DEL SERVICIO</h3>
                {detalle.lugar_trabajo && <p className="text-sm"><strong>Lugar:</strong> {detalle.lugar_trabajo}</p>}
                {detalle.ciudad && <p className="text-sm"><strong>Ciudad:</strong> {detalle.ciudad}</p>}
                {detalle.direccion && <p className="text-sm"><strong>Dirección:</strong> {detalle.direccion}</p>}
                {detalle.fecha_inicio && <p className="text-sm"><strong>Inicio:</strong> {formatearFecha(detalle.fecha_inicio)}</p>}
                {detalle.fecha_fin && <p className="text-sm"><strong>Fin:</strong> {formatearFecha(detalle.fecha_fin)}</p>}
                {detalle.dias_totales && <p className="text-sm"><strong>Duración:</strong> {detalle.dias_totales} días</p>}
              </div>
            )}
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
                    <th className="text-right">Precio Unit.</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activos.map((activo, index) => (
                    <tr key={index}>
                      <td>{activo.nombre}</td>
                      <td className="text-sm">{activo.tipo}</td>
                      <td className="text-right">{activo.cantidad}</td>
                      <td className="text-right">${activo.precio_unitario.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                      <td className="text-right font-bold">${activo.precio_total.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
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
                    <th>Prioridad</th>
                    <th className="text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {mantenimientos.map((mant: any, index) => (
                    <tr key={index}>
                      <td>
                        <div className="font-bold">{mant.titulo}</div>
                        {mant.descripcion && <div className="text-sm">{mant.descripcion}</div>}
                      </td>
                      <td className="text-sm capitalize">{mant.tipo}</td>
                      <td className="text-sm capitalize">{mant.prioridad || 'N/A'}</td>
                      <td className="text-right font-bold">${(mant.costo || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
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
                    <th>Prioridad</th>
                    <th className="text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {montajes.map((mont: any, index) => (
                    <tr key={index}>
                      <td>
                        <div className="font-bold">{mont.titulo}</div>
                        {mont.descripcion && <div className="text-sm">{mont.descripcion}</div>}
                      </td>
                      <td className="text-sm capitalize">{mont.tipo}</td>
                      <td className="text-sm capitalize">{mont.prioridad || 'N/A'}</td>
                      <td className="text-right font-bold">${(mont.costo || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
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
                <span className="font-bold">${totales.subtotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="totales-row no-print">
                <span>Descuento:</span>
                <input
                  type="number" min="0" step="0.01"
                  value={totales.descuento}
                  onChange={(e) => setTotales({ ...totales, descuento: parseFloat(e.target.value) || 0 })}
                  className="totales-input"
                />
              </div>
              <div className="totales-row print-only">
                <span>Descuento:</span>
                <span className="font-bold">${totales.descuento.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="totales-row no-print">
                <span>IVA (%):</span>
                <input
                  type="number" min="0" max="100" step="0.01"
                  value={totales.porcentaje_iva}
                  onChange={(e) => setTotales({ ...totales, porcentaje_iva: parseFloat(e.target.value) || 0 })}
                  className="totales-input"
                />
              </div>

              <div className="totales-row">
                <span>IVA ({totales.porcentaje_iva}%):</span>
                <span className="font-bold">${totales.iva.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="totales-row no-print">
                <span>Otros Impuestos:</span>
                <input
                  type="number" min="0" step="0.01"
                  value={totales.otros_impuestos}
                  onChange={(e) => setTotales({ ...totales, otros_impuestos: parseFloat(e.target.value) || 0 })}
                  className="totales-input"
                />
              </div>
              <div className="totales-row print-only">
                <span>Otros Impuestos:</span>
                <span className="font-bold">${totales.otros_impuestos.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="totales-total">
                <span>TOTAL:</span>
                <span>${totales.total.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="factura-footer">
            <p>Gracias por su confianza</p>
            {miEmpresa?.email && <p>{miEmpresa.email} | {miEmpresa.telefono}</p>}
          </div>
        </div>

        {/* Botones inferiores */}
        <div className="action-buttons-bottom no-print">
          <button onClick={() => router.back()} className="btn btn-secondary">Volver</button>
          <button onClick={handleGuardarTotales} disabled={saving} className="btn btn-success">
            {saving ? 'Guardando...' : 'Guardar Orden de Compra'}
          </button>
        </div>
      </div>
    </div>
  )
}