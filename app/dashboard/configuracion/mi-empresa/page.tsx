// app/configuracion/mi-empresa/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

interface MiEmpresa {
  id: string
  nombre_empresa: string
  nit: string
  razon_social: string
  tipo_empresa: string
  email: string | null
  telefono: string | null
  celular: string | null
  sitio_web: string | null
  pais: string | null
  departamento: string | null
  ciudad: string | null
  direccion: string | null
  codigo_postal: string | null
  regimen_tributario: string | null
  actividad_economica: string | null
  banco: string | null
  tipo_cuenta: string | null
  numero_cuenta: string | null
  representante_legal: string | null
  cedula_representante: string | null
  cargo_representante: string | null
  logo_url: string | null
  logo_path: string | null
  certificado_camara_url: string | null
  certificado_camara_path: string | null
  rut_url: string | null
  rut_path: string | null
  documentos_adicionales: any
  facebook: string | null
  instagram: string | null
  linkedin: string | null
  twitter: string | null
  moneda: string
  formato_fecha: string
  zona_horaria: string
  descripcion: string | null
  mision: string | null
  vision: string | null
}

type TabType = 'general' | 'contacto' | 'fiscal' | 'legal' | 'archivos' | 'redes'

export default function MiEmpresaPage() {
 
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [empresa, setEmpresa] = useState<MiEmpresa | null>(null)
  
  // Estados para archivos
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null)
  const [rutFile, setRutFile] = useState<File | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCertificado, setUploadingCertificado] = useState(false)
  const [uploadingRut, setUploadingRut] = useState(false)

  useEffect(() => {
    cargarEmpresa()
  }, [])

  const cargarEmpresa = async () => {
    try {
      const { data, error } = await supabase
        .from('mi_empresa')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setEmpresa(data)
        if (data.logo_url) {
          setLogoPreview(data.logo_url)
        }
      } else {
        // Inicializar con campos vacíos
        // El ID se generará automáticamente en la base de datos
        setEmpresa({
          id: '', // Se generará automáticamente al insertar
          nombre_empresa: '',
          nit: '',
          razon_social: '',
          tipo_empresa: 'juridico',
          email: null,
          telefono: null,
          celular: null,
          sitio_web: null,
          pais: 'Colombia',
          departamento: null,
          ciudad: null,
          direccion: null,
          codigo_postal: null,
          regimen_tributario: null,
          actividad_economica: null,
          banco: null,
          tipo_cuenta: null,
          numero_cuenta: null,
          representante_legal: null,
          cedula_representante: null,
          cargo_representante: null,
          logo_url: null,
          logo_path: null,
          certificado_camara_url: null,
          certificado_camara_path: null,
          rut_url: null,
          rut_path: null,
          documentos_adicionales: [],
          facebook: null,
          instagram: null,
          linkedin: null,
          twitter: null,
          moneda: 'COP',
          formato_fecha: 'DD/MM/YYYY',
          zona_horaria: 'America/Bogota',
          descripcion: null,
          mision: null,
          vision: null
        })
      }
    } catch (error) {
      console.error('Error cargando empresa:', error)
      alert('Error al cargar la información de la empresa')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof MiEmpresa, value: any) => {
    if (empresa) {
      setEmpresa({ ...empresa, [field]: value })
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadLogo = async () => {
    if (!logoFile || !empresa) return null

    setUploadingLogo(true)
    try {
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`
      const filePath = `${empresa.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('empresa-logos')
        .upload(filePath, logoFile, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('empresa-logos')
        .getPublicUrl(filePath)

      return { url: publicUrl, path: filePath }
    } catch (error) {
      console.error('Error subiendo logo:', error)
      alert('Error al subir el logo')
      return null
    } finally {
      setUploadingLogo(false)
    }
  }

  const uploadCertificado = async () => {
    if (!certificadoFile || !empresa) return null

    setUploadingCertificado(true)
    try {
      const fileExt = certificadoFile.name.split('.').pop()
      const fileName = `certificado-camara-${Date.now()}.${fileExt}`
      const filePath = `${empresa.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('empresa-documentos')
        .upload(filePath, certificadoFile, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('empresa-documentos')
        .getPublicUrl(filePath)

      return { url: publicUrl, path: filePath }
    } catch (error) {
      console.error('Error subiendo certificado:', error)
      alert('Error al subir el certificado')
      return null
    } finally {
      setUploadingCertificado(false)
    }
  }

  const uploadRut = async () => {
    if (!rutFile || !empresa) return null

    setUploadingRut(true)
    try {
      const fileExt = rutFile.name.split('.').pop()
      const fileName = `rut-${Date.now()}.${fileExt}`
      const filePath = `${empresa.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('empresa-documentos')
        .upload(filePath, rutFile, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('empresa-documentos')
        .getPublicUrl(filePath)

      return { url: publicUrl, path: filePath }
    } catch (error) {
      console.error('Error subiendo RUT:', error)
      alert('Error al subir el RUT')
      return null
    } finally {
      setUploadingRut(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresa) return

    setSaving(true)

    try {
      let updateData = { ...empresa }

      // Subir logo si hay uno nuevo
      if (logoFile) {
        const logoData = await uploadLogo()
        if (logoData) {
          updateData.logo_url = logoData.url
          updateData.logo_path = logoData.path
        }
      }

      // Subir certificado si hay uno nuevo
      if (certificadoFile) {
        const certData = await uploadCertificado()
        if (certData) {
          updateData.certificado_camara_url = certData.url
          updateData.certificado_camara_path = certData.path
        }
      }

      // Subir RUT si hay uno nuevo
      if (rutFile) {
        const rutData = await uploadRut()
        if (rutData) {
          updateData.rut_url = rutData.url
          updateData.rut_path = rutData.path
        }
      }

      // Verificar si existe el registro en la base de datos
      const { data: existingData } = await supabase
        .from('mi_empresa')
        .select('id')
        .single()

      if (existingData) {
        // UPDATE - El registro ya existe
        const { error } = await supabase
          .from('mi_empresa')
          .update(updateData)
          .eq('id', empresa.id)

        if (error) throw error
      } else {
        // INSERT - Es la primera vez
        // No enviamos el ID, se generará automáticamente con gen_random_uuid()
        const { id, ...dataWithoutId } = updateData
        const { error } = await supabase
          .from('mi_empresa')
          .insert([dataWithoutId])

        if (error) throw error
      }

      alert('Información guardada exitosamente')
      setLogoFile(null)
      setCertificadoFile(null)
      setRutFile(null)
      await cargarEmpresa()
    } catch (error) {
      console.error('Error guardando empresa:', error)
      alert('Error al guardar la información')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!empresa) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">No se pudo cargar la información de la empresa</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Mi Empresa</h1>
              <p className="text-gray-600 mt-1">Gestiona la información de tu empresa</p>
            </div>
            {logoPreview && (
              <div className="w-24 h-24 relative">
                <Image
                  src={logoPreview}
                  alt="Logo empresa"
                  fill
                  className="object-contain"
                />
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-4 px-6 overflow-x-auto">
            {[
              { id: 'general', label: 'General' },
              { id: 'contacto', label: 'Contacto' },
              { id: 'fiscal', label: 'Información Fiscal' },
              { id: 'legal', label: 'Representante Legal' },
              { id: 'archivos', label: 'Archivos' },
              { id: 'redes', label: 'Redes Sociales' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Tab General */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Información General</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nombre de la Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={empresa.nombre_empresa}
                    onChange={(e) => handleChange('nombre_empresa', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    NIT *
                  </label>
                  <input
                    type="text"
                    required
                    value={empresa.nit}
                    onChange={(e) => handleChange('nit', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="900123456-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={empresa.razon_social}
                    onChange={(e) => handleChange('razon_social', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tipo de Empresa
                  </label>
                  <select
                    value={empresa.tipo_empresa}
                    onChange={(e) => handleChange('tipo_empresa', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="juridico">Persona Jurídica</option>
                    <option value="natural">Persona Natural</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Moneda
                  </label>
                  <select
                    value={empresa.moneda}
                    onChange={(e) => handleChange('moneda', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="COP">COP - Peso Colombiano</option>
                    <option value="USD">USD - Dólar</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Actividad Económica
                  </label>
                  <input
                    type="text"
                    value={empresa.actividad_economica || ''}
                    onChange={(e) => handleChange('actividad_economica', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Servicios de construcción"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Descripción
                </label>
                <textarea
                  value={empresa.descripcion || ''}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Descripción breve de tu empresa..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Misión
                  </label>
                  <textarea
                    value={empresa.mision || ''}
                    onChange={(e) => handleChange('mision', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Visión
                  </label>
                  <textarea
                    value={empresa.vision || ''}
                    onChange={(e) => handleChange('vision', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab Contacto */}
          {activeTab === 'contacto' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Información de Contacto</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={empresa.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="contacto@empresa.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={empresa.telefono || ''}
                    onChange={(e) => handleChange('telefono', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="+57 601 234 5678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Celular
                  </label>
                  <input
                    type="tel"
                    value={empresa.celular || ''}
                    onChange={(e) => handleChange('celular', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="+57 300 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sitio Web
                  </label>
                  <input
                    type="url"
                    value={empresa.sitio_web || ''}
                    onChange={(e) => handleChange('sitio_web', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="https://www.miempresa.com"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-md font-semibold mb-4">Dirección</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      País
                    </label>
                    <input
                      type="text"
                      value={empresa.pais || ''}
                      onChange={(e) => handleChange('pais', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Departamento/Estado
                    </label>
                    <input
                      type="text"
                      value={empresa.departamento || ''}
                      onChange={(e) => handleChange('departamento', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={empresa.ciudad || ''}
                      onChange={(e) => handleChange('ciudad', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      value={empresa.codigo_postal || ''}
                      onChange={(e) => handleChange('codigo_postal', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      Dirección Completa
                    </label>
                    <input
                      type="text"
                      value={empresa.direccion || ''}
                      onChange={(e) => handleChange('direccion', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Calle 123 # 45-67"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Fiscal */}
          {activeTab === 'fiscal' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Información Fiscal y Bancaria</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Régimen Tributario
                  </label>
                  <select
                    value={empresa.regimen_tributario || ''}
                    onChange={(e) => handleChange('regimen_tributario', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="simplificado">Régimen Simplificado</option>
                    <option value="comun">Régimen Común</option>
                    <option value="especial">Régimen Especial</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-md font-semibold mb-4">Información Bancaria</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Banco
                    </label>
                    <input
                      type="text"
                      value={empresa.banco || ''}
                      onChange={(e) => handleChange('banco', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Bancolombia"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tipo de Cuenta
                    </label>
                    <select
                      value={empresa.tipo_cuenta || ''}
                      onChange={(e) => handleChange('tipo_cuenta', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="ahorros">Ahorros</option>
                      <option value="corriente">Corriente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Número de Cuenta
                    </label>
                    <input
                      type="text"
                      value={empresa.numero_cuenta || ''}
                      onChange={(e) => handleChange('numero_cuenta', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Legal */}
          {activeTab === 'legal' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Representante Legal</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={empresa.representante_legal || ''}
                    onChange={(e) => handleChange('representante_legal', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Cédula
                  </label>
                  <input
                    type="text"
                    value={empresa.cedula_representante || ''}
                    onChange={(e) => handleChange('cedula_representante', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Cargo
                  </label>
                  <input
                    type="text"
                    value={empresa.cargo_representante || ''}
                    onChange={(e) => handleChange('cargo_representante', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Gerente General"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab Archivos */}
          {activeTab === 'archivos' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Archivos y Documentos</h2>
              
              {/* Logo */}
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-3">Logo de la Empresa</h3>
                <div className="flex items-start gap-4">
                  {logoPreview && (
                    <div className="w-32 h-32 border rounded-md overflow-hidden flex-shrink-0">
                      <Image
                        src={logoPreview}
                        alt="Logo preview"
                        width={128}
                        height={128}
                        className="object-contain w-full h-full"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Formatos: JPG, PNG, SVG. Tamaño máximo: 2MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Certificado Cámara de Comercio */}
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-3">Certificado de Cámara de Comercio</h3>
                {empresa.certificado_camara_url && (
                  <div className="mb-3">
                    <a
                      href={empresa.certificado_camara_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Ver certificado actual
                    </a>
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setCertificadoFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Formato: PDF. Tamaño máximo: 5MB
                </p>
              </div>

              {/* RUT */}
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-3">RUT (Registro Único Tributario)</h3>
                {empresa.rut_url && (
                  <div className="mb-3">
                    <a
                      href={empresa.rut_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Ver RUT actual
                    </a>
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setRutFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Formato: PDF. Tamaño máximo: 5MB
                </p>
              </div>
            </div>
          )}

          {/* Tab Redes Sociales */}
          {activeTab === 'redes' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Redes Sociales</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={empresa.facebook || ''}
                    onChange={(e) => handleChange('facebook', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="https://facebook.com/tuempresa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                      <path d="M12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 11-2.881 0 1.44 1.44 0 012.881 0z"/>
                    </svg>
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={empresa.instagram || ''}
                    onChange={(e) => handleChange('instagram', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="https://instagram.com/tuempresa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    value={empresa.linkedin || ''}
                    onChange={(e) => handleChange('linkedin', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="https://linkedin.com/company/tuempresa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                    Twitter (X)
                  </label>
                  <input
                    type="url"
                    value={empresa.twitter || ''}
                    onChange={(e) => handleChange('twitter', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="https://twitter.com/tuempresa"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-4 justify-end pt-6 border-t mt-6">
            <button
              type="button"
              onClick={() => cargarEmpresa()}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || uploadingLogo || uploadingCertificado || uploadingRut}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {(saving || uploadingLogo || uploadingCertificado || uploadingRut) && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}