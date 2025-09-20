import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Users, RefreshCw, Download, CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

interface DiscordMember {
  discordId: string
  username: string
  discriminator: string
  avatar?: string
  discordRoles: string[]
  highestSystemRole: string
  highestRoleName: string
  joinedAt: string
  isInDatabase: boolean
}

interface DiscordMembersResponse {
  message: string
  count: number
  members: DiscordMember[]
}

export default function DiscordMembersManager() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const queryClient = useQueryClient()

  const { data: membersData, isLoading, error } = useQuery({
    queryKey: ['discord-server-members'],
    queryFn: () => api.get<DiscordMembersResponse>('/discord/server-members').then(res => res.data),
    retry: false
  })

  const importMemberMutation = useMutation({
    mutationFn: (discordId: string) => api.post('/discord/import-member', { discordId }),
    onSuccess: () => {
      toast.success('Benutzer erfolgreich importiert!')
      queryClient.invalidateQueries({ queryKey: ['discord-server-members'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
        toast.error((error.response?.data as any)?.message || 'Fehler beim Importieren des Benutzers')
    },
  })

  const syncAllMembersMutation = useMutation({
    mutationFn: () => api.post('/discord/sync-all-members'),
    onSuccess: (data) => {
      const { imported, updated, total } = data.data
      toast.success(`Synchronisation abgeschlossen! ${imported} neue Benutzer importiert, ${updated} aktualisiert von ${total} insgesamt.`)
      queryClient.invalidateQueries({ queryKey: ['discord-server-members'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      toast.error((error.response?.data as any)?.message || 'Fehler beim Synchronisieren aller Mitglieder')
    },
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await queryClient.invalidateQueries({ queryKey: ['discord-server-members'] })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleImportMember = async (discordId: string) => {
    await importMemberMutation.mutateAsync(discordId)
  }

  const handleSyncAll = async () => {
    setIsSyncing(true)
    try {
      await syncAllMembersMutation.mutateAsync()
    } finally {
      setIsSyncing(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'EL_PATRON': return 'bg-red-900/20 text-red-400 border-red-400'
      case 'DON': return 'bg-purple-900/20 text-purple-400 border-purple-400'
      case 'ASESOR': return 'bg-blue-900/20 text-blue-400 border-blue-400'
    case 'ROUTENVERWALTUNG': return 'bg-orange-900/20 text-orange-400 border-orange-400'
    case 'SICARIO': return 'bg-yellow-900/20 text-yellow-400 border-yellow-400'
    case 'SOLDADO': return 'bg-gray-900/20 text-gray-400 border-gray-400'
      default: return 'bg-gray-900/20 text-gray-400 border-gray-400'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'EL_PATRON': return 'El Patron'
      case 'DON': return 'Don'
      case 'ASESOR': return 'Asesor'
    case 'ROUTENVERWALTUNG': return 'Routenverwaltung'
    case 'SICARIO': return 'Sicario'
    case 'SOLDADO': return 'Soldado'
      default: return role
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Discord-Server-Mitglieder
          </CardTitle>
          <CardDescription className="text-gray-400">
            Lade Discord-Server-Mitglieder...
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Discord-Server-Mitglieder
          </CardTitle>
          <CardDescription className="text-gray-400">
            Fehler beim Laden der Discord-Server-Mitglieder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              {(error as any).message || 'Unbekannter Fehler beim Abrufen der Mitglieder'}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const members = membersData?.members || []
  const importedCount = members.filter(member => member.isInDatabase).length
  const notImportedCount = members.filter(member => !member.isInDatabase).length

  return (
    <Card className="lasanta-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Discord-Server-Mitglieder
            </CardTitle>
            <CardDescription className="text-gray-400">
              Mitglieder mit erlaubten Discord-Rollen ({members.length} gefunden)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSyncAll}
              disabled={isSyncing || syncAllMembersMutation.isPending}
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistiken */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-900/20 border border-blue-400/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Gesamt</span>
            </div>
            <div className="text-2xl font-bold text-white mt-1">{members.length}</div>
          </div>
          <div className="bg-green-900/20 border border-green-400/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">Importiert</span>
            </div>
            <div className="text-2xl font-bold text-white mt-1">{importedCount}</div>
          </div>
          <div className="bg-orange-900/20 border border-orange-400/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-orange-400" />
              <span className="text-orange-400 text-sm font-medium">Nicht importiert</span>
            </div>
            <div className="text-2xl font-bold text-white mt-1">{notImportedCount}</div>
          </div>
        </div>

        {/* Mitglieder-Tabelle */}
        {members.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-400">Benutzer</TableHead>
                  <TableHead className="text-gray-400">Discord-Rollen</TableHead>
                  <TableHead className="text-gray-400">System-Rolle</TableHead>
                  <TableHead className="text-gray-400">Beigetreten</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.discordId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {member.avatar ? (
                          <img
                            src={`https://cdn.discordapp.com/avatars/${member.discordId}/${member.avatar}.png`}
                            alt={member.username}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white">
                              {member.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-white">
                            {member.username}
                            {member.discriminator !== '0' && `#${member.discriminator}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {member.discordId}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.discordRoles.slice(0, 3).map((roleId) => (
                          <Badge key={roleId} variant="outline" className="text-xs">
                            {roleId.slice(-4)}
                          </Badge>
                        ))}
                        {member.discordRoles.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{member.discordRoles.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getRoleColor(member.highestSystemRole)}
                      >
                        {getRoleDisplayName(member.highestSystemRole)}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        {member.highestRoleName}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {formatDate(member.joinedAt)}
                    </TableCell>
                    <TableCell>
                      {member.isInDatabase ? (
                        <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-400">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Importiert
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-orange-900/20 text-orange-400 border-orange-400">
                          <XCircle className="h-3 w-3 mr-1" />
                          Nicht importiert
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!member.isInDatabase && (
                        <Button
                          onClick={() => handleImportMember(member.discordId)}
                          disabled={importMemberMutation.isPending}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Importieren
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              Keine Discord-Server-Mitglieder mit erlaubten Rollen gefunden
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Stelle sicher, dass der Discord Bot die richtigen Berechtigungen hat
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
