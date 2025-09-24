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
import { hasRole } from '../lib/utils'
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
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CONFIRMED' | 'OVERDUE'
  confirmedAt?: string
  note?: string
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
  const [selectedStatus, setSelectedStatus] = useState<string>('')
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

  const { data: allDeliveries = [], isLoading: loadingDeliveries } = useQuery({
    queryKey: ['weekly-delivery', 'all', selectedStatus],
    queryFn: () => weeklyDeliveryApi.getDeliveries({ status: selectedStatus || undefined }).then(res => res.data),
  })

  const { data: exclusions = [], isLoading: loadingExclusions } = useQuery({
    queryKey: ['weekly-delivery', 'exclusions'],
    queryFn: () => weeklyDeliveryApi.getExclusions().then(res => res.data),
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

  const confirmDeliveryMutation = useMutation({
    mutationFn: (id: string) => weeklyDeliveryApi.confirmDelivery(id),
    onSuccess: () => {
      toast.success('Wochenabgabe wurde bestätigt')
      queryClient.invalidateQueries({ queryKey: ['weekly-delivery'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Bestätigen')
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
    onSuccess: () => {
      toast.success('Wochenreset wurde durchgeführt')
      queryClient.invalidateQueries({ queryKey: ['weekly-delivery'] })
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

  const handleConfirmDelivery = (deliveryId: string) => {
    confirmDeliveryMutation.mutate(deliveryId);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Ausstehend</Badge>
      case 'PARTIALLY_PAID':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Teilbezahlt</Badge>
      case 'PAID':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Bezahlt</Badge>
      case 'CONFIRMED':
        return <Badge variant="outline" className="text-green-600 border-green-600">Bestätigt</Badge>
      case 'OVERDUE':
        return <Badge variant="outline" className="text-red-600 border-red-600">Überfällig</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
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

  if (loadingCurrentWeek || loadingDeliveries || loadingStats) {
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
            Verwaltung der wöchentlichen Kokain-Abgaben (300 Stück pro Woche)
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
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                <DollarSign className="h-5 w-5 text-blue-500" />
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
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.confirmed}</div>
                  <div className="text-sm text-gray-400">Bestätigt</div>
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
                        <TableCell>{delivery.packages}</TableCell>
                        <TableCell>
                          {delivery.paidAmount && delivery.paidAmount > 0 && `${delivery.paidAmount} Pakete`}
                          {delivery.paidMoney && delivery.paidMoney > 0 && `${Number(delivery.paidMoney).toLocaleString('de-DE')} €`}
                          {(!delivery.paidAmount || delivery.paidAmount === 0) && (!delivery.paidMoney || delivery.paidMoney === 0) && '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {(delivery.status === 'PENDING' || delivery.status === 'PARTIALLY_PAID') && (
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
                            {delivery.status === 'PAID' && isLeadership && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => confirmDeliveryMutation.mutate(delivery.id)}
                                disabled={confirmDeliveryMutation.isPending}
                              >
                                Bestätigen
                              </Button>
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

          {/* All Deliveries */}
          <Card className="lasanta-card">
            <CardHeader>
              <CardTitle>Alle Wochenabgaben</CardTitle>
              <CardDescription>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={selectedStatus === '' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('')}
                  >
                    Alle
                  </Button>
                  <Button
                    variant={selectedStatus === 'PENDING' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('PENDING')}
                  >
                    Ausstehend
                  </Button>
                  <Button
                    variant={selectedStatus === 'PAID' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('PAID')}
                  >
                    Bezahlt
                  </Button>
                  <Button
                    variant={selectedStatus === 'CONFIRMED' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('CONFIRMED')}
                  >
                    Bestätigt
                  </Button>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allDeliveries.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Keine Abgaben gefunden
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
                        <TableHead>Bestätigt von</TableHead>
                        <TableHead>Erstellt</TableHead>
                        <TableHead>Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {allDeliveries.map((delivery: WeeklyDelivery) => (
                      <TableRow key={delivery.id}>
                        <TableCell className="font-medium">
                          {formatUserName(delivery.user)}
                        </TableCell>
                        <TableCell>
                          {formatDate(delivery.weekStart)} - {formatDate(delivery.weekEnd)}
                        </TableCell>
                        <TableCell>{delivery.packages}</TableCell>
                        <TableCell>
                          {delivery.paidAmount && delivery.paidAmount > 0 && `${delivery.paidAmount} Pakete`}
                          {delivery.paidMoney && delivery.paidMoney > 0 && `${Number(delivery.paidMoney).toLocaleString('de-DE')} €`}
                          {(!delivery.paidAmount || delivery.paidAmount === 0) && (!delivery.paidMoney || delivery.paidMoney === 0) && '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                        <TableCell>
                          {delivery.confirmedBy?.username || '-'}
                        </TableCell>
                        <TableCell>
                          {formatDate(delivery.weekStart)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {/* Pay Button - nur für El Patron/Don für alle, oder für eigene */}
                            {canPayForOthers || delivery.userId === user?.id ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePayDelivery(delivery)}
                                disabled={delivery.status === 'CONFIRMED' || delivery.status === 'OVERDUE'}
                              >
                                {delivery.status === 'PARTIALLY_PAID' ? 'Weiter bezahlen' : 'Bezahlen'}
                              </Button>
                            ) : null}
                            
                            {/* Confirm Button - nur für Leadership */}
                            {isLeadership && delivery.status === 'PAID' && (
                              <Button
                                variant="lasanta"
                                size="sm"
                                onClick={() => handleConfirmDelivery(delivery.id)}
                              >
                                Bestätigen
                              </Button>
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
