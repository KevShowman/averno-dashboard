import { useState } from 'react'
import { Button } from './ui/button'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns'
import { de } from 'date-fns/locale'

interface DatePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  className?: string
  accentColor?: 'gold' | 'amber' | 'blue' | 'green' | 'red' | 'purple'
}

export default function DatePicker({ 
  value, 
  onChange, 
  placeholder = 'Datum auswählen...',
  className = '',
  accentColor = 'gold'
}: DatePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<Date>(value || new Date())

  const colors = {
    gold: {
      ring: 'focus:ring-gold-500/20 focus:border-gold-500',
      icon: 'text-gold-400',
      gradient: 'from-gold-600 to-orange-600',
    },
    amber: {
      ring: 'focus:ring-orange-500/20 focus:border-orange-500',
      icon: 'text-orange-400',
      gradient: 'from-orange-600 to-orange-600',
    },
    blue: {
      ring: 'focus:ring-blue-500/20 focus:border-orange-500',
      icon: 'text-orange-400',
      gradient: 'from-orange-600 to-orange-600',
    },
    green: {
      ring: 'focus:ring-green-500/20 focus:border-green-500',
      icon: 'text-green-400',
      gradient: 'from-green-600 to-emerald-600',
    },
    red: {
      ring: 'focus:ring-red-500/20 focus:border-red-500',
      icon: 'text-red-400',
      gradient: 'from-red-600 to-rose-600',
    },
    purple: {
      ring: 'focus:ring-purple-500/20 focus:border-purple-500',
      icon: 'text-purple-400',
      gradient: 'from-purple-600 to-violet-600',
    },
  }

  const theme = colors[accentColor]

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Pad the start with empty days (Mo = 0, So = 6)
  const startDayOfWeek = monthStart.getDay()
  const paddedDays = Array(startDayOfWeek === 0 ? 6 : startDayOfWeek - 1).fill(null).concat(daysInMonth)

  const handleSelect = (day: Date) => {
    onChange(day)
    setShowCalendar(false)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setShowCalendar(!showCalendar)}
        className={`w-full h-11 px-4 bg-zinc-800/50 border border-zinc-700 rounded-xl text-left text-white ${theme.ring} transition-all flex items-center justify-between hover:border-zinc-600`}
      >
        <span className={value ? 'text-white' : 'text-zinc-500'}>
          {value 
            ? format(value, 'EEEE, dd. MMMM yyyy', { locale: de })
            : placeholder
          }
        </span>
        <Calendar className={`h-4 w-4 ${theme.icon}`} />
      </button>
      
      {/* Custom Calendar Dropdown */}
      {showCalendar && (
        <>
          {/* Backdrop to close calendar */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowCalendar(false)}
          />
          
          <div className="absolute z-50 mt-2 w-full bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl p-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="h-8 w-8 text-zinc-400 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-white font-medium">
                {format(currentMonth, 'MMMM yyyy', { locale: de })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="h-8 w-8 text-zinc-400 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                <div key={day} className="text-center text-xs text-zinc-500 py-1">
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
                
                const isSelected = value && isSameDay(day, value)
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isCurrentDay = isToday(day)
                
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleSelect(day)}
                    className={`h-9 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? `bg-gradient-to-r ${theme.gradient} text-white shadow-lg`
                        : isCurrentDay
                          ? 'bg-zinc-700 text-white'
                          : isCurrentMonth
                            ? 'text-zinc-300 hover:bg-zinc-700'
                            : 'text-zinc-600'
                    }`}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>

            {/* Today Button */}
            <div className="mt-3 pt-3 border-t border-zinc-700">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentMonth(new Date())
                  handleSelect(new Date())
                }}
                className="w-full text-zinc-400 hover:text-white text-sm"
              >
                Heute
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

