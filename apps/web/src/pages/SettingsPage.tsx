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
import { api, packagesApi } from '../lib/api'
import { formatCurrency, getRoleColor, getDisplayName, hasRole } from '../lib/utils'
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
  
  // Package price state
  const [packagePrice, setPackagePrice] = useState(1000)
  
  // Weekly delivery settings states
  const [weeklyDeliveryPackages, setWeeklyDeliveryPackages] = useState(300)
  const [weeklyDeliveryMoneyPerPackage, setWeeklyDeliveryMoneyPerPackage] = useState(1000)

  // Permission checks
  const canManageUsers = user?.role && ['EL_PATRON', 'DON', 'ASESOR', 'ROUTENVERWALTUNG'].includes(user.role)
  const canManageSettings = user?.role && ['EL_PATRON', 'DON', 'ASESOR'].includes(user.role)
  const canManagePackagePrice = user?.role && ['EL_PATRON', 'DON', 'ASESOR', 'ROUTENVERWALTUNG'].includes(user.role)
  const canChangeIcName = hasRole(user, ['EL_PATRON', 'DON', 'ASESOR', 'ROUTENVERWALTUNG', 'LOGISTICA', 'SICARIO', 'SOLDADO'])

  // Queries
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(res => res.data),
    enabled: canManageUsers,
  })

  const { data: packagePriceData } = useQuery({
    queryKey: ['packages-price'],
    queryFn: () => packagesApi.getPrice().then(res => res.data),
    enabled: canManagePackagePrice,
  })

  const { data: weeklyDeliverySettings } = useQuery({
    queryKey: ['weekly-delivery-settings'],
    queryFn: () => api.get('/settings/weekly-delivery/values').then(res => res.data),
    enabled: user?.role === 'EL_PATRON' || user?.role === 'DON',
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

  const updatePackagePriceMutation = useMutation({
    mutationFn: (price: number) =>
      packagesApi.setPrice(price),
    onSuccess: () => {
      toast.success('Paket-Preis aktualisiert')
      queryClient.invalidateQueries({ queryKey: ['packages-price'] })
      queryClient.invalidateQueries({ queryKey: ['packages-summary'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren des Paket-Preises')
    },
  })

  const saveWeeklyDeliverySettingsMutation = useMutation({
    mutationFn: (data: { packages: number; moneyPerPackage: number }) =>
      api.put('/settings/weekly-delivery', data),
    onSuccess: () => {
      toast.success('Wochenabgabe-Einstellungen gespeichert')
      queryClient.invalidateQueries({ queryKey: ['weekly-delivery-settings'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern der Einstellungen')
    },
  })

  // Set initial values
  useEffect(() => {
    if (user?.icFirstName) setIcFirstName(user.icFirstName)
    if (user?.icLastName) setIcLastName(user.icLastName)
  }, [user])

  useEffect(() => {
    if (packagePriceData?.price) {
      setPackagePrice(packagePriceData.price)
    }
  }, [packagePriceData])

  useEffect(() => {
    if (weeklyDeliverySettings?.packages) {
      setWeeklyDeliveryPackages(weeklyDeliverySettings.packages)
    }
    if (weeklyDeliverySettings?.moneyPerPackage) {
      setWeeklyDeliveryMoneyPerPackage(weeklyDeliverySettings.moneyPerPackage)
    }
  }, [weeklyDeliverySettings])

  const handleUpdateIcName = () => {
    if (icFirstName.trim() && icLastName.trim()) {
      updateIcNameMutation.mutate({
        icFirstName: icFirstName.trim(),
        icLastName: icLastName.trim(),
      })
    }
  }

  const handleUpdatePackagePrice = () => {
    if (packagePrice > 0) {
      updatePackagePriceMutation.mutate(packagePrice)
    }
  }

  const handleSaveWeeklyDeliverySettings = () => {
    if (weeklyDeliveryPackages > 0 && weeklyDeliveryMoneyPerPackage > 0) {
      saveWeeklyDeliverySettingsMutation.mutate({
        packages: weeklyDeliveryPackages,
        moneyPerPackage: weeklyDeliveryMoneyPerPackage,
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

      {/* Paket-System-Einstellungen - für El Patron, Don, Asesor, Routenverwaltung */}
      {canManagePackagePrice && (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <FlaskConical className="mr-2 h-5 w-5" />
              Paket-System-Einstellungen
            </CardTitle>
            <CardDescription className="text-gray-400">
              Konfiguriere Preise und Einstellungen für das Paket-Deposit-System
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Preis pro Paket (Schwarzgeld)
              </label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  value={packagePrice}
                  onChange={(e) => setPackagePrice(Number(e.target.value))}
                  className="flex-1"
                  placeholder="1000"
                />
                <Button
                  onClick={() => updatePackagePriceMutation.mutate(packagePrice)}
                  disabled={updatePackagePriceMutation.isPending}
                  variant="lasanta"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Speichern
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Aktueller Preis: {formatCurrency(packagePriceData?.price || 1000)} pro Paket
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wochenabgabe-Einstellungen - für El Patron und Don */}
      {(user?.role === 'EL_PATRON' || user?.role === 'DON') && (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Wochenabgabe-Einstellungen
            </CardTitle>
            <CardDescription className="text-gray-400">
              Konfiguriere die wöchentlichen Paket-Abgaben
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Pakete pro Woche
                  </label>
                  <Input
                    type="number"
                    value={weeklyDeliveryPackages}
                    onChange={(e) => setWeeklyDeliveryPackages(Number(e.target.value))}
                    placeholder="300"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-500">
                    Anzahl der Pakete, die wöchentlich abgegeben werden müssen
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Schwarzgeld pro Paket
                  </label>
                  <Input
                    type="number"
                    value={weeklyDeliveryMoneyPerPackage}
                    onChange={(e) => setWeeklyDeliveryMoneyPerPackage(Number(e.target.value))}
                    placeholder="1000"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-500">
                    Schwarzgeld-Betrag pro Paket für Wochenabgaben
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveWeeklyDeliverySettings}
                  disabled={saveWeeklyDeliverySettingsMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saveWeeklyDeliverySettingsMutation.isPending ? 'Speichern...' : 'Einstellungen speichern'}
                </Button>
              </div>
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