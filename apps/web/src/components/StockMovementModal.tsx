import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { X, Package, Plus, Minus, RotateCcw, Hash, Link2, FileText, Boxes, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Lock, Unlock } from 'lucide-react'
import { toast } from 'sonner'

interface StockMovementModalProps {
  item: any
  isOpen: boolean
  onClose: () => void
  movementType: 'IN' | 'OUT' | 'ADJUST' | 'RESERVE' | 'RELEASE'
}

const movementSchema = z.object({
  quantity: z.number().min(1, 'Menge muss größer als 0 sein'),
  note: z.string().optional(),
  reference: z.string().optional(),
})

type MovementFormData = z.infer<typeof movementSchema>

export default function StockMovementModal({ 
  item, 
  isOpen, 
  onClose, 
  movementType 
}: StockMovementModalProps) {
  const queryClient = useQueryClient()
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      quantity: 1,
    }
  })

  const movementMutation = useMutation({
    mutationFn: (data: MovementFormData) => 
      api.post(`/items/${item.id}/move`, {
        type: movementType,
        ...data
      }),
    onSuccess: () => {
      toast.success('Lagerbewegung erfolgreich durchgeführt')
      queryClient.invalidateQueries({ queryKey: ['items'] })
      reset()
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler bei der Lagerbewegung')
    },
  })

  const onSubmit = (data: MovementFormData) => {
    movementMutation.mutate(data)
  }

  const getMovementInfo = () => {
    switch (movementType) {
      case 'IN':
        return {
          title: 'Einlagerung',
          description: 'Artikel in das Lager einbuchen',
          icon: ArrowDownToLine,
          gradient: 'from-green-600 to-emerald-600',
          border: 'border-green-500/30',
          glow: 'from-green-600/20 via-emerald-500/20 to-green-600/20',
          headerBg: 'from-green-900/50 via-emerald-800/30',
          iconBg: 'text-green-400',
          text: 'text-green-200/70',
          ring: 'focus:ring-green-500/20 focus:border-green-500',
          shadow: 'shadow-green-500/25 hover:shadow-green-500/40',
        }
      case 'OUT':
        return {
          title: 'Auslagerung',
          description: 'Artikel aus dem Lager ausbuchen',
          icon: ArrowUpFromLine,
          gradient: 'from-red-600 to-rose-600',
          border: 'border-red-500/30',
          glow: 'from-red-600/20 via-rose-500/20 to-red-600/20',
          headerBg: 'from-red-900/50 via-rose-800/30',
          iconBg: 'text-red-400',
          text: 'text-red-200/70',
          ring: 'focus:ring-red-500/20 focus:border-red-500',
          shadow: 'shadow-red-500/25 hover:shadow-red-500/40',
        }
      case 'ADJUST':
        return {
          title: 'Bestandskorrektur',
          description: 'Bestand manuell korrigieren',
          icon: RefreshCw,
          gradient: 'from-yellow-600 to-amber-600',
          border: 'border-yellow-500/30',
          glow: 'from-yellow-600/20 via-amber-500/20 to-yellow-600/20',
          headerBg: 'from-yellow-900/50 via-amber-800/30',
          iconBg: 'text-yellow-400',
          text: 'text-yellow-200/70',
          ring: 'focus:ring-yellow-500/20 focus:border-yellow-500',
          shadow: 'shadow-yellow-500/25 hover:shadow-yellow-500/40',
        }
      case 'RESERVE':
        return {
          title: 'Reservierung',
          description: 'Artikel für bestimmten Zweck reservieren',
          icon: Lock,
          gradient: 'from-blue-600 to-cyan-600',
          border: 'border-blue-500/30',
          glow: 'from-blue-600/20 via-cyan-500/20 to-blue-600/20',
          headerBg: 'from-blue-900/50 via-cyan-800/30',
          iconBg: 'text-blue-400',
          text: 'text-blue-200/70',
          ring: 'focus:ring-blue-500/20 focus:border-blue-500',
          shadow: 'shadow-blue-500/25 hover:shadow-blue-500/40',
        }
      case 'RELEASE':
        return {
          title: 'Freigabe',
          description: 'Reservierte Artikel wieder freigeben',
          icon: Unlock,
          gradient: 'from-purple-600 to-violet-600',
          border: 'border-purple-500/30',
          glow: 'from-purple-600/20 via-violet-500/20 to-purple-600/20',
          headerBg: 'from-purple-900/50 via-violet-800/30',
          iconBg: 'text-purple-400',
          text: 'text-purple-200/70',
          ring: 'focus:ring-purple-500/20 focus:border-purple-500',
          shadow: 'shadow-purple-500/25 hover:shadow-purple-500/40',
        }
      default:
        return {
          title: 'Lagerbewegung',
          description: 'Artikel bewegen',
          icon: Package,
          gradient: 'from-gray-600 to-slate-600',
          border: 'border-gray-500/30',
          glow: 'from-gray-600/20 via-slate-500/20 to-gray-600/20',
          headerBg: 'from-gray-900/50 via-slate-800/30',
          iconBg: 'text-gray-400',
          text: 'text-gray-200/70',
          ring: 'focus:ring-gray-500/20 focus:border-gray-500',
          shadow: 'shadow-gray-500/25 hover:shadow-gray-500/40',
        }
    }
  }

  const theme = getMovementInfo()
  const IconComponent = theme.icon

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md relative">
        {/* Glow Effect */}
        <div className={`absolute inset-0 bg-gradient-to-r ${theme.glow} blur-xl rounded-2xl`} />
        
        <Card className={`relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 ${theme.border} shadow-2xl rounded-2xl overflow-hidden`}>
          {/* Header mit Gradient */}
          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-r ${theme.headerBg} to-transparent`} />
            <CardHeader className="relative pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 bg-gradient-to-br ${theme.gradient} rounded-xl shadow-lg ${theme.shadow.split(' ')[0]}`}>
                    <IconComponent className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-white">
                      {theme.title}
                    </CardTitle>
                    <CardDescription className={theme.text}>
                      {theme.description}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  disabled={movementMutation.isPending}
                  className="text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
          </div>
          
          <CardContent className="pt-2 pb-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Item Info */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gray-700/50 rounded-lg">
                    <Boxes className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="font-semibold text-white text-lg">{item.name}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                    <div className="text-gray-500 text-xs mb-1">Gesamt</div>
                    <div className="text-white font-medium">{item.currentStock}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                    <div className="text-gray-500 text-xs mb-1">Verfügbar</div>
                    <div className="text-green-400 font-medium">{item.availableStock}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                    <div className="text-gray-500 text-xs mb-1">Reserviert</div>
                    <div className="text-blue-400 font-medium">{item.reservedStock}</div>
                  </div>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Hash className={`h-4 w-4 ${theme.iconBg}`} />
                  {movementType === 'ADJUST' ? 'Neuer Bestand' : 'Menge'}
                </label>
                <Input
                  type="number"
                  min="1"
                  {...register('quantity', { valueAsNumber: true })}
                  placeholder={movementType === 'ADJUST' ? item.currentStock.toString() : '1'}
                  className={`bg-gray-800/50 border-gray-700 ${theme.ring} text-white h-11 text-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.quantity ? 'border-red-500' : ''}`}
                />
                {errors.quantity && (
                  <p className="text-red-400 text-xs">{errors.quantity.message}</p>
                )}
              </div>

              {/* Reference Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Link2 className={`h-4 w-4 ${theme.iconBg}`} />
                  Referenz <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <Input
                  {...register('reference')}
                  placeholder="Auftrag, Person, Event..."
                  className={`bg-gray-800/50 border-gray-700 ${theme.ring} text-white h-11 placeholder:text-gray-500`}
                />
              </div>

              {/* Note Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FileText className={`h-4 w-4 ${theme.iconBg}`} />
                  Notiz <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <Input
                  {...register('note')}
                  placeholder="Zusätzliche Informationen..."
                  className={`bg-gray-800/50 border-gray-700 ${theme.ring} text-white h-11 placeholder:text-gray-500`}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-12 border-gray-600 hover:bg-gray-800 hover:border-gray-500 text-gray-300"
                  disabled={movementMutation.isPending}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  className={`flex-1 h-12 bg-gradient-to-r ${theme.gradient} hover:opacity-90 text-white font-semibold shadow-lg ${theme.shadow} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={movementMutation.isPending}
                >
                  {movementMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verarbeite...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <IconComponent className="h-5 w-5" />
                      Bestätigen
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
