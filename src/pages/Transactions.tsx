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
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  concept: string | null;
  folio: string | null;
  payment_method: string | null;
  is_invoice: boolean;
  transaction_date: string;
  client_id: string | null;
  quotation_id: string | null;
  clients: { first_name: string; last_name: string | null } | null;
  quotations: { quotation_number: string; title: string; vat_amount: number; subtotal: number; total_amount: number } | null;
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    vat_rate: '16',
    concept: '',
    folio: '',
    payment_method: '',
    is_invoice: false,
    transaction_date: new Date().toISOString().split('T')[0],
    client_id: '',
    quotation_id: '',
  });

  const fetchData = async () => {
    const [transactionsRes, clientsRes, quotationsRes] = await Promise.all([
      supabase.from('transactions').select('*, clients(first_name, last_name), quotations(quotation_number, title, vat_amount, subtotal, total_amount)').order('transaction_date', { ascending: false }),
      supabase.from('clients').select('id, first_name, last_name'),
      supabase.from('quotations').select('id, quotation_number, title, status, vat_amount, subtotal, total_amount').eq('status', 'accepted').order('quotation_number', { ascending: false }),
    ]);
    if (transactionsRes.data) setTransactions(transactionsRes.data as Transaction[]);
    if (clientsRes.data) setClients(clientsRes.data);
    if (quotationsRes.data) setQuotations(quotationsRes.data);
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const handleQuotationChange = (quotationId: string) => {
    const selectedQuotation = quotations.find(q => q.id === quotationId);
    if (selectedQuotation) {
      // Calculate VAT rate from quotation
      const vatRate = selectedQuotation.subtotal > 0 
        ? (selectedQuotation.vat_amount / selectedQuotation.subtotal * 100).toFixed(2)
        : '16';
      
      // Auto-fill fields from quotation - usar subtotal, no total
      setFormData({
        ...formData,
        quotation_id: quotationId,
        folio: `NV-${selectedQuotation.quotation_number}`, // Convertir a nota de venta
        amount: selectedQuotation.subtotal.toString(), // Usar subtotal
        vat_rate: vatRate,
      });
    } else {
      setFormData({
        ...formData,
        quotation_id: quotationId,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que se haya seleccionado forma de pago
    if (!formData.payment_method) {
      toast.error('Por favor selecciona una forma de pago');
      return;
    }
    
    // El amount ingresado es el SUBTOTAL (sin IVA)
    const subtotal = parseFloat(formData.amount);
    const vatRate = parseFloat(formData.vat_rate);
    const vatAmount = (subtotal * vatRate) / 100;
    const total = subtotal + vatAmount;

    const { error } = await supabase.from('transactions').insert([
      {
        user_id: user!.id,
        type: formData.type,
        subtotal,
        amount: total, // El total incluyendo IVA
        vat_rate: vatRate,
        vat_amount: vatAmount,
        concept: formData.concept || null,
        folio: formData.folio || null,
        payment_method: formData.payment_method || null,
        is_invoice: formData.is_invoice,
        transaction_date: formData.transaction_date,
        client_id: formData.client_id || null,
        quotation_id: formData.quotation_id || null,
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
        vat_rate: '16',
        concept: '',
        folio: '',
        payment_method: '',
        is_invoice: false,
        transaction_date: new Date().toISOString().split('T')[0],
        client_id: '',
        quotation_id: '',
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

                {formData.type === 'income' && (
                  <div className="space-y-2">
                    <Label>Cotización (opcional)</Label>
                    <Select value={formData.quotation_id} onValueChange={handleQuotationChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Vincular con cotización aceptada" />
                      </SelectTrigger>
                      <SelectContent>
                        {quotations.map((quotation) => (
                          <SelectItem key={quotation.id} value={quotation.id}>
                            {quotation.quotation_number} - {quotation.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Al vincular una cotización, se autocompletarán los datos y se marcará como completada
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="folio">Folio / Nota de Venta</Label>
                  <Input
                    id="folio"
                    value={formData.folio}
                    onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
                    placeholder="Ej: NV-001"
                  />
                  <p className="text-xs text-muted-foreground">
                    Se genera automáticamente si viene de cotización
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Subtotal (sin IVA) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Ingresa el monto sin IVA. El IVA se calculará automáticamente.
                  </p>
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
                  <Label>Forma de Pago *</Label>
                  <Select 
                    value={formData.payment_method} 
                    onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar forma de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_invoice"
                    checked={formData.is_invoice}
                    onChange={(e) => setFormData({ ...formData, is_invoice: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="is_invoice" className="cursor-pointer">
                    ¿Es factura?
                  </Label>
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
                          {client.first_name} {client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concept">Concepto</Label>
                  <Input
                    id="concept"
                    value={formData.concept}
                    onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                    placeholder="Descripción del concepto"
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
                <TableHead>Folio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Cotización</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Forma de Pago</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {transaction.folio ? (
                      <span className="font-mono text-xs">{transaction.folio}</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className="capitalize">{transaction.type === 'income' ? 'Ingreso' : 'Gasto'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {transaction.clients 
                      ? `${transaction.clients.first_name} ${transaction.clients.last_name || ''}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {transaction.quotations ? (
                      <div className="text-xs">
                        <span className="font-mono">{transaction.quotations.quotation_number}</span>
                        <br />
                        <span className="text-muted-foreground">{transaction.quotations.title}</span>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{transaction.concept || '-'}</TableCell>
                  <TableCell>
                    {transaction.payment_method ? (
                      <span className="capitalize">{transaction.payment_method}</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {transaction.is_invoice ? (
                      <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">Sí</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 px-2 py-1 rounded">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(transaction.subtotal)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(transaction.vat_amount)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(transaction.amount)}
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
