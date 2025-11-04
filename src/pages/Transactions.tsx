import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, TrendingUp, TrendingDown, Pencil, Trash2 } from 'lucide-react';
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
  description: string | null;
  folio: string | null;
  payment_method: string | null;
  is_invoice: boolean;
  transaction_date: string;
  client_id: string | null;
  provider_id: string | null;
  quotation_id: string | null;
  clients: { first_name: string; last_name: string | null } | null;
  providers: { name: string } | null;
  quotations: { quotation_number: string; title: string; vat_amount: number; subtotal: number; total_amount: number } | null;
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [concepts, setConcepts] = useState<string[]>([]);
  const [filteredConcepts, setFilteredConcepts] = useState<string[]>([]);
  const [showConceptSuggestions, setShowConceptSuggestions] = useState(false);
  const [filteredProviders, setFilteredProviders] = useState<any[]>([]);
  const [showProviderSuggestions, setShowProviderSuggestions] = useState(false);
  const [providerSearchText, setProviderSearchText] = useState('');
  const [open, setOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [editingConcept, setEditingConcept] = useState<string | null>(null);
  const [editProviderDialog, setEditProviderDialog] = useState(false);
  const [editConceptDialog, setEditConceptDialog] = useState(false);
  const [editProviderForm, setEditProviderForm] = useState({
    name: '',
    vat_number: '',
    phone: '',
    email: '',
    address: '',
  });
  const [editConceptText, setEditConceptText] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    vat_rate: '16',
    concept: '',
    description: '',
    folio: '',
    payment_method: '',
    is_invoice: false,
    transaction_date: new Date().toISOString().split('T')[0],
    client_id: '',
    provider_id: '',
    quotation_id: '',
  });

  const fetchData = async () => {
    const [transactionsRes, clientsRes, providersRes, quotationsRes, conceptsRes] = await Promise.all([
      supabase.from('transactions').select('*, clients(first_name, last_name), providers(name), quotations(quotation_number, title, vat_amount, subtotal, total_amount)').order('transaction_date', { ascending: false }),
      supabase.from('clients').select('id, first_name, last_name'),
      supabase.from('providers').select('id, name'),
      supabase.from('quotations').select('id, quotation_number, title, status, vat_amount, subtotal, total_amount').eq('status', 'accepted').order('quotation_number', { ascending: false }),
      supabase.from('transaction_concepts').select('concept').order('usage_count', { ascending: false }).limit(50),
    ]);
    if (transactionsRes.data) setTransactions(transactionsRes.data as Transaction[]);
    if (clientsRes.data) setClients(clientsRes.data);
    if (providersRes.data) setProviders(providersRes.data);
    if (quotationsRes.data) setQuotations(quotationsRes.data);
    if (conceptsRes.data) setConcepts(conceptsRes.data.map(c => c.concept));
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

  const handleProviderSearchChange = (value: string) => {
    setProviderSearchText(value);
    // Si el texto cambia, limpiar la selección actual
    setFormData({ ...formData, provider_id: '' });
    
    if (value.trim()) {
      const filtered = providers.filter(p => 
        p.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredProviders(filtered);
      setShowProviderSuggestions(true);
    } else {
      setFilteredProviders(providers);
      setShowProviderSuggestions(false);
    }
  };

  const selectProvider = (provider: any) => {
    setProviderSearchText(provider.name);
    setFormData({ ...formData, provider_id: provider.id });
    setShowProviderSuggestions(false);
  };

  const handleConceptChange = (value: string) => {
    setFormData({ ...formData, concept: value });
    if (value.trim()) {
      const filtered = concepts.filter(c => 
        c.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredConcepts(filtered);
      setShowConceptSuggestions(filtered.length > 0);
    } else {
      setShowConceptSuggestions(false);
    }
  };

  const selectConcept = (concept: string) => {
    setFormData({ ...formData, concept });
    setShowConceptSuggestions(false);
  };

  const handleDeleteProvider = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await supabase.from('providers').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar proveedor');
    } else {
      toast.success('Proveedor eliminado');
      fetchData();
      setProviderSearchText('');
      setFormData({ ...formData, provider_id: '' });
    }
  };

  const handleEditProvider = async (e: React.MouseEvent, provider: any) => {
    e.stopPropagation();
    setEditingProvider(provider);
    setEditProviderForm({
      name: provider.name,
      vat_number: provider.vat_number || '',
      phone: provider.phone || '',
      email: provider.email || '',
      address: provider.address || '',
    });
    setEditProviderDialog(true);
    setShowProviderSuggestions(false);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProvider) {
      const { error } = await supabase
        .from('providers')
        .update(editProviderForm)
        .eq('id', editingProvider.id);
      
      if (error) {
        toast.error('Error al actualizar proveedor');
      } else {
        toast.success('Proveedor actualizado');
        setEditProviderDialog(false);
        setEditingProvider(null);
        fetchData();
      }
    }
  };

  const handleDeleteConcept = async (e: React.MouseEvent, concept: string) => {
    e.stopPropagation();
    const { data } = await supabase
      .from('transaction_concepts')
      .select('id')
      .eq('user_id', user!.id)
      .eq('concept', concept)
      .single();
    
    if (data) {
      const { error } = await supabase.from('transaction_concepts').delete().eq('id', data.id);
      if (error) {
        toast.error('Error al eliminar concepto');
      } else {
        toast.success('Concepto eliminado');
        fetchData();
        if (formData.concept === concept) {
          setFormData({ ...formData, concept: '' });
        }
      }
    }
  };

  const handleEditConcept = async (e: React.MouseEvent, concept: string) => {
    e.stopPropagation();
    setEditingConcept(concept);
    setEditConceptText(concept);
    setEditConceptDialog(true);
    setShowConceptSuggestions(false);
  };

  const handleSaveConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConcept || !editConceptText.trim()) return;

    const { data } = await supabase
      .from('transaction_concepts')
      .select('id')
      .eq('user_id', user!.id)
      .eq('concept', editingConcept)
      .single();

    if (data) {
      const { error } = await supabase
        .from('transaction_concepts')
        .update({ concept: editConceptText.trim() })
        .eq('id', data.id);

      if (error) {
        toast.error('Error al actualizar concepto');
      } else {
        toast.success('Concepto actualizado');
        setEditConceptDialog(false);
        setEditingConcept(null);
        fetchData();
      }
    }
  };

  const saveOrUpdateConcept = async (concept: string) => {
    if (!concept.trim()) return;
    
    const { data: existing } = await supabase
      .from('transaction_concepts')
      .select('id, usage_count')
      .eq('user_id', user!.id)
      .eq('concept', concept)
      .single();

    if (existing) {
      await supabase
        .from('transaction_concepts')
        .update({ 
          usage_count: existing.usage_count + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('transaction_concepts')
        .insert([{
          user_id: user!.id,
          concept,
          usage_count: 1
        }]);
    }
  };

  const saveOrCreateProvider = async (providerName: string): Promise<string | null> => {
    if (!providerName.trim()) return null;
    
    // Buscar si el proveedor ya existe
    const { data: existing } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', user!.id)
      .eq('name', providerName.trim())
      .maybeSingle();

    if (existing) {
      return existing.id;
    } else {
      // Crear nuevo proveedor con solo el nombre
      const { data: newProvider, error } = await supabase
        .from('providers')
        .insert([{
          user_id: user!.id,
          name: providerName.trim()
        }])
        .select('id')
        .single();

      if (error) {
        console.error('Error creating provider:', error);
        return null;
      }
      
      return newProvider?.id || null;
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    
    // Pre-cargar el nombre del proveedor en el campo de búsqueda si es un gasto
    if (transaction.type === 'expense' && transaction.providers) {
      setProviderSearchText(transaction.providers.name);
    }

    // Calcular el amount según el tipo
    let amountValue: string;
    if (transaction.type === 'expense') {
      // Para gastos, mostrar el total (ya está en transaction.amount)
      amountValue = transaction.amount.toString();
    } else {
      // Para ingresos, mostrar el subtotal
      amountValue = transaction.subtotal.toString();
    }

    setFormData({
      type: transaction.type,
      amount: amountValue,
      vat_rate: transaction.vat_rate.toString(),
      concept: transaction.concept || '',
      description: transaction.description || '',
      folio: transaction.folio || '',
      payment_method: transaction.payment_method || '',
      is_invoice: transaction.is_invoice,
      transaction_date: transaction.transaction_date,
      client_id: transaction.client_id || '',
      provider_id: transaction.provider_id || '',
      quotation_id: transaction.quotation_id || '',
    });
    setOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta transacción?')) return;

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    
    if (error) {
      toast.error('Error al eliminar transacción');
    } else {
      toast.success('Transacción eliminada exitosamente');
      fetchData();
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'income',
      amount: '',
      vat_rate: '16',
      concept: '',
      description: '',
      folio: '',
      payment_method: '',
      is_invoice: false,
      transaction_date: new Date().toISOString().split('T')[0],
      client_id: '',
      provider_id: '',
      quotation_id: '',
    });
    setEditingTransaction(null);
    setProviderSearchText('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.payment_method) {
      toast.error('Por favor selecciona una forma de pago');
      return;
    }

    let subtotal: number;
    let total: number;
    let vatAmount: number;
    const vatRate = parseFloat(formData.vat_rate);

    if (formData.type === 'expense') {
      // Para gastos: el usuario ingresa el TOTAL (con IVA incluido)
      total = parseFloat(formData.amount);
      // Calcular subtotal: total / (1 + (vatRate/100))
      subtotal = total / (1 + (vatRate / 100));
      vatAmount = total - subtotal;
    } else {
      // Para ingresos: el usuario ingresa el SUBTOTAL (sin IVA)
      subtotal = parseFloat(formData.amount);
      vatAmount = (subtotal * vatRate) / 100;
      total = subtotal + vatAmount;
    }

    // Guardar o actualizar el concepto
    if (formData.concept) {
      await saveOrUpdateConcept(formData.concept);
    }

    // Para gastos: guardar o crear proveedor si se escribió un nombre
    let finalProviderId = formData.provider_id;
    if (formData.type === 'expense' && providerSearchText.trim() && !formData.provider_id) {
      // Si escribió un nombre pero no seleccionó de la lista, crear el proveedor
      finalProviderId = await saveOrCreateProvider(providerSearchText);
    }

    const transactionData = {
      user_id: user!.id,
      type: formData.type,
      subtotal,
      amount: total,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      concept: formData.concept || null,
      description: formData.description || null,
      folio: formData.folio || null,
      payment_method: formData.payment_method || null,
      is_invoice: formData.is_invoice,
      transaction_date: formData.transaction_date,
      client_id: formData.type === 'income' ? (formData.client_id || null) : null,
      provider_id: formData.type === 'expense' ? (finalProviderId || null) : null,
      quotation_id: formData.quotation_id || null,
    };

    let error;
    if (editingTransaction) {
      // Actualizar transacción existente
      const result = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', editingTransaction.id);
      error = result.error;
    } else {
      // Crear nueva transacción
      const result = await supabase.from('transactions').insert([transactionData]);
      error = result.error;
    }

    if (error) {
      toast.error(editingTransaction ? 'Error al actualizar transacción' : 'Error al agregar transacción');
    } else {
      toast.success(editingTransaction ? 'Transacción actualizada exitosamente' : 'Transacción agregada exitosamente');
      setOpen(false);
      resetForm();
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
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar Transacción
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTransaction ? 'Editar Transacción' : 'Agregar Nueva Transacción'}
                </DialogTitle>
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
                  <Label htmlFor="amount">
                    {formData.type === 'expense' ? 'Monto Total (con IVA incluido) *' : 'Subtotal (sin IVA) *'}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.type === 'expense' 
                      ? 'Ingresa el monto total. El IVA se calculará automáticamente.'
                      : 'Ingresa el monto sin IVA. El IVA se calculará automáticamente.'
                    }
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

                {formData.type === 'income' ? (
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
                ) : (
                  <div className="space-y-2 relative">
                    <Label htmlFor="provider">Proveedor</Label>
                    <Input
                      id="provider"
                      value={providerSearchText}
                      onChange={(e) => handleProviderSearchChange(e.target.value)}
                      onFocus={() => {
                        if (providers.length > 0) {
                          setFilteredProviders(providers);
                          setShowProviderSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowProviderSuggestions(false), 200);
                      }}
                      placeholder="Escribe un proveedor"
                    />
                    {showProviderSuggestions && filteredProviders.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                        {filteredProviders.map((provider) => (
                          <div
                            key={provider.id}
                            className="px-3 py-2 hover:bg-accent cursor-pointer text-sm flex items-center justify-between group"
                            onClick={() => selectProvider(provider)}
                          >
                            <span className="flex-1">{provider.name}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => handleEditProvider(e, provider)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => handleDeleteProvider(e, provider.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2 relative">
                  <Label htmlFor="concept">Concepto</Label>
                  <Input
                    id="concept"
                    value={formData.concept}
                    onChange={(e) => handleConceptChange(e.target.value)}
                    onFocus={() => {
                      if (concepts.length > 0) {
                        setFilteredConcepts(concepts);
                        setShowConceptSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowConceptSuggestions(false), 200);
                    }}
                    placeholder="Escribe un concepto"
                  />
                  {showConceptSuggestions && filteredConcepts.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                      {filteredConcepts.map((concept, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 hover:bg-accent cursor-pointer text-sm flex items-center justify-between group"
                          onClick={() => selectConcept(concept)}
                        >
                          <span className="flex-1">{concept}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => handleEditConcept(e, concept)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={(e) => handleDeleteConcept(e, concept)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Información adicional sobre la transacción"
                    rows={3}
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
                <Button type="submit" className="w-full">
                  {editingTransaction ? 'Actualizar Transacción' : 'Agregar Transacción'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Provider Dialog */}
        <Dialog open={editProviderDialog} onOpenChange={setEditProviderDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Proveedor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveProvider} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-provider-name">Nombre *</Label>
                <Input
                  id="edit-provider-name"
                  value={editProviderForm.name}
                  onChange={(e) => setEditProviderForm({ ...editProviderForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-provider-vat">RFC</Label>
                <Input
                  id="edit-provider-vat"
                  value={editProviderForm.vat_number}
                  onChange={(e) => setEditProviderForm({ ...editProviderForm, vat_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-provider-phone">Teléfono</Label>
                <Input
                  id="edit-provider-phone"
                  value={editProviderForm.phone}
                  onChange={(e) => setEditProviderForm({ ...editProviderForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-provider-email">Email</Label>
                <Input
                  id="edit-provider-email"
                  type="email"
                  value={editProviderForm.email}
                  onChange={(e) => setEditProviderForm({ ...editProviderForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-provider-address">Dirección</Label>
                <Input
                  id="edit-provider-address"
                  value={editProviderForm.address}
                  onChange={(e) => setEditProviderForm({ ...editProviderForm, address: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">Actualizar Proveedor</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Concept Dialog */}
        <Dialog open={editConceptDialog} onOpenChange={setEditConceptDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Concepto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveConcept} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-concept-text">Concepto *</Label>
                <Input
                  id="edit-concept-text"
                  value={editConceptText}
                  onChange={(e) => setEditConceptText(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Actualizar Concepto</Button>
            </form>
          </DialogContent>
        </Dialog>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Folio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente/Proveedor</TableHead>
                <TableHead>Cotización</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Forma de Pago</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
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
                    {transaction.type === 'income' 
                      ? (transaction.clients 
                          ? `${transaction.clients.first_name} ${transaction.clients.last_name || ''}`
                          : '-')
                      : (transaction.providers?.name || '-')}
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
                  <TableCell className="max-w-[200px] truncate" title={transaction.description || ''}>
                    {transaction.description || '-'}
                  </TableCell>
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTransaction(transaction)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
