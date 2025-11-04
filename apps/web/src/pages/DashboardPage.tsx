import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Package, DollarSign, AlertTriangle, TrendingUp, Users, Activity, FlaskConical, Shield, BarChart3, Clock, Calendar, Scale, PackageOpen, CalendarCheck, CalendarDays, Droplet, FileText, Settings } from 'lucide-react'
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
  
  // Alle Module mit Berechtigungsprüfung
  const allModules = [
    { key: 'lager', name: 'Lager', requiresRole: null },
    { key: 'lager-movements', name: 'Lagerbewegungen', requiresRole: null },
    { key: 'kasse', name: 'Kasse', requiresRole: null },
    { key: 'packages', name: 'Pakete', requiresRole: null },
    { key: 'weekly-delivery', name: 'Wochenabgabe', requiresRole: null },
    { key: 'familiensammeln', name: 'Familiensammeln', requiresRole: null },
    { key: 'aufstellungen', name: 'Aufstellungen', requiresRole: null },
    { key: 'abmeldungen', name: 'Abmeldungen', requiresRole: null },
    { key: 'bloodlist', name: 'Blood List', requiresRole: null },
    { key: 'sanctions', name: 'Sanktionen', requiresRole: null },
    { key: 'user-management', name: 'Benutzerverwaltung', requiresRole: 'EL_PATRON' },
    { key: 'ticker', name: 'Live-Ticker', requiresRole: null },
    { key: 'audit', name: 'Audit-Log', requiresRole: null },
    { key: 'settings', name: 'Einstellungen', requiresRole: null },
  ]

  // Filtere Module basierend auf Berechtigungen
  const modules = allModules.filter(module => {
    if (!module.requiresRole) return true
    return hasRole(user, module.requiresRole)
  })
  
  const modulesLoading = false

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

  const { data: packagePrice } = useQuery({
    queryKey: ['packages-price'],
    queryFn: () => api.get('/packages/price').then(res => res.data),
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
    packagePrice: packagePrice?.price || 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-2">
          Willkommen zurück im LaSanta Calavera Management System
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="lasanta-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Gesamtsaldo
            </CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(stats.currentBalance)}
            </div>
            <p className={`text-xs ${stats.todayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.todayChange >= 0 ? '+' : ''}{formatCurrency(stats.todayChange)} heute
            </p>
          </CardContent>
        </Card>

        <Card className="lasanta-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Kritische Bestände
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.criticalItems}
            </div>
            <p className="text-xs text-gray-400">
              von {stats.totalItems} Artikeln
            </p>
          </CardContent>
        </Card>

        <Card className="lasanta-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Ausstehende Genehmigungen
            </CardTitle>
            <Activity className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.pendingTransactions}
            </div>
            <p className="text-xs text-gray-400">
              Transaktionen
            </p>
          </CardContent>
        </Card>

        <Card className="lasanta-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Wochenumsatz
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(Math.abs(stats.weekChange))}
            </div>
            <p className={`text-xs ${stats.weekChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.weekChange >= 0 ? 'Gewinn' : 'Verlust'} diese Woche
            </p>
          </CardContent>
        </Card>

        <Card className="lasanta-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Paket-Deposits
            </CardTitle>
            <PackageOpen className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.confirmedDeposits}
            </div>
            <p className="text-xs text-gray-400">
              {stats.pendingDeposits} ausstehend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Module Cards */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Module</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulesLoading ? (
            // Loading skeleton for modules
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="lasanta-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-6 w-6 bg-gray-600 rounded animate-pulse" />
                      <div className="h-4 w-24 bg-gray-600 rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-16 bg-gray-600 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-full bg-gray-600 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-20 bg-gray-600 rounded animate-pulse" />
                    <div className="h-8 w-16 bg-gray-600 rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            modules?.map((module: any) => (
            <Card key={module.key} className="lasanta-card hover:bg-gray-800/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {module.key === 'lager' && <Package className="h-6 w-6 text-accent" />}
                    {module.key === 'kasse' && <DollarSign className="h-6 w-6 text-accent" />}
                    {module.key === 'packages' && <PackageOpen className="h-6 w-6 text-accent" />}
                    {module.key === 'aufstellungen' && <CalendarCheck className="h-6 w-6 text-accent" />}
                    {module.key === 'abmeldungen' && <CalendarDays className="h-6 w-6 text-accent" />}
                    {module.key === 'bloodlist' && <Droplet className="h-6 w-6 text-red-500" />}
                    {module.key === 'weekly-delivery' && <Calendar className="h-6 w-6 text-accent" />}
                    {module.key === 'familiensammeln' && <Users className="h-6 w-6 text-gold-500" />}
                    {module.key === 'sanctions' && <Scale className="h-6 w-6 text-accent" />}
                    {module.key === 'audit' && <FileText className="h-6 w-6 text-accent" />}
                    {module.key === 'lager-movements' && <Clock className="h-6 w-6 text-accent" />}
                    {module.key === 'ticker' && <Activity className="h-6 w-6 text-accent" />}
                    {module.key === 'user-management' && <Users className="h-6 w-6 text-accent" />}
                    {module.key === 'settings' && <Settings className="h-6 w-6 text-accent" />}
                    <CardTitle className="text-white">{module.name}</CardTitle>
                  </div>
                  <Badge variant="success">Aktiv</Badge>
                </div>
                <CardDescription className="text-gray-400">
                  {module.key === 'lager' && (
                    <>
                      Verwalte Waffen, Munition und Ausrüstung. 
                      {stats.criticalItems > 0 && (
                        <span className="text-red-400 font-medium">
                          {' '}⚠️ {stats.criticalItems} kritische Bestände!
                        </span>
                      )}
                    </>
                  )}
                  {module.key === 'kasse' && (
                    <>
                      Schwarzgeld-Verwaltung und Buchungen.
                      {stats.pendingTransactions > 0 && (
                        <span className="text-yellow-400 font-medium">
                          {' '}⏳ {stats.pendingTransactions} ausstehend
                        </span>
                      )}
                    </>
                  )}
                  {module.key === 'packages' && (
                    <>
                      Paket-Depot-Verwaltung und Abgaben.
                      {stats.pendingDeposits > 0 && (
                        <span className="text-yellow-400 font-medium">
                          {' '}⏳ {stats.pendingDeposits} ausstehend
                        </span>
                      )}
                    </>
                  )}
                  {module.key === 'familiensammeln' && (
                    <>
                      Teilnahme-Tracking für das Familiensammeln. Mindestens 3 von 6 Tagen erforderlich.
                    </>
                  )}
                  {module.key === 'weekly-delivery' && (
                    <>
                      Verwaltung der wöchentlichen Paket-Abgaben (300 Stück pro Woche).
                    </>
                  )}
                  {module.key === 'aufstellungen' && (
                    <>
                      Verwaltung von Terminen und Teilnahme-Reaktionen.
                    </>
                  )}
                  {module.key === 'abmeldungen' && (
                    <>
                      Verwalte Abwesenheiten für Aufstellungen und Wochenabgaben.
                    </>
                  )}
                  {module.key === 'bloodlist' && (
                    <>
                      Blood In & Blood Out - Familienmitglieder-Verwaltung.
                    </>
                  )}
                  {module.key === 'sanctions' && (
                    <>
                      LaFamilia se cuida, Compadres! Verwaltung von Verstößen und Strafen.
                    </>
                  )}
                  {module.key === 'audit' && (
                    <>
                      Vollständige Aktivitäts-Protokollierung und Nachverfolgung aller System-Aktionen.
                    </>
                  )}
                  {module.key === 'lager-movements' && (
                    <>
                      Ausstehende Lagerbewegungen genehmigen oder ablehnen.
                    </>
                  )}
                  {module.key === 'ticker' && (
                    <>
                      Echtzeit-Aktivitäts-Feed mit Filtern und Statistiken.
                    </>
                  )}
                  {module.key === 'user-management' && (
                    <>
                      Verwalte Benutzer-Rollen und Berechtigungen.
                    </>
                  )}
                  {module.key === 'settings' && (
                    <>
                      System-Einstellungen und Konfiguration.
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    {module.key === 'lager' && `${stats.totalItems} Artikel`}
                    {module.key === 'kasse' && `${formatCurrency(stats.currentBalance)} Saldo`}
                    {module.key === 'packages' && `${stats.confirmedDeposits} Bestätigt`}
                    {module.key === 'aufstellungen' && `Aufstellungen & Termine`}
                    {module.key === 'abmeldungen' && `Abwesenheiten`}
                    {module.key === 'bloodlist' && `Blood Records`}
                    {module.key === 'weekly-delivery' && `Wöchentliche Abgaben`}
                    {module.key === 'familiensammeln' && `Teilnahme-Tracking`}
                    {module.key === 'sanctions' && `Regelverstöße & Strafen`}
                    {module.key === 'audit' && `Alle Aktivitäten`}
                    {module.key === 'lager-movements' && `Wartende Genehmigungen`}
                    {module.key === 'ticker' && `Live Updates`}
                    {module.key === 'user-management' && `Benutzerverwaltung`}
                    {module.key === 'settings' && `System-Einstellungen`}
                  </div>
                  <Link to={`/${module.key}`}>
                    <Button variant="lasanta" size="sm">
                      Öffnen
                    </Button>
                  </Link>
                </div>
            </CardContent>
          </Card>
          ))
          )}
        </div>
      </div>
    </div>
  )
}

