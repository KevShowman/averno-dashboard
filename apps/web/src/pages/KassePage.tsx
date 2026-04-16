import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Minus,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw
} from 'lucide-react'
import { formatCurrency, formatDate, getTransactionStatusColor, getDisplayName, hasRole } from '../lib/utils'
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
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [transactionType, setTransactionType] = useState<'EINZAHLUNG' | 'AUSZAHLUNG'>('EINZAHLUNG')

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['cash-summary'],
    queryFn: () => api.get('/cash/summary?range=all').then(res => res.data),
  })

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['cash-transactions'],
    queryFn: () => api.get('/cash/transactions').then(res => res.data),
  })

  const { data: chartData, error: chartError, isLoading: chartLoading } = useQuery({
    queryKey: ['cash-chart'],
    queryFn: () => api.get('/cash/chart?range=all').then(res => res.data),
    retry: 1,
  })

  const canApprove = hasRole(user, 'EL_PATRON')
  const canTransact = hasRole(user, ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'])

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

  return (
    <div className="space-y-6">
      {/* Header - Gold Theme */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-amber-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/30">
              <Wallet className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Kassensystem</h1>
              <p className="text-gray-400 mt-1">
                Schwarzgeld-Verwaltung und Buchungen
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {canTransact && (
              <>
                <Button
                  onClick={() => {
                    setTransactionType('EINZAHLUNG')
                    setShowTransactionModal(true)
                  }}
                  className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Einzahlung
                </Button>
                <Button
                  onClick={() => {
                    setTransactionType('AUSZAHLUNG')
                    setShowTransactionModal(true)
                  }}
                  className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30"
                >
                  <Minus className="mr-2 h-4 w-4" />
                  Auszahlung
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - Gold with semantic colors */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-green-500/30">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <p className="text-gray-400 text-sm">Aktueller Saldo</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(summary?.currentBalance || 0)}</p>
          </CardContent>
        </Card>
        
        <Card className={`relative overflow-hidden bg-gradient-to-br from-gray-800/80 to-gray-900/80 ${(summary?.todayChange || 0) >= 0 ? 'border-green-500/20' : 'border-red-500/30'}`}>
          <div className={`absolute top-0 right-0 w-16 h-16 ${(summary?.todayChange || 0) >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'} rounded-full blur-2xl pointer-events-none`} />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 ${(summary?.todayChange || 0) >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'} rounded-lg`}>
                {(summary?.todayChange || 0) >= 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-green-400" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-400" />
                )}
              </div>
            </div>
            <p className="text-gray-400 text-sm">Heute</p>
            <p className={`text-2xl font-bold ${(summary?.todayChange || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(summary?.todayChange || 0) >= 0 ? '+' : ''}{formatCurrency(summary?.todayChange || 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card className={`relative overflow-hidden bg-gradient-to-br from-gray-800/80 to-gray-900/80 ${(summary?.weekChange || 0) >= 0 ? 'border-amber-500/20' : 'border-red-500/30'}`}>
          <div className={`absolute top-0 right-0 w-16 h-16 ${(summary?.weekChange || 0) >= 0 ? 'bg-amber-500/10' : 'bg-red-500/10'} rounded-full blur-2xl pointer-events-none`} />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 ${(summary?.weekChange || 0) >= 0 ? 'bg-amber-500/20' : 'bg-red-500/20'} rounded-lg`}>
                <TrendingUp className={`h-5 w-5 ${(summary?.weekChange || 0) >= 0 ? 'text-amber-400' : 'text-red-400'}`} />
              </div>
            </div>
            <p className="text-gray-400 text-sm">Diese Woche</p>
            <p className={`text-2xl font-bold ${(summary?.weekChange || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(summary?.weekChange || 0) >= 0 ? '+' : ''}{formatCurrency(summary?.weekChange || 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card className={`relative overflow-hidden bg-gradient-to-br from-gray-800/80 to-gray-900/80 ${(summary?.pendingTransactions || 0) > 0 ? 'border-yellow-500/30' : 'border-amber-500/20'}`}>
          <div className={`absolute top-0 right-0 w-16 h-16 ${(summary?.pendingTransactions || 0) > 0 ? 'bg-yellow-500/10' : 'bg-amber-500/10'} rounded-full blur-2xl pointer-events-none`} />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 ${(summary?.pendingTransactions || 0) > 0 ? 'bg-yellow-500/20' : 'bg-amber-500/20'} rounded-lg`}>
                <Clock className={`h-5 w-5 ${(summary?.pendingTransactions || 0) > 0 ? 'text-yellow-400' : 'text-amber-400'}`} />
              </div>
            </div>
            <p className="text-gray-400 text-sm">Ausstehend</p>
            <p className={`text-2xl font-bold ${(summary?.pendingTransactions || 0) > 0 ? 'text-yellow-400' : 'text-amber-400'}`}>
              {summary?.pendingTransactions || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white">Saldo-Verlauf</CardTitle>
          <CardDescription className="text-gray-400">
            Komplette Entwicklung des Schwarzgeld-Saldos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {chartLoading ? (
            <div className="h-80 flex items-center justify-center text-gray-400">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
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
                  labels: chartData.map((item: any) => {
                    return new Date(item.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
                  }),
                  datasets: [
                    {
                      label: 'Saldo',
                      data: chartData.map((item: any) => item.balance),
                      borderColor: 'rgb(34, 197, 94)',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      borderWidth: 3,
                      fill: true,
                      tension: 0.4,
                      pointBackgroundColor: 'rgb(34, 197, 94)',
                      pointBorderColor: 'rgb(74, 222, 128)',
                      pointBorderWidth: 2,
                      pointRadius: 4,
                      pointHoverRadius: 6,
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgb(31, 41, 55)',
                      titleColor: 'rgb(249, 250, 251)',
                      bodyColor: 'rgb(249, 250, 251)',
                      borderColor: 'rgb(34, 197, 94)',
                      borderWidth: 2,
                      cornerRadius: 12,
                      displayColors: false,
                      callbacks: {
                        title: (context) => {
                          const dataIndex = context[0].dataIndex;
                          return new Date(chartData[dataIndex].date).toLocaleDateString('de-DE');
                        },
                        label: (context) => `Saldo: ${formatCurrency(context.parsed.y ?? 0)}`
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: { color: 'rgba(75, 85, 99, 0.3)' },
                      ticks: { color: 'rgb(156, 163, 175)' }
                    },
                    y: {
                      grid: { color: 'rgba(75, 85, 99, 0.3)' },
                      ticks: {
                        color: 'rgb(156, 163, 175)',
                        callback: (value) => formatCurrency(value as number)
                      }
                    }
                  },
                  interaction: { intersect: false, mode: 'index' }
                }}
              />
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Keine Daten verfügbar</p>
                <p className="text-sm mt-2">Erstelle Transaktionen um den Saldo-Verlauf zu sehen</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white">Letzte Transaktionen</CardTitle>
          <CardDescription className="text-gray-400">
            Übersicht über alle Buchungen
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {transactionsLoading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                <p className="text-gray-400">Lade Transaktionen...</p>
              </div>
            </div>
          ) : (!transactions?.transactions || transactions.transactions.length === 0) ? (
            <div className="py-16 text-center">
              <DollarSign className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">Keine Transaktionen gefunden</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-800/30">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Typ</th>
                    <th className="text-right py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Betrag</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Kategorie</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Notiz</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Erstellt von</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Datum</th>
                    {canApprove && (
                      <th className="text-right py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Aktionen</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {transactions?.transactions?.map((tx: any) => (
                    <tr key={tx.id} className="group hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            tx.kind === 'EINZAHLUNG' ? 'bg-green-500' : 
                            tx.kind === 'AUSZAHLUNG' ? 'bg-red-500' : 
                            tx.kind === 'KORREKTUR' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`} />
                          <div className="flex items-center gap-2">
                            {tx.kind === 'EINZAHLUNG' && <TrendingUp className="h-4 w-4 text-green-400" />}
                            {tx.kind === 'AUSZAHLUNG' && <TrendingDown className="h-4 w-4 text-red-400" />}
                            {tx.kind === 'KORREKTUR' && <RotateCcw className="h-4 w-4 text-yellow-400" />}
                            {tx.kind === 'TRANSFER' && <DollarSign className="h-4 w-4 text-blue-400" />}
                            <span className="text-white font-medium">{getKindDisplay(tx.kind)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`font-semibold text-lg ${
                          tx.kind === 'EINZAHLUNG' ? 'text-green-400' : 
                          tx.kind === 'AUSZAHLUNG' ? 'text-red-400' : 'text-white'
                        }`}>
                          {tx.kind === 'EINZAHLUNG' ? '+' : tx.kind === 'AUSZAHLUNG' ? '-' : ''}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {tx.category ? (
                          <Badge variant="outline" className="bg-gray-800/50 border-gray-700 text-gray-300 font-normal">
                            {tx.category}
                          </Badge>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 max-w-xs">
                        <span className="text-gray-300 truncate block">{tx.note || '-'}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {tx.status === 'APPROVED' && (
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Genehmigt
                          </Badge>
                        )}
                        {tx.status === 'PENDING' && (
                          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                            <Clock className="mr-1 h-3 w-3" />
                            Ausstehend
                          </Badge>
                        )}
                        {tx.status === 'REJECTED' && (
                          <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                            <XCircle className="mr-1 h-3 w-3" />
                            Abgelehnt
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-300">{getDisplayName(tx.createdBy)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-400 text-sm">{formatDate(tx.createdAt)}</span>
                      </td>
                      {canApprove && (
                        <td className="py-4 px-6">
                          {tx.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                onClick={() => handleApprove(tx.id)}
                                disabled={approveTransactionMutation.isPending}
                                title="Genehmigen"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => handleReject(tx.id)}
                                disabled={rejectTransactionMutation.isPending}
                                title="Ablehnen"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
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
