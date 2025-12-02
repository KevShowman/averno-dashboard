import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Checkbox } from '../components/ui/checkbox'
import { Badge } from '../components/ui/badge'
import { useAuthStore } from '../stores/auth'
import { toast } from 'sonner'
import { Loader2, Shirt, Save, User, Users, Settings } from 'lucide-react'
import { clothingApi } from '../lib/api'

type Gender = 'MALE' | 'FEMALE'

interface ClothingItemData {
  item: number | null
  variation: number | null
  customizable: boolean
  color: string | null
}

interface ClothingTemplate {
  rankGroup: string
  mask: { male: ClothingItemData; female: ClothingItemData }
  torso: { male: ClothingItemData; female: ClothingItemData }
  tshirt: { male: ClothingItemData; female: ClothingItemData }
  vest: { male: ClothingItemData; female: ClothingItemData }
  pants: { male: ClothingItemData; female: ClothingItemData }
  shoes: { male: ClothingItemData; female: ClothingItemData }
  backpack: { male: ClothingItemData; female: ClothingItemData }
}

const rankGroups = [
  { id: '1-3', label: 'Ränge 1-3', sublabel: 'El Novato, El Protector, El Confidente' },
  { id: '4-6', label: 'Ränge 4-6', sublabel: 'El Prefecto, Soldado, El Teniente' },
  { id: '7-9', label: 'Ränge 7-9', sublabel: 'El Encargado, El Mentor, El Custodio' },
  { id: 'EL_PATRON', label: 'El Patrón', sublabel: 'Leitung' },
  { id: 'DON_CAPITAN', label: 'Don - El Capitán', sublabel: 'Leitung' },
  { id: 'DON_COMANDANTE', label: 'Don - El Comandante', sublabel: 'Leitung' },
  { id: 'EL_MANO_DERECHA', label: 'El Mano Derecha', sublabel: 'Leitung' },
  { id: 'SICARIO', label: 'Sicario', sublabel: 'Funktionsrolle' },
]

const clothingParts = [
  { id: 'mask', label: 'Maske' },
  { id: 'torso', label: 'Torso' },
  { id: 'tshirt', label: 'T-Shirt' },
  { id: 'vest', label: 'Weste' },
  { id: 'pants', label: 'Hose' },
  { id: 'shoes', label: 'Schuhe' },
  { id: 'backpack', label: 'Rucksack' },
]

const emptyItem = (): ClothingItemData => ({
  item: null,
  variation: null,
  customizable: false,
  color: null,
})

const emptyTemplate = (): ClothingTemplate => ({
  rankGroup: '',
  mask: { male: emptyItem(), female: emptyItem() },
  torso: { male: emptyItem(), female: emptyItem() },
  tshirt: { male: emptyItem(), female: emptyItem() },
  vest: { male: emptyItem(), female: emptyItem() },
  pants: { male: emptyItem(), female: emptyItem() },
  shoes: { male: emptyItem(), female: emptyItem() },
  backpack: { male: emptyItem(), female: emptyItem() },
})

