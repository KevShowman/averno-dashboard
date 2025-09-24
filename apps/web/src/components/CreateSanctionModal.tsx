import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Scale, X, AlertTriangle, Search, User } from 'lucide-react'
import { weeklyDeliveryApi } from '../lib/api'
import { getDisplayName } from '../lib/utils'

interface CreateSanctionModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: {
    userId: string
    category: string
    description: string
  }) => void
  isLoading?: boolean
}

interface User {
  id: string
  username: string
  icFirstName?: string
  icLastName?: string
}

interface SanctionCategory {
  key: string
  name: string
  description: string
  penalties: Array<{
    level: number
    amount?: number
    penalty?: string
  }>
}

const SANCTION_CATEGORIES: SanctionCategory[] = [
  {
    key: 'ABMELDUNG',
    name: 'Abmeldung',
    description: 'Unentschuldigte Abwesenheit',
    penalties: [
      { level: 1, amount: 50000 },
      { level: 2, amount: 150000 },
      { level: 3, amount: 300000 },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'RESPEKTVERHALTEN',
    name: 'Respektverhalten',
    description: 'Beleidigungen, Ignorieren von Anweisungen',
    penalties: [
      { level: 1, amount: 75000 },
      { level: 2, amount: 150000 },
      { level: 3, amount: 300000 },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'FUNKCHECK',
    name: 'Funkcheck',
    description: 'Mehrfaches Ignorieren von Funkchecks',
    penalties: [
      { level: 1, amount: 100000 },
      { level: 2, amount: 250000 },
      { level: 3, amount: 500000, penalty: 'Blood Out' },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'REAKTIONSPFLICHT',
    name: 'Reaktionspflicht',
    description: 'Nicht reagieren / Nicht anwesend trotz Zusage',
    penalties: [
      { level: 1, penalty: 'Joker' },
      { level: 2, amount: 250000 },
      { level: 3, amount: 500000, penalty: 'Blood Out' },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'NICHT_BEZAHLT',
    name: 'Nicht bezahlt',
    description: 'Wochenabgabe nicht bezahlt',
    penalties: [
      { level: 1, amount: 100000 },
      { level: 2, amount: 250000 },
      { level: 3, amount: 500000, penalty: 'Blood Out' },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'NICHT_BEZAHLT_48H',
    name: 'Nicht bezahlt (48h)',
    description: 'Wochenabgabe nicht innerhalb von 48 Stunden bezahlt',
    penalties: [
      { level: 1, amount: 200000 },
      { level: 2, amount: 400000 },
      { level: 3, amount: 500000, penalty: 'Blood Out' },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
]

export default function CreateSanctionModal({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
}: CreateSanctionModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [searchUser, setSearchUser] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const category = SANCTION_CATEGORIES.find(c => c.key === selectedCategory)

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await weeklyDeliveryApi.getDeliveries()
      const allUsers = response.data.map((delivery: any) => delivery.user)
      
      const uniqueUsers = allUsers.filter((user: User, index: number, self: User[]) => 
        index === self.findIndex(u => u.id === user.id)
      )
      
      const filtered = uniqueUsers.filter((user: User) =>
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        (user.icFirstName && user.icFirstName.toLowerCase().includes(query.toLowerCase())) ||
        (user.icLastName && user.icLastName.toLowerCase().includes(query.toLowerCase()))
      )
      
      setSearchResults(filtered.slice(0, 10))
    } catch (error) {
      console.error('Fehler beim Suchen von Usern:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

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

  const handleCreate = () => {
    if (selectedUser && selectedCategory && description.trim()) {
      onCreate({
        userId: selectedUser.id,
        category: selectedCategory,
        description: description.trim(),
      })
      // Reset form
      setSelectedCategory('')
      setDescription('')
      setSearchUser('')
      setSelectedUser(null)
      setSearchResults([])
    }
  }

  const handleClose = () => {
    onClose()
    // Reset form
    setSelectedCategory('')
    setDescription('')
    setSearchUser('')
    setSelectedUser(null)
    setSearchResults([])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl lasanta-card max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Neue Sanktion erstellen
              </CardTitle>
              <CardDescription>
                Erstelle eine neue Sanktion für einen Regelverstoß
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
          {/* User Selection */}
          <div>
            <label className="text-white block text-sm font-medium mb-2">
              Benutzer auswählen
            </label>
            <div className="space-y-2">
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
              
              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-gray-600 rounded-lg bg-gray-800">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className="w-full text-left p-3 hover:bg-gray-700 border-b border-gray-700 last:border-b-0"
                    >
                      <div className="text-white font-medium">{getDisplayName(user)}</div>
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
                <div className="text-gray-400 text-sm">Suche...</div>
              )}
              
              {selectedUser && (
                <div className="bg-green-900/20 border border-green-500/20 p-3 rounded-lg">
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
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="text-white block text-sm font-medium mb-2">
              Sanktionskategorie
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SANCTION_CATEGORIES.map((cat) => (
                <Button
                  key={cat.key}
                  variant={selectedCategory === cat.key ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedCategory(cat.key)
                  }}
                  disabled={isLoading}
                  className="text-left justify-start h-auto p-3"
                >
                  <div>
                    <div className="font-medium">{cat.name}</div>
                    <div className="text-xs opacity-75">{cat.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Auto Level Info */}
          {category && (
            <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-blue-400" />
                <span className="text-blue-300 font-medium">Automatische Level-Berechnung:</span>
              </div>
              <div className="text-white text-sm">
                Das Level wird automatisch basierend auf vorherigen Sanktionen derselben Kategorie 
                innerhalb der letzten 4 Wochen berechnet.
              </div>
              <div className="text-blue-200 text-xs mt-1">
                • Erste Sanktion: Level 1
                <br />
                • Wiederholung: Nächstes Level (max. Level 4)
                <br />
                • Nach 4 Wochen ohne Verstoß: Zurücksetzung auf Level 1
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-white block text-sm font-medium mb-2">
              Beschreibung des Verstoßes
            </label>
            <textarea
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Beschreibe den Regelverstoß..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

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
              onClick={handleCreate}
              disabled={isLoading || !selectedUser || !selectedCategory || !description.trim()}
              className="flex-1"
            >
              {isLoading ? 'Erstelle...' : 'Sanktion erstellen'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
