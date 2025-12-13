import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { 
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
  CalendarCheck,
  CalendarDays,
  Droplet,
  Network,
  Shirt,
  Radio,
  Car,
  ScrollText,
  Crosshair,
  ChevronDown,
  LayoutDashboard,
  Warehouse,
  Wallet,
  Shield,
  Building,
  Cog,
  BookOpen,
  Map
} from 'lucide-react'
import { Button } from './ui/button'
import { cn, getDisplayName, hasRole } from '../lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

const getRoleDisplayName = (role: string) => {
  const roleMap: Record<string, string> = {
    'EL_PATRON': 'El Patrón',
    'DON_CAPITAN': 'Don Capitán',
    'DON_COMANDANTE': 'Don Comandante',
    'EL_MANO_DERECHA': 'Mano Derecha',
    'EL_CUSTODIO': 'El Custodio',
    'EL_MENTOR': 'El Mentor',
    'EL_ENCARGADO': 'El Encargado',
    'EL_TENIENTE': 'El Teniente',
    'SOLDADO': 'Soldado',
    'EL_PREFECTO': 'El Prefecto',
    'EL_CONFIDENTE': 'El Confidente',
    'EL_PROTECTOR': 'El Protector',
    'EL_NOVATO': 'El Novato',
    'ROUTENVERWALTUNG': 'Routenverwaltung',
    'LOGISTICA': 'Logística',
    'SICARIO': 'Sicario',
    'FUTURO': 'Futuro',
  }
  return roleMap[role] || role
}

const getRoleBadgeColor = (role: string) => {
  if (['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'].includes(role)) {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  }
  if (role === 'SICARIO') {
    return 'bg-red-500/20 text-red-300 border-red-500/30'
  }
  return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
}

interface NavItem {
  name: string
  href: string
  icon: any
  leadershipOnly?: boolean
  sicarioOnly?: boolean
  patronOnly?: boolean
  contactoOnly?: boolean
}

interface NavGroup {
  name: string
  icon: any
  items: NavItem[]
  defaultOpen?: boolean
}

const navGroups: NavGroup[] = [
  {
    name: 'Übersicht',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { name: 'Dashboard', href: '/app', icon: Home },
      { name: 'Live-Ticker', href: '/ticker', icon: Activity },
    ]
  },
  {
    name: 'Finanzen & Lager',
    icon: Warehouse,
    defaultOpen: true,
    items: [
      { name: 'Lager', href: '/lager', icon: Package },
      { name: 'Lagerbewegungen', href: '/lager-movements', icon: Clock },
      { name: 'Kasse', href: '/kasse', icon: DollarSign },
    ]
  },
  {
    name: 'Familie',
    icon: Users,
    defaultOpen: true,
    items: [
      { name: 'Wochenabgabe', href: '/weekly-delivery', icon: Calendar },
      { name: 'Familiensammeln', href: '/familiensammeln', icon: Users },
      { name: 'Aufstellungen', href: '/aufstellungen', icon: CalendarCheck },
      { name: 'Abmeldungen', href: '/abmeldungen', icon: CalendarDays },
      { name: 'Anwesenheitsliste', href: '/anwesenheit', icon: CalendarCheck },
    ]
  },
  {
    name: 'Sicario Division',
    icon: Crosshair,
    items: [
      { name: 'Sicario Bereich', href: '/sicario', icon: Crosshair, sicarioOnly: true },
    ]
  },
  {
    name: 'Mitglieder',
    icon: Shield,
    items: [
      { name: 'Blood List', href: '/bloodlist', icon: Droplet },
      { name: 'Sanktionen', href: '/sanctions', icon: Scale },
      { name: 'Organisation', href: '/organigramm', icon: Network },
      { name: 'Aktensystem', href: '/member-files', icon: FileText, leadershipOnly: true },
      { name: 'Benutzerverwaltung', href: '/user-management', icon: Users, patronOnly: true },
    ]
  },
  {
    name: 'Ausstattung',
    icon: Shirt,
    items: [
      { name: 'Meine Kleidung', href: '/clothing', icon: Shirt },
      { name: 'Kleidungsverwaltung', href: '/clothing-management', icon: Shirt, leadershipOnly: true },
      { name: 'Fahrzeugtuning', href: '/vehicle-tuning', icon: Car },
    ]
  },
  {
    name: 'Kommunikation',
    icon: Radio,
    items: [
      { name: 'Funk/DarkChat', href: '/communication', icon: Radio },
      { name: 'Botschaft', href: '/botschaft', icon: ScrollText },
      { name: 'Listenführung', href: '/listenfuehrung', icon: BookOpen, contactoOnly: true },
      { name: 'Interaktive Karte', href: '/karte', icon: Map },
    ]
  },
  {
    name: 'Sonstiges',
    icon: Building,
    items: [
      { name: 'La Casa', href: '/la-casa', icon: Home },
    ]
  },
  {
    name: 'System',
    icon: Cog,
    items: [
      { name: 'Audit-Log', href: '/audit', icon: FileText },
      { name: 'Einstellungen', href: '/settings', icon: Settings },
    ]
  },
]