export default function ClothingManagementPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedRankGroup, setSelectedRankGroup] = useState<string>('1-3')
  const [selectedGender, setSelectedGender] = useState<Gender>('MALE')
  const [template, setTemplate] = useState<ClothingTemplate>(emptyTemplate())

  const { data: loadedTemplate, isLoading } = useQuery({
    queryKey: ['clothing-template', selectedRankGroup],
    queryFn: () => clothingApi.getTemplate(selectedRankGroup),
    enabled: !!selectedRankGroup,
  })

  useEffect(() => {
    if (loadedTemplate) {
      setTemplate({
        rankGroup: selectedRankGroup,
        mask: {
          male: { item: loadedTemplate.maskItemMale, variation: loadedTemplate.maskVariationMale, customizable: loadedTemplate.maskCustomizableMale, color: loadedTemplate.maskColorMale },
          female: { item: loadedTemplate.maskItemFemale, variation: loadedTemplate.maskVariationFemale, customizable: loadedTemplate.maskCustomizableFemale, color: loadedTemplate.maskColorFemale },
        },
        torso: {
          male: { item: loadedTemplate.torsoItemMale, variation: loadedTemplate.torsoVariationMale, customizable: loadedTemplate.torsoCustomizableMale, color: loadedTemplate.torsoColorMale },
          female: { item: loadedTemplate.torsoItemFemale, variation: loadedTemplate.torsoVariationFemale, customizable: loadedTemplate.torsoCustomizableFemale, color: loadedTemplate.torsoColorFemale },
        },
        tshirt: {
          male: { item: loadedTemplate.tshirtItemMale, variation: loadedTemplate.tshirtVariationMale, customizable: loadedTemplate.tshirtCustomizableMale, color: loadedTemplate.tshirtColorMale },
          female: { item: loadedTemplate.tshirtItemFemale, variation: loadedTemplate.tshirtVariationFemale, customizable: loadedTemplate.tshirtCustomizableFemale, color: loadedTemplate.tshirtColorFemale },
        },
        vest: {
          male: { item: loadedTemplate.vesteItemMale, variation: loadedTemplate.vesteVariationMale, customizable: loadedTemplate.vesteCustomizableMale, color: loadedTemplate.vesteColorMale },
          female: { item: loadedTemplate.vesteItemFemale, variation: loadedTemplate.vesteVariationFemale, customizable: loadedTemplate.vesteCustomizableFemale, color: loadedTemplate.vesteColorFemale },
        },
        pants: {
          male: { item: loadedTemplate.hoseItemMale, variation: loadedTemplate.hoseVariationMale, customizable: loadedTemplate.hoseCustomizableMale, color: loadedTemplate.hoseColorMale },
          female: { item: loadedTemplate.hoseItemFemale, variation: loadedTemplate.hoseVariationFemale, customizable: loadedTemplate.hoseCustomizableFemale, color: loadedTemplate.hoseColorFemale },
        },
        shoes: {
          male: { item: loadedTemplate.schuheItemMale, variation: loadedTemplate.schuheVariationMale, customizable: loadedTemplate.schuheCustomizableMale, color: loadedTemplate.schuheColorMale },
          female: { item: loadedTemplate.schuheItemFemale, variation: loadedTemplate.schuheVariationFemale, customizable: loadedTemplate.schuheCustomizableFemale, color: loadedTemplate.schuheColorFemale },
        },
        backpack: {
          male: { item: loadedTemplate.rucksackItemMale, variation: loadedTemplate.rucksackVariationMale, customizable: loadedTemplate.rucksackCustomizableMale, color: loadedTemplate.rucksackColorMale },
          female: { item: loadedTemplate.rucksackItemFemale, variation: loadedTemplate.rucksackVariationFemale, customizable: loadedTemplate.rucksackCustomizableFemale, color: loadedTemplate.rucksackColorFemale },
        },
      })
    } else {
      setTemplate({ ...emptyTemplate(), rankGroup: selectedRankGroup })
    }
  }, [loadedTemplate, selectedRankGroup])

  const saveMutation = useMutation({
    mutationFn: async (data: ClothingTemplate) => {
      return clothingApi.saveTemplate(data.rankGroup, {
        maskItemMale: data.mask.male.item, maskVariationMale: data.mask.male.variation, maskCustomizableMale: data.mask.male.customizable, maskColorMale: data.mask.male.color,
        maskItemFemale: data.mask.female.item, maskVariationFemale: data.mask.female.variation, maskCustomizableFemale: data.mask.female.customizable, maskColorFemale: data.mask.female.color,
        torsoItemMale: data.torso.male.item, torsoVariationMale: data.torso.male.variation, torsoCustomizableMale: data.torso.male.customizable, torsoColorMale: data.torso.male.color,
        torsoItemFemale: data.torso.female.item, torsoVariationFemale: data.torso.female.variation, torsoCustomizableFemale: data.torso.female.customizable, torsoColorFemale: data.torso.female.color,
        tshirtItemMale: data.tshirt.male.item, tshirtVariationMale: data.tshirt.male.variation, tshirtCustomizableMale: data.tshirt.male.customizable, tshirtColorMale: data.tshirt.male.color,
        tshirtItemFemale: data.tshirt.female.item, tshirtVariationFemale: data.tshirt.female.variation, tshirtCustomizableFemale: data.tshirt.female.customizable, tshirtColorFemale: data.tshirt.female.color,
        vesteItemMale: data.vest.male.item, vesteVariationMale: data.vest.male.variation, vesteCustomizableMale: data.vest.male.customizable, vesteColorMale: data.vest.male.color,
        vesteItemFemale: data.vest.female.item, vesteVariationFemale: data.vest.female.variation, vesteCustomizableFemale: data.vest.female.customizable, vesteColorFemale: data.vest.female.color,
        hoseItemMale: data.pants.male.item, hoseVariationMale: data.pants.male.variation, hoseCustomizableMale: data.pants.male.customizable, hoseColorMale: data.pants.male.color,
        hoseItemFemale: data.pants.female.item, hoseVariationFemale: data.pants.female.variation, hoseCustomizableFemale: data.pants.female.customizable, hoseColorFemale: data.pants.female.color,
        schuheItemMale: data.shoes.male.item, schuheVariationMale: data.shoes.male.variation, schuheCustomizableMale: data.shoes.male.customizable, schuheColorMale: data.shoes.male.color,
        schuheItemFemale: data.shoes.female.item, schuheVariationFemale: data.shoes.female.variation, schuheCustomizableFemale: data.shoes.female.customizable, schuheColorFemale: data.shoes.female.color,
        rucksackItemMale: data.backpack.male.item, rucksackVariationMale: data.backpack.male.variation, rucksackCustomizableMale: data.backpack.male.customizable, rucksackColorMale: data.backpack.male.color,
        rucksackItemFemale: data.backpack.female.item, rucksackVariationFemale: data.backpack.female.variation, rucksackCustomizableFemale: data.backpack.female.customizable, rucksackColorFemale: data.backpack.female.color,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clothing-template', selectedRankGroup] })
      toast.success('Kleidungsvorlage erfolgreich gespeichert!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern der Vorlage')
    },
  })

  const handleSave = () => {
    saveMutation.mutate(template)
  }

  const updateClothingPart = (
    part: keyof Omit<ClothingTemplate, 'rankGroup'>,
    gender: Gender,
    field: keyof ClothingItemData,
    value: any
  ) => {
    setTemplate((prev) => ({
      ...prev,
      [part]: {
        ...prev[part],
        [gender.toLowerCase()]: {
          ...prev[part][gender.toLowerCase() as 'male' | 'female'],
          [field]: value,
        },
      },
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-fuchsia-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/5 via-transparent to-pink-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-fuchsia-600 to-pink-600 rounded-xl shadow-lg shadow-fuchsia-500/30">
            <Settings className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Kleidungsverwaltung</h1>
            <p className="text-gray-400 mt-1">
              Kleidungsvorlagen für verschiedene Ranggruppen
            </p>
          </div>
        </div>
      </div>

      {/* Rank Group Selector */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white flex items-center gap-2">
            <Shirt className="h-5 w-5 text-fuchsia-400" />
            Ranggruppe auswählen
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {rankGroups.map((group) => (
              <Button
                key={group.id}
                variant={selectedRankGroup === group.id ? 'default' : 'outline'}
                onClick={() => setSelectedRankGroup(group.id)}
                className={`h-auto py-3 flex flex-col items-start text-left ${
                  selectedRankGroup === group.id 
                    ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white' 
                    : 'border-gray-700 hover:bg-gray-800'
                }`}
              >
                <span className="font-medium">{group.label}</span>
                <span className="text-xs opacity-70">{group.sublabel}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gender Selector */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white">Geschlecht auswählen</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Button
              variant={selectedGender === 'MALE' ? 'default' : 'outline'}
              onClick={() => setSelectedGender('MALE')}
              className={`flex-1 h-12 ${
                selectedGender === 'MALE' 
                  ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white' 
                  : 'border-gray-700 hover:bg-gray-800'
              }`}
            >
              <User className="mr-2 h-4 w-4" />
              Männlich
            </Button>
            <Button
              variant={selectedGender === 'FEMALE' ? 'default' : 'outline'}
              onClick={() => setSelectedGender('FEMALE')}
              className={`flex-1 h-12 ${
                selectedGender === 'FEMALE' 
                  ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white' 
                  : 'border-gray-700 hover:bg-gray-800'
              }`}
            >
              <Users className="mr-2 h-4 w-4" />
              Weiblich
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clothing Configuration */}
      {isLoading ? (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-fuchsia-500" />
              <p className="text-gray-400">Lade Vorlage...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white">
              Kleidung für {rankGroups.find((g) => g.id === selectedRankGroup)?.label} ({selectedGender === 'MALE' ? 'Männlich' : 'Weiblich'})
            </CardTitle>
            <CardDescription className="text-gray-400">
              Legen Sie für jeden Kleidungsteil die Item-ID, Variation und ob es anpassbar ist fest.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            {clothingParts.map((part) => {
              const partKey = part.id as keyof Omit<ClothingTemplate, 'rankGroup'>
              const partData = template[partKey][selectedGender.toLowerCase() as 'male' | 'female']

              return (
                <div key={part.id} className="space-y-4 border-b border-gray-800 pb-6 last:border-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{part.label}</h3>
                    {partData.customizable && (
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Anpassbar</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Item</Label>
                      <Input
                        type="number"
                        placeholder="z.B. 1"
                        value={partData.item ?? ''}
                        onChange={(e) =>
                          updateClothingPart(partKey, selectedGender, 'item', e.target.value ? parseInt(e.target.value) : null)
                        }
                        disabled={partData.customizable}
                        className="bg-gray-800/50 border-gray-700 text-white h-10 focus:border-fuchsia-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Variation</Label>
                      <Input
                        type="number"
                        placeholder="z.B. 0"
                        value={partData.variation ?? ''}
                        onChange={(e) =>
                          updateClothingPart(partKey, selectedGender, 'variation', e.target.value ? parseInt(e.target.value) : null)
                        }
                        disabled={partData.customizable}
                        className="bg-gray-800/50 border-gray-700 text-white h-10 focus:border-fuchsia-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Farbname</Label>
                      <Input
                        type="text"
                        placeholder="z.B. schwarz"
                        value={partData.color ?? ''}
                        onChange={(e) =>
                          updateClothingPart(partKey, selectedGender, 'color', e.target.value || null)
                        }
                        disabled={!partData.customizable}
                        className="bg-gray-800/50 border-gray-700 text-white h-10 focus:border-fuchsia-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center space-x-2 h-10">
                        <Checkbox
                          id={`${part.id}-customizable`}
                          checked={partData.customizable}
                          onCheckedChange={(checked) => {
                            updateClothingPart(partKey, selectedGender, 'customizable', checked === true)
                            if (checked === true) {
                              updateClothingPart(partKey, selectedGender, 'item', null)
                              updateClothingPart(partKey, selectedGender, 'variation', null)
                            }
                          }}
                        />
                        <Label htmlFor={`${part.id}-customizable`} className="text-sm text-gray-300 cursor-pointer">
                          Anpassbar
                        </Label>
                      </div>
                    </div>
                  </div>
                  {partData.customizable && (
                    <p className="text-sm text-blue-400">
                      ℹ️ Bei "Anpassbar" wird KEINE Item/Variation vorgegeben. Benutzer können das Teil frei wählen.
                    </p>
                  )}
                </div>
              )
            })}

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white h-11 px-6"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Vorlage speichern
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
