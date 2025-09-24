import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Calendar, X, Search, User, AlertTriangle } from 'lucide-react'
import { weeklyDeliveryApi, usersApi } from '../lib/api'
import { getDisplayName } from '../lib/utils'

interface CreateExclusionModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: {
    userId: string
    reason: string
    startDate: string
    endDate?: string
  }) => void
  isLoading?: boolean
}

interface User {
  id: string
  username: string
  icFirstName?: string
  icLastName?: string
}

export default function CreateExclusionModal({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
}: CreateExclusionModalProps) {
  const [searchUser, setSearchUser] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [reason, setReason] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const response = await usersApi.searchUsers(query)
      const allUsers = response.data
      setSearchResults(allUsers.slice(0, 10))
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
    if (selectedUser && reason.trim() && startDate) {
      onCreate({
        userId: selectedUser.id,
        reason: reason.trim(),
        startDate,
        endDate: endDate || undefined,
      })
      // Reset form
      setSelectedUser(null)
      setReason('')
      setStartDate('')
      setEndDate('')
      setSearchUser('')
      setSearchResults([])
    }
  }

  const handleClose = () => {
    onClose()
    // Reset form
    setSelectedUser(null)
    setReason('')
    setStartDate('')
    setEndDate('')
    setSearchUser('')
    setSearchResults([])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl lasanta-card max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-400" />
                Ausschluss erstellen
              </CardTitle>
              <CardDescription className="text-gray-400">
                Erstelle einen Ausschluss von der Wochenabgabe
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-white"
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

          {/* Reason */}
          <div>
            <label className="text-white block text-sm font-medium mb-2">
              Grund für den Ausschluss
            </label>
            <Textarea
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Beschreibe den Grund für den Ausschluss..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-white block text-sm font-medium mb-2">
                Startdatum (Pflichtfeld)
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isLoading}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="text-white block text-sm font-medium mb-2">
                Enddatum (Optional)
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isLoading}
                className="bg-gray-800 border-gray-600 text-white"
              />
              <div className="text-xs text-gray-400 mt-1">
                Leer lassen für permanenten Ausschluss
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-blue-400" />
              <span className="text-blue-300 font-medium">Hinweis:</span>
            </div>
            <div className="text-white text-sm">
              Der Benutzer wird von der Wochenabgabe ausgeschlossen. Bei einem permanenten Ausschluss 
              (ohne Enddatum) kann er später manuell wieder hinzugefügt werden.
            </div>
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
              disabled={isLoading || !selectedUser || !reason.trim() || !startDate}
              className="flex-1"
            >
              {isLoading ? 'Erstelle...' : 'Ausschluss erstellen'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
