import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { X, Package, Plus, Minus, RotateCcw } from 'lucide-react'
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
          icon: <Plus className="h-5 w-5 text-green-400" />,
          color: 'text-green-400'
        }
      case 'OUT':
        return {
          title: 'Auslagerung',
          description: 'Artikel aus dem Lager ausbuchen',
          icon: <Minus className="h-5 w-5 text-red-400" />,
          color: 'text-red-400'
        }
      case 'ADJUST':
        return {
          title: 'Bestandskorrektur',
          description: 'Bestand manuell korrigieren',
          icon: <RotateCcw className="h-5 w-5 text-yellow-400" />,
          color: 'text-yellow-400'
        }
      case 'RESERVE':
        return {
          title: 'Reservierung',
          description: 'Artikel für bestimmten Zweck reservieren',
          icon: <Package className="h-5 w-5 text-blue-400" />,
          color: 'text-blue-400'
        }
      case 'RELEASE':
        return {
          title: 'Reservierung aufheben',
          description: 'Reservierte Artikel wieder freigeben',
          icon: <Package className="h-5 w-5 text-purple-400" />,
          color: 'text-purple-400'
        }
      default:
        return {
          title: 'Lagerbewegung',
          description: 'Artikel bewegen',
          icon: <Package className="h-5 w-5" />,
          color: 'text-white'
        }
    }
  }

  const movementInfo = getMovementInfo()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="lasanta-card w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {movementInfo.icon}
              <CardTitle className={`text-white ${movementInfo.color}`}>
                {movementInfo.title}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-gray-400">
            {movementInfo.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Item Info */}
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="font-medium text-white">{item.name}</div>
              <div className="text-sm text-gray-400">
                Aktueller Bestand: {item.currentStock} | 
                Verfügbar: {item.availableStock} | 
                Reserviert: {item.reservedStock}
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                {movementType === 'ADJUST' ? 'Neuer Bestand' : 'Menge'}
              </label>
              <Input
                type="number"
                min="1"
                {...register('quantity', { valueAsNumber: true })}
                placeholder={movementType === 'ADJUST' ? item.currentStock.toString() : '1'}
                className={errors.quantity ? 'border-red-500' : ''}
              />
              {errors.quantity && (
                <p className="text-red-400 text-xs mt-1">{errors.quantity.message}</p>
              )}
            </div>

            {/* Reference Input */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Referenz (optional)
              </label>
              <Input
                {...register('reference')}
                placeholder="Auftrag, Person, Event..."
              />
            </div>

            {/* Note Input */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Notiz (optional)
              </label>
              <Input
                {...register('note')}
                placeholder="Zusätzliche Informationen..."
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={movementMutation.isPending}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="lasanta"
                className="flex-1"
                disabled={movementMutation.isPending}
              >
                {movementMutation.isPending ? 'Wird verarbeitet...' : 'Bestätigen'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

