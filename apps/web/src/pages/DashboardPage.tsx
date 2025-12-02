import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { 
  Package, 
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
  ArrowUpRight
} from 'lucide-react'
import { formatCurrency, hasRole } from '../lib/utils'

interface DashboardStats {
  criticalItems: number
  totalItems: number
  currentBalance: number
  pendingTransactions: number
  todayChange: number
  weekChange: number
  pendingDeposits: number
  confirmedDeposits: number
  packagePrice: number
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore()

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

  const { data: packageStats } = useQuery({
    queryKey: ['packages-stats'],
    queryFn: () => api.get('/packages/summary').then(res => res.data),
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
    pendingDeposits: packageStats?.pendingDeposits || 0,
    confirmedDeposits: packageStats?.confirmedDeposits || 0,
    packagePrice: 0,
  }

  // Module gruppiert
  const moduleGroups = [
    {
      title: 'Finanzen & Ressourcen',
      icon: Wallet,
      color: 'gold',
      modules: [
        { key: 'kasse', name: 'Kasse', icon: DollarSign, color: 'green', desc: 'Schwarzgeld-Verwaltung' },
        { key: 'lager', name: 'Lager', icon: Boxes, color: 'blue', desc: 'Waffen & Ausrüstung' },
        { key: 'lager-movements', name: 'Lagerbewegungen', icon: Clock, color: 'purple', desc: 'Genehmigungen' },
        { key: 'packages', name: 'Pakete', icon: Package, color: 'cyan', desc: 'Wochenabgabe Tracking' },
      ]
    },
    {
      title: 'Familie & Organisation',
      icon: Users,
      color: 'red',
      modules: [
        { key: 'bloodlist', name: 'Blood List', icon: Droplet, color: 'red', desc: 'Blood In / Blood Out' },
        { key: 'organigramm', name: 'Hierarchie', icon: Crown, color: 'gold', desc: 'Familienstruktur' },
        { key: 'sanctions', name: 'Sanktionen', icon: Scale, color: 'orange', desc: 'Verstöße & Strafen' },
      ]
    },
    {
      title: 'Termine & Aktivitäten',
      icon: Calendar,
      color: 'amber',
      modules: [
        { key: 'aufstellungen', name: 'Aufstellungen', icon: CalendarCheck, color: 'amber', desc: 'Termine & Teilnahme' },
        { key: 'abmeldungen', name: 'Abmeldungen', icon: CalendarDays, color: 'yellow', desc: 'Abwesenheiten' },
        { key: 'familiensammeln', name: 'Familiensammeln', icon: Users, color: 'emerald', desc: 'Touren-Tracking' },
        { key: 'weekly-delivery', name: 'Wochenabgabe', icon: PackageOpen, color: 'teal', desc: '300 Pakete/Woche' },
      ]
    },
    {
      title: 'System & Verwaltung',
      icon: Settings,
      color: 'gray',
      modules: [
        { key: 'audit', name: 'Audit-Log', icon: FileText, color: 'slate', desc: 'Aktivitäts-Protokoll' },
        { key: 'ticker', name: 'Live-Ticker', icon: Activity, color: 'violet', desc: 'Echtzeit-Feed' },
        ...(hasRole(user, 'EL_PATRON') ? [{ key: 'user-management', name: 'Benutzer', icon: Shield, color: 'indigo', desc: 'Rollen & Rechte' }] : []),
        { key: 'settings', name: 'Einstellungen', icon: Settings, color: 'zinc', desc: 'Konfiguration' },
      ]
    },
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
      gold: { bg: 'bg-gold-500/10', text: 'text-gold-400', border: 'border-gold-500/30', glow: 'shadow-gold-500/20' },
      green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', glow: 'shadow-green-500/20' },
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' },
      red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-red-500/20' },
      purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' },
      amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' },
      yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', glow: 'shadow-yellow-500/20' },
      orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', glow: 'shadow-orange-500/20' },
      cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20' },
      teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30', glow: 'shadow-teal-500/20' },
      emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' },
      slate: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', glow: 'shadow-slate-500/20' },
      violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30', glow: 'shadow-violet-500/20' },
      indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30', glow: 'shadow-indigo-500/20' },
      zinc: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', glow: 'shadow-zinc-500/20' },
      gray: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', glow: 'shadow-gray-500/20' },
    }
    return colors[color] || colors.gray
  }

