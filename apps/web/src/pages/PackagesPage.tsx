import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, packagesApi } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Textarea } from '../components/ui/textarea'
import { 
  Package, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  Archive,
  Settings,
  AlertTriangle,
  User,
  Trash2,
  Eye
} from 'lucide-react'
import { formatDate, formatCurrency, getDisplayName } from '../lib/utils'
import { toast } from 'sonner'
import WeeklyDeliveryPaymentModal from '../components/WeeklyDeliveryPaymentModal'

export default function PackagesPage() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [depositPackages, setDepositPackages] = useState('')
  const [depositNote, setDepositNote] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [showArchiveDetails, setShowArchiveDetails] = useState(false)
  const [selectedArchive, setSelectedArchive] = useState<any>(null)
  const [showWeeklyDeliveryModal, setShowWeeklyDeliveryModal] = useState(false)
  const [pendingWeeklyDelivery, setPendingWeeklyDelivery] = useState<any>(null)

  const { data: pendingDeposits, isLoading: pendingLoading } = useQuery({
    queryKey: ['packages-pending-deposits'],
    queryFn: () => packagesApi.getPendingDeposits().then(res => res.data),
  })

  const { data: confirmedDeposits, isLoading: confirmedLoading } = useQuery({
    queryKey: ['packages-confirmed-deposits'],
    queryFn: () => packagesApi.getConfirmedDeposits().then(res => res.data),
  })

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['packages-summary'],
    queryFn: () => packagesApi.getSummary().then(res => res.data),
  })

  // Prüfen ob User eine ausstehende Wochenabgabe hat
  const { data: weeklyDeliveryCheck } = useQuery({
    queryKey: ['packages-weekly-delivery-check'],
    queryFn: () => packagesApi.checkPendingWeeklyDelivery().then(res => res.data),
  })

  const { data: priceData } = useQuery({
    queryKey: ['packages-price'],
    queryFn: () => packagesApi.getPrice().then(res => res.data),
  })

  const { data: archives } = useQuery({
    queryKey: ['packages-archives'],
    queryFn: () => packagesApi.getHandovers().then(res => res.data),
  })

  const { data: archiveDetails } = useQuery({
    queryKey: ['packages-archive-details', selectedArchive?.id],
    queryFn: () => selectedArchive ? packagesApi.getHandoverDetails(selectedArchive.id).then(res => res.data) : null,
    enabled: !!selectedArchive?.id,
  })

  const confirmDepositMutation = useMutation({
    mutationFn: (depositId: string) => packagesApi.confirmDeposit(depositId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages-pending-deposits'] })
      queryClient.invalidateQueries({ queryKey: ['packages-confirmed-deposits'] })
      queryClient.invalidateQueries({ queryKey: ['packages-summary'] })
      toast.success('Deposit bestätigt!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Bestätigen')
    },
  })

  const rejectDepositMutation = useMutation({
    mutationFn: ({ depositId, reason }: { depositId: string; reason: string }) => 
      packagesApi.rejectDeposit(depositId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages-pending-deposits'] })
      queryClient.invalidateQueries({ queryKey: ['packages-confirmed-deposits'] })
      toast.success('Deposit abgelehnt!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Ablehnen')
    },
  })

  const createDepositMutation = useMutation({
    mutationFn: ({ packages, note }: { packages: number; note: string }) => 
      packagesApi.createDeposit({ packages, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages-pending-deposits'] })
      setShowDepositModal(false)
      setDepositPackages('')
      setDepositNote('')
      toast.success('Deposit-Anfrage erstellt!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen')
    },
  })

  // Mutation für Package-Deposit mit Wochenabgabe-Integration
  const createDepositWithWeeklyDeliveryMutation = useMutation({
    mutationFn: (data: { 
      packages: number; 
      note?: string; 
      useForWeeklyDelivery: boolean; 
      weeklyDeliveryId: string 
    }) => packagesApi.createDepositWithWeeklyDelivery(data),
    onSuccess: () => {
      toast.success('Paket-Deposit mit Wochenabgabe-Integration erstellt')
      queryClient.invalidateQueries({ queryKey: ['packages-pending-deposits'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-delivery'] })
      setShowDepositModal(false)
      setShowWeeklyDeliveryModal(false)
      setDepositPackages('')
      setDepositNote('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen des Deposits')
    },
  })

  const updatePriceMutation = useMutation({
    mutationFn: (price: number) => packagesApi.setPrice(price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages-price'] })
      queryClient.invalidateQueries({ queryKey: ['packages-summary'] })
      setShowPriceModal(false)
      setNewPrice('')
      toast.success('Preis aktualisiert!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren')
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (name: string) => packagesApi.archiveHandover(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages-confirmed-deposits'] })
      queryClient.invalidateQueries({ queryKey: ['packages-summary'] })
      queryClient.invalidateQueries({ queryKey: ['packages-archives'] })
      toast.success('Aktuelle Deposits archiviert!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Archivieren')
    },
  })

  const removeDepositMutation = useMutation({
    mutationFn: ({ depositId, reason }: { depositId: string; reason: string }) => 
      packagesApi.deleteDeposit(depositId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages-pending-deposits'] })
      queryClient.invalidateQueries({ queryKey: ['packages-confirmed-deposits'] })
      queryClient.invalidateQueries({ queryKey: ['packages-summary'] })
      toast.success('Deposit wurde entfernt!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Entfernen')
    },
  })

  const canConfirm = user?.role === 'EL_PATRON' || user?.role === 'DON' || 
                    user?.role === 'ASESOR'
  const canManage = user?.role === 'EL_PATRON' || user?.role === 'DON'
  const canManagePrice = user?.role === 'EL_PATRON' || user?.role === 'DON' || 
                        user?.role === 'ASESOR' || user?.role === 'ROUTENVERWALTUNG'
  const canRemove = user?.role === 'EL_PATRON' || user?.role === 'DON' ||
                   user?.role === 'ROUTENVERWALTUNG'

  const handleCreateDeposit = () => {
    const packages = parseInt(depositPackages)
    if (packages <= 0) {
      toast.error('Anzahl der Pakete muss größer als 0 sein')
      return
    }

    // Prüfen ob User eine ausstehende Wochenabgabe hat
    if (weeklyDeliveryCheck) {
      setPendingWeeklyDelivery(weeklyDeliveryCheck)
      setShowWeeklyDeliveryModal(true)
    } else {
      createDepositMutation.mutate({ packages, note: depositNote })
    }
  }

  const handleWeeklyDeliveryConfirm = (useForWeeklyDelivery: boolean, weeklyDeliveryId: string) => {
    const packages = parseInt(depositPackages)
    
    if (useForWeeklyDelivery) {
      createDepositWithWeeklyDeliveryMutation.mutate({
        packages,
        note: depositNote,
        useForWeeklyDelivery: true,
        weeklyDeliveryId
      })
    } else {
      createDepositMutation.mutate({ packages, note: depositNote })
    }
  }

  const handleUpdatePrice = () => {
    const price = parseInt(newPrice)
    if (price <= 0) {
      toast.error('Preis muss größer als 0 sein')
      return
    }
    updatePriceMutation.mutate(price)
  }

  const handleArchive = () => {
    const archiveName = prompt('Name für die Übergabe eingeben:', `Übergabe ${new Date().toLocaleDateString('de-DE')}`)
    if (archiveName) {
      archiveMutation.mutate(archiveName)
    }
  }

  const handleRemoveDeposit = (depositId: string) => {
    const reason = prompt('Begründung für das Entfernen eingeben:')
    if (reason && reason.trim()) {
      removeDepositMutation.mutate({ depositId, reason: reason.trim() })
    }
  }

  const handleViewArchive = (archive: any) => {
    setSelectedArchive(archive)
    setShowArchiveDetails(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Package className="mr-3 h-8 w-8 text-accent" />
            Paket-Deposits
          </h1>
          <p className="text-gray-400 mt-2">
            Verwalte Paket-Deposit-Anfragen und Übergaben
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowDepositModal(true)}
            variant="outline"
            className="text-green-400 border-green-400 hover:bg-green-400/10"
          >
            <Plus className="mr-2 h-4 w-4" />
            Deposit anfragen
          </Button>
          {canManagePrice && (
            <Button
              onClick={() => setShowPriceModal(true)}
              variant="outline"
              className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
            >
              <Settings className="mr-2 h-4 w-4" />
              Preis ändern
            </Button>
          )}
          {canManage && (
            <>
              <Button
                onClick={handleArchive}
                variant="outline"
                className="text-yellow-400 border-yellow-400 hover:bg-yellow-400/10"
                disabled={!summary?.totalPackages || summary.totalPackages === 0}
              >
                <Archive className="mr-2 h-4 w-4" />
                Übergabe archivieren
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Bestätigte Pakete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {summary?.totalPackages || 0}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {summary?.totalWeeklyDeliveryPackages || 0} Wochenabgabe, {summary?.totalPayoutPackages || 0} Auszahlung
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Wochenabgabe: {formatCurrency((summary?.totalWeeklyDeliveryPackages || 0) * (summary?.packagePrice || 1000))}, 
              Auszahlung: {formatCurrency((summary?.totalPayoutPackages || 0) * (summary?.packagePrice || 1000))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Wochenabgabe Gesamt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {formatCurrency((summary?.totalWeeklyDeliveryPackages || 0) * (summary?.packagePrice || 1000))}
            </div>
            <div className="text-sm text-gray-400">
              {summary?.totalWeeklyDeliveryPackages || 0} Pakete
            </div>
          </CardContent>
        </Card>
        
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Auszahlung Gesamt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-300">
              {formatCurrency((summary?.totalPayoutPackages || 0) * (summary?.kokainPrice || 1000))}
            </div>
            <div className="text-sm text-gray-400">
              {summary?.totalPayoutPackages || 0} Pakete
            </div>
          </CardContent>
        </Card>
        
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Gesamtwert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(summary?.totalValue || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Preis pro Paket</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {formatCurrency(priceData?.price || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Deposits Summary */}
      {summary?.userDeposits && summary.userDeposits.length > 0 && (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white">Aktuelle Deposits</CardTitle>
            <CardDescription className="text-gray-400">
              Übersicht aller bestätigten Paket-Deposits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Benutzer</TableHead>
                    <TableHead className="text-gray-400">Gesamt Pakete</TableHead>
                    <TableHead className="text-gray-400">Wochenabgabe</TableHead>
                    <TableHead className="text-gray-400">Auszahlung</TableHead>
                    <TableHead className="text-gray-400">Wert</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.userDeposits.map((item: any, index: number) => (
                    <TableRow key={index} className="hover:bg-gray-800/50">
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {item.user.avatarUrl ? (
                            <img 
                              src={item.user.avatarUrl} 
                              alt={getDisplayName(item.user)}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <User className="w-6 h-6 text-gray-400" />
                          )}
                          <span className="text-white">{getDisplayName(item.user)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {item.packages}
                      </TableCell>
                      <TableCell className="text-blue-400 font-medium">
                        {item.weeklyDeliveryPackages || 0}
                        {(item.weeklyDeliveryPackages || 0) > 0 && (
                          <div className="text-xs text-blue-300">
                            {formatCurrency((item.weeklyDeliveryPackages || 0) * (summary?.kokainPrice || 1000))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300 font-medium">
                        {item.payoutPackages || 0}
                        {(item.payoutPackages || 0) > 0 && (
                          <div className="text-xs text-gray-400">
                            {formatCurrency((item.payoutPackages || 0) * (summary?.kokainPrice || 1000))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-green-400 font-medium">
                        {formatCurrency(item.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Deposits */}
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Clock className="mr-2 h-5 w-5 text-yellow-400" />
            Ausstehende Deposits
          </CardTitle>
          <CardDescription className="text-gray-400">
            {pendingDeposits?.length || 0} Anfragen warten auf Bestätigung
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Benutzer</TableHead>
                    <TableHead className="text-gray-400">Pakete</TableHead>
                    <TableHead className="text-gray-400">Wochenabgabe</TableHead>
                    <TableHead className="text-gray-400">Notiz</TableHead>
                    <TableHead className="text-gray-400">Datum</TableHead>
                    {canConfirm && (
                      <TableHead className="text-gray-400">Aktionen</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingDeposits?.map((deposit: any) => (
                    <TableRow key={deposit.id} className="hover:bg-gray-800/50">
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {deposit.user.avatarUrl ? (
                            <img 
                              src={deposit.user.avatarUrl} 
                              alt={getDisplayName(deposit.user)}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <User className="w-6 h-6 text-gray-400" />
                          )}
                          <span className="text-white">{getDisplayName(deposit.user)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {deposit.packages}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {deposit.weeklyDeliveryId ? (
                          <div className="flex flex-col gap-1 w-fit">
                            <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs w-fit">
                              Wochenabgabe
                            </Badge>
                            {(deposit.weeklyDeliveryPackages || 0) > 0 && (
                              <div className="text-xs text-gray-400">
                                {deposit.weeklyDeliveryPackages} Pakete
                              </div>
                            )}
                            {deposit.payoutPackages && deposit.payoutPackages > 0 && (
                              <div className="text-xs text-green-400">
                                +{deposit.payoutPackages} Auszahlung
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-gray-600 border-gray-600 text-xs w-fit">
                            Normale Auszahlung
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300 max-w-xs truncate">
                        {deposit.note || '-'}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatDate(deposit.createdAt)}
                      </TableCell>
                      {canConfirm && (
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-400 border-green-400 hover:bg-green-400/10"
                              onClick={() => confirmDepositMutation.mutate(deposit.id)}
                              disabled={confirmDepositMutation.isPending}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-400 border-red-400 hover:bg-red-400/10"
                              onClick={() => {
                                const reason = prompt('Grund für Ablehnung:')
                                if (reason) {
                                  rejectDepositMutation.mutate({ depositId: deposit.id, reason })
                                }
                              }}
                              disabled={rejectDepositMutation.isPending}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                            {canRemove && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-orange-400 border-orange-400 hover:bg-orange-400/10"
                                onClick={() => handleRemoveDeposit(deposit.id)}
                                disabled={removeDepositMutation.isPending}
                                title="Deposit entfernen"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {(!pendingDeposits || pendingDeposits.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  Keine ausstehenden Deposits
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmed Deposits */}
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-400" />
            Bestätigte Deposits
          </CardTitle>
          <CardDescription className="text-gray-400">
            Übersicht aller bestätigten Kokain-Deposits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {confirmedLoading ? (
            <div className="text-center py-8 text-gray-400">
              Lade bestätigte Deposits...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Benutzer</TableHead>
                    <TableHead className="text-gray-400">Pakete</TableHead>
                    <TableHead className="text-gray-400">Notiz</TableHead>
                    <TableHead className="text-gray-400">Erstellt</TableHead>
                    <TableHead className="text-gray-400">Bestätigt von</TableHead>
                    <TableHead className="text-gray-400">Bestätigt am</TableHead>
                    {canConfirm && (
                      <TableHead className="text-gray-400">Aktionen</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {confirmedDeposits?.map((deposit: any) => (
                    <TableRow key={deposit.id} className="hover:bg-gray-800/50">
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {deposit.user.avatarUrl ? (
                            <img 
                              src={deposit.user.avatarUrl} 
                              alt={getDisplayName(deposit.user)}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <User className="w-6 h-6 text-gray-400" />
                          )}
                          <span className="text-white">{getDisplayName(deposit.user)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {deposit.packages}
                      </TableCell>
                      <TableCell className="text-gray-300 max-w-xs truncate">
                        {deposit.note || '-'}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatDate(deposit.createdAt)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {deposit.confirmedBy ? getDisplayName(deposit.confirmedBy) : '-'}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {deposit.confirmedAt ? formatDate(deposit.confirmedAt) : '-'}
                      </TableCell>
                      {canRemove && (
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-orange-400 border-orange-400 hover:bg-orange-400/10"
                            onClick={() => handleRemoveDeposit(deposit.id)}
                            disabled={removeDepositMutation.isPending}
                            title="Deposit entfernen"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {(!confirmedDeposits || confirmedDeposits.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  Keine bestätigten Deposits
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Archives */}
      {archives && archives.length > 0 && (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Archive className="mr-2 h-5 w-5 text-gray-400" />
              Archivierte Übergaben
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Name</TableHead>
                    <TableHead className="text-gray-400">Pakete</TableHead>
                    <TableHead className="text-gray-400">Wert</TableHead>
                    <TableHead className="text-gray-400">Datum</TableHead>
                    <TableHead className="text-gray-400">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archives.map((archive: any) => (
                    <TableRow key={archive.id} className="hover:bg-gray-800/50">
                      <TableCell className="text-white">{archive.name}</TableCell>
                      <TableCell className="text-white">{archive.totalPackages}</TableCell>
                      <TableCell className="text-green-400">{formatCurrency(archive.totalValue)}</TableCell>
                      <TableCell className="text-gray-300">{formatDate(archive.archivedAt)}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
                          onClick={() => handleViewArchive(archive)}
                          title="Details anzeigen"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md lasanta-card">
            <CardHeader>
              <CardTitle className="text-white">Paket-Deposit anfragen</CardTitle>
              <CardDescription className="text-gray-400">
                Gib die Anzahl der Pakete an, die du abgeben möchtest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Anzahl Pakete</label>
                <Input
                  type="number"
                  value={depositPackages}
                  onChange={(e) => setDepositPackages(e.target.value)}
                  placeholder="z.B. 10"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Notiz (optional)</label>
                <Textarea
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  placeholder="Zusätzliche Informationen..."
                  className="mt-1"
                />
              </div>
              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleCreateDeposit}
                  disabled={createDepositMutation.isPending}
                  className="flex-1 lasanta-button-primary"
                >
                  Anfrage erstellen
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Price Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md lasanta-card">
            <CardHeader>
              <CardTitle className="text-white">Paket-Preis ändern</CardTitle>
              <CardDescription className="text-gray-400">
                Aktueller Preis: {formatCurrency(priceData?.price || 0)} pro Paket
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Neuer Preis pro Paket</label>
                <Input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="z.B. 1500"
                  className="mt-1"
                />
              </div>
              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleUpdatePrice}
                  disabled={updatePriceMutation.isPending}
                  className="flex-1 lasanta-button-primary"
                >
                  Preis aktualisieren
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPriceModal(false)}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Archive Details Modal */}
      {showArchiveDetails && selectedArchive && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] lasanta-card overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center">
                    <Archive className="mr-2 h-5 w-5 text-gray-400" />
                    {selectedArchive.name}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Archiviert am {formatDate(selectedArchive.archivedAt)}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowArchiveDetails(false)
                    setSelectedArchive(null)
                  }}
                  className="text-gray-400 border-gray-400 hover:bg-gray-400/10"
                >
                  Schließen
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="lasanta-card">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-white">
                      {archiveDetails?.totalPackages || 0}
                    </div>
                    <div className="text-sm text-gray-400">Gesamt Pakete</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {archiveDetails?.totalWeeklyDeliveryPackages || 0} Wochenabgabe, {archiveDetails?.totalPayoutPackages || 0} Auszahlung
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Wochenabgabe: {formatCurrency((archiveDetails?.totalWeeklyDeliveryPackages || 0) * (archiveDetails?.kokainPrice || 1000))}, 
                      Auszahlung: {formatCurrency((archiveDetails?.totalPayoutPackages || 0) * (archiveDetails?.kokainPrice || 1000))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="lasanta-card">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-400">
                      {archiveDetails?.totalWeeklyDeliveryPackages || 0}
                    </div>
                    <div className="text-sm text-gray-400">Wochenabgabe</div>
                    <div className="text-xs text-blue-300 mt-1">
                      {formatCurrency((archiveDetails?.totalWeeklyDeliveryPackages || 0) * (archiveDetails?.kokainPrice || 1000))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="lasanta-card">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-gray-300">
                      {archiveDetails?.totalPayoutPackages || 0}
                    </div>
                    <div className="text-sm text-gray-400">Auszahlung</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatCurrency((archiveDetails?.totalPayoutPackages || 0) * (archiveDetails?.kokainPrice || 1000))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="lasanta-card">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-400">
                      {formatCurrency(archiveDetails?.totalValue || 0)}
                    </div>
                    <div className="text-sm text-gray-400">Gesamtwert</div>
                  </CardContent>
                </Card>
              </div>

              {/* User Summary */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Teilnehmer Übersicht</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-400">Benutzer</TableHead>
                        <TableHead className="text-gray-400">Gesamt Pakete</TableHead>
                        <TableHead className="text-gray-400">Wochenabgabe</TableHead>
                        <TableHead className="text-gray-400">Auszahlung</TableHead>
                        <TableHead className="text-gray-400">Wert</TableHead>
                        <TableHead className="text-gray-400">Einzelne Deposits</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archiveDetails?.userSummary?.map((userData: any) => (
                        <TableRow key={userData.user.id} className="hover:bg-gray-800/50">
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {userData.user.avatarUrl ? (
                                <img 
                                  src={userData.user.avatarUrl} 
                                  alt={getDisplayName(userData.user)}
                                  className="w-6 h-6 rounded-full"
                                />
                              ) : (
                                <User className="w-6 h-6 text-gray-400" />
                              )}
                              <span className="text-white">{getDisplayName(userData.user)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            {userData.totalPackages}
                          </TableCell>
                          <TableCell className="text-blue-400 font-medium">
                            {userData.totalWeeklyDeliveryPackages || 0}
                            {(userData.totalWeeklyDeliveryPackages || 0) > 0 && (
                              <div className="text-xs text-blue-300">
                                {formatCurrency((userData.totalWeeklyDeliveryPackages || 0) * (archiveDetails?.kokainPrice || 1000))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-300 font-medium">
                            {userData.totalPayoutPackages || 0}
                            {(userData.totalPayoutPackages || 0) > 0 && (
                              <div className="text-xs text-gray-400">
                                {formatCurrency((userData.totalPayoutPackages || 0) * (archiveDetails?.kokainPrice || 1000))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-green-400 font-medium">
                            {formatCurrency(userData.totalValue)}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {userData.deposits.length} Deposit{userData.deposits.length !== 1 ? 's' : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Individual Deposits */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Einzelne Deposits</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-400">Benutzer</TableHead>
                        <TableHead className="text-gray-400">Pakete</TableHead>
                        <TableHead className="text-gray-400">Wert</TableHead>
                        <TableHead className="text-gray-400">Notiz</TableHead>
                        <TableHead className="text-gray-400">Erstellt</TableHead>
                        <TableHead className="text-gray-400">Bestätigt von</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archiveDetails?.deposits?.map((deposit: any) => (
                        <TableRow key={deposit.id} className="hover:bg-gray-800/50">
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {deposit.user.avatarUrl ? (
                                <img 
                                  src={deposit.user.avatarUrl} 
                                  alt={getDisplayName(deposit.user)}
                                  className="w-5 h-5 rounded-full"
                                />
                              ) : (
                                <User className="w-5 h-5 text-gray-400" />
                              )}
                              <span className="text-white text-sm">{getDisplayName(deposit.user)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            {deposit.packages}
                          </TableCell>
                          <TableCell className="text-green-400 font-medium">
                            {formatCurrency(deposit.packages * archiveDetails.kokainPrice)}
                          </TableCell>
                          <TableCell className="text-gray-300 max-w-xs truncate">
                            {deposit.note || '-'}
                          </TableCell>
                          <TableCell className="text-gray-300 text-sm">
                            {formatDate(deposit.createdAt)}
                          </TableCell>
                          <TableCell className="text-gray-300 text-sm">
                            {deposit.confirmedBy ? getDisplayName(deposit.confirmedBy) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly Delivery Payment Modal */}
      {pendingWeeklyDelivery && (
        <WeeklyDeliveryPaymentModal
          isOpen={showWeeklyDeliveryModal}
          onClose={() => {
            setShowWeeklyDeliveryModal(false)
            setPendingWeeklyDelivery(null)
          }}
          onConfirm={handleWeeklyDeliveryConfirm}
          pendingDelivery={pendingWeeklyDelivery}
          depositPackages={parseInt(depositPackages) || 0}
        />
      )}
    </div>
  )
}
