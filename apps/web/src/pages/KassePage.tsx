import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Plus, Minus } from 'lucide-react'
import { formatCurrency, formatDate, getTransactionStatusColor, getDisplayName } from '../lib/utils'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
)
import MoneyTransactionModal from '../components/MoneyTransactionModal'
import { toast } from 'sonner'

export default function KassePage() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [selectedRange, setSelectedRange] = useState('week')
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

  const { data: chartData, error: chartError, isLoading: chartLoading } = useQuery({
    queryKey: ['cash-chart', selectedRange],
    queryFn: () => api.get(`/cash/chart?range=${selectedRange}`).then(res => res.data),
    retry: 1,
  })

  const canApprove = hasRole(user, 'EL_PATRON')

  const approveTransactionMutation = useMutation({
    mutationFn: (transactionId: string) => api.post(`/cash/transactions/${transactionId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['cash-summary'] })
      queryClient.invalidateQueries({ queryKey: ['cash-chart'] })
      toast.success('Transaktion genehmigt!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Genehmigen')
    },
  })

  const rejectTransactionMutation = useMutation({
    mutationFn: ({ transactionId, reason }: { transactionId: string; reason: string }) => 
      api.post(`/cash/transactions/${transactionId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['cash-summary'] })
      toast.success('Transaktion abgelehnt!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Ablehnen')
    },
  })

  const handleApprove = (transactionId: string) => {
    approveTransactionMutation.mutate(transactionId)
  }

  const handleReject = (transactionId: string) => {
    const reason = prompt('Begründung für die Ablehnung:')
    if (reason && reason.trim()) {
      rejectTransactionMutation.mutate({ transactionId, reason: reason.trim() })
    }
  }

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
          {hasRole(user, ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA']) && (
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
              </Button>
            </>
          )}
          {hasRole(user, ['EL_CUSTODIO', 'EL_MENTOR', 'EL_ENCARGADO', 'EL_TENIENTE', 'SOLDADO', 'EL_PREFECTO', 'EL_CONFIDENTE', 'EL_PROTECTOR', 'EL_NOVATO', 'FUTURO']) && (
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Saldo-Verlauf</CardTitle>
              <CardDescription className="text-gray-400">
                Entwicklung des Schwarzgeld-Saldos über Zeit
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedRange === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRange('today')}
                className={selectedRange === 'today' ? 'bg-gold-600 hover:bg-gold-700' : ''}
              >
                Heute
              </Button>
              <Button
                variant={selectedRange === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRange('week')}
                className={selectedRange === 'week' ? 'bg-gold-600 hover:bg-gold-700' : ''}
              >
                7 Tage
              </Button>
              <Button
                variant={selectedRange === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRange('all')}
                className={selectedRange === 'all' ? 'bg-gold-600 hover:bg-gold-700' : ''}
              >
                Gesamt
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <div className="h-80 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p>Lade Chart-Daten...</p>
              </div>
            </div>
          ) : chartError ? (
            <div className="h-80 flex items-center justify-center text-red-400">
              <div className="text-center">
                <p>Fehler beim Laden der Daten</p>
                <p className="text-sm text-gray-400 mt-2">
                  {chartError instanceof Error ? chartError.message : 'Unbekannter Fehler'}
                </p>
              </div>
            </div>
          ) : chartData && chartData.length > 0 ? (
            <div className="h-80">
              <Line
                data={{
                  labels: chartData.map(item => {
                    if (selectedRange === 'today') {
                      return new Date(item.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                    } else if (selectedRange === 'all') {
                      return new Date(item.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
                    }
                    return new Date(item.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
                  }),
                  datasets: [
                    {
                      label: 'Saldo',
                      data: chartData.map(item => item.balance),
                      borderColor: 'rgb(212, 175, 55)', // Lasanta gold
                      backgroundColor: 'rgba(212, 175, 55, 0.1)',
                      borderWidth: 3,
                      fill: true,
                      tension: 0.4,
                      pointBackgroundColor: 'rgb(212, 175, 55)',
                      pointBorderColor: 'rgb(255, 215, 0)', // Helles gold
                      pointBorderWidth: 2,
                      pointRadius: 5,
                      pointHoverRadius: 7,
                      pointHoverBorderWidth: 3,
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      backgroundColor: 'rgb(31, 41, 55)',
                      titleColor: 'rgb(249, 250, 251)',
                      bodyColor: 'rgb(249, 250, 251)',
                      borderColor: 'rgb(212, 175, 55)',
                      borderWidth: 2,
                      cornerRadius: 12,
                      displayColors: false,
                      titleFont: {
                        size: 14,
                        weight: 'bold'
                      },
                      bodyFont: {
                        size: 13
                      },
                      callbacks: {
                        title: (context) => {
                          const dataIndex = context[0].dataIndex;
                          return new Date(chartData[dataIndex].date).toLocaleDateString('de-DE');
                        },
                        label: (context) => {
                          const value = context.parsed.y;
                          return `Saldo: ${formatCurrency(value ?? 0)}`;
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        color: 'rgba(212, 175, 55, 0.2)',
                      },
                      ticks: {
                        color: 'rgb(156, 163, 175)',
                        font: {
                          size: 12,
                          weight: 'normal'
                        }
                      }
                    },
                    y: {
                      grid: {
                        color: 'rgba(212, 175, 55, 0.2)',
                      },
                      ticks: {
                        color: 'rgb(156, 163, 175)',
                        font: {
                          size: 12,
                          weight: 'normal'
                        },
                        callback: function(value) {
                          return formatCurrency(value as number);
                        }
                      }
                    }
                  },
                  elements: {
                    point: {
                      hoverBorderWidth: 3
                    }
                  },
                  interaction: {
                    intersect: false,
                    mode: 'index'
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p>Keine Daten verfügbar</p>
                <p className="text-sm mt-2">
                  Erstelle Transaktionen um den Saldo-Verlauf zu sehen
                </p>
              </div>
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
                        {tx.status === 'PENDING' && canApprove && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-400 border-green-400 hover:bg-green-400/10"
                              onClick={() => handleApprove(tx.id)}
                              disabled={approveTransactionMutation.isPending}
                              title="Genehmigen"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-400 border-red-400 hover:bg-red-400/10"
                              onClick={() => handleReject(tx.id)}
                              disabled={rejectTransactionMutation.isPending}
                              title="Ablehnen"
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {tx.status === 'PENDING' && !canApprove && (
                          <Badge className="text-yellow-400 bg-yellow-400/10">
                            <Clock className="mr-1 h-3 w-3" />
                            Ausstehend
                          </Badge>
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
