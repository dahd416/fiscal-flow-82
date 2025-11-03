import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { UserActivityPanel } from '@/components/admin/UserActivityPanel';
import { PlatformCustomization } from '@/components/admin/PlatformCustomization';
import { GlobalActivityPanel } from '@/components/admin/GlobalActivityPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Trash2, 
  Shield, 
  User as UserIcon, 
  Calendar, 
  Ban, 
  Pencil, 
  UserPlus, 
  Search, 
  Filter, 
  X, 
  Crown,
  Activity,
  Users
} from 'lucide-react';
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
  const { isAdmin, isSuperAdmin, loading: adminLoading } = useUserRole();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editSubscriptionUser, setEditSubscriptionUser] = useState<UserWithRole | null>(null);
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState('');
  const [subscriptionDuration, setSubscriptionDuration] = useState('30');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'admin' | 'super_admin'>('all');
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

    if (statusFilter !== 'all') {
      filtered = filtered.filter((user) => {
        if (statusFilter === 'super_admin') return user.roles.includes('super_admin');
        if (statusFilter === 'admin') return user.roles.includes('admin') && !user.roles.includes('super_admin');
        if (statusFilter === 'suspended') return user.is_suspended;
        if (statusFilter === 'active') return !user.is_suspended && !user.roles.includes('admin') && !user.roles.includes('super_admin');
        return true;
      });
    }

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

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean, isSuperAdmin: boolean) => {
    if (isSuperAdmin) {
      toast.error('No puedes modificar el rol del Super Admin');
      return;
    }

    try {
      if (isCurrentlyAdmin) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
        toast.success('Rol de admin removido');
      } else {
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

    const userToDelete = users.find(u => u.id === deleteUserId);
    if (userToDelete?.roles.includes('super_admin')) {
      toast.error('No puedes eliminar al Super Admin');
      setDeleteUserId(null);
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: deleteUserId },
      });

      if (error) throw error;

      toast.success('Usuario eliminado exitosamente');
      setDeleteUserId(null);
      if (selectedUser?.id === deleteUserId) {
        setSelectedUser(null);
      }
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
          is_suspended: false,
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
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const getUserFullName = (user: UserWithRole) => {
    return [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Sin nombre';
  };

  return (
    <Layout>
      <TooltipProvider>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Users className="h-8 w-8" />
                Plataforma
              </h2>
              <p className="text-muted-foreground mt-1">
                Gestión de usuarios, actividad financiera y personalización
              </p>
            </div>
            <Link to="/invite-user">
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invitar Usuario
              </Button>
            </Link>
          </div>

          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-3">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Lista de Usuarios
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                Actividad Financiera
              </TabsTrigger>
              <TabsTrigger value="customization" className="gap-2">
                <Shield className="h-4 w-4" />
                Personalización
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        Usuarios Registrados
                        <Badge variant="secondary">
                          {filteredUsers.length} de {users.length}
                        </Badge>
                      </CardTitle>
                    </div>

                    {/* Filters */}
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
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          <SelectItem value="active">Activos</SelectItem>
                          <SelectItem value="suspended">Suspendidos</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="admin">Administradores</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={subscriptionFilter} onValueChange={(v: any) => setSubscriptionFilter(v)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <Calendar className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="active">Vigentes</SelectItem>
                          <SelectItem value="expiring">Por vencer</SelectItem>
                          <SelectItem value="expired">Vencidas</SelectItem>
                        </SelectContent>
                      </Select>
                      {(searchQuery || statusFilter !== 'all' || subscriptionFilter !== 'all') && (
                        <Button variant="outline" size="icon" onClick={clearFilters}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <UserIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">
                        {users.length === 0 ? 'No hay usuarios registrados' : 'No se encontraron usuarios'}
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="hidden lg:table-cell">RFC</TableHead>
                            <TableHead>Roles</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="hidden xl:table-cell">Suscripción</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((user) => {
                            const isUserAdmin = user.roles.includes('admin') || user.roles.includes('super_admin');
                            const isUserSuperAdmin = user.roles.includes('super_admin');
                            const fullName = getUserFullName(user);
                            const isSelected = selectedUser?.id === user.id;

                            return (
                              <TableRow 
                                key={user.id}
                                className={`cursor-pointer transition-colors ${
                                  isSelected ? 'bg-accent' : 'hover:bg-muted/50'
                                } ${user.is_suspended ? 'opacity-60' : ''}`}
                                onClick={() => setSelectedUser(user)}
                              >
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-semibold">{fullName}</span>
                                    {user.business_name && (
                                      <span className="text-xs text-muted-foreground">{user.business_name}</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">{user.email}</span>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">{user.rfc || 'N/A'}</TableCell>
                                <TableCell>
                                  {isUserSuperAdmin ? (
                                    <Badge className="gap-1 bg-gradient-to-r from-yellow-500 to-orange-500">
                                      <Crown className="h-3 w-3" />
                                      Super Admin
                                    </Badge>
                                  ) : isUserAdmin ? (
                                    <Badge className="gap-1">
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
                                    <Badge variant="outline" className="border-green-500 text-green-700">
                                      Activo
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="hidden xl:table-cell">
                                  {user.subscription_end_date && (
                                    <span className="text-sm">
                                      {new Date(user.subscription_end_date).toLocaleDateString('es-MX')}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditUser(user);
                                          }}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Editar usuario</TooltipContent>
                                    </Tooltip>
                                    
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditSubscription(user);
                                          }}
                                        >
                                          <Calendar className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Editar suscripción</TooltipContent>
                                    </Tooltip>

                                    {!isUserSuperAdmin && (
                                      <>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleSuspension(user.id, user.is_suspended);
                                              }}
                                              className={user.is_suspended ? "hover:bg-green-500/10 hover:text-green-600" : "hover:bg-orange-500/10 hover:text-orange-600"}
                                            >
                                              <Ban className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {user.is_suspended ? 'Reactivar usuario' : 'Suspender usuario'}
                                          </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleAdmin(user.id, isUserAdmin, isUserSuperAdmin);
                                              }}
                                              className={isUserAdmin ? "hover:bg-red-500/10 hover:text-red-600" : "hover:bg-blue-500/10 hover:text-blue-600"}
                                            >
                                              <Shield className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {isUserAdmin ? 'Remover rol de admin' : 'Convertir a admin'}
                                          </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteUserId(user.id);
                                              }}
                                              className="hover:bg-destructive/10 hover:text-destructive"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Eliminar usuario</TooltipContent>
                                        </Tooltip>
                                      </>
                                    )}
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

              {selectedUser && (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Usuario Seleccionado
                    </CardTitle>
                    <CardDescription>
                      {getUserFullName(selectedUser)} - {selectedUser.email}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Haz clic en la pestaña "Actividad Financiera" arriba para ver los ingresos y egresos
                    </p>
                    <Button variant="outline" onClick={() => setSelectedUser(null)}>
                      Limpiar Selección
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activity">
              <GlobalActivityPanel />
            </TabsContent>

            <TabsContent value="customization">
              <PlatformCustomization />
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialogs */}
        <EditUserDialog
          user={editUser}
          open={!!editUser}
          onClose={() => setEditUser(null)}
          onSuccess={loadUsers}
        />

        <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El usuario será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!editSubscriptionUser} onOpenChange={() => setEditSubscriptionUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Suscripción</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subscription-date">Fecha de Fin de Suscripción</Label>
                <Input
                  id="subscription-date"
                  type="date"
                  value={subscriptionEndDate}
                  onChange={(e) => setSubscriptionEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscription-duration">Duración (días)</Label>
                <Input
                  id="subscription-duration"
                  type="number"
                  min="1"
                  value={subscriptionDuration}
                  onChange={(e) => setSubscriptionDuration(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
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
      </TooltipProvider>
    </Layout>
  );
}
