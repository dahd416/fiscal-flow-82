import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { TrendingUp, TrendingDown, ArrowUpDown, Calendar, FileText, BarChart3, PieChart, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  subtotal: number;
  vat_amount: number;
  concept: string | null;
  clients: { first_name: string; last_name: string | null } | null;
  transaction_date: string;
  quotations: { quotation_number: string; title: string } | null;
}

interface UserActivityPanelProps {
  userId: string;
  userName: string;
}

interface MonthStat {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export function UserActivityPanel({ userId, userName }: UserActivityPanelProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    transactionCount: 0,
    avgIncome: 0,
    avgExpense: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthStat[]>([]);

  useEffect(() => {
    loadUserActivity();
  }, [userId]);

  useEffect(() => {
    calculateStats();
    calculateMonthlyStats();
  }, [transactions, typeFilter, startDate, endDate]);

  const loadUserActivity = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*, quotations(quotation_number, title)')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions((data as any[])?.filter(t => t.type === 'income' || t.type === 'expense') || []);
    } catch (error) {
      console.error('Error loading user activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTransactions = () => {
    let filtered = transactions;
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }
    
    if (startDate) {
      filtered = filtered.filter(t => t.transaction_date >= startDate);
    }
    
    if (endDate) {
      filtered = filtered.filter(t => t.transaction_date <= endDate);
    }
    
    return filtered;
  };

  const calculateStats = () => {
    const filtered = getFilteredTransactions();
    
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const expenseTransactions = transactions.filter(t => t.type === 'expense');

    const income = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const expense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

    setStats({
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      transactionCount: filtered.length,
      avgIncome: incomeTransactions.length > 0 ? income / incomeTransactions.length : 0,
      avgExpense: expenseTransactions.length > 0 ? expense / expenseTransactions.length : 0,
    });
  };

  const calculateMonthlyStats = () => {
    const filtered = getFilteredTransactions();
    const monthlyMap = new Map<string, { income: number; expense: number }>();

    filtered.forEach(t => {
      const date = new Date(t.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const current = monthlyMap.get(monthKey) || { income: 0, expense: 0 };
      
      if (t.type === 'income') {
        current.income += t.amount;
      } else {
        current.expense += t.amount;
      }
      
      monthlyMap.set(monthKey, current);
    });

    const monthlyStats: MonthStat[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        balance: data.income - data.expense
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6);

    setMonthlyData(monthlyStats);
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const filteredTransactions = getFilteredTransactions();

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
      {/* Header with User Info */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{userName}</CardTitle>
              <CardDescription>Actividad financiera completa</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Total Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {formatCurrency(stats.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Promedio: {formatCurrency(stats.avgIncome)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Total Egresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {formatCurrency(stats.totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Promedio: {formatCurrency(stats.avgExpense)}
            </p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${
          stats.balance >= 0 
            ? 'border-green-300 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10' 
            : 'border-red-300 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10'
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Balance Neto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              stats.balance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
            }`}>
              {formatCurrency(stats.balance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.balance >= 0 ? 'Superávit' : 'Déficit'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Transacciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {stats.transactionCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total registradas
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              Periodo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
              {startDate && endDate ? 'Filtrado' : 'Completo'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {startDate && endDate ? 'Rango activo' : 'Todos los registros'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="type-filter">Tipo de Transacción</Label>
              <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                <SelectTrigger id="type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Transacciones</SelectItem>
                  <SelectItem value="income">Solo Ingresos</SelectItem>
                  <SelectItem value="expense">Solo Egresos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="start-date">Fecha Inicio</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="end-date">Fecha Fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {(typeFilter !== 'all' || startDate || endDate) && (
              <Button variant="outline" onClick={clearFilters}>
                Limpiar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions" className="gap-2">
            <FileText className="h-4 w-4" />
            Transacciones
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Mensual
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Historial de Transacciones
                  <Badge variant="secondary">{filteredTransactions.length}</Badge>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowUpDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay transacciones para mostrar</p>
                  <p className="text-sm mt-2">Prueba ajustando los filtros</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Fecha</TableHead>
                          <TableHead className="w-[100px]">Tipo</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead className="w-[180px]">Cotización</TableHead>
                          <TableHead className="text-right w-[120px]">Subtotal</TableHead>
                          <TableHead className="text-right w-[100px]">IVA</TableHead>
                          <TableHead className="text-right w-[120px]">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((transaction) => (
                          <TableRow key={transaction.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium whitespace-nowrap">
                              {new Date(transaction.transaction_date).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
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
                            <TableCell className="max-w-[200px]">
                              <div className="truncate" title={transaction.concept || ''}>
                                {transaction.concept || (
                                  <span className="text-muted-foreground italic">Sin concepto</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {transaction.quotations ? (
                                <div className="text-xs">
                                  <span className="font-mono block font-semibold">{transaction.quotations.quotation_number}</span>
                                  <span className="text-muted-foreground truncate block max-w-[160px]" title={transaction.quotations.title}>
                                    {transaction.quotations.title}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Tab */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Resumen Mensual (Últimos 6 meses)
              </CardTitle>
              <CardDescription>
                Comparación de ingresos y egresos por mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay datos mensuales disponibles</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {monthlyData.map((month, idx) => {
                    const monthDate = new Date(month.month + '-01');
                    const monthName = monthDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
                    const maxAmount = Math.max(month.income, month.expense);
                    
                    return (
                      <div key={idx} className="space-y-3 pb-6 border-b last:border-b-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold capitalize">{monthName}</h4>
                          <Badge variant={month.balance >= 0 ? "default" : "destructive"}>
                            Balance: {formatCurrency(month.balance)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                <TrendingUp className="h-4 w-4" />
                                Ingresos
                              </span>
                              <span className="font-semibold text-green-700 dark:text-green-400">
                                {formatCurrency(month.income)}
                              </span>
                            </div>
                            <div className="bg-muted rounded-full h-3 overflow-hidden">
                              <div 
                                className="h-full bg-green-500"
                                style={{ width: `${maxAmount > 0 ? (month.income / maxAmount) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                <TrendingDown className="h-4 w-4" />
                                Egresos
                              </span>
                              <span className="font-semibold text-red-700 dark:text-red-400">
                                {formatCurrency(month.expense)}
                              </span>
                            </div>
                            <div className="bg-muted rounded-full h-3 overflow-hidden">
                              <div 
                                className="h-full bg-red-500"
                                style={{ width: `${maxAmount > 0 ? (month.expense / maxAmount) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
