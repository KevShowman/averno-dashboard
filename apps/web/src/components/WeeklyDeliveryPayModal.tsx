import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Package, DollarSign, X } from 'lucide-react'

interface WeeklyDeliveryPayModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { paidAmount?: number; paidMoney?: number }) => void
  requiredPackages: number
  currentPaidAmount?: number
  currentPaidMoney?: number
  isLoading?: boolean
}

export default function WeeklyDeliveryPayModal({
  isOpen,
  onClose,
  onConfirm,
  requiredPackages,
  currentPaidAmount = 0,
  currentPaidMoney = 0,
  isLoading = false,
}: WeeklyDeliveryPayModalProps) {
  const [paidAmount, setPaidAmount] = useState<number>(0)

  const totalPaidPackages = currentPaidAmount + paidAmount
  const remainingPackages = requiredPackages - totalPaidPackages
  const isFullyPaid = totalPaidPackages >= requiredPackages

  const handleConfirm = () => {
    if (paidAmount > 0) {
      onConfirm({
        paidAmount: paidAmount,
        paidMoney: undefined,
      })
      // Reset form
      setPaidAmount(0)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md lasanta-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Wochenabgabe bezahlen
              </CardTitle>
              <CardDescription>
                Bezahle deine wöchentliche Abgabe von {requiredPackages} Kokain-Paketen
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
          {/* Current Status */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Aktueller Status</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Bereits bezahlt:</div>
                <div className="text-white">
                  {currentPaidAmount} Pakete + {currentPaidMoney.toLocaleString()} €
                </div>
              </div>
              <div>
                <div className="text-gray-400">Noch benötigt:</div>
                <div className="text-white">
                  {remainingPackages} Pakete oder {remainingMoney.toLocaleString()} €
                </div>
              </div>
            </div>
          </div>

          {/* Payment Options */}
          <div className="space-y-4">
            <div>
              <label htmlFor="paidAmount" className="text-white block text-sm font-medium mb-1">
                Kokain-Pakete hinzufügen
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="paidAmount"
                  type="number"
                  min="0"
                  max={remainingPackages}
                  value={paidAmount || ''}
                  onChange={(e) => setPaidAmount(parseInt(e.target.value) || 0)}
                  className="pl-10"
                  placeholder="Anzahl Pakete"
                  disabled={isLoading}
                />
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Noch benötigt: {remainingPackages} Pakete
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          {paidAmount > 0 && (
            <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-300 mb-2">Zahlungszusammenfassung</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Neue Zahlung:</span>
                  <span className="text-white">
                    {paidAmount} Pakete
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gesamt nach Zahlung:</span>
                  <span className="text-white">
                    {totalPaidPackages} Pakete
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className={isFullyPaid ? 'text-green-400' : 'text-orange-400'}>
                    Status:
                  </span>
                  <span className={isFullyPaid ? 'text-green-400' : 'text-orange-400'}>
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
              disabled={isLoading || paidAmount === 0}
              className="flex-1"
            >
              {isLoading ? 'Bezahlt...' : 'Bezahlen'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
