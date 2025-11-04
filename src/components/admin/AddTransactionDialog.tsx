import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

interface AddTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onSuccess: () => void;
}

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('El monto debe ser mayor a cero'),
  vat_rate: z.number().min(0).max(100),
  concept: z.string().min(1, 'El concepto es requerido').max(200),
  description: z.string().max(500).optional(),
  folio: z.string().max(50).optional(),
  payment_method: z.string().min(1, 'El método de pago es requerido'),
  transaction_date: z.string().min(1, 'La fecha es requerida'),
});

export function AddTransactionDialog({ open, onClose, userId, userName, onSuccess }: AddTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    vat_rate: '16',
    concept: '',
    description: '',
    folio: '',
    payment_method: 'efectivo',
    is_invoice: false,
    transaction_date: new Date().toISOString().split('T')[0],
    client_id: '',
    provider_id: '',
  });

  useEffect(() => {
    if (open) {
      loadClients();
      loadProviders();
    }
  }, [open]);

  const loadClients = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(
        `https://fpmkrchfjbftgnbmvahc.supabase.co/functions/v1/admin-get-user-clients?userId=${userId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error fetching clients');
      }

      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadProviders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(
        `https://fpmkrchfjbftgnbmvahc.supabase.co/functions/v1/admin-get-user-providers?userId=${userId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error fetching providers');
      }

      const data = await response.json();
      setProviders(data.providers || []);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const calculateAmounts = () => {
    const amount = parseFloat(formData.amount) || 0;
    const vatRate = parseFloat(formData.vat_rate) || 0;
    
    // Calcular subtotal e IVA desde el monto total
    const subtotal = amount / (1 + vatRate / 100);
    const vat_amount = amount - subtotal;
    
    return {
      subtotal: Number(subtotal.toFixed(2)),
      vat_amount: Number(vat_amount.toFixed(2)),
      total: Number(amount.toFixed(2)),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validar datos con zod
      const validatedData = transactionSchema.parse({
        type: formData.type,
        amount: parseFloat(formData.amount),
        vat_rate: parseFloat(formData.vat_rate),
        concept: formData.concept.trim(),
        description: formData.description?.trim() || undefined,
        folio: formData.folio?.trim() || undefined,
        payment_method: formData.payment_method,
        transaction_date: formData.transaction_date,
      });

      setLoading(true);

      const amounts = calculateAmounts();

      // Usar edge function para insertar transacción
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(
        'https://fpmkrchfjbftgnbmvahc.supabase.co/functions/v1/admin-manage-user-transaction',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create',
            transactionData: {
              user_id: userId,
              type: validatedData.type,
              amount: amounts.total,
              subtotal: amounts.subtotal,
              vat_rate: validatedData.vat_rate,
              vat_amount: amounts.vat_amount,
              concept: validatedData.concept,
              description: validatedData.description || null,
              folio: validatedData.folio || null,
              payment_method: validatedData.payment_method,
              is_invoice: formData.is_invoice,
              transaction_date: validatedData.transaction_date,
              client_id: formData.client_id || null,
              provider_id: formData.provider_id || null,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creating transaction');
      }

      toast.success(`${validatedData.type === 'income' ? 'Ingreso' : 'Egreso'} agregado correctamente`);
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        toast.error('Error al guardar la transacción');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      type: 'income',
      amount: '',
      vat_rate: '16',
      concept: '',
      description: '',
      folio: '',
      payment_method: 'efectivo',
      is_invoice: false,
      transaction_date: new Date().toISOString().split('T')[0],
      client_id: '',
      provider_id: '',
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Transacción</DialogTitle>
          <DialogDescription>
            Crear una nueva transacción para {userName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Egreso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_date">Fecha *</Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                required
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto Total *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vat_rate">Tasa IVA (%)</Label>
              <Input
                id="vat_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.vat_rate}
                onChange={(e) => setFormData({ ...formData, vat_rate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="concept">Concepto *</Label>
            <Input
              id="concept"
              value={formData.concept}
              onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
              placeholder="Ej: Servicios de consultoría"
              required
              maxLength={200}
            />
          </div>

          {formData.type === 'income' && (
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger id="client_id">
                  <SelectValue placeholder="Seleccionar cliente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.first_name} {client.last_name || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.type === 'expense' && (
            <div className="space-y-2">
              <Label htmlFor="provider_id">Proveedor</Label>
              <Select
                value={formData.provider_id}
                onValueChange={(value) => setFormData({ ...formData, provider_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger id="provider_id">
                  <SelectValue placeholder="Seleccionar proveedor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proveedor</SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_method">Método de Pago *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger id="payment_method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="folio">Folio / Factura</Label>
              <Input
                id="folio"
                value={formData.folio}
                onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
                placeholder="Opcional"
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalles adicionales (opcional)"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_invoice"
              checked={formData.is_invoice}
              onCheckedChange={(checked) => setFormData({ ...formData, is_invoice: !!checked })}
            />
            <Label htmlFor="is_invoice" className="text-sm font-normal cursor-pointer">
              Requiere factura
            </Label>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Transacción'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
