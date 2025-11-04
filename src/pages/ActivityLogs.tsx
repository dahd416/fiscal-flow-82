import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { 
  FileText, 
  Search, 
  Calendar, 
  User, 
  Filter,
  Plus,
  Pencil,
  Trash2,
  Activity,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export default function ActivityLogs() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate('/dashboard');
      toast.error('No tienes permisos para acceder a esta página');
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadLogs();
    }
  }, [isAdmin]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      // Get logs
      const { data: logsData, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (logsError) throw logsError;
      setLogs(logsData || []);

      // Get unique user IDs from logs
      const userIds = Array.from(new Set(logsData?.map(log => log.user_id).filter(Boolean) || []));

      // Get profiles for these users
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        const profilesMap = new Map(
          profilesData?.map(p => [p.id, p]) || []
        );
        setProfiles(profilesMap);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
      toast.error('Error al cargar los registros');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLogs = () => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action_type === actionFilter);
    }

    if (tableFilter !== 'all') {
      filtered = filtered.filter(log => log.table_name === tableFilter);
    }

    if (startDate) {
      filtered = filtered.filter(log => log.created_at >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(log => log.created_at <= endDate + 'T23:59:59');
    }

    return filtered;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActionFilter('all');
    setTableFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="h-3 w-3" />;
      case 'update':
        return <Pencil className="h-3 w-3" />;
      case 'delete':
        return <Trash2 className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, { bg: string; text: string; label: string }> = {
      create: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', label: 'Crear' },
      update: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', label: 'Actualizar' },
      delete: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', label: 'Eliminar' },
    };

    const variant = variants[action] || { bg: 'bg-gray-100', text: 'text-gray-800', label: action };

    return (
      <Badge className={`gap-1 ${variant.bg} ${variant.text}`}>
        {getActionIcon(action)}
        {variant.label}
      </Badge>
    );
  };

  const getTableLabel = (tableName: string) => {
    const labels: Record<string, string> = {
      transactions: 'Transacciones',
      quotations: 'Cotizaciones',
      clients: 'Clientes',
      providers: 'Proveedores',
      user_roles: 'Roles de Usuario',
      profiles: 'Perfiles',
      calendar_events: 'Eventos',
    };
    return labels[tableName] || tableName;
  };

  const filteredLogs = getFilteredLogs();
  const uniqueTables = Array.from(new Set(logs.map(log => log.table_name).filter(table => table && table.trim())));

  if (roleLoading || loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin/users')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Registros de Actividad</CardTitle>
                <CardDescription>
                  Historial completo de todas las acciones realizadas en la plataforma
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {filteredLogs.length} registros
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Descripción o tabla..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-filter">Acción</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger id="action-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Acciones</SelectItem>
                  <SelectItem value="create">Crear</SelectItem>
                  <SelectItem value="update">Actualizar</SelectItem>
                  <SelectItem value="delete">Eliminar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="table-filter">Tabla</Label>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger id="table-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Tablas</SelectItem>
                  {uniqueTables.map(table => (
                    <SelectItem key={table} value={table}>
                      {getTableLabel(table)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Fecha Inicio</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Fecha Fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {(searchTerm || actionFilter !== 'all' || tableFilter !== 'all' || startDate || endDate) && (
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                {filteredLogs.length} de {logs.length} registros
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpiar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Historial de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay registros para mostrar</p>
              <p className="text-sm mt-2">Prueba ajustando los filtros</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Fecha y Hora</TableHead>
                      <TableHead className="w-[160px]">Usuario</TableHead>
                      <TableHead className="w-[110px]">Acción</TableHead>
                      <TableHead className="w-[140px]">Módulo</TableHead>
                      <TableHead>Descripción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const profile = log.user_id ? profiles.get(log.user_id) : null;
                      const userName = profile
                        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
                        : log.user_id ? 'Usuario' : 'Sistema';

                      return (
                        <TableRow 
                          key={log.id} 
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => setSelectedLog(log)}
                        >
                          <TableCell className="font-mono text-sm whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{userName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getActionBadge(log.action_type)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getTableLabel(log.table_name)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="truncate" title={log.description || ''}>
                              {log.description || (
                                <span className="text-muted-foreground italic">Sin descripción</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
