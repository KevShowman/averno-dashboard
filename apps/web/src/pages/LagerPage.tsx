import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Package, Search, AlertTriangle, Plus, Minus, RotateCcw } from 'lucide-react'
import { formatDate, getRoleColor } from '../lib/utils'
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Package className="mr-3 h-8 w-8 text-accent" />
            Lagerverwaltung
          </h1>
          <p className="text-gray-400 mt-2">
            Verwalte Waffen, Munition und Ausrüstung des Kartells
          </p>
        </div>
        {criticalCount > 0 && (
          <Badge variant="danger" className="text-base px-4 py-2">
            <AlertTriangle className="mr-2 h-4 w-4" />
            {criticalCount} kritische Bestände
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Gesamte Artikel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {itemsData?.pagination?.total || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Kategorien</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {categories?.length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Kritische Bestände</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {criticalCount}
            </div>
          </CardContent>
        </Card>
        
        <Card className="lasanta-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Verfügbare Artikel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {itemsData?.items?.filter((item: any) => item.availableStock > 0).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="lasanta-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Artikel suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-background border border-input rounded-md text-foreground"
            >
              <option value="">Alle Kategorien</option>
              {categories?.map((category: any) => (
                <option key={category.id} value={category.name}>
                  {category.name} ({category._count.items})
                </option>
              ))}
            </select>
            
            <Button
              variant={showCriticalOnly ? "destructive" : "outline"}
              onClick={() => setShowCriticalOnly(!showCriticalOnly)}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Nur kritische
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white">Artikel</CardTitle>
          <CardDescription className="text-gray-400">
            {itemsData?.items?.length || 0} Artikel gefunden
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
                    <TableHead className="text-gray-400">Artikel</TableHead>
                    <TableHead className="text-gray-400">Kategorie</TableHead>
                    <TableHead className="text-gray-400">Bestand</TableHead>
                    <TableHead className="text-gray-400">Verfügbar</TableHead>
                    <TableHead className="text-gray-400">Reserviert</TableHead>
                    <TableHead className="text-gray-400">Min. Bestand</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsData?.items?.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-gray-800/50">
                      <TableCell>
                        <div className="font-medium text-white">{item.name}</div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {item.category.name}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {item.currentStock}
                      </TableCell>
                      <TableCell className={item.availableStock > 0 ? "text-green-400" : "text-red-400"}>
                        {item.availableStock}
                      </TableCell>
                      <TableCell className="text-yellow-400">
                        {item.reservedStock}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {item.minStock}
                      </TableCell>
                      <TableCell>
                        {item.isCritical ? (
                          <Badge variant="danger">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Kritisch
                          </Badge>
                        ) : item.isLocked ? (
                          <Badge variant="warning">Gesperrt</Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {(user?.role === 'EL_PATRON' || user?.role === 'DON' || user?.role === 'ASESOR') && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-400 border-green-400 hover:bg-green-400/10"
                                onClick={() => {
                                  setSelectedItem(item)
                                  setMovementType('IN')
                                }}
                                title="Einlagern"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-400 border-red-400 hover:bg-red-400/10"
                                onClick={() => {
                                  setSelectedItem(item)
                                  setMovementType('OUT')
                                }}
                                title="Auslagern"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-yellow-400 border-yellow-400 hover:bg-yellow-400/10"
                                onClick={() => {
                                  setSelectedItem(item)
                                  setMovementType('ADJUST')
                                }}
                                title="Bestand korrigieren"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {(user?.role === 'ASESOR' || user?.role === 'SOLDADO') && (
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                              Nur lesen
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {(!itemsData?.items || itemsData.items.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  Keine Artikel gefunden
                </div>
              )}
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
