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
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

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
  const { user } = useAuth()
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

      {/* Ausstehende Benachrichtigungen */}
      {myPending && myPending.length > 0 && (
        <Card className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-600/50">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-400">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Du hast {myPending.length} ausstehende Aufstellung{myPending.length !== 1 ? 'en' : ''}
            </CardTitle>
            <CardDescription>Bitte reagiere so schnell wie möglich!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {myPending.map((auf: Aufstellung) => {
              const { date, time } = formatDateTime(auf.date)
              return (
                <div
                  key={auf.id}
                  className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg cursor-pointer hover:bg-dark-700/50"
                  onClick={() => setSelectedAufstellung(auf.id)}
                >
                  <div>
                    <div className="text-white font-medium">{auf.reason}</div>
                    <div className="text-gray-400 text-sm">
                      {date} um {time} Uhr
                    </div>
                  </div>
                  <Button variant="lasanta" size="sm">
                    Jetzt reagieren
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {canManageAufstellungen && (
        <Card className="bg-dark-800/50 border-gold-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Neue Aufstellung</CardTitle>
              <Button
                variant="lasanta"
                size="sm"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {showCreateForm ? 'Abbrechen' : 'Erstellen'}
              </Button>
            </div>
          </CardHeader>
          {showCreateForm && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Datum</label>
                  <Input
                    type="date"
                    value={createData.date}
                    onChange={(e) => setCreateData({ ...createData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Uhrzeit</label>
                  <Input
                    type="time"
                    value={createData.time}
                    onChange={(e) => setCreateData({ ...createData, time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Grund / Ort</label>
                <Textarea
                  value={createData.reason}
                  onChange={(e) => setCreateData({ ...createData, reason: e.target.value })}
                  placeholder="z.B. Casa Meeting, Routenplanung..."
                  rows={3}
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                variant="lasanta"
                className="w-full"
              >
                Aufstellung erstellen & Discord benachrichtigen
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Liste der Aufstellungen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aufstellungen Liste */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Alle Aufstellungen</h2>
          {aufstellungen && aufstellungen.length > 0 ? (
            aufstellungen.map((auf: Aufstellung) => {
              const { date, time } = formatDateTime(auf.date)
              const myResponse = getMyResponse(auf)
              const deadlinePassed = isDeadlinePassed(auf.deadline)

              return (
                <Card
                  key={auf.id}
                  className={`bg-dark-800/50 border-gold-500/20 cursor-pointer hover:border-gold-500/50 transition-colors ${
                    selectedAufstellung === auf.id ? 'border-gold-500' : ''
                  }`}
                  onClick={() => setSelectedAufstellung(auf.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-accent" />
                          {auf.reason}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Erstellt von {auf.createdBy.icFirstName} {auf.createdBy.icLastName}
                        </CardDescription>
                      </div>
                      {deadlinePassed && (
                        <Badge variant="destructive" className="text-xs">
                          Abgelaufen
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center text-gray-300">
                      <Calendar className="mr-2 h-4 w-4 text-accent" />
                      {date}
                      <Clock className="ml-4 mr-2 h-4 w-4 text-accent" />
                      {time} Uhr
                    </div>

                    {/* Meine Reaktion */}
                    {myResponse ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Deine Antwort:</span>
                        {myResponse.status === 'COMING' && (
                          <Badge variant="outline" className="text-green-500 border-green-500">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Komme
                          </Badge>
                        )}
                        {myResponse.status === 'NOT_COMING' && (
                          <Badge variant="outline" className="text-red-500 border-red-500">
                            <XCircle className="mr-1 h-3 w-3" />
                            Komme nicht
                          </Badge>
                        )}
                        {myResponse.status === 'UNSURE' && (
                          <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                            <HelpCircle className="mr-1 h-3 w-3" />
                            Unsicher
                          </Badge>
                        )}
                      </div>
                    ) : (
                      !deadlinePassed && (
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Noch nicht reagiert
                        </Badge>
                      )
                    )}

                    {/* Statistik */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center text-green-500">
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        {auf.responses.filter(r => r.status === 'COMING').length}
                      </div>
                      <div className="flex items-center text-red-500">
                        <XCircle className="mr-1 h-4 w-4" />
                        {auf.responses.filter(r => r.status === 'NOT_COMING').length}
                      </div>
                      <div className="flex items-center text-yellow-500">
                        <HelpCircle className="mr-1 h-4 w-4" />
                        {auf.responses.filter(r => r.status === 'UNSURE').length}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <Card className="bg-dark-800/50 border-gold-500/20">
              <CardContent className="py-8 text-center text-gray-400">
                Noch keine Aufstellungen erstellt
              </CardContent>
            </Card>
          )}
        </div>

        {/* Details */}
        {selectedAufstellung && aufstellungDetails && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Details</h2>
            <Card className="bg-dark-800/50 border-gold-500/20">
              <CardHeader>
                <CardTitle className="text-white">{aufstellungDetails.reason}</CardTitle>
                <CardDescription>
                  {formatDateTime(aufstellungDetails.date).date} um{' '}
                  {formatDateTime(aufstellungDetails.date).time} Uhr
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Meine Reaktion */}
                {!isDeadlinePassed(aufstellungDetails.deadline) && (
                  <div>
                    <h3 className="text-white font-medium mb-3">Deine Reaktion</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={
                          getMyResponse(aufstellungDetails)?.status === 'COMING'
                            ? 'default'
                            : 'outline'
                        }
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() =>
                          respondMutation.mutate({
                            id: selectedAufstellung,
                            status: 'COMING',
                          })
                        }
                        disabled={respondMutation.isPending}
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Komme
                      </Button>
                      <Button
                        variant={
                          getMyResponse(aufstellungDetails)?.status === 'NOT_COMING'
                            ? 'default'
                            : 'outline'
                        }
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() =>
                          respondMutation.mutate({
                            id: selectedAufstellung,
                            status: 'NOT_COMING',
                          })
                        }
                        disabled={respondMutation.isPending}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Nicht
                      </Button>
                      <Button
                        variant={
                          getMyResponse(aufstellungDetails)?.status === 'UNSURE'
                            ? 'default'
                            : 'outline'
                        }
                        className="bg-yellow-600 hover:bg-yellow-700"
                        onClick={() =>
                          respondMutation.mutate({
                            id: selectedAufstellung,
                            status: 'UNSURE',
                          })
                        }
                        disabled={respondMutation.isPending}
                      >
                        <HelpCircle className="mr-1 h-4 w-4" />
                        Unsicher
                      </Button>
                    </div>
                  </div>
                )}

                {/* Statistik */}
                {aufstellungDetails.stats && (
                  <div>
                    <h3 className="text-white font-medium mb-3">Übersicht</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-dark-700/50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-green-500">
                          {aufstellungDetails.stats.coming}
                        </div>
                        <div className="text-sm text-gray-400">Kommen</div>
                      </div>
                      <div className="bg-dark-700/50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-red-500">
                          {aufstellungDetails.stats.notComing}
                        </div>
                        <div className="text-sm text-gray-400">Nicht</div>
                      </div>
                      <div className="bg-dark-700/50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-500">
                          {aufstellungDetails.stats.unsure}
                        </div>
                        <div className="text-sm text-gray-400">Unsicher</div>
                      </div>
                      <div className="bg-dark-700/50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-orange-500">
                          {aufstellungDetails.stats.noResponse}
                        </div>
                        <div className="text-sm text-gray-400">Keine Reaktion</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* User ohne Reaktion */}
                {aufstellungDetails.usersWithoutResponse &&
                  aufstellungDetails.usersWithoutResponse.length > 0 && (
                    <div>
                      <h3 className="text-white font-medium mb-3 flex items-center">
                        <UserX className="mr-2 h-4 w-4 text-orange-500" />
                        Keine Reaktion ({aufstellungDetails.usersWithoutResponse.length})
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {aufstellungDetails.usersWithoutResponse.map((u: any) => (
                          <div
                            key={u.id}
                            className="bg-dark-700/50 p-2 rounded text-sm text-gray-300"
                          >
                            {u.icFirstName} {u.icLastName}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Admin Aktionen */}
                {canManageAufstellungen && (
                  <div className="space-y-2 pt-4 border-t border-gold-500/20">
                    {isDeadlinePassed(aufstellungDetails.deadline) &&
                      aufstellungDetails.stats &&
                      aufstellungDetails.stats.noResponse > 0 && (
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => sanctionMutation.mutate(selectedAufstellung)}
                          disabled={sanctionMutation.isPending}
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          {aufstellungDetails.stats.noResponse} User sanktionieren
                        </Button>
                      )}
                    <Button
                      variant="outline"
                      className="w-full text-red-500 border-red-500 hover:bg-red-500/10"
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
        )}
      </div>
    </div>
  )
}

