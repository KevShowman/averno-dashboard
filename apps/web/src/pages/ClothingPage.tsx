import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { useAuthStore } from '../stores/auth'
import { Loader2, Shirt, Info, User, Users } from 'lucide-react'
import { clothingApi } from '../lib/api'
import { api } from '../lib/api'
import { toast } from 'sonner'

interface ClothingDisplay {
  part: string
  label: string
  item: number | null
  variation: number | null
  customizable: boolean
  color: string | null
}

// Helper function to get display name for roles
const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    // Leaderschaft
    EL_PATRON: 'El Patrón',
    DON_CAPITAN: 'Don - El Capitán',
    DON_COMANDANTE: 'Don - El Comandante',
    EL_MANO_DERECHA: 'El Mano Derecha',
    // Ränge 7-9
    EL_CUSTODIO: 'El Custodio',
    EL_MENTOR: 'El Mentor',
    EL_ENCARGADO: 'El Encargado',
    // Ränge 4-6
    EL_TENIENTE: 'El Teniente',
    SOLDADO: 'Soldado',
    EL_PREFECTO: 'El Prefecto',
    // Ränge 1-3
    EL_CONFIDENTE: 'El Confidente',
    EL_PROTECTOR: 'El Protector',
    EL_NOVATO: 'El Novato',
    // Funktionsrollen
    CONSEJERO: 'Consejero/a',
    RUTAS: 'Rutas',
    LOGISTICA: 'Logística',
    INTELIGENCIA: 'Inteligencia',
    FORMACION: 'Formación',
    SICARIO: 'Sicario',
    CONTACTO: 'Contacto',
    // Legacy
    FUTURO: 'Futuro',
    ROUTENVERWALTUNG: 'Routenverwaltung',
    ADMIN: 'Administrator',
    QUARTIERMEISTER: 'Quartiermeister',
    MITGLIED: 'Mitglied',
    GAST: 'Gast',
  }
  return roleMap[role] || role
}

