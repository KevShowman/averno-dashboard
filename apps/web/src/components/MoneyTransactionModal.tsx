import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { X, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'

interface MoneyTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  transactionType: 'EINZAHLUNG' | 'AUSZAHLUNG'
}

const transactionSchema = z.object({
  amount: z.number().min(1, 'Betrag muss größer als 0 sein'),
  category: z.string().optional(),
  note: z.string().optional(),
  reference: z.string().optional(),
})

type TransactionFormData = z.infer<typeof transactionSchema>

export default function MoneyTransactionModal({ 
  isOpen, 
  onClose, 
  transactionType 
}: MoneyTransactionModalProps) {
  const queryClient = useQueryClient()
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: 0,
    }
  })

  const transactionMutation = useMutation({
    mutationFn: (data: TransactionFormData) => 
      api.post('/cash/transactions', {
        kind: transactionType,
        ...data
      }),
    onSuccess: () => {
      toast.success(`${transactionType === 'EINZAHLUNG' ? 'Einzahlung' : 'Auszahlung'} erfolgreich erstellt`)
      queryClient.invalidateQueries({ queryKey: ['cash-summary'] })
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })
      reset()
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler bei der Transaktion')
    },
  })

  const onSubmit = (data: TransactionFormData) => {
    transactionMutation.mutate(data)
  }

  const getTransactionInfo = () => {
    if (transactionType === 'EINZAHLUNG') {
      return {
        title: 'Geld einzahlen',
        description: 'Schwarzgeld in die Kasse einzahlen',
        icon: <TrendingUp className="h-5 w-5 text-green-400" />,
        color: 'text-green-400',
        placeholder: 'z.B. MDMA-Verkauf, Waffenhandel...'
      }
    } else {
      return {
        title: 'Geld auszahlen',
        description: 'Schwarzgeld aus der Kasse auszahlen',
        icon: <TrendingDown className="h-5 w-5 text-red-400" />,
        color: 'text-red-400',
        placeholder: 'z.B. Bestechung, Waffen-Einkauf...'
      }
    }
  }

  const transactionInfo = getTransactionInfo()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="lasanta-card w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {transactionInfo.icon}
              <CardTitle className={`text-white ${transactionInfo.color}`}>
                {transactionInfo.title}
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
            {transactionInfo.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Betrag ($ Schwarz)
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                {...register('amount', { valueAsNumber: true })}
                placeholder="10000"
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && (
                <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>
              )}
            </div>

            {/* Category Input */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Kategorie (optional)
              </label>
              <Input
                {...register('category')}
                placeholder={transactionInfo.placeholder}
              />
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
                Begründung/Notiz
              </label>
              <Input
                {...register('note')}
                placeholder="Warum wird dieses Geld ein-/ausgezahlt?"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={transactionMutation.isPending}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="lasanta"
                className="flex-1"
                disabled={transactionMutation.isPending}
              >
                {transactionMutation.isPending ? 'Wird verarbeitet...' : 'Bestätigen'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

