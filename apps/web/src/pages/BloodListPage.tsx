import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bloodListApi } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  Skull, 
  Plus, 
  UserX, 
  User, 
  Phone, 
  Gamepad2, 
  Calendar, 
  AlertTriangle, 
  History, 
  TrendingUp, 
  Users, 
  Ghost, 
  Link2, 
  Settings,
  UserCheck,
  UserMinus
} from 'lucide-react';
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

  const isLeadership = user && ['PATRON', 'DON', 'CAPO'].includes(user.role);
  const canBloodIn = user && (
    ['PATRON', 'DON', 'CAPO', 'FORMACION'].includes(user.role as string) ||
    (user.allRoles && (user.allRoles as string[]).includes('FORMACION'))
  );
  const canBloodOut = user && ['PATRON', 'DON', 'CAPO'].includes(user.role);

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
    enabled: !!canBloodIn && viewMode === 'unassigned',
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
    bloodInMutation.mutate({ ...bloodInData, telefon });
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
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          <p className="text-zinc-400">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Warning Banner */}
      {canBloodIn && !isConfigured && (
        <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-orange-400 font-semibold">Blood List Channels nicht konfiguriert</p>
            <p className="text-orange-200/70 text-sm mt-1">
              Blood In {canBloodOut && 'und Blood Out '} {canBloodOut ? 'sind' : 'ist'} deaktiviert.
            </p>
            {isLeadership && (
              <Link to="/settings">
                <Button variant="outline" className="mt-3 border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
                  <Settings className="mr-2 h-4 w-4" />
                  Zu den Einstellungen
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-red-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-orange-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl shadow-lg shadow-red-500/30">
              <Skull className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Blood List</h1>
              <p className="text-zinc-400 mt-1">
                El Averno Cartel Family • Mitgliederverwaltung
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      {canBloodIn && (
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setViewMode('active')}
            variant={viewMode === 'active' ? 'default' : 'outline'}
            className={viewMode === 'active' ? 'bg-orange-600 hover:bg-orange-700 text-zinc-900' : 'border-zinc-700 hover:bg-zinc-800 hover:border-orange-500/50'}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Aktive
          </Button>
          {isLeadership && (
            <Button
              onClick={() => setViewMode('history')}
              variant={viewMode === 'history' ? 'default' : 'outline'}
              className={viewMode === 'history' ? 'bg-orange-600 hover:bg-orange-700 text-zinc-900' : 'border-zinc-700 hover:bg-zinc-800 hover:border-orange-500/50'}
            >
              <History className="mr-2 h-4 w-4" />
              Historie
            </Button>
          )}
          <Button
            onClick={() => setViewMode('unassigned')}
            variant={viewMode === 'unassigned' ? 'default' : 'outline'}
            className={viewMode === 'unassigned' ? 'bg-orange-600 hover:bg-orange-700 text-zinc-900' : 'border-zinc-700 hover:bg-zinc-800 hover:border-orange-500/50'}
          >
            <Users className="mr-2 h-4 w-4" />
            Unverknüpft
          </Button>
          {isLeadership && (
            <Button
              onClick={() => setViewMode('ghost')}
              variant={viewMode === 'ghost' ? 'default' : 'outline'}
              className={viewMode === 'ghost' ? 'bg-orange-600 hover:bg-orange-700 text-zinc-900' : 'border-zinc-700 hover:bg-zinc-800 hover:border-orange-500/50'}
            >
              <Ghost className="mr-2 h-4 w-4" />
              Ghosts
            </Button>
          )}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="relative overflow-hidden bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border-orange-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-sm">Aktive Mitglieder</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.totalActive}</p>
                </div>
                <UserCheck className="h-10 w-10 text-orange-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border-orange-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-sm">Blood Outs</p>
                  <p className="text-3xl font-bold text-white">{stats.totalBloodOuts}</p>
                </div>
                <UserMinus className="h-10 w-10 text-zinc-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border-orange-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-sm">Gesamt Records</p>
                  <p className="text-3xl font-bold text-white">{stats.totalRecords}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-orange-500/30" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Members Table */}
      {viewMode === 'active' && (
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-white flex items-center gap-2">
              🩸 Aktive Blood Ins ({activeMembers.length})
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Alle aktiven Familienmitglieder
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {activeMembers.length === 0 ? (
              <div className="py-16 text-center">
                <Skull className="h-16 w-16 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400">Keine aktiven Mitglieder</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-800/30">
                      <th className="text-left py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Name</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Telefon</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Steam</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Blood In</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Durch</th>
                      {canBloodOut && (
                        <th className="text-right py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Aktion</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {activeMembers.map((member: BloodRecord) => (
                      <tr key={member.id} className="group hover:bg-red-950/20 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="font-medium text-white">{member.vorname} {member.nachname}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-zinc-300">
                            <Phone className="h-3 w-3 text-zinc-500" />
                            {member.telefon}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-zinc-300 text-sm truncate max-w-[150px] block">{member.steam}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-zinc-400 text-sm">{formatDate(member.bloodinTimestamp)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-300 font-normal">
                            {member.bloodinDurch}
                          </Badge>
                        </td>
                        {canBloodOut && (
                          <td className="py-4 px-6 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setBloodOutData({ identifier: `${member.vorname} ${member.nachname}`, grund: '' });
                                setShowBloodOutModal(true);
                              }}
                              disabled={!isConfigured}
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                              title={!isConfigured ? 'Channels müssen zuerst konfiguriert werden' : 'Blood Out'}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Blood Out
                            </Button>
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
      )}

      {/* History Table */}
      {viewMode === 'history' && (
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-white flex items-center gap-2">
              💀 Blood Out Historie ({history.length})
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Alle ausgeschlossenen Mitglieder
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <div className="py-16 text-center">
                <UserX className="h-16 w-16 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400">Keine Blood Outs in der Historie</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-800/30">
                      <th className="text-left py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Name</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Telefon</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Blood Out</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Durch</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Grund</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {history.map((record: BloodRecord) => (
                      <tr key={record.id} className="group hover:bg-zinc-800/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-zinc-500" />
                            <span className="font-medium text-white">{record.vorname} {record.nachname}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-zinc-400">{record.telefon}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-zinc-400 text-sm">
                            {record.bloodoutTimestamp && formatDate(record.bloodoutTimestamp)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-orange-300">{record.bloodoutDurch}</span>
                        </td>
                        <td className="py-4 px-4 max-w-xs">
                          {record.bloodoutGrund && (
                            <span className="text-zinc-300 text-sm truncate block">{record.bloodoutGrund}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Unassigned Discord Users Table */}
      {viewMode === 'unassigned' && (
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-400" />
              Unverknüpfte Discord User ({unassignedData?.totalUnassigned || 0})
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Discord Mitglieder ohne Blood Record
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingUnassigned ? (
              <div className="py-16 text-center">
                <div className="h-8 w-8 border-2 border-orange-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-zinc-400">Lade Discord User...</p>
              </div>
            ) : (unassignedData?.unassignedDiscordUsers?.length || 0) === 0 ? (
              <div className="py-16 text-center">
                <Users className="h-16 w-16 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400">Alle Discord User sind verknüpft</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-800/30">
                      <th className="text-left py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">User</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">IC Name</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Rolle</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Beigetreten</th>
                      <th className="text-right py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {unassignedData?.unassignedDiscordUsers?.map((discordUser: UnassignedDiscordUser) => (
                      <tr key={discordUser.discordId} className="group hover:bg-orange-950/20 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            {discordUser.avatar ? (
                              <img
                                src={`https://cdn.discordapp.com/avatars/${discordUser.discordId}/${discordUser.avatar}.png`}
                                alt={discordUser.username}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                                <User className="h-4 w-4 text-zinc-400" />
                              </div>
                            )}
                            <span className="font-medium text-white">{discordUser.username}</span>
                            {discordUser.isInDatabase && (
                              <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs">DB</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {discordUser.icFirstName && discordUser.icLastName ? (
                            <span className="text-zinc-300">{discordUser.icFirstName} {discordUser.icLastName}</span>
                          ) : (
                            <span className="text-zinc-500">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className="text-orange-400 border-orange-400/30 font-normal">
                            {discordUser.highestSystemRole}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-zinc-400 text-sm">{formatDate(discordUser.joinedAt)}</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Button
                            onClick={() => openLinkModal(discordUser)}
                            disabled={!isConfigured}
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/30"
                          >
                            <Link2 className="mr-2 h-3 w-3" />
                            Blood In
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ghost Users Table */}
      {viewMode === 'ghost' && (
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-white flex items-center gap-2">
              <Ghost className="h-5 w-5 text-purple-400" />
              Ghost Users ({ghostData?.totalGhostUsers || 0})
            </CardTitle>
            <CardDescription className="text-zinc-400">
              In der Datenbank, aber nicht mehr im Discord
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingGhost ? (
              <div className="py-16 text-center">
                <div className="h-8 w-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-zinc-400">Lade Ghost Users...</p>
              </div>
            ) : (ghostData?.ghostUsers?.length || 0) === 0 ? (
              <div className="py-16 text-center">
                <Ghost className="h-16 w-16 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400">Keine Ghost Users gefunden</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-800/30">
                      <th className="text-left py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Name</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Discord</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Blood Record</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {ghostData?.ghostUsers?.map((ghostUser: GhostUser) => (
                      <tr key={ghostUser.userId} className="group hover:bg-purple-950/20 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Ghost className="h-4 w-4 text-purple-400" />
                            <span className="font-medium text-white">
                              {ghostUser.icFirstName && ghostUser.icLastName 
                                ? `${ghostUser.icFirstName} ${ghostUser.icLastName}`
                                : ghostUser.username}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-zinc-400">{ghostUser.username}</span>
                        </td>
                        <td className="py-4 px-4">
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                            Nicht im Discord
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          {ghostUser.linkedBloodRecord && (
                            <span className="text-orange-400 text-sm">
                              ⚠️ {ghostUser.linkedBloodRecord.vorname} {ghostUser.linkedBloodRecord.nachname}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Blood In Modal */}
      {showBloodInModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-lg relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-primary/20 to-red-600/20 blur-xl rounded-2xl" />
            <Card className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-red-500/30 shadow-2xl rounded-2xl overflow-hidden">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-900/50 via-red-800/30 to-transparent" />
                <CardHeader className="relative pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg shadow-red-500/30">
                      <Skull className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-white">Blood In</CardTitle>
                      <CardDescription className="text-red-200/70 mt-1">Willkommen in der Familie</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </div>
              <CardContent className="pt-2 pb-6">
                <form onSubmit={handleBloodInSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <User className="h-4 w-4 text-red-400" />Vorname
                      </label>
                      <Input value={bloodInData.vorname} onChange={(e) => setBloodInData({ ...bloodInData, vorname: e.target.value })} className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white h-11" placeholder="z.B. Carlos" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <User className="h-4 w-4 text-red-400" />Nachname
                      </label>
                      <Input value={bloodInData.nachname} onChange={(e) => setBloodInData({ ...bloodInData, nachname: e.target.value })} className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white h-11" placeholder="z.B. Martinez" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-red-400" />Telefon
                      </label>
                      <Input type="number" value={bloodInData.telefon} onChange={(e) => setBloodInData({ ...bloodInData, telefon: e.target.value })} className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white h-11 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="555-1234" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Gamepad2 className="h-4 w-4 text-red-400" />Steam ID
                      </label>
                      <Input value={bloodInData.steam} onChange={(e) => setBloodInData({ ...bloodInData, steam: e.target.value })} className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white h-11" placeholder="steam:xxxx" required />
                    </div>
                  </div>
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-700/50" /></div>
                    <div className="relative flex justify-center"><span className="bg-zinc-900 px-3 text-xs text-zinc-500 uppercase tracking-wider">Aufnahme durch</span></div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Skull className="h-4 w-4 text-red-400" />Durchgeführt von
                    </label>
                    <Input value={bloodInData.bloodinDurch} onChange={(e) => setBloodInData({ ...bloodInData, bloodinDurch: e.target.value })} className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white h-11" placeholder="Name des Verantwortlichen" required />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => { setShowBloodInModal(false); setBloodInData({ vorname: '', nachname: '', telefon: '', steam: '', bloodinDurch: '' }); }} className="flex-1 h-12 border-zinc-600 hover:bg-zinc-800 text-zinc-300" disabled={bloodInMutation.isPending}>Abbrechen</Button>
                    <Button type="submit" className="flex-1 h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold shadow-lg shadow-red-500/25" disabled={bloodInMutation.isPending}>
                      {bloodInMutation.isPending ? <span className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Wird aufgenommen...</span> : <span className="flex items-center gap-2"><Plus className="h-5 w-5" />Blood In</span>}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Blood Out Modal */}
      {showBloodOutModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-lg relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-red-500/20 to-orange-600/20 blur-xl rounded-2xl" />
            <Card className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-orange-500/30 shadow-2xl rounded-2xl overflow-hidden">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-900/50 via-red-800/30 to-transparent" />
                <CardHeader className="relative pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl shadow-lg shadow-orange-500/30">
                      <UserX className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-white">Blood Out</CardTitle>
                      <CardDescription className="text-orange-200/70 mt-1">⚠️ Diese Aktion ist unwiderruflich</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </div>
              <CardContent className="pt-2 pb-6">
                <form onSubmit={handleBloodOutSubmit} className="space-y-5">
                  <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-red-300 font-medium">User wird vom Discord gekickt</p>
                      <p className="text-red-200/70 mt-1">Eine Ankündigung wird im Blood Out Channel gepostet.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <User className="h-4 w-4 text-orange-400" />Mitglied identifizieren
                    </label>
                    <Input value={bloodOutData.identifier} onChange={(e) => setBloodOutData({ ...bloodOutData, identifier: e.target.value })} placeholder="Telefonnummer oder 'Vorname Nachname'" className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500 text-white h-11" required />
                    <p className="text-xs text-zinc-500">z.B. <span className="text-zinc-400">12345678</span> oder <span className="text-zinc-400">Max Mustermann</span></p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Skull className="h-4 w-4 text-orange-400" />Grund für Blood Out
                    </label>
                    <Textarea value={bloodOutData.grund} onChange={(e) => setBloodOutData({ ...bloodOutData, grund: e.target.value })} placeholder="Warum wird das Mitglied entfernt..." rows={4} className="!bg-zinc-800/50 border-zinc-700 focus:border-orange-500 resize-none text-white" required />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => { setShowBloodOutModal(false); setBloodOutData({ identifier: '', grund: '' }); }} className="flex-1 h-12 border-zinc-600 hover:bg-zinc-800 text-zinc-300" disabled={bloodOutMutation.isPending}>Abbrechen</Button>
                    <Button type="submit" className="flex-1 h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold shadow-lg shadow-red-500/25" disabled={bloodOutMutation.isPending}>
                      {bloodOutMutation.isPending ? <span className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Wird entfernt...</span> : <span className="flex items-center gap-2"><UserX className="h-5 w-5" />Blood Out</span>}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Link Discord User Modal */}
      {showLinkModal && selectedDiscordUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-lg relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-orange-500/20 to-orange-600/20 blur-xl rounded-2xl pointer-events-none" />
            <Card className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-orange-500/30 shadow-2xl rounded-2xl overflow-hidden">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-900/50 via-orange-800/30 to-transparent pointer-events-none" />
                <CardHeader className="relative pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
                      <Link2 className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-white">Blood In & Verknüpfen</CardTitle>
                      <CardDescription className="text-orange-200/70 mt-1">Discord: <span className="text-orange-300 font-medium">{selectedDiscordUser.username}</span></CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </div>
              <CardContent className="pt-2 pb-6">
                <form onSubmit={handleLinkSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <User className="h-4 w-4 text-orange-400" />Vorname (IC)
                      </label>
                      <Input value={linkData.vorname} onChange={(e) => setLinkData({ ...linkData, vorname: e.target.value })} className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500 text-white h-11" placeholder="z.B. Carlos" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <User className="h-4 w-4 text-orange-400" />Nachname (IC)
                      </label>
                      <Input value={linkData.nachname} onChange={(e) => setLinkData({ ...linkData, nachname: e.target.value })} className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500 text-white h-11" placeholder="z.B. Martinez" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-orange-400" />Telefon
                      </label>
                      <Input type="number" value={linkData.telefon} onChange={(e) => setLinkData({ ...linkData, telefon: e.target.value })} className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500 text-white h-11 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="555-1234" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Gamepad2 className="h-4 w-4 text-orange-400" />Steam ID
                      </label>
                      <Input value={linkData.steam} onChange={(e) => setLinkData({ ...linkData, steam: e.target.value })} className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500 text-white h-11" placeholder="steam:xxxx" required />
                    </div>
                  </div>
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-700/50" /></div>
                    <div className="relative flex justify-center"><span className="bg-zinc-900 px-3 text-xs text-zinc-500 uppercase tracking-wider">Aufnahme durch</span></div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Skull className="h-4 w-4 text-orange-400" />Durchgeführt von
                    </label>
                    <Input value={linkData.bloodinDurch} onChange={(e) => setLinkData({ ...linkData, bloodinDurch: e.target.value })} className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500 text-white h-11" placeholder="Name des Verantwortlichen" required />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => { setShowLinkModal(false); setSelectedDiscordUser(null); setLinkData({ vorname: '', nachname: '', telefon: '', steam: '', bloodinDurch: '' }); }} className="flex-1 h-12 border-zinc-600 hover:bg-zinc-800 text-zinc-300" disabled={linkDiscordUserMutation.isPending}>Abbrechen</Button>
                    <Button type="submit" className="flex-1 h-12 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-zinc-900 font-semibold shadow-lg shadow-orange-500/25" disabled={linkDiscordUserMutation.isPending}>
                      {linkDiscordUserMutation.isPending ? <span className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Wird verknüpft...</span> : <span className="flex items-center gap-2"><Link2 className="h-5 w-5" />Blood In & Verknüpfen</span>}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
