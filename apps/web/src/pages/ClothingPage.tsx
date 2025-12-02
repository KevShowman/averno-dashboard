import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useAuthStore } from '../stores/auth'
import { Loader2, Shirt, Info, User, Users, Check, ChevronRight } from 'lucide-react'
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

const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    EL_PATRON: 'El Patrón',
    DON_CAPITAN: 'Don - El Capitán',
    DON_COMANDANTE: 'Don - El Comandante',
    EL_MANO_DERECHA: 'El Mano Derecha',
    EL_CUSTODIO: 'El Custodio',
    EL_MENTOR: 'El Mentor',
    EL_ENCARGADO: 'El Encargado',
    EL_TENIENTE: 'El Teniente',
    SOLDADO: 'Soldado',
    EL_PREFECTO: 'El Prefecto',
    EL_CONFIDENTE: 'El Confidente',
    EL_PROTECTOR: 'El Protector',
    EL_NOVATO: 'El Novato',
    SICARIO: 'Sicario',
    FUTURO: 'Futuro',
  }
  return roleMap[role] || role
}

export default function ClothingPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedGender, setSelectedGender] = useState<'MALE' | 'FEMALE'>('MALE')

  useEffect(() => {
    if (user?.gender) {
      setSelectedGender(user.gender as 'MALE' | 'FEMALE')
    }
  }, [user])

  const { data: template, isLoading: templateLoading, refetch } = useQuery({
    queryKey: ['clothing-my-template'],
    queryFn: () => clothingApi.getAllTemplates(),
  })

  const updateGenderMutation = useMutation({
    mutationFn: async (gender: 'MALE' | 'FEMALE') => {
      return api.patch('/users/gender', { gender })
    },
    onSuccess: () => {
      toast.success('Geschlecht erfolgreich aktualisiert!')
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

  const hasSicarioClothing = template && typeof template === 'object' && 'rank' in template && 'sicario' in template
  const rankTemplate = hasSicarioClothing ? template.rank : template
  const sicarioTemplate = hasSicarioClothing ? template.sicario : null

  const createClothingParts = (data: any): ClothingDisplay[] => [
    { part: 'mask', label: 'Maske', item: data?.maskItem ?? null, variation: data?.maskVariation ?? null, customizable: data?.maskCustomizable ?? false, color: data?.maskColor ?? null },
    { part: 'torso', label: 'Torso', item: data?.torsoItem ?? null, variation: data?.torsoVariation ?? null, customizable: data?.torsoCustomizable ?? false, color: data?.torsoColor ?? null },
    { part: 'tshirt', label: 'T-Shirt', item: data?.tshirtItem ?? null, variation: data?.tshirtVariation ?? null, customizable: data?.tshirtCustomizable ?? false, color: data?.tshirtColor ?? null },
    { part: 'vest', label: 'Weste', item: data?.vesteItem ?? null, variation: data?.vesteVariation ?? null, customizable: data?.vesteCustomizable ?? false, color: data?.vesteColor ?? null },
    { part: 'pants', label: 'Hose', item: data?.hoseItem ?? null, variation: data?.hoseVariation ?? null, customizable: data?.hoseCustomizable ?? false, color: data?.hoseColor ?? null },
    { part: 'shoes', label: 'Schuhe', item: data?.schuheItem ?? null, variation: data?.schuheVariation ?? null, customizable: data?.schuheCustomizable ?? false, color: data?.schuheColor ?? null },
    { part: 'backpack', label: 'Rucksack', item: data?.rucksackItem ?? null, variation: data?.rucksackVariation ?? null, customizable: data?.rucksackCustomizable ?? false, color: data?.rucksackColor ?? null },
  ]

  const rankClothingParts = createClothingParts(rankTemplate)
  const sicarioClothingParts = sicarioTemplate ? createClothingParts(sicarioTemplate) : null

  if (templateLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-gray-400">Lade Kleidungsvorlage...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-amber-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/30">
            <Shirt className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Meine Kleidung</h1>
            <p className="text-gray-400 mt-1">
              Basierend auf deinem Rang: <span className="text-amber-400 font-semibold">{user?.role ? getRoleDisplayName(user.role) : 'Unbekannt'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Gender Selector */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-amber-500/30">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="text-white">Geschlecht auswählen</CardTitle>
          <CardDescription className="text-gray-400">
            Wähle dein Geschlecht aus, um die passende Kleidung anzuzeigen.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleGenderChange('MALE')}
              disabled={updateGenderMutation.isPending}
              className={`flex-1 max-w-xs h-14 text-lg font-medium rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50 ${
                selectedGender === 'MALE' 
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 shadow-lg shadow-amber-500/25' 
                  : 'border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {updateGenderMutation.isPending && selectedGender === 'MALE' ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <User className="mr-2 h-5 w-5" />
              )}
              Männlich
            </button>
            <button
              onClick={() => handleGenderChange('FEMALE')}
              disabled={updateGenderMutation.isPending}
              className={`flex-1 max-w-xs h-14 text-lg font-medium rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50 ${
                selectedGender === 'FEMALE' 
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 shadow-lg shadow-amber-500/25' 
                  : 'border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {updateGenderMutation.isPending && selectedGender === 'FEMALE' ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Users className="mr-2 h-5 w-5" />
              )}
              Weiblich
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Clothing Template */}
      <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white flex items-center gap-2">
            <Shirt className="h-5 w-5 text-amber-400" />
            Deine Kleidungsvorlage ({selectedGender === 'MALE' ? 'Männlich' : 'Weiblich'})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {rankClothingParts.map((part) => (
            <div
              key={part.part}
              className={`rounded-xl border p-4 ${
                part.customizable 
                  ? 'border-green-500/30 bg-green-900/10' 
                  : 'border-gray-700 bg-gray-800/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">{part.label}</h3>
                {part.customizable && (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    <Check className="h-3 w-3 mr-1" />
                    Frei wählbar
                  </Badge>
                )}
              </div>

              {part.customizable ? (
                <div className="space-y-2">
                  <p className="text-green-300 text-sm">
                    Dieses Kleidungsstück ist frei wählbar!
                  </p>
                  {part.color !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Vorgabe:</span>
                      <span className="text-white font-mono bg-gray-800 px-2 py-1 rounded">{part.color}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Item</p>
                    <p className="text-lg font-mono text-white">{part.item !== null ? part.item : '-'}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Variation</p>
                    <p className="text-lg font-mono text-white">{part.variation !== null ? part.variation : '-'}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-300">
              Alle Kleidungsteile wurden von der Leitung festgelegt oder sind frei wählbar in den angegebenen Farben.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sicario Clothing Section */}
      {sicarioClothingParts && (
        <Card className="relative overflow-hidden bg-gray-900/50 border border-orange-500/30">
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl" />
          <CardHeader className="border-b border-orange-500/20 relative">
            <CardTitle className="text-white flex items-center gap-2">
              <Shirt className="h-5 w-5 text-orange-400" />
              Sicario Kleidung ({selectedGender === 'MALE' ? 'Männlich' : 'Weiblich'})
            </CardTitle>
            <CardDescription className="text-orange-200/60">
              Als <span className="text-orange-400 font-semibold">Sicario</span> hast du Zugriff auf diese spezielle Kleidung.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4 relative">
            {sicarioClothingParts.map((part) => (
              <div
                key={part.part}
                className={`rounded-xl border p-4 ${
                  part.customizable 
                    ? 'border-green-500/30 bg-green-900/10' 
                    : 'border-gray-700 bg-gray-800/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">{part.label}</h3>
                  {part.customizable && (
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                      <Check className="h-3 w-3 mr-1" />
                      Frei wählbar
                    </Badge>
                  )}
                </div>

                {part.customizable ? (
                  <div className="space-y-2">
                    <p className="text-green-300 text-sm">Dieses Kleidungsstück ist frei wählbar!</p>
                    {part.color !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Vorgabe:</span>
                        <span className="text-white font-mono bg-gray-800 px-2 py-1 rounded">{part.color}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Item</p>
                      <p className="text-lg font-mono text-white">{part.item !== null ? part.item : '-'}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Variation</p>
                      <p className="text-lg font-mono text-white">{part.variation !== null ? part.variation : '-'}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
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
