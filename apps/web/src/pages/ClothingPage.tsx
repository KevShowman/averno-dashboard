import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { useAuthStore } from '../stores/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { Loader2, Shirt, Info, User, Users, Check, Sparkles, Image as ImageIcon } from 'lucide-react'
import { api } from '../lib/api'
import { toast } from 'sonner'

interface MaleOutfit {
  id: string
  outfitNumber: number
  name: string
  imagePath?: string
  maskItem?: number
  maskVariation?: number
  torsoItem?: number
  torsoVariation?: number
  tshirtItem?: number
  tshirtVariation?: number
  vesteItem?: number
  vesteVariation?: number
  hoseItem?: number
  hoseVariation?: number
  schuheItem?: number
  schuheVariation?: number
  rucksackItem?: number
  rucksackVariation?: number
}

interface ClothingDisplay {
  part: string
  label: string
  item: number | null
  variation: number | null
  customizable: boolean
  color: string | null
}

// Use relative path for API - works in both dev and prod
const API_BASE = '/api'

export default function ClothingPage() {
  const { user } = useAuthStore()
  usePageTitle('Meine Kleidung')
  const queryClient = useQueryClient()
  
  // Initialize gender from user only once on mount, track if we've initialized
  const initializedRef = useRef(false)
  const [selectedGender, setSelectedGender] = useState<'MALE' | 'FEMALE'>(() => {
    // Initial state from user if available
    return (user?.gender as 'MALE' | 'FEMALE') || 'MALE'
  })
  const [selectedOutfit, setSelectedOutfit] = useState<number>(1)

  // Only sync from user once on initial load if not yet initialized
  if (!initializedRef.current && user?.gender) {
    initializedRef.current = true
    // Only update if different from current state (prevents re-render)
    if (selectedGender !== user.gender) {
      setSelectedGender(user.gender as 'MALE' | 'FEMALE')
    }
  }

  // Fetch clothing data
  const { data: clothingData, isLoading } = useQuery({
    queryKey: ['clothing-my-template', selectedGender],
    queryFn: () => api.get('/clothing/my-clothing').then(res => res.data),
  })

  const updateGenderMutation = useMutation({
    mutationFn: async (gender: 'MALE' | 'FEMALE') => {
      return api.patch('/users/gender', { gender })
    },
    onSuccess: () => {
      toast.success('Geschlecht erfolgreich aktualisiert!')
      // Don't invalidate auth immediately - the local state is already correct
      // This prevents the flickering from user state changing
      queryClient.invalidateQueries({ queryKey: ['clothing-my-template'] })
      // Silently update auth in background without triggering re-render race
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['auth'] })
      }, 500)
    },
    onError: (error: any) => {
      // Revert to previous gender on error
      const previousGender = user?.gender as 'MALE' | 'FEMALE' || 'MALE'
      setSelectedGender(previousGender)
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren des Geschlechts')
    },
  })

  const handleGenderChange = (gender: 'MALE' | 'FEMALE') => {
    // Don't do anything if already selected or mutation is pending
    if (gender === selectedGender || updateGenderMutation.isPending) return
    
    // Optimistically update the UI immediately
    setSelectedGender(gender)
    updateGenderMutation.mutate(gender)
  }

  // Check type of clothing data
  const isFreeChoice = clothingData?.type === 'free_choice'
  const hasOutfits = clothingData?.type === 'outfits'
  const outfits: MaleOutfit[] = hasOutfits ? (clothingData?.outfits || []) : []
  const hasSicario = !!clothingData?.sicario

  // Get current selected outfit
  const currentOutfit = outfits.find(o => o.outfitNumber === selectedOutfit) || outfits[0]

  // Create clothing parts display for sicario
  const createClothingParts = (data: any): ClothingDisplay[] => [
    { part: 'mask', label: 'Maske', item: data?.maskItem ?? null, variation: data?.maskVariation ?? null, customizable: data?.maskCustomizable ?? false, color: data?.maskColor ?? null },
    { part: 'torso', label: 'Torso', item: data?.torsoItem ?? null, variation: data?.torsoVariation ?? null, customizable: data?.torsoCustomizable ?? false, color: data?.torsoColor ?? null },
    { part: 'tshirt', label: 'T-Shirt', item: data?.tshirtItem ?? null, variation: data?.tshirtVariation ?? null, customizable: data?.tshirtCustomizable ?? false, color: data?.tshirtColor ?? null },
    { part: 'vest', label: 'Weste', item: data?.vesteItem ?? null, variation: data?.vesteVariation ?? null, customizable: data?.vesteCustomizable ?? false, color: data?.vesteColor ?? null },
    { part: 'pants', label: 'Hose', item: data?.hoseItem ?? null, variation: data?.hoseVariation ?? null, customizable: data?.hoseCustomizable ?? false, color: data?.hoseColor ?? null },
    { part: 'shoes', label: 'Schuhe', item: data?.schuheItem ?? null, variation: data?.schuheVariation ?? null, customizable: data?.schuheCustomizable ?? false, color: data?.schuheColor ?? null },
    { part: 'backpack', label: 'Rucksack', item: data?.rucksackItem ?? null, variation: data?.rucksackVariation ?? null, customizable: data?.rucksackCustomizable ?? false, color: data?.rucksackColor ?? null },
  ]

  const sicarioClothingParts = hasSicario ? createClothingParts(clothingData.sicario) : null

  // Create clothing parts from outfit
  const outfitClothingParts = currentOutfit ? [
    { label: 'Maske', item: currentOutfit.maskItem, variation: currentOutfit.maskVariation },
    { label: 'Torso', item: currentOutfit.torsoItem, variation: currentOutfit.torsoVariation },
    { label: 'T-Shirt', item: currentOutfit.tshirtItem, variation: currentOutfit.tshirtVariation },
    { label: 'Weste', item: currentOutfit.vesteItem, variation: currentOutfit.vesteVariation },
    { label: 'Hose', item: currentOutfit.hoseItem, variation: currentOutfit.hoseVariation },
    { label: 'Schuhe', item: currentOutfit.schuheItem, variation: currentOutfit.schuheVariation },
    { label: 'Rucksack', item: currentOutfit.rucksackItem, variation: currentOutfit.rucksackVariation },
  ] : []

  if (isLoading) {
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
            <h1 className="text-3xl font-bold text-white">Familienkleidung</h1>
            <p className="text-gray-400 mt-1">
              {isFreeChoice 
                ? 'Du hast freie Klamottenwahl!' 
                : 'Wähle eines der 5 vordefinierten Outfits'}
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

      {/* Main Content */}
      {isFreeChoice ? (
        // Free Choice Display (Women) - mit Farbvorgaben und Pflichtkleidung
        <Card className="bg-gray-900/50 border-green-500/30 overflow-hidden">
          <CardHeader className="border-b border-green-500/20">
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-400" />
              Damenkleidung
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Farbvorgabe */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-2">Farbvorgabe</h3>
              <p className="text-gray-300">
                <span className="text-white font-medium">Schwarz</span> und <span className="text-white font-medium">elegant</span>.
                In Ausnahmefällen sind <span className="text-gray-400">graue Elemente</span> erlaubt.
              </p>
            </div>

            {/* Vorgeschriebene Kleidung */}
            <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
              <h3 className="text-lg font-semibold text-amber-300 mb-3">Vorgeschriebene Kleidung</h3>
              <div className="grid gap-3">
                <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                  <span className="text-white font-medium">Maske</span>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Item</p>
                      <p className="text-lg font-mono text-amber-400">310</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Variation</p>
                      <p className="text-lg font-mono text-amber-400">15</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                  <span className="text-white font-medium">Weste</span>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Item</p>
                      <p className="text-lg font-mono text-amber-400">140</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Variation</p>
                      <p className="text-lg font-mono text-amber-400">23</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                  <span className="text-white font-medium">Hose</span>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Item</p>
                      <p className="text-lg font-mono text-amber-400">368</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Variation</p>
                      <p className="text-lg font-mono text-amber-400">4</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Freie Wahl Info */}
            <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold text-green-300">Freie Wahl</h3>
              </div>
              <p className="text-green-200/80">
                Alle anderen Kleidungsstücke (Torso, T-Shirt, Schuhe, etc.) sowie <span className="text-green-300 font-medium">Accessoires</span> sind frei wählbar.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : hasOutfits && outfits.length > 0 ? (
        // Outfit Selection (Men)
        <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white flex items-center gap-2">
              <Shirt className="h-5 w-5 text-amber-400" />
              Outfit auswählen
            </CardTitle>
            <CardDescription className="text-gray-400">
              Wähle eines der 5 vordefinierten Outfits aus.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            {/* Outfit Dropdown */}
            <Select
              value={String(selectedOutfit)}
              onValueChange={(val) => setSelectedOutfit(parseInt(val))}
            >
              <SelectTrigger className="w-full h-16 bg-gray-800/50 border-gray-700">
                <SelectValue>
                  <div className="flex items-center gap-3">
                    <img
                      src={`/outfit-images/outfit-${selectedOutfit}.png`}
                      alt={currentOutfit?.name || `Outfit ${selectedOutfit}`}
                      className="h-10 w-10 rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <span className="text-white font-medium">{currentOutfit?.name || `Outfit ${selectedOutfit}`}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {outfits.map((outfit) => (
                  <SelectItem key={outfit.outfitNumber} value={String(outfit.outfitNumber)}>
                    <div className="flex items-center gap-3">
                      <img
                        src={`/outfit-images/outfit-${outfit.outfitNumber}.png`}
                        alt={outfit.name}
                        className="h-10 w-10 rounded object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <span>{outfit.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Outfit Preview and Clothing Parts - Side by Side */}
            <div className="flex gap-6 items-center">
              {/* Left: Outfit Preview Image */}
              <div className="flex-shrink-0">
                <img
                  src={`/outfit-images/outfit-${selectedOutfit}.png`}
                  alt={currentOutfit?.name || `Outfit ${selectedOutfit}`}
                  className="w-64 h-auto rounded-xl border border-gray-700 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = ''
                    e.currentTarget.alt = 'Bild nicht verfügbar'
                  }}
                />
              </div>

              {/* Right: Clothing Parts Table */}
              <div className="flex-1 grid gap-3">
                {outfitClothingParts.map((part, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-gray-700 bg-gray-800/30 p-4"
                  >
                    <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{part.label}</h3>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Item</p>
                        <p className="text-lg font-mono text-white">{part.item ?? '-'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Variation</p>
                        <p className="text-lg font-mono text-white">{part.variation ?? '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>

            {/* Accessoires Info */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
              <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-300">
                <span className="font-medium">Accessoires</span> (Uhren, Ketten, Brillen, etc.) sind frei wählbar!
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-300">
                Die Outfits wurden von der Leaderschaft festgelegt. Wähle eines der 5 vordefinierten Outfits.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-6 text-center text-gray-400">
            Keine Kleidungsdaten verfügbar.
          </CardContent>
        </Card>
      )}

      {/* Sicario Clothing Section */}
      {sicarioClothingParts && (
        <Card className="relative overflow-hidden bg-gray-900/50 border border-orange-500/30">
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl" />
          <CardHeader className="border-b border-orange-500/20 relative">
            <CardTitle className="text-white flex items-center gap-2">
              <Shirt className="h-5 w-5 text-orange-400" />
              Sicario Kleidung
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
                Du kannst zwischen deinen Familien-Outfits und der Sicario-Kleidung wählen.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
