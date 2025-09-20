import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { User, Save } from 'lucide-react'
import { toast } from 'sonner'

interface IcNameModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
}

export default function IcNameModal({ isOpen, onClose, username }: IcNameModalProps) {
  const queryClient = useQueryClient()
  const [icFirstName, setIcFirstName] = useState('')
  const [icLastName, setIcLastName] = useState('')

  const updateIcNameMutation = useMutation({
    mutationFn: ({ icFirstName, icLastName }: { icFirstName: string; icLastName: string }) => 
      api.patch('/users/ic-name', { icFirstName, icLastName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-me'] })
      toast.success('IC-Name erfolgreich gespeichert!')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern des IC-Namens')
    },
  })

  const handleSave = () => {
    if (!icFirstName.trim() || !icLastName.trim()) {
      toast.error('Bitte gib sowohl Vorname als auch Nachname ein')
      return
    }

    updateIcNameMutation.mutate({ 
      icFirstName: icFirstName.trim(), 
      icLastName: icLastName.trim() 
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md lasanta-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <User className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Willkommen bei LaSanta Calavera!
          </CardTitle>
          <CardDescription className="text-gray-400">
            Hallo <span className="text-accent">{username}</span>!<br/>
            Bitte gib deinen IC-Namen (In-Character Name) an, der in den Listen verwendet wird.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              IC Vorname
            </label>
            <Input
              value={icFirstName}
              onChange={(e) => setIcFirstName(e.target.value)}
              placeholder="z.B. Miguel"
              className="w-full"
              onKeyPress={handleKeyPress}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              IC Nachname
            </label>
            <Input
              value={icLastName}
              onChange={(e) => setIcLastName(e.target.value)}
              placeholder="z.B. Rodriguez"
              className="w-full"
              onKeyPress={handleKeyPress}
            />
          </div>
          
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <p className="text-xs text-gray-400">
              <strong>Hinweis:</strong> Dein IC-Name wird in allen Listen und Berichten anstelle deines Discord-Namens verwendet. 
              Du kannst ihn später in den Einstellungen ändern.
            </p>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={updateIcNameMutation.isPending || !icFirstName.trim() || !icLastName.trim()}
              className="flex-1 lasanta-button-primary"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateIcNameMutation.isPending ? 'Speichern...' : 'Speichern'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
