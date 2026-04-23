import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useAuthStore } from '../stores/auth'
import { Radio, MessageSquare, Pencil, Save, X, Signal, Lock } from 'lucide-react'
import { toast } from 'sonner'

export default function CommunicationPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [editingFunk, setEditingFunk] = useState(false)
  const [editingDarkChat, setEditingDarkChat] = useState(false)
  const [funkValue, setFunkValue] = useState('')
  const [darkChatValue, setDarkChatValue] = useState('')

  const isLeadership = user?.role && ['PATRON', 'DON', 'CAPO', 'ADMIN'].includes(user.role)

  const { data, isLoading } = useQuery({
    queryKey: ['communication'],
    queryFn: async () => {
      const response = await api.get('/communication')
      return response.data
    },
  })

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

  const handleEditDarkChat = () => {
    setDarkChatValue(data?.darkChatName || '')
    setEditingDarkChat(true)
  }

  const handleSaveDarkChat = () => {
    if (darkChatValue.trim()) {
      updateDarkChatMutation.mutate(darkChatValue.trim())
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-zinc-400">Lade Kommunikationsdaten...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-orange-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
            <Signal className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Kommunikation</h1>
            <p className="text-zinc-400 mt-1">
              Aktuelle Funk-Frequenz und DarkChat für die Familie
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Funk-Frequenz */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-emerald-500/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Radio className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-white">Funk-Frequenz</CardTitle>
                <CardDescription className="text-zinc-400">
                  Für die Familien-Kommunikation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-4">
            {editingFunk ? (
              <div className="space-y-4">
                <Input
                  value={funkValue}
                  onChange={(e) => setFunkValue(e.target.value)}
                  placeholder="z.B. 00100200321"
                  className="bg-zinc-800/50 border-zinc-700 focus:border-emerald-500 text-white text-center text-2xl font-mono h-14"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveFunk}
                    disabled={updateFunkMutation.isPending}
                    className="flex-1 h-11 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-zinc-900"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Speichern
                  </Button>
                  <Button
                    onClick={() => setEditingFunk(false)}
                    variant="outline"
                    className="flex-1 h-11 border-zinc-600 hover:bg-zinc-800"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-zinc-800/50 border border-emerald-500/30 rounded-xl p-6 text-center">
                  <div className="text-4xl font-mono font-bold text-white tracking-wider">
                    {data?.funkFrequency}
                  </div>
                </div>
                {isLeadership && (
                  <Button 
                    onClick={handleEditFunk} 
                    variant="outline" 
                    className="w-full h-11 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Frequenz ändern
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* DarkChat */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-purple-500/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Lock className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-white">DarkChat</CardTitle>
                <CardDescription className="text-zinc-400">
                  Verschlüsselte Kommunikation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-4">
            {editingDarkChat ? (
              <div className="space-y-4">
                <Input
                  value={darkChatValue}
                  onChange={(e) => setDarkChatValue(e.target.value)}
                  placeholder="z.B. LsCFuT25veRDc!2§"
                  className="bg-zinc-800/50 border-zinc-700 focus:border-purple-500 text-white text-center text-xl font-mono h-14"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveDarkChat}
                    disabled={updateDarkChatMutation.isPending}
                    className="flex-1 h-11 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-zinc-900"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Speichern
                  </Button>
                  <Button
                    onClick={() => setEditingDarkChat(false)}
                    variant="outline"
                    className="flex-1 h-11 border-zinc-600 hover:bg-zinc-800"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-zinc-800/50 border border-purple-500/30 rounded-xl p-6 text-center">
                  <div className="text-3xl font-mono font-bold text-white break-all">
                    {data?.darkChatName}
                  </div>
                </div>
                {isLeadership && (
                  <Button 
                    onClick={handleEditDarkChat} 
                    variant="outline" 
                    className="w-full h-11 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    DarkChat ändern
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <MessageSquare className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Hinweis zur Kommunikation</h3>
              <p className="text-zinc-400 text-sm">
                Die Funk-Frequenz und der DarkChat-Name werden regelmäßig geändert. 
                Stelle sicher, dass du immer die aktuellen Daten verwendest. 
                Bei Fragen wende dich an die Leaderschaft.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
