import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aufstellungApi } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
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
} from 'lucide-react'
import { useAuthStore } from '../stores/auth'

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

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedAufstellung, setSelectedAufstellung] = useState<string | null>(null)
  const [createData, setCreateData] = useState({
    date: '',
    time: '',
    reason: '',
  })

  // Rechte prüfen
  const canManageAufstellungen = user?.role && ['EL_PATRON', 'DON', 'ASESOR'].includes(user.role)

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

  // Mutation: Erstellen
  const createMutation = useMutation({
    mutationFn: aufstellungApi.create,
    onSuccess: () => {
      toast.success('Aufstellung wurde erstellt und Discord-Benachrichtigung versendet')
      queryClient.invalidateQueries({ queryKey: ['aufstellungen'] })
      queryClient.invalidateQueries({ queryKey: ['aufstellungen-my-pending'] })
      setShowCreateForm(false)
      setCreateData({ date: '', time: '', reason: '' })
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

  const handleCreate = () => {
    if (!createData.date || !createData.time || !createData.reason) {
      toast.error('Bitte fülle alle Felder aus')
      return
    }
    createMutation.mutate(createData)
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return {
      date: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white">Lädt...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Calendar className="mr-3 h-8 w-8 text-accent" />
          Aufstellungen
        </h1>
        <p className="text-gray-400 mt-2">
          Verwalte Termine und Reaktionen der Familia
        </p>
      </div>

      {/* Ausstehende Benachrichtigungen - Prominent */}
      {myPending && myPending.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 blur-xl"></div>
          <Card className="relative bg-gradient-to-br from-yellow-900/30 via-orange-900/30 to-red-900/30 border-2 border-yellow-500/50 shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-yellow-400 text-2xl">
                  <AlertTriangle className="mr-3 h-7 w-7 animate-pulse" />
                  Deine Reaktion erforderlich!
                </CardTitle>
                <Badge variant="destructive" className="text-lg px-4 py-2">
                  {myPending.length} ausstehend
                </Badge>
              </div>
              <CardDescription className="text-yellow-200/80 text-base">
                Bitte reagiere so schnell wie möglich auf diese Aufstellungen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {myPending.map((auf: Aufstellung) => {
                const { date, time } = formatDateTime(auf.date)
                return (
                  <div
                    key={auf.id}
                    className="group flex items-center justify-between p-4 bg-dark-800/70 backdrop-blur-sm rounded-xl cursor-pointer hover:bg-dark-700/70 transition-all duration-200 border border-yellow-600/20 hover:border-yellow-500/50 hover:shadow-lg"
                    onClick={() => setSelectedAufstellung(auf.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-yellow-500/20 rounded-lg">
                        <MapPin className="h-6 w-6 text-yellow-400" />
                      </div>
                      <div>
                        <div className="text-white font-semibold text-lg group-hover:text-yellow-400 transition-colors">
                          {auf.reason}
                        </div>
                        <div className="flex items-center gap-3 text-gray-300 text-sm mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {time} Uhr
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="default" className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold shadow-lg">
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

      {/* Create Form */}
      {canManageAufstellungen && (
        <Card className="bg-gradient-to-br from-dark-800/80 to-dark-900/80 border-gold-500/30 shadow-xl">
          <CardHeader className="border-b border-gold-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-500/20 rounded-lg">
                  <Plus className="h-5 w-5 text-gold-500" />
                </div>
                <CardTitle className="text-white text-xl">Neue Aufstellung erstellen</CardTitle>
              </div>
              <Button
                variant={showCreateForm ? "outline" : "default"}
                size="sm"
                onClick={() => setShowCreateForm(!showCreateForm)}
                className={showCreateForm ? "border-red-500/50 text-red-400 hover:bg-red-900/20 hover:border-red-500" : "bg-gold-600 hover:bg-gold-700 text-white"}
              >
                {showCreateForm ? (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Abbrechen
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Erstellen
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {showCreateForm && (
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gold-500" />
                    Datum
                  </label>
                  <Input
                    type="date"
                    value={createData.date}
                    onChange={(e) => setCreateData({ ...createData, date: e.target.value })}
                    className="bg-dark-700 border-gold-500/30 focus:border-gold-500 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gold-500" />
                    Uhrzeit
                  </label>
                  <Input
                    type="time"
                    value={createData.time}
                    onChange={(e) => setCreateData({ ...createData, time: e.target.value })}
                    className="bg-dark-700 border-gold-500/30 focus:border-gold-500 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gold-500" />
                  Grund / Ort
                </label>
                <Textarea
                  value={createData.reason}
                  onChange={(e) => setCreateData({ ...createData, reason: e.target.value })}
                  placeholder="z.B. Casa Meeting, Routenplanung, Geschäftsabwicklung..."
                  rows={4}
                  className="bg-dark-700 border-gold-500/30 focus:border-gold-500 resize-none text-white placeholder:text-gray-500"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="w-full bg-gradient-to-r from-gold-600 to-gold-700 hover:from-gold-700 hover:to-gold-800 text-white font-semibold py-6 text-lg shadow-lg"
              >
                {createMutation.isPending ? (
                  <>
                    <Clock className="mr-2 h-5 w-5 animate-spin" />
                    Wird erstellt...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Aufstellung erstellen & Discord benachrichtigen
                  </>
                )}
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Liste der Aufstellungen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aufstellungen Liste */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-gold-500" />
              Alle Aufstellungen
            </h2>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {aufstellungen?.length || 0} Gesamt
            </Badge>
          </div>
          {aufstellungen && aufstellungen.length > 0 ? (
            aufstellungen.map((auf: Aufstellung) => {
              const { date, time } = formatDateTime(auf.date)
              const myResponse = getMyResponse(auf)
              const deadlinePassed = isDeadlinePassed(auf.deadline)
              const isSelected = selectedAufstellung === auf.id

              return (
                <Card
                  key={auf.id}
                  className={`group relative overflow-hidden cursor-pointer transition-all duration-300 ${
                    isSelected 
                      ? 'bg-gradient-to-br from-gold-900/40 to-gold-800/40 border-gold-500 shadow-lg scale-[1.02]' 
                      : 'bg-dark-800/60 border-gold-500/20 hover:border-gold-500/50 hover:shadow-md'
                  }`}
                  onClick={() => setSelectedAufstellung(auf.id)}
                >
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-gold-500/0 via-gold-500/5 to-gold-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <CardHeader className="relative pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-gold-500/30' : 'bg-gold-500/20'}`}>
                          <MapPin className="h-5 w-5 text-gold-400" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className={`text-lg mb-1 transition-colors ${isSelected ? 'text-gold-300' : 'text-white group-hover:text-gold-300'}`}>
                            {auf.reason}
                          </CardTitle>
                          <CardDescription className="text-sm flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {getDisplayName(auf.createdBy)}
                          </CardDescription>
                        </div>
                      </div>
                      {deadlinePassed && (
                        <Badge variant="destructive" className="text-xs shrink-0">
                          Abgelaufen
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative space-y-3">
                    {/* Datum & Zeit */}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-gray-300">
                        <Calendar className="h-4 w-4 text-gold-400" />
                        {date}
                      </span>
                      <span className="flex items-center gap-1.5 text-gray-300">
                        <Clock className="h-4 w-4 text-gold-400" />
                        {time} Uhr
                      </span>
                    </div>

                    {/* Meine Reaktion */}
                    {myResponse ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Deine Antwort:</span>
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

                    {/* Statistik */}
                    <div className="flex items-center gap-5 pt-2 border-t border-gold-500/20">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <div className="p-1 bg-green-900/30 rounded">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                        </div>
                        <span className="text-green-400">{auf.responses.filter(r => r.status === 'COMING').length}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <div className="p-1 bg-red-900/30 rounded">
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        </div>
                        <span className="text-red-400">{auf.responses.filter(r => r.status === 'NOT_COMING').length}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <div className="p-1 bg-yellow-900/30 rounded">
                          <HelpCircle className="h-3.5 w-3.5 text-yellow-400" />
                        </div>
                        <span className="text-yellow-400">{auf.responses.filter(r => r.status === 'UNSURE').length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <Card className="bg-dark-800/40 border-gold-500/20">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-lg">Noch keine Aufstellungen erstellt</p>
                <p className="text-gray-500 text-sm mt-1">Erstelle die erste Aufstellung für deine Familia</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Details */}
        {selectedAufstellung && aufstellungDetails && (
          <div className="space-y-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <MapPin className="h-6 w-6 text-gold-500" />
                Details
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedAufstellung(null)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* Header Card */}
              <Card className="bg-gradient-to-br from-dark-800/80 to-dark-900/80 border-gold-500/30 shadow-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-gold-500/5 to-transparent"></div>
                <CardHeader className="relative border-b border-gold-500/20">
                  <CardTitle className="text-2xl text-gold-300 mb-2">{aufstellungDetails.reason}</CardTitle>
                  <div className="flex items-center gap-4 text-gray-300">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gold-400" />
                      {formatDateTime(aufstellungDetails.date).date}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gold-400" />
                      {formatDateTime(aufstellungDetails.date).time} Uhr
                    </span>
                  </div>
                  <CardDescription className="mt-2 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Erstellt von {getDisplayName(aufstellungDetails.createdBy)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative pt-6 space-y-6">
                  {/* Meine Reaktion */}
                  {!isDeadlinePassed(aufstellungDetails.deadline) && (
                    <div className="bg-dark-700/30 p-4 rounded-lg border border-gold-500/20">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-gold-500" />
                        Deine Reaktion
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        <Button
                          variant={getMyResponse(aufstellungDetails)?.status === 'COMING' ? 'default' : 'outline'}
                          className={`h-12 ${
                            getMyResponse(aufstellungDetails)?.status === 'COMING'
                              ? 'bg-green-600 hover:bg-green-700 border-green-500 shadow-lg shadow-green-500/20'
                              : 'border-green-500/30 hover:border-green-500 hover:bg-green-900/20'
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
                          className={`h-12 ${
                            getMyResponse(aufstellungDetails)?.status === 'NOT_COMING'
                              ? 'bg-red-600 hover:bg-red-700 border-red-500 shadow-lg shadow-red-500/20'
                              : 'border-red-500/30 hover:border-red-500 hover:bg-red-900/20'
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
                          className={`h-12 ${
                            getMyResponse(aufstellungDetails)?.status === 'UNSURE'
                              ? 'bg-yellow-600 hover:bg-yellow-700 border-yellow-500 shadow-lg shadow-yellow-500/20'
                              : 'border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-900/20'
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
                    <div className="bg-dark-700/30 p-4 rounded-lg border border-gold-500/20">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-gold-500" />
                        Übersicht
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="group relative overflow-hidden bg-gradient-to-br from-green-900/40 to-green-800/20 p-4 rounded-lg border border-green-500/30 hover:border-green-500/50 transition-all">
                          <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/10 to-green-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="relative">
                            <CheckCircle2 className="h-5 w-5 text-green-400 mb-2" />
                            <div className="text-3xl font-bold text-green-400 mb-1">
                              {aufstellungDetails.stats.coming}
                            </div>
                            <div className="text-xs text-green-300/70 uppercase tracking-wide">Kommen</div>
                          </div>
                        </div>
                        <div className="group relative overflow-hidden bg-gradient-to-br from-red-900/40 to-red-800/20 p-4 rounded-lg border border-red-500/30 hover:border-red-500/50 transition-all">
                          <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="relative">
                            <XCircle className="h-5 w-5 text-red-400 mb-2" />
                            <div className="text-3xl font-bold text-red-400 mb-1">
                              {aufstellungDetails.stats.notComing}
                            </div>
                            <div className="text-xs text-red-300/70 uppercase tracking-wide">Nicht</div>
                          </div>
                        </div>
                        <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 p-4 rounded-lg border border-yellow-500/30 hover:border-yellow-500/50 transition-all">
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="relative">
                            <HelpCircle className="h-5 w-5 text-yellow-400 mb-2" />
                            <div className="text-3xl font-bold text-yellow-400 mb-1">
                              {aufstellungDetails.stats.unsure}
                            </div>
                            <div className="text-xs text-yellow-300/70 uppercase tracking-wide">Unsicher</div>
                          </div>
                        </div>
                        <div className="group relative overflow-hidden bg-gradient-to-br from-orange-900/40 to-orange-800/20 p-4 rounded-lg border border-orange-500/30 hover:border-orange-500/50 transition-all">
                          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
                        <div className="bg-dark-700/30 p-4 rounded-lg border border-green-500/30">
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
                                  className="group flex items-center gap-2 bg-green-900/20 hover:bg-green-900/30 border border-green-500/30 p-3 rounded-lg text-sm text-green-200 transition-colors"
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
                        <div className="bg-dark-700/30 p-4 rounded-lg border border-red-500/30">
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
                                  className="group flex items-center gap-2 bg-red-900/20 hover:bg-red-900/30 border border-red-500/30 p-3 rounded-lg text-sm text-red-200 transition-colors"
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
                        <div className="bg-dark-700/30 p-4 rounded-lg border border-yellow-500/30">
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
                                  className="group flex items-center gap-2 bg-yellow-900/20 hover:bg-yellow-900/30 border border-yellow-500/30 p-3 rounded-lg text-sm text-yellow-200 transition-colors"
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
                          <div className="bg-dark-700/30 p-4 rounded-lg border border-orange-500/30">
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
                                  className="group flex items-center gap-2 bg-orange-900/20 hover:bg-orange-900/30 border border-orange-500/30 p-3 rounded-lg text-sm text-orange-200 transition-colors"
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
                    <div className="bg-dark-700/30 p-4 rounded-lg border border-gold-500/20 space-y-3">
                      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-gold-500" />
                        Admin-Aktionen
                      </h3>
                      {isDeadlinePassed(aufstellungDetails.deadline) &&
                        aufstellungDetails.stats &&
                        aufstellungDetails.stats.noResponse > 0 && (
                          <Button
                            variant="destructive"
                            className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg"
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
    </div>
  )
}

