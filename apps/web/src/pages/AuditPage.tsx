import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { 
  FileText, 
  Filter, 
  RotateCcw,
  History,
  User,
  Clock,
  Database,
  Activity
} from 'lucide-react'
import { formatDate, getRoleColor, getRoleDisplayName, getDisplayName } from '../lib/utils'

export default function AuditPage() {
  const [selectedEntity, setSelectedEntity] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit', selectedEntity, selectedUser, dateFrom, dateTo],
    queryFn: () => api.get('/audit', {
      params: {
        entity: selectedEntity || undefined,
        userId: selectedUser || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      }
    }).then(res => res.data),
  })

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-500/20 text-green-300 border-green-500/30'
    if (action.includes('UPDATE')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    if (action.includes('DELETE')) return 'bg-red-500/20 text-red-300 border-red-500/30'
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    if (action.includes('APPROVE')) return 'bg-green-500/20 text-green-300 border-green-500/30'
    if (action.includes('REJECT')) return 'bg-red-500/20 text-red-300 border-red-500/30'
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }

  const getActionDisplay = (action: string) => {
    const actionMap: Record<string, string> = {
      'USER_LOGIN': 'Anmeldung',
      'USER_LOGOUT': 'Abmeldung',
      'ITEM_CREATE': 'Artikel erstellt',
      'ITEM_UPDATE': 'Artikel geändert',
      'STOCK_IN': 'Einlagerung',
      'STOCK_OUT': 'Auslagerung',
      'STOCK_ADJUST': 'Korrektur',
      'STOCK_RESERVE': 'Reservierung',
      'STOCK_RELEASE': 'Freigabe',
      'MONEY_TX_CREATE': 'Transaktion',
      'MONEY_TX_APPROVE': 'Genehmigt',
      'MONEY_TX_REJECT': 'Abgelehnt',
      'INVENTORY_COUNT': 'Inventur',
      'CATEGORY_CREATE': 'Kategorie erstellt',
    }
    return actionMap[action] || action
  }

  const todayCount = auditData?.logs?.filter((log: any) => {
    const today = new Date().toDateString()
    return new Date(log.createdAt).toDateString() === today
  }).length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-violet-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-purple-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl shadow-lg shadow-violet-500/30">
              <History className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Audit-Log</h1>
              <p className="text-gray-400 mt-1">
                Vollständige Nachverfolgung aller Systemaktivitäten
              </p>
            </div>
          </div>
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 px-4 py-2">
            <Activity className="mr-2 h-4 w-4" />
            {todayCount} heute
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-violet-900/30 to-purple-900/20 border-violet-500/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <FileText className="h-5 w-5 text-violet-400" />
              </div>
            </div>
            <p className="text-violet-300/70 text-sm">Gesamt Einträge</p>
            <p className="text-2xl font-bold text-white">{auditData?.logs?.length || 0}</p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-500/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <User className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <p className="text-green-300/70 text-sm">Aktive User</p>
            <p className="text-2xl font-bold text-white">
              {new Set(auditData?.logs?.map((l: any) => l.user?.id)).size || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border-blue-500/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Database className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <p className="text-blue-300/70 text-sm">Entitäten</p>
            <p className="text-2xl font-bold text-white">
              {new Set(auditData?.logs?.map((l: any) => l.entity)).size || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-900/30 to-orange-900/20 border-amber-500/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <p className="text-amber-300/70 text-sm">Heute</p>
            <p className="text-2xl font-bold text-white">{todayCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="h-5 w-5 text-violet-400" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Entität</label>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="w-full h-10 px-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-violet-500 focus:outline-none"
              >
                <option value="">Alle Entitäten</option>
                <option value="User">Benutzer</option>
                <option value="Item">Artikel</option>
                <option value="StockMovement">Lagerbewegung</option>
                <option value="MoneyTransaction">Transaktion</option>
                <option value="ItemCategory">Kategorie</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Von Datum</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-gray-800/50 border-gray-700 focus:border-violet-500 text-white h-10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Bis Datum</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-gray-800/50 border-gray-700 focus:border-violet-500 text-white h-10"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSelectedEntity('')
                  setSelectedUser('')
                  setDateFrom('')
                  setDateTo('')
                }}
                variant="outline"
                className="w-full h-10 border-gray-700 hover:bg-gray-800"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Zurücksetzen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white">Aktivitätsprotokoll</CardTitle>
          <CardDescription className="text-gray-400">
            {auditData?.logs?.length || 0} Einträge gefunden
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                <p className="text-gray-400">Lade Audit-Log...</p>
              </div>
            </div>
          ) : (!auditData?.logs || auditData.logs.length === 0) ? (
            <div className="py-16 text-center">
              <History className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">Keine Audit-Einträge gefunden</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-800/30">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Zeitpunkt</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Benutzer</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Aktion</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Entität</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {auditData?.logs?.map((log: any) => (
                    <tr key={log.id} className="group hover:bg-violet-950/20 transition-colors">
                      <td className="py-4 px-6">
                        <span className="text-gray-400 text-sm">{formatDate(log.createdAt)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{getDisplayName(log.user)}</span>
                          <Badge className={getRoleColor(log.user?.role)} variant="outline">
                            {getRoleDisplayName(log.user?.role)}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={getActionColor(log.action)}>
                          {getActionDisplay(log.action)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-300">{log.entity}</span>
                      </td>
                      <td className="py-4 px-4 max-w-xs">
                        <div className="text-gray-400 text-sm truncate">
                          {log.meta?.itemName && <span>Artikel: {log.meta.itemName}</span>}
                          {log.meta?.quantity && <span> • Menge: {log.meta.quantity}</span>}
                          {log.meta?.amount && <span> • Betrag: {log.meta.amount}</span>}
                          {log.meta?.reason && <span> • Grund: {log.meta.reason}</span>}
                          {log.meta?.note && <span> • Notiz: {log.meta.note}</span>}
                        </div>
                      </td>
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
