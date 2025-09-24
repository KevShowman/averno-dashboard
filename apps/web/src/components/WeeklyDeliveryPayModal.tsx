import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Package, DollarSign, X } from 'lucide-react'

interface WeeklyDeliveryPayModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { paidMoney: number }) => void
  requiredPackages: number
  currentPaidMoney?: number
  isLoading?: boolean
}

export default function WeeklyDeliveryPayModal({
  isOpen,
  onClose,
  onConfirm,
  requiredPackages,
  currentPaidMoney = 0,
  isLoading = false,
}: WeeklyDeliveryPayModalProps) {
  const [paidMoney, setPaidMoney] = useState<number>(0)

  const totalPaidMoney = currentPaidMoney + paidMoney
  const requiredMoney = requiredPackages * 1000 // 1000€ pro Paket
  const remainingMoney = requiredMoney - totalPaidMoney
  const isFullyPaid = totalPaidMoney >= requiredMoney

  const handleConfirm = () => {
    if (paidMoney >= 300000) { // Minimum 300.000€
      onConfirm({
        paidMoney: paidMoney,
      })
      // Reset form
      setPaidMoney(0)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md lasanta-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Wochenabgabe bezahlen
              </CardTitle>
              <CardDescription>
                Bezahle deine wöchentliche Abgabe von {requiredPackages} Kokain-Paketen mit Schwarzgeld
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Info */}
          <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-400" />
              <span className="text-blue-300 font-medium">Hinweis:</span>
            </div>
            <div className="text-white text-sm">
              Für die Wochenabgabe können nur Schwarzgeld-Zahlungen verwendet werden. 
              Für Kokain-Pakete verwende das Kokain-System.
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Aktueller Status</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Bereits bezahlt:</div>
                <div className="text-white">
                  {currentPaidMoney.toLocaleString('de-DE')} €
                </div>
              </div>
              <div>
                <div className="text-gray-400">Noch benötigt:</div>
                <div className="text-white">
                  {Math.max(0, remainingMoney).toLocaleString('de-DE')} €
                </div>
              </div>
            </div>
          </div>

          {/* Payment Input */}
          <div className="space-y-4">
            <div>
              <label htmlFor="paidMoney" className="text-white block text-sm font-medium mb-1">
                Schwarzgeld hinzufügen
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="paidMoney"
                  type="number"
                  min="300000"
                  placeholder="Mindestens 300.000 €"
                  value={paidMoney || ''}
                  onChange={(e) => setPaidMoney(Number(e.target.value) || 0)}
                  disabled={isLoading}
                  className="pl-10"
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Minimum: 300.000 € (entspricht 300 Kokain-Paketen)
              </div>
            </div>
          </div>

          {/* Summary */}
          {paidMoney > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">Zusammenfassung:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Bereits bezahlt:</span>
                  <span className="text-white font-medium">{currentPaidMoney.toLocaleString('de-DE')} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Neu hinzufügen:</span>
                  <span className="text-white font-medium">{paidMoney.toLocaleString('de-DE')} €</span>
                </div>
                <div className="flex justify-between border-t border-gray-600 pt-2">
                  <span className="text-gray-400">Gesamt bezahlt:</span>
                  <span className="text-white font-medium">{totalPaidMoney.toLocaleString('de-DE')} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`font-medium ${isFullyPaid ? 'text-green-400' : 'text-yellow-400'}`}>
                    {isFullyPaid ? 'Vollständig bezahlt' : 'Teilweise bezahlt'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || paidMoney < 300000}
              className="flex-1"
            >
              {isLoading ? 'Bezahle...' : 'Bezahlen'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}