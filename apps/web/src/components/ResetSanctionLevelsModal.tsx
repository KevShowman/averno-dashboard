import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Scale, X, AlertTriangle, RotateCcw, Search, User, ChevronRight } from 'lucide-react'
import { weeklyDeliveryApi } from '../lib/api'
import { getDisplayName } from '../lib/utils'

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg relative">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-orange-500/20 to-orange-600/20 blur-xl rounded-2xl" />
        
        <Card className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-orange-500/30 shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
          {/* Header mit Gradient */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-900/50 via-orange-800/30 to-transparent" />
            <CardHeader className="relative pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-orange-600 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
                    <RotateCcw className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-white">
                      Level zurücksetzen
                    </CardTitle>
                    <CardDescription className="text-orange-200/70 mt-1">
                      Sanktionslevel auf 0 setzen
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
          </div>
          
          <CardContent className="pt-2 pb-6 space-y-5">
            {/* User Search */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <User className="h-4 w-4 text-orange-400" />
                Benutzer auswählen
              </label>
              
              {!selectedUser ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      placeholder="Name eingeben..."
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className="pl-10 bg-zinc-800/50 border-zinc-700 focus:border-orange-500 focus:ring-orange-500/20 text-white h-11"
                      disabled={isLoading}
                    />
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border border-zinc-700 rounded-xl bg-zinc-800/80 backdrop-blur-sm divide-y divide-zinc-700/50">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className="w-full text-left p-3 hover:bg-orange-500/10 transition-colors flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-500/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-orange-400" />
                          </div>
                          <div>
                            <div className="text-white font-medium">{getDisplayName(user)}</div>
                            <div className="text-zinc-400 text-sm">
                              {user.icFirstName && user.icLastName 
                                ? `${user.icFirstName} ${user.icLastName}`
                                : 'Kein IC-Name'
                              }
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-zinc-500 ml-auto" />
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {isSearching && (
                    <div className="flex items-center gap-2 text-zinc-400 text-sm p-2">
                      <div className="h-4 w-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                      Suche...
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-500/30 p-4 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                      <User className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold text-lg">{selectedUser.username}</div>
                      <div className="text-green-300/80 text-sm">
                        {selectedUser.icFirstName && selectedUser.icLastName 
                          ? `${selectedUser.icFirstName} ${selectedUser.icLastName}`
                          : 'Kein IC-Name verfügbar'
                        }
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUser(null)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Category Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Scale className="h-4 w-4 text-orange-400" />
                Kategorie auswählen
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SANCTION_CATEGORIES.map((category) => {
                  const isSelected = selectedCategory === category.key
                  return (
                    <button
                      key={category.key}
                      onClick={() => setSelectedCategory(category.key)}
                      disabled={isLoading}
                      className={`text-left p-3 rounded-xl border transition-all duration-200 flex items-center gap-2 ${
                        isSelected
                          ? 'bg-orange-500/20 border-orange-500/50 shadow-lg shadow-orange-500/10'
                          : 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/50'
                      }`}
                    >
                      <Scale className={`h-4 w-4 ${isSelected ? 'text-orange-400' : 'text-zinc-500'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-orange-300' : 'text-white'}`}>
                        {category.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Warning */}
            <div className="bg-gradient-to-r from-red-900/30 to-orange-900/20 border border-red-500/30 p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-red-300 font-medium mb-1">Achtung!</p>
                  <p className="text-red-200/80">
                    ALLE aktiven Sanktionen dieser Kategorie werden als "Storniert" markiert. 
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 h-12 border-zinc-600 hover:bg-zinc-800 hover:border-zinc-500 text-zinc-300"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleReset}
                disabled={isLoading || !selectedCategory || !selectedUser}
                className="flex-1 h-12 bg-gradient-to-r from-orange-600 to-orange-600 hover:from-orange-500 hover:to-orange-500 text-white font-semibold shadow-lg shadow-orange-500/25 transition-all duration-200 hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Setze zurück...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5" />
                    Zurücksetzen
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
