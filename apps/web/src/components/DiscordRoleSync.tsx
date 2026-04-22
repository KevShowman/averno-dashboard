import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { toast } from 'sonner'
import { RefreshCw, Shield, AlertTriangle } from 'lucide-react'

interface DiscordRoleInfo {
  discordId: string
  discordRoles: string[]
  hasAccess: boolean
  currentRole: string
  allRoles?: string[]
  reason?: string
}

export default function DiscordRoleSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const queryClient = useQueryClient()

  const { data: roleInfo, isLoading } = useQuery({
    queryKey: ['discord-user-roles'],
    queryFn: () => api.get<DiscordRoleInfo>('/discord/user-roles').then(res => res.data),
    retry: false
  })

  const syncRoleMutation = useMutation({
    mutationFn: () => api.patch('/discord/sync-user-role'),
    onSuccess: () => {
      toast.success('Rolle erfolgreich synchronisiert!')
      queryClient.invalidateQueries({ queryKey: ['auth-me'] })
      queryClient.invalidateQueries({ queryKey: ['discord-user-roles'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler bei der Rollen-Synchronisation')
    },
  })

  const handleSyncRole = async () => {
    setIsSyncing(true)
    try {
      await syncRoleMutation.mutateAsync()
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Discord-Rollen-Synchronisation
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Lade Rollen-Informationen...
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!roleInfo) {
    return (
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Discord-Rollen-Synchronisation
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Fehler beim Laden der Rollen-Informationen
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="lasanta-card">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Discord-Rollen-Synchronisation
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Deine Discord-Server-Rollen werden automatisch mit deiner System-Rolle synchronisiert
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Zugriffsstatus */}
        <div className="flex items-center gap-2">
          {roleInfo.hasAccess ? (
            <>
              <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-400">
                <Shield className="h-3 w-3 mr-1" />
                Zugriff erlaubt
              </Badge>
              <span className="text-green-400 text-sm">
                Du hast eine der erlaubten Discord-Rollen
              </span>
            </>
          ) : (
            <>
              <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Zugriff verweigert
              </Badge>
              <span className="text-red-400 text-sm">
                {roleInfo.reason || 'Keine erlaubte Discord-Rolle gefunden'}
              </span>
            </>
          )}
        </div>

        {/* Aktuelle System-Rolle */}
        <div>
          <h4 className="text-white font-medium mb-2">Aktuelle System-Rolle</h4>
          <Badge variant="outline" className="bg-orange-900/20 text-orange-400 border-orange-400">
            {roleInfo.currentRole}
          </Badge>
        </div>

        {/* Alle System-Rollen */}
        {roleInfo.allRoles && roleInfo.allRoles.length > 0 && (
          <div>
            <h4 className="text-white font-medium mb-2">
              Alle System-Rollen ({roleInfo.allRoles.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {roleInfo.allRoles.map((role) => (
                <Badge key={role} variant="outline" className="bg-green-900/20 text-green-400 border-green-400">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Discord-Rollen */}
        <div>
          <h4 className="text-white font-medium mb-2">
            Discord-Rollen ({roleInfo.discordRoles.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {roleInfo.discordRoles.length > 0 ? (
              roleInfo.discordRoles.map((roleId) => (
                <Badge key={roleId} variant="outline" className="text-xs">
                  {roleId}
                </Badge>
              ))
            ) : (
              <span className="text-zinc-500 text-sm">
                Keine Discord-Rollen gefunden
              </span>
            )}
          </div>
        </div>

        {/* Synchronisations-Button */}
        {roleInfo.hasAccess && (
          <div className="pt-4 border-t border-zinc-700">
            <Button
              onClick={handleSyncRole}
              disabled={syncRoleMutation.isPending || isSyncing}
              variant="lasanta"
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(syncRoleMutation.isPending || isSyncing) ? 'animate-spin' : ''}`} />
              Rolle synchronisieren
            </Button>
            <p className="text-xs text-zinc-500 mt-2">
              Synchronisiert deine Discord-Rollen mit deinen System-Rollen (alle Rollen werden berücksichtigt)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
