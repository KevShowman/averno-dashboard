import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { 
  Package, 
  Search, 
  AlertTriangle, 
  Boxes, 
  Tags, 
  CheckCircle2,
  Filter,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react'
import { hasRole } from '../lib/utils'
import StockMovementModal from '../components/StockMovementModal'

export default function LagerPage() {
  const user = useAuthStore((state) => state.user)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showCriticalOnly, setShowCriticalOnly] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [movementType, setMovementType] = useState<'IN' | 'OUT' | 'ADJUST' | 'RESERVE' | 'RELEASE'>('IN')

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['items', searchQuery, selectedCategory, showCriticalOnly],
    queryFn: () => api.get('/items', {
      params: {
        query: searchQuery || undefined,
        category: selectedCategory || undefined,
        criticalOnly: showCriticalOnly || undefined,
      }
    }).then(res => res.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/items/categories').then(res => res.data),
  })

  const criticalCount = itemsData?.items?.filter((item: any) => item.isCritical).length || 0
  const availableCount = itemsData?.items?.filter((item: any) => item.availableStock > 0).length || 0
  const canEdit = hasRole(user, ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA', 'LOGISTICA'])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-blue-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/30">
              <Boxes className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Lagerverwaltung</h1>
              <p className="text-gray-400 mt-1">
                Waffen, Munition und Ausrüstung verwalten
              </p>
            </div>
          </div>
          {criticalCount > 0 && (
            <Badge className="bg-red-500/20 text-red-300 border-red-500/30 px-4 py-2 text-base animate-pulse">
              <AlertTriangle className="mr-2 h-4 w-4" />
              {criticalCount} kritisch
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border-blue-500/30">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl" />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Package className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <p className="text-blue-300/70 text-sm">Gesamte Artikel</p>
            <p className="text-2xl font-bold text-white">{itemsData?.pagination?.total || 0}</p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-900/30 to-violet-900/20 border-purple-500/30">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full blur-2xl" />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Tags className="h-5 w-5 text-purple-400" />
              </div>
            </div>
            <p className="text-purple-300/70 text-sm">Kategorien</p>
            <p className="text-2xl font-bold text-white">{categories?.length || 0}</p>
          </CardContent>
        </Card>
        
        <Card className={`relative overflow-hidden ${criticalCount > 0 ? 'bg-gradient-to-br from-red-900/30 to-orange-900/20 border-red-500/30' : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700'}`}>
          <div className={`absolute top-0 right-0 w-16 h-16 ${criticalCount > 0 ? 'bg-red-500/10' : 'bg-gray-500/10'} rounded-full blur-2xl`} />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 ${criticalCount > 0 ? 'bg-red-500/20' : 'bg-gray-500/20'} rounded-lg`}>
                <AlertTriangle className={`h-5 w-5 ${criticalCount > 0 ? 'text-red-400' : 'text-gray-400'}`} />
              </div>
            </div>
            <p className={`${criticalCount > 0 ? 'text-red-300/70' : 'text-gray-400'} text-sm`}>Kritisch</p>
            <p className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-400' : 'text-white'}`}>{criticalCount}</p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-500/30">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full blur-2xl" />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <p className="text-green-300/70 text-sm">Verfügbar</p>
            <p className="text-2xl font-bold text-green-400">{availableCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Artikel suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-700 focus:border-blue-500 h-11"
                />
              </div>
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-4 h-11 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none appearance-none cursor-pointer min-w-[180px]"
              >
                <option value="">Alle Kategorien</option>
                {categories?.map((category: any) => (
                  <option key={category.id} value={category.name}>
                    {category.name} ({category._count.items})
                  </option>
                ))}
              </select>
            </div>
            
            <Button
              variant={showCriticalOnly ? "default" : "outline"}
              onClick={() => setShowCriticalOnly(!showCriticalOnly)}
              className={showCriticalOnly 
                ? 'bg-red-600 hover:bg-red-700 border-red-600 h-11' 
                : 'border-gray-700 hover:bg-gray-800 h-11'
              }
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Nur kritische
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white">Artikel</CardTitle>
          <CardDescription className="text-gray-400">
            {itemsData?.items?.length || 0} von {itemsData?.pagination?.total || 0} Artikel
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-gray-400">Lade Artikel...</p>
              </div>
            </div>
          ) : itemsData?.items?.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">Keine Artikel gefunden</p>
              <p className="text-gray-500 text-sm mt-1">Versuche einen anderen Suchbegriff oder Filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-800/30">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Artikel</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Kategorie</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Bestand</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Verfügbar</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Reserviert</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    {canEdit && (
                      <th className="text-right py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Aktionen</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {itemsData?.items?.map((item: any) => (
                    <tr 
                      key={item.id} 
                      className={`group transition-colors ${
                        item.isCritical 
                          ? 'bg-red-950/20 hover:bg-red-950/30' 
                          : 'hover:bg-gray-800/30'
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            item.isCritical ? 'bg-red-500 animate-pulse' : item.availableStock > 0 ? 'bg-green-500' : 'bg-gray-500'
                          }`} />
                          <span className="font-medium text-white">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="bg-gray-800/50 border-gray-700 text-gray-300 font-normal">
                          {item.category.name}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-white font-semibold text-lg">{item.currentStock}</span>
                        {item.minStock > 0 && (
                          <span className="text-gray-500 text-xs ml-1">/ min {item.minStock}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`font-semibold text-lg ${
                          item.availableStock > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {item.availableStock}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`font-semibold text-lg ${
                          item.reservedStock > 0 ? 'text-yellow-400' : 'text-gray-500'
                        }`}>
                          {item.reservedStock}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {item.isCritical ? (
                          <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Kritisch
                          </Badge>
                        ) : item.isLocked ? (
                          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                            Gesperrt
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            OK
                          </Badge>
                        )}
                      </td>
                      {canEdit && (
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                              onClick={() => {
                                setSelectedItem(item)
                                setMovementType('IN')
                              }}
                              title="Einlagern"
                            >
                              <ArrowDownToLine className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => {
                                setSelectedItem(item)
                                setMovementType('OUT')
                              }}
                              title="Auslagern"
                            >
                              <ArrowUpFromLine className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 w-8 p-0 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                              onClick={() => {
                                setSelectedItem(item)
                                setMovementType('ADJUST')
                              }}
                              title="Korrigieren"
                            >
                              <RefreshCw className="h-4 w-4" />
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

      {/* Stock Movement Modal */}
      <StockMovementModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        movementType={movementType}
      />
    </div>
  )
}