  return (
    <div className="space-y-8">
      {/* Header with Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gold-500/20 p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-gold-500/5 via-transparent to-red-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-500/10 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-4 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 to-amber-600/30 rounded-full blur-xl scale-125" />
              <img 
                src="/logo.png" 
                alt="La Santa Calavera" 
                className="relative h-14 w-14 object-contain drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]"
              />
            </div>
            <h1 className="text-4xl font-bold text-white">La Santa Calavera</h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl">
            Willkommen zurück, <span className="text-gold-400 font-medium">{user?.icFirstName || user?.username}</span>. 
            Hier ist dein Überblick über die Familiengeschäfte.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Balance */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-500/30">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl" />
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
            <p className="text-green-300/70 text-sm mb-1">Gesamtsaldo</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.currentBalance)}</p>
          </CardContent>
        </Card>

        {/* Critical Items */}
        <Card className={`relative overflow-hidden ${stats.criticalItems > 0 ? 'bg-gradient-to-br from-red-900/30 to-orange-900/20 border-red-500/30' : 'bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border-blue-500/30'}`}>
          <div className={`absolute top-0 right-0 w-20 h-20 ${stats.criticalItems > 0 ? 'bg-red-500/10' : 'bg-blue-500/10'} rounded-full blur-2xl`} />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 ${stats.criticalItems > 0 ? 'bg-red-500/20' : 'bg-blue-500/20'} rounded-lg`}>
                <Boxes className={`h-5 w-5 ${stats.criticalItems > 0 ? 'text-red-400' : 'text-blue-400'}`} />
              </div>
              {stats.criticalItems > 0 && (
                <Badge className="bg-red-500/20 text-red-300 border-0 animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Kritisch
                </Badge>
              )}
            </div>
            <p className={`${stats.criticalItems > 0 ? 'text-red-300/70' : 'text-blue-300/70'} text-sm mb-1`}>Lagerbestand</p>
            <p className="text-2xl font-bold text-white">
              {stats.criticalItems > 0 ? (
                <span className="text-red-400">{stats.criticalItems} kritisch</span>
              ) : (
                `${stats.totalItems} Artikel`
              )}
            </p>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className={`relative overflow-hidden ${stats.pendingTransactions > 0 ? 'bg-gradient-to-br from-yellow-900/30 to-amber-900/20 border-yellow-500/30' : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700'}`}>
          <div className={`absolute top-0 right-0 w-20 h-20 ${stats.pendingTransactions > 0 ? 'bg-yellow-500/10' : 'bg-gray-500/10'} rounded-full blur-2xl`} />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 ${stats.pendingTransactions > 0 ? 'bg-yellow-500/20' : 'bg-gray-500/20'} rounded-lg`}>
                <Clock className={`h-5 w-5 ${stats.pendingTransactions > 0 ? 'text-yellow-400' : 'text-gray-400'}`} />
              </div>
              {stats.pendingTransactions > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-300 border-0">
                  Ausstehend
                </Badge>
              )}
            </div>
            <p className={`${stats.pendingTransactions > 0 ? 'text-yellow-300/70' : 'text-gray-400'} text-sm mb-1`}>Genehmigungen</p>
            <p className="text-2xl font-bold text-white">{stats.pendingTransactions}</p>
          </CardContent>
        </Card>

        {/* Week Change */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-900/30 to-violet-900/20 border-purple-500/30">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-400" />
              </div>
              <Badge className={`${stats.weekChange >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'} border-0`}>
                {stats.weekChange >= 0 ? 'Profit' : 'Loss'}
              </Badge>
            </div>
            <p className="text-purple-300/70 text-sm mb-1">Diese Woche</p>
            <p className={`text-2xl font-bold ${stats.weekChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.weekChange >= 0 ? '+' : ''}{formatCurrency(stats.weekChange)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Module Groups */}
      {moduleGroups.map((group) => (
        <div key={group.title}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 ${getColorClasses(group.color).bg} rounded-lg`}>
              <group.icon className={`h-5 w-5 ${getColorClasses(group.color).text}`} />
            </div>
            <h2 className="text-xl font-semibold text-white">{group.title}</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {group.modules.map((module) => {
              const colors = getColorClasses(module.color)
              return (
                <Link key={module.key} to={`/${module.key}`}>
                  <Card className={`h-full bg-gray-900/50 ${colors.border} hover:bg-gray-800/50 hover:shadow-lg ${colors.glow} transition-all duration-300 group cursor-pointer`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-2.5 ${colors.bg} rounded-xl`}>
                          <module.icon className={`h-5 w-5 ${colors.text}`} />
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <h3 className="text-white font-semibold mb-1 group-hover:text-gold-300 transition-colors">
                        {module.name}
                      </h3>
                      <p className="text-gray-500 text-sm">{module.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      ))}

      {/* Footer Info */}
      <Card className="bg-gray-900/30 border-gray-800">
        <CardContent className="p-4 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="LSC" 
              className="h-5 w-5 object-contain opacity-50"
            />
            <span>La Familia se cuida, Compadres!</span>
          </div>
          <span>LSC Management System v2.0</span>
        </CardContent>
      </Card>
    </div>
  )
}
