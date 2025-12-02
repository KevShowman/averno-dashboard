import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Users, Plus, X, TrendingUp, Calendar, CheckCircle, XCircle, AlertTriangle, Edit, Factory, Clock, Check, Trash2 } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { familiensammelnApi } from '../lib/api';
import { hasRole } from '../lib/utils';
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

interface Processor {
  id: string;
  weekId: string;
  userId: string;
  user: User;
  startedAt: string;
  finishesAt: string;
  capacity: number;
  processingRate: number;
  status: 'PROCESSING' | 'FINISHED' | 'COMPLETED';
  completedAt?: string;
  completedBy?: string;
  completedByUser?: User;
}

export default function FamiliensammelnPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showAllTimeStats, setShowAllTimeStats] = useState(false);
  const [editingParticipation, setEditingParticipation] = useState<Participation | null>(null);
  const [showProcessorPicker, setShowProcessorPicker] = useState(false);

  const isLeadership = hasRole(user, ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA']);

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

  // Query: Verarbeiter
  const { data: processors = [] } = useQuery<Processor[]>({
    queryKey: ['familiensammeln', 'processors', currentWeek?.id],
    queryFn: () => familiensammelnApi.getProcessors(currentWeek!.id),
    enabled: !!currentWeek?.id,
    refetchInterval: 10000, // Alle 10 Sekunden aktualisieren
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

  // Mutation: Verarbeiter starten
  const startProcessorMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      familiensammelnApi.startProcessor(currentWeek!.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familiensammeln', 'processors'] });
      toast.success('Verarbeiter erfolgreich gestartet');
      setShowProcessorPicker(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Starten des Verarbeiters');
    },
  });

  // Mutation: Verarbeiter abschließen
  const completeProcessorMutation = useMutation({
    mutationFn: (processorId: string) =>
      familiensammelnApi.completeProcessor(processorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familiensammeln', 'processors'] });
      toast.success('Entnahme erfolgreich bestätigt');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Bestätigen der Entnahme');
    },
  });

  // Mutation: Verarbeiter löschen
  const deleteProcessorMutation = useMutation({
    mutationFn: (processorId: string) =>
      familiensammelnApi.deleteProcessor(processorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familiensammeln', 'processors'] });
      toast.success('Verarbeiter erfolgreich gelöscht');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen des Verarbeiters');
    },
  });

  // Helper: Berechnet verbleibende Zeit bis zur Fertigstellung
  const getRemainingTime = (finishesAt: string) => {
    const now = new Date().getTime();
    const finish = new Date(finishesAt).getTime();
    const remaining = finish - now;

    if (remaining <= 0) return { finished: true, text: 'Fertig!', hours: 0, minutes: 0 };

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    return {
      finished: false,
      text: `${hours}h ${minutes}min`,
      hours,
      minutes,
    };
  };

  // Helper: Formatiert Name
  const getDisplayName = (user: User) => {
    if (user.icFirstName && user.icLastName) {
      return `${user.icFirstName} ${user.icLastName}`;
    }
    return user.username;
  };

  const handleStartProcessor = (selectedUser: User | null) => {
    if (!selectedUser) return;
    startProcessorMutation.mutate({ userId: selectedUser.id });
  };

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

  const handleAddParticipation = (selectedUser: User | null) => {
    if (!selectedUser || !selectedDay || !currentWeek) return;

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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/30 via-yellow-900/20 to-orange-900/30 border border-amber-500/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl" />
          
          <div className="relative p-6 border-b border-amber-500/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/30">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Wochenstatistik</h2>
                <p className="text-amber-200/60 text-sm">
                  {new Date(currentWeek.weekStart).toLocaleDateString('de-DE')} – {new Date(currentWeek.weekEnd).toLocaleDateString('de-DE')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="relative p-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {statistics.statistics.filter(s => s.hasPassed).length}
                    </div>
                    <div className="text-xs text-green-300/60 uppercase tracking-wide">Bestanden</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 rounded-xl p-4 border border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">
                      {statistics.statistics.filter(s => !s.hasPassed).length}
                    </div>
                    <div className="text-xs text-red-300/60 uppercase tracking-wide">Offen</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 rounded-xl p-4 border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-400">
                      {statistics.statistics.reduce((sum, s) => sum + s.totalTours, 0)}
                    </div>
                    <div className="text-xs text-amber-300/60 uppercase tracking-wide">Touren</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 rounded-xl p-4 border border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Calendar className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {statistics.statistics.filter(s => s.mustPayWeeklyDelivery).length}
                    </div>
                    <div className="text-xs text-yellow-300/60 uppercase tracking-wide">Abgabe fällig</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* User List */}
            <div className="space-y-3">
              {statistics.statistics.map((stat) => (
                <div
                  key={stat.user.id}
                  className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${
                    stat.hasPassed 
                      ? 'bg-green-900/10 border-green-500/20 hover:border-green-500/40' 
                      : 'bg-gray-800/30 border-gray-700/50 hover:border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      stat.hasPassed 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                        : 'bg-gradient-to-br from-amber-500 to-orange-600'
                    }`}>
                      <span className="text-white font-bold text-lg">
                        {stat.user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{stat.user.username}</p>
                      {stat.user.icFirstName && (
                        <p className="text-sm text-gray-400">
                          {stat.user.icFirstName} {stat.user.icLastName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Progress Indicator */}
                    <div className="hidden md:flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            stat.hasPassed ? 'bg-green-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, (stat.participationCount / 4) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400 w-12">{stat.participationCount}/4</span>
                    </div>
                    
                    <div className="text-center min-w-[60px]">
                      <p className="text-2xl font-bold text-amber-400">{stat.totalTours}</p>
                      <p className="text-xs text-gray-500">Touren</p>
                    </div>

                    {stat.hasPassed ? (
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30 px-3 py-1.5">
                        <CheckCircle className="h-4 w-4 mr-1.5" />
                        Bestanden
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-300 border-red-500/30 px-3 py-1.5">
                        <AlertTriangle className="h-4 w-4 mr-1.5" />
                        {stat.remainingDays}T / {stat.remainingTours}T fehlt
                      </Badge>
                    )}

                    {stat.mustPayWeeklyDelivery && (
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 px-3 py-1.5">
                        💰 Fällig
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gesamtstatistik & Leaderboard */}
      {showAllTimeStats && allTimeStats && (
        <div className="space-y-6">
          {/* Modern Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/40 via-green-900/30 to-teal-900/40 border border-emerald-500/30">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl" />
            
            <div className="relative p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/30">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Gesamtstatistik</h2>
                  <p className="text-emerald-200/60 text-sm">Alle Zeiten • Komplettes Tracking</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-amber-900/50 to-amber-800/30 rounded-xl p-4 border border-amber-500/30 text-center">
                  <div className="p-2 bg-amber-500/20 rounded-lg w-fit mx-auto mb-2">
                    <TrendingUp className="h-5 w-5 text-amber-400" />
                  </div>
                  <p className="text-3xl font-bold text-amber-400">{allTimeStats.totalStats.totalTours}</p>
                  <p className="text-xs text-amber-300/60 uppercase tracking-wide mt-1">Touren Gesamt</p>
                </div>
                <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-xl p-4 border border-green-500/30 text-center">
                  <div className="p-2 bg-green-500/20 rounded-lg w-fit mx-auto mb-2">
                    <Calendar className="h-5 w-5 text-green-400" />
                  </div>
                  <p className="text-3xl font-bold text-green-400">{allTimeStats.totalStats.totalParticipations}</p>
                  <p className="text-xs text-green-300/60 uppercase tracking-wide mt-1">Teilnahmen</p>
                </div>
                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-xl p-4 border border-blue-500/30 text-center">
                  <div className="p-2 bg-blue-500/20 rounded-lg w-fit mx-auto mb-2">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <p className="text-3xl font-bold text-blue-400">{allTimeStats.totalStats.activeUsers}</p>
                  <p className="text-xs text-blue-300/60 uppercase tracking-wide mt-1">Aktive User</p>
                </div>
                <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-xl p-4 border border-purple-500/30 text-center">
                  <div className="p-2 bg-purple-500/20 rounded-lg w-fit mx-auto mb-2">
                    <Calendar className="h-5 w-5 text-purple-400" />
                  </div>
                  <p className="text-3xl font-bold text-purple-400">{allTimeStats.totalStats.totalWeeks}</p>
                  <p className="text-xs text-purple-300/60 uppercase tracking-wide mt-1">Wochen</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 rounded-xl p-4 border border-cyan-500/30 text-center">
                  <div className="p-2 bg-cyan-500/20 rounded-lg w-fit mx-auto mb-2">
                    <TrendingUp className="h-5 w-5 text-cyan-400" />
                  </div>
                  <p className="text-3xl font-bold text-cyan-400">{allTimeStats.totalStats.averageToursPerParticipation}</p>
                  <p className="text-xs text-cyan-300/60 uppercase tracking-wide mt-1">Ø Touren/Tag</p>
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/30 via-yellow-900/20 to-orange-900/30 border border-amber-500/30">
            <div className="absolute top-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
            
            <div className="relative p-6 border-b border-amber-500/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl shadow-lg shadow-amber-500/30">
                  <span className="text-2xl">🏆</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Touren-Leaderboard</h2>
                  <p className="text-amber-200/60 text-sm">Die fleißigsten Familienmitglieder aller Zeiten</p>
                </div>
              </div>
            </div>
            
            <div className="relative p-6">
              <div className="space-y-3">
                {allTimeStats.leaderboard.map((entry, index) => {
                  const isTop3 = index < 3;
                  const medals = ['🥇', '🥈', '🥉'];
                  const bgColors = [
                    'bg-gradient-to-r from-amber-900/40 to-yellow-900/30 border-amber-500/50',
                    'bg-gradient-to-r from-gray-700/40 to-gray-600/30 border-gray-400/50',
                    'bg-gradient-to-r from-orange-900/40 to-amber-900/30 border-orange-500/50'
                  ];
                  
                  return (
                    <div
                      key={entry.user.id}
                      className={`group flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01] ${
                        isTop3 ? bgColors[index] : 'bg-gray-800/30 border-gray-700/50 hover:border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isTop3 
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30'
                            : 'bg-gray-700'
                        }`}>
                          <span className="text-xl font-bold text-white">
                            {isTop3 ? medals[index] : `#${index + 1}`}
                          </span>
                        </div>
                        
                        {/* User */}
                        <div>
                          <p className="font-semibold text-white text-lg">{entry.user.username}</p>
                          {entry.user.icFirstName && (
                            <p className="text-sm text-gray-400">
                              {entry.user.icFirstName} {entry.user.icLastName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 md:gap-8">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-amber-400">{entry.totalTours}</p>
                          <p className="text-xs text-gray-500 uppercase">Touren</p>
                        </div>
                        <div className="hidden md:block text-center">
                          <p className="text-xl font-bold text-white">{entry.totalDays}</p>
                          <p className="text-xs text-gray-500 uppercase">Tage</p>
                        </div>
                        <div className="hidden md:block text-center">
                          <p className="text-xl font-bold text-blue-400">{entry.weeksParticipated}</p>
                          <p className="text-xs text-gray-500 uppercase">Wochen</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-green-400">{entry.averageToursPerDay}</p>
                          <p className="text-xs text-gray-500 uppercase">Ø/Tag</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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

      {/* Verarbeiter Tracking */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-teal-500/20 mt-6">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-emerald-500/5" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl" />
        
        <div className="relative p-6 border-b border-teal-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl shadow-lg shadow-teal-500/30">
                <Factory className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Verarbeiter-Tracking</h2>
                <p className="text-teal-200/60 text-sm">
                  Kapazität: 3000 Stück • Verarbeitung: 10/min → ~5 Stunden
                </p>
              </div>
            </div>
            {isLeadership && (
              <Button
                onClick={() => setShowProcessorPicker(true)}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-500/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Verarbeiter starten
              </Button>
            )}
          </div>
        </div>
        
        <div className="relative p-6">
          {processors.length === 0 ? (
            <div className="text-center py-8">
              <Factory className="h-12 w-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">Keine aktiven Verarbeiter</p>
              <p className="text-gray-500 text-sm mt-1">Starte einen Verarbeiter um die Produktion zu beginnen</p>
            </div>
          ) : (
            <div className="space-y-4">
              {processors
                .filter(p => p.status !== 'COMPLETED')
                .map((processor) => {
                  const timeInfo = getRemainingTime(processor.finishesAt);
                  const isFinished = processor.status === 'FINISHED' || timeInfo.finished;
                  const progress = Math.min(100, ((new Date().getTime() - new Date(processor.startedAt).getTime()) /
                    (new Date(processor.finishesAt).getTime() - new Date(processor.startedAt).getTime())) * 100);

                  return (
                    <div
                      key={processor.id}
                      className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
                        isFinished
                          ? 'border-green-500/50 bg-green-900/20'
                          : 'border-gray-700 bg-gray-800/50 hover:border-teal-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`relative flex h-12 w-12 items-center justify-center rounded-xl ${
                            isFinished ? 'bg-green-500/20' : 'bg-teal-500/20'
                          }`}>
                            {isFinished ? (
                              <CheckCircle className="h-6 w-6 text-green-400" />
                            ) : (
                              <>
                                <Clock className="h-6 w-6 text-teal-400" />
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-400 rounded-full animate-pulse" />
                              </>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-lg">
                              {getDisplayName(processor.user)}
                            </p>
                            <p className="text-sm text-gray-400">
                              Gestartet: {new Date(processor.startedAt).toLocaleString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })} Uhr • {processor.capacity} Stück
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge className={
                            isFinished
                              ? 'bg-green-500/20 text-green-300 border-green-500/30 px-3 py-1'
                              : 'bg-teal-500/20 text-teal-300 border-teal-500/30 px-3 py-1'
                          }>
                            {isFinished ? (
                              <span className="flex items-center gap-1.5">
                                <Check className="h-4 w-4" />
                                Fertig
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                {timeInfo.text}
                              </span>
                            )}
                          </Badge>

                          {isLeadership && (
                            <div className="flex gap-2">
                              {isFinished && (
                                <Button
                                  onClick={() => completeProcessorMutation.mutate(processor.id)}
                                  size="sm"
                                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Entnahme bestätigen
                                </Button>
                              )}
                              <Button
                                onClick={() => {
                                  if (confirm(`Verarbeiter von ${getDisplayName(processor.user)} wirklich löschen?`)) {
                                    deleteProcessorMutation.mutate(processor.id);
                                  }
                                }}
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {!isFinished && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                            <span>Fortschritt</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-1000 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Processor Picker Modal */}
      {showProcessorPicker && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md relative">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-emerald-600/20 blur-xl rounded-2xl" />
            
            <Card className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-emerald-500/30 shadow-2xl rounded-2xl overflow-hidden">
              {/* Header mit Gradient */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/50 via-teal-800/30 to-transparent" />
                <CardHeader className="relative pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/30">
                      <Factory className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-white">
                        Verarbeiter starten
                      </CardTitle>
                      <CardDescription className="text-emerald-200/70 mt-1">
                        Wähle ein Mitglied aus
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </div>

              <CardContent className="pt-2 pb-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-400" />
                    Mitglied auswählen
                  </label>
                  <EnhancedPeoplePicker
                    selectedUser={null}
                    onUserSelect={handleStartProcessor}
                    placeholder="Name eingeben..."
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowProcessorPicker(false)}
                  className="w-full h-12 border-gray-600 hover:bg-gray-800 hover:border-gray-500 text-gray-300"
                >
                  Abbrechen
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* User Picker Modal */}
      {showUserPicker && selectedDay && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md relative">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-indigo-500/20 to-blue-600/20 blur-xl rounded-2xl" />
            
            <Card className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-blue-500/30 shadow-2xl rounded-2xl overflow-hidden">
              {/* Header mit Gradient */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/50 via-indigo-800/30 to-transparent" />
                <CardHeader className="relative pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                      <Plus className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-white">
                        Teilnehmer hinzufügen
                      </CardTitle>
                      <CardDescription className="text-blue-200/70 mt-1 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(selectedDay)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </div>

              <CardContent className="pt-2 pb-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-400" />
                    Mitglied auswählen
                  </label>
                  <EnhancedPeoplePicker
                    selectedUser={null}
                    onUserSelect={handleAddParticipation}
                    placeholder="Name eingeben..."
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUserPicker(false);
                    setSelectedDay(null);
                  }}
                  className="w-full h-12 border-gray-600 hover:bg-gray-800 hover:border-gray-500 text-gray-300"
                >
                  Abbrechen
                </Button>
              </CardContent>
            </Card>
          </div>
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

