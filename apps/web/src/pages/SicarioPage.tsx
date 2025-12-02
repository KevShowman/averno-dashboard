import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sicarioApi } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { toast } from 'sonner'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  UserX,
  Plus,
  Trash2,
  AlertTriangle,
  User,
  BarChart3,
  Zap,
  Shield,
  Crosshair,
  Skull,
  Target,
  Lock,
  ChevronDown,
  ChevronUp,
  History,
  Sparkles,
  Eye,
} from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import CreateAufstellungModal from '../components/CreateAufstellungModal'

interface SicarioAufstellung {
  id: string
  date: string
  reason: string
  location?: string
  deadline: string
  createdAt: string
  createdBy: {
    id: string
    username: string
    icFirstName: string
    icLastName: string
  }
  responses: Array<{
    id: string
    status: 'COMING' | 'NOT_COMING' | 'UNSURE'
    user: {
      id: string
      username: string
      icFirstName: string
      icLastName: string
    }
  }>
  stats?: {
    total: number
    coming: number
    notComing: number
    unsure: number
    noResponse: number
  }
  sicariosWithoutResponse?: Array<{
    id: string
    username: string
    icFirstName: string
    icLastName: string
  }>
}

export default function SicarioPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedAufstellung, setSelectedAufstellung] = useState<string | null>(null)
  const [showOlderAufstellungen, setShowOlderAufstellungen] = useState(false)

  // Access Check
  const { data: accessData, isLoading: accessLoading } = useQuery({
    queryKey: ['sicario-access'],
    queryFn: sicarioApi.checkAccess,
  })

  // Alle Aufstellungen
  const { data: aufstellungen, isLoading: aufstellungenLoading } = useQuery({
    queryKey: ['sicario-aufstellungen'],
    queryFn: sicarioApi.getAllAufstellungen,
    enabled: accessData?.hasAccess,
  })

  // Meine ausstehenden
  const { data: myPending } = useQuery({
    queryKey: ['sicario-aufstellungen-my-pending'],
    queryFn: sicarioApi.getMyPendingAufstellungen,
    enabled: accessData?.hasAccess,
  })

  // Team
  const { data: team } = useQuery({
    queryKey: ['sicario-team'],
    queryFn: sicarioApi.getTeam,
    enabled: accessData?.hasAccess,
  })

  // Ausgewählte Aufstellung Details
  const { data: aufstellungDetails } = useQuery({
    queryKey: ['sicario-aufstellung-details', selectedAufstellung],
    queryFn: () => sicarioApi.getAufstellungById(selectedAufstellung!),
    enabled: !!selectedAufstellung && accessData?.hasAccess,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: sicarioApi.createAufstellung,
    onSuccess: () => {
      toast.success('Sicario-Einsatz erstellt und Team benachrichtigt')
      queryClient.invalidateQueries({ queryKey: ['sicario-aufstellungen'] })
      queryClient.invalidateQueries({ queryKey: ['sicario-aufstellungen-my-pending'] })
      setShowCreateModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen')
    },
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'COMING' | 'NOT_COMING' | 'UNSURE' }) =>
      sicarioApi.respondToAufstellung(id, status),
    onSuccess: () => {
      toast.success('Antwort gespeichert')
      queryClient.invalidateQueries({ queryKey: ['sicario-aufstellungen'] })
      queryClient.invalidateQueries({ queryKey: ['sicario-aufstellungen-my-pending'] })
      queryClient.invalidateQueries({ queryKey: ['sicario-aufstellung-details'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: sicarioApi.deleteAufstellung,
    onSuccess: () => {
      toast.success('Sicario-Einsatz gelöscht')
      queryClient.invalidateQueries({ queryKey: ['sicario-aufstellungen'] })
      setSelectedAufstellung(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen')
    },
  })

  const canCreate = accessData?.isLeadership || accessData?.isSicario

  const handleCreate = (data: { date: string; time: string; reason: string; location?: string }) => {
    createMutation.mutate(data)
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return {
      date: date.toLocaleDateString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Europe/Berlin',
      }),
      time: date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin',
      }),
    }
  }

  const isDeadlinePassed = (deadline: string) => new Date() > new Date(deadline)

  const getMyResponse = (aufstellung: SicarioAufstellung) => {
    return aufstellung.responses?.find(r => r.user.id === user?.id)
  }

  const getDisplayName = (u: any) => {
    if (u?.icFirstName && u?.icLastName) return `${u.icFirstName} ${u.icLastName}`
    return u?.username || 'Unbekannt'
  }

  // Stats
  const totalEinsaetze = aufstellungen?.length || 0
  const pendingCount = myPending?.length || 0
  const teamCount = team?.total || 0

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          <span className="text-gray-400 text-lg">Zugang wird geprüft...</span>
        </div>
      </div>
    )
  }

  if (!accessData?.hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-red-500/20 via-rose-500/20 to-red-500/20 blur-xl opacity-70" />
          <Card className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border-2 border-red-500/50 max-w-md overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-transparent" />
            <CardContent className="relative pt-8 pb-8 text-center">
              <div className="p-4 bg-red-500/20 rounded-2xl w-fit mx-auto mb-4">
                <Lock className="h-16 w-16 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Zugang verweigert</h2>
              <p className="text-gray-400">
                Dieser Bereich ist nur für Sicarios und Leaderschaft zugänglich.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (aufstellungenLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          <span className="text-gray-400 text-lg">Lädt Sicario-Daten...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-900/40 via-rose-900/30 to-red-950/40 border border-red-500/30">
        <div className="relative px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-lg shadow-red-500/30">
                <Crosshair className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  Sicario Division
                  <Sparkles className="h-6 w-6 text-red-400" />
                </h1>
                <p className="text-red-200/70 mt-1">
                  Einsätze und Aufstellungen der Sicarios
                </p>
              </div>
            </div>
            {team && (
              <Badge className="bg-red-900/40 text-red-300 border-red-500/50 px-4 py-2 text-base">
                <Users className="h-4 w-4 mr-2" />
                {team.total} Sicarios aktiv
              </Badge>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 rounded-xl p-4 border border-red-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Crosshair className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{totalEinsaetze}</div>
                  <div className="text-xs text-red-300/60 uppercase tracking-wide">Einsätze</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 rounded-xl p-4 border border-orange-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-400">{pendingCount}</div>
                  <div className="text-xs text-orange-300/60 uppercase tracking-wide">Ausstehend</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-rose-900/40 to-rose-800/20 rounded-xl p-4 border border-rose-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/20 rounded-lg">
                  <Skull className="h-5 w-5 text-rose-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-rose-400">{teamCount}</div>
                  <div className="text-xs text-rose-300/60 uppercase tracking-wide">Team</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-4 border border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {aufstellungen?.filter((a: SicarioAufstellung) => getMyResponse(a)?.status === 'COMING').length || 0}
                  </div>
                  <div className="text-xs text-green-300/60 uppercase tracking-wide">Dabei</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ausstehende Einsätze */}
      {myPending && myPending.length > 0 && (
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-red-500/30 via-rose-500/30 to-orange-500/30 blur-xl opacity-70 group-hover:opacity-100 transition-opacity" />
          <Card className="relative bg-gradient-to-br from-red-900/40 via-rose-900/30 to-orange-900/40 border-2 border-red-500/50 shadow-2xl overflow-hidden">
            <CardHeader className="relative pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-red-400 text-2xl">
                  <div className="p-3 bg-red-500/20 rounded-xl mr-4">
                    <Target className="h-7 w-7 animate-pulse" />
                  </div>
                  Einsätze ohne Antwort!
                </CardTitle>
                <Badge className="bg-red-600/80 text-white text-lg px-4 py-2 shadow-lg animate-pulse">
                  {myPending.length} ausstehend
                </Badge>
              </div>
              <CardDescription className="text-red-200/80 text-base ml-16">
                Reagiere auf diese Sicario-Einsätze
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-3">
              {myPending.map((auf: SicarioAufstellung) => {
                const { date, time } = formatDateTime(auf.date)
                return (
                  <div
                    key={auf.id}
                    className="group/item flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl cursor-pointer hover:bg-gray-800/70 transition-all duration-300 border border-red-600/30 hover:border-red-500/60 hover:shadow-lg hover:shadow-red-500/10"
                    onClick={() => setSelectedAufstellung(auf.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-gradient-to-br from-red-500/30 to-rose-500/20 rounded-xl group-hover/item:scale-110 transition-transform">
                        <Skull className="h-6 w-6 text-red-400" />
                      </div>
                      <div>
                        <div className="text-white font-semibold text-lg group-hover/item:text-red-400 transition-colors">
                          {auf.reason}
                        </div>
                        <div className="flex items-center gap-3 text-gray-300 text-sm mt-1 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-red-400" />
                            {date}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-red-400" />
                            {time} Uhr
                          </span>
                          {auf.location && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-red-400" />
                              {auf.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Jetzt antworten
                    </Button>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Sicario Aufstellung Button */}
      {canCreate && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold px-6 py-5 text-base shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
          >
            <Plus className="mr-2 h-5 w-5" />
            Neuen Sicario-Einsatz erstellen
          </Button>
        </div>
      )}

      {/* Create Sicario Aufstellung Modal */}
      <CreateAufstellungModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        isLoading={createMutation.isPending}
        variant="sicario"
      />

      {/* Einsätze und Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Einsätze Liste */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Skull className="h-5 w-5 text-red-400" />
              </div>
              Sicario-Einsätze
            </h2>
            <Badge className="bg-red-900/40 text-red-300 border-red-500/50 px-3 py-1">
              {aufstellungen?.length || 0} Gesamt
            </Badge>
          </div>

          {aufstellungen && aufstellungen.length > 0 ? (
            <>
              {/* Neueste 3 Einsätze */}
              {aufstellungen.slice(0, 3).map((auf: SicarioAufstellung) => {
                const { date, time } = formatDateTime(auf.date)
                const myResponse = getMyResponse(auf)
                const deadlinePassed = isDeadlinePassed(auf.deadline)
                const isSelected = selectedAufstellung === auf.id

                return (
                  <div
                    key={auf.id}
                    className={`group relative overflow-hidden cursor-pointer transition-all duration-300 rounded-xl border ${
                      isSelected
                        ? 'bg-gradient-to-br from-red-900/50 to-rose-900/40 border-red-500 shadow-lg shadow-red-500/20 scale-[1.02]'
                        : 'bg-gray-900/50 border-gray-800 hover:border-red-500/50 hover:bg-gray-900/80 hover:shadow-md'
                    }`}
                    onClick={() => setSelectedAufstellung(auf.id)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-red-500/30' : 'bg-red-500/20'} group-hover:scale-110 transition-transform`}>
                            <Crosshair className="h-5 w-5 text-red-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-semibold text-lg mb-1 transition-colors ${isSelected ? 'text-red-300' : 'text-white group-hover:text-red-300'}`}>
                              {auf.reason}
                            </h3>
                            <p className="text-sm text-gray-400 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {getDisplayName(auf.createdBy)}
                            </p>
                          </div>
                        </div>
                        {deadlinePassed && (
                          <Badge className="bg-gray-800 text-gray-400 border-gray-600 text-xs shrink-0">
                            Vorbei
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm mt-4 flex-wrap">
                        <span className="flex items-center gap-1.5 text-gray-300">
                          <Calendar className="h-4 w-4 text-red-400" />
                          {date}
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-300">
                          <Clock className="h-4 w-4 text-red-400" />
                          {time} Uhr
                        </span>
                        {auf.location && (
                          <span className="flex items-center gap-1.5 text-gray-300">
                            <MapPin className="h-4 w-4 text-red-400" />
                            {auf.location}
                          </span>
                        )}
                      </div>

                      <div className="mt-3">
                        {myResponse ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Deine Antwort:</span>
                            {myResponse.status === 'COMING' && (
                              <Badge className="bg-green-900/40 text-green-300 border-green-500/50">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Dabei
                              </Badge>
                            )}
                            {myResponse.status === 'NOT_COMING' && (
                              <Badge className="bg-red-900/40 text-red-300 border-red-500/50">
                                <XCircle className="mr-1 h-3 w-3" />
                                Nicht dabei
                              </Badge>
                            )}
                            {myResponse.status === 'UNSURE' && (
                              <Badge className="bg-yellow-900/40 text-yellow-300 border-yellow-500/50">
                                <HelpCircle className="mr-1 h-3 w-3" />
                                Unsicher
                              </Badge>
                            )}
                          </div>
                        ) : (
                          !deadlinePassed && (
                            <Badge className="bg-orange-900/40 text-orange-300 border-orange-500/50 animate-pulse">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Noch nicht geantwortet
                            </Badge>
                          )
                        )}
                      </div>

                      <div className="flex items-center gap-4 pt-3 mt-3 border-t border-gray-800">
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="p-1 bg-green-900/40 rounded">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                          </div>
                          <span className="text-green-400 font-medium">
                            {auf.responses?.filter(r => r.status === 'COMING').length || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="p-1 bg-red-900/40 rounded">
                            <XCircle className="h-3.5 w-3.5 text-red-400" />
                          </div>
                          <span className="text-red-400 font-medium">
                            {auf.responses?.filter(r => r.status === 'NOT_COMING').length || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="p-1 bg-yellow-900/40 rounded">
                            <HelpCircle className="h-3.5 w-3.5 text-yellow-400" />
                          </div>
                          <span className="text-yellow-400 font-medium">
                            {auf.responses?.filter(r => r.status === 'UNSURE').length || 0}
                          </span>
                        </div>
                        <div className="ml-auto">
                          <Eye className="h-4 w-4 text-gray-500 group-hover:text-red-400 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Ältere Einsätze Toggle */}
              {aufstellungen.length > 3 && (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowOlderAufstellungen(!showOlderAufstellungen)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-900/50 hover:bg-gray-800/70 border border-gray-800 hover:border-red-500/30 rounded-xl text-gray-300 hover:text-white transition-all"
                  >
                    <History className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-medium">
                      {showOlderAufstellungen ? 'Ältere verstecken' : `${aufstellungen.length - 3} ältere Einsätze anzeigen`}
                    </span>
                    {showOlderAufstellungen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {/* Ältere Einsätze Liste */}
                  {showOlderAufstellungen && aufstellungen.slice(3).map((auf: SicarioAufstellung) => {
                    const { date, time } = formatDateTime(auf.date)
                    const myResponse = getMyResponse(auf)
                    const deadlinePassed = isDeadlinePassed(auf.deadline)
                    const isSelected = selectedAufstellung === auf.id

                    return (
                      <div
                        key={auf.id}
                        className={`group relative overflow-hidden cursor-pointer transition-all duration-300 rounded-xl border ${
                          isSelected
                            ? 'bg-gradient-to-br from-red-900/50 to-rose-900/40 border-red-500 shadow-lg shadow-red-500/20 scale-[1.02]'
                            : 'bg-gray-900/50 border-gray-800 hover:border-red-500/50 hover:bg-gray-900/80 hover:shadow-md'
                        }`}
                        onClick={() => setSelectedAufstellung(auf.id)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-red-500/30' : 'bg-red-500/20'}`}>
                                <Crosshair className="h-5 w-5 text-red-400" />
                              </div>
                              <div className="flex-1">
                                <h3 className={`font-semibold text-lg mb-1 transition-colors ${isSelected ? 'text-red-300' : 'text-white group-hover:text-red-300'}`}>
                                  {auf.reason}
                                </h3>
                                <p className="text-sm text-gray-400 flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {getDisplayName(auf.createdBy)}
                                </p>
                              </div>
                            </div>
                            {deadlinePassed && (
                              <Badge className="bg-gray-800 text-gray-400 border-gray-600 text-xs shrink-0">
                                Vorbei
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm mt-4 flex-wrap">
                            <span className="flex items-center gap-1.5 text-gray-300">
                              <Calendar className="h-4 w-4 text-red-400" />
                              {date}
                            </span>
                            <span className="flex items-center gap-1.5 text-gray-300">
                              <Clock className="h-4 w-4 text-red-400" />
                              {time} Uhr
                            </span>
                            {auf.location && (
                              <span className="flex items-center gap-1.5 text-gray-300">
                                <MapPin className="h-4 w-4 text-red-400" />
                                {auf.location}
                              </span>
                            )}
                          </div>

                          {myResponse ? (
                            <div className="flex items-center gap-2 mt-3">
                              <span className="text-xs text-gray-500">Deine Antwort:</span>
                              {myResponse.status === 'COMING' && (
                                <Badge className="bg-green-900/40 text-green-300 border-green-500/50">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Dabei
                                </Badge>
                              )}
                              {myResponse.status === 'NOT_COMING' && (
                                <Badge className="bg-red-900/40 text-red-300 border-red-500/50">
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Nicht dabei
                                </Badge>
                              )}
                              {myResponse.status === 'UNSURE' && (
                                <Badge className="bg-yellow-900/40 text-yellow-300 border-yellow-500/50">
                                  <HelpCircle className="mr-1 h-3 w-3" />
                                  Unsicher
                                </Badge>
                              )}
                            </div>
                          ) : (
                            !deadlinePassed && (
                              <Badge className="bg-orange-900/40 text-orange-300 border-orange-500/50 mt-3 animate-pulse">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Noch nicht geantwortet
                              </Badge>
                            )
                          )}

                          <div className="flex items-center gap-4 pt-3 mt-3 border-t border-gray-800">
                            <div className="flex items-center gap-1.5 text-sm">
                              <div className="p-1 bg-green-900/40 rounded">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                              </div>
                              <span className="text-green-400 font-medium">
                                {auf.responses?.filter(r => r.status === 'COMING').length || 0}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm">
                              <div className="p-1 bg-red-900/40 rounded">
                                <XCircle className="h-3.5 w-3.5 text-red-400" />
                              </div>
                              <span className="text-red-400 font-medium">
                                {auf.responses?.filter(r => r.status === 'NOT_COMING').length || 0}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm">
                              <div className="p-1 bg-yellow-900/40 rounded">
                                <HelpCircle className="h-3.5 w-3.5 text-yellow-400" />
                              </div>
                              <span className="text-yellow-400 font-medium">
                                {auf.responses?.filter(r => r.status === 'UNSURE').length || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 text-center">
              <div className="p-4 bg-gray-800/50 rounded-2xl w-fit mx-auto mb-4">
                <Crosshair className="h-12 w-12 text-gray-600" />
              </div>
              <p className="text-gray-400 text-lg">Keine Sicario-Einsätze</p>
              <p className="text-gray-500 text-sm mt-1">Erstelle den ersten Einsatz für das Team</p>
            </div>
          )}
        </div>

        {/* Details */}
        {selectedAufstellung && aufstellungDetails && (
          <div className="space-y-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Target className="h-5 w-5 text-red-400" />
                </div>
                Details
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAufstellung(null)}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>

            <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-red-500/30 shadow-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent" />
              <CardHeader className="relative border-b border-red-500/20 pb-4">
                <CardTitle className="text-2xl text-red-300 mb-2">{aufstellungDetails.reason}</CardTitle>
                <div className="flex items-center gap-4 text-gray-300 flex-wrap">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-red-400" />
                    {formatDateTime(aufstellungDetails.date).date}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-400" />
                    {formatDateTime(aufstellungDetails.date).time} Uhr
                  </span>
                  {aufstellungDetails.location && (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-400" />
                      {aufstellungDetails.location}
                    </span>
                  )}
                </div>
                <CardDescription className="mt-2 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Erstellt von {getDisplayName(aufstellungDetails.createdBy)}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative pt-6 space-y-6">
                {/* Meine Reaktion */}
                {!isDeadlinePassed(aufstellungDetails.deadline) && (
                  <div className="bg-gray-800/50 p-4 rounded-xl border border-red-500/20">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-red-400" />
                      Deine Antwort
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <Button
                        variant={getMyResponse(aufstellungDetails)?.status === 'COMING' ? 'default' : 'outline'}
                        className={`h-12 transition-all ${
                          getMyResponse(aufstellungDetails)?.status === 'COMING'
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 border-green-500 shadow-lg shadow-green-500/20 text-white'
                            : 'border-green-500/30 hover:border-green-500 hover:bg-green-900/20 text-green-400'
                        }`}
                        onClick={() => respondMutation.mutate({ id: selectedAufstellung, status: 'COMING' })}
                        disabled={respondMutation.isPending}
                      >
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Bin dabei
                      </Button>
                      <Button
                        variant={getMyResponse(aufstellungDetails)?.status === 'NOT_COMING' ? 'default' : 'outline'}
                        className={`h-12 transition-all ${
                          getMyResponse(aufstellungDetails)?.status === 'NOT_COMING'
                            ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border-red-500 shadow-lg shadow-red-500/20 text-white'
                            : 'border-red-500/30 hover:border-red-500 hover:bg-red-900/20 text-red-400'
                        }`}
                        onClick={() => respondMutation.mutate({ id: selectedAufstellung, status: 'NOT_COMING' })}
                        disabled={respondMutation.isPending}
                      >
                        <XCircle className="mr-2 h-5 w-5" />
                        Nicht dabei
                      </Button>
                      <Button
                        variant={getMyResponse(aufstellungDetails)?.status === 'UNSURE' ? 'default' : 'outline'}
                        className={`h-12 transition-all ${
                          getMyResponse(aufstellungDetails)?.status === 'UNSURE'
                            ? 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 border-yellow-500 shadow-lg shadow-yellow-500/20 text-white'
                            : 'border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-900/20 text-yellow-400'
                        }`}
                        onClick={() => respondMutation.mutate({ id: selectedAufstellung, status: 'UNSURE' })}
                        disabled={respondMutation.isPending}
                      >
                        <HelpCircle className="mr-2 h-5 w-5" />
                        Unsicher
                      </Button>
                    </div>
                  </div>
                )}

                {/* Statistik */}
                {aufstellungDetails.stats && (
                  <div className="bg-gray-800/50 p-4 rounded-xl border border-red-500/20">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-red-400" />
                      Team-Status
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 p-4 rounded-xl border border-green-500/30">
                        <CheckCircle2 className="h-5 w-5 text-green-400 mb-2" />
                        <div className="text-3xl font-bold text-green-400 mb-1">
                          {aufstellungDetails.stats.coming}
                        </div>
                        <div className="text-xs text-green-300/70 uppercase tracking-wide">Dabei</div>
                      </div>
                      <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 p-4 rounded-xl border border-red-500/30">
                        <XCircle className="h-5 w-5 text-red-400 mb-2" />
                        <div className="text-3xl font-bold text-red-400 mb-1">
                          {aufstellungDetails.stats.notComing}
                        </div>
                        <div className="text-xs text-red-300/70 uppercase tracking-wide">Nicht</div>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 p-4 rounded-xl border border-yellow-500/30">
                        <HelpCircle className="h-5 w-5 text-yellow-400 mb-2" />
                        <div className="text-3xl font-bold text-yellow-400 mb-1">
                          {aufstellungDetails.stats.unsure}
                        </div>
                        <div className="text-xs text-yellow-300/70 uppercase tracking-wide">Unsicher</div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 p-4 rounded-xl border border-orange-500/30">
                        <UserX className="h-5 w-5 text-orange-400 mb-2" />
                        <div className="text-3xl font-bold text-orange-400 mb-1">
                          {aufstellungDetails.stats.noResponse}
                        </div>
                        <div className="text-xs text-orange-300/70 uppercase tracking-wide">Ausstehend</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Listen */}
                {aufstellungDetails.responses && (
                  <div className="space-y-3">
                    {aufstellungDetails.responses.filter((r: any) => r.status === 'COMING').length > 0 && (
                      <div className="bg-gray-800/50 p-4 rounded-xl border border-green-500/30">
                        <h3 className="text-white font-semibold mb-3 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                            Dabei
                          </span>
                          <Badge className="bg-green-900/40 text-green-300 border-green-500/50">
                            {aufstellungDetails.responses.filter((r: any) => r.status === 'COMING').length}
                          </Badge>
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {aufstellungDetails.responses
                            .filter((r: any) => r.status === 'COMING')
                            .map((r: any) => (
                              <div
                                key={r.id}
                                className="flex items-center gap-2 bg-green-900/20 hover:bg-green-900/30 border border-green-500/30 p-3 rounded-lg text-sm text-green-200 transition-colors"
                              >
                                <div className="p-1 bg-green-500/20 rounded">
                                  <User className="h-3 w-3 text-green-400" />
                                </div>
                                {getDisplayName(r.user)}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {aufstellungDetails.responses.filter((r: any) => r.status === 'NOT_COMING').length > 0 && (
                      <div className="bg-gray-800/50 p-4 rounded-xl border border-red-500/30">
                        <h3 className="text-white font-semibold mb-3 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-400" />
                            Nicht dabei
                          </span>
                          <Badge className="bg-red-900/40 text-red-300 border-red-500/50">
                            {aufstellungDetails.responses.filter((r: any) => r.status === 'NOT_COMING').length}
                          </Badge>
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {aufstellungDetails.responses
                            .filter((r: any) => r.status === 'NOT_COMING')
                            .map((r: any) => (
                              <div
                                key={r.id}
                                className="flex items-center gap-2 bg-red-900/20 hover:bg-red-900/30 border border-red-500/30 p-3 rounded-lg text-sm text-red-200 transition-colors"
                              >
                                <div className="p-1 bg-red-500/20 rounded">
                                  <User className="h-3 w-3 text-red-400" />
                                </div>
                                {getDisplayName(r.user)}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {aufstellungDetails.responses.filter((r: any) => r.status === 'UNSURE').length > 0 && (
                      <div className="bg-gray-800/50 p-4 rounded-xl border border-yellow-500/30">
                        <h3 className="text-white font-semibold mb-3 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-yellow-400" />
                            Unsicher
                          </span>
                          <Badge className="bg-yellow-900/40 text-yellow-300 border-yellow-500/50">
                            {aufstellungDetails.responses.filter((r: any) => r.status === 'UNSURE').length}
                          </Badge>
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {aufstellungDetails.responses
                            .filter((r: any) => r.status === 'UNSURE')
                            .map((r: any) => (
                              <div
                                key={r.id}
                                className="flex items-center gap-2 bg-yellow-900/20 hover:bg-yellow-900/30 border border-yellow-500/30 p-3 rounded-lg text-sm text-yellow-200 transition-colors"
                              >
                                <div className="p-1 bg-yellow-500/20 rounded">
                                  <User className="h-3 w-3 text-yellow-400" />
                                </div>
                                {getDisplayName(r.user)}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {aufstellungDetails.sicariosWithoutResponse &&
                      aufstellungDetails.sicariosWithoutResponse.length > 0 && (
                        <div className="bg-gray-800/50 p-4 rounded-xl border border-orange-500/30">
                          <h3 className="text-white font-semibold mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <UserX className="h-5 w-5 text-orange-400" />
                              Keine Antwort
                            </span>
                            <Badge className="bg-orange-900/40 text-orange-300 border-orange-500/50 animate-pulse">
                              {aufstellungDetails.sicariosWithoutResponse.length}
                            </Badge>
                          </h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {aufstellungDetails.sicariosWithoutResponse.map((u: any) => (
                              <div
                                key={u.id}
                                className="flex items-center gap-2 bg-orange-900/20 hover:bg-orange-900/30 border border-orange-500/30 p-3 rounded-lg text-sm text-orange-200 transition-colors"
                              >
                                <div className="p-1 bg-orange-500/20 rounded">
                                  <User className="h-3 w-3 text-orange-400" />
                                </div>
                                {getDisplayName(u)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Admin Aktionen */}
                {accessData?.isLeadership && (
                  <div className="bg-gray-800/50 p-4 rounded-xl border border-red-500/20">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-red-400" />
                      Admin-Aktionen
                    </h3>
                    <Button
                      variant="outline"
                      className="w-full h-11 text-red-400 border-red-500/50 hover:bg-red-900/20 hover:border-red-500"
                      onClick={() => {
                        if (window.confirm('Einsatz wirklich löschen?')) {
                          deleteMutation.mutate(selectedAufstellung)
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Einsatz löschen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Team Übersicht */}
      {team && team.members && (
        <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-red-500/30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent" />
          <CardHeader className="relative">
            <CardTitle className="text-white flex items-center gap-2">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Users className="h-5 w-5 text-red-400" />
              </div>
              Sicario Team ({team.total})
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex flex-wrap gap-2">
              {team.members.map((member: any) => (
                <Badge 
                  key={member.id} 
                  className="bg-red-900/30 text-red-200 border-red-500/30 hover:bg-red-900/50 transition-colors"
                >
                  <User className="h-3 w-3 mr-1.5" />
                  {getDisplayName(member)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
