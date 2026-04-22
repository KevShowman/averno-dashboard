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
          gradient: 'from-orange-600 to-orange-600',
          border: 'border-orange-500/30',
          glow: 'from-orange-600/20 via-orange-500/20 to-orange-600/20',
          headerBg: 'from-orange-900/50 via-orange-800/30',
          iconBg: 'text-orange-400',
          text: 'text-orange-200/70',
          ring: 'focus:ring-orange-500/20 focus:border-orange-500',
          shadow: 'shadow-orange-500/25 hover:shadow-orange-500/40',
        }
      case 'RESERVE':
        return {
          title: 'Reservierung',
          description: 'Artikel für bestimmten Zweck reservieren',
          icon: Lock,
          gradient: 'from-orange-600 to-orange-600',
          border: 'border-orange-500/30',
          glow: 'from-orange-600/20 via-orange-500/20 to-orange-600/20',
          headerBg: 'from-orange-900/50 via-orange-800/30',
          iconBg: 'text-orange-400',
          text: 'text-orange-200/70',
          ring: 'focus:ring-blue-500/20 focus:border-orange-500',
          shadow: 'shadow-orange-500/25 hover:shadow-orange-500/40',
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
          gradient: 'from-zinc-600 to-slate-600',
          border: 'border-zinc-500/30',
          glow: 'from-zinc-600/20 via-slate-500/20 to-zinc-600/20',
          headerBg: 'from-zinc-900/50 via-slate-800/30',
          iconBg: 'text-zinc-400',
          text: 'text-zinc-200/70',
          ring: 'focus:ring-zinc-500/20 focus:border-zinc-500',
          shadow: 'shadow-zinc-500/25 hover:shadow-zinc-500/40',
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
        
        <Card className={`relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 ${theme.border} shadow-2xl rounded-2xl overflow-hidden`}>
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
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
          </div>
          
          <CardContent className="pt-2 pb-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Item Info */}
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-zinc-700/50 rounded-lg">
                    <Boxes className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div className="font-semibold text-white text-lg">{item.name}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-zinc-900/50 rounded-lg p-2 text-center">
                    <div className="text-zinc-500 text-xs mb-1">Gesamt</div>
                    <div className="text-white font-medium">{item.currentStock}</div>
                  </div>
                  <div className="bg-zinc-900/50 rounded-lg p-2 text-center">
                    <div className="text-zinc-500 text-xs mb-1">Verfügbar</div>
                    <div className="text-green-400 font-medium">{item.availableStock}</div>
                  </div>
                  <div className="bg-zinc-900/50 rounded-lg p-2 text-center">
                    <div className="text-zinc-500 text-xs mb-1">Reserviert</div>
                    <div className="text-orange-400 font-medium">{item.reservedStock}</div>
                  </div>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Hash className={`h-4 w-4 ${theme.iconBg}`} />
                  {movementType === 'ADJUST' ? 'Neuer Bestand' : 'Menge'}
                </label>
                <Input
                  type="number"
                  min="1"
                  {...register('quantity', { valueAsNumber: true })}
                  placeholder={movementType === 'ADJUST' ? item.currentStock.toString() : '1'}
                  className={`bg-zinc-800/50 border-zinc-700 ${theme.ring} text-white h-11 text-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.quantity ? 'border-red-500' : ''}`}
                />
                {errors.quantity && (
                  <p className="text-red-400 text-xs">{errors.quantity.message}</p>
                )}
              </div>

              {/* Reference Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Link2 className={`h-4 w-4 ${theme.iconBg}`} />
                  Referenz <span className="text-zinc-500 font-normal">(optional)</span>
                </label>
                <Input
                  {...register('reference')}
                  placeholder="Auftrag, Person, Event..."
                  className={`bg-zinc-800/50 border-zinc-700 ${theme.ring} text-white h-11 placeholder:text-zinc-500`}
                />
              </div>

              {/* Note Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <FileText className={`h-4 w-4 ${theme.iconBg}`} />
                  Notiz <span className="text-zinc-500 font-normal">(optional)</span>
                </label>
                <Input
                  {...register('note')}
                  placeholder="Zusätzliche Informationen..."
                  className={`bg-zinc-800/50 border-zinc-700 ${theme.ring} text-white h-11 placeholder:text-zinc-500`}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-12 border-zinc-600 hover:bg-zinc-800 hover:border-zinc-500 text-zinc-300"
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
