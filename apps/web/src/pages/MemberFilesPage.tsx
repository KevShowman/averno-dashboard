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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { Badge } from '../components/ui/badge'
import { FileText, Plus, Trash2, Calendar, Archive, ArchiveRestore, TrendingUp, AlertCircle } from 'lucide-react'
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

  // Alle User abrufen (für die Liste)
  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users')
      return response.data
    },
  })

  // Alle Akten abrufen
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

  // User mit längster Zeit ohne Uprank
  const { data: pendingUpranks } = useQuery<MemberFile[]>({
    queryKey: ['member-files-uprank-pending'],
    queryFn: async () => {
      const response = await api.get('/member-files/uprank-pending')
      return response.data
    },
  })

  // Ausgewählte Akte
  const { data: selectedFile } = useQuery<MemberFile>({
    queryKey: ['member-file', selectedUserId],
    enabled: !!selectedUserId,
    queryFn: async () => {
      const response = await api.get(`/member-files/${selectedUserId}`)
      return response.data
    },
  })

  // Eintrag hinzufügen
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

  // Eintrag löschen
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

  // Uprank aktualisieren
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

  // Archivieren/Wiederherstellen
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
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'NEGATIVE':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getEntryLabel = (type: string) => {
    switch (type) {
      case 'POSITIVE':
        return 'Positiv'
      case 'NEGATIVE':
        return 'Negativ'
      default:
        return 'Neutral'
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
      <div className="container mx-auto p-6">
        <div className="text-center text-gray-400">Lade Akten...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Aktensystem
          </h1>
          <p className="text-gray-400">Mitglieder-Akten und Uprank-Tracking</p>
        </div>
        <Button
          onClick={() => setShowArchived(!showArchived)}
          variant="outline"
        >
          {showArchived ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
          {showArchived ? 'Aktive Akten' : 'Archivierte Akten'}
        </Button>
      </header>

      {/* Uprank-Pending Liste */}
      {!showArchived && pendingUpranks && pendingUpranks.length > 0 && (
        <Card className="lasanta-card border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Uprank-Kandidaten
            </CardTitle>
            <CardDescription className="text-gray-400">
              User mit längster Zeit seit letztem Uprank
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingUpranks.slice(0, 5).map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between bg-black/40 border border-yellow-500/30 rounded-lg p-3 cursor-pointer hover:bg-black/60 transition-colors"
                  onClick={() => setSelectedUserId(file.userId)}
                >
                  <div className="flex items-center gap-3">
                    {file.user.avatarUrl ? (
                      <img
                        src={file.user.avatarUrl}
                        alt={file.user.username}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {file.user.username[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">{getUserDisplayName(file.user)}</p>
                      <p className="text-xs text-gray-400">{file.user.role}</p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    {file.daysSinceUprank} Tage
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* User-Liste */}
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white">Mitglieder</CardTitle>
            <CardDescription className="text-gray-400">
              {allUsers?.length || 0} Mitglieder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {allUsers?.map((user: any) => {
                const userFile = files?.find((f) => f.userId === user.id)
                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between bg-black/40 border rounded-lg p-3 cursor-pointer hover:bg-black/60 transition-colors ${
                      selectedUserId === user.id ? 'border-primary' : 'border-primary/30'
                    }`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                          {user.username[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">{getUserDisplayName(user)}</p>
                        <p className="text-xs text-gray-400">{userFile?.entries.length || 0} Einträge</p>
                      </div>
                    </div>
                    {userFile?.isArchived && (
                      <Badge className="bg-gray-500/20 text-gray-400">Archiviert</Badge>
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
            <Card className="lasanta-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedFile.user.avatarUrl ? (
                      <img
                        src={selectedFile.user.avatarUrl}
                        alt={selectedFile.user.username}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {selectedFile.user.username[0]}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-white">{getUserDisplayName(selectedFile.user)}</CardTitle>
                      <CardDescription className="text-gray-400">{selectedFile.user.role}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={uprankDialogOpen} onOpenChange={setUprankDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Uprank
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="lasanta-card">
                        <DialogHeader>
                          <DialogTitle className="text-white">Letzter Uprank</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Setze das Datum des letzten Upranks für {getUserDisplayName(selectedFile.user)}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div>
                            <Label htmlFor="uprank-date" className="text-gray-300">
                              Datum
                            </Label>
                            <Input
                              id="uprank-date"
                              type="date"
                              value={uprankDate}
                              onChange={(e) => setUprankDate(e.target.value)}
                              className="bg-black/40 border-primary/30 text-white"
                            />
                          </div>
                          <Button
                            onClick={() => updateUprankMutation.mutate()}
                            disabled={!uprankDate || updateUprankMutation.isPending}
                            className="w-full"
                          >
                            Speichern
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {selectedFile.isArchived ? (
                      <Button
                        onClick={() => restoreMutation.mutate(selectedFile.userId)}
                        variant="outline"
                        size="sm"
                        disabled={restoreMutation.isPending}
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
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archivieren
                      </Button>
                    )}
                  </div>
                </div>

                {selectedFile.lastUprankDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                    <Calendar className="h-4 w-4" />
                    Letzter Uprank: {new Date(selectedFile.lastUprankDate).toLocaleDateString('de-DE')}
                    {' '}
                    ({formatDistanceToNow(new Date(selectedFile.lastUprankDate), { addSuffix: true, locale: de })})
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-semibold">Einträge</h3>
                  <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Eintrag hinzufügen
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="lasanta-card">
                      <DialogHeader>
                        <DialogTitle className="text-white">Neuer Eintrag</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          Füge einen neuen Eintrag zur Akte hinzu
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <Label htmlFor="entry-type" className="text-gray-300">
                            Typ
                          </Label>
                          <Select value={entryType} onValueChange={(value: any) => setEntryType(value)}>
                            <SelectTrigger className="bg-black/40 border-primary/30 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="POSITIVE">Positiv</SelectItem>
                              <SelectItem value="NEGATIVE">Negativ</SelectItem>
                              <SelectItem value="NEUTRAL">Neutral</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="entry-content" className="text-gray-300">
                            Inhalt
                          </Label>
                          <Textarea
                            id="entry-content"
                            value={entryContent}
                            onChange={(e) => setEntryContent(e.target.value)}
                            placeholder="Beschreibe den Vorfall oder die Beobachtung..."
                            rows={4}
                            className="bg-black/40 border-primary/30 text-white"
                          />
                        </div>
                        <Button
                          onClick={() => addEntryMutation.mutate()}
                          disabled={!entryContent.trim() || addEntryMutation.isPending}
                          className="w-full"
                        >
                          Hinzufügen
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {selectedFile.entries.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      Keine Einträge vorhanden
                    </div>
                  ) : (
                    selectedFile.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-black/40 border border-primary/30 rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <Badge className={getEntryBadgeColor(entry.type)}>
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
                        <div className="flex items-center justify-between text-xs text-gray-400">
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
            <Card className="lasanta-card">
              <CardContent className="flex items-center justify-center h-[400px]">
                <div className="text-center text-gray-400">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                  <p>Wähle ein Mitglied aus, um die Akte anzuzeigen</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

