import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bloodListApi } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Skull, Plus, UserX, User, Phone, Gamepad2, Calendar, AlertTriangle, History, TrendingUp } from 'lucide-react';
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

export default function BloodListPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showBloodInModal, setShowBloodInModal] = useState(false);
  const [showBloodOutModal, setShowBloodOutModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    enabled: !!isLeadership && showHistory,
  });

  const { data: stats } = useQuery({
    queryKey: ['bloodlist', 'stats'],
    queryFn: () => bloodListApi.getStats(),
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
                onClick={() => setShowHistory(!showHistory)}
                variant="outline"
                className="border-gray-600"
              >
                <History className="mr-2 h-4 w-4" />
                {showHistory ? 'Aktive anzeigen' : 'Historie anzeigen'}
              </Button>
              <Button
                onClick={() => setShowBloodInModal(true)}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Blood In
              </Button>
            </>
          )}
          {canBloodOut && (
            <Button
              onClick={() => setShowBloodOutModal(true)}
              variant="destructive"
              className="bg-gray-800 hover:bg-gray-900"
            >
              <UserX className="mr-2 h-4 w-4" />
              Blood Out
            </Button>
          )}
        </div>
      </div>

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
      {!showHistory ? (
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
      ) : (
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
    </div>
  );
}

