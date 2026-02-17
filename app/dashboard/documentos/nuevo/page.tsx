// app/documentos/nuevo/page.tsx
'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Database, Empresa } from '@/types/database.types'
import { toast } from "sonner"



export default function NuevoDocumentoPage() {
  const router = useRouter()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    numero_documento: '',
    tipo_documento: 'orden_compra',
    empresa_id: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    estado: 'borrador',
    observaciones: ''
  })

  useEffect(() => {
    cargarEmpresas()
  }, [])

  const cargarEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('estado', 'activo')
        .order('razon_social')

      if (error) throw error
      setEmpresas(data || [])
    } catch (error) {
      console.error('Error cargando empresas:', error)
      toast.error('Error al cargar las empresas')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.empresa_id) {
      toast.error('Por favor seleccione una empresa')
      return
    }

    setLoading(true)

    try {
      // Crear el documento comercial
      const { data: documento, error } = await supabase
        .from('documentos_comerciales')
        .insert([formData])
        .select()
        .single()

      if (error) throw error

      // Redirigir a la página de detalles
      router.push(`/dashboard/documentos/${documento.id}/detalles?empresa_id=${formData.empresa_id}`)
    } catch (error) {
      console.error('Error creando documento:', error)
      toast.error('Error al crear el documento')
      setLoading(false)
    }
  }

  const empresaSeleccionada = empresas.find(e => e.id === formData.empresa_id)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Nuevo Documento Comercial</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Documento */}
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-4">Información del Documento</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Número de Documento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.numero_documento}
                  onChange={(e) => setFormData({...formData, numero_documento: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="OC-2025-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tipo de Documento *
                </label>
                <select
                  value={formData.tipo_documento}
                  onChange={(e) => setFormData({...formData, tipo_documento: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="orden_compra">Orden de Compra</option>
                  <option value="cotizacion">Cotización</option>
                  <option value="factura">Factura</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Fecha de Emisión *
                </label>
                <input
                  type="date"
                  required
                  value={formData.fecha_emision}
                  onChange={(e) => setFormData({...formData, fecha_emision: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Estado *
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="borrador">Borrador</option>
                  <option value="enviado">Enviado</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="rechazado">Rechazado</option>
                  <option value="completado">Completado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Selección de Empresa */}
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-4">Empresa Cliente *</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Seleccionar Empresa
              </label>
              <select
                required
                value={formData.empresa_id}
                onChange={(e) => setFormData({...formData, empresa_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleccione una empresa --</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.razon_social} - {empresa.nit}
                  </option>
                ))}
              </select>
            </div>

            {/* Vista previa de empresa seleccionada */}
            {empresaSeleccionada && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium mb-2">Información de la Empresa</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Razón Social:</strong> {empresaSeleccionada.razon_social}</div>
                  <div><strong>NIT:</strong> {empresaSeleccionada.nit}</div>
                  <div><strong>Email:</strong> {empresaSeleccionada.email || 'N/A'}</div>
                  <div><strong>Teléfono:</strong> {empresaSeleccionada.telefono || 'N/A'}</div>
                  <div><strong>Ciudad:</strong> {empresaSeleccionada.ciudad || 'N/A'}</div>
                  <div><strong>Dirección:</strong> {empresaSeleccionada.direccion_fiscal || 'N/A'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones || ''}
              onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Observaciones adicionales del documento..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Guardando...' : 'Continuar a Detalles'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
