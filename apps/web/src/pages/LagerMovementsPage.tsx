import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Hourglass
} from 'lucide-react'
import { formatDate, getDisplayName, hasRole } from '../lib/utils'
import { toast } from 'sonner'

export default function LagerMovementsPage() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  const { data: pendingMovements, isLoading } = useQuery({
    queryKey: ['pending-stock-movements'],
    queryFn: () => api.get('/items/movements/pending').then(res => res.data),
  })

  const canApprove = hasRole(user, ['PATRON', 'DON', 'CAPO', 'LOGISTICA'])

  const approveMovementMutation = useMutation({
    mutationFn: (movementId: string) => api.patch(`/items/movements/${movementId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-stock-movements'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast.success('Lagerbewegung bestätigt!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Bestätigen')
    },
  })

  const rejectMovementMutation = useMutation({
    mutationFn: ({ movementId, reason }: { movementId: string; reason: string }) => 
      api.patch(`/items/movements/${movementId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-stock-movements'] })
      toast.success('Lagerbewegung abgelehnt!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Ablehnen')
    },
  })

  const handleApprove = (movementId: string) => {
    approveMovementMutation.mutate(movementId)
  }

  const handleReject = (movementId: string) => {
    const reason = prompt('Begründung für die Ablehnung:')
    if (reason && reason.trim()) {
      rejectMovementMutation.mutate({ movementId, reason: reason.trim() })
    }
  }

  const getMovementTypeDisplay = (type: string) => {
    switch (type) {
      case 'IN': return 'Einlagerung'
      case 'OUT': return 'Auslagerung'
      case 'ADJUST': return 'Korrektur'
      case 'RESERVE': return 'Reservierung'
      case 'RELEASE': return 'Freigabe'
      default: return type
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN': return <ArrowDownToLine className="h-4 w-4" />
      case 'OUT': return <ArrowUpFromLine className="h-4 w-4" />
      case 'ADJUST': return <RefreshCw className="h-4 w-4" />
      default: return <Package className="h-4 w-4" />
    }
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'IN': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'OUT': return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'ADJUST': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'RESERVE': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'RELEASE': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const pendingCount = pendingMovements?.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-orange-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-amber-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-600 to-amber-600 rounded-xl shadow-lg shadow-orange-500/30">
              <Package className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Lagerbewegungen</h1>
              <p className="text-gray-400 mt-1">
                Verwaltung ausstehender Lagerbewegungen
              </p>
            </div>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 px-4 py-2 text-base animate-pulse">
              <Hourglass className="mr-2 h-4 w-4" />
              {pendingCount} ausstehend
            </Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-900/30 to-amber-900/20 border-yellow-500/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
            </div>
            <p className="text-yellow-300/70 text-sm">Ausstehend</p>
            <p className="text-2xl font-bold text-white">{pendingCount}</p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-500/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <ArrowDownToLine className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <p className="text-green-300/70 text-sm">Einlagerungen</p>
            <p className="text-2xl font-bold text-white">
              {pendingMovements?.filter((m: any) => m.type === 'IN').length || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-red-900/30 to-rose-900/20 border-red-500/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <ArrowUpFromLine className="h-5 w-5 text-red-400" />
              </div>
            </div>
            <p className="text-red-300/70 text-sm">Auslagerungen</p>
            <p className="text-2xl font-bold text-white">
              {pendingMovements?.filter((m: any) => m.type === 'OUT').length || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-amber-500/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <RefreshCw className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <p className="text-blue-300/70 text-sm">Korrekturen</p>
            <p className="text-2xl font-bold text-white">
              {pendingMovements?.filter((m: any) => m.type === 'ADJUST').length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Movements Table */}
      <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-400" />
            Ausstehende Lagerbewegungen
          </CardTitle>
          <CardDescription className="text-gray-400">
            Diese Bewegungen benötigen eine Bestätigung
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                <p className="text-gray-400">Lade Lagerbewegungen...</p>
              </div>
            </div>
          ) : (!pendingMovements || pendingMovements.length === 0) ? (
            <div className="py-16 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500/50 mb-4" />
              <p className="text-gray-400 text-lg">Keine ausstehenden Lagerbewegungen</p>
              <p className="text-gray-500 text-sm mt-1">Alle Bewegungen wurden bereits bearbeitet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-800/30">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Artikel</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Typ</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Menge</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Von → Nach</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Benutzer</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Notiz</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Datum</th>
                    {canApprove && (
                      <th className="text-right py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Aktionen</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {pendingMovements?.map((movement: any) => (
                    <tr key={movement.id} className="group hover:bg-orange-950/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                          <div>
                            <span className="font-medium text-white">{movement.item.name}</span>
                            <p className="text-xs text-gray-500">{movement.item.category.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge className={getMovementTypeColor(movement.type)}>
                          {getMovementIcon(movement.type)}
                          <span className="ml-1">{getMovementTypeDisplay(movement.type)}</span>
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-white font-semibold text-lg">{movement.quantity}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-gray-400">{movement.item.currentStock}</span>
                          <span className="text-gray-600">→</span>
                          <span className={
                            movement.type === 'IN' ? 'text-green-400 font-medium' :
                            movement.type === 'OUT' ? 'text-red-400 font-medium' :
                            'text-yellow-400 font-medium'
                          }>
                            {movement.type === 'IN' 
                              ? movement.item.currentStock + movement.quantity
                              : movement.type === 'OUT'
                              ? movement.item.currentStock - movement.quantity
                              : movement.quantity
                            }
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {movement.createdBy.avatarUrl ? (
                            <img 
                              src={movement.createdBy.avatarUrl} 
                              alt={getDisplayName(movement.createdBy)}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                              <User className="w-3 h-3 text-gray-400" />
                            </div>
                          )}
                          <span className="text-gray-300 text-sm">{getDisplayName(movement.createdBy)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 max-w-xs">
                        <span className="text-gray-400 text-sm truncate block">{movement.note || '-'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-400 text-sm">{formatDate(movement.createdAt)}</span>
                      </td>
                      {canApprove && (
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                              onClick={() => handleApprove(movement.id)}
                              disabled={approveMovementMutation.isPending}
                              title="Bestätigen"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => handleReject(movement.id)}
                              disabled={rejectMovementMutation.isPending}
                              title="Ablehnen"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
