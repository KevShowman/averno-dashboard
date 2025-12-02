import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { weeklyDeliveryApi } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { 
  Calendar, 
  Package, 
  DollarSign, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  X, 
  UserPlus, 
  RefreshCw,
  Archive,
  PackageCheck,
  PackageX,
  Hourglass
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '../stores/auth'
import { hasRole, getDisplayName, formatCurrency } from '../lib/utils'
import WeeklyDeliveryPayModal from '../components/WeeklyDeliveryPayModal'
import CreateExclusionModal from '../components/CreateExclusionModal'

interface WeeklyDelivery {
  id: string
  userId: string
  weekStart: string
  weekEnd: string
  packages: number
  paidAmount?: number
  paidMoney?: number
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE'
  confirmedAt?: string
  note?: string
  isAbgemeldet?: boolean
  abgemeldeteDays?: number
  user: {
    id: string
    username: string
    icFirstName?: string
    icLastName?: string
  }
  confirmedBy?: {
    id: string
    username: string
  }
}

interface WeeklyDeliveryExclusion {
  id: string
  userId: string
  reason: string
  startDate: string
  endDate?: string
  isActive: boolean
  user: {
    id: string
    username: string
    icFirstName?: string
    icLastName?: string
  }
  createdBy: {
    id: string
    username: string
  }
}

export default function WeeklyDeliveryPage() {
  const [showExclusions, setShowExclusions] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showCreateExclusionModal, setShowCreateExclusionModal] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<WeeklyDelivery | null>(null)
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  
  const isLeadership = hasRole(user, ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'])
  const isElPatron = hasRole(user, 'EL_PATRON')
  const canPayForOthers = hasRole(user, ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'])

  // Queries
  const { data: currentWeekDeliveries = [], isLoading: loadingCurrentWeek } = useQuery({
    queryKey: ['weekly-delivery', 'current-week'],
    queryFn: () => weeklyDeliveryApi.getCurrentWeek().then(res => res.data),
  })

  const { data: exclusions = [], isLoading: loadingExclusions } = useQuery({
    queryKey: ['weekly-delivery', 'exclusions'],
    queryFn: () => weeklyDeliveryApi.getExclusions().then(res => res.data),
  })

  const { data: archives = [], isLoading: loadingArchives } = useQuery({
    queryKey: ['weekly-delivery-archives'],
    queryFn: () => weeklyDeliveryApi.getArchives().then(res => res.data),
  })

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['weekly-delivery', 'stats'],
    queryFn: () => weeklyDeliveryApi.getStats().then(res => res.data),
  })

  // Mutations
  const payDeliveryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { paidAmount?: number; paidMoney?: number } }) =>
      weeklyDeliveryApi.payDelivery(id, data),
    onSuccess: () => {
      toast.success('Wochenabgabe wurde bezahlt')
      queryClient.invalidateQueries({ queryKey: ['weekly-delivery'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Bezahlen')
    },
  })

  const deactivateExclusionMutation = useMutation({
    mutationFn: (id: string) => weeklyDeliveryApi.deactivateExclusion(id),
    onSuccess: () => {
      toast.success('Ausschluss wurde deaktiviert')
      queryClient.invalidateQueries({ queryKey: ['weekly-delivery'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Deaktivieren')
    },
  })

  const indexUsersMutation = useMutation({
    mutationFn: () => weeklyDeliveryApi.indexAllUsers(),
    onSuccess: () => {
      toast.success('Alle User wurden indexiert')
      queryClient.invalidateQueries({ queryKey: ['weekly-delivery'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Indexieren')
    },
  })

  const autoSanctionMutation = useMutation({
    mutationFn: () => weeklyDeliveryApi.autoSanctionOverdue(),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Überfällige Abgaben wurden sanktioniert')
      queryClient.invalidateQueries({ queryKey: ['weekly-delivery'] })
      queryClient.invalidateQueries({ queryKey: ['sanctions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Sanktionieren')
    },
  })

  const weeklyResetMutation = useMutation({
    mutationFn: () => weeklyDeliveryApi.weeklyReset(),
    onSuccess: (response) => {
      const data = response.data
      toast.success(`Wochenreset durchgeführt: ${data.deletedCurrentWeek} Abgaben gelöscht, ${data.overdueCount} als überfällig markiert`)
      queryClient.invalidateQueries({ queryKey: ['weekly-delivery'] })
      queryClient.invalidateQueries({ queryKey: ['sanctions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Wochenreset')
    },
  })

  const createExclusionMutation = useMutation({
    mutationFn: (data: { userId: string; reason: string; startDate: string; endDate?: string }) =>
      weeklyDeliveryApi.createExclusion(data),
    onSuccess: () => {
      toast.success('Ausschluss wurde erstellt')
      queryClient.invalidateQueries({ queryKey: ['weekly-delivery'] })
      setShowCreateExclusionModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen des Ausschlusses')
    },
  })

  const archiveMutation = useMutation({
    mutationFn: () => weeklyDeliveryApi.archiveCurrentWeek(),
    onSuccess: (response) => {
      const data = response.data
      toast.success(`Woche archiviert: ${data.archive.totalDeliveries} Abgaben, ${data.sanctions.sanctions?.length || 0} Sanktionen erstellt`)
      queryClient.invalidateQueries({ queryKey: ['weekly-delivery'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-delivery-archives'] })
      queryClient.invalidateQueries({ queryKey: ['sanctions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Archivieren der Woche')
    },
  })

  const handleOpenPayModal = (delivery: WeeklyDelivery) => {
    setSelectedDelivery(delivery)
    setShowPayModal(true)
  }

  const handleClosePayModal = () => {
    setShowPayModal(false)
    setSelectedDelivery(null)
  }

  const handlePayDelivery = (data: { paidAmount?: number; paidMoney?: number }) => {
    if (selectedDelivery) {
      payDeliveryMutation.mutate({ id: selectedDelivery.id, data })
      handleClosePayModal()
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE')
  }

  const formatUserName = (userObj: WeeklyDelivery['user']) => {
    if (userObj.icFirstName && userObj.icLastName) {
      return `${userObj.icFirstName} ${userObj.icLastName}`
    }
    return userObj.username
  }

  if (loadingCurrentWeek || loadingStats) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-gray-400">Lade Wochenabgabe-Daten...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-cyan-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-teal-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-xl shadow-lg shadow-cyan-500/30">
              <Package className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Wochenabgabe</h1>
              <p className="text-gray-400 mt-1">
                300 Pakete pro Woche • Verwaltung und Tracking
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowExclusions(!showExclusions)}
              className="border-gray-700 hover:bg-gray-800"
            >
              <Users className="mr-2 h-4 w-4" />
              {showExclusions ? 'Abgaben' : 'Ausschlüsse'}
            </Button>
            
            {isElPatron && (
              <Button
                onClick={() => setShowCreateExclusionModal(true)}
                className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Ausschluss
              </Button>
            )}
            
            {canPayForOthers && (
              <>
                <Button
                  variant="outline"
                  onClick={() => indexUsersMutation.mutate()}
                  disabled={indexUsersMutation.isPending}
                  className="border-gray-700 hover:bg-gray-800"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => autoSanctionMutation.mutate()}
                  disabled={autoSanctionMutation.isPending}
                  className="border-gray-700 hover:bg-gray-800"
                >
                  <AlertCircle className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => weeklyResetMutation.mutate()}
                  disabled={weeklyResetMutation.isPending}
                  className="border-gray-700 hover:bg-gray-800"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                
                <Button
                  onClick={() => archiveMutation.mutate()}
                  disabled={archiveMutation.isPending}
                  className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archivieren
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-900/30 to-teal-900/20 border-cyan-500/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Package className="h-5 w-5 text-cyan-400" />
                </div>
              </div>
              <p className="text-cyan-300/70 text-sm">Gesamt</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-900/30 to-amber-900/20 border-yellow-500/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Hourglass className="h-5 w-5 text-yellow-400" />
                </div>
              </div>
              <p className="text-yellow-300/70 text-sm">Ausstehend</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-orange-900/30 to-amber-900/20 border-orange-500/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-orange-400" />
                </div>
              </div>
              <p className="text-orange-300/70 text-sm">Teilbezahlt</p>
              <p className="text-2xl font-bold text-orange-400">{stats.partiallyPaid}</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-500/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <PackageCheck className="h-5 w-5 text-green-400" />
                </div>
              </div>
              <p className="text-green-300/70 text-sm">Bezahlt</p>
              <p className="text-2xl font-bold text-green-400">{stats.paid}</p>
            </CardContent>
          </Card>

          <Card className={`relative overflow-hidden ${stats.overdue > 0 ? 'bg-gradient-to-br from-red-900/30 to-rose-900/20 border-red-500/30' : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700'}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 ${stats.overdue > 0 ? 'bg-red-500/20' : 'bg-gray-500/20'} rounded-lg`}>
                  <PackageX className={`h-5 w-5 ${stats.overdue > 0 ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
              </div>
              <p className={`${stats.overdue > 0 ? 'text-red-300/70' : 'text-gray-400'} text-sm`}>Überfällig</p>
              <p className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-400' : 'text-white'}`}>{stats.overdue}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {showExclusions ? (
        /* Exclusions Table */
        <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              Aktive Ausschlüsse
            </CardTitle>
            <CardDescription className="text-gray-400">
              Benutzer, die von der Wochenabgabe ausgeschlossen sind
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {exclusions.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">Keine aktiven Ausschlüsse</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-800/30">
                      <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Benutzer</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Grund</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Von</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Bis</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Erstellt von</th>
                      {isLeadership && (
                        <th className="text-right py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Aktionen</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {exclusions.map((exclusion: WeeklyDeliveryExclusion) => (
                      <tr key={exclusion.id} className="group hover:bg-gray-800/30 transition-colors">
                        <td className="py-4 px-6">
                          <span className="font-medium text-white">{formatUserName(exclusion.user)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-gray-300">{exclusion.reason}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-gray-400">{formatDate(exclusion.startDate)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-gray-400">{exclusion.endDate ? formatDate(exclusion.endDate) : 'Unbegrenzt'}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-gray-400">{exclusion.createdBy.username}</span>
                        </td>
                        {isLeadership && (
                          <td className="py-4 px-6 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deactivateExclusionMutation.mutate(exclusion.id)}
                              disabled={deactivateExclusionMutation.isPending}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </Button>
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
      ) : (
        /* Deliveries Table */
        <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-cyan-400" />
              Aktuelle Woche
            </CardTitle>
            <CardDescription className="text-gray-400">
              Wochenabgaben für die laufende Woche
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {currentWeekDeliveries.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">Keine Abgaben für diese Woche</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-800/30">
                      <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Benutzer</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Woche</th>
                      <th className="text-right py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Bezahlt</th>
                      <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-right py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {currentWeekDeliveries.map((delivery: WeeklyDelivery) => (
                      <tr key={delivery.id} className="group hover:bg-gray-800/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              delivery.isAbgemeldet ? 'bg-purple-500' :
                              delivery.status === 'PAID' ? 'bg-green-500' :
                              delivery.status === 'PARTIALLY_PAID' ? 'bg-orange-500' :
                              delivery.status === 'OVERDUE' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                            <span className="font-medium text-white">{formatUserName(delivery.user)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-gray-400 text-sm">
                            {formatDate(delivery.weekStart)} - {formatDate(delivery.weekEnd)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {delivery.paidAmount && delivery.paidAmount > 0 && (
                            <span className="text-cyan-400 font-medium">{delivery.paidAmount} Pakete</span>
                          )}
                          {delivery.paidMoney && delivery.paidMoney > 0 && (
                            <span className="text-green-400 font-medium">{formatCurrency(delivery.paidMoney)}</span>
                          )}
                          {(!delivery.paidAmount || delivery.paidAmount === 0) && (!delivery.paidMoney || delivery.paidMoney === 0) && (
                            delivery.status === 'PAID' && delivery.note 
                              ? <span className="text-gold-400">{delivery.note}</span>
                              : <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {delivery.isAbgemeldet ? (
                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Abgemeldet</Badge>
                          ) : delivery.status === 'PENDING' ? (
                            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Ausstehend</Badge>
                          ) : delivery.status === 'PARTIALLY_PAID' ? (
                            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">Teilbezahlt</Badge>
                          ) : delivery.status === 'PAID' ? (
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Bezahlt
                            </Badge>
                          ) : delivery.status === 'OVERDUE' ? (
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Überfällig</Badge>
                          ) : (
                            <Badge variant="outline">{delivery.status}</Badge>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {(delivery.status === 'PENDING' || delivery.status === 'PARTIALLY_PAID') && 
                           !delivery.isAbgemeldet && 
                           (canPayForOthers || delivery.userId === user?.id) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPayModal(delivery)}
                              disabled={payDeliveryMutation.isPending}
                              className="opacity-0 group-hover:opacity-100 transition-opacity border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                            >
                              {delivery.status === 'PARTIALLY_PAID' ? 'Weiter' : 'Bezahlen'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Archives */}
      {archives && archives.length > 0 && (
        <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white flex items-center gap-2">
              <Archive className="h-5 w-5 text-purple-400" />
              Archiv
            </CardTitle>
            <CardDescription className="text-gray-400">
              Vergangene Wochen mit Zusammenfassung
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {loadingArchives ? (
              <div className="text-center py-8 text-gray-400">Lade Archive...</div>
            ) : (
              <div className="space-y-4">
                {archives.map((archive: any) => (
                  <div key={archive.id} className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="font-semibold text-white text-lg">{archive.archiveName}</h3>
                        <p className="text-sm text-gray-400">
                          {formatDate(archive.weekStart)} - {formatDate(archive.weekEnd)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Archiviert von</p>
                        <p className="text-white font-medium">{getDisplayName(archive.archivedBy)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-white">{archive.totalDeliveries}</p>
                        <p className="text-xs text-gray-400">Gesamt</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-green-400">{archive.paidDeliveries}</p>
                        <p className="text-xs text-gray-400">Bezahlt</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-red-400">{archive.overdueDeliveries}</p>
                        <p className="text-xs text-gray-400">Überfällig</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-yellow-400">{archive.pendingDeliveries}</p>
                        <p className="text-xs text-gray-400">Ausstehend</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-cyan-400">{archive.paidPackages}</p>
                        <p className="text-xs text-gray-400">Pakete</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-emerald-400">{formatCurrency(archive.totalMoney)}</p>
                        <p className="text-xs text-gray-400">Geld</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <WeeklyDeliveryPayModal
        isOpen={showPayModal}
        onClose={handleClosePayModal}
        onConfirm={handlePayDelivery}
        requiredPackages={selectedDelivery?.packages || 300}
        currentPaidMoney={selectedDelivery?.paidMoney || 0}
        isLoading={payDeliveryMutation.isPending}
      />

      <CreateExclusionModal
        isOpen={showCreateExclusionModal}
        onClose={() => setShowCreateExclusionModal(false)}
        onCreate={createExclusionMutation.mutate}
        isLoading={createExclusionMutation.isPending}
      />
    </div>
  )
}
