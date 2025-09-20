import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Settings, Users, DollarSign, Package, Shield, Save, FlaskConical } from 'lucide-react'
import { formatCurrency, getRoleColor, getDisplayName } from '../lib/utils'
import { toast } from 'sonner'
import DiscordRoleSync from '../components/DiscordRoleSync'
import DiscordMembersManager from '../components/DiscordMembersManager'

const getRoleDisplayName = (role: string) => {
  switch (role) {
    case 'EL_PATRON': return 'El Patron'
    case 'DON': return 'Don'
    case 'ASESOR': return 'Asesor'
    case 'ROUTENVERWALTUNG': return 'Routenverwaltung'
    case 'SICARIO': return 'Sicario'
    case 'SOLDADO': return 'Soldado'
    default: return role
  }
}

export default function SettingsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [approvalThreshold, setApprovalThreshold] = useState(100000)
  const [newAdminDiscordId, setNewAdminDiscordId] = useState('')
  const [kokainPrice, setKokainPrice] = useState(1000)

  // Berechtigungen basierend auf Rollen
  const canManageUsers = user?.role && ['EL_PATRON', 'DON', 'ASESOR', 'ROUTENVERWALTUNG'].includes(user.role)
  const canManageSettings = user?.role && ['EL_PATRON', 'DON', 'ASESOR'].includes(user.role)
  const canManageKokainPrice = user?.role && ['EL_PATRON', 'DON', 'ASESOR', 'ROUTENVERWALTUNG'].includes(user.role)
  const canChangeIcName = user?.role && ['EL_PATRON', 'DON', 'ASESOR', 'ROUTENVERWALTUNG', 'SICARIO', 'SOLDADO'].includes(user.role)

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(res => res.data),
    enabled: user?.role === 'EL_PATRON' || user?.role === 'DON',
  })

  const { data: kokainPriceData } = useQuery({
    queryKey: ['kokain-price'],
    queryFn: () => api.get('/kokain/price').then(res => res.data),
    enabled: user?.role === 'EL_PATRON' || user?.role === 'DON',
  })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(res => res.data),
    enabled: user?.role === 'EL_PATRON' || user?.role === 'DON',
  })

  const updateThresholdMutation = useMutation({
    mutationFn: (threshold: number) => 
      api.patch('/settings/approval_threshold', { amount: threshold }),
    onSuccess: () => {
      toast.success('Genehmigungsschwellwert aktualisiert')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren der Einstellungen')
    },
  })

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string, role: string }) => 
      api.patch(`/users/${userId}/role`, { role }),
    onSuccess: () => {
      toast.success('Benutzerrolle aktualisiert')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren der Benutzerrolle')
    },
  })

  const makeAdminByIdMutation = useMutation({
    mutationFn: (discordId: string) => 
      api.post('/users/make-admin', { discordId }),
    onSuccess: () => {
      toast.success('Benutzer wurde zum Admin gemacht')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen des Admins')
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

  // Set initial kokain price when data is loaded
  useEffect(() => {
    if (kokainPriceData?.price) {
      setKokainPrice(kokainPriceData.price)
    }
  }, [kokainPriceData])

  if (user?.role !== 'EL_PATRON' && user?.role !== 'DON') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Settings className="mr-3 h-8 w-8 text-accent" />
            Einstellungen
          </h1>
          <p className="text-gray-400 mt-2">
            Systemkonfiguration und Benutzerverwaltung
          </p>
        </div>

        <Card className="lasanta-card">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Shield className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Zugriff verweigert</h3>
              <p className="text-gray-400">
                Nur El Patrón und Don haben Zugriff auf die Systemeinstellungen.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Settings className="mr-3 h-8 w-8 text-accent" />
          Einstellungen
        </h1>
        <p className="text-gray-400 mt-2">
          Systemkonfiguration und Benutzerverwaltung
        </p>
      </div>

      {/* IC-Name-Änderung für alle Benutzer */}
      {canChangeIcName && (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Users className="mr-2 h-5 w-5" />
              IC-Name ändern
            </CardTitle>
            <CardDescription className="text-gray-400">
              Ändere deinen In-Character Vor- und Nachnamen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    IC Vorname
                  </label>
                  <Input
                    value={user?.icFirstName || ''}
                    placeholder="Max"
                    className="bg-background border-input"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    IC Nachname
                  </label>
                  <Input
                    value={user?.icLastName || ''}
                    placeholder="Mustermann"
                    className="bg-background border-input"
                    disabled
                  />
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Um deinen IC-Namen zu ändern, kontaktiere einen Administrator.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Settings - nur für El Patron, Don, Asesor */}
      {canManageSettings && (
        <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <DollarSign className="mr-2 h-5 w-5" />
            Kassensystem-Einstellungen
          </CardTitle>
          <CardDescription className="text-gray-400">
            Konfiguriere Genehmigungsprozesse und Schwellwerte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Genehmigungsschwellwert (Schwarzgeld)
            </label>
            <div className="flex space-x-2">
              <Input
                type="number"
                value={approvalThreshold}
                onChange={(e) => setApprovalThreshold(Number(e.target.value))}
                className="flex-1"
                placeholder="100000"
              />
              <Button
                onClick={() => updateThresholdMutation.mutate(approvalThreshold)}
                disabled={updateThresholdMutation.isPending}
                variant="lasanta"
              >
                <Save className="mr-2 h-4 w-4" />
                Speichern
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Transaktionen ab diesem Betrag erfordern eine Genehmigung durch El Patrón oder Don
            </p>
          </div>
        </CardContent>
      </Card>

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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-400">Benutzer</TableHead>
                  <TableHead className="text-gray-400">Discord ID</TableHead>
                  <TableHead className="text-gray-400">Aktuelle Rolle</TableHead>
                  <TableHead className="text-gray-400">Registriert</TableHead>
                  <TableHead className="text-gray-400">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u: any) => (
                  <TableRow key={u.id} className="hover:bg-gray-800/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.username}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {u.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-white">{getDisplayName(u)}</div>
                          {u.email && (
                            <div className="text-sm text-gray-400">{u.email}</div>
                          )}
                          {!u.icFirstName && !u.icLastName && (
                            <div className="text-xs text-yellow-400">IC-Name fehlt</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300 font-mono text-sm">
                      {u.discordId}
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(u.role)}>
                        {getRoleDisplayName(u.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {new Date(u.createdAt).toLocaleDateString('de-DE')}
                    </TableCell>
                    <TableCell>
                      {u.id !== user?.id && (
                        <select
                          value={u.role}
                          onChange={(e) => updateUserRoleMutation.mutate({
                            userId: u.id,
                            role: e.target.value
                          })}
                          className="px-2 py-1 bg-background border border-input rounded text-foreground text-sm"
                          disabled={updateUserRoleMutation.isPending}
                        >
                          <option value="SOLDADO">Soldado</option>
                          <option value="SICARIO">Sicario</option>
                          <option value="ROUTENVERWALTUNG">Routenverwaltung</option>
                          <option value="ASESOR">Asesor</option>
                          <option value="DON">Don</option>
                          <option value="EL_PATRON">El Patrón</option>
                        </select>
                      )}
                      {u.id === user?.id && (
                        <span className="text-sm text-gray-400">Eigenes Konto</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {(!users || users.length === 0) && (
              <div className="text-center py-8 text-gray-400">
                Keine Benutzer gefunden
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
