import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  vat_amount: number;
  description: string | null;
  category: string | null;
  transaction_date: string;
  user_id: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  clients: {
    first_name: string;
    last_name: string | null;
  } | null;
  quotations: { quotation_number: string; title: string } | null;
}

export function GlobalActivityPanel() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [globalStats, setGlobalStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    totalUsers: 0,
    totalTransactions: 0,
  });

  useEffect(() => {
    loadAllActivity();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [transactions, userFilter]);

  const loadAllActivity = async () => {
    try {
      setLoading(true);
      
      // Get all users with their roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name');

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'user']);

      if (rolesError) throw rolesError;

      // Create a map of users with their roles
      const usersWithRoles = (profilesData || [])
        .filter(profile => {
          const hasRole = rolesData?.some(r => 
            r.user_id === profile.id && (r.role === 'admin' || r.role === 'user')
          );
          return hasRole;
        })
        .map(profile => {
          const role = rolesData?.find(r => r.user_id === profile.id)?.role || 'user';
          const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Sin nombre';
          return {
            id: profile.id,
            name,
            role,
          };
        });

      setAllUsers(usersWithRoles);

      // Get all transactions with clients
      const { data: transactionsData, error: transError } = await supabase
        .from('transactions')
        .select(`
          *,
          clients(first_name, last_name),
          quotations(quotation_number, title)
        `)
        .in('type', ['income', 'expense'])
        .order('transaction_date', { ascending: false })
        .limit(500);

      if (transError) throw transError;

      // Map profiles to transactions
      const profilesMap = new Map(
        profilesData?.map(p => [p.id, p]) || []
      );

      const enrichedTransactions: Transaction[] = (transactionsData || []).map(t => ({
        ...t,
        profiles: profilesMap.get(t.user_id) || null,
      })) as Transaction[];

      setTransactions(enrichedTransactions);
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    let filtered = transactions;

    if (userFilter !== 'all') {
      filtered = filtered.filter(t => t.user_id === userFilter);
    }

    const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    setGlobalStats({
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      totalUsers: allUsers.length,
      totalTransactions: filtered.length,
    });
  };

  const filteredTransactions = transactions.filter(t => {
    if (userFilter !== 'all' && t.user_id !== userFilter) return false;
    return true;
  });

  const clearFilters = () => {
    setUserFilter('all');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Ingresos Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {formatCurrency(globalStats.totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Egresos Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {formatCurrency(globalStats.totalExpense)}
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${
          globalStats.balance >= 0 
            ? 'border-green-300 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10' 
            : 'border-red-300 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10'
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Balance Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              globalStats.balance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
            }`}>
              {formatCurrency(globalStats.balance)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Usuarios Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {globalStats.totalUsers}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-600" />
              Transacciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              {globalStats.totalTransactions}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Filtrar por Usuario
          </CardTitle>
          <CardDescription>
            Selecciona un usuario para ver su actividad financiera
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Usuario</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {user.role === 'admin' ? 'Admin' : 'Usuario'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {userFilter !== 'all' && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm border rounded-md hover:bg-muted"
              >
                Ver Todos
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Historial de Transacciones</span>
                <Badge variant="secondary">{filteredTransactions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay transacciones para mostrar</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[110px]">Fecha</TableHead>
                          <TableHead className="w-[160px]">Usuario</TableHead>
                          <TableHead className="w-[90px]">Tipo</TableHead>
                          <TableHead className="min-w-[200px]">Descripción</TableHead>
                          <TableHead className="w-[150px]">Cliente</TableHead>
                          <TableHead className="w-[130px]">Categoría</TableHead>
                          <TableHead className="text-right w-[110px]">Monto</TableHead>
                          <TableHead className="text-right w-[90px]">IVA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((transaction) => {
                          const userName = transaction.profiles
                            ? [transaction.profiles.first_name, transaction.profiles.last_name].filter(Boolean).join(' ') || 'Sin nombre'
                            : 'Sin nombre';

                          return (
                            <TableRow key={transaction.id} className="hover:bg-muted/50">
                              <TableCell className="font-medium whitespace-nowrap">
                                {new Date(transaction.transaction_date).toLocaleDateString('es-MX', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{userName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {transaction.type === 'income' ? (
                                  <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 whitespace-nowrap">
                                    <TrendingUp className="h-3 w-3" />
                                    Ingreso
                                  </Badge>
                                ) : (
                                  <Badge className="gap-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 whitespace-nowrap">
                                    <TrendingDown className="h-3 w-3" />
                                    Egreso
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <div className="truncate" title={transaction.description || ''}>
                                  {transaction.description || (
                                    <span className="text-muted-foreground italic">Sin descripción</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {transaction.clients ? (
                                  <div className="truncate font-medium">
                                    {[transaction.clients.first_name, transaction.clients.last_name]
                                      .filter(Boolean)
                                      .join(' ')}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Sin cliente</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {transaction.category ? (
                                  <Badge variant="outline" className="whitespace-nowrap">{transaction.category}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-bold whitespace-nowrap">
                                <span className={transaction.type === 'income' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                                {formatCurrency(transaction.vat_amount)}
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
    </div>
  );
}
