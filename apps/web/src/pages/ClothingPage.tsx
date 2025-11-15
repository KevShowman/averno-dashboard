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

  const clothingParts: ClothingDisplay[] = [
    {
      part: 'mask',
      label: 'Maske',
      item: template?.maskItem ?? null,
      variation: template?.maskVariation ?? null,
      customizable: template?.maskCustomizable ?? false,
      color: template?.maskColor ?? null,
    },
    {
      part: 'torso',
      label: 'Torso',
      item: template?.torsoItem ?? null,
      variation: template?.torsoVariation ?? null,
      customizable: template?.torsoCustomizable ?? false,
      color: template?.torsoColor ?? null,
    },
    {
      part: 'tshirt',
      label: 'T-Shirt',
      item: template?.tshirtItem ?? null,
      variation: template?.tshirtVariation ?? null,
      customizable: template?.tshirtCustomizable ?? false,
      color: template?.tshirtColor ?? null,
    },
    {
      part: 'vest',
      label: 'Weste',
      item: template?.vesteItem ?? null,
      variation: template?.vesteVariation ?? null,
      customizable: template?.vesteCustomizable ?? false,
      color: template?.vesteColor ?? null,
    },
    {
      part: 'pants',
      label: 'Hose',
      item: template?.hoseItem ?? null,
      variation: template?.hoseVariation ?? null,
      customizable: template?.hoseCustomizable ?? false,
      color: template?.hoseColor ?? null,
    },
    {
      part: 'shoes',
      label: 'Schuhe',
      item: template?.schuheItem ?? null,
      variation: template?.schuheVariation ?? null,
      customizable: template?.schuheCustomizable ?? false,
      color: template?.schuheColor ?? null,
    },
  ]

  const isLoading = templateLoading

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Meine Kleidung</h1>
        <p className="text-gray-400">
          Hier sehen Sie Ihre Kleidung basierend auf Ihrem Rang und Geschlecht.
        </p>
      </header>

      {/* Gender Selector - Prominent Display */}
      <Card className="lasanta-card border-primary/50">
        <CardHeader>
          <CardTitle className="text-white">Geschlecht festlegen</CardTitle>
          <CardDescription className="text-gray-400">
            Wählen Sie Ihr Geschlecht aus, um die passende Kleidung anzuzeigen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 justify-center">
            <Button
              variant={selectedGender === 'MALE' ? 'default' : 'outline'}
              onClick={() => handleGenderChange('MALE')}
              disabled={updateGenderMutation.isPending}
              className="flex-1 max-w-xs h-16 text-lg"
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
              className="flex-1 max-w-xs h-16 text-lg"
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
              Ihre Kleidungsvorlage ({selectedGender === 'MALE' ? 'Männlich' : 'Weiblich'})
            </CardTitle>
            <CardDescription className="text-gray-400">
              Basierend auf Ihrem Rang ({user?.role})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {clothingParts.map((part) => {
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
                          <span className="text-gray-400">Farbvorgabe:</span>
                          <span className="text-white font-mono bg-gray-800 px-2 py-1 rounded">
                            {part.color}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 pt-2">
                        Sie können dieses Teil in der angegebenen Farbe frei auswählen.
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
    </div>
  )
}
