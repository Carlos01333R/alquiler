// Usado en:
//   app/dashboard/ordenes/nuevo/page.tsx      → tipo = 'orden_compra', prefix = 'OC'
//   app/dashboard/cotizaciones/nuevo/page.tsx → tipo = 'cotizacion',   prefix = 'COT'
//   app/dashboard/facturas/nuevo/page.tsx     → tipo = 'factura',      prefix = 'FAC'
//
// Cada página solo importa NuevoDocumentoPage y pasa sus props:
//
//   export default function Page() {
//     return <NuevoDocumentoPage tipo="orden_compra" prefix="OC" backPath="/dashboard/ordenes" />
//   }

'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Empresa } from '@/types/database.types'
import { toast } from 'sonner'

interface Props {
  tipo: 'orden_compra' | 'cotizacion' | 'factura'
  prefix: 'OC' | 'COT' | 'FAC'
  backPath: string
}

const TIPO_LABEL: Record<string, string> = {
  orden_compra: 'Orden de Compra',
  cotizacion: 'Cotización',
  factura: 'Factura',
}

const ACCENT: Record<string, string> = {
  orden_compra: 'bg-blue-600 hover:bg-blue-700',
  cotizacion: 'bg-yellow-500 hover:bg-yellow-600',
  factura: 'bg-emerald-600 hover:bg-emerald-700',
}

function obtenerFechaColombia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

function generarSufijo() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let r = ''
  for (let i = 0; i < 8; i++) r += chars.charAt(Math.floor(Math.random() * chars.length))
  return r
}

