import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  priority: string;
  is_completed: boolean;
  is_admin_created: boolean;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
}

export function CalendarView({ events, onDateSelect, selectedDate }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter((event) =>
      isSameDay(parseISO(event.event_date), date)
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 dark:bg-red-600';
      case 'high':
        return 'bg-orange-500 dark:bg-orange-600';
      case 'medium':
        return 'bg-yellow-500 dark:bg-yellow-600';
      case 'low':
        return 'bg-blue-500 dark:bg-blue-600';
      default:
        return 'bg-gray-500 dark:bg-gray-600';
    }
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth} className="hover-scale">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentMonth(new Date())}
              className="hover-scale"
            >
              Hoy
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth} className="hover-scale">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <button
                key={index}
                onClick={() => onDateSelect(day)}
                className={cn(
                  'min-h-[80px] p-2 rounded-lg border transition-all hover:border-primary hover:shadow-md',
                  'flex flex-col items-start justify-start relative',
                  isSelected && 'border-primary bg-primary/10',
                  isTodayDate && 'border-primary border-2',
                  'animate-scale-in'
                )}
                style={{ animationDelay: `${index * 0.01}s` }}
              >
                <span
                  className={cn(
                    'text-sm font-medium mb-1',
                    isTodayDate && 'text-primary font-bold'
                  )}
                >
                  {format(day, 'd')}
                </span>
                <div className="flex flex-col gap-1 w-full">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        'w-full h-1.5 rounded-full',
                        getPriorityColor(event.priority),
                        event.is_completed && 'opacity-50'
                      )}
                      title={event.title}
                    />
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{dayEvents.length - 2} más
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
