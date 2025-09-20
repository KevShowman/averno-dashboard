import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Plus, Minus } from 'lucide-react'
import { formatCurrency, formatDate, getTransactionStatusColor, getDisplayName } from '../lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import MoneyTransactionModal from '../components/MoneyTransactionModal'

export default function KassePage() {
  const user = useAuthStore((state) => state.user)
  const [selectedRange, setSelectedRange] = useState('month')
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [transactionType, setTransactionType] = useState<'EINZAHLUNG' | 'AUSZAHLUNG'>('EINZAHLUNG')

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['cash-summary', selectedRange],
    queryFn: () => api.get(`/cash/summary?range=${selectedRange}`).then(res => res.data),
  })

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['cash-transactions'],
    queryFn: () => api.get('/cash/transactions').then(res => res.data),
  })

  const { data: chartData } = useQuery({
    queryKey: ['cash-chart', selectedRange],
    queryFn: () => api.get(`/cash/chart?range=${selectedRange}`).then(res => res.data),
  })

  const getKindDisplay = (kind: string) => {
    switch (kind) {
      case 'EINZAHLUNG': return 'Einzahlung'
      case 'AUSZAHLUNG': return 'Auszahlung'
      case 'TRANSFER': return 'Transfer'
      case 'KORREKTUR': return 'Korrektur'
      default: return kind
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Genehmigt'
      case 'PENDING': return 'Ausstehend'
      case 'REJECTED': return 'Abgelehnt'
      default: return status
    }
  }

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'EINZAHLUNG': return <TrendingUp className="h-4 w-4 text-green-400" />
      case 'AUSZAHLUNG': return <TrendingDown className="h-4 w-4 text-red-400" />
      case 'TRANSFER': return <DollarSign className="h-4 w-4 text-blue-400" />
      case 'KORREKTUR': return <Clock className="h-4 w-4 text-yellow-400" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <DollarSign className="mr-3 h-8 w-8 text-accent" />
            Kassensystem
          </h1>
          <p className="text-gray-400 mt-2">
            Schwarzgeld-Verwaltung und Buchungen
          </p>
        </div>
        <div className="flex space-x-2">
          {(user?.role === 'EL_PATRON' || user?.role === 'DON' || user?.role === 'ASESOR') && (
            <>
              <Button
                onClick={() => {
                  setTransactionType('EINZAHLUNG')
                  setShowTransactionModal(true)
                }}
                variant="outline"
                className="text-green-400 border-green-400 hover:bg-green-400/10"
              >
                <Plus className="mr-2 h-4 w-4" />
                Einzahlung
                {user?.role === 'ASESOR' && <span className="ml-1 text-xs">(Genehmigung)</span>}
              </Button>
              <Button
                onClick={() => {
                  setTransactionType('AUSZAHLUNG')
                  setShowTransactionModal(true)
                }}
                variant="outline"
                className="text-red-400 border-red-400 hover:bg-red-400/10"
              >
                <Minus className="mr-2 h-4 w-4" />
                Auszahlung
                {user?.role === 'ASESOR' && <span className="ml-1 text-xs">(Genehmigung)</span>}
              </Button>
            </>
          )}
          {user?.role === 'SOLDADO' && (
            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
              Nur lesen
            </Badge>
          )}
          <div className="border-l border-gray-600 mx-2" />
          {['day', 'week', 'month'].map((range) => (
            <Button
              key={range}
              variant={selectedRange === range ? "default" : "outline"}
              onClick={() => setSelectedRange(range)}
              size="sm"
            >
              {range === 'day' ? 'Tag' : range === 'week' ? 'Woche' : 'Monat'}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Aktueller Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(summary?.currentBalance || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Heute</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (summary?.todayChange || 0) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {summary?.todayChange >= 0 ? '+' : ''}{formatCurrency(summary?.todayChange || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Diese Woche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (summary?.weekChange || 0) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {summary?.weekChange >= 0 ? '+' : ''}{formatCurrency(summary?.weekChange || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Ausstehend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">
              {summary?.pendingTransactions || 0}
            </div>
            <p className="text-xs text-gray-400">Transaktionen</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white">Saldo-Verlauf</CardTitle>
          <CardDescription className="text-gray-400">
            Entwicklung des Schwarzgeld-Saldos über Zeit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData && chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #6A1F2B',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    labelFormatter={(label) => `Datum: ${label}`}
                    formatter={(value: number) => [formatCurrency(value), 'Saldo']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#6A1F2B" 
                    strokeWidth={2}
                    dot={{ fill: '#6A1F2B', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#B08D57', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              Keine Daten verfügbar
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white">Letzte Transaktionen</CardTitle>
          <CardDescription className="text-gray-400">
            Übersicht über alle Buchungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Typ</TableHead>
                    <TableHead className="text-gray-400">Betrag</TableHead>
                    <TableHead className="text-gray-400">Kategorie</TableHead>
                    <TableHead className="text-gray-400">Notiz</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Erstellt von</TableHead>
                    <TableHead className="text-gray-400">Datum</TableHead>
                    <TableHead className="text-gray-400">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.transactions?.map((tx: any) => (
                    <TableRow key={tx.id} className="hover:bg-gray-800/50">
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getKindIcon(tx.kind)}
                          <span className="text-white">{getKindDisplay(tx.kind)}</span>
                        </div>
                      </TableCell>
                      <TableCell className={
                        tx.kind === 'EINZAHLUNG' ? 'text-green-400 font-medium' : 
                        tx.kind === 'AUSZAHLUNG' ? 'text-red-400 font-medium' : 
                        'text-white font-medium'
                      }>
                        {tx.kind === 'EINZAHLUNG' ? '+' : tx.kind === 'AUSZAHLUNG' ? '-' : ''}
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {tx.category || '-'}
                      </TableCell>
                      <TableCell className="text-gray-300 max-w-xs truncate">
                        {tx.note || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTransactionStatusColor(tx.status)}>
                          {tx.status === 'APPROVED' && <CheckCircle className="mr-1 h-3 w-3" />}
                          {tx.status === 'PENDING' && <Clock className="mr-1 h-3 w-3" />}
                          {tx.status === 'REJECTED' && <XCircle className="mr-1 h-3 w-3" />}
                          {getStatusDisplay(tx.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {getDisplayName(tx.createdBy)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatDate(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        {tx.status === 'PENDING' && (
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="text-green-400 border-green-400 hover:bg-green-400/10">
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-400 border-red-400 hover:bg-red-400/10">
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {(!transactions?.transactions || transactions.transactions.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  Keine Transaktionen gefunden
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Modal */}
      <MoneyTransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        transactionType={transactionType}
      />
    </div>
  )
}
