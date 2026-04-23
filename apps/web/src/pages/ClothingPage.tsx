import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { Loader2, Shirt, Info, Check, Image as ImageIcon } from 'lucide-react'
import { api } from '../lib/api'

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
  const [selectedOutfit, setSelectedOutfit] = useState<number>(1)

  // Fetch clothing data
  const { data: clothingData, isLoading } = useQuery({
    queryKey: ['clothing-my-template'],
    queryFn: () => api.get('/clothing/my-clothing').then(res => res.data),
  })

  // Check type of clothing data
  const hasOutfits = clothingData?.type === 'outfits'
  const outfits: MaleOutfit[] = hasOutfits ? (clothingData?.outfits || []) : []
  const hasSicario = !!clothingData?.sicario

  // Get current selected outfit
  const currentOutfit = outfits.find(o => o.outfitNumber === selectedOutfit) || outfits[0]

  // Create clothing parts display for sicario
  const createClothingParts = (data: any): ClothingDisplay[] => [
    { part: 'mask', label: 'Maske', item: data?.maskItem ?? null, variation: data?.maskVariation ?? null, customizable: data?.maskCustomizable ?? false, color: data?.maskColor ?? null },
    { part: 'torso', label: 'Unterhemd', item: data?.torsoItem ?? null, variation: data?.torsoVariation ?? null, customizable: data?.torsoCustomizable ?? false, color: data?.torsoColor ?? null },
    { part: 'tshirt', label: 'Tops', item: data?.tshirtItem ?? null, variation: data?.tshirtVariation ?? null, customizable: data?.tshirtCustomizable ?? false, color: data?.tshirtColor ?? null },
    { part: 'arms', label: 'Arme', item: data?.armeItem ?? null, variation: data?.armeVariation ?? null, customizable: data?.armeCustomizable ?? false, color: data?.armeColor ?? null },
    { part: 'vest', label: 'Weste', item: data?.vesteItem ?? null, variation: data?.vesteVariation ?? null, customizable: data?.vesteCustomizable ?? false, color: data?.vesteColor ?? null },
    { part: 'pants', label: 'Hose', item: data?.hoseItem ?? null, variation: data?.hoseVariation ?? null, customizable: data?.hoseCustomizable ?? false, color: data?.hoseColor ?? null },
    { part: 'shoes', label: 'Schuhe', item: data?.schuheItem ?? null, variation: data?.schuheVariation ?? null, customizable: data?.schuheCustomizable ?? false, color: data?.schuheColor ?? null },
    { part: 'backpack', label: 'Rucksack', item: data?.rucksackItem ?? null, variation: data?.rucksackVariation ?? null, customizable: data?.rucksackCustomizable ?? false, color: data?.rucksackColor ?? null },
  ]

  const sicarioClothingParts = hasSicario ? createClothingParts(clothingData.sicario) : null

  // Create clothing parts from outfit
  const outfitClothingParts = currentOutfit ? [
    { label: 'Maske', item: currentOutfit.maskItem, variation: currentOutfit.maskVariation },
    { label: 'Unterhemd', item: currentOutfit.torsoItem, variation: currentOutfit.torsoVariation },
    { label: 'Tops', item: currentOutfit.tshirtItem, variation: currentOutfit.tshirtVariation },
    { label: 'Arme', item: (currentOutfit as any).armeItem, variation: (currentOutfit as any).armeVariation },
    { label: 'Weste', item: currentOutfit.vesteItem, variation: currentOutfit.vesteVariation },
    { label: 'Hose', item: currentOutfit.hoseItem, variation: currentOutfit.hoseVariation },
    { label: 'Schuhe', item: currentOutfit.schuheItem, variation: currentOutfit.schuheVariation },
    { label: 'Rucksack', item: currentOutfit.rucksackItem, variation: currentOutfit.rucksackVariation },
  ] : []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-zinc-400">Lade Kleidungsvorlage...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-orange-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
            <Shirt className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Familienkleidung</h1>
            <p className="text-zinc-400 mt-1">Wähle eines der vordefinierten Outfits</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {hasOutfits && outfits.length > 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-white flex items-center gap-2">
              <Shirt className="h-5 w-5 text-orange-400" />
              Outfit auswählen
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Wähle eines der vordefinierten Outfits aus.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            {/* Outfit Dropdown */}
            <Select
              value={String(selectedOutfit)}
              onValueChange={(val) => setSelectedOutfit(parseInt(val))}
            >
              <SelectTrigger className="w-full h-16 bg-zinc-800/50 border-zinc-700">
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
              <SelectContent className="bg-zinc-800 border-zinc-700">
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
                  className="w-64 h-auto rounded-xl border border-zinc-700 object-cover"
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
                    className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-4"
                  >
                    <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{part.label}</h3>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Item</p>
                        <p className="text-lg font-mono text-white">{part.item ?? '-'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Variation</p>
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

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-300">
                Die Outfits wurden von der Leaderschaft festgelegt. Wähle eines der vordefinierten Outfits.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6 text-center text-zinc-400">
            Keine Kleidungsdaten verfügbar.
          </CardContent>
        </Card>
      )}

      {/* Sicario Clothing Section */}
      {sicarioClothingParts && (
        <Card className="relative overflow-hidden bg-zinc-900/50 border border-orange-500/30">
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
                    : 'border-zinc-700 bg-zinc-800/30'
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
                        <span className="text-zinc-400 text-sm">Vorgabe:</span>
                        <span className="text-white font-mono bg-zinc-800 px-2 py-1 rounded">{part.color}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Item</p>
                      <p className="text-lg font-mono text-white">{part.item !== null ? part.item : '-'}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Variation</p>
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
