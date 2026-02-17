"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Building2, 
  Package, 
  Wrench, 
  HardHat, 
  LifeBuoy, 
  Boxes,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle,
} from "lucide-react"

interface Stats {
  empresas: number
  empresasActivas: number
  activos: number
  activosDisponibles: number
  activosMantenimiento: number
  sets: number
  mantenimientos: number
  mantenimientosPendientes: number
  montajes: number
  montajesPendientes: number
  solicitudes: number
  solicitudesAbiertas: number
}

interface SolicitudesPorEstado {
  pendiente: number
  en_proceso: number
  completada: number
  cancelada: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    empresas: 0,
    empresasActivas: 0,
    activos: 0,
    activosDisponibles: 0,
    activosMantenimiento: 0,
    sets: 0,
    mantenimientos: 0,
    mantenimientosPendientes: 0,
    montajes: 0,
    montajesPendientes: 0,
    solicitudes: 0,
    solicitudesAbiertas: 0,
  })
  const [solicitudesPorEstado, setSolicitudesPorEstado] = useState<SolicitudesPorEstado>({
    pendiente: 0,
    en_proceso: 0,
    completada: 0,
    cancelada: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Cargar datos generales
        const [empresas, activos, sets, mantenimientos, montajes, solicitudes] =
          await Promise.all([
            supabase.from("empresas").select("estado"),
            supabase.from("activos").select("estado_disponibilidad"),
            supabase.from("sets_activos").select("id", { count: "exact", head: true }),
            supabase.from("mantenimientos").select("estado"),
            supabase.from("montajes").select("estado"),
            supabase.from("solicitudes").select("estado"),
          ])

        const empresasData = empresas.data || []
        const activosData = activos.data || []
        const mantenimientosData = mantenimientos.data || []
        const montajesData = montajes.data || []
        const solicitudesData = solicitudes.data || []

        // Calcular estadísticas
        setStats({
          empresas: empresasData.length,
          empresasActivas: empresasData.filter((e: any) => e.estado === 'activo').length,
          activos: activosData.length,
          activosDisponibles: activosData.filter((a: any) => a.estado_disponibilidad === 'disponible').length,
          activosMantenimiento: activosData.filter((a: any) => a.estado_disponibilidad === 'en_mantenimiento').length,
          sets: sets.count ?? 0,
          mantenimientos: mantenimientosData.length,
          mantenimientosPendientes: mantenimientosData.filter((m: any) => m.estado === 'pendiente').length,
          montajes: montajesData.length,
          montajesPendientes: montajesData.filter((m: any) => m.estado === 'pendiente').length,
          solicitudes: solicitudesData.length,
          solicitudesAbiertas: solicitudesData.filter((s: any) => s.estado === 'pendiente' || s.estado === 'en_proceso').length,
        })

        // Calcular solicitudes por estado
        setSolicitudesPorEstado({
          pendiente: solicitudesData.filter((s: any) => s.estado === 'pendiente').length,
          en_proceso: solicitudesData.filter((s: any) => s.estado === 'en_proceso').length,
          completada: solicitudesData.filter((s: any) => s.estado === 'completada').length,
          cancelada: solicitudesData.filter((s: any) => s.estado === 'cancelada').length,
        })
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const totalSolicitudes = Object.values(solicitudesPorEstado).reduce((a, b) => a + b, 0)
  const maxSolicitudes = Math.max(...Object.values(solicitudesPorEstado), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Resumen del Panel</h1>
        <p className="text-slate-600 mt-1">¡Bienvenido de nuevo! Esto es lo que está pasando hoy.</p>
      </div>

      {/* Tarjetas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Empresas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Empresas</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.empresas}</p>
              <p className="text-sm text-emerald-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {stats.empresasActivas} activas
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Activos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Activos</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.activos}</p>
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {stats.activosMantenimiento} en mantenimiento
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Mantenimientos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Mantenimientos</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.mantenimientosPendientes}</p>
              <p className="text-sm text-slate-600 mt-2 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Tareas pendientes
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Solicitudes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Solicitudes Abiertas</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.solicitudesAbiertas}</p>
              <p className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {solicitudesPorEstado.pendiente} pendientes
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <LifeBuoy className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas Secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sets de Activos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Sets de Activos</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.sets}</p>
              <p className="text-sm text-slate-500 mt-2">Kits y maletas</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Boxes className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Montajes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Montajes</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.montajesPendientes}</p>
              <p className="text-sm text-orange-600 mt-2 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Pendientes
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <HardHat className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solicitudes por Estado */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Solicitudes por Estado</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Pendientes</span>
                <span className="text-sm font-bold text-slate-900">{solicitudesPorEstado.pendiente}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(solicitudesPorEstado.pendiente / maxSolicitudes) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">En Proceso</span>
                <span className="text-sm font-bold text-slate-900">{solicitudesPorEstado.en_proceso}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(solicitudesPorEstado.en_proceso / maxSolicitudes) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Completadas</span>
                <span className="text-sm font-bold text-slate-900">{solicitudesPorEstado.completada}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(solicitudesPorEstado.completada / maxSolicitudes) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Canceladas</span>
                <span className="text-sm font-bold text-slate-900">{solicitudesPorEstado.cancelada}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-slate-400 to-slate-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(solicitudesPorEstado.cancelada / maxSolicitudes) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Total de Solicitudes</span>
              <span className="text-2xl font-bold text-slate-900">{totalSolicitudes}</span>
            </div>
          </div>
        </div>

        {/* Estado de Activos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Estado de Activos</h2>
          <div className="space-y-6">
            <div className="relative">
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="#e2e8f0"
                      strokeWidth="16"
                      fill="none"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="#10b981"
                      strokeWidth="16"
                      fill="none"
                      strokeDasharray={`${stats.activos > 0 ? (stats.activosDisponibles / stats.activos) * 502.4 : 0} 502.4`}
                      className="transition-all duration-500"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="#f59e0b"
                      strokeWidth="16"
                      fill="none"
                      strokeDasharray={`${stats.activos > 0 ? (stats.activosMantenimiento / stats.activos) * 502.4 : 0} 502.4`}
                      strokeDashoffset={`-${stats.activos > 0 ? (stats.activosDisponibles / stats.activos) * 502.4 : 0}`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-slate-900">{stats.activos}</p>
                      <p className="text-sm text-slate-600">Total Activos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-700">Disponibles</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{stats.activosDisponibles}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-700">En Mantenimiento</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{stats.activosMantenimiento}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-700">Otros</span>
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {stats.activos - stats.activosDisponibles - stats.activosMantenimiento}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de Estado */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Estado del Sistema: Todas las Operaciones Normales</h3>
            <p className="text-blue-100 text-sm mt-1">
              Todos los sistemas funcionan correctamente. {stats.mantenimientosPendientes} tareas de mantenimiento programadas. {stats.activosDisponibles} activos disponibles.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}