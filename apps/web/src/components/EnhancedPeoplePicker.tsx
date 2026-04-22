import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../lib/api'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Checkbox } from './ui/checkbox'
import { Search, User, X, Crown, Shield, UserCheck, Package, MapPin, AlertTriangle, Zap } from 'lucide-react'
import { getDisplayName, getRoleDisplayName, getRoleColor } from '../lib/utils'

interface User {
  id: string
  username: string
  icFirstName?: string
  icLastName?: string
  avatarUrl?: string
  role: string
  allRoles?: string[]
  createdAt: string
}

interface Role {
  key: string
  name: string
  description: string
}

interface EnhancedPeoplePickerProps {
  onUserSelect: (user: User | null) => void
  onRoleUpdate?: (userId: string, allRoles: string[]) => void
  selectedUser?: User | null
  showRoleManagement?: boolean
  placeholder?: string
  className?: string
}

const roleIcons = {
  'PATRON': Crown,
  'DON': Shield,
  'CAPO': UserCheck,
  'LOGISTICA': Package,
  'ROUTENVERWALTUNG': MapPin,
  'SICARIO': AlertTriangle,
  'LINCE': User,
  'FUTURO': User,
}

export default function EnhancedPeoplePicker({
  onUserSelect,
  onRoleUpdate,
  selectedUser,
  showRoleManagement = false,
  placeholder = "Benutzer suchen...",
  className = ""
}: EnhancedPeoplePickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  // Verfügbare Rollen abrufen
  const { data: availableRoles = [] } = useQuery<Role[]>({
    queryKey: ['available-roles'],
    queryFn: () => usersApi.getAvailableRoles().then(res => res.data),
    enabled: showRoleManagement,
  })

  // Search mit Debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timeoutId = setTimeout(() => {
      usersApi.searchUsers(searchQuery)
        .then(res => {
          setSearchResults(res.data)
          setIsSearching(false)
        })
        .catch(() => {
          setSearchResults([])
          setIsSearching(false)
        })
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Selected roles initialisieren
  useEffect(() => {
    if (selectedUser?.allRoles) {
      setSelectedRoles([...selectedUser.allRoles])
    } else if (selectedUser?.role) {
      setSelectedRoles([selectedUser.role])
    } else {
      setSelectedRoles([])
    }
  }, [selectedUser])

  const handleUserSelect = (user: User) => {
    onUserSelect(user)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleRoleToggle = (roleKey: string) => {
    const newRoles = selectedRoles.includes(roleKey)
      ? selectedRoles.filter(r => r !== roleKey)
      : [...selectedRoles, roleKey]
    setSelectedRoles(newRoles)
  }

  const handleRoleUpdate = () => {
    if (selectedUser && onRoleUpdate) {
      onRoleUpdate(selectedUser.id, selectedRoles)
    }
  }

  const clearSelection = () => {
    onUserSelect(null)
    setSearchQuery('')
    setSearchResults([])
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card className="lasanta-card max-h-60 overflow-y-auto">
          <CardContent className="p-2">
            <div className="space-y-1">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="flex items-center space-x-3 p-2 hover:bg-zinc-800/50 rounded cursor-pointer transition-colors"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={getDisplayName(user)}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <User className="h-8 w-8 text-zinc-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {getDisplayName(user)}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.allRoles && user.allRoles.length > 1 ? (
                        user.allRoles.map((role, index) => {
                          const Icon = roleIcons[role as keyof typeof roleIcons] || User
                          return (
                            <Badge key={index} className={`${getRoleColor(role)} text-xs`}>
                              <Icon className="h-3 w-3 mr-1" />
                              {getRoleDisplayName(role)}
                            </Badge>
                          )
                        })
                      ) : (
                        <Badge className={`${getRoleColor(user.role)} text-xs`}>
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected User */}
      {selectedUser && (
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <User className="h-5 w-5" />
                Ausgewählter Benutzer
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3 mb-4">
              {selectedUser.avatarUrl ? (
                <img
                  src={selectedUser.avatarUrl}
                  alt={selectedUser.username}
                  className="h-12 w-12 rounded-full"
                />
              ) : (
                <User className="h-12 w-12 text-zinc-400" />
              )}
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {getDisplayName(selectedUser)}
                </h3>
                <p className="text-sm text-zinc-400">
                  @{selectedUser.username}
                </p>
              </div>
            </div>

            {/* Current Roles */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-zinc-300 mb-2">Aktuelle Rollen:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedUser.allRoles && selectedUser.allRoles.length > 1 ? (
                  selectedUser.allRoles.map((role, index) => {
                    const Icon = roleIcons[role as keyof typeof roleIcons] || User
                    return (
                      <Badge key={index} className={`${getRoleColor(role)} text-sm`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {getRoleDisplayName(role)}
                      </Badge>
                    )
                  })
                ) : (
                  <Badge className={`${getRoleColor(selectedUser.role)} text-sm`}>
                    {getRoleDisplayName(selectedUser.role)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Role Management */}
            {showRoleManagement && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-zinc-300">Rollen verwalten:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {availableRoles.map((role) => {
                    const Icon = roleIcons[role.key as keyof typeof roleIcons] || User
                    return (
                      <div key={role.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={role.key}
                          checked={selectedRoles.includes(role.key)}
                          onCheckedChange={() => handleRoleToggle(role.key)}
                        />
                        <label
                          htmlFor={role.key}
                          className="flex items-center space-x-2 text-sm text-white cursor-pointer"
                        >
                          <Icon className="h-4 w-4" />
                          <span>{role.name}</span>
                        </label>
                      </div>
                    )
                  })}
                </div>
                <Button
                  onClick={handleRoleUpdate}
                  disabled={selectedRoles.length === 0}
                  className="w-full"
                  variant="lasanta"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Rollen aktualisieren
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
