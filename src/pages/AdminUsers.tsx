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
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Trash2, Shield, User as UserIcon, Calendar, Ban, Pencil, UserPlus, Search, Filter, X } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  business_name: string | null;
  fiscal_name: string | null;
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
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editSubscriptionUser, setEditSubscriptionUser] = useState<UserWithRole | null>(null);
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState('');
  const [subscriptionDuration, setSubscriptionDuration] = useState('30');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'admin'>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');

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

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, statusFilter, subscriptionFilter]);

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.first_name?.toLowerCase().includes(query) ||
          user.last_name?.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.rfc?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((user) => {
        if (statusFilter === 'admin') return user.roles.includes('admin');
        if (statusFilter === 'suspended') return user.is_suspended;
        if (statusFilter === 'active') return !user.is_suspended && !user.roles.includes('admin');
        return true;
      });
    }

    // Subscription filter
    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter((user) => {
        if (!user.subscription_end_date) return false;
        const daysUntilExpiration = Math.ceil(
          (new Date(user.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (subscriptionFilter === 'expired') return daysUntilExpiration < 0;
        if (subscriptionFilter === 'expiring') return daysUntilExpiration >= 0 && daysUntilExpiration <= 7;
        if (subscriptionFilter === 'active') return daysUntilExpiration > 7;
        return true;
      });
    }

    setFilteredUsers(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSubscriptionFilter('all');
  };

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
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-10 w-40" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-40" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <TooltipProvider>
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Gestión de Usuarios
                  <Badge variant="secondary" className="ml-2">
                    {filteredUsers.length} de {users.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Administra todos los usuarios de la plataforma
                </CardDescription>
              </div>
              <Link to="/invite-user">
                <Button variant="default" className="gap-2 hover-scale">
                  <UserPlus className="h-4 w-4" />
                  Invitar Usuario
                </Button>
              </Link>
            </div>

            {/* Filters Section */}
            <div className="flex flex-col gap-4 mt-6 pt-6 border-t">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, email o RFC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="suspended">Suspendidos</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={subscriptionFilter} onValueChange={(v: any) => setSubscriptionFilter(v)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Suscripción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="active">Vigentes</SelectItem>
                    <SelectItem value="expiring">Por vencer (7 días)</SelectItem>
                    <SelectItem value="expired">Vencidas</SelectItem>
                  </SelectContent>
                </Select>
                {(searchQuery || statusFilter !== 'all' || subscriptionFilter !== 'all') && (
                  <Button variant="outline" size="icon" onClick={clearFilters} className="hover-scale">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <UserIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {users.length === 0 ? 'No hay usuarios registrados' : 'No se encontraron usuarios con los filtros aplicados'}
                </p>
                {users.length > 0 && (
                  <Button variant="outline" className="mt-4" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden lg:table-cell">RFC</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Fecha de Registro</TableHead>
                <TableHead className="hidden xl:table-cell">Fecha de Corte</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user, index) => {
                const isUserAdmin = user.roles.includes('admin');
                const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Sin nombre';
                
                const daysUntilExpiration = user.subscription_end_date 
                  ? Math.ceil((new Date(user.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <TableRow 
                    key={user.id} 
                    className={`animate-fade-in hover:bg-muted/50 transition-colors ${user.is_suspended ? 'opacity-60' : ''}`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="font-semibold">{fullName}</span>
                        {user.business_name && (
                          <span className="text-xs text-muted-foreground">{user.business_name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{user.email}</span>
                        {user.fiscal_name && (
                          <span className="text-xs text-muted-foreground">{user.fiscal_name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{user.rfc || 'N/A'}</TableCell>
                    <TableCell>
                      {isUserAdmin ? (
                        <Badge variant="default" className="gap-1 animate-scale-in">
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
                        <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                          Activo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
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
                              className="text-xs w-fit"
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
                        <span className="text-muted-foreground text-sm">Sin fecha</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end flex-wrap">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditUser(user)}
                              className="hover-scale"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar información</TooltipContent>
                        </Tooltip>
                        {!isUserAdmin && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditSubscription(user)}
                                  className="hover-scale"
                                >
                                  <Calendar className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Gestionar suscripción</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={user.is_suspended ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => handleToggleSuspension(user.id, user.is_suspended)}
                                  className="hover-scale"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {user.is_suspended ? 'Reactivar usuario' : 'Suspender usuario'}
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleAdmin(user.id, isUserAdmin)}
                              className="hover-scale"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isUserAdmin ? 'Remover rol admin' : 'Hacer administrador'}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteUserId(user.id)}
                              className="hover-scale"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar usuario</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
</TooltipProvider>

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
