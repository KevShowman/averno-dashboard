import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Calendar, Clock, MapPin, X, Users, Zap, Target, Skull, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, setHours, setMinutes } from 'date-fns'
import { de } from 'date-fns/locale'

interface CreateAufstellungModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: {
    date: string
    time: string
    reason: string
    location?: string
  }) => void
  isLoading?: boolean
  variant?: 'normal' | 'sicario'
}

export default function CreateAufstellungModal({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
  variant = 'normal',
}: CreateAufstellungModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('20:00')
  const [reason, setReason] = useState<string>('')
  const [location, setLocation] = useState<string>('')
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [showCalendar, setShowCalendar] = useState(false)

  const isSicario = variant === 'sicario'
  
  // Theme colors based on variant
  const theme = isSicario ? {
    gradient: 'from-red-600 to-rose-600',
    border: 'border-red-500/30',
    glow: 'from-red-600/20 via-rose-500/20 to-red-600/20',
    headerBg: 'from-red-900/50 via-rose-800/30',
    icon: 'text-red-400',
    shadow: 'shadow-red-500/25 hover:shadow-red-500/40',
    text: 'text-red-200/70',
    ring: 'focus:ring-red-500/20 focus:border-red-500',
    buttonGradient: 'from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500',
  } : {
    gradient: 'from-gold-600 to-amber-600',
    border: 'border-gold-500/30',
    glow: 'from-gold-600/20 via-amber-500/20 to-gold-600/20',
    headerBg: 'from-amber-900/50 via-yellow-800/30',
    icon: 'text-gold-400',
    shadow: 'shadow-gold-500/25 hover:shadow-gold-500/40',
    text: 'text-amber-200/70',
    ring: 'focus:ring-gold-500/20 focus:border-gold-500',
    buttonGradient: 'from-gold-600 to-amber-600 hover:from-gold-500 hover:to-amber-500',
  }

  const handleCreate = () => {
    if (selectedDate && selectedTime && reason.trim()) {
      onCreate({
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        reason: reason.trim(),
        location: location.trim() || undefined,
      })
      // Reset form
      setSelectedDate(null)
      setSelectedTime('20:00')
      setReason('')
      setLocation('')
      setShowCalendar(false)
    }
  }

  const handleClose = () => {
    onClose()
    setSelectedDate(null)
    setSelectedTime('20:00')
    setReason('')
    setLocation('')
    setShowCalendar(false)
  }

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Pad the start with empty days
  const startDayOfWeek = monthStart.getDay()
  const paddedDays = Array(startDayOfWeek === 0 ? 6 : startDayOfWeek - 1).fill(null).concat(daysInMonth)

  const timeOptions = [
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', 
    '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg relative">
        {/* Glow Effect */}
        <div className={`absolute inset-0 bg-gradient-to-r ${theme.glow} blur-xl rounded-2xl`} />
        
        <Card className={`relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 ${theme.border} shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto`}>
          {/* Header mit Gradient */}
          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-r ${theme.headerBg} to-transparent`} />
            <CardHeader className="relative pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 bg-gradient-to-br ${theme.gradient} rounded-xl shadow-lg ${theme.shadow.split(' ')[0]}`}>
                    {isSicario ? <Target className="h-7 w-7 text-white" /> : <Users className="h-7 w-7 text-white" />}
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-white">
                      {isSicario ? 'Sicario Aufstellung' : 'Neue Aufstellung'}
                    </CardTitle>
                    <CardDescription className={theme.text}>
                      {isSicario ? 'Geheimer Einsatz planen' : 'Familien-Event erstellen'}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
          </div>
          
          <CardContent className="pt-2 pb-6 space-y-5">
            {/* Date Picker */}
            <div className="space-y-3">
              <label className={`text-sm font-medium text-gray-300 flex items-center gap-2`}>
                <Calendar className={`h-4 w-4 ${theme.icon}`} />
                Datum
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`w-full h-11 px-4 bg-gray-800/50 border border-gray-700 rounded-xl text-left text-white ${theme.ring} transition-all flex items-center justify-between`}
                >
                  <span className={selectedDate ? 'text-white' : 'text-gray-500'}>
                    {selectedDate 
                      ? format(selectedDate, 'EEEE, dd. MMMM yyyy', { locale: de })
                      : 'Datum auswählen...'
                    }
                  </span>
                  <Calendar className="h-4 w-4 text-gray-400" />
                </button>
                
                {/* Custom Calendar Dropdown */}
                {showCalendar && (
                  <div className="absolute z-10 mt-2 w-full bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="h-8 w-8 text-gray-400 hover:text-white"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-white font-medium">
                        {format(currentMonth, 'MMMM yyyy', { locale: de })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="h-8 w-8 text-gray-400 hover:text-white"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                        <div key={day} className="text-center text-xs text-gray-500 py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {paddedDays.map((day, index) => {
                        if (!day) {
                          return <div key={`empty-${index}`} className="h-9" />
                        }
                        
                        const isSelected = selectedDate && isSameDay(day, selectedDate)
                        const isCurrentMonth = isSameMonth(day, currentMonth)
                        const isCurrentDay = isToday(day)
                        
                        return (
                          <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() => {
                              setSelectedDate(day)
                              setShowCalendar(false)
                            }}
                            className={`h-9 rounded-lg text-sm font-medium transition-all ${
                              isSelected
                                ? `bg-gradient-to-r ${theme.gradient} text-white shadow-lg`
                                : isCurrentDay
                                  ? 'bg-gray-700 text-white'
                                  : isCurrentMonth
                                    ? 'text-gray-300 hover:bg-gray-700'
                                    : 'text-gray-600'
                            }`}
                          >
                            {format(day, 'd')}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Time Picker */}
            <div className="space-y-3">
              <label className={`text-sm font-medium text-gray-300 flex items-center gap-2`}>
                <Clock className={`h-4 w-4 ${theme.icon}`} />
                Uhrzeit
              </label>
              <div className="grid grid-cols-4 gap-2">
                {timeOptions.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                      selectedTime === time
                        ? `bg-gradient-to-r ${theme.gradient} text-white shadow-lg`
                        : 'bg-gray-800/50 border border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-800'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Location (optional, especially for Sicario) */}
            {isSicario && (
              <div className="space-y-3">
                <label className={`text-sm font-medium text-gray-300 flex items-center gap-2`}>
                  <MapPin className={`h-4 w-4 ${theme.icon}`} />
                  Treffpunkt <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="z.B. Casa, Hafen, Flughafen..."
                  className={`bg-gray-800/50 border-gray-700 ${theme.ring} text-white h-11 placeholder:text-gray-500`}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Reason */}
            <div className="space-y-3">
              <label className={`text-sm font-medium text-gray-300 flex items-center gap-2`}>
                {isSicario ? <Skull className={`h-4 w-4 ${theme.icon}`} /> : <Zap className={`h-4 w-4 ${theme.icon}`} />}
                {isSicario ? 'Mission / Auftrag' : 'Grund / Anlass'}
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isSicario 
                  ? 'z.B. Zielperson ausschalten, Lieferung beschützen...' 
                  : 'z.B. Casa Meeting, Routenplanung, Geschäftsabwicklung...'
                }
                rows={3}
                className={`!bg-gray-800/50 border-gray-700 ${theme.ring} resize-none text-white placeholder:text-gray-500`}
                disabled={isLoading}
              />
            </div>

            {/* Info Banner */}
            <div className={`bg-gradient-to-r ${isSicario ? 'from-red-900/30 to-rose-900/20 border-red-500/30' : 'from-amber-900/30 to-yellow-900/20 border-amber-500/30'} border p-4 rounded-xl`}>
              <div className="flex items-start gap-3">
                <Zap className={`h-5 w-5 ${theme.icon} flex-shrink-0 mt-0.5`} />
                <div className="text-sm">
                  <p className={isSicario ? 'text-red-300' : 'text-amber-300'} style={{ fontWeight: 500 }}>Discord Benachrichtigung</p>
                  <p className="text-gray-300/80 mt-1">
                    {isSicario 
                      ? 'Alle Sicarios werden per Discord DM über diesen Einsatz informiert.'
                      : 'Alle Mitglieder werden im Discord über diese Aufstellung informiert.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 h-12 border-gray-600 hover:bg-gray-800 hover:border-gray-500 text-gray-300"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isLoading || !selectedDate || !selectedTime || !reason.trim()}
                className={`flex-1 h-12 bg-gradient-to-r ${theme.buttonGradient} text-white font-semibold shadow-lg ${theme.shadow} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Erstelle...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isSicario ? <Target className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                    {isSicario ? 'Einsatz erstellen' : 'Aufstellung erstellen'}
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

