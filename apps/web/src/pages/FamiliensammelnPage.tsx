import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Users, Plus, X, TrendingUp, Calendar, CheckCircle, XCircle, AlertTriangle, Edit } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { familiensammelnApi } from '../lib/api';
import EnhancedPeoplePicker from '../components/EnhancedPeoplePicker';
import { TourCountModal } from '../components/TourCountModal';
import { toast } from 'sonner';

interface User {
  id: string;
  username: string;
  icFirstName?: string;
  icLastName?: string;
  avatarUrl?: string;
  role: string;
}

interface Participation {
  id: string;
  userId: string;
  date: string;
  tourCount: number;
  user: User;
}

interface Week {
  id: string;
  weekStart: string;
  weekEnd: string;
  participations: Participation[];
}

interface Statistics {
  user: User;
  participationCount: number;
  totalTours: number;
  remainingDays: number;
  remainingTours: number;
  mustPayWeeklyDelivery: boolean;
  hasPassed: boolean;
}

interface LeaderboardEntry {
  user: User;
  totalDays: number;
  totalTours: number;
  weeksParticipated: number;
  lastParticipation: string;
  averageToursPerDay: string;
}

interface AllTimeStatistics {
  leaderboard: LeaderboardEntry[];
  totalStats: {
    totalParticipations: number;
    totalTours: number;
    totalWeeks: number;
    activeUsers: number;
    averageToursPerParticipation: string;
  };
}

