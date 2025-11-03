import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  vat_rate: number;
  vat_amount: number;
  description: string | null;
  category: string | null;
  transaction_date: string;
  client_id: string | null;
  clients: { name: string } | null;
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    vat_rate: '21',
    description: '',
    category: '',
    transaction_date: new Date().toISOString().split('T')[0],
    client_id: '',
  });

  const fetchData = async () => {
    const [transactionsRes, clientsRes] = await Promise.all([
      supabase.from('transactions').select('*, clients(name)').order('transaction_date', { ascending: false }),
      supabase.from('clients').select('id, name'),
    ]);
    if (transactionsRes.data) setTransactions(transactionsRes.data as Transaction[]);
    if (clientsRes.data) setClients(clientsRes.data);
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    const vatRate = parseFloat(formData.vat_rate);
    const vatAmount = (amount * vatRate) / 100;

    const { error } = await supabase.from('transactions').insert([
      {
        user_id: user!.id,
        type: formData.type,
        amount,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        description: formData.description || null,
        category: formData.category || null,
        transaction_date: formData.transaction_date,
        client_id: formData.client_id || null,
      }
    ]);

    if (error) {
      toast.error('Error al agregar transacción');
    } else {
      toast.success('Transacción agregada exitosamente');
      setOpen(false);
      setFormData({
        type: 'income',
        amount: '',
        vat_rate: '21',
        description: '',
        category: '',
        transaction_date: new Date().toISOString().split('T')[0],
        client_id: '',
      });
      fetchData();
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Transacciones</h2>
            <p className="text-muted-foreground">Rastrea todos tus ingresos y gastos</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar Transacción
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nueva Transacción</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Ingreso</SelectItem>
                      <SelectItem value="expense">Gasto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto (€) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vat_rate">Tasa de IVA (%)</Label>
                  <Input
                    id="vat_rate"
                    type="number"
                    step="0.01"
                    value={formData.vat_rate}
                    onChange={(e) => setFormData({ ...formData, vat_rate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Agregar Transacción</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">IVA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className="capitalize">{transaction.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{transaction.clients?.name || '-'}</TableCell>
                  <TableCell>{transaction.description || '-'}</TableCell>
                  <TableCell>{transaction.category || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(transaction.vat_amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
