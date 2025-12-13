import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Checkbox } from '../components/ui/checkbox'
import { Badge } from '../components/ui/badge'
import { useAuthStore } from '../stores/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { toast } from 'sonner'
import { Loader2, Shirt, Save, Settings, Upload, Image as ImageIcon, User, Crosshair } from 'lucide-react'
import { api } from '../lib/api'

interface MaleOutfit {
  id: string
  outfitNumber: number
  name: string
  imagePath?: string
  maskItem?: number | null
  maskVariation?: number | null
  torsoItem?: number | null
  torsoVariation?: number | null
  tshirtItem?: number | null
  tshirtVariation?: number | null
  vesteItem?: number | null
  vesteVariation?: number | null
  hoseItem?: number | null
  hoseVariation?: number | null
  schuheItem?: number | null
  schuheVariation?: number | null
  rucksackItem?: number | null
  rucksackVariation?: number | null
}

interface ClothingItemData {
  item: number | null
  variation: number | null
  customizable: boolean
  color: string | null
}

// Use relative path for API - works in both dev and prod
const API_BASE = '/api'

const clothingParts = [
  { id: 'mask', label: 'Maske', itemKey: 'maskItem', varKey: 'maskVariation' },
  { id: 'torso', label: 'Torso', itemKey: 'torsoItem', varKey: 'torsoVariation' },
  { id: 'tshirt', label: 'T-Shirt', itemKey: 'tshirtItem', varKey: 'tshirtVariation' },
  { id: 'veste', label: 'Weste', itemKey: 'vesteItem', varKey: 'vesteVariation' },
  { id: 'hose', label: 'Hose', itemKey: 'hoseItem', varKey: 'hoseVariation' },
  { id: 'schuhe', label: 'Schuhe', itemKey: 'schuheItem', varKey: 'schuheVariation' },
  { id: 'rucksack', label: 'Rucksack', itemKey: 'rucksackItem', varKey: 'rucksackVariation' },
]

