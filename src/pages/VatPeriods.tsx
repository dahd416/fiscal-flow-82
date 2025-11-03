import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface VatPeriod {
  id: string;
  period_start: string;
  period_end: string;
  total_income: number;
  total_vat: number;
  payment_due_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
}

export default function VatPeriods() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<VatPeriod[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    period_start: '',
    period_end: '',
    payment_due_date: '',
    status: 'pending',
  });

  const fetchPeriods = async () => {
    const { data } = await supabase
      .from('vat_periods')
      .select('*')
      .order('period_start', { ascending: false });
    if (data) setPeriods(data as VatPeriod[]);
  };

  useEffect(() => {
    if (user) fetchPeriods();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, vat_amount')
      .gte('transaction_date', formData.period_start)
      .lte('transaction_date', formData.period_end)
      .eq('type', 'income');

    const totalIncome = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const totalVat = transactions?.reduce((sum, t) => sum + Number(t.vat_amount), 0) || 0;

    const { error } = await supabase.from('vat_periods').insert([
      {
        user_id: user!.id,
        period_start: formData.period_start,
        period_end: formData.period_end,
        total_income: totalIncome,
        total_vat: totalVat,
        payment_due_date: formData.payment_due_date || null,
        status: formData.status,
      }
    ]);

    if (error) {
      toast.error('Failed to create VAT period');
    } else {
      toast.success('VAT period created successfully');
      setOpen(false);
      setFormData({ period_start: '', period_end: '', payment_due_date: '', status: 'pending' });
      fetchPeriods();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('vat_periods')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success('Status updated');
      fetchPeriods();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">VAT Periods</h2>
            <p className="text-muted-foreground">Manage VAT reporting periods and payments</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Period
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create VAT Period</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="period_start">Period Start *</Label>
                  <Input
                    id="period_start"
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period_end">Period End *</Label>
                  <Input
                    id="period_end"
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_due_date">Payment Due Date</Label>
                  <Input
                    id="payment_due_date"
                    type="date"
                    value={formData.payment_due_date}
                    onChange={(e) => setFormData({ ...formData, payment_due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Create Period</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {periods.map((period) => (
            <Card key={period.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Period
                  </div>
                  <Badge className={getStatusColor(period.status)}>
                    {period.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <span className="font-medium">Period:</span>{' '}
                  {new Date(period.period_start).toLocaleDateString()} -{' '}
                  {new Date(period.period_end).toLocaleDateString()}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Total Income:</span> €{period.total_income.toFixed(2)}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Total VAT:</span> €{period.total_vat.toFixed(2)}
                </div>
                {period.payment_due_date && (
                  <div className="text-sm">
                    <span className="font-medium">Due:</span>{' '}
                    {new Date(period.payment_due_date).toLocaleDateString()}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(period.id, 'paid')}
                    disabled={period.status === 'paid'}
                  >
                    Mark Paid
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
