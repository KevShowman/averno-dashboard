import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Calendar, X, Search, User, AlertTriangle, Shield, ChevronRight, CalendarRange, FileText } from 'lucide-react'
import { usersApi } from '../lib/api'
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
  type?: 'wochenabgabe' | 'aufstellung'
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
  type = 'wochenabgabe',
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

  const accentColor = type === 'aufstellung' ? 'purple' : 'cyan'
  const gradientFrom = type === 'aufstellung' ? 'from-purple-600' : 'from-cyan-600'
  const gradientTo = type === 'aufstellung' ? 'to-violet-600' : 'to-blue-600'
  const borderColor = type === 'aufstellung' ? 'border-purple-500/30' : 'border-cyan-500/30'
  const glowFrom = type === 'aufstellung' ? 'from-purple-600/20' : 'from-cyan-600/20'
  const glowVia = type === 'aufstellung' ? 'via-violet-500/20' : 'via-blue-500/20'
  const headerBg = type === 'aufstellung' ? 'from-purple-900/50 via-violet-800/30' : 'from-cyan-900/50 via-blue-800/30'
  const iconColor = type === 'aufstellung' ? 'text-purple-400' : 'text-cyan-400'
  const focusBorder = type === 'aufstellung' ? 'focus:border-purple-500 focus:ring-purple-500/20' : 'focus:border-cyan-500 focus:ring-cyan-500/20'
  const shadowColor = type === 'aufstellung' ? 'shadow-purple-500/25 hover:shadow-purple-500/40' : 'shadow-cyan-500/25 hover:shadow-cyan-500/40'

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl relative">
        {/* Glow Effect */}
        <div className={`absolute inset-0 bg-gradient-to-r ${glowFrom} ${glowVia} ${glowFrom} blur-xl rounded-2xl`} />
        
        <Card className={`relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 ${borderColor} shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto`}>
          {/* Header mit Gradient */}
          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-r ${headerBg} to-transparent`} />
            <CardHeader className="relative pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-xl shadow-lg ${shadowColor.split(' ')[0]}`}>
                    <Shield className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-white">
                      Ausschluss erstellen
                    </CardTitle>
                    <CardDescription className={`${type === 'aufstellung' ? 'text-purple-200/70' : 'text-cyan-200/70'} mt-1`}>
                      {type === 'aufstellung' 
                        ? 'Von Aufstellungen ausschließen'
                        : 'Von Wochenabgabe ausschließen'
                      }
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
          </div>
          
          <CardContent className="pt-2 pb-6 space-y-5">
            {/* User Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <User className={`h-4 w-4 ${iconColor}`} />
                Benutzer auswählen
              </label>
              
              {!selectedUser ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Name eingeben..."
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className={`pl-10 bg-gray-800/50 border-gray-700 ${focusBorder} text-white h-11`}
                      disabled={isLoading}
                    />
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border border-gray-700 rounded-xl bg-gray-800/80 backdrop-blur-sm divide-y divide-gray-700/50">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className={`w-full text-left p-3 hover:bg-${accentColor}-500/10 transition-colors flex items-center gap-3`}
                        >
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientFrom}/20 ${gradientTo}/20 flex items-center justify-center`}>
                            <User className={`h-5 w-5 ${iconColor}`} />
                          </div>
                          <div>
                            <div className="text-white font-medium">{getDisplayName(user)}</div>
                            <div className="text-gray-400 text-sm">
                              {user.icFirstName && user.icLastName 
                                ? `${user.icFirstName} ${user.icLastName}`
                                : 'Kein IC-Name'
                              }
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-500 ml-auto" />
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {isSearching && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm p-2">
                      <div className={`h-4 w-4 border-2 border-${accentColor}-500/30 border-t-${accentColor}-500 rounded-full animate-spin`} />
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

            {/* Reason */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <FileText className={`h-4 w-4 ${iconColor}`} />
                Grund für den Ausschluss
              </label>
              <Textarea
                className={`w-full p-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${focusBorder} resize-none transition-all`}
                rows={3}
                placeholder="Beschreibe den Grund..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Calendar className={`h-4 w-4 ${iconColor}`} />
                  Von
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isLoading}
                  className={`bg-gray-800/50 border-gray-700 ${focusBorder} text-white h-11 [color-scheme:dark]`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <CalendarRange className={`h-4 w-4 ${iconColor}`} />
                  Bis <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isLoading}
                  className={`bg-gray-800/50 border-gray-700 ${focusBorder} text-white h-11 [color-scheme:dark]`}
                />
              </div>
            </div>

            {/* Info */}
            <div className={`bg-gradient-to-r ${type === 'aufstellung' ? 'from-purple-900/30 to-violet-900/20 border-purple-500/30' : 'from-cyan-900/30 to-blue-900/20 border-cyan-500/30'} border p-4 rounded-xl`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
                <div className="text-sm">
                  <p className={`${type === 'aufstellung' ? 'text-purple-300' : 'text-cyan-300'} font-medium mb-1`}>Hinweis</p>
                  <p className="text-gray-300/80">
                    {type === 'aufstellung'
                      ? 'Der Benutzer wird von Aufstellungen ausgeschlossen und nicht automatisch sanktioniert.'
                      : 'Der Benutzer wird von der Wochenabgabe ausgeschlossen.'
                    }
                    {!endDate && ' Ohne Enddatum ist der Ausschluss permanent.'}
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
                className="flex-1 h-12 border-gray-600 hover:bg-gray-800 hover:border-gray-500 text-gray-300"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isLoading || !selectedUser || !reason.trim() || !startDate}
                className={`flex-1 h-12 bg-gradient-to-r ${gradientFrom} ${gradientTo} hover:opacity-90 text-white font-semibold shadow-lg ${shadowColor} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Erstelle...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Ausschluss erstellen
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
