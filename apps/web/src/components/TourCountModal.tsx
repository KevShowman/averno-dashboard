import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Minus, Plus, X, Car, Calendar } from 'lucide-react';

interface TourCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTourCount: number;
  userName: string;
  date: Date;
  onSave: (newTourCount: number) => Promise<void>;
}

export function TourCountModal({
  isOpen,
  onClose,
  currentTourCount,
  userName,
  date,
  onSave,
}: TourCountModalProps) {
  const [tourCount, setTourCount] = useState(currentTourCount);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTourCount(currentTourCount);
  }, [currentTourCount]);

  const handleIncrement = () => {
    setTourCount((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (tourCount > 1) {
      setTourCount((prev) => prev - 1);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(tourCount);
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setTourCount(currentTourCount);
    onClose();
  };

  const dateStr = date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md relative">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-emerald-600/20 blur-xl rounded-2xl" />
        
        <Card className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-emerald-500/30 shadow-2xl rounded-2xl overflow-hidden">
          {/* Header mit Gradient */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/50 via-teal-800/30 to-transparent" />
            <CardHeader className="relative pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/30">
                    <Car className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-white">
                      Touren bearbeiten
                    </CardTitle>
                    <CardDescription className="text-emerald-200/70 mt-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {dateStr}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
          </div>

          <CardContent className="pt-2 pb-6 space-y-6">
            {/* User Info */}
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <p className="text-zinc-400 text-sm">Touren für</p>
              <p className="text-white font-semibold text-lg mt-1">{userName}</p>
            </div>

            {/* Tour Counter */}
            <div className="flex items-center justify-center gap-8 py-6">
              {/* Minus Button */}
              <Button
                onClick={handleDecrement}
                disabled={tourCount <= 1 || isSaving}
                className="h-16 w-16 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-zinc-700 disabled:to-zinc-800 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/25 disabled:shadow-none"
                variant="default"
              >
                <Minus className="h-8 w-8 text-white" />
              </Button>

              {/* Tour Count Display */}
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 tabular-nums">
                  {tourCount}
                </div>
                <div className="text-sm text-zinc-400 mt-2 font-medium">
                  {tourCount === 1 ? 'Tour' : 'Touren'}
                </div>
              </div>

              {/* Plus Button */}
              <Button
                onClick={handleIncrement}
                disabled={isSaving}
                className="h-16 w-16 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-zinc-700 disabled:to-zinc-800 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/25 disabled:shadow-none"
                variant="default"
              >
                <Plus className="h-8 w-8 text-white" />
              </Button>
            </div>

            {/* Change Indicator */}
            {tourCount !== currentTourCount && (
              <div className="text-center text-sm">
                <span className="text-zinc-400">Änderung: </span>
                <span className={tourCount > currentTourCount ? 'text-green-400' : 'text-red-400'}>
                  {tourCount > currentTourCount ? '+' : ''}{tourCount - currentTourCount} Tour{Math.abs(tourCount - currentTourCount) !== 1 ? 'en' : ''}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleClose}
                disabled={isSaving}
                variant="outline"
                className="flex-1 h-12 border-zinc-600 hover:bg-zinc-800 hover:border-zinc-500 text-zinc-300"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || tourCount === currentTourCount}
                className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Speichere...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Speichern
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
