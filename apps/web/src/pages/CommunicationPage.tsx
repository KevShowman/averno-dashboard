import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuthStore } from '../stores/auth'
import { Radio, MessageSquare, Pencil, Save, X } from 'lucide-react'
import { toast } from 'sonner'

export default function CommunicationPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [editingFunk, setEditingFunk] = useState(false)
  const [editingDarkChat, setEditingDarkChat] = useState(false)
  const [funkValue, setFunkValue] = useState('')
  const [darkChatValue, setDarkChatValue] = useState('')

  const isLeadership = user?.role && ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'].includes(user.role)

  // Daten abrufen
  const { data, isLoading } = useQuery({
    queryKey: ['communication'],
    queryFn: async () => {
      const response = await api.get('/communication')
      return response.data
    },
  })

  // Funk aktualisieren
  const updateFunkMutation = useMutation({
    mutationFn: async (funkFrequency: string) => {
      const response = await api.put('/communication/funk', { funkFrequency })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication'] })
      setEditingFunk(false)
      toast.success('Funk-Frequenz erfolgreich aktualisiert')
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren der Funk-Frequenz')
    },
  })

  // DarkChat aktualisieren
  const updateDarkChatMutation = useMutation({
    mutationFn: async (darkChatName: string) => {
      const response = await api.put('/communication/darkchat', { darkChatName })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication'] })
      setEditingDarkChat(false)
      toast.success('DarkChat-Name erfolgreich aktualisiert')
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren des DarkChat-Namens')
    },
  })

  const handleEditFunk = () => {
    setFunkValue(data?.funkFrequency || '')
    setEditingFunk(true)
  }

  const handleSaveFunk = () => {
    if (funkValue.trim()) {
      updateFunkMutation.mutate(funkValue.trim())
    }
  }

  const handleCancelFunk = () => {
    setEditingFunk(false)
    setFunkValue('')
  }

  const handleEditDarkChat = () => {
    setDarkChatValue(data?.darkChatName || '')
    setEditingDarkChat(true)
  }

  const handleSaveDarkChat = () => {
    if (darkChatValue.trim()) {
      updateDarkChatMutation.mutate(darkChatValue.trim())
    }
  }

  const handleCancelDarkChat = () => {
    setEditingDarkChat(false)
    setDarkChatValue('')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-gray-400">Lade Kommunikationsdaten...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Kommunikation</h1>
        <p className="text-gray-400">
          Aktuelle Funk-Frequenz und DarkChat für IC-Verwendung
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Funk-Frequenz */}
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Radio className="h-6 w-6 text-primary" />
              Funk-Frequenz
            </CardTitle>
            <CardDescription className="text-gray-400">
              Verwende diese Frequenz für die Familien-Kommunikation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingFunk ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="funk-frequency" className="text-gray-300">
                    Neue Frequenz
                  </Label>
                  <Input
                    id="funk-frequency"
                    value={funkValue}
                    onChange={(e) => setFunkValue(e.target.value)}
                    placeholder="z.B. 00100200321"
                    className="bg-black/40 border-primary/30 text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveFunk}
                    disabled={updateFunkMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Speichern
                  </Button>
                  <Button
                    onClick={handleCancelFunk}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-black/40 border border-primary/30 rounded-lg p-6 text-center">
                  <div className="text-4xl font-mono font-bold text-primary tracking-wider">
                    {data?.funkFrequency}
                  </div>
                </div>
                {isLeadership && (
                  <Button onClick={handleEditFunk} variant="outline" className="w-full">
                    <Pencil className="h-4 w-4 mr-2" />
                    Frequenz ändern
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* DarkChat */}
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              DarkChat
            </CardTitle>
            <CardDescription className="text-gray-400">
              Aktueller DarkChat-Name für verschlüsselte Kommunikation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingDarkChat ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="darkchat-name" className="text-gray-300">
                    Neuer DarkChat-Name
                  </Label>
                  <Input
                    id="darkchat-name"
                    value={darkChatValue}
                    onChange={(e) => setDarkChatValue(e.target.value)}
                    placeholder="z.B. LsCFuT25veRDc!2§"
                    className="bg-black/40 border-primary/30 text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveDarkChat}
                    disabled={updateDarkChatMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Speichern
                  </Button>
                  <Button
                    onClick={handleCancelDarkChat}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-black/40 border border-primary/30 rounded-lg p-6 text-center">
                  <div className="text-3xl font-mono font-bold text-primary break-all">
                    {data?.darkChatName}
                  </div>
                </div>
                {isLeadership && (
                  <Button onClick={handleEditDarkChat} variant="outline" className="w-full">
                    <Pencil className="h-4 w-4 mr-2" />
                    DarkChat ändern
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

