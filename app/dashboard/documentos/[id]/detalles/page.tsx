// app/documentos/[id]/totales/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  const facturaRef = useRef<HTMLDivElement>(null)

  const documentoId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [documento, setDocumento] = useState<DocumentoComercial | null>(null)
  const [detalle, setDetalle] = useState<DetalleDocumentoComercial | null>(null)
  const [empresa, setEmpresa] = useState<any>(null)
  const [miEmpresa, setMiEmpresa] = useState<MiEmpresa | null>(null)

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
  }, [detalle, totales.subtotal, totales.descuento, totales.porcentaje_iva, totales.otros_impuestos])

  const cargarDatos = async () => {
    try {
      // Cargar documento comercial
      const { data: docData, error: docError } = await supabase
        .from('documentos_comerciales')
        .select('*')
        .eq('id', documentoId)
        .single()

      if (docError) throw docError
      setDocumento(docData)

      // Cargar empresa cliente
      const { data: empData, error: empError } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', docData.empresa_id)
        .single()

      if (empError) throw empError
      setEmpresa(empData)

      // Cargar MI empresa
      const { data: miEmpData, error: miEmpError } = await supabase
        .from('mi_empresa')
        .select('id, nombre_empresa, nit, razon_social, email, telefono, celular, sitio_web, direccion, ciudad, pais, logo_url')
        .single()

      if (miEmpError && miEmpError.code !== 'PGRST116') {
        console.error('Error cargando mi empresa:', miEmpError)
      } else if (miEmpData) {
        setMiEmpresa(miEmpData)
      }

      // Cargar detalles
      const { data: detData, error: detError } = await supabase
        .from('detalles_documentos_comerciales')
        .select('*')
        .eq('documento_comercial_id', documentoId)
        .single()

      if (detError) throw detError
      setDetalle(detData)

      // Calcular subtotal inicial
      calcularSubtotal(detData)

      setLoading(false)
    } catch (error) {
      console.error('Error cargando datos:', error)
      alert('Error al cargar los datos del documento')
      setLoading(false)
    }
  }

  const calcularSubtotal = (detalleData: DetalleDocumentoComercial) => {
    let subtotal = 0

    // Sumar activos
    const activos = detalleData.activos_seleccionados as unknown as ActivoSeleccionado[]
    if (activos && Array.isArray(activos)) {
      subtotal += activos.reduce((sum, activo) => sum + activo.precio_total, 0)
    }

    // Sumar mantenimientos
    const mantenimientos = detalleData.mantenimientos as unknown as MantenimientoDetalle[]
    if (mantenimientos && Array.isArray(mantenimientos)) {
      subtotal += mantenimientos.reduce((sum, mant) => sum + (mant.costo || 0), 0)
    }

    // Sumar montajes
    const montajes = detalleData.montajes as unknown as MontajeDetalle[]
    if (montajes && Array.isArray(montajes)) {
      subtotal += montajes.reduce((sum, mont) => sum + (mont.costo || 0), 0)
    }

    setTotales(prev => ({ ...prev, subtotal }))
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
      // Guardar o actualizar totales
      const { error } = await supabase
        .from('totales_documentos_comerciales')
        .upsert({
          documento_comercial_id: documentoId,
          ...totales
        })

      if (error) throw error

      alert('Totales guardados exitosamente')
      router.push('/documentos')
    } catch (error) {
      console.error('Error guardando totales:', error)
      alert('Error al guardar los totales')
      setSaving(false)
    }
  }

  const descargarPDF = async () => {
    setGeneratingPDF(true)
    
    try {
      const elemento = facturaRef.current
      if (!elemento) return

      // Agregar estilos inline para compatibilidad con PDF
      const style = document.createElement('style')
      style.textContent = `
        * {
          color: #1f2937 !important;
          border-color: #d1d5db !important;
        }
        .bg-white, .bg-gray-50 {
          background-color: #ffffff !important;
        }
        .bg-gray-100 {
          background-color: #f3f4f6 !important;
        }
        .text-gray-600, .text-gray-700, .text-gray-800 {
          color: #4b5563 !important;
        }
        .text-blue-600 {
          color: #2563eb !important;
        }
        .text-green-800 {
          color: #166534 !important;
        }
        .bg-green-100 {
          background-color: #dcfce7 !important;
        }
        .bg-blue-100 {
          background-color: #dbeafe !important;
        }
        .bg-red-100 {
          background-color: #fee2e2 !important;
        }
        .border-gray-200, .border-gray-300 {
          border-color: #d1d5db !important;
        }
      `
      elemento.appendChild(style)

      // Importar html2pdf dinámicamente
      const html2pdf = (await import('html2pdf.js')).default
      
      const opciones = {
        margin: 10,
        filename: `${documento?.numero_documento || 'documento'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: 'letter' as const, 
          orientation: 'portrait' as const
        }
      }

      await html2pdf().set(opciones).from(elemento).save()
      
      // Remover el estilo temporal
      elemento.removeChild(style)
      
      toast.success('PDF generado exitosamente')
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar el PDF. Intenta con el botón Imprimir.')
    } finally {
      setGeneratingPDF(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!documento || !detalle || !empresa) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p>No se encontraron los datos del documento</p>
        </div>
      </div>
    )
  }

  const activos = (detalle.activos_seleccionados as unknown as ActivoSeleccionado[]) || []
  const mantenimientos = (detalle.mantenimientos as unknown as MantenimientoDetalle[]) || []
  const montajes = (detalle.montajes as unknown as MontajeDetalle[]) || []

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Botones de acción */}
      <div className="mb-4 flex gap-4 justify-end print:hidden">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Volver
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Imprimir
        </button>
        <button
          onClick={descargarPDF}
          disabled={generatingPDF}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2"
        >
          {generatingPDF && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          )}
          {generatingPDF ? 'Generando PDF...' : 'Descargar PDF'}
        </button>
      </div>

      {/* Factura */}
      <div 
        ref={facturaRef} 
        className="bg-white rounded-lg shadow-lg p-8 print:shadow-none"
        style={{
          backgroundColor: '#ffffff',
          color: '#1f2937'
        }}
      >
        {/* Header con información de MI EMPRESA */}
        <div className="border-b-2 border-gray-300 pb-6 mb-6">
          <div className="flex justify-between items-start">
            {/* Logo y datos de mi empresa */}
            <div className="flex gap-6">
              {miEmpresa?.logo_url && (
                <div className="w-32 h-32 relative flex-shrink-0">
                  <Image
                    src={miEmpresa.logo_url}
                    alt="Logo empresa"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{miEmpresa?.nombre_empresa || 'Mi Empresa'}</h1>
                <p className="text-sm text-gray-600 mt-1">{miEmpresa?.razon_social}</p>
                <p className="text-sm text-gray-600">NIT: {miEmpresa?.nit}</p>
                {miEmpresa?.direccion && (
                  <p className="text-sm text-gray-600">{miEmpresa.direccion}</p>
                )}
                {miEmpresa?.ciudad && (
                  <p className="text-sm text-gray-600">{miEmpresa.ciudad}, {miEmpresa.pais || 'Colombia'}</p>
                )}
                {miEmpresa?.telefono && (
                  <p className="text-sm text-gray-600">Tel: {miEmpresa.telefono}</p>
                )}
                {miEmpresa?.email && (
                  <p className="text-sm text-gray-600">Email: {miEmpresa.email}</p>
                )}
              </div>
            </div>

            {/* Información del documento */}
            <div className="text-right">
              <h2 className="text-3xl font-bold text-blue-600 uppercase">
                {documento.tipo_documento.replace('_', ' ')}
              </h2>
              <p className="text-xl font-semibold text-gray-800 mt-2">{documento.numero_documento}</p>
              <p className="text-sm text-gray-600 mt-2">
                Fecha: {new Date(documento.fecha_emision).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <div className="mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  documento.estado === 'aprobado' ? 'bg-green-100 text-green-800' :
                  documento.estado === 'enviado' ? 'bg-blue-100 text-blue-800' :
                  documento.estado === 'rechazado' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {documento.estado.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Información del Cliente */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-semibold text-gray-700 mb-3">CLIENTE</h3>
            <p className="font-semibold text-gray-900">{empresa.razon_social}</p>
            <p className="text-sm text-gray-600">NIT: {empresa.nit}</p>
            {empresa.direccion_fiscal && (
              <p className="text-sm text-gray-600">{empresa.direccion_fiscal}</p>
            )}
            {empresa.ciudad && (
              <p className="text-sm text-gray-600">{empresa.ciudad}</p>
            )}
            {empresa.telefono && (
              <p className="text-sm text-gray-600">Tel: {empresa.telefono}</p>
            )}
            {empresa.email && (
              <p className="text-sm text-gray-600">Email: {empresa.email}</p>
            )}
          </div>

          {detalle && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-semibold text-gray-700 mb-3">DETALLES DEL SERVICIO</h3>
              {detalle.lugar_trabajo && (
                <p className="text-sm text-gray-600"><strong>Lugar:</strong> {detalle.lugar_trabajo}</p>
              )}
              {detalle.ciudad && (
                <p className="text-sm text-gray-600"><strong>Ciudad:</strong> {detalle.ciudad}</p>
              )}
              {detalle.direccion && (
                <p className="text-sm text-gray-600"><strong>Dirección:</strong> {detalle.direccion}</p>
              )}
              {detalle.fecha_inicio && (
                <p className="text-sm text-gray-600">
                  <strong>Inicio:</strong> {new Date(detalle.fecha_inicio).toLocaleDateString('es-CO')}
                </p>
              )}
              {detalle.fecha_fin && (
                <p className="text-sm text-gray-600">
                  <strong>Fin:</strong> {new Date(detalle.fecha_fin).toLocaleDateString('es-CO')}
                </p>
              )}
              {detalle.dias_totales && (
                <p className="text-sm text-gray-600"><strong>Duración:</strong> {detalle.dias_totales} días</p>
              )}
            </div>
          )}
        </div>

        {/* Tabla de Activos */}
        {activos && activos.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 text-lg">ACTIVOS Y EQUIPOS</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Descripción</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Cant.</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Precio Unit.</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {activos.map((activo, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 px-4">{activo.nombre}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{activo.tipo}</td>
                    <td className="py-3 px-4 text-right">{activo.cantidad}</td>
                    <td className="py-3 px-4 text-right">${activo.precio_unitario.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-semibold">${activo.precio_total.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tabla de Mantenimientos */}
        {mantenimientos && mantenimientos.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 text-lg">SERVICIOS DE MANTENIMIENTO</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Descripción</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Prioridad</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor</th>
                </tr>
              </thead>
              <tbody>
                {mantenimientos.map((mant: any, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 px-4">
                      <div className="font-medium">{mant.titulo}</div>
                      {mant.descripcion && (
                        <div className="text-sm text-gray-600 mt-1">{mant.descripcion}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm capitalize">{mant.tipo}</td>
                    <td className="py-3 px-4 text-sm capitalize">{mant.prioridad || 'N/A'}</td>
                    <td className="py-3 px-4 text-right font-semibold">${(mant.costo || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tabla de Montajes */}
        {montajes && montajes.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 text-lg">SERVICIOS DE MONTAJE</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Descripción</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Prioridad</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor</th>
                </tr>
              </thead>
              <tbody>
                {montajes.map((mont: any, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 px-4">
                      <div className="font-medium">{mont.titulo}</div>
                      {mont.descripcion && (
                        <div className="text-sm text-gray-600 mt-1">{mont.descripcion}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm capitalize">{mont.tipo}</td>
                    <td className="py-3 px-4 text-sm capitalize">{mont.prioridad || 'N/A'}</td>
                    <td className="py-3 px-4 text-right font-semibold">${(mont.costo || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Observaciones */}
        {(documento.observaciones || detalle.observaciones_tecnicas) && (
          <div className="mb-6 bg-gray-50 p-4 rounded-md">
            {documento.observaciones && (
              <div className="mb-3">
                <h4 className="font-semibold text-gray-700 mb-2">Observaciones:</h4>
                <p className="text-sm text-gray-700">{documento.observaciones}</p>
              </div>
            )}
            {detalle.observaciones_tecnicas && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Observaciones Técnicas:</h4>
                <p className="text-sm text-gray-700">{detalle.observaciones_tecnicas}</p>
              </div>
            )}
          </div>
        )}

        {/* Totales */}
        <div className="border-t-2 border-gray-300 pt-6">
          <div className="flex justify-end">
            <div className="w-96">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${totales.subtotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between items-center text-gray-700 print:hidden">
                  <span>Descuento:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={totales.descuento}
                    onChange={(e) => setTotales({...totales, descuento: parseFloat(e.target.value) || 0})}
                    className="w-32 px-3 py-1 border rounded-md text-right"
                  />
                </div>
                <div className="flex justify-between text-gray-700 print:block hidden">
                  <span>Descuento:</span>
                  <span className="font-semibold">${totales.descuento.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between items-center text-gray-700 print:hidden">
                  <span>IVA (%):</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={totales.porcentaje_iva}
                    onChange={(e) => setTotales({...totales, porcentaje_iva: parseFloat(e.target.value) || 0})}
                    className="w-32 px-3 py-1 border rounded-md text-right"
                  />
                </div>

                <div className="flex justify-between text-gray-700">
                  <span>IVA ({totales.porcentaje_iva}%):</span>
                  <span className="font-semibold">${totales.iva.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between items-center text-gray-700 print:hidden">
                  <span>Otros Impuestos:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={totales.otros_impuestos}
                    onChange={(e) => setTotales({...totales, otros_impuestos: parseFloat(e.target.value) || 0})}
                    className="w-32 px-3 py-1 border rounded-md text-right"
                  />
                </div>
                <div className="flex justify-between text-gray-700 print:block hidden">
                  <span>Otros Impuestos:</span>
                  <span className="font-semibold">${totales.otros_impuestos.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="border-t-2 border-gray-300 pt-3 flex justify-between text-xl font-bold text-gray-900">
                  <span>TOTAL:</span>
                  <span className="text-blue-600">${totales.total.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
          <p>Gracias por su confianza</p>
          {miEmpresa?.email && (
            <p className="mt-1">{miEmpresa.email} | {miEmpresa.telefono}</p>
          )}
        </div>
      </div>

      {/* Botones de acción inferiores (solo visible en pantalla) */}
      <div className="mt-6 flex gap-4 justify-end print:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Volver
        </button>
        <button
          onClick={handleGuardarTotales}
          disabled={saving}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
        >
          {saving ? 'Guardando...' : 'Guardar y Finalizar'}
        </button>
      </div>
    </div>
  )
}