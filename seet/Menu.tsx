import { 
  Home,
  Building2,
  Settings,
  FileText,
  Wrench,
  Construction,
  ClipboardList
} from 'lucide-react';

export const MenuItems = [
  {
    id: 'Dashboard',
    label: 'Inicio',
    icon: Home,
    section: 'home',
    href: '/dashboard'
  },
  {
    id: 'Empresa',
    label: 'Empresas',
    icon: Building2,
    section: 'empresa',
    href: '/dashboard/empresas'
  },
  {
    id: 'Activos',
    label: 'Activos',
    icon: Settings,
    section: 'activos',
    href: '/dashboard/activos'
  },
  
  {
       id: 'admin',
       label: 'Documentos',
       icon: Settings,
       submenu: [
         { id: 'orden_compra', label: 'Orden de Compra', icon: FileText, section: 'ordenes', href: '/dashboard/ordenes' },
         { id: 'cotizacion', label: 'Cotización', icon: FileText, section: 'cotizaciones', href: '/dashboard/cotizaciones' },
         { id: 'factura', label: 'Factura', icon: FileText, section: 'facturas', href: '/dashboard/facturas' },
       
       ]
     },
  {
    id: 'mantenimientos',
    label: 'Mantenimientos',
    icon: Wrench,
    section: 'mantenimientos',
    href: '/dashboard/mantenimientos'
  },
  {
    id: 'montajes',
    label: 'Montajes',
    icon: Construction,
    section: 'montajes',
    href: '/dashboard/montajes'
  },
  {
    id: 'solicitudes',
    label: 'Solicitudes',
    icon: ClipboardList,
    section: 'solicitudes',
    href: '/dashboard/solicitudes'
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: Settings,
    section: 'configuracion',
    href: '/dashboard/configuracion/mi-empresa'
  }
];
