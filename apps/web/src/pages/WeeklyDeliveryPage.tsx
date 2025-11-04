import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { weeklyDeliveryApi } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Calendar, Package, DollarSign, Users, AlertCircle, CheckCircle, Clock, X, UserPlus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '../stores/auth'
import { hasRole, formatDate, getDisplayName, formatCurrency } from '../lib/utils'
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

interface WeeklyDeliveryStats {
  total: number
  pending: number
  partiallyPaid: number
  paid: number
  confirmed: number
  overdue: number
}

export default function WeeklyDeliveryPage() {
  const [showExclusions, setShowExclusions] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showCreateExclusionModal, setShowCreateExclusionModal] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<WeeklyDelivery | null>(null)
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  
  // Check if user has leadership role
  const isLeadership = hasRole(user, ['EL_PATRON', 'DON', 'ASESOR'])
  const isElPatron = hasRole(user, 'EL_PATRON')
  const canPayForOthers = hasRole(user, ['EL_PATRON', 'DON'])

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

  // Bestätigen-Workflow entfernt - PAID ist jetzt der finale Status

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

  // Admin mutations
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
      queryClient.invalidateQueries({ queryKey: ['sanctions'] }) // Auch Sanktionen aktualisieren
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
      queryClient.invalidateQueries({ queryKey: ['sanctions'] }) // Auch Sanktionen aktualisieren
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

  // Handler für Pay Modal
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
      payDeliveryMutation.mutate({
        id: selectedDelivery.id,
        data,
      })
      handleClosePayModal()
    }
  }

  // Bestätigen-Funktion entfernt

  const getStatusBadge = (delivery: WeeklyDelivery) => {
    // Check if user is abgemeldet (>2 days)
    if (delivery.isAbgemeldet) {
      return <Badge variant="outline" className="text-red-600 border-red-600 bg-red-900/20">Abgemeldet</Badge>
    }
    
    switch (delivery.status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Ausstehend</Badge>
      case 'PARTIALLY_PAID':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Teilbezahlt</Badge>
      case 'PAID':
        return <Badge variant="outline" className="text-green-600 border-green-600">Bezahlt</Badge>
      case 'OVERDUE':
        return <Badge variant="outline" className="text-red-600 border-red-600">Überfällig</Badge>
      default:
        return <Badge variant="outline">{delivery.status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE')
  }

  const formatUserName = (user: WeeklyDelivery['user']) => {
    if (user.icFirstName && user.icLastName) {
      return `${user.icFirstName} ${user.icLastName}`
    }
    return user.username
  }

  if (loadingCurrentWeek || loadingStats) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Lade Wochenabgabe-Daten...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Wochenabgabe-System</h1>
          <p className="text-gray-400 mt-2">
            Verwaltung der wöchentlichen Paket-Abgaben (300 Stück pro Woche)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowExclusions(!showExclusions)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            {showExclusions ? 'Abgaben anzeigen' : 'Ausschlüsse anzeigen'}
          </Button>
          
          {isElPatron && (
            <Button
              variant="default"
              onClick={() => setShowCreateExclusionModal(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Ausschluss erstellen
            </Button>
          )}
          
          {canPayForOthers && (
            <>
              <Button
                variant="outline"
                onClick={() => indexUsersMutation.mutate()}
                disabled={indexUsersMutation.isPending}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Alle User indexieren
              </Button>
              
              <Button
                variant="outline"
                onClick={() => autoSanctionMutation.mutate()}
                disabled={autoSanctionMutation.isPending}
                className="flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4" />
                Sanktionieren
              </Button>
              
              <Button
                variant="outline"
                onClick={() => weeklyResetMutation.mutate()}
                disabled={weeklyResetMutation.isPending}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Wochenreset
              </Button>
              
              <Button
                variant="destructive"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
                className="flex items-center gap-2"
              >
                <Package className="h-4 w-4" />
                Woche archivieren
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="lasanta-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-sm text-gray-400">Gesamt</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="lasanta-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.pending}</div>
                  <div className="text-sm text-gray-400">Ausstehend</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lasanta-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.partiallyPaid}</div>
                  <div className="text-sm text-gray-400">Teilbezahlt</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lasanta-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.paid}</div>
                  <div className="text-sm text-gray-400">Bezahlt</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lasanta-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.overdue}</div>
                  <div className="text-sm text-gray-400">Überfällig</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showExclusions ? (
        /* Exclusions */
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Aktive Ausschlüsse
            </CardTitle>
            <CardDescription>
              Benutzer, die von der Wochenabgabe ausgeschlossen sind
            </CardDescription>
          </CardHeader>
          <CardContent>
            {exclusions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Keine aktiven Ausschlüsse
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benutzer</TableHead>
                    <TableHead>Grund</TableHead>
                    <TableHead>Von</TableHead>
                    <TableHead>Bis</TableHead>
                    <TableHead>Erstellt von</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exclusions.map((exclusion: WeeklyDeliveryExclusion) => (
                    <TableRow key={exclusion.id}>
                      <TableCell className="font-medium">
                        {formatUserName(exclusion.user)}
                      </TableCell>
                      <TableCell>{exclusion.reason}</TableCell>
                      <TableCell>{formatDate(exclusion.startDate)}</TableCell>
                      <TableCell>
                        {exclusion.endDate ? formatDate(exclusion.endDate) : 'Unbegrenzt'}
                      </TableCell>
                      <TableCell>{exclusion.createdBy.username}</TableCell>
                      <TableCell>
                        {isLeadership && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deactivateExclusionMutation.mutate(exclusion.id)}
                            disabled={deactivateExclusionMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Deliveries */
        <>
          {/* Current Week */}
          <Card className="lasanta-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Aktuelle Woche
              </CardTitle>
              <CardDescription>
                Wochenabgaben für die laufende Woche
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentWeekDeliveries.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Keine Abgaben für diese Woche
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benutzer</TableHead>
                      <TableHead>Woche</TableHead>
                      <TableHead>Pakete</TableHead>
                      <TableHead>Bezahlt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentWeekDeliveries.map((delivery: WeeklyDelivery) => (
                      <TableRow key={delivery.id}>
                        <TableCell className="font-medium">
                          {formatUserName(delivery.user)}
                        </TableCell>
                        <TableCell>
                          {formatDate(delivery.weekStart)} - {formatDate(delivery.weekEnd)}
                        </TableCell>
                        <TableCell>
                          {delivery.packages}
                          {delivery.packages !== 300 && (
                            <span className="text-xs text-gray-400 ml-1">
                              (Standard: 300)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {delivery.paidAmount && delivery.paidAmount > 0 && `${delivery.paidAmount} Pakete`}
                          {delivery.paidMoney && delivery.paidMoney > 0 && formatCurrency(delivery.paidMoney)}
                          {(!delivery.paidAmount || delivery.paidAmount === 0) && (!delivery.paidMoney || delivery.paidMoney === 0) && (
                            delivery.status === 'PAID' && delivery.note 
                              ? <span className="text-gold-400">{delivery.note}</span>
                              : '-'
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(delivery)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {(delivery.status === 'PENDING' || delivery.status === 'PARTIALLY_PAID') && 
                             !delivery.isAbgemeldet && (
                              // Nur El Patron und Don können für andere bezahlen, andere nur für sich selbst
                              (canPayForOthers || delivery.userId === user?.id) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenPayModal(delivery)}
                                  disabled={payDeliveryMutation.isPending}
                                >
                                  {delivery.status === 'PARTIALLY_PAID' ? 'Weiter bezahlen' : 'Bezahlen'}
                                </Button>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

        </>
      )}

      {/* Pay Modal */}
      {/* Archive Section */}
      {archives && archives.length > 0 && (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5" />
              Alle Wochenübergaben
            </CardTitle>
            <CardDescription className="text-gray-400">
              Archivierte Wochenabgaben mit Zusammenfassung
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingArchives ? (
              <div className="text-center py-8 text-gray-400">Lade Archive...</div>
            ) : (
            <div className="space-y-6">
              {archives.map((archive: any, index: number) => (
                <div key={archive.id}>
                  {index > 0 && (
                    <div className="border-t border-gray-700 my-6"></div>
                  )}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-white">{archive.archiveName}</h3>
                        <p className="text-sm text-gray-400">
                          {formatDate(archive.weekStart)} - {formatDate(archive.weekEnd)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Archiviert von</p>
                        <p className="text-white font-medium">
                          {getDisplayName(archive.archivedBy)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(archive.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{archive.totalDeliveries}</div>
                      <div className="text-xs text-gray-400">Gesamt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{archive.paidDeliveries}</div>
                      <div className="text-xs text-gray-400">Bezahlt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">{archive.overdueDeliveries}</div>
                      <div className="text-xs text-gray-400">Überfällig</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">{archive.pendingDeliveries}</div>
                      <div className="text-xs text-gray-400">Ausstehend</div>
                    </div>
                  </div>

                  <div className="border-t border-gray-600/30 mb-4"></div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-400">{archive.paidPackages}</div>
                        <div className="text-xs text-gray-400">Pakete bezahlt</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-400">{formatCurrency(archive.totalMoney)}</div>
                        <div className="text-xs text-gray-400">Schwarzgeld gesamt</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <WeeklyDeliveryPayModal
        isOpen={showPayModal}
        onClose={handleClosePayModal}
        onConfirm={handlePayDelivery}
        requiredPackages={selectedDelivery?.packages || 300}
        currentPaidMoney={selectedDelivery?.paidMoney || 0}
        isLoading={payDeliveryMutation.isPending}
      />

      {/* Create Exclusion Modal */}
      <CreateExclusionModal
        isOpen={showCreateExclusionModal}
        onClose={() => setShowCreateExclusionModal(false)}
        onCreate={createExclusionMutation.mutate}
        isLoading={createExclusionMutation.isPending}
      />
    </div>
  )
}
