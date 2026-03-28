import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  DocumentTextIcon,
  PlusCircleIcon,
  UsersIcon,
  CogIcon,
  KeyIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Facturas', href: '/facturas', icon: DocumentTextIcon },
  { name: 'Nueva Factura', href: '/facturas/nueva', icon: PlusCircleIcon },
  { name: 'Clientes', href: '/clientes', icon: UsersIcon },
  { name: 'API Keys', href: '/api-keys', icon: KeyIcon },
  { name: 'Configuracion', href: '/configuracion', icon: CogIcon },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-indigo-950 transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navegacion principal"
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
              <DocumentTextIcon className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">ARCA</h1>
              <p className="text-[10px] text-indigo-300">Facturacion Electronica</p>
            </div>
          </div>
          <button
            className="rounded-md p-1 text-indigo-300 hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="Cerrar menu"
          >
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 flex-1 space-y-1 px-3" aria-label="Menu principal">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-800 text-white'
                    : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-indigo-800 p-4">
          <p className="text-xs text-indigo-400">AFIP/ARCA Integration</p>
          <p className="text-[10px] text-indigo-500">v2.0.0</p>
        </div>
      </aside>
    </>
  );
}