function NavGroupComponent({ 
  group, 
  user, 
  isActive, 
  onLinkClick,
  isOpen,
  onToggle
}: { 
  group: NavGroup
  user: any
  isActive: (href: string) => boolean
  onLinkClick?: () => void
  isOpen: boolean
  onToggle: () => void
}) {
  const isLeadership = hasRole(user, ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'])
  const isSicario = hasRole(user, 'SICARIO')
  const isPatron = hasRole(user, 'EL_PATRON')

  // Filter items based on permissions
  const isContacto = hasRole(user, 'CONTACTO')
  
  const visibleItems = group.items.filter(item => {
    if (item.patronOnly && !isPatron) return false
    if (item.leadershipOnly && !isLeadership) return false
    if (item.sicarioOnly && !isLeadership && !isSicario) return false
    if (item.contactoOnly && !isLeadership && !isContacto) return false
    return true
  })

  // Don't render empty groups
  if (visibleItems.length === 0) return null

  // Check if any item in group is active
  const hasActiveItem = visibleItems.some(item => isActive(item.href))

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
          hasActiveItem
            ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-300"
            : "text-gray-400 hover:text-white hover:bg-white/5"
        )}
      >
        <div className="flex items-center gap-3">
          <group.icon className={cn(
            "h-4 w-4",
            hasActiveItem ? "text-amber-400" : "text-gray-500"
          )} />
          <span>{group.name}</span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform duration-200",
          isOpen ? "rotate-180" : ""
        )} />
      </button>
      
      <div className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"
      )}>
        <div className="pl-3 space-y-0.5">
          {visibleItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200",
                isActive(item.href)
                  ? "bg-gradient-to-r from-amber-600/90 to-orange-600/90 text-white shadow-lg shadow-amber-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn(
                "h-4 w-4",
                isActive(item.href) ? "text-white" : "text-gray-500"
              )} />
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { user, logout, isAuthenticated } = useAuthStore()

  const isActive = (href: string) => location.pathname === href

  // Initialize expanded groups - open groups that have the active item or are default open
  const getInitialExpandedGroups = () => {
    const expanded: string[] = []
    navGroups.forEach(group => {
      const hasActiveItem = group.items.some(item => location.pathname === item.href)
      if (hasActiveItem || group.defaultOpen) {
        expanded.push(group.name)
      }
    })
    return expanded
  }

  const [expandedGroups, setExpandedGroups] = useState<string[]>(getInitialExpandedGroups)

  // Update expanded groups when location changes to include the active group
  useEffect(() => {
    navGroups.forEach(group => {
      const hasActiveItem = group.items.some(item => location.pathname === item.href)
      if (hasActiveItem && !expandedGroups.includes(group.name)) {
        setExpandedGroups(prev => [...prev, group.name])
      }
    })
  }, [location.pathname])

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupName) 
        ? prev.filter(name => name !== groupName)
        : [...prev, groupName]
    )
  }

  // Don't render navigation if not authenticated
  if (!isAuthenticated) {
    return <div className="min-h-screen bg-gray-900">{children}</div>
  }

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <Link to="/app" className="flex items-center gap-3 group" onClick={onLinkClick}>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/40 to-amber-600/40 rounded-xl blur-xl opacity-60 group-hover:opacity-90 transition-opacity" />
            <div className="relative w-14 h-14 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="La Santa Calavera" 
                className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(251,191,36,0.5)] group-hover:drop-shadow-[0_0_20px_rgba(251,191,36,0.7)] transition-all duration-300 group-hover:scale-105"
              />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">La Santa</h1>
            <p className="text-xs text-amber-400/80 font-medium -mt-0.5">Calavera</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 sidebar-scrollbar">
        {navGroups.map((group) => (
          <NavGroupComponent
            key={group.name}
            group={group}
            user={user}
            isActive={isActive}
            onLinkClick={onLinkClick}
            isOpen={expandedGroups.includes(group.name)}
            onToggle={() => toggleGroup(group.name)}
          />
        ))}
      </nav>

      {/* User Info */}
      {user && (
        <div className="p-4 border-t border-white/5">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-red-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/5 p-4">
              <div className="flex items-center gap-3">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={getDisplayName(user)}
                    className="h-11 w-11 rounded-xl object-cover ring-2 ring-amber-500/30"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center ring-2 ring-amber-500/30">
                    <User className="h-5 w-5 text-amber-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {getDisplayName(user)}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {user.allRoles && user.allRoles.length > 0 ? (
                      user.allRoles.slice(0, 2).map((role: string, index: number) => (
                        <span 
                          key={index} 
                          className={cn(
                            "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border",
                            getRoleBadgeColor(role)
                          )}
                        >
                          {getRoleDisplayName(role)}
                        </span>
                      ))
                    ) : (
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border",
                        getRoleBadgeColor(user.role)
                      )}>
                        {getRoleDisplayName(user.role)}
                      </span>
                    )}
                    {user.allRoles && user.allRoles.length > 2 && (
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-700/50 text-gray-400">
                        +{user.allRoles.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={logout}
                className="w-full mt-3 h-9 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl text-sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar backdrop */}
      <div 
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile sidebar */}
      <div className={cn(
        "fixed left-0 top-0 bottom-0 z-50 w-72 transform transition-transform duration-300 ease-out lg:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-r border-white/5 shadow-2xl">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="absolute right-3 top-5 text-gray-400 hover:text-white z-10"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <SidebarContent onLinkClick={() => setSidebarOpen(false)} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-72">
        <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-r border-white/5">
          <SidebarContent />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 bg-gray-900/80 backdrop-blur-xl border-b border-white/5 px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex-1 flex justify-center">
            <Link to="/app" className="flex items-center gap-2">
              <img 
                src="/logo.png" 
                alt="La Santa Calavera" 
                className="h-9 w-9 object-contain drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
              />
              <span className="font-bold text-white">La Santa Calavera</span>
            </Link>
          </div>

          <div className="w-10" /> {/* Spacer for balance */}
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-6 min-h-[calc(100vh-4rem)] lg:min-h-screen bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  )
}
