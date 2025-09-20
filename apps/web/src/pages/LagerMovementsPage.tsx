import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User,
  AlertTriangle
} from 'lucide-react'
import { formatDate, getDisplayName, getMovementTypeColor } from '../lib/utils'
import { toast } from 'sonner'

export default function LagerMovementsPage() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  const { data: pendingMovements, isLoading } = useQuery({
    queryKey: ['pending-stock-movements'],
    queryFn: () => api.get('/items/movements/pending').then(res => res.data),
  })

  const canApprove = ['EL_PATRON', 'LOGISTICA'].includes(user?.role || '')
  const canView = true // Alle können ausstehende Bewegungen sehen

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

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'IN': return 'text-green-400 bg-green-400/10'
      case 'OUT': return 'text-red-400 bg-red-400/10'
      case 'ADJUST': return 'text-yellow-400 bg-yellow-400/10'
      case 'RESERVE': return 'text-blue-400 bg-blue-400/10'
      case 'RELEASE': return 'text-purple-400 bg-purple-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Package className="mr-3 h-8 w-8 text-accent" />
            Lagerbewegungen
          </h1>
          <p className="text-gray-400 mt-2">
            Verwaltung ausstehender Lagerbewegungen
          </p>
        </div>
        <Badge variant="outline" className="text-yellow-400 border-yellow-400">
          {pendingMovements?.length || 0} ausstehend
        </Badge>
      </div>

      {/* Pending Movements */}
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Clock className="mr-2 h-5 w-5 text-yellow-400" />
            Ausstehende Lagerbewegungen
          </CardTitle>
          <CardDescription className="text-gray-400">
            Diese Bewegungen benötigen eine Bestätigung
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">
              Lade ausstehende Lagerbewegungen...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Artikel</TableHead>
                    <TableHead className="text-gray-400">Typ</TableHead>
                    <TableHead className="text-gray-400">Menge</TableHead>
                    <TableHead className="text-gray-400">Von</TableHead>
                    <TableHead className="text-gray-400">Nach</TableHead>
                    <TableHead className="text-gray-400">Benutzer</TableHead>
                    <TableHead className="text-gray-400">Notiz</TableHead>
                    <TableHead className="text-gray-400">Datum</TableHead>
                    {canApprove && (
                      <TableHead className="text-gray-400">Aktionen</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingMovements?.map((movement: any) => (
                    <TableRow key={movement.id} className="hover:bg-gray-800/50">
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-white">{movement.item.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {movement.item.category.name}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getMovementTypeColor(movement.type)}>
                          {getMovementTypeDisplay(movement.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {movement.quantity}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {movement.item.currentStock}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {movement.type === 'IN' 
                          ? movement.item.currentStock + movement.quantity
                          : movement.type === 'OUT'
                          ? movement.item.currentStock - movement.quantity
                          : movement.type === 'ADJUST'
                          ? movement.quantity  // ADJUST sets to absolute value
                          : movement.item.currentStock
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {movement.createdBy.avatarUrl ? (
                            <img 
                              src={movement.createdBy.avatarUrl} 
                              alt={getDisplayName(movement.createdBy)}
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <User className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="text-white text-sm">
                            {getDisplayName(movement.createdBy)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 max-w-xs truncate">
                        {movement.note || '-'}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatDate(movement.createdAt)}
                      </TableCell>
                      {canApprove && (
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-400 border-green-400 hover:bg-green-400/10"
                              onClick={() => handleApprove(movement.id)}
                              disabled={approveMovementMutation.isPending}
                              title="Bestätigen"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-400 border-red-400 hover:bg-red-400/10"
                              onClick={() => handleReject(movement.id)}
                              disabled={rejectMovementMutation.isPending}
                              title="Ablehnen"
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {(!pendingMovements || pendingMovements.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  Keine ausstehenden Lagerbewegungen
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
