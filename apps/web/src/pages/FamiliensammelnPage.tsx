import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Users, Plus, X, TrendingUp, Calendar, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { familiensammelnApi } from '../lib/api';
import EnhancedPeoplePicker from '../components/EnhancedPeoplePicker';
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
  remainingDays: number;
  mustPayWeeklyDelivery: boolean;
  hasPassed: boolean;
}

export default function FamiliensammelnPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);

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
            Mindestens 4 von 6 Tagen Teilnahme erforderlich
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowStatistics(!showStatistics)}
          className="border-gold-500/50 text-gold-400 hover:bg-gold-900/20 hover:border-gold-500"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          {showStatistics ? 'Wochenansicht' : 'Statistik anzeigen'}
        </Button>
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
                      <p className="text-sm text-gray-400">Teilnahmen</p>
                      <p className="text-lg font-bold text-white">{stat.participationCount} / 4</p>
                    </div>

                    {stat.hasPassed ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Bestanden
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {stat.remainingDays} Tag(e) fehlen
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

      {/* Wochenansicht */}
      {!showStatistics && (
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
                          className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-600 to-gold-800 flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {p.user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-white text-sm">{p.user.username}</p>
                              {p.user.icFirstName && (
                                <p className="text-xs text-gray-400">
                                  {p.user.icFirstName} {p.user.icLastName}
                                </p>
                              )}
                            </div>
                          </div>

                          {isLeadership && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeParticipationMutation.mutate(p.id);
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
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
    </div>
  );
}

