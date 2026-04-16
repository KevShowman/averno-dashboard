import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sanctionsApi } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { 
  Scale, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  X, 
  DollarSign, 
  User, 
  Plus, 
  RotateCcw,
  Gavel,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '../stores/auth'
import { hasRole } from '../lib/utils'
import CreateSanctionModal from '../components/CreateSanctionModal'
import ResetSanctionLevelsModal from '../components/ResetSanctionLevelsModal'

// Funktion für human-readable Kategorie-Namen
function getCategoryDisplayName(category: string): string {
  const categoryMap: Record<string, string> = {
    'ABMELDUNG': 'Abmeldung',
    'RESPEKTVERHALTEN': 'Respektverhalten',
    'FUNKCHECK': 'Funkcheck',
    'REAKTIONSPFLICHT': 'Reaktionspflicht',
    'NICHT_BEZAHLT': 'Wochenabgabe nicht bezahlt',
    'NICHT_BEZAHLT_48H': 'Sanktion nicht bezahlt (48h)',
    'RESPEKTLOS_ZIVILISTEN': 'Respektlos gegenüber Zivilisten',
    'RESPEKTLOS_FAMILIE': 'Respektlos gegenüber Familie',
    'TOETUNG_FAMILIENMITGLIEDER': 'Tötung von Familienmitgliedern',
    'SEXUELLE_BELAESTIGUNG': 'Sexuelle Belästigung',
    'UNNOETIGES_BOXEN_SCHIESSEN': 'Unnötiges Boxen/Schießen',
    'MISSACHTUNG_ANWEISUNGEN': 'Missachtung von Anweisungen',
    'FEHLEN_AUFSTELLUNG': 'Fehlen bei Aufstellung',
    'NICHT_ANMELDEN_FUNKCHECK': 'Nicht beim Funkcheck angemeldet',
    'KLEIDERORDNUNG': 'Kleiderordnung nicht eingehalten',
    'MUNITIONSVERSCHWENDUNG': 'Munitionsverschwendung',
    'CASA_OHNE_ANKUENDIGUNG': 'Casa ohne Ankündigung betreten',
    'FUNKPFLICHT_MISSACHTUNG': 'Funkpflicht missachtet',
    'FUNKDISZIPLIN_MISSACHTUNG': 'Funkdisziplin missachtet',
    'WOCHENABGABE_NICHT_ENTRICHTET': 'Wochenabgabe nicht entrichtet',
  }
  return categoryMap[category] || category
}

interface Sanction {
  id: string
  userId: string
  category: string
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
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  
  const isLeadership = hasRole(user, ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'])
  const isElPatron = hasRole(user, 'EL_PATRON')

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
    mutationFn: (data: { userId: string; category: string; description: string }) =>
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
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Zurücksetzen der Sanktionen')
    },
  })

  const autoSanction48hMutation = useMutation({
    mutationFn: () => sanctionsApi.autoSanction48h(),
    onSuccess: (response) => {
      toast.success(`48h-Sanktionierung abgeschlossen: ${response.data.processed} Sanktionen verarbeitet`)
      queryClient.invalidateQueries({ queryKey: ['sanctions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler bei der 48h-Sanktionierung')
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Aktiv</Badge>
      case 'PAID':
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Bezahlt</Badge>
      case 'EXPIRED':
        return <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">Abgelaufen</Badge>
      case 'CANCELLED':
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Storniert</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('de-DE')
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('de-DE')
  const formatUserName = (user: Sanction['user']) => 
    user.icFirstName && user.icLastName ? `${user.icFirstName} ${user.icLastName}` : user.username

  if (loadingSanctions || loadingStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          <p className="text-gray-400">Lade Sanktionsdaten...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-red-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-rose-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-red-600 to-rose-600 rounded-xl shadow-lg shadow-red-500/30">
              <Gavel className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Sanktionssystem</h1>
              <p className="text-gray-400 mt-1">
                LaFamilia se cuida, Compadres!
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMySanctions(!showMySanctions)}
              className="border-gray-700 hover:bg-gray-800"
            >
              <User className="h-4 w-4 mr-2" />
              {showMySanctions ? 'Alle Sanktionen' : 'Meine Sanktionen'}
            </Button>
            
            {isLeadership && (
              <>
                <Button
                  variant="outline"
                  onClick={() => cleanupMutation.mutate()}
                  disabled={cleanupMutation.isPending}
                  className="border-gray-700 hover:bg-gray-800"
                >
                  <X className="h-4 w-4 mr-2" />
                  Bereinigen
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => autoSanction48hMutation.mutate()}
                  disabled={autoSanction48hMutation.isPending}
                  className="border-gray-700 hover:bg-gray-800"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  48h Sanktionierung
                </Button>
                
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Sanktion erstellen
                </Button>
                
                {isElPatron && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowResetModal(true)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Level zurücksetzen
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-gray-700">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-500/20 rounded-lg">
                  <Scale className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <p className="text-gray-400 text-sm">Gesamt</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden bg-gradient-to-br from-red-900/30 to-rose-900/20 border-red-500/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
              </div>
              <p className="text-red-300/70 text-sm">Aktiv</p>
              <p className="text-2xl font-bold text-white">{stats.active}</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-500/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
              </div>
              <p className="text-green-300/70 text-sm">Bezahlt</p>
              <p className="text-2xl font-bold text-white">{stats.paid}</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-gray-900/30 to-gray-800/20 border-gray-500/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-500/20 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <p className="text-gray-400 text-sm">Abgelaufen</p>
              <p className="text-2xl font-bold text-white">{stats.expired}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Stats */}
      {stats && stats.byCategory.length > 0 && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-400" />
              Sanktionen nach Kategorien
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.byCategory.map((stat) => (
                <div key={stat.category} className="text-center p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-white">{stat._count.category}</div>
                  <div className="text-sm text-gray-400">{getCategoryDisplayName(stat.category)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      {!showMySanctions && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="text-gray-400 text-sm self-center mr-2">Status:</span>
                {['', 'ACTIVE', 'PAID', 'EXPIRED'].map((status) => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus(status)}
                    className={selectedStatus === status 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'border-gray-700 hover:bg-gray-800'}
                  >
                    {status === '' ? 'Alle' : status === 'ACTIVE' ? 'Aktiv' : status === 'PAID' ? 'Bezahlt' : 'Abgelaufen'}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-gray-400 text-sm self-center mr-2">Kategorie:</span>
                {['', 'ABMELDUNG', 'RESPEKTVERHALTEN', 'FUNKCHECK', 'REAKTIONSPFLICHT'].map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className={selectedCategory === cat 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'border-gray-700 hover:bg-gray-800'}
                  >
                    {cat === '' ? 'Alle' : getCategoryDisplayName(cat)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sanctions Table */}
      <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white">
            {showMySanctions ? 'Meine Sanktionen' : 'Alle Sanktionen'}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {(showMySanctions ? mySanctions : sanctions).length} Einträge
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {(showMySanctions ? mySanctions : sanctions).length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500/50 mb-4" />
              <p className="text-gray-400 text-lg">Keine Sanktionen gefunden</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-800/30">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Benutzer</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Kategorie</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Level</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Beschreibung</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Strafe</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Erstellt</th>
                    {!showMySanctions && isLeadership && (
                      <th className="text-right py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Aktionen</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {(showMySanctions ? mySanctions : sanctions).map((sanction: Sanction) => (
                    <tr key={sanction.id} className="group hover:bg-red-950/20 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-medium text-white">{formatUserName(sanction.user)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-300">{getCategoryDisplayName(sanction.category)}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge variant="outline" className="border-red-500/30 text-red-400">
                          Level {sanction.level}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 max-w-xs">
                        <span className="text-gray-400 text-sm truncate block">{sanction.description}</span>
                      </td>
                      <td className="py-4 px-4">
                        {sanction.amount && (
                          <div className="flex items-center gap-1 text-amber-400">
                            <DollarSign className="h-4 w-4" />
                            {sanction.amount.toLocaleString('de-DE')}
                          </div>
                        )}
                        {sanction.penalty && (
                          <div className="text-sm text-yellow-400">{sanction.penalty}</div>
                        )}
                        {!sanction.amount && !sanction.penalty && <span className="text-gray-500">-</span>}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {getStatusBadge(sanction.status)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-400">{formatDateTime(sanction.createdAt)}</div>
                        <div className="text-xs text-gray-500">von {sanction.createdBy.username}</div>
                      </td>
                      {!showMySanctions && isLeadership && (
                        <td className="py-4 px-6">
                          {sanction.status === 'ACTIVE' && (
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                onClick={() => paySanctionMutation.mutate(sanction.id)}
                                disabled={paySanctionMutation.isPending}
                              >
                                Bezahlt
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => removeSanctionMutation.mutate(sanction.id)}
                                disabled={removeSanctionMutation.isPending}
                              >
                                <X className="h-4 w-4" />
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

      {/* Sanction Categories Info */}
      {categoriesData && (
        <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white">Sanktionskategorien</CardTitle>
            <CardDescription className="text-gray-400">
              Übersicht über die verschiedenen Sanktionskategorien und deren Strafen
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-2">
              {categoriesData.categories.map((category: SanctionCategory) => (
                <div key={category.key} className="border border-gray-700 rounded-xl p-4 bg-gray-800/30">
                  <h4 className="font-semibold text-white mb-2">{category.name}</h4>
                  <p className="text-gray-400 text-sm mb-3">{category.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {category.penalties.map((penalty) => (
                      <div key={penalty.level} className="text-center px-3 py-2 bg-gray-800 rounded-lg">
                        <div className="text-xs font-medium text-red-400">Level {penalty.level}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {penalty.amount ? `${penalty.amount.toLocaleString('de-DE')} SG` : 
                           penalty.penalty || 'Verwarnung'}
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

      {/* Modals */}
      <CreateSanctionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createSanctionMutation.mutate}
        isLoading={createSanctionMutation.isPending}
      />

      <ResetSanctionLevelsModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onReset={resetUserLevelsMutation.mutate}
        isLoading={resetUserLevelsMutation.isPending}
      />
    </div>
  )
}
