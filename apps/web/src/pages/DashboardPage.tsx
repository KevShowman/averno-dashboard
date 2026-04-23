import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Activity, 
  Shield, 
  Clock, 
  Calendar, 
  Scale, 
  PackageOpen, 
  CalendarCheck, 
  CalendarDays, 
  Droplet, 
  FileText, 
  Settings,
  Boxes,
  Wallet,
  TrendingDown,
  Crown,
  ArrowUpRight,
  Crosshair,
  Shirt,
  Car,
  Radio,
  ScrollText,
  Home,
  Network,
  BookOpen,
  Map,
  Languages
} from 'lucide-react'
import { formatCurrency, hasRole } from '../lib/utils'

interface DashboardStats {
  criticalItems: number
  totalItems: number
  currentBalance: number
  pendingTransactions: number
  todayChange: number
  weekChange: number
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore()
  usePageTitle('Dashboard')

  const { data: lagerStats } = useQuery({
    queryKey: ['lager-stats'],
    queryFn: () => api.get('/items?criticalOnly=true').then(res => ({
      criticalItems: res.data.items.length,
      totalItems: res.data.pagination.total
    })),
    enabled: isAuthenticated && !!user,
    retry: 3,
    refetchOnWindowFocus: false,
  })

  const { data: cashStats } = useQuery({
    queryKey: ['cash-stats'],
    queryFn: () => api.get('/cash/summary').then(res => res.data),
    enabled: isAuthenticated && !!user,
    retry: 3,
    refetchOnWindowFocus: false,
  })

  const stats: DashboardStats = {
    criticalItems: lagerStats?.criticalItems || 0,
    totalItems: lagerStats?.totalItems || 0,
    currentBalance: cashStats?.currentBalance || 0,
    pendingTransactions: cashStats?.pendingTransactions || 0,
    todayChange: cashStats?.todayChange || 0,
    weekChange: cashStats?.weekChange || 0,
  }

  const isLeadership = hasRole(user, ['PATRON', 'DON', 'CAPO'])
  const isSicario = hasRole(user, 'SICARIO')
  const isContacto = hasRole(user, 'CONTACTO')

  // Module - alle mit Gold Theme, semantische Icons
  const modules = [
    // Finanzen & Lager
    { key: 'kasse', name: 'Kasse', icon: DollarSign, desc: 'Schwarzgeld-Verwaltung' },
    { key: 'lager', name: 'Lager', icon: Boxes, desc: 'Waffen & Ausrüstung' },
    { key: 'lager-movements', name: 'Lagerbewegungen', icon: Clock, desc: 'Genehmigungen' },
    // Familie
    { key: 'weekly-delivery', name: 'Wochenabgabe', icon: PackageOpen, desc: 'Einer für alle!' },
    // { key: 'familiensammeln', name: 'Familiensammeln', icon: Users, desc: 'Touren-Tracking' }, // hidden
    { key: 'aufstellungen', name: 'Aufstellungen', icon: CalendarCheck, desc: 'Termine & Teilnahme' },
    { key: 'abmeldungen', name: 'Abmeldungen', icon: CalendarDays, desc: 'Abwesenheiten' },
    { key: 'anwesenheit', name: 'Anwesenheitsliste', icon: Calendar, desc: 'Tägliche Aktivität' },
    // Mitglieder
    { key: 'bloodlist', name: 'Blood List', icon: Droplet, desc: 'Blood In / Blood Out' },
    { key: 'sanctions', name: 'Sanktionen', icon: Scale, desc: 'Verstöße & Strafen' },
    // { key: 'organigramm', name: 'Organisation', icon: Network, desc: 'Familienstruktur' }, // hidden
    ...(isLeadership ? [{ key: 'member-files', name: 'Aktensystem', icon: FileText, desc: 'Mitglieder-Akten' }] : []),
    ...(hasRole(user, 'PATRON') ? [{ key: 'user-management', name: 'Benutzer', icon: Shield, desc: 'Rollen & Rechte' }] : []),
    // Ausstattung
    { key: 'clothing', name: 'Meine Kleidung', icon: Shirt, desc: 'Deine Outfits' },
    ...(isLeadership ? [{ key: 'clothing-management', name: 'Kleidungsverwaltung', icon: Shirt, desc: 'Vorlagen verwalten' }] : []),
    // { key: 'vehicle-tuning', name: 'Fahrzeugtuning', icon: Car, desc: 'Tuning-Specs' }, // hidden
    // Kommunikation
    { key: 'communication', name: 'Funk/DarkChat', icon: Radio, desc: 'Funkfrequenzen' },
    // { key: 'botschaft', name: 'Botschaft', icon: ScrollText, desc: 'Familia-News' }, // hidden
    { key: 'listenfuehrung', name: 'Listenführung', icon: BookOpen, desc: 'Familien-Kontakte' },
    { key: 'karte', name: 'Interaktive Karte', icon: Map, desc: 'Territorien & Standorte' },
    { key: 'slang', name: 'Akzent / Slang', icon: Languages, desc: 'Spanischer Akzent' },
    { key: 'la-casa', name: 'La Casa', icon: Home, desc: 'Unser Zuhause' },
    // System
    { key: 'ticker', name: 'Live-Ticker', icon: Activity, desc: 'Echtzeit-Feed' },
    { key: 'audit', name: 'Audit-Log', icon: FileText, desc: 'Aktivitäts-Protokoll' },
    { key: 'settings', name: 'Einstellungen', icon: Settings, desc: 'Konfiguration' },
  ]

