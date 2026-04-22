import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { X, DollarSign, TrendingUp, TrendingDown, FileText, Tag, Link2 } from 'lucide-react'
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
      queryClient.invalidateQueries({ queryKey: ['cash-chart'] })
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

  const isDeposit = transactionType === 'EINZAHLUNG'
  
  const theme = isDeposit ? {
    gradient: 'from-green-600 to-emerald-600',
    border: 'border-green-500/30',
    glow: 'from-green-600/20 via-emerald-500/20 to-green-600/20',
    headerBg: 'from-green-900/50 via-emerald-800/30',
    icon: 'text-green-400',
    shadow: 'shadow-green-500/25 hover:shadow-green-500/40',
    text: 'text-green-200/70',
    ring: 'focus:ring-green-500/20 focus:border-green-500',
    buttonGradient: 'from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500',
    title: 'Einzahlung',
    subtitle: 'Schwarzgeld einzahlen',
    placeholder: 'z.B. MDMA-Verkauf, Waffenhandel...'
  } : {
    gradient: 'from-red-600 to-rose-600',
    border: 'border-red-500/30',
    glow: 'from-red-600/20 via-rose-500/20 to-red-600/20',
    headerBg: 'from-red-900/50 via-rose-800/30',
    icon: 'text-red-400',
    shadow: 'shadow-red-500/25 hover:shadow-red-500/40',
    text: 'text-red-200/70',
    ring: 'focus:ring-red-500/20 focus:border-red-500',
    buttonGradient: 'from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500',
    title: 'Auszahlung',
    subtitle: 'Schwarzgeld auszahlen',
    placeholder: 'z.B. Bestechung, Waffen-Einkauf...'
  }

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
                    {isDeposit ? (
                      <TrendingUp className="h-7 w-7 text-white" />
                    ) : (
                      <TrendingDown className="h-7 w-7 text-white" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-white">
                      {theme.title}
                    </CardTitle>
                    <CardDescription className={theme.text}>
                      {theme.subtitle}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  disabled={transactionMutation.isPending}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
          </div>
          
          <CardContent className="pt-2 pb-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Amount Input */}
              <div className="space-y-2">
                <label className={`text-sm font-medium text-zinc-300 flex items-center gap-2`}>
                  <DollarSign className={`h-4 w-4 ${theme.icon}`} />
                  Betrag (Schwarzgeld)
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  {...register('amount', { valueAsNumber: true })}
                  placeholder="z.B. 500000"
                  className={`bg-zinc-800/50 border-zinc-700 ${theme.ring} text-white h-11 text-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.amount ? 'border-red-500' : ''}`}
                />
                {errors.amount && (
                  <p className="text-red-400 text-xs">{errors.amount.message}</p>
                )}
              </div>

              {/* Category Input */}
              <div className="space-y-2">
                <label className={`text-sm font-medium text-zinc-300 flex items-center gap-2`}>
                  <Tag className={`h-4 w-4 ${theme.icon}`} />
                  Kategorie <span className="text-zinc-500 font-normal">(optional)</span>
                </label>
                <Input
                  {...register('category')}
                  placeholder={theme.placeholder}
                  className={`bg-zinc-800/50 border-zinc-700 ${theme.ring} text-white h-11 placeholder:text-zinc-500`}
                />
              </div>

              {/* Reference Input */}
              <div className="space-y-2">
                <label className={`text-sm font-medium text-zinc-300 flex items-center gap-2`}>
                  <Link2 className={`h-4 w-4 ${theme.icon}`} />
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
                <label className={`text-sm font-medium text-zinc-300 flex items-center gap-2`}>
                  <FileText className={`h-4 w-4 ${theme.icon}`} />
                  Begründung
                </label>
                <Input
                  {...register('note')}
                  placeholder="Warum wird dieses Geld ein-/ausgezahlt?"
                  required
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
                  disabled={transactionMutation.isPending}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  className={`flex-1 h-12 bg-gradient-to-r ${theme.buttonGradient} text-white font-semibold shadow-lg ${theme.shadow} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={transactionMutation.isPending}
                >
                  {transactionMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verarbeite...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {isDeposit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
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
