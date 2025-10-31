import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { AlertTriangle, Package, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../lib/api'

interface WeeklyDeliveryPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (useForWeeklyDelivery: boolean, weeklyDeliveryId: string) => void
  pendingDelivery: {
    id: string
    weekStart: string
    weekEnd: string
    packages: number
    user: {
      username: string
      icFirstName?: string
      icLastName?: string
    }
  }
  depositPackages: number
}

export default function WeeklyDeliveryPaymentModal({
  isOpen,
  onClose,
  onConfirm,
  pendingDelivery,
  depositPackages
}: WeeklyDeliveryPaymentModalProps) {
  const [useForWeeklyDelivery, setUseForWeeklyDelivery] = useState(false)

  // Lade aktuelle Wochenabgabe-Settings
  const { data: weeklyDeliverySettings } = useQuery({
    queryKey: ['weekly-delivery-settings'],
    queryFn: () => api.get('/settings/weekly-delivery/values').then(res => res.data),
  })

  if (!isOpen) return null

  // Verwende aktuelle Settings statt gespeicherte Werte
  const requiredPackages = weeklyDeliverySettings?.packages || pendingDelivery.packages
  const weeklyDeliveryPackages = Math.min(depositPackages, requiredPackages)
  const payoutPackages = depositPackages - weeklyDeliveryPackages

  const handleConfirm = () => {
    onConfirm(useForWeeklyDelivery, pendingDelivery.id)
    onClose()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE')
  }

  const formatUserName = () => {
    if (pendingDelivery.user.icFirstName && pendingDelivery.user.icLastName) {
      return `${pendingDelivery.user.icFirstName} ${pendingDelivery.user.icLastName}`
    }
    return pendingDelivery.user.username
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="lasanta-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <CardTitle className="text-xl">⚠️ Wochenabgabe ausstehend</CardTitle>
              <CardDescription>
                Du hast eine ausstehende Wochenabgabe für diese Woche
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Wochenabgabe Info */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Wochenabgabe Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Benutzer:</span>
                <div className="text-white font-medium">{formatUserName()}</div>
              </div>
              <div>
                <span className="text-gray-400">Woche:</span>
                <div className="text-white font-medium">
                  {formatDate(pendingDelivery.weekStart)} - {formatDate(pendingDelivery.weekEnd)}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Erforderlich:</span>
                <div className="text-white font-medium">{requiredPackages} Pakete</div>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  Ausstehend
                </Badge>
              </div>
            </div>
          </div>

          {/* Deposit Info */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Dein Paket-Deposit
            </h3>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{depositPackages}</div>
              <div className="text-gray-400">Pakete</div>
            </div>
          </div>

          {/* Payment Options */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Zahlungsoptionen:</h3>
            
            {/* Option 1: Vollständig als Auszahlung */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                !useForWeeklyDelivery 
                  ? 'border-primary bg-primary/10' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => setUseForWeeklyDelivery(false)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  !useForWeeklyDelivery ? 'border-primary bg-primary' : 'border-gray-400'
                }`} />
                <div>
                  <div className="font-medium text-white">Vollständig als Auszahlung</div>
                  <div className="text-sm text-gray-400">
                    Alle {depositPackages} Pakete werden als normale Auszahlung behandelt
                  </div>
                </div>
              </div>
            </div>

            {/* Option 2: Für Wochenabgabe verwenden */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                useForWeeklyDelivery 
                  ? 'border-primary bg-primary/10' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => setUseForWeeklyDelivery(true)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  useForWeeklyDelivery ? 'border-primary bg-primary' : 'border-gray-400'
                }`} />
                <div className="flex-1">
                  <div className="font-medium text-white">Für Wochenabgabe verwenden</div>
                  <div className="text-sm text-gray-400">
                    {depositPackages >= requiredPackages 
                      ? `${weeklyDeliveryPackages} Pakete für Wochenabgabe, ${payoutPackages} Pakete als Auszahlung`
                      : `Nur ${depositPackages} Pakete verfügbar (${requiredPackages} erforderlich)`
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Info (nur wenn für Wochenabgabe verwendet wird) */}
          {useForWeeklyDelivery && (
            <div className="space-y-3">
              <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-blue-400" />
                  <span className="font-semibold text-blue-300">Zahlungsmethode: Pakete</span>
                </div>
                <div className="text-blue-200 text-sm">
                  {weeklyDeliveryPackages} Pakete werden für die Wochenabgabe verwendet
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          {useForWeeklyDelivery && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">Zusammenfassung:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Wochenabgabe (Pakete):</span>
                  <span className="text-white font-medium">{weeklyDeliveryPackages} Pakete</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Auszahlung (Pakete):</span>
                  <span className="text-white font-medium">{payoutPackages} Pakete</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
            >
              {useForWeeklyDelivery ? 'Bestätigen' : 'Als Auszahlung behandeln'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
