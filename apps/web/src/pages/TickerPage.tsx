import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { 
  Activity, 
  Package, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw, 
  Plus, 
  Minus, 
  FlaskConical, 
  Clock, 
  CheckCircle, 
  XCircle,
  Calendar,
  AlertTriangle
} from 'lucide-react'
import { formatDate, formatCurrency, getRoleColor, getRoleDisplayName, getMovementTypeColor, getTransactionStatusColor, getDisplayName } from '../lib/utils'

export default function TickerPage() {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'lager' | 'kasse' | 'packages' | 'weekly-delivery' | 'sanctions'>('all')

  const { data: stockMovements, isLoading: stockLoading } = useQuery({
    queryKey: ['recent-stock-movements'],
    queryFn: () => api.get('/items/movements/recent').then(res => res.data),
    enabled: selectedFilter === 'all' || selectedFilter === 'lager',
  })

  const { data: cashTransactions, isLoading: cashLoading } = useQuery({
    queryKey: ['recent-cash-transactions'],
    queryFn: () => api.get('/cash/transactions?limit=50').then(res => res.data),
    enabled: selectedFilter === 'all' || selectedFilter === 'kasse',
  })

  const { data: packageDeposits, isLoading: packagesLoading } = useQuery({
    queryKey: ['recent-package-deposits'],
    queryFn: () => api.get('/packages/deposits/recent').then(res => res.data),
    enabled: selectedFilter === 'all' || selectedFilter === 'packages',
  })

  const { data: weeklyDeliveries, isLoading: weeklyLoading } = useQuery({
    queryKey: ['recent-weekly-deliveries'],
    queryFn: () => api.get('/weekly-delivery/recent').then(res => res.data),
    enabled: selectedFilter === 'all' || selectedFilter === 'weekly-delivery',
  })

  const { data: sanctions, isLoading: sanctionsLoading } = useQuery({
    queryKey: ['recent-sanctions'],
    queryFn: () => api.get('/sanctions/recent').then(res => res.data),
    enabled: selectedFilter === 'all' || selectedFilter === 'sanctions',
  })

  // Combine and sort activities
  const allActivities: any[] = []

  if (stockMovements?.movements) {
    stockMovements.movements.forEach((movement: any) => {
      if (movement.status === 'APPROVED') {
        allActivities.push({
          id: `stock-${movement.id}`,
          type: 'lager',
          timestamp: movement.createdAt,
          user: movement.createdBy,
          action: movement.type,
          details: {
            itemName: movement.item?.name || 'Unbekannter Artikel',
            quantity: movement.quantity,
            note: movement.note,
          }
        })
      } else if (movement.status === 'PENDING') {
        allActivities.push({
          id: `stock-pending-${movement.id}`,
          type: 'lager',
          timestamp: movement.createdAt,
          user: movement.createdBy,
          action: movement.type,
          isPending: true,
          details: {
            itemName: movement.item?.name || 'Unbekannter Artikel',
            quantity: movement.quantity,
            note: movement.note,
          }
        })
      }
    })
  }

  if (cashTransactions?.transactions) {
    cashTransactions.transactions.forEach((transaction: any) => {
      if (transaction.status === 'APPROVED') {
        allActivities.push({
          id: `cash-${transaction.id}`,
          type: 'kasse',
          timestamp: transaction.createdAt,
          user: transaction.createdBy,
          action: transaction.kind,
          details: {
            amount: transaction.amount,
            category: transaction.category,
            note: transaction.note,
            status: transaction.status,
          }
        })
      } else if (transaction.status === 'PENDING') {
        allActivities.push({
          id: `cash-pending-${transaction.id}`,
          type: 'kasse',
          timestamp: transaction.createdAt,
          user: transaction.createdBy,
          action: transaction.kind,
          isPending: true,
          details: {
            amount: transaction.amount,
            category: transaction.category,
            note: transaction.note,
            status: transaction.status,
          }
        })
      }
    })
  }

  if (packageDeposits?.deposits) {
    packageDeposits.deposits.forEach((deposit: any) => {
      allActivities.push({
        id: `kokain-${deposit.id}`,
        type: 'packages',
        timestamp: deposit.confirmedAt || deposit.createdAt,
        user: deposit.user,
        action: deposit.status,
        isPending: deposit.status === 'PENDING',
        details: {
          packages: deposit.packages,
          note: deposit.note,
          status: deposit.status,
          confirmedBy: deposit.confirmedBy,
        }
      })
    })
  }

  if (weeklyDeliveries) {
    weeklyDeliveries.forEach((delivery: any) => {
      allActivities.push({
        id: `weekly-delivery-${delivery.id}`,
        type: 'weekly-delivery',
        timestamp: delivery.createdAt,
        user: delivery.user,
        action: delivery.status,
        details: {
          packages: delivery.packages,
          paidMoney: delivery.paidMoney,
          status: delivery.status,
        }
      })
    })
  }

  if (sanctions) {
    sanctions.forEach((sanction: any) => {
      allActivities.push({
        id: `sanction-${sanction.id}`,
        type: 'sanctions',
        timestamp: sanction.createdAt,
        user: sanction.user,
        action: sanction.status,
        details: {
          category: sanction.category,
          level: sanction.level,
          amount: sanction.amount,
          penalty: sanction.penalty,
          description: sanction.description,
          status: sanction.status,
        }
      })
    })
  }

  // Sort by timestamp (newest first)
  allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const getActivityIcon = (type: string, action: string) => {
    if (type === 'lager') {
      switch (action) {
        case 'IN': return <Plus className="h-4 w-4 text-green-400" />
        case 'OUT': return <Minus className="h-4 w-4 text-red-400" />
        case 'ADJUST': return <RotateCcw className="h-4 w-4 text-yellow-400" />
        default: return <Package className="h-4 w-4" />
      }
    } else if (type === 'kasse') {
      switch (action) {
        case 'EINZAHLUNG': return <TrendingUp className="h-4 w-4 text-green-400" />
        case 'AUSZAHLUNG': return <TrendingDown className="h-4 w-4 text-red-400" />
        default: return <DollarSign className="h-4 w-4" />
      }
    } else if (type === 'packages') {
      switch (action) {
        case 'PENDING': return <Clock className="h-4 w-4 text-yellow-400" />
        case 'CONFIRMED': return <CheckCircle className="h-4 w-4 text-green-400" />
        case 'REJECTED': return <XCircle className="h-4 w-4 text-red-400" />
        default: return <FlaskConical className="h-4 w-4" />
      }
    } else if (type === 'weekly-delivery') {
      switch (action) {
        case 'PAID': return <CheckCircle className="h-4 w-4 text-green-400" />
        case 'OVERDUE': return <XCircle className="h-4 w-4 text-red-400" />
        default: return <Calendar className="h-4 w-4 text-yellow-400" />
      }
    } else if (type === 'sanctions') {
      switch (action) {
        case 'ACTIVE': return <AlertTriangle className="h-4 w-4 text-red-400" />
        case 'PAID': return <CheckCircle className="h-4 w-4 text-green-400" />
        default: return <Activity className="h-4 w-4" />
      }
    }
    return <Activity className="h-4 w-4" />
  }

  const getActionDisplay = (type: string, action: string) => {
    if (type === 'lager') {
      return { IN: 'Einlagerung', OUT: 'Auslagerung', ADJUST: 'Korrektur' }[action] || action
    } else if (type === 'kasse') {
      return { EINZAHLUNG: 'Einzahlung', AUSZAHLUNG: 'Auszahlung' }[action] || action
    } else if (type === 'packages') {
      return { PENDING: 'Deposit angefragt', CONFIRMED: 'Deposit bestätigt', REJECTED: 'Deposit abgelehnt' }[action] || action
    } else if (type === 'weekly-delivery') {
      return { PENDING: 'Erstellt', PAID: 'Bezahlt', CONFIRMED: 'Bestätigt', OVERDUE: 'Überfällig' }[action] || action
    } else if (type === 'sanctions') {
      return { ACTIVE: 'Sanktion erstellt', PAID: 'Sanktion bezahlt' }[action] || action
    }
    return action
  }

  const isLoading = stockLoading || cashLoading || packagesLoading || weeklyLoading || sanctionsLoading

  const todayCount = allActivities.filter(a => new Date(a.timestamp).toDateString() === new Date().toDateString()).length

  const filterButtons = [
    { key: 'all', label: 'Alle', icon: Activity },
    { key: 'lager', label: 'Lager', icon: Package },
    { key: 'kasse', label: 'Kasse', icon: DollarSign },
    { key: 'packages', label: 'Pakete', icon: FlaskConical },
    { key: 'weekly-delivery', label: 'Wochenabgabe', icon: Calendar },
    { key: 'sanctions', label: 'Sanktionen', icon: AlertTriangle },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-pink-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-transparent to-rose-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-pink-600 to-rose-600 rounded-xl shadow-lg shadow-pink-500/30">
              <Activity className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Live-Ticker</h1>
              <p className="text-gray-400 mt-1">
                Alle Aktivitäten in Echtzeit
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {filterButtons.map((btn) => (
              <Button
                key={btn.key}
                variant={selectedFilter === btn.key ? 'default' : 'outline'}
                onClick={() => setSelectedFilter(btn.key as typeof selectedFilter)}
                size="sm"
                className={selectedFilter === btn.key 
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white border-0' 
                  : 'border-gray-700 hover:bg-gray-800'}
              >
                <btn.icon className="mr-1.5 h-4 w-4" />
                {btn.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-pink-900/30 to-rose-900/20 border-pink-500/30">
          <CardContent className="p-4">
            <p className="text-pink-300/70 text-xs uppercase tracking-wider">Heute</p>
            <p className="text-2xl font-bold text-white mt-1">{todayCount}</p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border-blue-500/30">
          <CardContent className="p-4">
            <p className="text-blue-300/70 text-xs uppercase tracking-wider">Lager</p>
            <p className="text-2xl font-bold text-white mt-1">
              {allActivities.filter(a => a.type === 'lager').length}
            </p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-500/30">
          <CardContent className="p-4">
            <p className="text-green-300/70 text-xs uppercase tracking-wider">Kasse</p>
            <p className="text-2xl font-bold text-white mt-1">
              {allActivities.filter(a => a.type === 'kasse').length}
            </p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-900/30 to-violet-900/20 border-purple-500/30">
          <CardContent className="p-4">
            <p className="text-purple-300/70 text-xs uppercase tracking-wider">Pakete</p>
            <p className="text-2xl font-bold text-white mt-1">
              {allActivities.filter(a => a.type === 'packages').length}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-orange-900/30 to-amber-900/20 border-orange-500/30">
          <CardContent className="p-4">
            <p className="text-orange-300/70 text-xs uppercase tracking-wider">Wochenabgabe</p>
            <p className="text-2xl font-bold text-white mt-1">
              {allActivities.filter(a => a.type === 'weekly-delivery').length}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-red-900/30 to-rose-900/20 border-red-500/30">
          <CardContent className="p-4">
            <p className="text-red-300/70 text-xs uppercase tracking-wider">Sanktionen</p>
            <p className="text-2xl font-bold text-white mt-1">
              {allActivities.filter(a => a.type === 'sanctions').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activities Feed */}
      <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white">Aktivitäts-Feed</CardTitle>
          <CardDescription className="text-gray-400">
            {allActivities.filter(a => selectedFilter === 'all' || a.type === selectedFilter).length} Aktivitäten
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
                <p className="text-gray-400">Lade Aktivitäten...</p>
              </div>
            </div>
          ) : allActivities.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">Keine Aktivitäten gefunden</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-800/30">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Zeit</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Typ</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Aktion</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Benutzer</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Notiz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {allActivities
                    .filter(activity => selectedFilter === 'all' || activity.type === selectedFilter)
                    .map((activity) => (
                    <tr key={activity.id} className="group hover:bg-pink-950/20 transition-colors">
                      <td className="py-4 px-6">
                        <span className="text-gray-400 text-sm">{formatDate(activity.timestamp)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className={
                          activity.type === 'lager' ? 'border-blue-500/30 text-blue-400' : 
                          activity.type === 'kasse' ? 'border-green-500/30 text-green-400' :
                          activity.type === 'packages' ? 'border-purple-500/30 text-purple-400' :
                          activity.type === 'weekly-delivery' ? 'border-orange-500/30 text-orange-400' :
                          'border-red-500/30 text-red-400'
                        }>
                          {activity.type === 'lager' ? 'Lager' : 
                           activity.type === 'kasse' ? 'Kasse' :
                           activity.type === 'packages' ? 'Pakete' :
                           activity.type === 'weekly-delivery' ? 'Wochenabgabe' :
                           'Sanktionen'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {getActivityIcon(activity.type, activity.action)}
                          <Badge className={
                            activity.isPending ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                            activity.type === 'lager' ? getMovementTypeColor(activity.action) :
                            activity.type === 'packages' ? (
                              activity.action === 'CONFIRMED' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                              activity.action === 'REJECTED' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                              'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                            ) :
                            'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }>
                            {activity.isPending ? '[ANGEFRAGT] ' : ''}{getActionDisplay(activity.type, activity.action)}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm">{getDisplayName(activity.user)}</span>
                          <Badge className={getRoleColor(activity.user?.role)} variant="outline">
                            {getRoleDisplayName(activity.user?.role)}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {activity.type === 'lager' ? (
                          <div>
                            <div className="text-white font-medium">{activity.details.itemName}</div>
                            <div className="text-sm text-gray-400">Menge: {activity.details.quantity}</div>
                          </div>
                        ) : activity.type === 'packages' ? (
                          <div className="text-white font-medium">{activity.details.packages} Pakete</div>
                        ) : activity.type === 'sanctions' ? (
                          <div>
                            <div className="text-white font-medium">Level {activity.details.level}</div>
                            <div className="text-sm text-gray-400">{activity.details.amount?.toLocaleString('de-DE')} Schwarzgeld</div>
                          </div>
                        ) : (
                          <div className="text-white font-medium">{formatCurrency(activity.details.amount)}</div>
                        )}
                      </td>
                      <td className="py-4 px-4 max-w-xs">
                        <span className="text-gray-400 text-sm truncate block">{activity.details.note || '-'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