export default function ClothingPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedGender, setSelectedGender] = useState<'MALE' | 'FEMALE'>('MALE')

  // Set initial gender from user data
  useEffect(() => {
    if (user?.gender) {
      setSelectedGender(user.gender as 'MALE' | 'FEMALE')
    }
  }, [user])

  // Load template based on user's rank
  const { data: template, isLoading: templateLoading, refetch } = useQuery({
    queryKey: ['clothing-my-template'],
    queryFn: () => clothingApi.getAllTemplates(),
  })

  // Mutation to update gender
  const updateGenderMutation = useMutation({
    mutationFn: async (gender: 'MALE' | 'FEMALE') => {
      return api.patch('/users/gender', { gender })
    },
    onSuccess: () => {
      toast.success('Geschlecht erfolgreich aktualisiert!')
      // Refetch user data and clothing template
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      refetch()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren des Geschlechts')
    },
  })

  const handleGenderChange = (gender: 'MALE' | 'FEMALE') => {
    setSelectedGender(gender)
    updateGenderMutation.mutate(gender)
  }

  // Check if template has Sicario structure
  const hasSicarioClothing = template && typeof template === 'object' && 'rank' in template && 'sicario' in template
  const rankTemplate = hasSicarioClothing ? template.rank : template
  const sicarioTemplate = hasSicarioClothing ? template.sicario : null

  const createClothingParts = (data: any): ClothingDisplay[] => [
    {
      part: 'mask',
      label: 'Maske',
      item: data?.maskItem ?? null,
      variation: data?.maskVariation ?? null,
      customizable: data?.maskCustomizable ?? false,
      color: data?.maskColor ?? null,
    },
    {
      part: 'torso',
      label: 'Torso',
      item: data?.torsoItem ?? null,
      variation: data?.torsoVariation ?? null,
      customizable: data?.torsoCustomizable ?? false,
      color: data?.torsoColor ?? null,
    },
    {
      part: 'tshirt',
      label: 'T-Shirt',
      item: data?.tshirtItem ?? null,
      variation: data?.tshirtVariation ?? null,
      customizable: data?.tshirtCustomizable ?? false,
      color: data?.tshirtColor ?? null,
    },
    {
      part: 'vest',
      label: 'Weste',
      item: data?.vesteItem ?? null,
      variation: data?.vesteVariation ?? null,
      customizable: data?.vesteCustomizable ?? false,
      color: data?.vesteColor ?? null,
    },
    {
      part: 'pants',
      label: 'Hose',
      item: data?.hoseItem ?? null,
      variation: data?.hoseVariation ?? null,
      customizable: data?.hoseCustomizable ?? false,
      color: data?.hoseColor ?? null,
    },
    {
      part: 'shoes',
      label: 'Schuhe',
      item: data?.schuheItem ?? null,
      variation: data?.schuheVariation ?? null,
      customizable: data?.schuheCustomizable ?? false,
      color: data?.schuheColor ?? null,
    },
  ]

  const rankClothingParts = createClothingParts(rankTemplate)
  const sicarioClothingParts = sicarioTemplate ? createClothingParts(sicarioTemplate) : null

  const isLoading = templateLoading

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Meine Kleidung</h1>
        <p className="text-gray-400">
          Hier siehst du deine Kleidung basierend auf deinem Rang und Geschlecht.
        </p>
      </header>

      {/* Gender Selector - Prominent Display */}
      <Card className="lasanta-card border-primary/50">
        <CardHeader>
          <CardTitle className="text-white">Geschlecht festlegen</CardTitle>
          <CardDescription className="text-gray-400">
            Wähle dein Geschlecht aus, um die passende Kleidung anzuzeigen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 justify-center">
            <Button
              variant={selectedGender === 'MALE' ? 'default' : 'outline'}
              onClick={() => handleGenderChange('MALE')}
              disabled={updateGenderMutation.isPending}
              className={`flex-1 max-w-xs h-16 text-lg ${selectedGender === 'MALE' ? 'text-white' : ''}`}
              size="lg"
            >
              {updateGenderMutation.isPending && selectedGender === 'MALE' ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <User className="mr-2 h-5 w-5" />
              )}
              Männlich
            </Button>
            <Button
              variant={selectedGender === 'FEMALE' ? 'default' : 'outline'}
              onClick={() => handleGenderChange('FEMALE')}
              disabled={updateGenderMutation.isPending}
              className={`flex-1 max-w-xs h-16 text-lg ${selectedGender === 'FEMALE' ? 'text-white' : ''}`}
              size="lg"
            >
              {updateGenderMutation.isPending && selectedGender === 'FEMALE' ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Users className="mr-2 h-5 w-5" />
              )}
              Weiblich
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="lasanta-card">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shirt className="h-5 w-5" />
              Deine Kleidungsvorlage ({selectedGender === 'MALE' ? 'Männlich' : 'Weiblich'})
            </CardTitle>
            <CardDescription className="text-gray-400">
              Basierend auf deinem Rang: <span className="text-primary font-semibold">{user?.role ? getRoleDisplayName(user.role) : 'Unbekannt'}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {rankClothingParts.map((part) => {
              const isCustomizable = part.customizable

              return (
                <div
                  key={part.part}
                  className="space-y-4 border-b border-gray-700 pb-6 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{part.label}</h3>
                    {isCustomizable && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        Frei wählbar
                      </span>
                    )}
                  </div>

                  {isCustomizable ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-2">
                      <p className="text-green-300 font-medium">
                        Dieses Kleidungsstück ist frei wählbar!
                      </p>
                      {part.color !== null && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">Vorgaben:</span>
                          <span className="text-white font-mono bg-gray-800 px-2 py-1 rounded">
                            {part.color}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 pt-2">
                        Du kannst dieses Teil in den angegebenen Vorgaben frei auswählen.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Item:</span>
                        <span className="text-white font-mono">
                          {part.item !== null ? part.item : 'Nicht festgelegt'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Variation:</span>
                        <span className="text-white font-mono">
                          {part.variation !== null ? part.variation : 'Nicht festgelegt'}
                        </span>
                      </div>
                      {part.color !== null && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Farbe:</span>
                          <span className="text-white font-mono">{part.color}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 pt-2">
                        Diese Einstellung wurde von der Leitung festgelegt.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
              <Info className="h-5 w-5 text-blue-400 mx-auto mb-2" />
              <p className="text-sm text-blue-300">
                Alle Kleidungsteile wurden von der Leitung festgelegt oder sind frei wählbar in den
                angegebenen Farben.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sicario Clothing Section */}
      {sicarioClothingParts && (
        <Card className="lasanta-card border-orange-500/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shirt className="h-5 w-5 text-orange-400" />
              Sicario Kleidung ({selectedGender === 'MALE' ? 'Männlich' : 'Weiblich'})
            </CardTitle>
            <CardDescription className="text-gray-400">
              Als <span className="text-orange-400 font-semibold">Sicario</span> hast du zusätzlich Zugriff auf diese spezielle Kleidung.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {sicarioClothingParts.map((part) => {
              const isCustomizable = part.customizable

              return (
                <div
                  key={part.part}
                  className="space-y-4 border-b border-gray-700 pb-6 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{part.label}</h3>
                    {isCustomizable && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        Frei wählbar
                      </span>
                    )}
                  </div>

                  {isCustomizable ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-2">
                      <p className="text-green-300 font-medium">
                        Dieses Kleidungsstück ist frei wählbar!
                      </p>
                      {part.color !== null && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">Vorgaben:</span>
                          <span className="text-white font-mono bg-gray-800 px-2 py-1 rounded">
                            {part.color}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 pt-2">
                        Du kannst dieses Teil in den angegebenen Vorgaben frei auswählen.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Item:</span>
                        <span className="text-white font-mono">
                          {part.item !== null ? part.item : 'Nicht festgelegt'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Variation:</span>
                        <span className="text-white font-mono">
                          {part.variation !== null ? part.variation : 'Nicht festgelegt'}
                        </span>
                      </div>
                      {part.color !== null && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Farbe:</span>
                          <span className="text-white font-mono">{part.color}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 pt-2">
                        Diese Einstellung wurde von der Leitung festgelegt.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 text-center">
              <Info className="h-5 w-5 text-orange-400 mx-auto mb-2" />
              <p className="text-sm text-orange-300">
                Du kannst zwischen deiner Rang-Kleidung und der Sicario-Kleidung wählen.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
