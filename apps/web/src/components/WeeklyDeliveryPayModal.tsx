import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Package, DollarSign, Wallet, CheckCircle, AlertCircle, Banknote } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

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

  // Lade Wochenabgabe-Settings
  const { data: weeklyDeliverySettings } = useQuery({
    queryKey: ['weekly-delivery-settings'],
    queryFn: () => api.get('/settings/weekly-delivery/values').then(res => res.data),
  })

  const moneyPerPackage = weeklyDeliverySettings?.moneyPerPackage || 1000
  const totalPaidMoney = currentPaidMoney + paidMoney
  const requiredMoney = requiredPackages * moneyPerPackage
  const remainingMoney = requiredMoney - totalPaidMoney
  const isFullyPaid = totalPaidMoney >= requiredMoney
  const minimumPayment = requiredPackages * moneyPerPackage

  const handleConfirm = () => {
    if (paidMoney >= minimumPayment) {
      onConfirm({
        paidMoney: paidMoney,
      })
      setPaidMoney(0)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="w-full max-w-lg relative">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-green-500/20 to-emerald-600/20 blur-xl rounded-2xl" />
        
        <Card className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-emerald-500/30 shadow-2xl rounded-2xl overflow-hidden">
          {/* Header mit Gradient */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/50 via-green-800/30 to-transparent" />
            <CardHeader className="relative pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-emerald-600 to-green-600 rounded-xl shadow-lg shadow-emerald-500/30">
                  <Wallet className="h-7 w-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-white">
                    Wochenabgabe bezahlen
                  </CardTitle>
                  <CardDescription className="text-emerald-200/70 mt-1">
                    {requiredPackages} Pakete • {requiredMoney.toLocaleString('de-DE')} Schwarzgeld
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </div>

          <CardContent className="pt-2 pb-6 space-y-5">
            {/* Info Banner */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
              <Package className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-300 font-medium">Hinweis</p>
                <p className="text-blue-200/70 mt-1">
                  Für die Wochenabgabe können nur Schwarzgeld-Zahlungen verwendet werden.
                </p>
              </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Bezahlt</span>
                </div>
                <p className="text-xl font-bold text-green-400">
                  {currentPaidMoney.toLocaleString('de-DE')}
                </p>
                <p className="text-xs text-gray-500">Schwarzgeld</p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Offen</span>
                </div>
                <p className="text-xl font-bold text-yellow-400">
                  {Math.max(0, remainingMoney).toLocaleString('de-DE')}
                </p>
                <p className="text-xs text-gray-500">Schwarzgeld</p>
              </div>
            </div>

            {/* Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700/50" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gray-900 px-3 text-xs text-gray-500 uppercase tracking-wider">
                  Zahlung
                </span>
              </div>
            </div>

            {/* Payment Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-emerald-400" />
                Schwarzgeld-Betrag
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input
                  type="number"
                  min={minimumPayment}
                  placeholder={`Mindestens ${minimumPayment.toLocaleString('de-DE')}`}
                  value={paidMoney || ''}
                  onChange={(e) => setPaidMoney(Number(e.target.value) || 0)}
                  disabled={isLoading}
                  className="pl-10 bg-gray-800/50 border-gray-700 focus:border-emerald-500 focus:ring-emerald-500/20 text-white placeholder:text-gray-500 h-12 text-lg"
                />
              </div>
              <p className="text-xs text-gray-500">
                Minimum: {minimumPayment.toLocaleString('de-DE')} Schwarzgeld ({requiredPackages} Pakete × {moneyPerPackage.toLocaleString('de-DE')})
              </p>
            </div>

            {/* Summary */}
            {paidMoney > 0 && (
              <div className={`rounded-xl p-4 border ${isFullyPaid ? 'bg-green-900/20 border-green-500/30' : 'bg-yellow-900/20 border-yellow-500/30'}`}>
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  {isFullyPaid ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  )}
                  Zusammenfassung
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bereits bezahlt</span>
                    <span className="text-white">{currentPaidMoney.toLocaleString('de-DE')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">+ Neue Zahlung</span>
                    <span className="text-emerald-400 font-medium">+{paidMoney.toLocaleString('de-DE')}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-700/50 pt-2">
                    <span className="text-gray-400">Gesamt</span>
                    <span className="text-white font-bold">{totalPaidMoney.toLocaleString('de-DE')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <span className={`font-semibold ${isFullyPaid ? 'text-green-400' : 'text-yellow-400'}`}>
                      {isFullyPaid ? '✓ Vollständig' : 'Teilzahlung'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-12 border-gray-600 hover:bg-gray-800 hover:border-gray-500 text-gray-300"
                disabled={isLoading}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isLoading || paidMoney < minimumPayment}
                className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Wird bezahlt...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Bezahlen
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
