import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Minus, Plus } from 'lucide-react';

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
    setTourCount(currentTourCount); // Reset auf Original
    onClose();
  };

  const dateStr = date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-gold-500/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gold-400">
            Touren bearbeiten
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Wie viele Touren hat <span className="font-semibold text-white">{userName}</span> am{' '}
            <span className="font-semibold text-white">{dateStr}</span> gefahren?
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-6 py-8">
          {/* Minus Button */}
          <Button
            onClick={handleDecrement}
            disabled={tourCount <= 1 || isSaving}
            className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all"
            variant="default"
          >
            <Minus className="h-8 w-8 text-white" />
          </Button>

          {/* Tour Count Display */}
          <div className="flex flex-col items-center">
            <div className="text-6xl font-bold text-gold-400 tabular-nums">
              {tourCount}
            </div>
            <div className="text-sm text-gray-400 mt-2">
              {tourCount === 1 ? 'Tour' : 'Touren'}
            </div>
          </div>

          {/* Plus Button */}
          <Button
            onClick={handleIncrement}
            disabled={isSaving}
            className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all"
            variant="default"
          >
            <Plus className="h-8 w-8 text-white" />
          </Button>
        </div>

        <div className="flex gap-3 mt-4">
          <Button
            onClick={handleClose}
            disabled={isSaving}
            variant="outline"
            className="flex-1 border-gray-600 hover:bg-gray-800 text-gray-300"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || tourCount === currentTourCount}
            className="flex-1 bg-gold-600 hover:bg-gold-700 text-black font-semibold disabled:bg-gray-700 disabled:text-gray-400"
          >
            {isSaving ? 'Speichere...' : 'Speichern'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