  return (
    <div className="space-y-8">
      {/* Header with Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-orange-500/20 p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative">
          <div className="flex items-center gap-4 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-orange-600/30 rounded-full blur-xl scale-125 pointer-events-none" />
              <img 
                src="/logo.png" 
                alt="El Averno Cartel" 
                className="relative h-14 w-14 object-contain drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]"
              />
            </div>
            <h1 className="text-4xl font-bold text-white">El Averno Cartel</h1>
          </div>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Willkommen zurück, <span className="text-orange-400 font-medium">{user?.icFirstName || user?.username}</span>. 
            Hier ist dein Überblick über die Familiengeschäfte.
          </p>
        </div>
      </div>

      {/* Quick Stats - Semantic Colors Only */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Balance - Green for money */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border-orange-500/20 hover:border-orange-500/40 transition-colors">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Wallet className="h-5 w-5 text-green-400" />
              </div>
              {stats.todayChange !== 0 && (
                <Badge className={`${stats.todayChange >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'} border-0`}>
                  {stats.todayChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {stats.todayChange >= 0 ? '+' : ''}{formatCurrency(stats.todayChange)}
                </Badge>
              )}
            </div>
            <p className="text-zinc-400 text-sm mb-1">Gesamtsaldo</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.currentBalance)}</p>
          </CardContent>
        </Card>

        {/* Critical Items - Red only when critical */}
        <Card className={`relative overflow-hidden bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 ${stats.criticalItems > 0 ? 'border-red-500/30' : 'border-orange-500/20'} hover:border-orange-500/40 transition-colors`}>
          <div className={`absolute top-0 right-0 w-20 h-20 ${stats.criticalItems > 0 ? 'bg-red-500/10' : 'bg-orange-500/10'} rounded-full blur-2xl pointer-events-none`} />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 ${stats.criticalItems > 0 ? 'bg-red-500/20' : 'bg-orange-500/20'} rounded-lg`}>
                <Boxes className={`h-5 w-5 ${stats.criticalItems > 0 ? 'text-red-400' : 'text-orange-400'}`} />
              </div>
              {stats.criticalItems > 0 && (
                <Badge className="bg-red-500/20 text-red-300 border-0 animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Kritisch
                </Badge>
              )}
            </div>
            <p className="text-zinc-400 text-sm mb-1">Lagerbestand</p>
            <p className="text-2xl font-bold text-white">
              {stats.criticalItems > 0 ? (
                <span className="text-red-400">{stats.criticalItems} kritisch</span>
              ) : (
                <span className="text-orange-400">{stats.totalItems} Artikel</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Pending - Yellow only when pending */}
        <Card className={`relative overflow-hidden bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 ${stats.pendingTransactions > 0 ? 'border-orange-500/30' : 'border-orange-500/20'} hover:border-orange-500/40 transition-colors`}>
          <div className={`absolute top-0 right-0 w-20 h-20 ${stats.pendingTransactions > 0 ? 'bg-orange-500/10' : 'bg-orange-500/10'} rounded-full blur-2xl pointer-events-none`} />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 ${stats.pendingTransactions > 0 ? 'bg-orange-500/20' : 'bg-orange-500/20'} rounded-lg`}>
                <Clock className={`h-5 w-5 ${stats.pendingTransactions > 0 ? 'text-orange-400' : 'text-orange-400'}`} />
              </div>
              {stats.pendingTransactions > 0 && (
                <Badge className="bg-orange-500/20 text-orange-300 border-0">
                  Ausstehend
                </Badge>
              )}
            </div>
            <p className="text-zinc-400 text-sm mb-1">Genehmigungen</p>
            <p className={`text-2xl font-bold ${stats.pendingTransactions > 0 ? 'text-orange-400' : 'text-orange-400'}`}>{stats.pendingTransactions}</p>
          </CardContent>
        </Card>

        {/* Week Change */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border-orange-500/20 hover:border-orange-500/40 transition-colors">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-400" />
              </div>
              <Badge className={`${stats.weekChange >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'} border-0`}>
                {stats.weekChange >= 0 ? 'Profit' : 'Loss'}
              </Badge>
            </div>
            <p className="text-zinc-400 text-sm mb-1">Diese Woche</p>
            <p className={`text-2xl font-bold ${stats.weekChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.weekChange >= 0 ? '+' : ''}{formatCurrency(stats.weekChange)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Modules - All Gold Theme */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Calendar className="h-5 w-5 text-orange-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Module</h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {modules.map((module) => (
            <Link key={module.key} to={`/${module.key}`}>
              <Card className="h-full bg-zinc-900/50 border-orange-500/10 hover:border-orange-500/40 hover:bg-zinc-800/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 group cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-orange-500/10 group-hover:bg-orange-500/20 rounded-xl transition-colors">
                      <module.icon className="h-5 w-5 text-orange-400" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-orange-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-white font-semibold mb-1 group-hover:text-orange-300 transition-colors">
                    {module.name}
                  </h3>
                  <p className="text-zinc-500 text-sm">{module.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <Card className="bg-zinc-900/30 border-zinc-800">
        <CardContent className="p-4 flex items-center justify-between text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="LSC" 
              className="h-5 w-5 object-contain opacity-50"
            />
            <span>La Familia se cuida, Compadres!</span>
          </div>
          <span>El Averno Management System v1.0</span>
        </CardContent>
      </Card>
    </div>
  )
}
