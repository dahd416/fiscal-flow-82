import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { DollarSign, Users, Receipt, TrendingUp, TrendingDown, Wallet, CreditCard, AlertCircle, PiggyBank, FileText, Shield, Calendar, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercentage } from '@/lib/currency';

export default function Dashboard() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [filterType, setFilterType] = useState<'all' | 'month' | 'range'>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState({
    saldoInicial: 0,
    ingresos: 0,
    egresos: 0,
    ingresosSubtotal: 0,
    egresosSubtotal: 0,
    ingresosIVA: 0,
    egresosIVA: 0,
    utilidadAntesImpuestos: 0,
    resguardoImpuestos: 0,
    impuestosAPagar: 0,
    utilidadDespuesImpuestos: 0,
    rendimiento: 0,
    dineroDisponible: 0,
    efectivo: 0,
    tarjeta: 0,
    total: 0,
    diferencia: 0,
    clientCount: 0,
    transactionCount: 0,
  });

  const getDateFilter = () => {
    if (filterType === 'month') {
      const [year, month] = selectedMonth.split('-');
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
      return {
        start: startOfMonth.toISOString().split('T')[0],
        end: endOfMonth.toISOString().split('T')[0]
      };
    } else if (filterType === 'range' && startDate && endDate) {
      return { start: startDate, end: endDate };
    }
    return null;
  };

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const dateFilter = getDateFilter();
      
      const [clientsRes, transactionsRes] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*'),
      ]);

      let transactions = transactionsRes.data || [];
      
      // Aplicar filtro de fechas si existe
      if (dateFilter) {
        transactions = transactions.filter(t => {
          const transactionDate = t.transaction_date;
          return transactionDate >= dateFilter.start && transactionDate <= dateFilter.end;
        });
      }
      
      // Calcular Ingresos y Egresos (subtotal + IVA = amount)
      const ingresos = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const egresos = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Calcular subtotales (sin IVA)
      const ingresosSubtotal = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.subtotal || 0), 0);
      const egresosSubtotal = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.subtotal || 0), 0);
      
      // Calcular IVA
      const ingresosIVA = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.vat_amount || 0), 0);
      const egresosIVA = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.vat_amount || 0), 0);
      
      // Saldo Inicial (por ahora en 0, se puede configurar después)
      const saldoInicial = 0;
      
      // Utilidad antes de Impuestos
      const utilidadAntesImpuestos = ingresos - egresos;
      
      // Resguardo de Impuestos (30% de la utilidad)
      const resguardoImpuestos = utilidadAntesImpuestos * 0.30;
      
      // Impuestos a pagar (IVA recaudado)
      const impuestosAPagar = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.vat_amount), 0);
      
      // Utilidad después de Impuestos
      const utilidadDespuesImpuestos = utilidadAntesImpuestos - resguardoImpuestos;
      
      // Rendimiento (porcentaje de utilidad sobre ingresos)
      const rendimiento = ingresos > 0 ? (utilidadAntesImpuestos / ingresos) * 100 : 0;
      
      // Dinero Disponible
      const dineroDisponible = saldoInicial + utilidadDespuesImpuestos;
      
      // Efectivo y Tarjeta (distribución 50/50 por defecto, se puede ajustar)
      const efectivo = dineroDisponible * 0.5;
      const tarjeta = dineroDisponible * 0.5;
      
      // Total
      const total = efectivo + tarjeta;
      
      // Diferencia
      const diferencia = total - dineroDisponible;

      setStats({
        saldoInicial,
        ingresos,
        egresos,
        ingresosSubtotal,
        egresosSubtotal,
        ingresosIVA,
        egresosIVA,
        utilidadAntesImpuestos,
        resguardoImpuestos,
        impuestosAPagar,
        utilidadDespuesImpuestos,
        rendimiento,
        dineroDisponible,
        efectivo,
        tarjeta,
        total,
        diferencia,
        clientCount: clientsRes.count || 0,
        transactionCount: transactions.length,
      });
    };

    fetchStats();
  }, [user, filterType, selectedMonth, startDate, endDate]);

  const chartData = [
    {
      name: 'Ingresos',
      subtotal: stats.ingresosSubtotal,
      iva: stats.ingresosIVA,
    },
    {
      name: 'Egresos',
      subtotal: stats.egresosSubtotal,
      iva: stats.egresosIVA,
    },
  ];

  const mainCards = [
    {
      title: 'Ingresos Totales',
      value: formatCurrency(stats.ingresos),
      description: 'Total de entradas',
      icon: TrendingUp,
      colorClass: 'text-[hsl(var(--success))]',
      bgClass: 'bg-[hsl(var(--success)/0.1)]',
    },
    {
      title: 'Egresos Totales',
      value: formatCurrency(stats.egresos),
      description: 'Total de salidas',
      icon: TrendingDown,
      colorClass: 'text-[hsl(var(--destructive))]',
      bgClass: 'bg-[hsl(var(--destructive)/0.1)]',
    },
    {
      title: 'Utilidad Después de Impuestos',
      value: formatCurrency(stats.utilidadDespuesImpuestos),
      description: 'Ganancia neta disponible',
      icon: TrendingUp,
      colorClass: stats.utilidadDespuesImpuestos >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]',
      bgClass: stats.utilidadDespuesImpuestos >= 0 ? 'bg-[hsl(var(--success)/0.1)]' : 'bg-[hsl(var(--destructive)/0.1)]',
    },
    {
      title: 'Dinero Disponible',
      value: formatCurrency(stats.dineroDisponible),
      description: 'Capital de trabajo',
      icon: Wallet,
      colorClass: 'text-[hsl(var(--primary))]',
      bgClass: 'bg-[hsl(var(--primary)/0.1)]',
    },
  ];

  const rentabilidadCards = [
    {
      title: 'Saldo Inicial',
      value: formatCurrency(stats.saldoInicial),
      icon: PiggyBank,
    },
    {
      title: 'Utilidad antes de Impuestos',
      value: formatCurrency(stats.utilidadAntesImpuestos),
      icon: TrendingUp,
      colorClass: stats.utilidadAntesImpuestos >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]',
    },
    {
      title: 'Rendimiento',
      value: formatPercentage(stats.rendimiento),
      icon: TrendingUp,
      colorClass: stats.rendimiento >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]',
    },
  ];

  const impuestosCards = [
    {
      title: 'Resguardo de Impuestos (30%)',
      value: formatCurrency(stats.resguardoImpuestos),
      icon: AlertCircle,
      colorClass: 'text-[hsl(var(--warning))]',
    },
    {
      title: 'Impuestos a Pagar (IVA)',
      value: formatCurrency(stats.impuestosAPagar),
      icon: FileText,
      colorClass: 'text-[hsl(var(--warning))]',
    },
  ];

  const liquidezCards = [
    {
      title: 'Efectivo',
      value: formatCurrency(stats.efectivo),
      icon: DollarSign,
    },
    {
      title: 'Tarjeta',
      value: formatCurrency(stats.tarjeta),
      icon: CreditCard,
    },
    {
      title: 'Total',
      value: formatCurrency(stats.total),
      icon: Wallet,
    },
    {
      title: 'Diferencia',
      value: formatCurrency(stats.diferencia),
      icon: TrendingUp,
      colorClass: stats.diferencia >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]',
    },
  ];

  const summaryCards = [
    {
      title: 'Clientes',
      value: stats.clientCount,
      icon: Users,
      description: `${stats.transactionCount} transacciones`,
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold tracking-tight">Panel de Control</h2>
                {isAdmin && (
                  <Badge variant="default" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                {isAdmin 
                  ? 'Gestión financiera de tu negocio personal' 
                  : 'Resumen completo de tus métricas financieras'
                }
              </p>
            </div>
          </div>

          {/* Filtro de Fechas */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle>Filtrar por Fecha</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Filtro</Label>
                    <Select value={filterType} onValueChange={(value: 'all' | 'month' | 'range') => setFilterType(value)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todo el periodo</SelectItem>
                        <SelectItem value="month">Por mes</SelectItem>
                        <SelectItem value="range">Rango personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {filterType === 'month' && (
                    <div className="space-y-2">
                      <Label htmlFor="month-filter">Mes</Label>
                      <Input
                        id="month-filter"
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-[200px]"
                      />
                    </div>
                  )}

                  {filterType === 'range' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="start-date">Fecha Inicio</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-[180px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date">Fecha Fin</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-[180px]"
                        />
                      </div>
                    </>
                  )}

                  {filterType !== 'all' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilterType('all');
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Limpiar
                    </Button>
                  )}
                </div>

                {filterType !== 'all' && (
                  <div className="text-sm text-muted-foreground">
                    {filterType === 'month' && `Mostrando datos de: ${new Date(selectedMonth + '-01').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`}
                    {filterType === 'range' && startDate && endDate && `Mostrando datos desde ${new Date(startDate).toLocaleDateString('es-MX')} hasta ${new Date(endDate).toLocaleDateString('es-MX')}`}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tarjetas Principales Destacadas */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {mainCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${card.bgClass}`}>
                      <Icon className={`h-5 w-5 ${card.colorClass}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${card.colorClass}`}>
                    {card.value}
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {card.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Gráfico de Comparación */}
        <Card>
          <CardHeader>
            <CardTitle>Comparación Ingresos vs Egresos</CardTitle>
            <CardDescription>Visualización de tus flujos financieros (Subtotal + IVA)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-sm" />
                <YAxis className="text-sm" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar 
                  dataKey="subtotal" 
                  stackId="stack" 
                  name="Subtotal"
                  radius={[0, 0, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.name === 'Ingresos' ? 'hsl(142.1 76.2% 36.3%)' : 'hsl(0 84.2% 60.2%)'}
                    />
                  ))}
                </Bar>
                <Bar 
                  dataKey="iva" 
                  stackId="stack" 
                  name="IVA"
                  radius={[8, 8, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-iva-${index}`}
                      fill={entry.name === 'Ingresos' ? 'hsl(142.1 70% 65%)' : 'hsl(350 89% 77%)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sección: Análisis de Rentabilidad */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold">Análisis de Rentabilidad</h3>
            <p className="text-sm text-muted-foreground">Métricas de desempeño financiero</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rentabilidadCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {card.title}
                    </CardTitle>
                    <Icon className={`h-4 w-4 ${card.colorClass || 'text-muted-foreground'}`} />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${card.colorClass || ''}`}>
                      {card.value}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Sección: Gestión Fiscal */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold">Gestión Fiscal</h3>
            <p className="text-sm text-muted-foreground">Control de impuestos y obligaciones</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {impuestosCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {card.title}
                    </CardTitle>
                    <Icon className={`h-4 w-4 ${card.colorClass || 'text-muted-foreground'}`} />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${card.colorClass || ''}`}>
                      {card.value}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Sección: Liquidez */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold">Liquidez</h3>
            <p className="text-sm text-muted-foreground">Distribución de efectivo disponible</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {liquidezCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {card.title}
                    </CardTitle>
                    <Icon className={`h-4 w-4 ${card.colorClass || 'text-muted-foreground'}`} />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${card.colorClass || ''}`}>
                      {card.value}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Sección: Estadísticas */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold">Estadísticas</h3>
            <p className="text-sm text-muted-foreground">Resumen de actividad</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {card.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{card.value}</div>
                    <p className="text-xs text-muted-foreground">
                      {card.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
