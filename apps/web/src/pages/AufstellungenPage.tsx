import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aufstellungApi } from '../lib/api'
import { usePageTitle } from '../hooks/usePageTitle'
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
  UserPlus,
  ChevronDown,
  ChevronUp,
  History,
  Sparkles,
  Target,
  Eye,
} from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import CreateExclusionModal from '../components/CreateExclusionModal'
import CreateAufstellungModal from '../components/CreateAufstellungModal'

interface Aufstellung {
  id: string
  date: string
  reason: string
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
  usersWithoutResponse?: Array<{
    id: string
    username: string
    icFirstName: string
    icLastName: string
  }>
}

export default function AufstellungenPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  usePageTitle('Aufstellungen')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showExclusions, setShowExclusions] = useState(false)
  const [showCreateExclusionModal, setShowCreateExclusionModal] = useState(false)
  const [selectedAufstellung, setSelectedAufstellung] = useState<string | null>(null)
  const [showOlderAufstellungen, setShowOlderAufstellungen] = useState(false)

  // Rechte prüfen
  const canManageAufstellungen = user?.role && ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'].includes(user.role)

  // Query: Alle Aufstellungen
  const { data: aufstellungen, isLoading } = useQuery({
    queryKey: ['aufstellungen'],
    queryFn: () => aufstellungApi.getAll().then(res => res.data),
  })

  // Query: Ausstehende Aufstellungen für mich
  const { data: myPending } = useQuery({
    queryKey: ['aufstellungen-my-pending'],
    queryFn: () => aufstellungApi.getMyPending().then(res => res.data),
  })

  // Query: Ausgewählte Aufstellung Details
  const { data: aufstellungDetails } = useQuery({
    queryKey: ['aufstellung-details', selectedAufstellung],
    queryFn: () => aufstellungApi.getById(selectedAufstellung!).then(res => res.data),
    enabled: !!selectedAufstellung,
  })

  // Query: Exclusions
  const { data: exclusions, isLoading: exclusionsLoading, error: exclusionsError } = useQuery({
    queryKey: ['aufstellung-exclusions'],
    queryFn: async () => {
      const data = await aufstellungApi.getExclusions()
      return data
    },
  })

  // Mutation: Erstellen
  const createMutation = useMutation({
    mutationFn: aufstellungApi.create,
    onSuccess: () => {
      toast.success('Aufstellung wurde erstellt und Discord-Benachrichtigung versendet')
      queryClient.invalidateQueries({ queryKey: ['aufstellungen'] })
      queryClient.invalidateQueries({ queryKey: ['aufstellungen-my-pending'] })
      setShowCreateModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen der Aufstellung')
    },
  })

  // Mutation: Reagieren
  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'COMING' | 'NOT_COMING' | 'UNSURE' }) =>
      aufstellungApi.respond(id, status),
    onSuccess: () => {
      toast.success('Deine Antwort wurde gespeichert')
      queryClient.invalidateQueries({ queryKey: ['aufstellungen'] })
      queryClient.invalidateQueries({ queryKey: ['aufstellungen-my-pending'] })
      queryClient.invalidateQueries({ queryKey: ['aufstellung-details'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern der Antwort')
    },
  })

  // Mutation: Sanktionieren
  const sanctionMutation = useMutation({
    mutationFn: aufstellungApi.sanctionNonResponders,
    onSuccess: (data) => {
      toast.success(`${data.data.sanctionedUsers} User wurden sanktioniert`)
      queryClient.invalidateQueries({ queryKey: ['aufstellung-details'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Sanktionieren')
    },
  })

  // Mutations: Exclusions
  const createExclusionMutation = useMutation({
    mutationFn: (data: { userId: string; reason: string; startDate: string; endDate?: string }) =>
      aufstellungApi.createExclusion(data),
    onSuccess: () => {
      toast.success('Ausschluss wurde erstellt')
      queryClient.invalidateQueries({ queryKey: ['aufstellung-exclusions'] })
      setShowCreateExclusionModal(false)
      setShowExclusions(true)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen des Ausschlusses')
    },
  })

  const deactivateExclusionMutation = useMutation({
    mutationFn: aufstellungApi.deactivateExclusion,
    onSuccess: () => {
      toast.success('Ausschluss wurde deaktiviert')
      queryClient.invalidateQueries({ queryKey: ['aufstellung-exclusions'] })
    },
  })

  const deleteExclusionMutation = useMutation({
    mutationFn: aufstellungApi.deleteExclusion,
    onSuccess: () => {
      toast.success('Ausschluss wurde gelöscht')
      queryClient.invalidateQueries({ queryKey: ['aufstellung-exclusions'] })
    },
  })

  // Mutation: Löschen
  const deleteMutation = useMutation({
    mutationFn: aufstellungApi.delete,
    onSuccess: () => {
      toast.success('Aufstellung wurde gelöscht')
      queryClient.invalidateQueries({ queryKey: ['aufstellungen'] })
      setSelectedAufstellung(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen')
    },
  })

  const handleCreate = (data: { date: string; time: string; reason: string }) => {
    createMutation.mutate(data)
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return {
      date: date.toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        timeZone: 'Europe/Berlin'
      }),
      time: date.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Berlin'
      }),
    }
  }

  const isDeadlinePassed = (deadline: string) => {
    return new Date() > new Date(deadline)
  }

  const getMyResponse = (aufstellung: Aufstellung) => {
    return aufstellung.responses.find(r => r.user.id === user?.id)
  }

  const getDisplayName = (user: any) => {
    if (user.icFirstName && user.icLastName) {
      return `${user.icFirstName} ${user.icLastName}`
    }
    return user.username || 'Unbekannt'
  }

  // Stats berechnen
  const totalAufstellungen = aufstellungen?.length || 0
  const pendingCount = myPending?.length || 0
  const activeExclusions = exclusions?.filter((e: any) => e.isActive).length || 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-gray-400 text-lg">Lädt Aufstellungen...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/40 via-yellow-900/30 to-orange-900/40 border border-amber-500/30">
        <div className="relative px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl shadow-lg shadow-amber-500/30">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  Aufstellungen
                  <Sparkles className="h-6 w-6 text-amber-400" />
                </h1>
                <p className="text-amber-200/70 mt-1">
                  Verwalte Termine und Reaktionen der Familia
                </p>
              </div>
            </div>
            {canManageAufstellungen && (
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowExclusions(!showExclusions)}
                  className="border-amber-500/50 text-amber-300 hover:bg-amber-900/30 hover:border-amber-400 transition-all"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {showExclusions ? 'Aufstellungen anzeigen' : 'Ausschlüsse anzeigen'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowCreateExclusionModal(true)}
                  className="border-amber-500/50 text-amber-300 hover:bg-amber-900/30 hover:border-amber-400 transition-all"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ausschluss erstellen
                </Button>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 rounded-xl p-4 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Calendar className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-400">{totalAufstellungen}</div>
                  <div className="text-xs text-amber-300/60 uppercase tracking-wide">Gesamt</div>
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
            <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 rounded-xl p-4 border border-yellow-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <UserX className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{activeExclusions}</div>
                  <div className="text-xs text-yellow-300/60 uppercase tracking-wide">Ausschlüsse</div>
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
                    {aufstellungen?.filter((a: Aufstellung) => getMyResponse(a)?.status === 'COMING').length || 0}
                  </div>
                  <div className="text-xs text-green-300/60 uppercase tracking-wide">Zugesagt</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ausstehende Benachrichtigungen - Prominent */}
      {myPending && myPending.length > 0 && (
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/30 via-orange-500/30 to-red-500/30 blur-xl opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <Card className="relative bg-gradient-to-br from-yellow-900/40 via-orange-900/30 to-red-900/40 border-2 border-yellow-500/50 shadow-2xl overflow-hidden">
            <CardHeader className="relative pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-yellow-400 text-2xl">
                  <div className="p-3 bg-yellow-500/20 rounded-xl mr-4">
                    <AlertTriangle className="h-7 w-7 animate-pulse" />
                  </div>
                  Deine Reaktion erforderlich!
                </CardTitle>
                <Badge className="bg-red-600/80 text-white text-lg px-4 py-2 shadow-lg animate-pulse">
                  {myPending.length} ausstehend
                </Badge>
              </div>
              <CardDescription className="text-yellow-200/80 text-base ml-16">
                Bitte reagiere so schnell wie möglich auf diese Aufstellungen
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-3">
              {myPending.map((auf: Aufstellung) => {
                const { date, time } = formatDateTime(auf.date)
                return (
                  <div
                    key={auf.id}
                    className="group/item flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl cursor-pointer hover:bg-gray-800/70 transition-all duration-300 border border-yellow-600/30 hover:border-yellow-500/60 hover:shadow-lg hover:shadow-yellow-500/10"
                    onClick={() => setSelectedAufstellung(auf.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-gradient-to-br from-yellow-500/30 to-orange-500/20 rounded-xl group-hover/item:scale-110 transition-transform">
                        <Target className="h-6 w-6 text-yellow-400" />
                      </div>
                      <div>
                        <div className="text-white font-semibold text-lg group-hover/item:text-yellow-400 transition-colors">
                          {auf.reason}
                        </div>
                        <div className="flex items-center gap-3 text-gray-300 text-sm mt-1">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-amber-400" />
                            {date}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-amber-400" />
                            {time} Uhr
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-semibold shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 transition-all">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Jetzt reagieren
                    </Button>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Aufstellung Button */}
      {canManageAufstellungen && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold px-6 py-5 text-base shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
          >
            <Plus className="mr-2 h-5 w-5" />
            Neue Aufstellung erstellen
          </Button>
        </div>
      )}

      {/* Create Aufstellung Modal */}
      <CreateAufstellungModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        isLoading={createMutation.isPending}
        variant="normal"
      />

      {/* Liste der Aufstellungen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aufstellungen Liste */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Users className="h-5 w-5 text-amber-400" />
              </div>
              Aufstellungen
            </h2>
            <Badge className="bg-amber-900/40 text-amber-300 border-amber-500/50 px-3 py-1">
              {aufstellungen?.length || 0} Gesamt
            </Badge>
          </div>
          
          {aufstellungen && aufstellungen.length > 0 ? (
            <>
              {/* Neueste 3 Aufstellungen */}
              {aufstellungen.slice(0, 3).map((auf: Aufstellung) => {
                const { date, time } = formatDateTime(auf.date)
                const myResponse = getMyResponse(auf)
                const deadlinePassed = isDeadlinePassed(auf.deadline)
                const isSelected = selectedAufstellung === auf.id

                return (
                  <div
                    key={auf.id}
                    className={`group relative overflow-hidden cursor-pointer transition-all duration-300 rounded-xl border ${
                      isSelected 
                        ? 'bg-gradient-to-br from-amber-900/50 to-orange-900/40 border-amber-500 shadow-lg shadow-amber-500/20 scale-[1.02]' 
                        : 'bg-gray-900/50 border-gray-800 hover:border-amber-500/50 hover:bg-gray-900/80 hover:shadow-md'
                    }`}
                    onClick={() => setSelectedAufstellung(auf.id)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-amber-500/30' : 'bg-amber-500/20'} group-hover:scale-110 transition-transform`}>
                            <MapPin className="h-5 w-5 text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-semibold text-lg mb-1 transition-colors ${isSelected ? 'text-amber-300' : 'text-white group-hover:text-amber-300'}`}>
                              {auf.reason}
                            </h3>
                            <p className="text-sm text-gray-400 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {getDisplayName(auf.createdBy)}
                            </p>
                          </div>
                        </div>
                        {deadlinePassed && (
                          <Badge className="bg-red-900/60 text-red-300 border-red-500/50 text-xs shrink-0">
                            Abgelaufen
                          </Badge>
                        )}
                      </div>
                      
                      {/* Datum & Zeit */}
                      <div className="flex items-center gap-4 text-sm mt-4">
                        <span className="flex items-center gap-1.5 text-gray-300">
                          <Calendar className="h-4 w-4 text-amber-400" />
                          {date}
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-300">
                          <Clock className="h-4 w-4 text-amber-400" />
                          {time} Uhr
                        </span>
                      </div>

                      {/* Meine Reaktion */}
                      <div className="mt-3">
                        {myResponse ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Deine Antwort:</span>
                            {myResponse.status === 'COMING' && (
                              <Badge className="bg-green-900/40 text-green-300 border-green-500/50">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Komme
                              </Badge>
                            )}
                            {myResponse.status === 'NOT_COMING' && (
                              <Badge className="bg-red-900/40 text-red-300 border-red-500/50">
                                <XCircle className="mr-1 h-3 w-3" />
                                Komme nicht
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
                              Noch nicht reagiert
                            </Badge>
                          )
                        )}
                      </div>

                      {/* Statistik */}
                      <div className="flex items-center gap-4 pt-3 mt-3 border-t border-gray-800">
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="p-1 bg-green-900/40 rounded">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                          </div>
                          <span className="text-green-400 font-medium">{auf.responses.filter(r => r.status === 'COMING').length}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="p-1 bg-red-900/40 rounded">
                            <XCircle className="h-3.5 w-3.5 text-red-400" />
                          </div>
                          <span className="text-red-400 font-medium">{auf.responses.filter(r => r.status === 'NOT_COMING').length}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="p-1 bg-yellow-900/40 rounded">
                            <HelpCircle className="h-3.5 w-3.5 text-yellow-400" />
                          </div>
                          <span className="text-yellow-400 font-medium">{auf.responses.filter(r => r.status === 'UNSURE').length}</span>
                        </div>
                        <div className="ml-auto">
                          <Eye className="h-4 w-4 text-gray-500 group-hover:text-amber-400 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Ältere Aufstellungen Toggle */}
              {aufstellungen.length > 3 && (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowOlderAufstellungen(!showOlderAufstellungen)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-900/50 hover:bg-gray-800/70 border border-gray-800 hover:border-amber-500/30 rounded-xl text-gray-300 hover:text-white transition-all"
                  >
                    <History className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium">
                      {showOlderAufstellungen ? 'Ältere verstecken' : `${aufstellungen.length - 3} ältere Aufstellungen anzeigen`}
                    </span>
                    {showOlderAufstellungen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {/* Ältere Aufstellungen Liste */}
                  {showOlderAufstellungen && aufstellungen.slice(3).map((auf: Aufstellung) => {
                    const { date, time } = formatDateTime(auf.date)
                    const myResponse = getMyResponse(auf)
                    const deadlinePassed = isDeadlinePassed(auf.deadline)
                    const isSelected = selectedAufstellung === auf.id

                    return (
                      <div
                        key={auf.id}
                        className={`group relative overflow-hidden cursor-pointer transition-all duration-300 rounded-xl border ${
                          isSelected 
                            ? 'bg-gradient-to-br from-amber-900/50 to-orange-900/40 border-amber-500 shadow-lg shadow-amber-500/20 scale-[1.02]' 
                            : 'bg-gray-900/50 border-gray-800 hover:border-amber-500/50 hover:bg-gray-900/80 hover:shadow-md'
                        }`}
                        onClick={() => setSelectedAufstellung(auf.id)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-amber-500/30' : 'bg-amber-500/20'}`}>
                                <MapPin className="h-5 w-5 text-amber-400" />
                              </div>
                              <div className="flex-1">
                                <h3 className={`font-semibold text-lg mb-1 transition-colors ${isSelected ? 'text-amber-300' : 'text-white group-hover:text-amber-300'}`}>
                                  {auf.reason}
                                </h3>
                                <p className="text-sm text-gray-400 flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {getDisplayName(auf.createdBy)}
                                </p>
                              </div>
                            </div>
                            {deadlinePassed && (
                              <Badge className="bg-red-900/60 text-red-300 border-red-500/50 text-xs shrink-0">
                                Abgelaufen
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm mt-4">
                            <span className="flex items-center gap-1.5 text-gray-300">
                              <Calendar className="h-4 w-4 text-amber-400" />
                              {date}
                            </span>
                            <span className="flex items-center gap-1.5 text-gray-300">
                              <Clock className="h-4 w-4 text-amber-400" />
                              {time} Uhr
                            </span>
                          </div>

                          {myResponse ? (
                            <div className="flex items-center gap-2 mt-3">
                              <span className="text-xs text-gray-500">Deine Antwort:</span>
                              {myResponse.status === 'COMING' && (
                                <Badge className="bg-green-900/40 text-green-300 border-green-500/50">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Komme
                                </Badge>
                              )}
                              {myResponse.status === 'NOT_COMING' && (
                                <Badge className="bg-red-900/40 text-red-300 border-red-500/50">
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Komme nicht
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
                                Noch nicht reagiert
                              </Badge>
                            )
                          )}

                          <div className="flex items-center gap-4 pt-3 mt-3 border-t border-gray-800">
                            <div className="flex items-center gap-1.5 text-sm">
                              <div className="p-1 bg-green-900/40 rounded">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                              </div>
                              <span className="text-green-400 font-medium">{auf.responses.filter(r => r.status === 'COMING').length}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm">
                              <div className="p-1 bg-red-900/40 rounded">
                                <XCircle className="h-3.5 w-3.5 text-red-400" />
                              </div>
                              <span className="text-red-400 font-medium">{auf.responses.filter(r => r.status === 'NOT_COMING').length}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm">
                              <div className="p-1 bg-yellow-900/40 rounded">
                                <HelpCircle className="h-3.5 w-3.5 text-yellow-400" />
                              </div>
                              <span className="text-yellow-400 font-medium">{auf.responses.filter(r => r.status === 'UNSURE').length}</span>
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
                <Users className="h-12 w-12 text-gray-600" />
              </div>
              <p className="text-gray-400 text-lg">Noch keine Aufstellungen erstellt</p>
              <p className="text-gray-500 text-sm mt-1">Erstelle die erste Aufstellung für deine Familia</p>
            </div>
          )}
        </div>

        {/* Details */}
        {selectedAufstellung && aufstellungDetails && (
          <div className="space-y-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <MapPin className="h-5 w-5 text-amber-400" />
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
            
            <div className="space-y-4">
              {/* Header Card */}
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800/80 border-amber-500/30 shadow-xl">
                <CardHeader className="border-b border-amber-500/20 pb-4">
                  <CardTitle className="text-2xl text-amber-300 mb-2">{aufstellungDetails.reason}</CardTitle>
                  <div className="flex items-center gap-4 text-gray-300 flex-wrap">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-400" />
                      {formatDateTime(aufstellungDetails.date).date}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-400" />
                      {formatDateTime(aufstellungDetails.date).time} Uhr
                    </span>
                  </div>
                  <CardDescription className="mt-2 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Erstellt von {getDisplayName(aufstellungDetails.createdBy)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Meine Reaktion */}
                  {!isDeadlinePassed(aufstellungDetails.deadline) && (
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-amber-500/20">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-400" />
                        Deine Reaktion
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        <Button
                          variant={getMyResponse(aufstellungDetails)?.status === 'COMING' ? 'default' : 'outline'}
                          className={`h-12 transition-all ${
                            getMyResponse(aufstellungDetails)?.status === 'COMING'
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 border-green-500 shadow-lg shadow-green-500/20 text-white'
                              : 'border-green-500/30 hover:border-green-500 hover:bg-green-900/20 text-green-400'
                          }`}
                          onClick={() =>
                            respondMutation.mutate({
                              id: selectedAufstellung,
                              status: 'COMING',
                            })
                          }
                          disabled={respondMutation.isPending}
                        >
                          <CheckCircle2 className="mr-2 h-5 w-5" />
                          Komme
                        </Button>
                        <Button
                          variant={getMyResponse(aufstellungDetails)?.status === 'NOT_COMING' ? 'default' : 'outline'}
                          className={`h-12 transition-all ${
                            getMyResponse(aufstellungDetails)?.status === 'NOT_COMING'
                              ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border-red-500 shadow-lg shadow-red-500/20 text-white'
                              : 'border-red-500/30 hover:border-red-500 hover:bg-red-900/20 text-red-400'
                          }`}
                          onClick={() =>
                            respondMutation.mutate({
                              id: selectedAufstellung,
                              status: 'NOT_COMING',
                            })
                          }
                          disabled={respondMutation.isPending}
                        >
                          <XCircle className="mr-2 h-5 w-5" />
                          Komme nicht
                        </Button>
                        <Button
                          variant={getMyResponse(aufstellungDetails)?.status === 'UNSURE' ? 'default' : 'outline'}
                          className={`h-12 transition-all ${
                            getMyResponse(aufstellungDetails)?.status === 'UNSURE'
                              ? 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 border-yellow-500 shadow-lg shadow-yellow-500/20 text-white'
                              : 'border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-900/20 text-yellow-400'
                          }`}
                          onClick={() =>
                            respondMutation.mutate({
                              id: selectedAufstellung,
                              status: 'UNSURE',
                            })
                          }
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
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-amber-500/20">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-amber-400" />
                        Übersicht
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="group relative overflow-hidden bg-gradient-to-br from-green-900/50 to-green-800/30 p-4 rounded-xl border border-green-500/30 hover:border-green-500/60 transition-all">
                          <div className="relative">
                            <CheckCircle2 className="h-5 w-5 text-green-400 mb-2" />
                            <div className="text-3xl font-bold text-green-400 mb-1">
                              {aufstellungDetails.stats.coming}
                            </div>
                            <div className="text-xs text-green-300/70 uppercase tracking-wide">Kommen</div>
                          </div>
                        </div>
                        <div className="group relative overflow-hidden bg-gradient-to-br from-red-900/50 to-red-800/30 p-4 rounded-xl border border-red-500/30 hover:border-red-500/60 transition-all">
                          <div className="relative">
                            <XCircle className="h-5 w-5 text-red-400 mb-2" />
                            <div className="text-3xl font-bold text-red-400 mb-1">
                              {aufstellungDetails.stats.notComing}
                            </div>
                            <div className="text-xs text-red-300/70 uppercase tracking-wide">Nicht</div>
                          </div>
                        </div>
                        <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 p-4 rounded-xl border border-yellow-500/30 hover:border-yellow-500/60 transition-all">
                          <div className="relative">
                            <HelpCircle className="h-5 w-5 text-yellow-400 mb-2" />
                            <div className="text-3xl font-bold text-yellow-400 mb-1">
                              {aufstellungDetails.stats.unsure}
                            </div>
                            <div className="text-xs text-yellow-300/70 uppercase tracking-wide">Unsicher</div>
                          </div>
                        </div>
                        <div className="group relative overflow-hidden bg-gradient-to-br from-orange-900/50 to-orange-800/30 p-4 rounded-xl border border-orange-500/30 hover:border-orange-500/60 transition-all">
                          <div className="relative">
                            <UserX className="h-5 w-5 text-orange-400 mb-2" />
                            <div className="text-3xl font-bold text-orange-400 mb-1">
                              {aufstellungDetails.stats.noResponse}
                            </div>
                            <div className="text-xs text-orange-300/70 uppercase tracking-wide">Ausstehend</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* User Listen */}
                  {aufstellungDetails.responses && (
                    <div className="space-y-3">
                      {/* Kommen */}
                      {aufstellungDetails.responses.filter((r: any) => r.status === 'COMING').length > 0 && (
                        <div className="bg-gray-800/50 p-4 rounded-xl border border-green-500/30">
                          <h3 className="text-white font-semibold mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-green-400" />
                              Kommen
                            </span>
                            <Badge className="bg-green-900/40 text-green-300 border-green-500/50">
                              {aufstellungDetails.responses.filter((r: any) => r.status === 'COMING').length}
                            </Badge>
                          </h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
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

                      {/* Komme nicht */}
                      {aufstellungDetails.responses.filter((r: any) => r.status === 'NOT_COMING').length > 0 && (
                        <div className="bg-gray-800/50 p-4 rounded-xl border border-red-500/30">
                          <h3 className="text-white font-semibold mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <XCircle className="h-5 w-5 text-red-400" />
                              Komme nicht
                            </span>
                            <Badge className="bg-red-900/40 text-red-300 border-red-500/50">
                              {aufstellungDetails.responses.filter((r: any) => r.status === 'NOT_COMING').length}
                            </Badge>
                          </h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
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

                      {/* Unsicher */}
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
                          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
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

                      {/* Keine Reaktion */}
                      {aufstellungDetails.usersWithoutResponse &&
                        aufstellungDetails.usersWithoutResponse.length > 0 && (
                          <div className="bg-gray-800/50 p-4 rounded-xl border border-orange-500/30">
                            <h3 className="text-white font-semibold mb-3 flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <UserX className="h-5 w-5 text-orange-400" />
                                Keine Reaktion
                              </span>
                              <Badge className="bg-orange-900/40 text-orange-300 border-orange-500/50 animate-pulse">
                                {aufstellungDetails.usersWithoutResponse.length}
                              </Badge>
                            </h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                              {aufstellungDetails.usersWithoutResponse.map((u: any) => (
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
                  {canManageAufstellungen && (
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-amber-500/20 space-y-3">
                      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-amber-400" />
                        Admin-Aktionen
                      </h3>
                      {isDeadlinePassed(aufstellungDetails.deadline) &&
                        aufstellungDetails.stats &&
                        aufstellungDetails.stats.noResponse > 0 && (
                          <Button
                            className="w-full h-12 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-500/25 text-white"
                            onClick={() => sanctionMutation.mutate(selectedAufstellung)}
                            disabled={sanctionMutation.isPending}
                          >
                            <AlertTriangle className="mr-2 h-5 w-5" />
                            {aufstellungDetails.stats.noResponse} User sanktionieren
                          </Button>
                        )}
                      <Button
                        variant="outline"
                        className="w-full h-11 text-red-400 border-red-500/50 hover:bg-red-900/20 hover:border-red-500"
                        onClick={() => {
                          if (
                            window.confirm('Aufstellung wirklich löschen? Dies kann nicht rückgängig gemacht werden.')
                          ) {
                            deleteMutation.mutate(selectedAufstellung)
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Aufstellung löschen
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Exclusions List */}
      {showExclusions && canManageAufstellungen && (
        <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <UserX className="h-5 w-5 text-amber-400" />
              </div>
              Ausschlüsse von Aufstellungen
            </CardTitle>
            <CardDescription className="text-gray-400">
              User, die von Aufstellungen ausgeschlossen sind und nicht sanktioniert werden
            </CardDescription>
          </CardHeader>
          <CardContent>
            {exclusionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              </div>
            ) : exclusionsError ? (
              <div className="text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                Fehler beim Laden: {String((exclusionsError as any)?.message || 'Unbekannter Fehler')}
              </div>
            ) : exclusions && exclusions.length > 0 ? (
              <div className="space-y-3">
                {exclusions.map((exclusion: any) => (
                  <div
                    key={exclusion.id}
                    className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 hover:border-amber-500/30 rounded-xl transition-all"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-white flex items-center gap-2">
                        <User className="h-4 w-4 text-amber-400" />
                        {exclusion.user.icFirstName && exclusion.user.icLastName
                          ? `${exclusion.user.icFirstName} ${exclusion.user.icLastName}`
                          : exclusion.user.username}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">{exclusion.reason}</div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {exclusion.startDate && exclusion.endDate
                          ? `${new Date(exclusion.startDate).toLocaleDateString('de-DE')} - ${
                              exclusion.endDate 
                                ? new Date(exclusion.endDate).toLocaleDateString('de-DE')
                                : 'Unbegrenzt'
                            }`
                          : 'Dauerhaft'}
                        {!exclusion.isActive && (
                          <Badge className="bg-yellow-900/40 text-yellow-300 border-yellow-500/50 text-xs">
                            Deaktiviert
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {exclusion.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deactivateExclusionMutation.mutate(exclusion.id)}
                          disabled={deactivateExclusionMutation.isPending}
                          className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-900/20"
                        >
                          Deaktivieren
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Ausschluss wirklich löschen?')) {
                            deleteExclusionMutation.mutate(exclusion.id)
                          }
                        }}
                        disabled={deleteExclusionMutation.isPending}
                        className="border-red-500/50 text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <div className="p-4 bg-gray-800/50 rounded-2xl w-fit mx-auto mb-4">
                  <UserX className="h-12 w-12 text-gray-600" />
                </div>
                <p>Keine Ausschlüsse vorhanden</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Exclusion Modal */}
      <CreateExclusionModal
        isOpen={showCreateExclusionModal}
        onClose={() => setShowCreateExclusionModal(false)}
        onCreate={createExclusionMutation.mutate}
        isLoading={createExclusionMutation.isPending}
        type="aufstellung"
      />
    </div>
  )
}
