import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { abmeldungApi } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { CalendarDays, Plus, Trash2, Calendar, User, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/auth';

interface Abmeldung {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    icFirstName: string | null;
    icLastName: string | null;
  };
  startDate: string;
  endDate: string;
  reason: string | null;
  createdAt: string;
}

export default function AbmeldungenPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isRangeMode, setIsRangeMode] = useState(true);
  
  // Form State
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });

  const isLeadership = user && ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'].includes(user.role);

  // Queries
  const { data: abmeldungen = [], isLoading } = useQuery({
    queryKey: ['abmeldungen', isLeadership ? 'all' : 'my'],
    queryFn: () => isLeadership ? abmeldungApi.getAll() : abmeldungApi.getMy(),
  });

  const { data: currentAbmeldungen = [] } = useQuery({
    queryKey: ['abmeldungen', 'current'],
    queryFn: () => abmeldungApi.getCurrent(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: abmeldungApi.create,
    onSuccess: () => {
      toast.success('Abmeldung erfolgreich erstellt');
      queryClient.invalidateQueries({ queryKey: ['abmeldungen'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-delivery'] });
      queryClient.invalidateQueries({ queryKey: ['aufstellung'] });
      setShowCreateModal(false);
      setFormData({ startDate: '', endDate: '', reason: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen der Abmeldung');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: abmeldungApi.delete,
    onSuccess: () => {
      toast.success('Abmeldung gelöscht');
      queryClient.invalidateQueries({ queryKey: ['abmeldungen'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.startDate) {
      toast.error('Bitte Start-Datum auswählen');
      return;
    }

    const endDate = isRangeMode && formData.endDate ? formData.endDate : formData.startDate;
    
    createMutation.mutate({
      startDate: formData.startDate,
      endDate: endDate,
      reason: formData.reason || undefined,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Abmeldung wirklich löschen?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateStr: string) => {
    // Parse as UTC to avoid timezone shifts
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    });
  };

  const formatDateRange = (start: string, end: string) => {
    // Parse dates - extract only the date part
    const startDateStr = start.split('T')[0];
    const endDateStr = end.split('T')[0];
    
    // Compare date strings directly
    if (startDateStr === endDateStr) {
      return formatDate(start);
    }
    
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const getDaysCount = (start: string, end: string) => {
    // Parse dates - extract only the date part and use UTC to avoid timezone shifts
    const startDateStr = start.split('T')[0];
    const endDateStr = end.split('T')[0];
    
    const startDate = new Date(startDateStr + 'T00:00:00Z');
    const endDate = new Date(endDateStr + 'T00:00:00Z');
    
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return days;
  };

  const isActive = (start: string, end: string) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    return now >= startDate && now <= endDate;
  };

  const isFuture = (start: string) => {
    return new Date(start) > new Date();
  };

  const canDelete = (abmeldung: Abmeldung) => {
    return isLeadership || abmeldung.userId === user?.id;
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
            <CalendarDays className="h-8 w-8 text-gold-500" />
            Abmeldungen
          </h1>
          <p className="text-gray-400 mt-1">
            Verwalte deine Abwesenheiten für Aufstellungen und Wochenabgaben
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-gold-600 to-gold-700 hover:from-gold-700 hover:to-gold-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Neue Abmeldung
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-900/20 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-200 space-y-1">
              <p><strong>Automatische Anwendung:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Bei Aufstellungen wirst du automatisch als "Kommt nicht" markiert</li>
                <li>Wochenabgaben werden als "Abgemeldet" markiert wenn du über 2 Tage abgemeldet bist</li>
                <li>Abmeldungen werden auch retrospektiv angewendet auf bestehende Aufstellungen</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aktuelle Abmeldungen */}
      {currentAbmeldungen.length > 0 && (
        <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Aktuell abgemeldet ({currentAbmeldungen.length})
            </CardTitle>
            <CardDescription className="text-green-300/70">
              Diese Abmeldungen sind gerade aktiv
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentAbmeldungen.map((abmeldung: Abmeldung) => (
                <div
                  key={abmeldung.id}
                  className="flex items-center justify-between p-3 bg-green-900/10 border border-green-500/20 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <User className="h-4 w-4 text-green-400" />
                    <div>
                      <div className="font-medium text-white">
                        {abmeldung.user.icFirstName && abmeldung.user.icLastName
                          ? `${abmeldung.user.icFirstName} ${abmeldung.user.icLastName}`
                          : abmeldung.user.username}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatDateRange(abmeldung.startDate, abmeldung.endDate)} 
                        <span className="mx-2">•</span>
                        {getDaysCount(abmeldung.startDate, abmeldung.endDate)} Tag(e)
                        {abmeldung.reason && (
                          <>
                            <span className="mx-2">•</span>
                            {abmeldung.reason}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {canDelete(abmeldung) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(abmeldung.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alle Abmeldungen */}
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white">
            {isLeadership ? 'Alle Abmeldungen' : 'Meine Abmeldungen'} ({abmeldungen.length})
          </CardTitle>
          <CardDescription>
            Übersicht aller {isLeadership ? '' : 'deiner '}Abwesenheiten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {abmeldungen.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Keine Abmeldungen vorhanden</p>
            </div>
          ) : (
            <div className="space-y-2">
              {abmeldungen.map((abmeldung: Abmeldung) => {
                const active = isActive(abmeldung.startDate, abmeldung.endDate);
                const future = isFuture(abmeldung.startDate);
                
                return (
                  <div
                    key={abmeldung.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      active
                        ? 'bg-green-900/10 border-green-500/30'
                        : future
                        ? 'bg-blue-900/10 border-blue-500/30'
                        : 'bg-gray-800/30 border-gray-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${
                        active ? 'bg-green-900/30' : future ? 'bg-blue-900/30' : 'bg-gray-800/50'
                      }`}>
                        <Calendar className={`h-5 w-5 ${
                          active ? 'text-green-400' : future ? 'text-blue-400' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {isLeadership && (
                            <span className="font-medium text-white">
                              {abmeldung.user.icFirstName && abmeldung.user.icLastName
                                ? `${abmeldung.user.icFirstName} ${abmeldung.user.icLastName}`
                                : abmeldung.user.username}
                            </span>
                          )}
                          {active && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-900/50 text-green-300">
                              Aktiv
                            </span>
                          )}
                          {future && !active && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-900/50 text-blue-300">
                              Geplant
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {formatDateRange(abmeldung.startDate, abmeldung.endDate)} 
                          <span className="mx-2">•</span>
                          {getDaysCount(abmeldung.startDate, abmeldung.endDate)} Tag(e)
                        </div>
                        {abmeldung.reason && (
                          <div className="text-sm text-gray-300 mt-1 italic">
                            "{abmeldung.reason}"
                          </div>
                        )}
                      </div>
                    </div>
                    {canDelete(abmeldung) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(abmeldung.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md relative">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 via-yellow-500/20 to-amber-600/20 blur-xl rounded-2xl" />
            
            <Card className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-amber-500/30 shadow-2xl rounded-2xl overflow-hidden">
              {/* Header mit Gradient */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-900/50 via-yellow-800/30 to-transparent" />
                <CardHeader className="relative pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-amber-600 to-yellow-600 rounded-xl shadow-lg shadow-amber-500/30">
                      <CalendarDays className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-white">
                        Neue Abmeldung
                      </CardTitle>
                      <CardDescription className="text-amber-200/70 mt-1">
                        Zeitraum der Abwesenheit eintragen
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </div>

              <CardContent className="pt-2 pb-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Mode Toggle */}
                  <div className="flex gap-2 p-1 bg-gray-800/50 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setIsRangeMode(false)}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        !isRangeMode 
                          ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      <Calendar className="h-4 w-4" />
                      Einzelner Tag
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRangeMode(true)}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        isRangeMode 
                          ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      <CalendarDays className="h-4 w-4" />
                      Zeitraum
                    </button>
                  </div>

                  {/* Datum Felder */}
                  <div className={`grid gap-4 ${isRangeMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-amber-400" />
                        {isRangeMode ? 'Von' : 'Datum'}
                      </label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="bg-gray-800/50 border-gray-700 focus:border-amber-500 focus:ring-amber-500/20 text-white h-11 [color-scheme:dark]"
                        required
                      />
                    </div>

                    {isRangeMode && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-amber-400" />
                          Bis
                        </label>
                        <Input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          min={formData.startDate}
                          className="bg-gray-800/50 border-gray-700 focus:border-amber-500 focus:ring-amber-500/20 text-white h-11 [color-scheme:dark]"
                          required={isRangeMode}
                        />
                      </div>
                    )}
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                      Grund <span className="text-gray-500 font-normal">(optional)</span>
                    </label>
                    <Textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="z.B. Urlaub, Krankheit, private Gründe..."
                      rows={3}
                      className="!bg-gray-800/50 border-gray-700 focus:border-amber-500 focus:ring-amber-500/20 resize-none text-white placeholder:text-gray-500"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateModal(false);
                        setFormData({ startDate: '', endDate: '', reason: '' });
                      }}
                      className="flex-1 h-12 border-gray-600 hover:bg-gray-800 hover:border-gray-500 text-gray-300"
                      disabled={createMutation.isPending}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-12 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-semibold shadow-lg shadow-amber-500/25 transition-all duration-200 hover:shadow-amber-500/40"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Erstelle...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Plus className="h-5 w-5" />
                          Abmeldung erstellen
                        </span>
                      )}
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

