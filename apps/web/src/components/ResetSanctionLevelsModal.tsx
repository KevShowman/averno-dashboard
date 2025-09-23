import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Scale, X, AlertTriangle, RotateCcw, Search, User } from 'lucide-react'
import { weeklyDeliveryApi } from '../lib/api'

interface User {
  id: string
  username: string
  icFirstName?: string
  icLastName?: string
}

interface ResetSanctionLevelsModalProps {
  isOpen: boolean
  onClose: () => void
  onReset: (data: { userId: string; category: string }) => void
  isLoading?: boolean
}

const SANCTION_CATEGORIES = [
  { key: 'ABMELDUNG', name: 'Abmeldung' },
  { key: 'RESPEKTVERHALTEN', name: 'Respektverhalten' },
  { key: 'FUNKCHECK', name: 'Funkcheck' },
  { key: 'REAKTIONSPFLICHT', name: 'Reaktionspflicht' },
  { key: 'NICHT_BEZAHLT', name: 'Nicht bezahlt' },
  { key: 'NICHT_BEZAHLT_48H', name: 'Nicht bezahlt (48h)' },
]

export default function ResetSanctionLevelsModal({
  isOpen,
  onClose,
  onReset,
  isLoading = false,
}: ResetSanctionLevelsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchUser, setSearchUser] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // User suchen
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // Hier verwenden wir die Weekly Delivery API, da sie alle User zurückgibt
      const response = await weeklyDeliveryApi.getDeliveries()
      const allUsers = response.data.map((delivery: any) => delivery.user)
      
      // Deduplizieren und filtern
      const uniqueUsers = allUsers.filter((user: User, index: number, self: User[]) => 
        index === self.findIndex(u => u.id === user.id)
      )
      
      const filtered = uniqueUsers.filter((user: User) =>
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        (user.icFirstName && user.icFirstName.toLowerCase().includes(query.toLowerCase())) ||
        (user.icLastName && user.icLastName.toLowerCase().includes(query.toLowerCase()))
      )
      
      setSearchResults(filtered.slice(0, 10)) // Max 10 Ergebnisse
    } catch (error) {
      console.error('Fehler beim Suchen von Usern:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchUser)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchUser])

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    setSearchUser('')
    setSearchResults([])
  }

  const handleReset = () => {
    if (selectedUser && selectedCategory) {
      onReset({
        userId: selectedUser.id,
        category: selectedCategory,
      })
      // Reset form
      setSelectedCategory('')
      setSelectedUser(null)
      setSearchUser('')
    }
  }

  const handleClose = () => {
    onClose()
    // Reset form
    setSelectedCategory('')
    setSelectedUser(null)
    setSearchUser('')
    setSearchResults([])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md lasanta-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Sanktions-Level zurücksetzen
              </CardTitle>
              <CardDescription>
                Setze alle aktiven Sanktionen für einen User und eine Kategorie zurück
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* User Search */}
          <div>
            <label className="text-white block text-sm font-medium mb-2">
              Benutzer suchen
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Benutzername oder IC-Name eingeben..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-600 rounded-lg bg-gray-800">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="w-full text-left p-3 hover:bg-gray-700 border-b border-gray-700 last:border-b-0"
                  >
                    <div className="text-white font-medium">{user.username}</div>
                    <div className="text-gray-400 text-sm">
                      {user.icFirstName && user.icLastName 
                        ? `${user.icFirstName} ${user.icLastName}`
                        : 'Kein IC-Name verfügbar'
                      }
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {isSearching && (
              <div className="mt-2 text-gray-400 text-sm">Suche...</div>
            )}
          </div>

          {/* Selected User */}
          {selectedUser && (
            <div className="bg-green-900/20 border border-green-500/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-green-400" />
                <span className="text-green-300 font-medium">Ausgewählter Benutzer:</span>
              </div>
              <div className="text-white text-lg">{selectedUser.username}</div>
              <div className="text-green-200 text-sm">
                {selectedUser.icFirstName && selectedUser.icLastName 
                  ? `${selectedUser.icFirstName} ${selectedUser.icLastName}`
                  : 'Kein IC-Name verfügbar'
                }
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
                className="mt-2 text-red-400 hover:text-red-300"
              >
                Auswahl entfernen
              </Button>
            </div>
          )}

          {/* Warning */}
          <div className="bg-red-900/20 border border-red-500/20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="font-semibold text-red-300">Warnung:</span>
            </div>
            <div className="text-red-200 text-sm">
              Diese Aktion setzt ALLE aktiven Sanktionen für den ausgewählten User und die ausgewählte Kategorie zurück.
              Die Sanktionen werden als "Storniert" markiert und können nicht rückgängig gemacht werden.
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="text-white block text-sm font-medium mb-2">
              Sanktionskategorie auswählen
            </label>
            <div className="grid grid-cols-1 gap-2">
              {SANCTION_CATEGORIES.map((category) => (
                <Button
                  key={category.key}
                  variant={selectedCategory === category.key ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.key)}
                  disabled={isLoading}
                  className="text-left justify-start h-auto p-3"
                >
                  <Scale className="h-4 w-4 mr-2" />
                  <span>{category.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Selected Category Info */}
          {selectedCategory && (
            <div className="bg-yellow-900/20 border border-yellow-500/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="h-4 w-4 text-yellow-400" />
                <span className="font-semibold text-yellow-300">Ausgewählte Kategorie:</span>
              </div>
              <div className="text-white">
                {SANCTION_CATEGORIES.find(c => c.key === selectedCategory)?.name}
              </div>
              <div className="text-yellow-200 text-sm mt-1">
                Alle aktiven Sanktionen dieser Kategorie werden zurückgesetzt.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleReset}
              disabled={isLoading || !selectedCategory || !selectedUser}
              variant="destructive"
              className="flex-1"
            >
              {isLoading ? 'Setze zurück...' : 'Zurücksetzen'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
