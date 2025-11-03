import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { toast } from 'sonner';
import { Trash2, Shield, User as UserIcon, Calendar, Ban, Pencil } from 'lucide-react';
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

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  rfc: string | null;
  created_at: string;
  subscription_end_date: string | null;
  subscription_duration_days: number;
  is_suspended: boolean;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface UserWithRole extends UserProfile {
  email: string;
  roles: string[];
}

export default function AdminUsers() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editSubscriptionUser, setEditSubscriptionUser] = useState<UserWithRole | null>(null);
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState('');
  const [subscriptionDuration, setSubscriptionDuration] = useState('30');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error('Acceso denegado');
      navigate('/dashboard');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('admin-get-users', {
        method: 'POST',
      });

      if (error) throw error;

      if (data?.users) {
        setUsers(data.users);
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      if (isCurrentlyAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
        toast.success('Rol de admin removido');
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;
        toast.success('Usuario promovido a admin');
      }

      loadUsers();
    } catch (error: any) {
      console.error('Error toggling admin:', error);
      toast.error('Error al cambiar rol de admin');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: deleteUserId },
      });

      if (error) throw error;

      toast.success('Usuario eliminado exitosamente');
      setDeleteUserId(null);
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Error al eliminar usuario');
    }
  };

  const handleEditSubscription = (user: UserWithRole) => {
    setEditSubscriptionUser(user);
    setSubscriptionEndDate(user.subscription_end_date || '');
    setSubscriptionDuration(user.subscription_duration_days?.toString() || '30');
  };

  const handleSaveSubscription = async () => {
    if (!editSubscriptionUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_end_date: subscriptionEndDate || null,
          subscription_duration_days: parseInt(subscriptionDuration),
          is_suspended: false, // Reactivate if updating subscription
        })
        .eq('id', editSubscriptionUser.id);

      if (error) throw error;

      toast.success('Suscripción actualizada exitosamente');
      setEditSubscriptionUser(null);
      loadUsers();
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast.error('Error al actualizar suscripción');
    }
  };

  const handleToggleSuspension = async (userId: string, currentSuspendedStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: !currentSuspendedStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(
        currentSuspendedStatus ? 'Usuario reactivado' : 'Usuario suspendido'
      );
      loadUsers();
    } catch (error: any) {
      console.error('Error toggling suspension:', error);
      toast.error('Error al cambiar estado de suspensión');
    }
  };

  if (adminLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Gestión de Usuarios
          </CardTitle>
          <CardDescription>
            Administra todos los usuarios de la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>RFC</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Registro</TableHead>
                <TableHead>Fecha de Corte</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isUserAdmin = user.roles.includes('admin');
                const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Sin nombre';
                
                const daysUntilExpiration = user.subscription_end_date 
                  ? Math.ceil((new Date(user.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <TableRow key={user.id} className={user.is_suspended ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">
                      {fullName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.rfc || 'N/A'}</TableCell>
                    <TableCell>
                      {isUserAdmin ? (
                        <Badge variant="default" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Usuario</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_suspended ? (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="h-3 w-3" />
                          Suspendido
                        </Badge>
                      ) : (
                        <Badge variant="default">Activo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell>
                      {user.subscription_end_date && !isUserAdmin ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">
                            {new Date(user.subscription_end_date).toLocaleDateString('es-ES')}
                          </span>
                          {daysUntilExpiration !== null && (
                            <Badge 
                              variant={
                                daysUntilExpiration < 0 ? 'destructive' : 
                                daysUntilExpiration <= 3 ? 'default' : 
                                'secondary'
                              }
                              className="text-xs"
                            >
                              {daysUntilExpiration < 0 
                                ? `Vencida hace ${Math.abs(daysUntilExpiration)} días`
                                : daysUntilExpiration === 0
                                ? 'Vence hoy'
                                : `${daysUntilExpiration} días`
                              }
                            </Badge>
                          )}
                        </div>
                      ) : isUserAdmin ? (
                        <Badge variant="outline">No aplica</Badge>
                      ) : (
                        'Sin fecha'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditUser(user)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        {!isUserAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSubscription(user)}
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              Suscripción
                            </Button>
                            <Button
                              variant={user.is_suspended ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleToggleSuspension(user.id, user.is_suspended)}
                            >
                              {user.is_suspended ? 'Reactivar' : 'Suspender'}
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAdmin(user.id, isUserAdmin)}
                        >
                          {isUserAdmin ? 'Remover Admin' : 'Hacer Admin'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteUserId(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No hay usuarios registrados
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario y todos sus datos serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditUserDialog
        user={editUser}
        open={!!editUser}
        onClose={() => setEditUser(null)}
        onSuccess={loadUsers}
      />

      <Dialog open={!!editSubscriptionUser} onOpenChange={() => setEditSubscriptionUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Suscripción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subscription_end_date">Fecha de Corte</Label>
              <Input
                id="subscription_end_date"
                type="date"
                value={subscriptionEndDate}
                onChange={(e) => setSubscriptionEndDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                La suscripción vencerá en esta fecha
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscription_duration">Duración (días)</Label>
              <Input
                id="subscription_duration"
                type="number"
                min="1"
                value={subscriptionDuration}
                onChange={(e) => setSubscriptionDuration(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Duración predeterminada de la suscripción en días
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditSubscriptionUser(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSubscription}>
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
