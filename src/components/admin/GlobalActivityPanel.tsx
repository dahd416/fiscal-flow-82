import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, User, Receipt, X, Plus, Pencil, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddTransactionDialog } from '@/components/admin/AddTransactionDialog';
import { EditTransactionDialog } from '@/components/admin/EditTransactionDialog';
import { toast } from 'sonner';
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

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  subtotal: number;
  vat_amount: number;
  vat_rate: number;
  concept: string | null;
  description: string | null;
  folio: string | null;
  payment_method: string | null;
  is_invoice: boolean;
  transaction_date: string;
  user_id: string;
  client_id: string | null;
  provider_id: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  clients: {
    first_name: string;
    last_name: string | null;
    vat_number: string | null;
  } | null;
  quotations: { quotation_number: string; title: string } | null;
}

export function GlobalActivityPanel() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [editTransactionOpen, setEditTransactionOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);
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
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create a map of users with their roles
      const usersWithRoles = (profilesData || [])
        .filter(profile => {
          const hasRole = rolesData?.some(r => r.user_id === profile.id);
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
          clients(first_name, last_name, vat_number),
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

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditTransactionOpen(true);
  };

  const handleDeleteTransaction = async () => {
    if (!deleteTransactionId) return;
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', deleteTransactionId);
      if (error) throw error;
      toast.success('Transacción eliminada correctamente');
      await loadAllActivity();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Error al eliminar la transacción');
    } finally {
      setDeleteTransactionId(null);
    }
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

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Filtrar por Usuario
              </CardTitle>
              <CardDescription>
                Selecciona un usuario para ver su actividad financiera
              </CardDescription>
            </div>
            <Button 
              onClick={() => setAddTransactionOpen(true)}
              className="gap-2"
              disabled={userFilter === 'all'}
            >
              <Plus className="h-4 w-4" />
              Agregar Transacción
            </Button>
          </div>
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
                  {allUsers.filter(user => user.id && user.id.trim()).map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Usuario'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {userFilter !== 'all' && (
              <Button variant="outline" onClick={clearFilters}>
                Ver Todos
              </Button>
            )}
          </div>
          {userFilter === 'all' && (
            <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Selecciona un usuario para agregar transacciones
            </p>
          )}
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
                          <TableHead className="min-w-[200px]">Concepto</TableHead>
                          <TableHead className="w-[150px]">Cliente</TableHead>
                          <TableHead className="w-[130px]">RFC</TableHead>
                          <TableHead className="w-[80px] text-center">Factura</TableHead>
                          <TableHead className="text-right w-[110px]">Subtotal</TableHead>
                          <TableHead className="text-right w-[90px]">IVA</TableHead>
                          <TableHead className="text-right w-[120px]">Total</TableHead>
                          <TableHead className="text-center w-[120px]">Acciones</TableHead>
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
                                <div className="truncate" title={transaction.concept || ''}>
                                  {transaction.concept || (
                                    <span className="text-muted-foreground italic">Sin concepto</span>
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
                                {transaction.clients?.vat_number ? (
                                  <div className="font-mono text-sm">
                                    {transaction.clients.vat_number}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {transaction.type === 'income' && transaction.is_invoice ? (
                                  <Badge className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    <Receipt className="h-3 w-3" />
                                    Sí
                                  </Badge>
                                ) : transaction.type === 'income' ? (
                                  <Badge variant="outline" className="gap-1">
                                    <X className="h-3 w-3" />
                                    No
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <span className={transaction.type === 'income' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                  {formatCurrency(transaction.subtotal)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                                {formatCurrency(transaction.vat_amount)}
                              </TableCell>
                              <TableCell className="text-right font-bold whitespace-nowrap">
                                <span className={transaction.type === 'income' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                </span>
                              </TableCell>
                              <TableCell>
                                {userFilter !== 'all' ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleEditTransaction(transaction)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => setDeleteTransactionId(transaction.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="text-center text-muted-foreground text-xs">-</div>
                                )}
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

      {/* Add Transaction Dialog */}
      {userFilter !== 'all' && (
        <AddTransactionDialog
          userId={userFilter}
          userName={allUsers.find(u => u.id === userFilter)?.name || ''}
          open={addTransactionOpen}
          onClose={() => setAddTransactionOpen(false)}
          onSuccess={loadAllActivity}
        />
      )}

      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        transaction={selectedTransaction}
        userId={selectedTransaction?.user_id || ''}
        open={editTransactionOpen}
        onClose={() => {
          setEditTransactionOpen(false);
          setSelectedTransaction(null);
        }}
        onSuccess={loadAllActivity}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTransactionId} onOpenChange={() => setDeleteTransactionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La transacción será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
