import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, Users, Receipt, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
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

  const financialCards = [
    {
      title: 'Saldo Inicial',
      value: `€${stats.saldoInicial.toFixed(2)}`,
      icon: DollarSign,
    },
    {
      title: 'Ingresos',
      value: `€${stats.ingresos.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      title: 'Egresos',
      value: `€${stats.egresos.toFixed(2)}`,
      icon: Receipt,
      color: 'text-red-600',
    },
    {
      title: 'Utilidad antes de Impuestos',
      value: `€${stats.utilidadAntesImpuestos.toFixed(2)}`,
      icon: TrendingUp,
    },
    {
      title: 'Resguardo de Impuestos (30%)',
      value: `€${stats.resguardoImpuestos.toFixed(2)}`,
      icon: Receipt,
    },
    {
      title: 'Impuestos a Pagar (IVA)',
      value: `€${stats.impuestosAPagar.toFixed(2)}`,
      icon: Receipt,
    },
    {
      title: 'Utilidad después de Impuestos',
      value: `€${stats.utilidadDespuesImpuestos.toFixed(2)}`,
      icon: TrendingUp,
    },
    {
      title: 'Rendimiento',
      value: `${stats.rendimiento.toFixed(2)}%`,
      icon: TrendingUp,
    },
    {
      title: 'Dinero Disponible',
      value: `€${stats.dineroDisponible.toFixed(2)}`,
      icon: DollarSign,
    },
    {
      title: 'Efectivo',
      value: `€${stats.efectivo.toFixed(2)}`,
      icon: DollarSign,
    },
    {
      title: 'Tarjeta',
      value: `€${stats.tarjeta.toFixed(2)}`,
      icon: DollarSign,
    },
    {
      title: 'Total',
      value: `€${stats.total.toFixed(2)}`,
      icon: DollarSign,
    },
    {
      title: 'Diferencia',
      value: `€${stats.diferencia.toFixed(2)}`,
      icon: TrendingUp,
      color: stats.diferencia >= 0 ? 'text-green-600' : 'text-red-600',
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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Panel de Control</h2>
          <p className="text-muted-foreground">
            Resumen completo de tus métricas financieras
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {financialCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color || 'text-muted-foreground'}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color || ''}`}>{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summaryCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
