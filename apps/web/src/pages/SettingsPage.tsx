import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { 
  Shield, 
  Save, 
  Users, 
  Settings, 
  Package, 
  FlaskConical
} from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'
import { formatCurrency, getRoleColor, getDisplayName } from '../lib/utils'
import DiscordRoleSync from '../components/DiscordRoleSync'
import DiscordMembersManager from '../components/DiscordMembersManager'

const getRoleDisplayName = (role: string) => {
  switch (role) {
    case 'EL_PATRON': return 'El Patrón'
    case 'DON': return 'Don'
    case 'ASESOR': return 'Asesor'
    case 'ROUTENVERWALTUNG': return 'Routenverwaltung'
    case 'LOGISTICA': return 'Logistica'
    case 'SICARIO': return 'Sicario'
    case 'SOLDADO': return 'Soldado'
    default: return role
  }
}

export default function SettingsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  // IC Name states
  const [icFirstName, setIcFirstName] = useState('')
  const [icLastName, setIcLastName] = useState('')
  
  // Admin creation states
  const [newAdminDiscordId, setNewAdminDiscordId] = useState('')
  
  // Kokain price state
  const [kokainPrice, setKokainPrice] = useState(1000)

  // Permission checks
  const canManageUsers = user?.role && ['EL_PATRON', 'DON', 'ASESOR', 'ROUTENVERWALTUNG'].includes(user.role)
  const canManageSettings = user?.role && ['EL_PATRON', 'DON', 'ASESOR'].includes(user.role)
  const canManageKokainPrice = user?.role && ['EL_PATRON', 'DON', 'ASESOR', 'ROUTENVERWALTUNG'].includes(user.role)
  const canChangeIcName = user?.role && ['EL_PATRON', 'DON', 'ASESOR', 'ROUTENVERWALTUNG', 'SICARIO', 'SOLDADO'].includes(user.role)

  // Queries
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(res => res.data),
    enabled: canManageUsers,
  })

  const { data: kokainPriceData } = useQuery({
    queryKey: ['kokain-price'],
    queryFn: () => api.get('/kokain/price').then(res => res.data),
    enabled: canManageKokainPrice,
  })

  // Mutations
  const updateIcNameMutation = useMutation({
    mutationFn: (data: { icFirstName: string; icLastName: string }) =>
      api.patch('/users/ic-name', data),
    onSuccess: () => {
      toast.success('IC-Name aktualisiert')
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren des IC-Namens')
    },
  })

  const makeAdminByIdMutation = useMutation({
    mutationFn: (discordId: string) =>
      api.post('/users/make-admin', { discordId }),
    onSuccess: () => {
      toast.success('Benutzer wurde zum El Patrón ernannt')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setNewAdminDiscordId('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Ernennen des El Patrón')
    },
  })

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/users/${userId}/role`, { role }),
    onSuccess: () => {
      toast.success('Benutzerrolle aktualisiert')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren der Benutzerrolle')
    },
  })

  const updateKokainPriceMutation = useMutation({
    mutationFn: (price: number) =>
      api.post('/kokain/price', { price }),
    onSuccess: () => {
      toast.success('Kokain-Preis aktualisiert')
      queryClient.invalidateQueries({ queryKey: ['kokain-price'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren des Kokain-Preises')
    },
  })

  // Set initial values
  useEffect(() => {
    if (user?.icFirstName) setIcFirstName(user.icFirstName)
    if (user?.icLastName) setIcLastName(user.icLastName)
  }, [user])

  useEffect(() => {
    if (kokainPriceData?.price) {
      setKokainPrice(kokainPriceData.price)
    }
  }, [kokainPriceData])

  const handleUpdateIcName = () => {
    if (icFirstName.trim() && icLastName.trim()) {
      updateIcNameMutation.mutate({
        icFirstName: icFirstName.trim(),
        icLastName: icLastName.trim(),
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* IC-Name-Änderung für alle Benutzer */}
      {canChangeIcName && (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Users className="mr-2 h-5 w-5" />
              IC-Name ändern
            </CardTitle>
            <CardDescription className="text-gray-400">
              Ändere deinen In-Character Namen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  IC Vorname
                </label>
                <Input
                  value={icFirstName}
                  onChange={(e) => setIcFirstName(e.target.value)}
                  placeholder="Vorname"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  IC Nachname
                </label>
                <Input
                  value={icLastName}
                  onChange={(e) => setIcLastName(e.target.value)}
                  placeholder="Nachname"
                />
              </div>
            </div>
            <Button
              onClick={handleUpdateIcName}
              disabled={updateIcNameMutation.isPending || !icFirstName.trim() || !icLastName.trim()}
              variant="lasanta"
            >
              <Save className="mr-2 h-4 w-4" />
              IC-Name speichern
            </Button>
          </CardContent>
        </Card>
      )}

      {/* System Settings - nur für El Patron, Don, Asesor */}
      {canManageSettings && (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              System-Einstellungen
            </CardTitle>
            <CardDescription className="text-gray-400">
              Konfiguriere allgemeine System-Einstellungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">System-Einstellungen werden hier konfiguriert...</p>
          </CardContent>
        </Card>
      )}

      {/* Kokain-System-Einstellungen - für El Patron, Don, Asesor, Routenverwaltung */}
      {canManageKokainPrice && (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <FlaskConical className="mr-2 h-5 w-5" />
              Kokain-System-Einstellungen
            </CardTitle>
            <CardDescription className="text-gray-400">
              Konfiguriere Preise und Einstellungen für das Kokain-Deposit-System
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Preis pro Kokain-Paket (Schwarzgeld)
              </label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  value={kokainPrice}
                  onChange={(e) => setKokainPrice(Number(e.target.value))}
                  className="flex-1"
                  placeholder="1000"
                />
                <Button
                  onClick={() => updateKokainPriceMutation.mutate(kokainPrice)}
                  disabled={updateKokainPriceMutation.isPending}
                  variant="lasanta"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Speichern
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Aktueller Preis: {formatCurrency(kokainPriceData?.price || 1000)} pro Paket
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Creation - Only for El Patron */}
      {user?.role === 'EL_PATRON' && (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              El Patrón ernennen
            </CardTitle>
            <CardDescription className="text-gray-400">
              Mache einen Benutzer zum El Patrón über seine Discord ID
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Discord ID des neuen El Patrón
              </label>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  value={newAdminDiscordId}
                  onChange={(e) => setNewAdminDiscordId(e.target.value)}
                  className="flex-1"
                  placeholder="123456789012345678"
                />
                <Button
                  onClick={() => {
                    if (newAdminDiscordId.trim()) {
                      makeAdminByIdMutation.mutate(newAdminDiscordId.trim())
                      setNewAdminDiscordId('')
                    }
                  }}
                  disabled={makeAdminByIdMutation.isPending || !newAdminDiscordId.trim()}
                  variant="lasanta"
                >
                  <Users className="mr-2 h-4 w-4" />
                  El Patrón machen
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Der Benutzer muss sich mindestens einmal angemeldet haben, bevor er El Patrón werden kann.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discord Management - nur für El Patron, Don */}
      {(user?.role === 'EL_PATRON' || user?.role === 'DON') && (
        <>
          <DiscordRoleSync />
          <DiscordMembersManager />
        </>
      )}

      {/* User Management - für El Patron, Don, Asesor, Routenverwaltung */}
      {canManageUsers && (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Benutzerverwaltung
            </CardTitle>
            <CardDescription className="text-gray-400">
              Verwalte Benutzerrollen und Berechtigungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users && users.length > 0 ? (
                <div className="space-y-3">
                  {users.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img
                          src={u.avatarUrl || '/default-avatar.png'}
                          alt={u.username}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-white">{getDisplayName(u)}</div>
                          <div className="text-sm text-gray-400">{u.username}</div>
                          {u.email && (
                            <div className="text-xs text-gray-500">{u.email}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getRoleColor(u.role)}>
                          {getRoleDisplayName(u.role)}
                        </Badge>
                        {!u.icFirstName && !u.icLastName && (
                          <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                            Kein IC-Name
                          </Badge>
                        )}
                        {u.id !== user?.id && (
                          <select
                            value={u.role}
                            onChange={(e) => updateUserRoleMutation.mutate({ userId: u.id, role: e.target.value })}
                            className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
                          >
                            <option value="SOLDADO">Soldado</option>
                            <option value="SICARIO">Sicario</option>
                            <option value="ROUTENVERWALTUNG">Routenverwaltung</option>
                            <option value="LOGISTICA">Logistica</option>
                            <option value="ASESOR">Asesor</option>
                            <option value="DON">Don</option>
                            <option value="EL_PATRON">El Patrón</option>
                          </select>
                        )}
                        {u.id === user?.id && (
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            Du
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Keine Benutzer gefunden</p>
                </div>
              )}
              {(!users || users.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Keine Benutzer gefunden</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Information */}
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Package className="mr-2 h-5 w-5" />
            System-Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-white">
                {users?.length || 0}
              </div>
              <div className="text-sm text-gray-400">Registrierte Benutzer</div>
            </div>
            
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-white">v1.0.0</div>
              <div className="text-sm text-gray-400">System-Version</div>
            </div>
            
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-accent">💀</div>
              <div className="text-sm text-gray-400">LaSanta Calavera</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}