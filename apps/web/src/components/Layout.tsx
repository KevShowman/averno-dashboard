import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { 
  Skull, 
  Home, 
  Package, 
  DollarSign, 
  Settings, 
  FileText, 
  Menu,
  X,
  LogOut,
  User,
  Activity,
  Clock,
  Calendar,
  Scale,
  Users,
  PackageOpen,
  CalendarCheck,
  CalendarDays,
  Droplet
} from 'lucide-react'
import { Button } from './ui/button'
import { cn, getDisplayName, hasRole } from '../lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

const getRoleDisplayName = (role: string) => {
  switch (role) {
    case 'EL_PATRON': return 'El Patron'
    case 'DON': return 'Don'
    case 'ASESOR': return 'Asesor'
    case 'ROUTENVERWALTUNG': return 'Routenverwaltung'
    case 'LOGISTICA': return 'Logistica'
    case 'SOLDADO': return 'Soldado'
    case 'FUTURO': return 'Futuro'
    default: return role
  }
}

const navigation = [
  { name: 'Dashboard', href: '/app', icon: Home },
  { name: 'Lager', href: '/lager', icon: Package },
  { name: 'Lagerbewegungen', href: '/lager-movements', icon: Clock },
  { name: 'Kasse', href: '/kasse', icon: DollarSign },
  { name: 'Pakete', href: '/packages', icon: PackageOpen },
  { name: 'Wochenabgabe', href: '/weekly-delivery', icon: Calendar },
  { name: 'Aufstellungen', href: '/aufstellungen', icon: CalendarCheck },
  { name: 'Abmeldungen', href: '/abmeldungen', icon: CalendarDays },
  { name: 'Blood List', href: '/bloodlist', icon: Droplet },
  { name: 'Sanktionen', href: '/sanctions', icon: Scale },
  { name: 'Benutzerverwaltung', href: '/user-management', icon: Users },
  { name: 'Live-Ticker', href: '/ticker', icon: Activity },
  { name: 'Audit-Log', href: '/audit', icon: FileText },
  { name: 'Einstellungen', href: '/settings', icon: Settings },
]

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { user, logout, isAuthenticated } = useAuthStore()

  // Don't render navigation if not authenticated
  if (!isAuthenticated) {
    return <div className="min-h-screen bg-gray-900">{children}</div>
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed left-0 top-0 h-full w-64 bg-gray-800 shadow-xl">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center space-x-2">
              <Skull className="h-8 w-8 text-primary" />
              <span className="text-lg font-bold text-white">LaSanta Calavera</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </Button>
          </div>
          <nav className="mt-8 px-4">
            {navigation.map((item) => {
              // Benutzerverwaltung nur für El Patron
              if (item.name === 'Benutzerverwaltung' && !hasRole(user, 'EL_PATRON')) {
                return null
              }

              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:bg-gray-800">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-2">
            <Skull className="h-8 w-8 text-primary" />
            <span className="text-lg font-bold text-white">LaSanta Calavera</span>
          </div>
        </div>
        <nav className="mt-8 px-4">
          {navigation.map((item) => {
            // Benutzerverwaltung nur für El Patron
            if (item.name === 'Benutzerverwaltung' && !hasRole(user, 'EL_PATRON')) {
              return null
            }

            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User info at bottom */}
        {user && (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center space-x-3 rounded-lg bg-gray-700 p-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={getDisplayName(user)}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <User className="h-8 w-8 text-gray-400" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {getDisplayName(user)}
                </p>
                <div className="text-xs text-gray-400 truncate">
                  {user.allRoles && user.allRoles.length > 1 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.allRoles.map((role, index) => (
                        <span key={index} className="inline-block bg-gray-700 px-1 rounded text-xs">
                          {getRoleDisplayName(role)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span>{getRoleDisplayName(user.role)}</span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="text-gray-400 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-700 bg-gray-800 px-4 shadow-sm lg:gap-x-6 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white"
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex flex-1 justify-end">
            {user && (
              <div className="flex items-center space-x-4 lg:hidden">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={getDisplayName(user)}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <User className="h-8 w-8 text-gray-400" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="text-gray-400 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
