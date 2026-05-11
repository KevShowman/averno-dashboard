import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog'
import { toast } from 'sonner'
import { hasRole, getDisplayName } from '../lib/utils'
import {
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Loader2,
  StickyNote,
  User,
  Clock,
  History,
} from 'lucide-react'
import { cn } from '../lib/utils'

interface NoteUser {
  id: string
  username: string
  icFirstName?: string
  icLastName?: string
}

interface Note {
  id: string
  content: string
  isArchived: boolean
  archivedAt?: string
  archivedBy?: NoteUser
  updatedAt: string
  updatedBy?: NoteUser
  createdById: string
  createdBy: NoteUser
  createdAt: string
}

interface NoteHistoryEntry {
  id: string
  content: string
  editedBy: NoteUser
  createdAt: string
}

export default function NotizenPage() {
  usePageTitle('Notizen')

  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [contentInput, setContentInput] = useState('')

  const [historyNote, setHistoryNote] = useState<Note | null>(null)

  const isLeadership = hasRole(user, ['PATRON', 'DON', 'CAPO', 'ADMIN'])

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ['notes'],
    queryFn: async () => {
      const res = await api.get('/notes')
      return res.data
    },
  })

  const { data: permissionData } = useQuery<{ hasPermission: boolean }>({
    queryKey: ['list-permission-me'],
    queryFn: async () => {
      const res = await api.get('/family-contacts/permissions/me')
      return res.data
    },
    enabled: !!user && !isLeadership,
  })

  const hasListPermission = isLeadership || permissionData?.hasPermission === true

  const { data: historyEntries = [], isLoading: historyLoading } = useQuery<NoteHistoryEntry[]>({
    queryKey: ['note-history', historyNote?.id],
    queryFn: async () => {
      const res = await api.get(`/notes/${historyNote!.id}/history`)
      return res.data
    },
    enabled: !!historyNote,
  })

  const canEditNote = (note: Note) => {
    if (!user) return false
    if (note.isArchived) return false
    if (user.id === note.createdById) return true
    if (hasListPermission) return true
    return false
  }

  const canArchiveNote = (note: Note) => {
    if (!user) return false
    if (user.id === note.createdById) return true
    if (hasListPermission) return true
    return false
  }

  const createMutation = useMutation({
    mutationFn: (content: string) => api.post('/notes', { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Notiz erstellt')
      closeDialog()
    },
    onError: () => toast.error('Fehler beim Erstellen der Notiz'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.put(`/notes/${id}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Notiz gespeichert')
      closeDialog()
    },
    onError: () => toast.error('Fehler beim Speichern der Notiz'),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notes/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
    onError: () => toast.error('Fehler beim Archivieren der Notiz'),
  })

  const openCreateDialog = () => {
    setEditingNote(null)
    setContentInput('')
    setDialogOpen(true)
  }

  const openEditDialog = (note: Note) => {
    setEditingNote(note)
    setContentInput(note.content)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingNote(null)
    setContentInput('')
  }

  const handleSubmit = () => {
    if (!contentInput.trim()) {
      toast.error('Notiz darf nicht leer sein')
      return
    }
    if (editingNote) {
      updateMutation.mutate({ id: editingNote.id, content: contentInput.trim() })
    } else {
      createMutation.mutate(contentInput.trim())
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const activeNotes = notes.filter((n) => !n.isArchived)
  const archivedNotes = notes.filter((n) => n.isArchived)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const wasEdited = (note: Note) =>
    note.updatedBy && new Date(note.updatedAt) > new Date(note.createdAt)

  const renderNote = (note: Note) => (
    <Card
      key={note.id}
      className={cn(
        'border-zinc-700/50 bg-zinc-800/50',
        note.isArchived && 'opacity-50 grayscale-[40%]',
      )}
    >
      <CardContent className="pt-4">
        <p className="whitespace-pre-wrap text-sm text-zinc-100 leading-relaxed">
          {note.content}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {getDisplayName(note.createdBy)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(note.createdAt)}
            </span>
            {wasEdited(note) && note.updatedBy && (
              <span className="flex items-center gap-1 text-zinc-500">
                <Pencil className="h-3 w-3" />
                bearbeitet von {getDisplayName(note.updatedBy)} · {formatDate(note.updatedAt)}
              </span>
            )}
            {note.isArchived && note.archivedBy && (
              <span className="flex items-center gap-1 text-zinc-500">
                <Archive className="h-3 w-3" />
                archiviert von {getDisplayName(note.archivedBy)}
                {note.archivedAt && ` · ${formatDate(note.archivedAt)}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-zinc-400 hover:text-zinc-100"
              onClick={() => setHistoryNote(note)}
              title="Verlauf anzeigen"
            >
              <History className="h-3.5 w-3.5" />
            </Button>
            {canEditNote(note) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-zinc-400 hover:text-zinc-100"
                onClick={() => openEditDialog(note)}
                title="Bearbeiten"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {canArchiveNote(note) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-zinc-400 hover:text-zinc-100"
                onClick={() => archiveMutation.mutate(note.id)}
                disabled={archiveMutation.isPending}
                title={note.isArchived ? 'Archivierung aufheben' : 'Archivieren'}
              >
                {note.isArchived ? (
                  <ArchiveRestore className="h-3.5 w-3.5" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <Card className="border-zinc-700/50 bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StickyNote className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Notizen</CardTitle>
          </div>
          <Button onClick={openCreateDialog} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Notiz hinzufügen
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <StickyNote className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">Noch keine Notizen vorhanden</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeNotes.map(renderNote)}
              {archivedNotes.length > 0 && (
                <>
                  {activeNotes.length > 0 && (
                    <div className="flex items-center gap-2 pt-2">
                      <div className="h-px flex-1 bg-zinc-700/50" />
                      <span className="text-xs text-zinc-500">Archiviert</span>
                      <div className="h-px flex-1 bg-zinc-700/50" />
                    </div>
                  )}
                  {archivedNotes.map(renderNote)}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? 'Notiz bearbeiten' : 'Notiz hinzufügen'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="note-content">Notizen</Label>
            <Textarea
              id="note-content"
              placeholder="Notiz eingeben..."
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isPending}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingNote ? 'Speichern' : 'Hinzufügen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={!!historyNote} onOpenChange={(open) => !open && setHistoryNote(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Bearbeitungsverlauf
            </DialogTitle>
          </DialogHeader>

          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : historyEntries.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              Keine Bearbeitungen vorhanden
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
              {historyEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3"
                >
                  <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
                    <User className="h-3 w-3" />
                    <span>{getDisplayName(entry.editedBy)}</span>
                    <span className="text-zinc-600">·</span>
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(entry.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-zinc-300 leading-relaxed">
                    {entry.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryNote(null)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
