import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { FileText, Search, Filter, Calendar } from 'lucide-react'
import { formatDate, getRoleColor, getRoleDisplayName } from '../lib/utils'

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
    if (action.includes('CREATE')) return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (action.includes('UPDATE')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    if (action.includes('DELETE')) return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    if (action.includes('APPROVE')) return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (action.includes('REJECT')) return 'bg-red-500/20 text-red-400 border-red-500/30'
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  const getActionDisplay = (action: string) => {
    const actionMap: Record<string, string> = {
      'USER_LOGIN': 'Benutzer-Anmeldung',
      'USER_LOGOUT': 'Benutzer-Abmeldung',
      'ITEM_CREATE': 'Artikel erstellt',
      'ITEM_UPDATE': 'Artikel geändert',
      'STOCK_IN': 'Einlagerung',
      'STOCK_OUT': 'Auslagerung',
      'STOCK_ADJUST': 'Bestandskorrektur',
      'STOCK_RESERVE': 'Reservierung',
      'STOCK_RELEASE': 'Reservierung aufgehoben',
      'MONEY_TX_CREATE': 'Transaktion erstellt',
      'MONEY_TX_APPROVE': 'Transaktion genehmigt',
      'MONEY_TX_REJECT': 'Transaktion abgelehnt',
      'INVENTORY_COUNT': 'Inventur durchgeführt',
      'CATEGORY_CREATE': 'Kategorie erstellt',
    }
    return actionMap[action] || action
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center">
          <FileText className="mr-3 h-8 w-8 text-accent" />
          Audit-Log
        </h1>
        <p className="text-gray-400 mt-2">
          Vollständige Nachverfolgung aller Systemaktivitäten
        </p>
      </div>

      {/* Filter */}
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Entität</label>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground"
              >
                <option value="">Alle Entitäten</option>
                <option value="User">Benutzer</option>
                <option value="Item">Artikel</option>
                <option value="StockMovement">Lagerbewegung</option>
                <option value="MoneyTransaction">Transaktion</option>
                <option value="ItemCategory">Kategorie</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Von Datum</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Bis Datum</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
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
                className="w-full"
              >
                Filter zurücksetzen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white">Aktivitätsprotokoll</CardTitle>
          <CardDescription className="text-gray-400">
            {auditData?.logs?.length || 0} Einträge gefunden
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Zeitpunkt</TableHead>
                    <TableHead className="text-gray-400">Benutzer</TableHead>
                    <TableHead className="text-gray-400">Aktion</TableHead>
                    <TableHead className="text-gray-400">Entität</TableHead>
                    <TableHead className="text-gray-400">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditData?.logs?.map((log: any) => (
                    <TableRow key={log.id} className="hover:bg-gray-800/50">
                      <TableCell className="text-gray-300">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-white">{log.user.username}</span>
                          <Badge className={getRoleColor(log.user.role)}>
                            {getRoleDisplayName(log.user.role)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)}>
                          {getActionDisplay(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {log.entity}
                      </TableCell>
                      <TableCell className="text-gray-300 max-w-xs">
                        <div className="truncate">
                          {log.meta?.itemName && (
                            <span>Artikel: {log.meta.itemName}</span>
                          )}
                          {log.meta?.quantity && (
                            <span> | Menge: {log.meta.quantity}</span>
                          )}
                          {log.meta?.amount && (
                            <span> | Betrag: {log.meta.amount}</span>
                          )}
                          {log.meta?.method && (
                            <span> | Methode: {log.meta.method}</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {(!auditData?.logs || auditData.logs.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  Keine Audit-Einträge gefunden
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
