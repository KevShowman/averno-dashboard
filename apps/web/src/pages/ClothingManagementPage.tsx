import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Checkbox } from '../components/ui/checkbox'
import { useAuthStore } from '../stores/auth'
import { toast } from 'sonner'
import { Loader2, Shirt, Save } from 'lucide-react'
import { clothingApi } from '../lib/api'

interface ClothingItem {
  item: number | null
  variation: number | null
  customizable: boolean
  color: number | null
}

interface ClothingTemplate {
  rankGroup: string
  mask: ClothingItem
  torso: ClothingItem
  tshirt: ClothingItem
  vest: ClothingItem
  pants: ClothingItem
  shoes: ClothingItem
}

const rankGroups = [
  { id: '1-3', label: 'Ränge 1-3 (El Novato, El Protector, El Confidente)' },
  { id: '4-6', label: 'Ränge 4-6 (El Prefecto, Soldado, El Teniente)' },
  { id: '7-9', label: 'Ränge 7-9 (El Encargado, El Mentor, El Custodio)' },
  { id: 'EL_PATRON', label: 'El Patrón' },
  { id: 'DON_CAPITAN', label: 'Don - El Capitán' },
  { id: 'DON_COMANDANTE', label: 'Don - El Comandante' },
  { id: 'EL_MANO_DERECHA', label: 'El Mano Derecha' },
]

const clothingParts = [
  { id: 'mask', label: 'Maske' },
  { id: 'torso', label: 'Torso' },
  { id: 'tshirt', label: 'T-Shirt' },
  { id: 'vest', label: 'Weste' },
  { id: 'pants', label: 'Hose' },
  { id: 'shoes', label: 'Schuhe' },
]

const emptyTemplate = (): ClothingTemplate => ({
  rankGroup: '',
  mask: { item: null, variation: null, customizable: false, color: null },
  torso: { item: null, variation: null, customizable: false, color: null },
  tshirt: { item: null, variation: null, customizable: false, color: null },
  vest: { item: null, variation: null, customizable: false, color: null },
  pants: { item: null, variation: null, customizable: false, color: null },
  shoes: { item: null, variation: null, customizable: false, color: null },
})

