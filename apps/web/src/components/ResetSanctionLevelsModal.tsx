import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Scale, X, AlertTriangle, RotateCcw } from 'lucide-react'

interface ResetSanctionLevelsModalProps {
  isOpen: boolean
  onClose: () => void
  onReset: (data: { userId: string; category: string }) => void
  userId?: string
  userName?: string
  isLoading?: boolean
}

const SANCTION_CATEGORIES = [
  { key: 'ABMELDUNG', name: 'Abmeldung' },
  { key: 'RESPEKTVERHALTEN', name: 'Respektverhalten' },
  { key: 'FUNKCHECK', name: 'Funkcheck' },
  { key: 'REAKTIONSPFLICHT', name: 'Reaktionspflicht' },
  { key: 'NICHT_BEZAHLT', name: 'Nicht bezahlt' },
  { key: 'NICHT_BEZAHLT_48H', name: 'Nicht bezahlt (48h)' },
]

export default function ResetSanctionLevelsModal({
  isOpen,
  onClose,
  onReset,
  userId,
  userName,
  isLoading = false,
}: ResetSanctionLevelsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const handleReset = () => {
    if (userId && selectedCategory) {
      onReset({
        userId,
        category: selectedCategory,
      })
      // Reset form
      setSelectedCategory('')
    }
  }

  const handleClose = () => {
    onClose()
    // Reset form
    setSelectedCategory('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md lasanta-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Sanktions-Level zurücksetzen
              </CardTitle>
              <CardDescription>
                Setze alle aktiven Sanktionen für einen User und eine Kategorie zurück
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* User Info */}
          {userName && (
            <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-lg">
              <div className="text-blue-300 font-medium">Benutzer:</div>
              <div className="text-white text-lg">{userName}</div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-red-900/20 border border-red-500/20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="font-semibold text-red-300">Warnung:</span>
            </div>
            <div className="text-red-200 text-sm">
              Diese Aktion setzt ALLE aktiven Sanktionen für den ausgewählten User und die ausgewählte Kategorie zurück.
              Die Sanktionen werden als "Storniert" markiert und können nicht rückgängig gemacht werden.
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="text-white block text-sm font-medium mb-2">
              Sanktionskategorie auswählen
            </label>
            <div className="grid grid-cols-1 gap-2">
              {SANCTION_CATEGORIES.map((category) => (
                <Button
                  key={category.key}
                  variant={selectedCategory === category.key ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.key)}
                  disabled={isLoading}
                  className="text-left justify-start h-auto p-3"
                >
                  <Scale className="h-4 w-4 mr-2" />
                  <span>{category.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Selected Category Info */}
          {selectedCategory && (
            <div className="bg-yellow-900/20 border border-yellow-500/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="h-4 w-4 text-yellow-400" />
                <span className="font-semibold text-yellow-300">Ausgewählte Kategorie:</span>
              </div>
              <div className="text-white">
                {SANCTION_CATEGORIES.find(c => c.key === selectedCategory)?.name}
              </div>
              <div className="text-yellow-200 text-sm mt-1">
                Alle aktiven Sanktionen dieser Kategorie werden zurückgesetzt.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleReset}
              disabled={isLoading || !selectedCategory}
              variant="destructive"
              className="flex-1"
            >
              {isLoading ? 'Setze zurück...' : 'Zurücksetzen'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