export default function FamiliensammelnPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showAllTimeStats, setShowAllTimeStats] = useState(false);
  const [editingParticipation, setEditingParticipation] = useState<Participation | null>(null);

  const isLeadership = user?.role === 'EL_PATRON' || user?.role === 'DON' || user?.role === 'ASESOR';

  // Query: Aktuelle Woche
  const { data: currentWeek, isLoading } = useQuery<Week>({
    queryKey: ['familiensammeln', 'current'],
    queryFn: familiensammelnApi.getCurrentWeek,
  });

  // Query: Statistik
  const { data: statistics } = useQuery<{ week: Week; statistics: Statistics[] }>({
    queryKey: ['familiensammeln', 'statistics', currentWeek?.id],
    queryFn: () => familiensammelnApi.getWeekStatistics(currentWeek!.id),
    enabled: !!currentWeek?.id && showStatistics,
  });

  // Query: Gesamtstatistik & Leaderboard
  const { data: allTimeStats } = useQuery<AllTimeStatistics>({
    queryKey: ['familiensammeln', 'all-time-statistics'],
    queryFn: familiensammelnApi.getAllTimeStatistics,
    enabled: showAllTimeStats,
  });

  // Mutation: Teilnahme hinzufügen
  const addParticipationMutation = useMutation({
    mutationFn: (data: { weekId: string; userId: string; date: string }) =>
      familiensammelnApi.addParticipation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familiensammeln'] });
      toast.success('Teilnahme erfolgreich hinzugefügt');
      setShowUserPicker(false);
      setSelectedDay(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Hinzufügen der Teilnahme');
    },
  });

  // Mutation: Teilnahme entfernen
  const removeParticipationMutation = useMutation({
    mutationFn: (participationId: string) =>
      familiensammelnApi.removeParticipation(participationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familiensammeln'] });
      toast.success('Teilnahme erfolgreich entfernt');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Entfernen der Teilnahme');
    },
  });

  // Mutation: Tour-Anzahl aktualisieren
  const updateTourCountMutation = useMutation({
    mutationFn: ({ participationId, tourCount }: { participationId: string; tourCount: number }) =>
      familiensammelnApi.updateParticipationTourCount(participationId, tourCount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familiensammeln'] });
      toast.success('Tour-Anzahl erfolgreich aktualisiert');
      setEditingParticipation(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren der Tour-Anzahl');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (!currentWeek) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Keine Woche gefunden</p>
      </div>
    );
  }

  // Erstelle Array von 6 Tagen (Montag-Samstag)
  const weekDays: Date[] = [];
  const startDate = new Date(currentWeek.weekStart);
  for (let i = 0; i < 6; i++) {
    const day = new Date(startDate);
    day.setDate(day.getDate() + i);
    weekDays.push(day);
  }

  // Gruppiere Teilnahmen nach Datum
  const participationsByDate = new Map<string, Participation[]>();
  currentWeek.participations.forEach((p) => {
    const dateKey = new Date(p.date).toISOString().split('T')[0];
    if (!participationsByDate.has(dateKey)) {
      participationsByDate.set(dateKey, []);
    }
    participationsByDate.get(dateKey)!.push(p);
  });

  const handleAddParticipation = (selectedUser: User) => {
    if (!selectedDay || !currentWeek) return;

    addParticipationMutation.mutate({
      weekId: currentWeek.id,
      userId: selectedUser.id,
      date: selectedDay.toISOString(),
    });
  };

  const handleDayClick = (day: Date) => {
    if (!isLeadership) return;
    setSelectedDay(day);
    setShowUserPicker(true);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-gold-500" />
            Familiensammeln
          </h1>
          <p className="text-gray-400 mt-1">
            Mindestens 4 Tage ODER 4 Touren erforderlich
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setShowStatistics(!showStatistics);
              setShowAllTimeStats(false);
            }}
            className="border-gold-500/50 text-gold-400 hover:bg-gold-900/20 hover:border-gold-500"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {showStatistics ? 'Wochenansicht' : 'Wochenstatistik'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowAllTimeStats(!showAllTimeStats);
              setShowStatistics(false);
            }}
            className="border-green-500/50 text-green-400 hover:bg-green-900/20 hover:border-green-500"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {showAllTimeStats ? 'Wochenansicht' : 'Gesamtstatistik'}
          </Button>
        </div>
      </div>

      {/* Statistik-Ansicht */}
      {showStatistics && statistics && (
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gold-400">Teilnahme-Statistik</CardTitle>
            <CardDescription className="text-gray-400">
              Woche vom {new Date(currentWeek.weekStart).toLocaleDateString('de-DE')} bis{' '}
              {new Date(currentWeek.weekEnd).toLocaleDateString('de-DE')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statistics.statistics.map((stat) => (
                <div
                  key={stat.user.id}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-600 to-gold-800 flex items-center justify-center">
                      <span className="text-white font-bold">
                        {stat.user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white">{stat.user.username}</p>
                      {stat.user.icFirstName && (
                        <p className="text-sm text-gray-400">
                          {stat.user.icFirstName} {stat.user.icLastName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Tage</p>
                      <p className="text-lg font-bold text-white">{stat.participationCount} / 4</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-400">Touren</p>
                      <p className="text-lg font-bold text-gold-400">{stat.totalTours}</p>
                    </div>

                    {stat.hasPassed ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Bestanden
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {stat.remainingDays} Tag(e) oder {stat.remainingTours} Tour(en)
                      </Badge>
                    )}

                    {stat.mustPayWeeklyDelivery && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        Wochenabgabe fällig
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gesamtstatistik & Leaderboard */}
      {showAllTimeStats && allTimeStats && (
        <div className="space-y-6">
          {/* Gesamtstatistik Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-gold-900/50 to-gold-800/50 border-gold-500/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-gold-400 text-sm font-medium">Gesamte Touren</p>
                  <p className="text-4xl font-bold text-white mt-2">{allTimeStats.totalStats.totalTours}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-green-400 text-sm font-medium">Teilnahmen (Tage)</p>
                  <p className="text-4xl font-bold text-white mt-2">{allTimeStats.totalStats.totalParticipations}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-blue-400 text-sm font-medium">Aktive User</p>
                  <p className="text-4xl font-bold text-white mt-2">{allTimeStats.totalStats.activeUsers}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-500/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-purple-400 text-sm font-medium">Gesamt Wochen</p>
                  <p className="text-4xl font-bold text-white mt-2">{allTimeStats.totalStats.totalWeeks}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-orange-500/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-orange-400 text-sm font-medium">Ø Touren/Tag</p>
                  <p className="text-4xl font-bold text-white mt-2">{allTimeStats.totalStats.averageToursPerParticipation}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-gold-400">🏆 Touren-Leaderboard</CardTitle>
              <CardDescription className="text-gray-400">
                Die fleißigsten Familienmitglieder aller Zeiten
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allTimeStats.leaderboard.map((entry, index) => (
                  <div
                    key={entry.user.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      index === 0
                        ? 'bg-gold-900/30 border-gold-500/50'
                        : index === 1
                        ? 'bg-gray-700/50 border-gray-500/50'
                        : index === 2
                        ? 'bg-orange-900/30 border-orange-500/50'
                        : 'bg-gray-800/50 border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Platzierung */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-600 to-gold-800 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </span>
                      </div>
                      {/* User Info */}
                      <div>
                        <p className="font-medium text-white">{entry.user.username}</p>
                        {entry.user.icFirstName && (
                          <p className="text-sm text-gray-400">
                            {entry.user.icFirstName} {entry.user.icLastName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Touren</p>
                        <p className="text-lg font-bold text-gold-400">{entry.totalTours}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Tage</p>
                        <p className="text-lg font-bold text-white">{entry.totalDays}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Wochen</p>
                        <p className="text-lg font-bold text-blue-400">{entry.weeksParticipated}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Ø Touren/Tag</p>
                        <p className="text-lg font-bold text-green-400">{entry.averageToursPerDay}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Wochenansicht */}
      {!showStatistics && !showAllTimeStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {weekDays.map((day, index) => {
            const dateKey = day.toISOString().split('T')[0];
            const participations = participationsByDate.get(dateKey) || [];
            const isToday = dateKey === new Date().toISOString().split('T')[0];

            return (
              <Card
                key={index}
                className={`bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 transition-all duration-200 ${
                  isLeadership ? 'hover:border-gold-500/50 cursor-pointer' : ''
                } ${isToday ? 'ring-2 ring-gold-500/50' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gold-500" />
                        {formatDate(day)}
                      </CardTitle>
                      {isToday && (
                        <Badge className="mt-2 bg-gold-500/20 text-gold-400 border-gold-500/30">
                          Heute
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-gold-400">{participations.length}</p>
                      <p className="text-sm text-gray-400">Teilnehmer</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {participations.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">Keine Teilnehmer</p>
                    ) : (
                      participations.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gold-500/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-600 to-gold-800 flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {p.user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white text-sm">{p.user.username}</p>
                              {p.user.icFirstName && (
                                <p className="text-xs text-gray-400">
                                  {p.user.icFirstName} {p.user.icLastName}
                                </p>
                              )}
                            </div>
                            {/* Tour Count Badge */}
                            <Badge 
                              className="bg-gold-500/20 text-gold-400 border-gold-500/30 cursor-pointer hover:bg-gold-500/30"
                              onClick={(e) => {
                                if (isLeadership) {
                                  e.stopPropagation();
                                  setEditingParticipation(p);
                                }
                              }}
                            >
                              {p.tourCount} {p.tourCount === 1 ? 'Tour' : 'Touren'}
                              {isLeadership && <Edit className="h-3 w-3 ml-1" />}
                            </Badge>
                          </div>

                          {isLeadership && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeParticipationMutation.mutate(p.id);
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 ml-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* User Picker Modal */}
      {showUserPicker && selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Teilnehmer hinzufügen</CardTitle>
              <CardDescription className="text-gray-400">
                Für {formatDate(selectedDay)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EnhancedPeoplePicker
                selectedUser={null}
                onUserSelect={handleAddParticipation}
                placeholder="User auswählen..."
              />
              <Button
                variant="outline"
                onClick={() => {
                  setShowUserPicker(false);
                  setSelectedDay(null);
                }}
                className="w-full border-gray-600 text-gray-300"
              >
                Abbrechen
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tour Count Modal */}
      {editingParticipation && (
        <TourCountModal
          isOpen={!!editingParticipation}
          onClose={() => setEditingParticipation(null)}
          currentTourCount={editingParticipation.tourCount}
          userName={editingParticipation.user.username}
          date={new Date(editingParticipation.date)}
          onSave={(newTourCount) =>
            updateTourCountMutation.mutateAsync({
              participationId: editingParticipation.id,
              tourCount: newTourCount,
            })
          }
        />
      )}
    </div>
  );
}

