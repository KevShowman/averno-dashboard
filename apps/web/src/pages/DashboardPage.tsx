import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Package, DollarSign, AlertTriangle, TrendingUp, Users, Activity, FlaskConical, Shield, BarChart3 } from 'lucide-react'
import { formatCurrency } from '../lib/utils'

interface DashboardStats {
  criticalItems: number
  totalItems: number
  currentBalance: number
  pendingTransactions: number
  todayChange: number
  weekChange: number
  pendingDeposits: number
  confirmedDeposits: number
  kokainPrice: number
}

export default function DashboardPage() {
  const { data: modules } = useQuery({
    queryKey: ['modules'],
    queryFn: () => api.get('/modules').then(res => res.data),
  })

  const { data: lagerStats } = useQuery({
    queryKey: ['lager-stats'],
    queryFn: () => api.get('/items?criticalOnly=true').then(res => ({
      criticalItems: res.data.items.length,
      totalItems: res.data.pagination.total
    })),
  })

  const { data: cashStats } = useQuery({
    queryKey: ['cash-stats'],
    queryFn: () => api.get('/cash/summary').then(res => res.data),
  })

  const { data: kokainStats } = useQuery({
    queryKey: ['kokain-stats'],
    queryFn: () => api.get('/kokain/summary').then(res => res.data),
  })

  const { data: kokainPrice } = useQuery({
    queryKey: ['kokain-price'],
    queryFn: () => api.get('/kokain/price').then(res => res.data),
  })

  const stats: DashboardStats = {
    criticalItems: lagerStats?.criticalItems || 0,
    totalItems: lagerStats?.totalItems || 0,
    currentBalance: cashStats?.currentBalance || 0,
    pendingTransactions: cashStats?.pendingTransactions || 0,
    todayChange: cashStats?.todayChange || 0,
    weekChange: cashStats?.weekChange || 0,
    pendingDeposits: kokainStats?.pendingDeposits || 0,
    confirmedDeposits: kokainStats?.confirmedDeposits || 0,
    kokainPrice: kokainPrice?.price || 0,
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
              Kokain-Deposits
            </CardTitle>
            <FlaskConical className="h-4 w-4 text-green-400" />
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
          {modules?.map((module: any) => (
            <Card key={module.key} className="lasanta-card hover:bg-gray-800/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {module.key === 'lager' && <Package className="h-6 w-6 text-accent" />}
                    {module.key === 'kasse' && <DollarSign className="h-6 w-6 text-accent" />}
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
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    {module.key === 'lager' && `${stats.totalItems} Artikel`}
                    {module.key === 'kasse' && `${formatCurrency(stats.currentBalance)} Saldo`}
                  </div>
                  <Link to={`/${module.key}`}>
                    <Button variant="lasanta" size="sm">
                      Öffnen
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Zusätzliche System-Module */}
          <Card className="lasanta-card hover:bg-gray-800/50 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FlaskConical className="h-6 w-6 text-green-400" />
                  <CardTitle className="text-white">Kokain-System</CardTitle>
                </div>
                <Badge variant="success">Aktiv</Badge>
              </div>
              <CardDescription className="text-gray-400">
                Deposit-Verwaltung und Übergabe-System.
                {stats.pendingDeposits > 0 && (
                  <span className="text-yellow-400 font-medium">
                    {' '}⏳ {stats.pendingDeposits} ausstehend
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  {formatCurrency(stats.kokainPrice)} pro Paket
                </div>
                <Link to="/kokain">
                  <Button variant="lasanta" size="sm">
                    Öffnen
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="lasanta-card hover:bg-gray-800/50 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="h-6 w-6 text-blue-400" />
                  <CardTitle className="text-white">Audit-Logs</CardTitle>
                </div>
                <Badge variant="success">Aktiv</Badge>
              </div>
              <CardDescription className="text-gray-400">
                Vollständige Aktivitäts-Protokollierung und Nachverfolgung aller System-Aktionen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  Alle Aktivitäten
                </div>
                <Link to="/audit">
                  <Button variant="lasanta" size="sm">
                    Öffnen
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="lasanta-card hover:bg-gray-800/50 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-6 w-6 text-purple-400" />
                  <CardTitle className="text-white">Live Ticker</CardTitle>
                </div>
                <Badge variant="success">Aktiv</Badge>
              </div>
              <CardDescription className="text-gray-400">
                Echtzeit-Aktivitäts-Feed mit Filtern und Statistiken.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  Live Updates
                </div>
                <Link to="/ticker">
                  <Button variant="lasanta" size="sm">
                    Öffnen
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

