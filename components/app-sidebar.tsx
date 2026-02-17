"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Package,
  Wrench,
  HardHat,
  FileText,
  LifeBuoy,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Empresas", href: "/dashboard/empresas", icon: Building2 },
  { title: "Activos", href: "/dashboard/activos", icon: Package },
  {title: "Documentos", href: "/dashboard/documentos", icon: FileText },
  { title: "Mantenimientos", href: "/dashboard/mantenimientos", icon: Wrench },
  { title: "Montajes", href: "/dashboard/montajes", icon: HardHat },
  { title: "Solicitudes", href: "/dashboard/solicitudes", icon: LifeBuoy },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="px-6 py-4 bg-[#192335] text-gray-200 ">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-gray-200">
            GestPro
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="bg-[#192335] text-gray-200 ">
        <SidebarGroup>
      
          <SidebarGroupContent className="py-4 px-2 ">
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href))
                return (
                  <SidebarMenuItem key={item.title} className="flex flex-col gap-y-4 ">
                    <SidebarMenuButton asChild isActive={isActive} >
                      <Link href={item.href} className="py-2 px-3">
                        <item.icon className="h-5 w-5" />
                        <span className="text-lg">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
