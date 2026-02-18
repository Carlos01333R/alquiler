'use client'
import React, { useEffect, useState } from "react"
import { Toaster } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { MenuItems } from "@/seet/Menu"
import Header from "@/components/Header"
import Sidebar from "@/components/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading, logout } = useAuth()
  const [activeSection, setActiveSection] = useState('Dashboard');
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

   useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSection = localStorage.getItem('activeSection');
      if (savedSection) {
        setActiveSection(savedSection);
      }
    }
  }, []);

  // Efecto para guardar en localStorage cuando activeSection cambie
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeSection', activeSection);
    }
  }, [activeSection]);

  
  if (isLoading) return null

  const getSectionTitle = (section: string) => {
    switch (section) {
      case 'Dashboard': return 'Dashboard Principal';
      case 'Empresa': return 'Gestión de Empresas';
      case 'Activos': return 'Gestión de Activos';
      case 'Documentos': return 'Ordenes de Compra';
      case 'mantenimientos': return 'Gestión de Mantenimientos';
      case 'montajes': return 'Gestión de Montajes';
      case 'solicitudes': return 'Gestión de Solicitudes';
      case 'configuracion': return 'Configuración';
      default: return 'Dashboard';
    }
  };

  return (
   <div className="min-h-screen bg-gray-100">
      <main className="w-full text-black flex flex-row">
        <section className="h-screen sticky top-0 bg-red-500 w-64 shrink-0 hidden md:block overflow-y-hidden overflow-x-hidden">
          <Sidebar
            logout={logout}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            Menu={MenuItems}
          />
        </section>
    
        <article className="flex-1">
          <Header 
            title={getSectionTitle(activeSection)} 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
            Menu={MenuItems} 
          />
          <section className="overflow-y-auto p-4">
            {children}
            <Toaster position="top-right" />
          </section>
        </article>
      </main>
    </div>
  )
}
