import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Scale, X, AlertTriangle, Search, User, Gavel, FileText, ChevronRight, DollarSign, Skull } from 'lucide-react'
import { usersApi } from '../lib/api'
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
  {
    key: 'RESPEKTLOS_ZIVILISTEN',
    name: 'Respektlos gegenüber Zivilisten',
    description: 'Unhöfliches oder respektloses Verhalten gegenüber Zivilisten',
    penalties: [
      { level: 1, amount: 50000 },
      { level: 2, amount: 100000 },
      { level: 3, amount: 250000 },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'RESPEKTLOS_FAMILIE',
    name: 'Respektlos gegenüber Familie',
    description: 'Respektloses Verhalten gegenüber Familienmitgliedern',
    penalties: [
      { level: 1, amount: 100000 },
      { level: 2, amount: 250000 },
      { level: 3, amount: 500000 },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'TOETUNG_FAMILIENMITGLIEDER',
    name: 'Tötung von Familienmitgliedern',
    description: 'Angriff oder Tötung von Mitgliedern der Familie',
    penalties: [
      { level: 1, amount: 500000, penalty: 'Blood Out' },
      { level: 2, amount: 500000, penalty: 'Blood Out' },
      { level: 3, amount: 500000, penalty: 'Blood Out' },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'SEXUELLE_BELAESTIGUNG',
    name: 'Sexuelle Belästigung',
    description: 'Sexuelle Belästigung oder unangemessenes Verhalten',
    penalties: [
      { level: 1, amount: 250000 },
      { level: 2, amount: 500000 },
      { level: 3, amount: 500000, penalty: 'Blood Out' },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'UNNOETIGES_BOXEN_SCHIESSEN',
    name: 'Unnötiges Boxen/Schießen',
    description: 'Gewaltanwendung ohne Grund',
    penalties: [
      { level: 1, amount: 50000 },
      { level: 2, amount: 150000 },
      { level: 3, amount: 300000 },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'MISSACHTUNG_ANWEISUNGEN',
    name: 'Missachtung von Anweisungen',
    description: 'Nichtbefolgen direkter Anweisungen',
    penalties: [
      { level: 1, amount: 75000 },
      { level: 2, amount: 150000 },
      { level: 3, amount: 300000 },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'FEHLEN_AUFSTELLUNG',
    name: 'Fehlen bei Aufstellung',
    description: 'Nicht erscheinen bei wichtigen Aufstellungen',
    penalties: [
      { level: 1, penalty: 'Joker' },
      { level: 2, amount: 100000 },
      { level: 3, amount: 250000 },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'NICHT_ANMELDEN_FUNKCHECK',
    name: 'Nicht beim Funkcheck angemeldet',
    description: 'Fehlende Anmeldung beim Funkcheck',
    penalties: [
      { level: 1, amount: 50000 },
      { level: 2, amount: 100000 },
      { level: 3, amount: 250000 },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'KLEIDERORDNUNG',
    name: 'Kleiderordnung nicht eingehalten',
    description: 'Tragen falscher oder unangemessener Kleidung',
    penalties: [
      { level: 1, amount: 25000 },
      { level: 2, amount: 50000 },
      { level: 3, amount: 100000 },
      { level: 4, amount: 250000 },
    ],
  },
  {
    key: 'MUNITIONSVERSCHWENDUNG',
    name: 'Munitionsverschwendung',
    description: 'Unnötige Verschwendung von Munition',
    penalties: [
      { level: 1, amount: 50000 },
      { level: 2, amount: 100000 },
      { level: 3, amount: 200000 },
      { level: 4, amount: 400000 },
    ],
  },
  {
    key: 'CASA_OHNE_ANKUENDIGUNG',
    name: 'Casa ohne Ankündigung betreten',
    description: 'Betreten der Casa ohne vorherige Ankündigung',
    penalties: [
      { level: 1, amount: 50000 },
      { level: 2, amount: 100000 },
      { level: 3, amount: 200000 },
      { level: 4, amount: 400000 },
    ],
  },
  {
    key: 'FUNKPFLICHT_MISSACHTUNG',
    name: 'Funkpflicht missachtet',
    description: 'Nichtnutzung des Funks trotz Pflicht',
    penalties: [
      { level: 1, amount: 50000 },
      { level: 2, amount: 100000 },
      { level: 3, amount: 250000 },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'FUNKDISZIPLIN_MISSACHTUNG',
    name: 'Funkdisziplin missachtet',
    description: 'Störung oder Missachtung der Funkdisziplin',
    penalties: [
      { level: 1, amount: 50000 },
      { level: 2, amount: 100000 },
      { level: 3, amount: 250000 },
      { level: 4, amount: 500000, penalty: 'Blood Out' },
    ],
  },
  {
    key: 'WOCHENABGABE_NICHT_ENTRICHTET',
    name: 'Wochenabgabe nicht entrichtet',
    description: 'Wochenabgabe trotz Verpflichtung nicht bezahlt (Familiensammeln)',
    penalties: [
      { level: 1, amount: 50000 },
      { level: 2, amount: 150000 },
      { level: 3, amount: 300000 },
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl relative">
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
                    <Scale className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-white">
                      Neue Sanktion
                    </CardTitle>
                    <CardDescription className="text-orange-200/70 mt-1">
                      Regelverstoß dokumentieren
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
          
          <CardContent className="pt-2 pb-6 space-y-6">
            {/* User Selection */}
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

            {/* Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700/50" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-zinc-900 px-3 text-xs text-zinc-500 uppercase tracking-wider">
                  Verstoß
                </span>
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Gavel className="h-4 w-4 text-orange-400" />
                Sanktionskategorie
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {SANCTION_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.key
                  const hasBloodOut = cat.penalties.some(p => p.penalty === 'Blood Out')
                  
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      disabled={isLoading}
                      className={`text-left p-3 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? 'bg-orange-500/20 border-orange-500/50 shadow-lg shadow-orange-500/10'
                          : 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className={`font-medium text-sm ${isSelected ? 'text-orange-300' : 'text-white'}`}>
                            {cat.name}
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{cat.description}</div>
                        </div>
                        {hasBloodOut && (
                          <Skull className="h-4 w-4 text-red-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Auto Level Info */}
            {category && (
              <div className="bg-gradient-to-r from-orange-900/30 to-indigo-900/20 border border-orange-500/30 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-orange-300 font-medium text-sm mb-2">Automatische Level-Berechnung</div>
                    <div className="flex flex-wrap gap-2">
                      {category.penalties.map((p) => (
                        <Badge 
                          key={p.level} 
                          variant="outline" 
                          className={`text-xs ${p.penalty === 'Blood Out' ? 'border-red-500/50 text-red-300' : 'border-orange-500/30 text-orange-200'}`}
                        >
                          L{p.level}: {p.amount ? `${(p.amount / 1000).toFixed(0)}k` : ''} {p.penalty || ''}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-400" />
                Beschreibung des Verstoßes
              </label>
              <textarea
                className="w-full p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 resize-none transition-all"
                rows={3}
                placeholder="Was genau ist passiert..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
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
                onClick={handleCreate}
                disabled={isLoading || !selectedUser || !selectedCategory || !description.trim()}
                className="flex-1 h-12 bg-gradient-to-r from-orange-600 to-orange-600 hover:from-orange-500 hover:to-orange-500 text-white font-semibold shadow-lg shadow-orange-500/25 transition-all duration-200 hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Erstelle...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Sanktion erstellen
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