export default function ClothingManagementPage() {
  const { user } = useAuthStore()
  usePageTitle('Kleidungsverwaltung')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'outfits' | 'sicario'>('outfits')
  const [selectedOutfit, setSelectedOutfit] = useState<number>(1)
  const [outfitForm, setOutfitForm] = useState<Partial<MaleOutfit>>({})
  const [sicarioForm, setSicarioForm] = useState<Record<string, ClothingItemData>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch male outfits
  const { data: outfits = [], isLoading: outfitsLoading } = useQuery<MaleOutfit[]>({
    queryKey: ['male-outfits'],
    queryFn: () => api.get('/clothing/male-outfits').then(res => res.data),
  })

  // Fetch sicario template
  const { data: sicarioTemplate, isLoading: sicarioLoading } = useQuery({
    queryKey: ['clothing-template', 'SICARIO'],
    queryFn: () => api.get('/clothing/templates/SICARIO').then(res => res.data),
  })

  // Get current outfit
  const currentOutfit = outfits.find(o => o.outfitNumber === selectedOutfit)

  // Update outfit mutation
  const updateOutfitMutation = useMutation({
    mutationFn: async ({ outfitNumber, data }: { outfitNumber: number; data: Partial<MaleOutfit> }) => {
      return api.put(`/clothing/male-outfits/${outfitNumber}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['male-outfits'] })
      toast.success('Outfit erfolgreich gespeichert!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern')
    },
  })

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async ({ outfitNumber, file }: { outfitNumber: number; file: File }) => {
      const formData = new FormData()
      formData.append('image', file)
      return api.post(`/clothing/male-outfits/${outfitNumber}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['male-outfits'] })
      toast.success('Bild erfolgreich hochgeladen!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Hochladen')
    },
  })

  // Save sicario template mutation
  const saveSicarioMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/clothing/templates/SICARIO', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clothing-template', 'SICARIO'] })
      toast.success('Sicario-Kleidung erfolgreich gespeichert!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern')
    },
  })

  const handleOutfitChange = (field: string, value: any) => {
    setOutfitForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveOutfit = () => {
    updateOutfitMutation.mutate({
      outfitNumber: selectedOutfit,
      data: outfitForm,
    })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadImageMutation.mutate({ outfitNumber: selectedOutfit, file })
    }
  }

  const handleSaveSicario = () => {
    const data: any = {}
    
    clothingParts.forEach(part => {
      const partData = sicarioForm[part.id] || {}
      data[`${part.id}ItemMale`] = partData.item
      data[`${part.id}VariationMale`] = partData.variation
      data[`${part.id}CustomizableMale`] = partData.customizable || false
      data[`${part.id}ColorMale`] = partData.color
      // Für Frauen ist es frei wählbar, also setzen wir customizable auf true
      data[`${part.id}ItemFemale`] = null
      data[`${part.id}VariationFemale`] = null
      data[`${part.id}CustomizableFemale`] = true
      data[`${part.id}ColorFemale`] = null
    })
    
    saveSicarioMutation.mutate(data)
  }

  // Initialize sicario form when data loads
  useState(() => {
    if (sicarioTemplate) {
      const form: Record<string, ClothingItemData> = {}
      clothingParts.forEach(part => {
        form[part.id] = {
          item: sicarioTemplate[`${part.id}ItemMale`] ?? null,
          variation: sicarioTemplate[`${part.id}VariationMale`] ?? null,
          customizable: sicarioTemplate[`${part.id}CustomizableMale`] ?? false,
          color: sicarioTemplate[`${part.id}ColorMale`] ?? null,
        }
      })
      setSicarioForm(form)
    }
  })

  // Initialize outfit form when outfit changes
  useState(() => {
    if (currentOutfit) {
      setOutfitForm({
        name: currentOutfit.name,
        maskItem: currentOutfit.maskItem,
        maskVariation: currentOutfit.maskVariation,
        torsoItem: currentOutfit.torsoItem,
        torsoVariation: currentOutfit.torsoVariation,
        tshirtItem: currentOutfit.tshirtItem,
        tshirtVariation: currentOutfit.tshirtVariation,
        vesteItem: currentOutfit.vesteItem,
        vesteVariation: currentOutfit.vesteVariation,
        hoseItem: currentOutfit.hoseItem,
        hoseVariation: currentOutfit.hoseVariation,
        schuheItem: currentOutfit.schuheItem,
        schuheVariation: currentOutfit.schuheVariation,
        rucksackItem: currentOutfit.rucksackItem,
        rucksackVariation: currentOutfit.rucksackVariation,
      })
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-amber-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/30">
            <Settings className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Kleidungsverwaltung</h1>
            <p className="text-gray-400 mt-1">
              Verwalte die 5 Männer-Outfits und Sicario-Kleidung
            </p>
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('outfits')}
              className={`flex-1 h-12 font-medium rounded-lg flex items-center justify-center transition-all duration-200 ${
                activeTab === 'outfits'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 shadow-lg shadow-amber-500/25' 
                  : 'border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <User className="mr-2 h-4 w-4" />
              Männer Outfits (5)
            </button>
            <button
              onClick={() => setActiveTab('sicario')}
              className={`flex-1 h-12 font-medium rounded-lg flex items-center justify-center transition-all duration-200 ${
                activeTab === 'sicario'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-gray-900 shadow-lg shadow-orange-500/25' 
                  : 'border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Crosshair className="mr-2 h-4 w-4" />
              Sicario Kleidung
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Male Outfits Tab */}
      {activeTab === 'outfits' && (
        <>
          {/* Outfit Selector */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white flex items-center gap-2">
                <Shirt className="h-5 w-5 text-amber-400" />
                Outfit auswählen
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map((num) => {
                  const outfit = outfits.find(o => o.outfitNumber === num)
                  return (
                    <button
                      key={num}
                      onClick={() => {
                        setSelectedOutfit(num)
                        if (outfit) {
                          setOutfitForm({
                            name: outfit.name,
                            maskItem: outfit.maskItem,
                            maskVariation: outfit.maskVariation,
                            torsoItem: outfit.torsoItem,
                            torsoVariation: outfit.torsoVariation,
                            tshirtItem: outfit.tshirtItem,
                            tshirtVariation: outfit.tshirtVariation,
                            vesteItem: outfit.vesteItem,
                            vesteVariation: outfit.vesteVariation,
                            hoseItem: outfit.hoseItem,
                            hoseVariation: outfit.hoseVariation,
                            schuheItem: outfit.schuheItem,
                            schuheVariation: outfit.schuheVariation,
                            rucksackItem: outfit.rucksackItem,
                            rucksackVariation: outfit.rucksackVariation,
                          })
                        }
                      }}
                      className={`p-4 rounded-xl border transition-all ${
                        selectedOutfit === num
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                      }`}
                    >
                      {outfit?.imagePath ? (
                        <img
                          src={`${API_BASE}/uploads/outfits/${outfit.imagePath}`}
                          alt={outfit.name}
                          className="w-full h-20 object-cover rounded-lg mb-2"
                        />
                      ) : (
                        <div className="w-full h-20 bg-gray-700/50 rounded-lg mb-2 flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-gray-500" />
                        </div>
                      )}
                      <p className="text-white font-medium text-sm truncate">
                        {outfit?.name || `Outfit ${num}`}
                      </p>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Outfit Editor */}
          {outfitsLoading ? (
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                  <p className="text-gray-400">Lade Outfits...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="text-white">
                  Outfit {selectedOutfit} bearbeiten
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Lege für jedes Kleidungsstück die Item-ID und Variation fest.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-6">
                {/* Name & Image */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Outfit Name</Label>
                    <Input
                      type="text"
                      placeholder="z.B. Business Casual"
                      value={outfitForm.name || ''}
                      onChange={(e) => handleOutfitChange('name', e.target.value)}
                      className="bg-gray-800/50 border-gray-700 text-white h-10 focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Outfit Bild</Label>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadImageMutation.isPending}
                        className="border-gray-700 hover:bg-gray-800"
                      >
                        {uploadImageMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Bild hochladen
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      {currentOutfit?.imagePath && (
                        <img
                          src={`${API_BASE}/uploads/outfits/${currentOutfit.imagePath}`}
                          alt="Preview"
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Clothing Parts */}
                {clothingParts.map((part) => (
                  <div key={part.id} className="space-y-4 border-b border-gray-800 pb-6 last:border-0">
                    <h3 className="text-lg font-semibold text-white">{part.label}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm">Item</Label>
                        <Input
                          type="number"
                          placeholder="z.B. 1"
                          value={outfitForm[part.itemKey as keyof MaleOutfit] ?? ''}
                          onChange={(e) => handleOutfitChange(part.itemKey, e.target.value ? parseInt(e.target.value) : null)}
                          className="bg-gray-800/50 border-gray-700 text-white h-10 focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm">Variation</Label>
                        <Input
                          type="number"
                          placeholder="z.B. 0"
                          value={outfitForm[part.varKey as keyof MaleOutfit] ?? ''}
                          onChange={(e) => handleOutfitChange(part.varKey, e.target.value ? parseInt(e.target.value) : null)}
                          className="bg-gray-800/50 border-gray-700 text-white h-10 focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveOutfit}
                    disabled={updateOutfitMutation.isPending}
                    className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-gray-900 h-11 px-6"
                  >
                    {updateOutfitMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Speichern...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Outfit speichern
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Sicario Tab */}
      {activeTab === 'sicario' && (
        <Card className="bg-gray-900/50 border-orange-500/30 overflow-hidden">
          <CardHeader className="border-b border-orange-500/20">
            <CardTitle className="text-white flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-orange-400" />
              Sicario Kleidung (Männlich)
            </CardTitle>
            <CardDescription className="text-gray-400">
              Lege die spezielle Sicario-Kleidung fest. Frauen haben automatisch freie Wahl.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            {sicarioLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <>
                {clothingParts.map((part) => {
                  const partData = sicarioForm[part.id] || { item: null, variation: null, customizable: false, color: null }
                  
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
                            onChange={(e) => setSicarioForm(prev => ({
                              ...prev,
                              [part.id]: { ...partData, item: e.target.value ? parseInt(e.target.value) : null }
                            }))}
                            disabled={partData.customizable}
                            className="bg-gray-800/50 border-gray-700 text-white h-10 focus:border-orange-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300 text-sm">Variation</Label>
                          <Input
                            type="number"
                            placeholder="z.B. 0"
                            value={partData.variation ?? ''}
                            onChange={(e) => setSicarioForm(prev => ({
                              ...prev,
                              [part.id]: { ...partData, variation: e.target.value ? parseInt(e.target.value) : null }
                            }))}
                            disabled={partData.customizable}
                            className="bg-gray-800/50 border-gray-700 text-white h-10 focus:border-orange-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300 text-sm">Farbname</Label>
                          <Input
                            type="text"
                            placeholder="z.B. schwarz"
                            value={partData.color ?? ''}
                            onChange={(e) => setSicarioForm(prev => ({
                              ...prev,
                              [part.id]: { ...partData, color: e.target.value || null }
                            }))}
                            disabled={!partData.customizable}
                            className="bg-gray-800/50 border-gray-700 text-white h-10 focus:border-orange-500"
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="flex items-center space-x-2 h-10">
                            <Checkbox
                              id={`sicario-${part.id}-customizable`}
                              checked={partData.customizable}
                              onCheckedChange={(checked) => {
                                setSicarioForm(prev => ({
                                  ...prev,
                                  [part.id]: {
                                    ...partData,
                                    customizable: checked === true,
                                    item: checked ? null : partData.item,
                                    variation: checked ? null : partData.variation,
                                  }
                                }))
                              }}
                            />
                            <Label htmlFor={`sicario-${part.id}-customizable`} className="text-sm text-gray-300 cursor-pointer">
                              Anpassbar
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveSicario}
                    disabled={saveSicarioMutation.isPending}
                    className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white h-11 px-6"
                  >
                    {saveSicarioMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Speichern...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Sicario-Kleidung speichern
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="p-4 flex items-start gap-3">
          <Shirt className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">Hinweis zum neuen Kleidungssystem:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-200/80">
              <li><strong>Männer</strong> wählen eines der 5 vordefinierten Outfits</li>
              <li><strong>Frauen</strong> haben automatisch freie Klamottenwahl</li>
              <li><strong>Sicarios</strong> haben zusätzlich Zugriff auf die spezielle Sicario-Kleidung</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
