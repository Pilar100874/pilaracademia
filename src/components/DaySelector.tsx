import { useState } from 'react';
import { format, addDays, subDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useDayIndicators } from '@/hooks/useDayIndicators';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface DaySelectorProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function DaySelector({ selectedDate, onSelectDate }: DaySelectorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const { hasData } = useDayIndicators(selectedDate);

  const getDayLabel = (date: Date) => {
    return format(date, 'EEE', { locale: ptBR }).charAt(0).toUpperCase() + 
           format(date, 'EEE', { locale: ptBR }).slice(1, 3);
  };

  const goToPreviousWeek = () => {
    onSelectDate(subDays(selectedDate, 7));
  };

  const goToNextWeek = () => {
    const nextWeekDate = addDays(selectedDate, 7);
    if (nextWeekDate <= new Date()) {
      onSelectDate(nextWeekDate);
    }
  };

  const canGoNext = addDays(weekStart, 7) <= new Date();

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date && date <= new Date()) {
      onSelectDate(date);
      setCalendarOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Calendar picker button */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <button className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted transition-colors">
            <CalendarDays className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            disabled={(date) => date > new Date()}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <button
        onClick={goToPreviousWeek}
        className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center justify-between gap-1 flex-1">
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const isFuture = day > new Date();
          const dayHasData = hasData(day);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => !isFuture && onSelectDate(day)}
              disabled={isFuture}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-2 rounded-2xl transition-all min-w-[36px] relative",
                isSelected 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : isTodayDate
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                isFuture && "opacity-40 cursor-not-allowed"
              )}
            >
              <span className="text-[10px] font-medium uppercase">{getDayLabel(day)}</span>
              <span className={cn(
                "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                isSelected && "bg-white/20"
              )}>
                {format(day, 'd')}
              </span>
              {dayHasData && !isFuture && (
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isSelected ? "bg-primary-foreground/70" : "bg-primary"
                )} />
              )}
            </button>
          );
        })}
      </div>
      <button
        onClick={goToNextWeek}
        disabled={!canGoNext}
        className={cn(
          "p-1.5 rounded-xl text-muted-foreground hover:bg-muted transition-colors",
          !canGoNext && "opacity-30 cursor-not-allowed"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
