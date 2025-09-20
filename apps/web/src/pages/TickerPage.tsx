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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'lager' | 'kasse' | 'kokain'>('all')

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

  const { data: kokainDeposits, isLoading: kokainLoading } = useQuery({
    queryKey: ['recent-kokain-deposits'],
    queryFn: () => api.get('/kokain/deposits/recent').then(res => res.data),
    enabled: selectedFilter === 'all' || selectedFilter === 'kokain',
  })

  // Combine and sort activities
  const allActivities: any[] = []

  if (stockMovements?.movements) {
    stockMovements.movements.forEach((movement: any) => {
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
    })
  }

  if (cashTransactions?.transactions) {
    cashTransactions.transactions.forEach((transaction: any) => {
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
    })
  }

  if (kokainDeposits?.deposits) {
    kokainDeposits.deposits.forEach((deposit: any) => {
      allActivities.push({
        id: `kokain-${deposit.id}`,
        type: 'kokain',
        timestamp: deposit.createdAt,
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
    } else {
      switch (action) {
        case 'PENDING': return <Clock className="h-4 w-4 text-yellow-400" />
        case 'CONFIRMED': return <CheckCircle className="h-4 w-4 text-green-400" />
        case 'REJECTED': return <XCircle className="h-4 w-4 text-red-400" />
        default: return <FlaskConical className="h-4 w-4" />
      }
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
    } else {
      const actionMap: Record<string, string> = {
        'PENDING': 'Deposit angefragt',
        'CONFIRMED': 'Deposit bestätigt',
        'REJECTED': 'Deposit abgelehnt',
      }
      return actionMap[action] || action
    }
  }

  const isLoading = stockLoading || cashLoading || kokainLoading

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
            variant={selectedFilter === 'kokain' ? "default" : "outline"}
            onClick={() => setSelectedFilter('kokain')}
            size="sm"
          >
            <FlaskConical className="mr-2 h-4 w-4" />
            Kokain
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <CardTitle className="text-sm text-gray-400">Kokain-Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {allActivities.filter(activity => activity.type === 'kokain').length}
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
                  {allActivities.map((activity) => (
                    <TableRow key={activity.id} className="hover:bg-gray-800/50">
                      <TableCell className="text-gray-300">
                        {formatDate(activity.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          activity.type === 'lager' ? 'outline' : 
                          activity.type === 'kokain' ? 'destructive' : 'secondary'
                        }>
                          {activity.type === 'lager' ? 'Lager' : 
                           activity.type === 'kokain' ? 'Kokain' : 'Kasse'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getActivityIcon(activity.type, activity.action)}
                          <Badge className={
                            activity.type === 'lager' 
                              ? getMovementTypeColor(activity.action)
                              : activity.type === 'kokain'
                                ? activity.action === 'CONFIRMED' 
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                  : activity.action === 'REJECTED'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                              : activity.details.status 
                                ? getTransactionStatusColor(activity.details.status)
                                : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }>
                            {getActionDisplay(activity.type, activity.action)}
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
                        ) : activity.type === 'kokain' ? (
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
