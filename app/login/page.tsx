"use client"

import React, { useEffect, useState } from "react"
import { Lock, UserIcon, Eye, EyeOff } from 'lucide-react'
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { login, user, isLoading } = useAuth()
  const router = useRouter()

  // Si ya hay sesión, redirigir al home
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/")
    }
  }, [isLoading, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    const ok = await login(email, password)
    setLoading(false)
    if (ok) {
      router.replace("/")
    } else {
      setError("Usuario o contraseña incorrectos")
    }
  }

  // Mientras restauramos sesión, mostrar loader básico
  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-emerald-50 via-blue-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  return (
   <section>
 
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-blue-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header con gradiente */}
        <div className="bg-linear-to-r from-gray-500 to-zinc-600 p-8 text-center">
          <div className="bg-white/20 rounded-2xl p-4 inline-block mb-4">
          <Image src="/logo.jpg" alt="Logo" width={100} height={100} className="rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Sistema de Loterías</h1>
          <p className="text-white/90 text-sm">Brasil & Colombia</p>
        </div>

        {/* Formulario */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Usuario */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Correo</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-black"
                  placeholder="Ingrese su correo"
                  required
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-black"
                  placeholder="Ingrese su contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            {/* Botón Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-gray-500 to-zinc-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-gray-600 hover:to-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Iniciando sesión...
                </span>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
           
          </form>

          {/* Información de prueba */}
        
        </div>
      </div>

  
    </div>
    </section> 
  )
}
