import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { DollarSign, Users, Receipt, TrendingUp, TrendingDown, Wallet, CreditCard, AlertCircle, PiggyBank, FileText, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercentage } from '@/lib/currency';

export default function Dashboard() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [stats, setStats] = useState({
    saldoInicial: 0,
    ingresos: 0,
    egresos: 0,
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

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const [clientsRes, transactionsRes] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*'),
      ]);

      const transactions = transactionsRes.data || [];
      
      // Calcular Ingresos y Egresos
      const ingresos = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const egresos = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
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
  }, [user]);

  const chartData = [
    {
      name: 'Ingresos',
      valor: stats.ingresos,
      fill: 'hsl(var(--success))',
    },
    {
      name: 'Egresos',
      valor: stats.egresos,
      fill: 'hsl(var(--destructive))',
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
            <CardDescription>Visualización de tus flujos financieros</CardDescription>
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
                <Bar dataKey="valor" fill="currentColor" radius={[8, 8, 0, 0]} />
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
