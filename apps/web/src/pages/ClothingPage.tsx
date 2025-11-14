import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuthStore } from '../stores/auth'
import { toast } from 'sonner'
import { Loader2, Shirt, Save, Info } from 'lucide-react'
import axios from '../lib/axios'

interface ClothingItem {
  item: number | null
  variation: number | null
}

interface UserClothing {
  mask: ClothingItem
  torso: ClothingItem
  tshirt: ClothingItem
  vest: ClothingItem
  pants: ClothingItem
  shoes: ClothingItem
}

interface TemplateItem {
  item: number | null
  variation: number | null
  customizable: boolean
  color: number | null
}

interface ClothingDisplay {
  part: string
  label: string
  item: number | null
  variation: number | null
  customizable: boolean
  color: number | null
}

export default function ClothingPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [userClothing, setUserClothing] = useState<UserClothing>({
    mask: { item: null, variation: null },
    torso: { item: null, variation: null },
    tshirt: { item: null, variation: null },
    vest: { item: null, variation: null },
    pants: { item: null, variation: null },
    shoes: { item: null, variation: null },
  })

  // Load template based on user's rank
  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['clothing-my-template'],
    queryFn: async () => {
      const response = await axios.get('/clothing/templates')
      return response.data
    },
  })

  // Load user's clothing choices
  const { data: myClothing, isLoading: clothingLoading } = useQuery({
    queryKey: ['my-clothing'],
    queryFn: async () => {
      const response = await axios.get('/clothing/my-clothing')
      return response.data
    },
  })

  // Update local state when data is loaded
  useEffect(() => {
    if (myClothing) {
      setUserClothing({
        mask: { item: myClothing.maskItem, variation: myClothing.maskVariation },
        torso: { item: myClothing.torsoItem, variation: myClothing.torsoVariation },
        tshirt: { item: myClothing.tshirtItem, variation: myClothing.tshirtVariation },
        vest: { item: myClothing.vesteItem, variation: myClothing.vesteVariation },
        pants: { item: myClothing.hoseItem, variation: myClothing.hoseVariation },
        shoes: { item: myClothing.schuheItem, variation: myClothing.schuheVariation },
      })
    }
  }, [myClothing])

  // Save user clothing mutation
  const saveMutation = useMutation({
    mutationFn: async (data: UserClothing) => {
      await axios.put('/clothing/my-clothing', {
        maskItem: data.mask.item,
        maskVariation: data.mask.variation,
        torsoItem: data.torso.item,
        torsoVariation: data.torso.variation,
        tshirtItem: data.tshirt.item,
        tshirtVariation: data.tshirt.variation,
        vesteItem: data.vest.item,
        vesteVariation: data.vest.variation,
        hoseItem: data.pants.item,
        hoseVariation: data.pants.variation,
        schuheItem: data.shoes.item,
        schuheVariation: data.shoes.variation,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-clothing'] })
      toast.success('Kleidung erfolgreich gespeichert!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern der Kleidung')
    },
  })

  const handleSave = () => {
    saveMutation.mutate(userClothing)
  }

  const updateClothingPart = (
    part: keyof UserClothing,
    field: keyof ClothingItem,
    value: number | null
  ) => {
    setUserClothing((prev) => ({
      ...prev,
      [part]: {
        ...prev[part],
        [field]: value,
      },
    }))
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

  const isLoading = templateLoading || clothingLoading

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Meine Kleidung</h1>
        <p className="text-gray-400">
          Hier sehen Sie Ihre Kleidung basierend auf Ihrem Rang. Anpassbare Teile können Sie selbst
          wählen.
        </p>
      </header>

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
              Ihre Kleidungsvorlage
            </CardTitle>
            <CardDescription className="text-gray-400">
              Basierend auf Ihrem Rang ({user?.role})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {clothingParts.map((part) => {
              const partKey = part.part as keyof UserClothing
              const partData = userClothing[partKey]
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
                        Anpassbar
                      </span>
                    )}
                  </div>

                  {isCustomizable ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`${part.part}-item`} className="text-gray-300">
                          Item
                        </Label>
                        <Input
                          id={`${part.part}-item`}
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
                        <Label htmlFor={`${part.part}-variation`} className="text-gray-300">
                          Variation
                        </Label>
                        <Input
                          id={`${part.part}-variation`}
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
                      {part.color !== null && (
                        <div className="col-span-2">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Info className="h-4 w-4" />
                            <span>Farbvorgabe: {part.color}</span>
                          </div>
                        </div>
                      )}
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
                      <p className="text-xs text-gray-500 pt-2">
                        Diese Einstellung wurde von der Leitung festgelegt und kann nicht geändert
                        werden.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}

            {clothingParts.some((p) => p.customizable) && (
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
                      Änderungen speichern
                    </>
                  )}
                </Button>
              </div>
            )}

            {!clothingParts.some((p) => p.customizable) && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                <Info className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-blue-300">
                  Alle Kleidungsteile wurden von der Leitung festgelegt. Sie können derzeit keine
                  Anpassungen vornehmen.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