export default function NuevoDocumentoPage({ tipo, prefix, backPath }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const docRelacionadoId = searchParams.get('doc_relacionado_id')
  const cotizacionesExtra = searchParams.get('cotizaciones_extra') || ''

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(false)
  const [docRelacionadoInfo, setDocRelacionadoInfo] = useState<{ numero_documento: string; empresa_id: string; observaciones?: string } | null>(null)

  const [formData, setFormData] = useState({
    numero_documento: `${prefix}-${generarSufijo()}`,
    tipo_documento: tipo,
    empresa_id: '',
    fecha_emision: obtenerFechaColombia(),
    estado: tipo === 'orden_compra' ? 'pendiente' : 'por_definir',
    observaciones: '',
    documento_relacionado_id: docRelacionadoId || null as string | null,
  })

  useEffect(() => {
    cargarEmpresas()
    if (docRelacionadoId) cargarDocRelacionado(docRelacionadoId)
  }, [docRelacionadoId])

  const cargarEmpresas = async () => {
    const { data } = await supabase.from('empresas').select('*').eq('estado', 'activo').order('razon_social')
    if (data) setEmpresas(data)
  }

  const cargarDocRelacionado = async (id: string) => {
    const { data, error } = await supabase
      .from('documentos_comerciales')
      .select('numero_documento, empresa_id, observaciones')
      .eq('id', id)
      .single()
    if (error || !data) return
    setDocRelacionadoInfo(data)
    setFormData(prev => ({
      ...prev,
      empresa_id: data.empresa_id,
      observaciones: data.observaciones || '',
      documento_relacionado_id: id,
    }))
    toast.success(`Datos cargados desde ${data.numero_documento}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.empresa_id) { toast.error('Seleccione una empresa'); return }
    setLoading(true)

    try {
      const insert: any = {
        numero_documento: formData.numero_documento,
        tipo_documento: formData.tipo_documento,
        empresa_id: formData.empresa_id,
        fecha_emision: formData.fecha_emision,
        estado: formData.estado,
        observaciones: formData.observaciones || null,
      }
      if (formData.documento_relacionado_id) {
        insert.documento_relacionado_id = formData.documento_relacionado_id
      }

      const { data: doc, error } = await supabase
        .from('documentos_comerciales')
        .insert([insert])
        .select()
        .single()
      if (error) throw error

      const params = new URLSearchParams({ empresa_id: formData.empresa_id })
      if (formData.documento_relacionado_id) params.set('doc_relacionado_id', formData.documento_relacionado_id)
      if (cotizacionesExtra) params.set('cotizaciones_extra', cotizacionesExtra)

      // Redirigir al detalles dentro de la misma sección
      router.push(`${backPath}/${doc.id}/detalles?${params.toString()}`)
    } catch (err) {
      console.error(err)
      toast.error('Error al crear el documento')
      setLoading(false)
    }
  }

  const empresaSeleccionada = empresas.find(e => e.id === formData.empresa_id)

  const ESTADOS_OC = ['pendiente','en_ejecucion','realizada','finalizada'] as const

const LABELS_OC: Record<typeof ESTADOS_OC[number], string> = {
  pendiente: 'Pendiente',
  en_ejecucion: 'En ejecución',
  realizada: 'Realizada',
  finalizada: 'Finalizada',
}

const ESTADOS_DOC = ['por_definir','aprobada','reprobada','vencida'] as const

const LABELS_DOC: Record<typeof ESTADOS_DOC[number], string> = {
  por_definir: 'Por definir',
  aprobada: 'Aprobada',
  reprobada: 'Reprobada',
  vencida: 'Vencida',
}

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{prefix}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">{TIPO_LABEL[tipo]}</span>
          </div>
          <h1 className="text-2xl font-bold">Nuevo documento</h1>
          {docRelacionadoInfo && (
            <p className="mt-1 text-sm text-indigo-600 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Desde {docRelacionadoInfo.numero_documento}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Datos del documento */}
          <div className="border-b pb-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Información del documento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Número de documento *</label>
                <input
                  type="text" required value={formData.numero_documento}
                  onChange={e => setFormData({ ...formData, numero_documento: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de emisión *</label>
                <input
                  type="date" required value={formData.fecha_emision}
                  onChange={e => setFormData({ ...formData, fecha_emision: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado *</label>
                <select
                  value={formData.estado}
                  onChange={e => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                >
                 {tipo === 'orden_compra'
                ? ESTADOS_OC.map(e => (
                    <option key={e} value={e}>
                      {LABELS_OC[e]}
                    </option>
                  )) :  ESTADOS_DOC.map(e => (
                  <option key={e} value={e}>
                    {LABELS_DOC[e]}
                  </option>
                ))}
                </select>
              </div>
            </div>
          </div>

          {/* Empresa */}
          <div className="border-b pb-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Empresa cliente *
              {docRelacionadoInfo && <span className="ml-2 text-xs font-normal text-emerald-600 normal-case">pre-llenada</span>}
            </h2>
            <select
              required value={formData.empresa_id}
              onChange={e => setFormData({ ...formData, empresa_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm mb-3 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccione una empresa --</option>
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.razon_social} — {emp.nit}</option>
              ))}
            </select>

            {empresaSeleccionada && (
              <div className="bg-gray-50 rounded-md p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div><span className="text-gray-500">Razón social:</span> <span className="font-medium">{empresaSeleccionada.razon_social}</span></div>
                <div><span className="text-gray-500">NIT:</span> <span className="font-medium">{empresaSeleccionada.nit}</span></div>
                <div><span className="text-gray-500">Email:</span> {empresaSeleccionada.email || '—'}</div>
                <div><span className="text-gray-500">Teléfono:</span> {empresaSeleccionada.telefono || '—'}</div>
                <div><span className="text-gray-500">Ciudad:</span> {empresaSeleccionada.ciudad || '—'}</div>
                <div><span className="text-gray-500">Dirección:</span> {empresaSeleccionada.direccion_fiscal || '—'}</div>
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium mb-1">Observaciones</label>
            <textarea
              value={formData.observaciones || ''}
              onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Notas adicionales..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t">
            <button type="button" onClick={() => router.push(backPath)} className="px-5 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className={`px-5 py-2 text-white rounded-md text-sm font-medium disabled:opacity-50 ${ACCENT[tipo]}`}>
              {loading ? 'Guardando...' : 'Continuar a detalles →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}