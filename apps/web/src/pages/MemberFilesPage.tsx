import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { 
  FileText, 
  Plus, 
  Trash2, 
  Calendar, 
  Archive, 
  ArchiveRestore, 
  TrendingUp, 
  AlertCircle,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

interface FileEntry {
  id: string
  type: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  content: string
  createdBy: {
    id: string
    username: string
    icFirstName?: string
    icLastName?: string
  }
  createdAt: string
}

interface MemberFile {
  id: string
  userId: string
  lastUprankDate?: string
  isArchived: boolean
  archivedAt?: string
  user: {
    id: string
    username: string
    icFirstName?: string
    icLastName?: string
    role: string
    avatarUrl?: string
  }
  entries: FileEntry[]
  daysSinceUprank?: number
  neverUpranked?: boolean
}

export default function MemberFilesPage() {
  const queryClient = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [uprankDialogOpen, setUprankDialogOpen] = useState(false)
  const [entryType, setEntryType] = useState<'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'>('NEUTRAL')
  const [entryContent, setEntryContent] = useState('')
  const [uprankDate, setUprankDate] = useState('')

  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users')
      return response.data
    },
  })

  const { data: files, isLoading: filesLoading } = useQuery<MemberFile[]>({
    queryKey: ['member-files', showArchived],
    queryFn: async () => {
      const response = await api.get('/member-files', {
        params: { includeArchived: showArchived },
      })
      return response.data
    },
  })

  const isLoading = usersLoading || filesLoading

  const { data: pendingUpranks } = useQuery<MemberFile[]>({
    queryKey: ['member-files-uprank-pending'],
    queryFn: async () => {
      const response = await api.get('/member-files/uprank-pending')
      return response.data
    },
  })

  const { data: selectedFile } = useQuery<MemberFile>({
    queryKey: ['member-file', selectedUserId],
    enabled: !!selectedUserId,
    queryFn: async () => {
      const response = await api.get(`/member-files/${selectedUserId}`)
      return response.data
    },
  })

  const addEntryMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) return
      const response = await api.post(`/member-files/${selectedUserId}/entries`, {
        type: entryType,
        content: entryContent,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-files'] })
      queryClient.invalidateQueries({ queryKey: ['member-file'] })
      setEntryDialogOpen(false)
      setEntryContent('')
      toast.success('Eintrag erfolgreich hinzugefügt')
    },
    onError: () => {
      toast.error('Fehler beim Hinzufügen des Eintrags')
    },
  })

  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await api.delete(`/member-files/entries/${entryId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-files'] })
      queryClient.invalidateQueries({ queryKey: ['member-file'] })
      toast.success('Eintrag erfolgreich gelöscht')
    },
    onError: () => {
      toast.error('Fehler beim Löschen des Eintrags')
    },
  })

  const updateUprankMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !uprankDate) return
      const response = await api.patch(`/member-files/${selectedUserId}/uprank`, {
        lastUprankDate: uprankDate,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-files'] })
      queryClient.invalidateQueries({ queryKey: ['member-file'] })
      queryClient.invalidateQueries({ queryKey: ['member-files-uprank-pending'] })
      setUprankDialogOpen(false)
      setUprankDate('')
      toast.success('Uprank-Datum erfolgreich aktualisiert')
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren des Uprank-Datums')
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.patch(`/member-files/${userId}/archive`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-files'] })
      toast.success('Akte erfolgreich archiviert')
    },
    onError: () => {
      toast.error('Fehler beim Archivieren der Akte')
    },
  })

  const restoreMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.patch(`/member-files/${userId}/restore`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-files'] })
      toast.success('Akte erfolgreich wiederhergestellt')
    },
    onError: () => {
      toast.error('Fehler beim Wiederherstellen der Akte')
    },
  })

  const getEntryBadgeColor = (type: string) => {
    switch (type) {
      case 'POSITIVE':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'NEGATIVE':
        return 'bg-red-500/20 text-red-300 border-red-500/30'
      default:
        return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
    }
  }

  const getEntryLabel = (type: string) => {
    switch (type) {
      case 'POSITIVE': return 'Positiv'
      case 'NEGATIVE': return 'Negativ'
      default: return 'Neutral'
    }
  }

  const getUserDisplayName = (user: any) => {
    if (user.icFirstName && user.icLastName) {
      return `${user.icFirstName} ${user.icLastName}`
    }
    return user.username
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-zinc-400">Lade Akten...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header - Gold Theme */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-orange-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Aktensystem</h1>
              <p className="text-zinc-400 mt-1">
                Mitglieder-Akten und Uprank-Tracking
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowArchived(!showArchived)}
            variant="outline"
            className="border-zinc-700 hover:bg-zinc-800 hover:border-orange-500/50"
          >
            {showArchived ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
            {showArchived ? 'Aktive Akten' : 'Archivierte Akten'}
          </Button>
        </div>
      </div>

      {/* Uprank-Pending Liste */}
      {!showArchived && pendingUpranks && pendingUpranks.length > 0 && (
        <Card className="relative overflow-hidden bg-gradient-to-br from-orange-900/30 to-orange-900/20 border-orange-500/30">
          <CardHeader className="border-b border-orange-500/20">
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-400" />
              Uprank-Kandidaten
            </CardTitle>
            <CardDescription className="text-orange-200/60">
              User sortiert nach Zeit seit letztem Uprank (nie upgerankte zuerst)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {pendingUpranks.slice(0, 10).map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center justify-between rounded-xl p-3 cursor-pointer transition-colors ${
                    file.neverUpranked 
                      ? 'bg-red-900/20 border border-red-500/30 hover:bg-red-900/30' 
                      : 'bg-zinc-800/50 border border-orange-500/20 hover:bg-zinc-800/70'
                  }`}
                  onClick={() => setSelectedUserId(file.userId)}
                >
                  <div className="flex items-center gap-3">
                    {file.user.avatarUrl ? (
                      <img src={file.user.avatarUrl} alt={file.user.username} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        file.neverUpranked ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {file.user.username[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">{getUserDisplayName(file.user)}</p>
                      <p className="text-xs text-zinc-400">{file.user.role}</p>
                    </div>
                  </div>
                  {file.neverUpranked ? (
                    <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                      Nie upgerankt
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                      {file.daysSinceUprank} Tage
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* User-Liste */}
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-400" />
              Mitglieder
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {allUsers?.length || 0} Mitglieder
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {allUsers?.map((user: any) => {
                const userFile = files?.find((f) => f.userId === user.id)
                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-orange-950/20 transition-colors border-b border-zinc-800/50 ${
                      selectedUserId === user.id ? 'bg-orange-950/30 border-l-2 border-l-orange-500' : ''
                    }`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.username} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-bold">
                          {user.username[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">{getUserDisplayName(user)}</p>
                        <p className="text-xs text-zinc-500">{userFile?.entries.length || 0} Einträge</p>
                      </div>
                    </div>
                    {userFile?.isArchived && (
                      <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-xs">Archiviert</Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Akten-Details */}
        <div className="lg:col-span-2">
          {selectedFile ? (
            <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
              <CardHeader className="border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedFile.user.avatarUrl ? (
                      <img src={selectedFile.user.avatarUrl} alt={selectedFile.user.username} className="w-12 h-12 rounded-full" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-lg">
                        {selectedFile.user.username[0]}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-white">{getUserDisplayName(selectedFile.user)}</CardTitle>
                      <CardDescription className="text-zinc-400">{selectedFile.user.role}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setUprankDialogOpen(true)}
                      className="border-zinc-700 hover:bg-zinc-800"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Uprank
                    </Button>
                    {selectedFile.isArchived ? (
                      <Button
                        onClick={() => restoreMutation.mutate(selectedFile.userId)}
                        variant="outline"
                        size="sm"
                        disabled={restoreMutation.isPending}
                        className="border-zinc-700 hover:bg-zinc-800"
                      >
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Wiederherstellen
                      </Button>
                    ) : (
                      <Button
                        onClick={() => archiveMutation.mutate(selectedFile.userId)}
                        variant="outline"
                        size="sm"
                        disabled={archiveMutation.isPending}
                        className="border-zinc-700 hover:bg-zinc-800"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archivieren
                      </Button>
                    )}
                  </div>
                </div>

                {selectedFile.lastUprankDate && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400 mt-3 pt-3 border-t border-zinc-800">
                    <Calendar className="h-4 w-4" />
                    Letzter Uprank: {new Date(selectedFile.lastUprankDate).toLocaleDateString('de-DE')}
                    {' '}({formatDistanceToNow(new Date(selectedFile.lastUprankDate), { addSuffix: true, locale: de })})
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-semibold">Einträge</h3>
                  <Button 
                    size="sm"
                    onClick={() => setEntryDialogOpen(true)}
                    className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-zinc-900"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Eintrag hinzufügen
                  </Button>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {selectedFile.entries.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-zinc-600 mb-3" />
                      <p className="text-zinc-400">Keine Einträge vorhanden</p>
                    </div>
                  ) : (
                    selectedFile.entries.map((entry) => (
                      <div key={entry.id} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <Badge className={getEntryBadgeColor(entry.type)}>
                            {entry.type === 'POSITIVE' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {entry.type === 'NEGATIVE' && <XCircle className="h-3 w-3 mr-1" />}
                            {entry.type === 'NEUTRAL' && <Clock className="h-3 w-3 mr-1" />}
                            {getEntryLabel(entry.type)}
                          </Badge>
                          <Button
                            onClick={() => deleteEntryMutation.mutate(entry.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-white text-sm">{entry.content}</p>
                        <div className="flex items-center justify-between text-xs text-zinc-500">
                          <span>Von: {getUserDisplayName(entry.createdBy)}</span>
                          <span>{formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: de })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
                  <p className="text-zinc-400">Wähle ein Mitglied aus, um die Akte anzuzeigen</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Entry Dialog */}
      {entryDialogOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-orange-500/20 to-orange-600/20 blur-xl rounded-2xl pointer-events-none" />
            <Card className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-orange-500/30 shadow-2xl rounded-2xl overflow-hidden">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-900/50 via-orange-800/30 to-transparent pointer-events-none" />
                <CardHeader className="relative pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
                        <Plus className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-white">Neuer Eintrag</CardTitle>
                        <CardDescription className="text-orange-200/70 mt-1">
                          Füge einen neuen Eintrag zur Akte hinzu
                        </CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setEntryDialogOpen(false)} className="text-zinc-400 hover:text-white">
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
              </div>
              <CardContent className="pt-2 pb-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Typ</Label>
                  <Select value={entryType} onValueChange={(value: any) => setEntryType(value)}>
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POSITIVE">Positiv</SelectItem>
                      <SelectItem value="NEGATIVE">Negativ</SelectItem>
                      <SelectItem value="NEUTRAL">Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Inhalt</Label>
                  <Textarea
                    value={entryContent}
                    onChange={(e) => setEntryContent(e.target.value)}
                    placeholder="Beschreibe den Vorfall oder die Beobachtung..."
                    rows={4}
                    className="bg-zinc-800/50 border-zinc-700 text-white focus:border-orange-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setEntryDialogOpen(false)}
                    className="flex-1 h-11 border-zinc-600 hover:bg-zinc-800"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={() => addEntryMutation.mutate()}
                    disabled={!entryContent.trim() || addEntryMutation.isPending}
                    className="flex-1 h-11 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-zinc-900"
                  >
                    {addEntryMutation.isPending ? 'Wird hinzugefügt...' : 'Hinzufügen'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Uprank Dialog */}
      {uprankDialogOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 via-emerald-500/20 to-green-600/20 blur-xl rounded-2xl" />
            <Card className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-green-500/30 shadow-2xl rounded-2xl overflow-hidden">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-900/50 via-emerald-800/30 to-transparent" />
                <CardHeader className="relative pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-lg shadow-green-500/30">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-white">Letzter Uprank</CardTitle>
                        <CardDescription className="text-green-200/70 mt-1">
                          Setze das Datum des letzten Upranks
                        </CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setUprankDialogOpen(false)} className="text-zinc-400 hover:text-white">
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
              </div>
              <CardContent className="pt-2 pb-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Datum</Label>
                  <Input
                    type="date"
                    value={uprankDate}
                    onChange={(e) => setUprankDate(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-white h-11 focus:border-green-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setUprankDialogOpen(false)}
                    className="flex-1 h-11 border-zinc-600 hover:bg-zinc-800"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={() => updateUprankMutation.mutate()}
                    disabled={!uprankDate || updateUprankMutation.isPending}
                    className="flex-1 h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                  >
                    {updateUprankMutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