export default function ClothingManagementPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedRankGroup, setSelectedRankGroup] = useState<string>('1-3')
  const [template, setTemplate] = useState<ClothingTemplate>(emptyTemplate())

  // Load template for selected rank group
  const { data: loadedTemplate, isLoading } = useQuery({
    queryKey: ['clothing-template', selectedRankGroup],
    queryFn: () => clothingApi.getTemplate(selectedRankGroup),
    enabled: !!selectedRankGroup,
  })

  // Update local template when data is loaded
  useEffect(() => {
    if (loadedTemplate) {
      setTemplate({
        rankGroup: selectedRankGroup,
        mask: {
          item: loadedTemplate.maskItem,
          variation: loadedTemplate.maskVariation,
          customizable: loadedTemplate.maskCustomizable,
          color: loadedTemplate.maskColor,
        },
        torso: {
          item: loadedTemplate.torsoItem,
          variation: loadedTemplate.torsoVariation,
          customizable: loadedTemplate.torsoCustomizable,
          color: loadedTemplate.torsoColor,
        },
        tshirt: {
          item: loadedTemplate.tshirtItem,
          variation: loadedTemplate.tshirtVariation,
          customizable: loadedTemplate.tshirtCustomizable,
          color: loadedTemplate.tshirtColor,
        },
        vest: {
          item: loadedTemplate.vesteItem,
          variation: loadedTemplate.vesteVariation,
          customizable: loadedTemplate.vesteCustomizable,
          color: loadedTemplate.vesteColor,
        },
        pants: {
          item: loadedTemplate.hoseItem,
          variation: loadedTemplate.hoseVariation,
          customizable: loadedTemplate.hoseCustomizable,
          color: loadedTemplate.hoseColor,
        },
        shoes: {
          item: loadedTemplate.schuheItem,
          variation: loadedTemplate.schuheVariation,
          customizable: loadedTemplate.schuheCustomizable,
          color: loadedTemplate.schuheColor,
        },
      })
    } else {
      setTemplate({ ...emptyTemplate(), rankGroup: selectedRankGroup })
    }
  }, [loadedTemplate, selectedRankGroup])

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ClothingTemplate) => {
      return clothingApi.saveTemplate(data.rankGroup, {
        maskItem: data.mask.item,
        maskVariation: data.mask.variation,
        maskCustomizable: data.mask.customizable,
        maskColor: data.mask.color,
        torsoItem: data.torso.item,
        torsoVariation: data.torso.variation,
        torsoCustomizable: data.torso.customizable,
        torsoColor: data.torso.color,
        tshirtItem: data.tshirt.item,
        tshirtVariation: data.tshirt.variation,
        tshirtCustomizable: data.tshirt.customizable,
        tshirtColor: data.tshirt.color,
        vesteItem: data.vest.item,
        vesteVariation: data.vest.variation,
        vesteCustomizable: data.vest.customizable,
        vesteColor: data.vest.color,
        hoseItem: data.pants.item,
        hoseVariation: data.pants.variation,
        hoseCustomizable: data.pants.customizable,
        hoseColor: data.pants.color,
        schuheItem: data.shoes.item,
        schuheVariation: data.shoes.variation,
        schuheCustomizable: data.shoes.customizable,
        schuheColor: data.shoes.color,
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
    field: keyof ClothingItem,
    value: any
  ) => {
    setTemplate((prev) => ({
      ...prev,
      [part]: {
        ...prev[part],
        [field]: value,
      },
    }))
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Kleidungsverwaltung</h1>
        <p className="text-gray-400">
          Legen Sie die Kleidungsvorlagen für verschiedene Ranggruppen fest.
        </p>
      </header>

      {/* Rank Group Selector */}
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white">Ranggruppe auswählen</CardTitle>
          <CardDescription className="text-gray-400">
            Wählen Sie die Ranggruppe, für die Sie die Kleidung festlegen möchten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rankGroups.map((group) => (
              <Button
                key={group.id}
                variant={selectedRankGroup === group.id ? 'default' : 'outline'}
                onClick={() => setSelectedRankGroup(group.id)}
                className="justify-start"
              >
                <Shirt className="mr-2 h-4 w-4" />
                {group.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Clothing Configuration */}
      {isLoading ? (
        <Card className="lasanta-card">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : (
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white">
              Kleidung für {rankGroups.find((g) => g.id === selectedRankGroup)?.label}
            </CardTitle>
            <CardDescription className="text-gray-400">
              Legen Sie für jeden Kleidungsteil die Item-ID, Variation und ob es anpassbar ist fest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {clothingParts.map((part) => {
              const partKey = part.id as keyof Omit<ClothingTemplate, 'rankGroup'>
              const partData = template[partKey]

              return (
                <div key={part.id} className="space-y-4 border-b border-gray-700 pb-6 last:border-0">
                  <h3 className="text-lg font-semibold text-white">{part.label}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${part.id}-item`} className="text-gray-300">
                        Item
                      </Label>
                      <Input
                        id={`${part.id}-item`}
                        type="number"
                        placeholder="z.B. 1"
                        value={partData.item ?? ''}
                        onChange={(e) =>
                          updateClothingPart(
                            partKey,
                            'item',
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${part.id}-variation`} className="text-gray-300">
                        Variation
                      </Label>
                      <Input
                        id={`${part.id}-variation`}
                        type="number"
                        placeholder="z.B. 0"
                        value={partData.variation ?? ''}
                        onChange={(e) =>
                          updateClothingPart(
                            partKey,
                            'variation',
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${part.id}-color`} className="text-gray-300">
                        Farbvorgabe (nur bei "Anpassbar")
                      </Label>
                      <Input
                        id={`${part.id}-color`}
                        type="number"
                        placeholder="z.B. 0 für schwarz"
                        value={partData.color ?? ''}
                        onChange={(e) =>
                          updateClothingPart(
                            partKey,
                            'color',
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="bg-gray-800 border-gray-700 text-white"
                        disabled={!partData.customizable}
                      />
                    </div>
                    <div className="flex items-end space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${part.id}-customizable`}
                          checked={partData.customizable}
                          onCheckedChange={(checked) =>
                            updateClothingPart(partKey, 'customizable', checked === true)
                          }
                        />
                        <Label
                          htmlFor={`${part.id}-customizable`}
                          className="text-sm text-gray-300 cursor-pointer"
                        >
                          Anpassbar
                        </Label>
                      </div>
                    </div>
                  </div>
                  {partData.customizable && (
                    <p className="text-sm text-blue-400">
                      ℹ️ Bei "Anpassbar" wird KEINE Item/Variation vorgegeben. Benutzer können das Teil
                      frei wählen in der vorgegebenen Farbe.
                    </p>
                  )}
                </div>
              )
            })}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-primary hover:bg-primary/90"
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

