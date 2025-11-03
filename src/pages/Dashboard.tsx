import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, Users, Receipt, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalVAT: 0,
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
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalVAT = transactions.reduce((sum, t) => sum + Number(t.vat_amount), 0);

      setStats({
        totalIncome,
        totalExpenses,
        totalVAT,
        clientCount: clientsRes.count || 0,
        transactionCount: transactions.length,
      });
    };

    fetchStats();
  }, [user]);

  const statCards = [
    {
      title: 'Total Income',
      value: `€${stats.totalIncome.toFixed(2)}`,
      icon: DollarSign,
      description: 'Total revenue generated',
    },
    {
      title: 'Total Expenses',
      value: `€${stats.totalExpenses.toFixed(2)}`,
      icon: Receipt,
      description: 'Total expenses recorded',
    },
    {
      title: 'Total VAT',
      value: `€${stats.totalVAT.toFixed(2)}`,
      icon: TrendingUp,
      description: 'VAT collected',
    },
    {
      title: 'Clients',
      value: stats.clientCount,
      icon: Users,
      description: `${stats.transactionCount} transactions`,
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your financial metrics
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
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
