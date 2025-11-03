import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { CalendarView } from '@/components/calendar/CalendarView';
import { EventsList } from '@/components/calendar/EventsList';
import { EventDialog } from '@/components/calendar/EventDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Users } from 'lucide-react';
import { parseISO, isSameDay } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CalendarEvent {
  id: string;
  user_id: string;
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

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export default function VatPeriods() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Admin specific states
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  useEffect(() => {
    if (user) {
      if (isAdmin) {
        loadUsers();
      } else {
        setLoadingUsers(false);
        setSelectedUserId(user.id);
        loadEvents(user.id);
      }
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (selectedUserId) {
      loadEvents(selectedUserId);
    }
  }, [selectedUserId]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase.functions.invoke('admin-get-users');
      if (error) throw error;
      if (data?.users) {
        setUsers(data.users);
        if (data.users.length > 0) {
          setSelectedUserId(data.users[0].id);
        }
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadEvents = async (userId: string) => {
    try {
      setLoadingEvents(true);
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Error loading events:', error);
      toast.error('Error al cargar eventos');
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    try {
      if (!eventData.title || !eventData.event_date || !eventData.event_type) {
        toast.error('Por favor completa todos los campos requeridos');
        return;
      }

      const dataToSave = {
        title: eventData.title,
        description: eventData.description || null,
        event_date: eventData.event_date,
        event_time: eventData.event_time || null,
        event_type: eventData.event_type,
        priority: eventData.priority || 'medium',
        user_id: selectedUserId,
        created_by: user!.id,
        is_admin_created: isAdmin && selectedUserId !== user!.id,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('calendar_events')
          .update(dataToSave)
          .eq('id', editingEvent.id);

        if (error) throw error;
        toast.success('Evento actualizado');
      } else {
        const { error } = await supabase.from('calendar_events').insert([dataToSave]);

        if (error) throw error;
        toast.success('Evento creado');
      }

      loadEvents(selectedUserId);
      setEditingEvent(null);
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast.error('Error al guardar evento');
      throw error;
    }
  };

  const handleToggleComplete = async (eventId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ is_completed: isCompleted })
        .eq('id', eventId);

      if (error) throw error;
      loadEvents(selectedUserId);
    } catch (error: any) {
      console.error('Error toggling event:', error);
      toast.error('Error al actualizar evento');
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', deleteEventId);

      if (error) throw error;
      toast.success('Evento eliminado');
      loadEvents(selectedUserId);
      setDeleteEventId(null);
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast.error('Error al eliminar evento');
    }
  };

  const filteredEvents = events.filter((event) => {
    return isSameDay(parseISO(event.event_date), selectedDate);
  });

  const selectedUserName = users.find((u) => u.id === selectedUserId);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {isAdmin ? 'Gestión de Calendarios' : 'Mi Calendario'}
            </h2>
            <p className="text-muted-foreground">
              {isAdmin
                ? 'Administra eventos y recordatorios de usuarios'
                : 'Gestiona tus eventos y recordatorios de IVA'}
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Select 
                value={selectedUserId} 
                onValueChange={setSelectedUserId}
                disabled={loadingUsers}
              >
                <SelectTrigger className="w-[250px]">
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={loadingUsers ? "Cargando usuarios..." : "Selecciona un usuario"} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button 
              onClick={() => setDialogOpen(true)} 
              className="gap-2 hover-scale"
              disabled={!selectedUserId || (isAdmin && loadingUsers)}
            >
              <Plus className="h-4 w-4" />
              Nuevo Evento
            </Button>
          </div>
        </div>

        {isAdmin && selectedUserName && (
          <Card className="p-4 bg-primary/5 border-primary/20 animate-fade-in">
            <p className="text-sm">
              <span className="font-semibold">Viendo calendario de:</span>{' '}
              {selectedUserName.first_name && selectedUserName.last_name
                ? `${selectedUserName.first_name} ${selectedUserName.last_name}`
                : selectedUserName.email}
            </p>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
          {loadingEvents ? (
            <Card className="p-6">
              <Skeleton className="h-[600px]" />
            </Card>
          ) : (
            <CalendarView
              events={events}
              onDateSelect={setSelectedDate}
              selectedDate={selectedDate}
            />
          )}
          {loadingEvents ? (
            <Card className="p-6">
              <Skeleton className="h-[600px]" />
            </Card>
          ) : (
            <EventsList
              events={filteredEvents}
              selectedDate={selectedDate}
              onToggleComplete={handleToggleComplete}
              onEdit={(event) => {
                setEditingEvent(event as CalendarEvent);
                setDialogOpen(true);
              }}
              onDelete={setDeleteEventId}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>

      <EventDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        event={editingEvent}
        defaultDate={selectedDate}
        isAdminCreating={isAdmin && selectedUserId !== user?.id}
        selectedUserId={selectedUserId}
      />

      <AlertDialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El evento será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
