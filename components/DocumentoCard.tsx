// components/DocumentoCard.tsx
import Link from 'next/link'

interface DocumentoCardProps {
  id: string
  numero_documento: string
  tipo_documento: string
  fecha_emision: string
  estado: string
  empresa: {
    razon_social: string
    nit: string
  }
  total?: number
}

export function DocumentoCard({
  id,
  numero_documento,
  tipo_documento,
  fecha_emision,
  estado,
  empresa,
  total
}: DocumentoCardProps) {
  const getEstadoColor = (estado: string) => {
    const colores: Record<string, string> = {
      borrador: 'bg-gray-100 text-gray-800',
      enviado: 'bg-blue-100 text-blue-800',
      aprobado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800',
      completado: 'bg-purple-100 text-purple-800'
    }
    return colores[estado] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">{numero_documento}</h3>
          <p className="text-sm text-gray-600 capitalize">
            {tipo_documento.replace('_', ' ')}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(estado)}`}>
          {estado}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <p className="text-sm font-medium">{empresa.razon_social}</p>
          <p className="text-xs text-gray-500">{empresa.nit}</p>
        </div>
        <p className="text-sm text-gray-600">
          {new Date(fecha_emision).toLocaleDateString()}
        </p>
        {total !== undefined && (
          <p className="text-lg font-bold text-blue-600">
            ${total.toFixed(2)}
          </p>
        )}
      </div>

      <Link
        href={`/documentos/${id}/totales`}
        className="block text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Ver Detalles
      </Link>
    </div>
  )
}

// components/EstadoBadge.tsx
interface EstadoBadgeProps {
  estado: string
}

export function EstadoBadge({ estado }: EstadoBadgeProps) {
  const getColor = (estado: string) => {
    const colores: Record<string, string> = {
      borrador: 'bg-gray-100 text-gray-800',
      enviado: 'bg-blue-100 text-blue-800',
      aprobado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800',
      completado: 'bg-purple-100 text-purple-800',
      pendiente: 'bg-yellow-100 text-yellow-800',
      en_proceso: 'bg-indigo-100 text-indigo-800',
      cancelado: 'bg-gray-100 text-gray-800'
    }
    return colores[estado] || 'bg-gray-100 text-gray-800'
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColor(estado)}`}>
      {estado.replace('_', ' ')}
    </span>
  )
}

// components/LoadingSpinner.tsx
export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}

// components/EmptyState.tsx
interface EmptyStateProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  )
}

// components/FormField.tsx
interface FormFieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
  error?: string
}

export function FormField({ label, required, children, error }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

// components/Alert.tsx
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  onClose?: () => void
}

export function Alert({ type, message, onClose }: AlertProps) {
  const colors = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  }

  return (
    <div className={`rounded-md p-4 border ${colors[type]}`}>
      <div className="flex justify-between items-start">
        <p className="text-sm">{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-3 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}