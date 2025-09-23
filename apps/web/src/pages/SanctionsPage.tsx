import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sanctionsApi } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Scale, AlertTriangle, CheckCircle, Clock, X, DollarSign, User, Plus, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '../stores/auth'
import CreateSanctionModal from '../components/CreateSanctionModal'
import ResetSanctionLevelsModal from '../components/ResetSanctionLevelsModal'

interface Sanction {
  id: string
  userId: string
  category: 'ABMELDUNG' | 'RESPEKTVERHALTEN' | 'FUNKCHECK' | 'REAKTIONSPFLICHT'
  level: number
  description: string
  amount?: number
  penalty?: string
  status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED'
  paidAt?: string
  expiresAt?: string
  createdAt: string
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

interface SanctionStats {
  total: number
  active: number
  paid: number
  expired: number
  byCategory: Array<{ category: string; _count: { category: number } }>
  byLevel: Array<{ level: number; _count: { level: number } }>
}

interface SanctionCategory {
  key: string
  name: string
  description: string
  penalties: Array<{
    level: number
    amount?: number
    penalty?: string
  }>
}

export default function SanctionsPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showMySanctions, setShowMySanctions] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null)
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  
  // Check if user has leadership role
  const isLeadership = user?.role === 'EL_PATRON' || user?.role === 'DON' || user?.role === 'ASESOR'
  const isElPatron = user?.role === 'EL_PATRON'

  // Queries
  const { data: sanctions = [], isLoading: loadingSanctions } = useQuery({
    queryKey: ['sanctions', 'all', selectedStatus, selectedCategory],
    queryFn: () => sanctionsApi.getSanctions({ 
      status: selectedStatus || undefined, 
      category: selectedCategory || undefined 
    }).then(res => res.data),
  })

  const { data: mySanctions = [], isLoading: loadingMySanctions } = useQuery({
    queryKey: ['sanctions', 'my'],
    queryFn: () => sanctionsApi.getMySanctions().then(res => res.data),
    enabled: showMySanctions,
  })

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['sanctions', 'stats'],
    queryFn: () => sanctionsApi.getStats().then(res => res.data),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['sanctions', 'categories'],
    queryFn: () => sanctionsApi.getCategories().then(res => res.data),
  })

  // Mutations
  const paySanctionMutation = useMutation({
    mutationFn: (id: string) => sanctionsApi.paySanction(id),
    onSuccess: () => {
      toast.success('Sanktion wurde als bezahlt markiert')
      queryClient.invalidateQueries({ queryKey: ['sanctions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Markieren als bezahlt')
    },
  })

  const removeSanctionMutation = useMutation({
    mutationFn: (id: string) => sanctionsApi.removeSanction(id),
    onSuccess: () => {
      toast.success('Sanktion wurde entfernt')
      queryClient.invalidateQueries({ queryKey: ['sanctions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Entfernen')
    },
  })

  const cleanupMutation = useMutation({
    mutationFn: () => sanctionsApi.cleanupExpired(),
    onSuccess: (data) => {
      toast.success(data.data.message)
      queryClient.invalidateQueries({ queryKey: ['sanctions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Bereinigen')
    },
  })

  const createSanctionMutation = useMutation({
    mutationFn: (data: { userId: string; category: string; level: number; description: string }) =>
      sanctionsApi.createSanction(data),
    onSuccess: () => {
      toast.success('Sanktion wurde erstellt')
      queryClient.invalidateQueries({ queryKey: ['sanctions'] })
      setShowCreateModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen der Sanktion')
    },
  })

  const resetUserLevelsMutation = useMutation({
    mutationFn: (data: { userId: string; category: string }) =>
      sanctionsApi.resetUserLevels(data),
    onSuccess: (response) => {
      toast.success(response.data.message)
      queryClient.invalidateQueries({ queryKey: ['sanctions'] })
      setShowResetModal(false)
      setSelectedUser(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Zurücksetzen der Sanktionen')
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="outline" className="text-red-600 border-red-600">Aktiv</Badge>
      case 'PAID':
        return <Badge variant="outline" className="text-green-600 border-green-600">Bezahlt</Badge>
      case 'EXPIRED':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Abgelaufen</Badge>
      case 'CANCELLED':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Storniert</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'ABMELDUNG':
        return 'Abmeldung'
      case 'RESPEKTVERHALTEN':
        return 'Respektverhalten'
      case 'FUNKCHECK':
        return 'Funkcheck'
      case 'REAKTIONSPFLICHT':
        return 'Reaktionspflicht'
      default:
        return category
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE')
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE')
  }

  const formatUserName = (user: Sanction['user']) => {
    if (user.icFirstName && user.icLastName) {
      return `${user.icFirstName} ${user.icLastName}`
    }
    return user.username
  }

  if (loadingSanctions || loadingStats) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Lade Sanktionsdaten...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">⚖️ Sanktionssystem</h1>
          <p className="text-gray-400 mt-2">
            LaFamilia se cuida, Compadres! Verwaltung von Verstößen und Strafen
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowMySanctions(!showMySanctions)}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            {showMySanctions ? 'Alle Sanktionen' : 'Meine Sanktionen'}
          </Button>
          
          {isLeadership && (
            <>
              <Button
                variant="outline"
                onClick={() => cleanupMutation.mutate()}
                disabled={cleanupMutation.isPending}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Bereinigen
              </Button>
              
              <Button
                variant="default"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Sanktion erstellen
              </Button>
              
              {isElPatron && (
                <Button
                  variant="destructive"
                  onClick={() => setShowResetModal(true)}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Level zurücksetzen
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="lasanta-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
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
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.active}</div>
                  <div className="text-sm text-gray-400">Aktiv</div>
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
                <Clock className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.expired}</div>
                  <div className="text-sm text-gray-400">Abgelaufen</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Stats */}
      {stats && stats.byCategory.length > 0 && (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle>Sanktionen nach Kategorien</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.byCategory.map((stat) => (
                <div key={stat.category} className="text-center">
                  <div className="text-2xl font-bold text-white">{stat._count.category}</div>
                  <div className="text-sm text-gray-400">{getCategoryName(stat.category)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sanctions Table */}
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle>
            {showMySanctions ? 'Meine Sanktionen' : 'Alle Sanktionen'}
          </CardTitle>
          <CardDescription>
            {!showMySanctions && (
              <div className="flex gap-2 mt-2">
                <Button
                  variant={selectedStatus === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('')}
                >
                  Alle Status
                </Button>
                <Button
                  variant={selectedStatus === 'ACTIVE' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('ACTIVE')}
                >
                  Aktiv
                </Button>
                <Button
                  variant={selectedStatus === 'PAID' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('PAID')}
                >
                  Bezahlt
                </Button>
                <Button
                  variant={selectedStatus === 'EXPIRED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('EXPIRED')}
                >
                  Abgelaufen
                </Button>
              </div>
            )}
            {!showMySanctions && (
              <div className="flex gap-2 mt-2">
                <Button
                  variant={selectedCategory === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('')}
                >
                  Alle Kategorien
                </Button>
                <Button
                  variant={selectedCategory === 'ABMELDUNG' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('ABMELDUNG')}
                >
                  Abmeldung
                </Button>
                <Button
                  variant={selectedCategory === 'RESPEKTVERHALTEN' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('RESPEKTVERHALTEN')}
                >
                  Respektverhalten
                </Button>
                <Button
                  variant={selectedCategory === 'FUNKCHECK' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('FUNKCHECK')}
                >
                  Funkcheck
                </Button>
                <Button
                  variant={selectedCategory === 'REAKTIONSPFLICHT' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('REAKTIONSPFLICHT')}
                >
                  Reaktionspflicht
                </Button>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(showMySanctions ? mySanctions : sanctions).length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Keine Sanktionen gefunden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Strafe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt von</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead>Ablauf</TableHead>
                  {!showMySanctions && isLeadership && <TableHead>Aktionen</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(showMySanctions ? mySanctions : sanctions).map((sanction: Sanction) => (
                  <TableRow key={sanction.id}>
                    <TableCell className="font-medium">
                      {formatUserName(sanction.user)}
                    </TableCell>
                    <TableCell>{getCategoryName(sanction.category)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Level {sanction.level}</Badge>
                    </TableCell>
                    <TableCell>{sanction.description}</TableCell>
                    <TableCell>
                      {sanction.amount && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {sanction.amount.toLocaleString()} €
                        </div>
                      )}
                      {sanction.penalty && (
                        <div className="text-sm text-yellow-400">{sanction.penalty}</div>
                      )}
                      {!sanction.amount && !sanction.penalty && '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(sanction.status)}</TableCell>
                    <TableCell>{sanction.createdBy.username}</TableCell>
                    <TableCell>{formatDateTime(sanction.createdAt)}</TableCell>
                    <TableCell>
                      {sanction.expiresAt ? formatDate(sanction.expiresAt) : '-'}
                    </TableCell>
                    {!showMySanctions && isLeadership && (
                      <TableCell>
                        <div className="flex gap-2">
                          {sanction.status === 'ACTIVE' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => paySanctionMutation.mutate(sanction.id)}
                                disabled={paySanctionMutation.isPending}
                              >
                                Bezahlt
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeSanctionMutation.mutate(sanction.id)}
                                disabled={removeSanctionMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sanction Categories Info */}
      {categoriesData && (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle>Sanktionskategorien</CardTitle>
            <CardDescription>
              Übersicht über die verschiedenen Sanktionskategorien und deren Strafen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoriesData.categories.map((category: SanctionCategory) => (
                <div key={category.key} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">{category.name}</h4>
                  <p className="text-gray-400 text-sm mb-3">{category.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {category.penalties.map((penalty) => (
                      <div key={penalty.level} className="text-center p-2 bg-gray-800 rounded">
                        <div className="text-sm font-medium text-white">Level {penalty.level}</div>
                        <div className="text-xs text-gray-400">
                          {penalty.amount && penalty.penalty 
                            ? `${penalty.amount.toLocaleString()} € / ${penalty.penalty}`
                            : penalty.amount && `${penalty.amount.toLocaleString()} €`
                          }
                          {penalty.penalty && !penalty.amount && penalty.penalty}
                          {!penalty.amount && !penalty.penalty && 'Verwarnung'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Sanction Modal */}
      <CreateSanctionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createSanctionMutation.mutate}
        isLoading={createSanctionMutation.isPending}
      />

      {/* Reset Sanction Levels Modal */}
      <ResetSanctionLevelsModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onReset={resetUserLevelsMutation.mutate}
        userId={selectedUser?.id}
        userName={selectedUser?.name}
        isLoading={resetUserLevelsMutation.isPending}
      />
    </div>
  )
}
