import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Trash2, Clock, Shield, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  event_type: string;
  priority: string;
  is_completed: boolean;
  is_admin_created: boolean;
  created_by: string | null;
}

interface EventsListProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onToggleComplete: (eventId: string, isCompleted: boolean) => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
  isAdmin?: boolean;
}

export function EventsList({
  events,
  selectedDate,
  onToggleComplete,
  onEdit,
  onDelete,
  isAdmin = false,
}: EventsListProps) {
  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vat_payment: 'Pago IVA',
      platform_payment: 'Pago Plataforma',
      reminder: 'Recordatorio',
      deadline: 'Fecha Límite',
      custom: 'Personalizado',
    };
    return labels[type] || type;
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      vat_payment: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      platform_payment: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300 dark:border-red-700',
      reminder: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      deadline: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      custom: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    };
    return colors[type] || colors.custom;
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Eventos del {format(selectedDate, 'd MMMM yyyy', { locale: es })}</span>
          <Badge variant="secondary">{events.length} eventos</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay eventos para este día</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => (
              <div
                key={event.id}
                className={`p-4 rounded-lg border transition-all hover:shadow-md animate-slide-in-right ${
                  event.is_completed ? 'opacity-60' : ''
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={event.is_completed}
                    onCheckedChange={(checked) =>
                      onToggleComplete(event.id, checked as boolean)
                    }
                    disabled={event.is_admin_created && !isAdmin}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3
                        className={`font-semibold ${
                          event.is_completed ? 'line-through' : ''
                        }`}
                      >
                        {event.title}
                      </h3>
                      {getPriorityIcon(event.priority)}
                      {event.is_admin_created && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Shield className="h-4 w-4 text-primary" />
                            </TooltipTrigger>
                            <TooltipContent>Creado por administrador</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getEventTypeColor(event.event_type)}>
                        {getEventTypeLabel(event.event_type)}
                      </Badge>
                      {event.event_time && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {event.event_time}
                        </Badge>
                      )}
                      <Badge variant="outline">{event.priority}</Badge>
                    </div>
                  </div>
                  {(!event.is_admin_created || isAdmin) && (
                    <div className="flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(event)}
                              className="hover-scale"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar evento</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(event.id)}
                              className="hover-scale text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar evento</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
