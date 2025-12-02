import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bloodListApi } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skull, Plus, UserX, User, Phone, Gamepad2, Calendar, AlertTriangle, History, TrendingUp, Users, Ghost, Link2, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/auth';

interface BloodRecord {
  id: string;
  vorname: string;
  nachname: string;
  telefon: number;
  steam: string;
  bloodinDurch: string;
  bloodinTimestamp: string;
  status: 'ACTIVE' | 'BLOODOUT';
  bloodoutTimestamp?: string;
  bloodoutDurch?: string;
  bloodoutGrund?: string;
}

interface UnassignedDiscordUser {
  discordId: string;
  username: string;
  avatar: string | null;
  highestSystemRole: string;
  joinedAt: string;
  icFirstName?: string | null;
  icLastName?: string | null;
  isInDatabase?: boolean;
}

interface GhostUser {
  userId: string;
  discordId: string;
  username: string;
  icFirstName: string | null;
  icLastName: string | null;
  linkedBloodRecord?: BloodRecord;
}

type ViewMode = 'active' | 'history' | 'unassigned' | 'ghost';

export default function BloodListPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showBloodInModal, setShowBloodInModal] = useState(false);
  const [showBloodOutModal, setShowBloodOutModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedDiscordUser, setSelectedDiscordUser] = useState<UnassignedDiscordUser | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('active');

  const [bloodInData, setBloodInData] = useState({
    vorname: '',
    nachname: '',
    telefon: '',
    steam: '',
    bloodinDurch: '',
  });

  const [bloodOutData, setBloodOutData] = useState({
    identifier: '',
    grund: '',
  });

  const [linkData, setLinkData] = useState({
    vorname: '',
    nachname: '',
    telefon: '',
    steam: '',
    bloodinDurch: '',
  });

  const isLeadership = user && ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'].includes(user.role);
  const canBloodOut = user && ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'].includes(user.role);

  // Queries
  const { data: activeMembers = [], isLoading } = useQuery({
    queryKey: ['bloodlist', 'active'],
    queryFn: () => bloodListApi.getActive(),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['bloodlist', 'history'],
    queryFn: () => bloodListApi.getHistory(),
    enabled: !!isLeadership && viewMode === 'history',
  });

  const { data: stats } = useQuery({
    queryKey: ['bloodlist', 'stats'],
    queryFn: () => bloodListApi.getStats(),
  });

  const { data: bloodListStatus } = useQuery({
    queryKey: ['bloodlist', 'status'],
    queryFn: () => bloodListApi.getStatus(),
  });

  const isConfigured = bloodListStatus?.isConfigured ?? false;

  const { data: unassignedData, isLoading: loadingUnassigned } = useQuery({
    queryKey: ['bloodlist', 'unassigned'],
    queryFn: () => bloodListApi.getUnassignedDiscordUsers(),
    enabled: !!isLeadership && viewMode === 'unassigned',
  });

  const { data: ghostData, isLoading: loadingGhost } = useQuery({
    queryKey: ['bloodlist', 'ghost'],
    queryFn: () => bloodListApi.getGhostUsers(),
    enabled: !!isLeadership && viewMode === 'ghost',
  });

  // Mutations
  const bloodInMutation = useMutation({
    mutationFn: bloodListApi.bloodIn,
    onSuccess: (data) => {
      toast.success(data.message || 'Blood In erfolgreich');
      queryClient.invalidateQueries({ queryKey: ['bloodlist'] });
      setShowBloodInModal(false);
      setBloodInData({ vorname: '', nachname: '', telefon: '', steam: '', bloodinDurch: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Blood In');
    },
  });

  const bloodOutMutation = useMutation({
    mutationFn: bloodListApi.bloodOut,
    onSuccess: (data) => {
      toast.success(data.message || 'Blood Out erfolgreich');
      queryClient.invalidateQueries({ queryKey: ['bloodlist'] });
      setShowBloodOutModal(false);
      setBloodOutData({ identifier: '', grund: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Blood Out');
    },
  });

  const linkDiscordUserMutation = useMutation({
    mutationFn: bloodListApi.linkDiscordUser,
    onSuccess: (data) => {
      toast.success(data.message || 'Discord User erfolgreich verknüpft');
      queryClient.invalidateQueries({ queryKey: ['bloodlist'] });
      setShowLinkModal(false);
      setSelectedDiscordUser(null);
      setLinkData({ vorname: '', nachname: '', telefon: '', steam: '', bloodinDurch: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Verknüpfen');
    },
  });

  const handleBloodInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const telefon = parseInt(bloodInData.telefon);
    if (isNaN(telefon)) {
      toast.error('Telefonnummer muss eine Zahl sein');
      return;
    }

    bloodInMutation.mutate({
      ...bloodInData,
      telefon,
    });
  };

  const handleBloodOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    bloodOutMutation.mutate(bloodOutData);
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscordUser) return;

    const telefon = parseInt(linkData.telefon);
    if (isNaN(telefon)) {
      toast.error('Telefonnummer muss eine Zahl sein');
      return;
    }

    linkDiscordUserMutation.mutate({
      discordId: selectedDiscordUser.discordId,
      vorname: linkData.vorname,
      nachname: linkData.nachname,
      telefon,
      steam: linkData.steam,
      bloodinDurch: linkData.bloodinDurch,
    });
  };

  const openLinkModal = (discordUser: UnassignedDiscordUser) => {
    setSelectedDiscordUser(discordUser);
    
    // Vorausfüllen mit IC-Namen wenn vorhanden, sonst Username
    let vorname = '';
    let nachname = '';
    
    if (discordUser.icFirstName && discordUser.icLastName) {
      vorname = discordUser.icFirstName;
      nachname = discordUser.icLastName;
    } else {
      const nameParts = discordUser.username.split(' ');
      vorname = nameParts[0] || '';
      nachname = nameParts.slice(1).join(' ') || '';
    }
    
    setLinkData({
      vorname,
      nachname,
      telefon: '',
      steam: '',
      bloodinDurch: user?.icFirstName && user?.icLastName 
        ? `${user.icFirstName} ${user.icLastName}` 
        : user?.username || '',
    });
    setShowLinkModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Laden...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Warning wenn Channels nicht konfiguriert */}
      {isLeadership && !isConfigured && (
        <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-yellow-400 font-semibold">Blood List Channels nicht konfiguriert</p>
            <p className="text-yellow-200/70 text-sm mt-1">
              Blood In und Blood Out sind deaktiviert. Bitte konfiguriere zuerst die Discord-Channels in den Einstellungen.
            </p>
            <Link to="/settings">
              <Button variant="outline" className="mt-3 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10">
                <Settings className="mr-2 h-4 w-4" />
                Zu den Einstellungen
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Skull className="h-8 w-8 text-primary" />
            Blood List
          </h1>
          <p className="text-gray-400 mt-1">
            LaSanta Calavera Family Mitgliederverwaltung
          </p>
        </div>
        <div className="flex gap-2">
          {isLeadership && (
            <>
              <Button
                onClick={() => setShowBloodInModal(true)}
                disabled={!isConfigured}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isConfigured ? 'Channels müssen zuerst in den Einstellungen konfiguriert werden' : undefined}
              >
                <Plus className="mr-2 h-4 w-4" />
                Blood In
              </Button>
            </>
          )}
          {canBloodOut && (
            <Button
              onClick={() => setShowBloodOutModal(true)}
              disabled={!isConfigured}
              variant="destructive"
              className="bg-gray-800 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isConfigured ? 'Channels müssen zuerst in den Einstellungen konfiguriert werden' : undefined}
            >
              <UserX className="mr-2 h-4 w-4" />
              Blood Out
            </Button>
          )}
        </div>
      </div>

      {/* View Tabs */}
      {isLeadership && (
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setViewMode('active')}
            variant={viewMode === 'active' ? 'default' : 'outline'}
            className={viewMode === 'active' ? '' : 'border-gray-600'}
          >
            <User className="mr-2 h-4 w-4" />
            Aktive Mitglieder
          </Button>
          <Button
            onClick={() => setViewMode('history')}
            variant={viewMode === 'history' ? 'default' : 'outline'}
            className={viewMode === 'history' ? '' : 'border-gray-600'}
          >
            <History className="mr-2 h-4 w-4" />
            Blood Out Historie
          </Button>
          <Button
            onClick={() => setViewMode('unassigned')}
            variant={viewMode === 'unassigned' ? 'default' : 'outline'}
            className={viewMode === 'unassigned' ? '' : 'border-gray-600'}
          >
            <Users className="mr-2 h-4 w-4" />
            Unverknüpfte Discord User
          </Button>
          <Button
            onClick={() => setViewMode('ghost')}
            variant={viewMode === 'ghost' ? 'default' : 'outline'}
            className={viewMode === 'ghost' ? '' : 'border-gray-600'}
          >
            <Ghost className="mr-2 h-4 w-4" />
            Ghost Users
          </Button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 border-primary/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Aktive Mitglieder</p>
                  <p className="text-3xl font-bold text-white">{stats.totalActive}</p>
                </div>
                <User className="h-12 w-12 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-900/20 to-gray-800/20 border-gray-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Blood Outs</p>
                  <p className="text-3xl font-bold text-white">{stats.totalBloodOuts}</p>
                </div>
                <UserX className="h-12 w-12 text-gray-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gold-900/20 to-gold-800/20 border-gold-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Gesamt Records</p>
                  <p className="text-3xl font-bold text-white">{stats.totalRecords}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-gold-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'active' && (
        /* Aktive Mitglieder */
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              🩸 Aktive Blood Ins ({activeMembers.length})
            </CardTitle>
            <CardDescription>
              Alle aktiven Familienmitglieder
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeMembers.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Skull className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine aktiven Mitglieder</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeMembers.map((member: BloodRecord) => (
                  <div
                    key={member.id}
                    className="p-4 bg-gradient-to-r from-yellow-900/10 to-yellow-800/5 border border-primary/20 rounded-lg hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="h-5 w-5 text-primary" />
                          <h3 className="text-xl font-bold text-white">
                            {member.vorname} {member.nachname}
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-gray-300">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{member.telefon}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <Gamepad2 className="h-4 w-4 text-gray-400" />
                            <span className="truncate">{member.steam}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{formatDate(member.bloodinTimestamp)}</span>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-400">
                          Blood In durch: <span className="text-primary">{member.bloodinDurch}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === 'history' && (
        /* Blood Out Historie */
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              💀 Blood Out Historie ({history.length})
            </CardTitle>
            <CardDescription>
              Alle ausgeschlossenen Mitglieder
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine Blood Outs in der Historie</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((record: BloodRecord) => (
                  <div
                    key={record.id}
                    className="p-4 bg-gradient-to-r from-gray-900/30 to-gray-800/10 border border-gray-700/30 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <UserX className="h-5 w-5 text-gray-400" />
                          <h3 className="text-xl font-bold text-white">
                            {record.vorname} {record.nachname}
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-2">
                          <div className="flex items-center gap-2 text-gray-300">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{record.telefon}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            Blood Out: {record.bloodoutTimestamp && formatDate(record.bloodoutTimestamp)}
                          </div>
                        </div>
                        {record.bloodoutGrund && (
                          <div className="flex items-start gap-2 text-sm bg-orange-900/10 border border-orange-500/20 p-3 rounded">
                            <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-orange-300 font-medium">Grund: </span>
                              <span className="text-gray-300">{record.bloodoutGrund}</span>
                            </div>
                          </div>
                        )}
                        <div className="mt-2 text-sm text-gray-400">
                          Blood Out durch: <span className="text-orange-300">{record.bloodoutDurch}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === 'unassigned' && (
        /* Unverknüpfte Discord User */
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Unverknüpfte Discord User ({unassignedData?.totalUnassigned || 0})
            </CardTitle>
            <CardDescription>
              Discord Mitglieder die noch nicht mit einem Blood Record verknüpft sind
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUnassigned ? (
              <div className="text-center py-12 text-gray-400">
                Lade Discord User...
              </div>
            ) : (unassignedData?.unassignedDiscordUsers?.length || 0) === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Alle Discord User sind verknüpft</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unassignedData?.unassignedDiscordUsers?.map((discordUser: UnassignedDiscordUser) => (
                  <div
                    key={discordUser.discordId}
                    className="p-4 bg-gradient-to-r from-blue-900/10 to-blue-800/5 border border-blue-500/20 rounded-lg hover:border-blue-500/40 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {discordUser.avatar ? (
                          <img
                            src={`https://cdn.discordapp.com/avatars/${discordUser.discordId}/${discordUser.avatar}.png`}
                            alt={discordUser.username}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-bold text-white">
                            {discordUser.username}
                          </h3>
                          {discordUser.icFirstName && discordUser.icLastName && (
                            <p className="text-sm text-gray-300">
                              IC: {discordUser.icFirstName} {discordUser.icLastName}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-sm mt-1">
                            <Badge variant="outline" className="text-blue-400 border-blue-400">
                              {discordUser.highestSystemRole}
                            </Badge>
                            {discordUser.isInDatabase && (
                              <Badge variant="outline" className="text-green-400 border-green-400">
                                In DB
                              </Badge>
                            )}
                            <span className="text-gray-400">
                              Beigetreten: {formatDate(discordUser.joinedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => openLinkModal(discordUser)}
                        disabled={!isConfigured}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!isConfigured ? 'Channels müssen zuerst in den Einstellungen konfiguriert werden' : undefined}
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        Blood In
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === 'ghost' && (
        /* Ghost Users - nicht mehr im Discord */
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Ghost className="h-5 w-5 text-purple-500" />
              Ghost Users ({ghostData?.totalGhostUsers || 0})
            </CardTitle>
            <CardDescription>
              User die in der Datenbank sind, aber nicht mehr im Discord Server
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingGhost ? (
              <div className="text-center py-12 text-gray-400">
                Lade Ghost Users...
              </div>
            ) : (ghostData?.ghostUsers?.length || 0) === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Ghost className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine Ghost Users gefunden</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ghostData?.ghostUsers?.map((ghostUser: GhostUser) => (
                  <div
                    key={ghostUser.userId}
                    className="p-4 bg-gradient-to-r from-purple-900/10 to-purple-800/5 border border-purple-500/20 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Ghost className="h-5 w-5 text-purple-500" />
                          <h3 className="text-xl font-bold text-white">
                            {ghostUser.icFirstName && ghostUser.icLastName 
                              ? `${ghostUser.icFirstName} ${ghostUser.icLastName}`
                              : ghostUser.username}
                          </h3>
                          <Badge variant="outline" className="text-purple-400 border-purple-400">
                            Nicht im Discord
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-400">
                          Discord Username: {ghostUser.username}
                        </div>
                        {ghostUser.linkedBloodRecord && (
                          <div className="mt-2 p-2 bg-yellow-900/10 border border-yellow-500/20 rounded">
                            <span className="text-yellow-400 text-sm">
                              ⚠️ Hat Blood Record: {ghostUser.linkedBloodRecord.vorname} {ghostUser.linkedBloodRecord.nachname}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Blood In Modal */}
      {showBloodInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md lasanta-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Skull className="h-6 w-6 text-primary" />
                Blood In - Neues Mitglied
              </CardTitle>
              <CardDescription>
                Neues Familienmitglied aufnehmen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBloodInSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Vorname</label>
                  <Input
                    value={bloodInData.vorname}
                    onChange={(e) => setBloodInData({ ...bloodInData, vorname: e.target.value })}
                    className="!bg-gray-800 border-primary/30 focus:border-primary text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Nachname</label>
                  <Input
                    value={bloodInData.nachname}
                    onChange={(e) => setBloodInData({ ...bloodInData, nachname: e.target.value })}
                    className="!bg-gray-800 border-primary/30 focus:border-primary text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Telefonnummer</label>
                  <Input
                    type="number"
                    value={bloodInData.telefon}
                    onChange={(e) => setBloodInData({ ...bloodInData, telefon: e.target.value })}
                    className="!bg-gray-800 border-primary/30 focus:border-primary text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Steam ID</label>
                  <Input
                    value={bloodInData.steam}
                    onChange={(e) => setBloodInData({ ...bloodInData, steam: e.target.value })}
                    className="!bg-gray-800 border-primary/30 focus:border-primary text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Blood In durchgeführt von</label>
                  <Input
                    value={bloodInData.bloodinDurch}
                    onChange={(e) => setBloodInData({ ...bloodInData, bloodinDurch: e.target.value })}
                    className="!bg-gray-800 border-primary/30 focus:border-primary text-white"
                    placeholder="Name des Berechtigten"
                    required
                  />
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowBloodInModal(false);
                      setBloodInData({ vorname: '', nachname: '', telefon: '', steam: '', bloodinDurch: '' });
                    }}
                    className="flex-1"
                    disabled={bloodInMutation.isPending}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                    disabled={bloodInMutation.isPending}
                  >
                    {bloodInMutation.isPending ? 'Wird erstellt...' : 'Blood In'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Blood Out Modal */}
      {showBloodOutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md lasanta-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserX className="h-6 w-6 text-orange-500" />
                Blood Out - Mitglied entfernen
              </CardTitle>
              <CardDescription className="text-orange-400">
                ⚠️ Diese Aktion kann nicht rückgängig gemacht werden
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBloodOutSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Telefonnummer oder vollständiger Name
                  </label>
                  <Input
                    value={bloodOutData.identifier}
                    onChange={(e) => setBloodOutData({ ...bloodOutData, identifier: e.target.value })}
                    placeholder="z.B. 12345678 oder Max Mustermann"
                    className="!bg-gray-800 border-primary/30 focus:border-primary text-white"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Entweder Telefonnummer oder "Vorname Nachname"
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Grund</label>
                  <Textarea
                    value={bloodOutData.grund}
                    onChange={(e) => setBloodOutData({ ...bloodOutData, grund: e.target.value })}
                    placeholder="z.B. Familienentscheidung, schwerwiegende Fehler..."
                    rows={4}
                    className="!bg-gray-800 border-red-500/30 focus:border-red-500 resize-none text-white placeholder:text-gray-500"
                    required
                  />
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowBloodOutModal(false);
                      setBloodOutData({ identifier: '', grund: '' });
                    }}
                    className="flex-1"
                    disabled={bloodOutMutation.isPending}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    className="flex-1"
                    disabled={bloodOutMutation.isPending}
                  >
                    {bloodOutMutation.isPending ? 'Wird entfernt...' : 'Blood Out'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Link Discord User Modal */}
      {showLinkModal && selectedDiscordUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md lasanta-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Link2 className="h-6 w-6 text-blue-500" />
                Blood In - Discord User verknüpfen
              </CardTitle>
              <CardDescription>
                Blood In für: <span className="text-blue-400">{selectedDiscordUser.username}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLinkSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Vorname (IC)</label>
                  <Input
                    value={linkData.vorname}
                    onChange={(e) => setLinkData({ ...linkData, vorname: e.target.value })}
                    className="!bg-gray-800 border-blue-500/30 focus:border-blue-500 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Nachname (IC)</label>
                  <Input
                    value={linkData.nachname}
                    onChange={(e) => setLinkData({ ...linkData, nachname: e.target.value })}
                    className="!bg-gray-800 border-blue-500/30 focus:border-blue-500 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Telefonnummer</label>
                  <Input
                    type="number"
                    value={linkData.telefon}
                    onChange={(e) => setLinkData({ ...linkData, telefon: e.target.value })}
                    className="!bg-gray-800 border-blue-500/30 focus:border-blue-500 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Steam ID</label>
                  <Input
                    value={linkData.steam}
                    onChange={(e) => setLinkData({ ...linkData, steam: e.target.value })}
                    className="!bg-gray-800 border-blue-500/30 focus:border-blue-500 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Blood In durchgeführt von</label>
                  <Input
                    value={linkData.bloodinDurch}
                    onChange={(e) => setLinkData({ ...linkData, bloodinDurch: e.target.value })}
                    className="!bg-gray-800 border-blue-500/30 focus:border-blue-500 text-white"
                    required
                  />
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowLinkModal(false);
                      setSelectedDiscordUser(null);
                      setLinkData({ vorname: '', nachname: '', telefon: '', steam: '', bloodinDurch: '' });
                    }}
                    className="flex-1"
                    disabled={linkDiscordUserMutation.isPending}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={linkDiscordUserMutation.isPending}
                  >
                    {linkDiscordUserMutation.isPending ? 'Wird verknüpft...' : 'Blood In & Verknüpfen'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

