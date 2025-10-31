import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Activity, Package, DollarSign, TrendingUp, TrendingDown, RotateCcw, Plus, Minus, Filter, FlaskConical, Clock, CheckCircle, XCircle } from 'lucide-react'
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
      // Nur APPROVED Bewegungen im Ticker anzeigen
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
            reference: movement.reference,
          }
        })
      } else if (movement.status === 'PENDING') {
        // Pending Bewegungen als "angefragt" anzeigen
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
            reference: movement.reference,
          }
        })
      }
    })
  }

  if (cashTransactions?.transactions) {
    cashTransactions.transactions.forEach((transaction: any) => {
      // Nur APPROVED Transaktionen im Ticker anzeigen
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
            reference: transaction.reference,
          }
        })
      } else if (transaction.status === 'PENDING') {
        // Pending Transaktionen als "angefragt" anzeigen
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
            reference: transaction.reference,
          }
        })
      }
    })
  }

  if (packageDeposits?.deposits) {
    packageDeposits.deposits.forEach((deposit: any) => {
      // Alle Deposit-Status anzeigen (CONFIRMED, PENDING, REJECTED)
      if (deposit.status === 'CONFIRMED') {
        allActivities.push({
          id: `kokain-${deposit.id}`,
          type: 'packages',
          timestamp: deposit.confirmedAt || deposit.createdAt,
          user: deposit.user,
          action: deposit.status,
          details: {
            packages: deposit.packages,
            note: deposit.note,
            status: deposit.status,
            confirmedBy: deposit.confirmedBy,
            confirmedAt: deposit.confirmedAt,
          }
        })
      } else if (deposit.status === 'PENDING') {
        // Pending Deposits als "angefragt" anzeigen
        allActivities.push({
          id: `kokain-pending-${deposit.id}`,
          type: 'packages',
          timestamp: deposit.createdAt,
          user: deposit.user,
          action: deposit.status,
          isPending: true,
          details: {
            packages: deposit.packages,
            note: deposit.note,
            status: deposit.status,
          }
        })
      } else if (deposit.status === 'REJECTED') {
        // Rejected Deposits anzeigen
        allActivities.push({
          id: `kokain-rejected-${deposit.id}`,
          type: 'packages',
          timestamp: deposit.rejectedAt || deposit.createdAt,
          user: deposit.user,
          action: deposit.status,
          details: {
            packages: deposit.packages,
            note: deposit.note,
            status: deposit.status,
            rejectedBy: deposit.rejectedBy,
            rejectedAt: deposit.rejectedAt,
            rejectionReason: deposit.rejectionReason,
          }
        })
      }
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
          paidAmount: delivery.paidAmount,
          paidMoney: delivery.paidMoney,
          status: delivery.status,
          weekStart: delivery.weekStart,
          weekEnd: delivery.weekEnd,
          confirmedBy: delivery.confirmedBy,
          confirmedAt: delivery.confirmedAt,
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
          createdBy: sanction.createdBy,
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
        case 'RESERVE': return <Package className="h-4 w-4 text-blue-400" />
        case 'RELEASE': return <Package className="h-4 w-4 text-purple-400" />
        default: return <Package className="h-4 w-4" />
      }
    } else if (type === 'kasse') {
      switch (action) {
        case 'EINZAHLUNG': return <TrendingUp className="h-4 w-4 text-green-400" />
        case 'AUSZAHLUNG': return <TrendingDown className="h-4 w-4 text-red-400" />
        case 'TRANSFER': return <DollarSign className="h-4 w-4 text-blue-400" />
        case 'KORREKTUR': return <RotateCcw className="h-4 w-4 text-yellow-400" />
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
        case 'PENDING': return <Clock className="h-4 w-4 text-yellow-400" />
        case 'PAID': return <CheckCircle className="h-4 w-4 text-green-400" />
        case 'CONFIRMED': return <CheckCircle className="h-4 w-4 text-blue-400" />
        case 'OVERDUE': return <XCircle className="h-4 w-4 text-red-400" />
        case 'PARTIALLY_PAID': return <Clock className="h-4 w-4 text-orange-400" />
        default: return <Package className="h-4 w-4" />
      }
    } else if (type === 'sanctions') {
      switch (action) {
        case 'ACTIVE': return <XCircle className="h-4 w-4 text-red-400" />
        case 'PAID': return <CheckCircle className="h-4 w-4 text-green-400" />
        case 'EXPIRED': return <Clock className="h-4 w-4 text-gray-400" />
        case 'CANCELLED': return <XCircle className="h-4 w-4 text-yellow-400" />
        default: return <Activity className="h-4 w-4" />
      }
    } else {
      return <Activity className="h-4 w-4" />
    }
  }

  const getActionDisplay = (type: string, action: string) => {
    if (type === 'lager') {
      const actionMap: Record<string, string> = {
        'IN': 'Einlagerung',
        'OUT': 'Auslagerung',
        'ADJUST': 'Bestandskorrektur',
        'RESERVE': 'Reservierung',
        'RELEASE': 'Reservierung aufgehoben',
      }
      return actionMap[action] || action
    } else if (type === 'kasse') {
      const actionMap: Record<string, string> = {
        'EINZAHLUNG': 'Einzahlung',
        'AUSZAHLUNG': 'Auszahlung',
        'TRANSFER': 'Transfer',
        'KORREKTUR': 'Korrektur',
      }
      return actionMap[action] || action
    } else if (type === 'packages') {
      const actionMap: Record<string, string> = {
        'PENDING': 'Deposit angefragt',
        'CONFIRMED': 'Deposit bestätigt',
        'REJECTED': 'Deposit abgelehnt',
      }
      return actionMap[action] || action
    } else if (type === 'weekly-delivery') {
      const actionMap: Record<string, string> = {
        'PENDING': 'Wochenabgabe erstellt',
        'PAID': 'Wochenabgabe bezahlt',
        'CONFIRMED': 'Wochenabgabe bestätigt',
        'OVERDUE': 'Wochenabgabe überfällig',
        'PARTIALLY_PAID': 'Wochenabgabe teilweise bezahlt',
      }
      return actionMap[action] || action
    } else if (type === 'sanctions') {
      const actionMap: Record<string, string> = {
        'ACTIVE': 'Sanktion erstellt',
        'PAID': 'Sanktion bezahlt',
        'EXPIRED': 'Sanktion abgelaufen',
        'CANCELLED': 'Sanktion storniert',
      }
      return actionMap[action] || action
    } else {
      return action
    }
  }

  const isLoading = stockLoading || cashLoading || packagesLoading || weeklyLoading || sanctionsLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Activity className="mr-3 h-8 w-8 text-accent" />
            Live-Ticker
          </h1>
          <p className="text-gray-400 mt-2">
            Alle Lager- und Kassenbewegungen in Echtzeit
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={selectedFilter === 'all' ? "default" : "outline"}
            onClick={() => setSelectedFilter('all')}
            size="sm"
          >
            <Activity className="mr-2 h-4 w-4" />
            Alle
          </Button>
          <Button
            variant={selectedFilter === 'lager' ? "default" : "outline"}
            onClick={() => setSelectedFilter('lager')}
            size="sm"
          >
            <Package className="mr-2 h-4 w-4" />
            Lager
          </Button>
          <Button
            variant={selectedFilter === 'kasse' ? "default" : "outline"}
            onClick={() => setSelectedFilter('kasse')}
            size="sm"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Kasse
          </Button>
          <Button
            variant={selectedFilter === 'packages' ? "default" : "outline"}
            onClick={() => setSelectedFilter('packages')}
            size="sm"
          >
            <Package className="mr-2 h-4 w-4" />
            Pakete
          </Button>
          <Button
            variant={selectedFilter === 'weekly-delivery' ? "default" : "outline"}
            onClick={() => setSelectedFilter('weekly-delivery')}
            size="sm"
          >
            <Package className="mr-2 h-4 w-4" />
            Wochenabgabe
          </Button>
          <Button
            variant={selectedFilter === 'sanctions' ? "default" : "outline"}
            onClick={() => setSelectedFilter('sanctions')}
            size="sm"
          >
            <Activity className="mr-2 h-4 w-4" />
            Sanktionen
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Aktivitäten heute</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {allActivities.filter(activity => {
                const today = new Date().toDateString()
                return new Date(activity.timestamp).toDateString() === today
              }).length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Lagerbewegungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {allActivities.filter(activity => activity.type === 'lager').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Geldtransaktionen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {allActivities.filter(activity => activity.type === 'kasse').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Paket-Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {allActivities.filter(activity => activity.type === 'packages').length}
            </div>
          </CardContent>
        </Card>

        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Wochenabgaben</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">
              {allActivities.filter(activity => activity.type === 'weekly-delivery').length}
            </div>
          </CardContent>
        </Card>

        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Sanktionen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {allActivities.filter(activity => activity.type === 'sanctions').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activities Feed */}
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white">Aktivitäts-Feed</CardTitle>
          <CardDescription className="text-gray-400">
            Die letzten {allActivities.length} Aktivitäten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Zeit</TableHead>
                    <TableHead className="text-gray-400">Typ</TableHead>
                    <TableHead className="text-gray-400">Aktion</TableHead>
                    <TableHead className="text-gray-400">Benutzer</TableHead>
                    <TableHead className="text-gray-400">Details</TableHead>
                    <TableHead className="text-gray-400">Notiz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allActivities
                    .filter(activity => selectedFilter === 'all' || activity.type === selectedFilter)
                    .map((activity) => (
                    <TableRow key={activity.id} className="hover:bg-gray-800/50">
                      <TableCell className="text-gray-300">
                        {formatDate(activity.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          activity.type === 'lager' ? 'outline' : 
                          activity.type === 'kasse' ? 'secondary' :
                          activity.type === 'packages' ? 'destructive' :
                          activity.type === 'weekly-delivery' ? 'default' :
                          activity.type === 'sanctions' ? 'destructive' : 'secondary'
                        }>
                          {activity.type === 'lager' ? 'Lager' : 
                           activity.type === 'kasse' ? 'Kasse' :
                           activity.type === 'packages' ? 'Pakete' :
                           activity.type === 'weekly-delivery' ? 'Wochenabgabe' :
                           activity.type === 'sanctions' ? 'Sanktionen' : 'Unbekannt'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getActivityIcon(activity.type, activity.action)}
                          <Badge className={
                            activity.isPending
                              ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                              : activity.type === 'lager' 
                                ? getMovementTypeColor(activity.action)
                                : activity.type === 'packages'
                                  ? activity.action === 'CONFIRMED' 
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                    : activity.action === 'REJECTED'
                                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                  : activity.details.status 
                                    ? getTransactionStatusColor(activity.details.status)
                                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }>
                            {activity.isPending ? '[ANGEFRAGT] ' : ''}{getActionDisplay(activity.type, activity.action)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-white">{getDisplayName(activity.user)}</span>
                          <Badge className={getRoleColor(activity.user.role)}>
                            {getRoleDisplayName(activity.user.role)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {activity.type === 'lager' ? (
                          <div>
                            <div className="font-medium">{activity.details.itemName}</div>
                            <div className="text-sm text-gray-400">
                              Menge: {activity.details.quantity}
                            </div>
                          </div>
                        ) : activity.type === 'packages' ? (
                          <div>
                            <div className="font-medium">
                              {activity.details.packages} Pakete
                            </div>
                            {activity.details.confirmedBy && (
                              <div className="text-sm text-gray-400">
                                Bestätigt von: {getDisplayName(activity.details.confirmedBy)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium">
                              {formatCurrency(activity.details.amount)}
                            </div>
                            {activity.details.category && (
                              <div className="text-sm text-gray-400">
                                {activity.details.category}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300 max-w-xs truncate">
                        {activity.details.note || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {allActivities.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Keine Aktivitäten gefunden
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
