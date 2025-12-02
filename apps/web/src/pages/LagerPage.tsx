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
  Plus, 
  Minus, 
  RotateCcw, 
  Boxes, 
  Tags, 
  CheckCircle2,
  XCircle,
  Filter,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw
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

      {/* Items Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-gray-400">Lade Artikel...</p>
          </div>
        </div>
      ) : itemsData?.items?.length === 0 ? (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="py-16">
            <div className="text-center">
              <Package className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">Keine Artikel gefunden</p>
              <p className="text-gray-500 text-sm mt-1">Versuche einen anderen Suchbegriff oder Filter</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {itemsData?.items?.map((item: any) => (
            <Card 
              key={item.id} 
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                item.isCritical 
                  ? 'bg-gradient-to-br from-red-900/20 to-gray-900 border-red-500/30 hover:border-red-500/50 hover:shadow-red-500/10' 
                  : 'bg-gray-900/50 border-gray-800 hover:border-gray-700 hover:shadow-gray-500/5'
              }`}
            >
              {item.isCritical && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
              )}
              
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg">{item.name}</h3>
                    <p className="text-gray-400 text-sm">{item.category.name}</p>
                  </div>
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
                </div>

                {/* Stock Info */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">Bestand</p>
                    <p className="text-white font-bold text-lg">{item.currentStock}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">Verfügbar</p>
                    <p className={`font-bold text-lg ${item.availableStock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {item.availableStock}
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">Reserviert</p>
                    <p className="text-yellow-400 font-bold text-lg">{item.reservedStock}</p>
                  </div>
                </div>

                {/* Min Stock Warning */}
                {item.isCritical && (
                  <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-2 mb-4">
                    <p className="text-red-300 text-xs flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Min. Bestand: {item.minStock} — Nachbestellen!
                    </p>
                  </div>
                )}

                {/* Actions */}
                {canEdit ? (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30"
                      onClick={() => {
                        setSelectedItem(item)
                        setMovementType('IN')
                      }}
                    >
                      <ArrowDownToLine className="h-4 w-4 mr-1" />
                      Ein
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30"
                      onClick={() => {
                        setSelectedItem(item)
                        setMovementType('OUT')
                      }}
                    >
                      <ArrowUpFromLine className="h-4 w-4 mr-1" />
                      Aus
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-500/30"
                      onClick={() => {
                        setSelectedItem(item)
                        setMovementType('ADJUST')
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                      Nur Leserechte
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results Count */}
      {itemsData?.items && itemsData.items.length > 0 && (
        <div className="text-center text-gray-500 text-sm">
          {itemsData.items.length} von {itemsData.pagination?.total || 0} Artikel angezeigt
        </div>
      )}

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
