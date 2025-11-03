import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { QuotationDialog } from '@/components/quotations/QuotationDialog';
import { QuotationItemsManager } from '@/components/quotations/QuotationItemsManager';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency';

interface Quotation {
  id: string;
  quotation_number: string;
  title: string;
  description: string | null;
  client_id: string | null;
  status: string;
  valid_until: string | null;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  clients?: {
    name: string;
  };
}

interface QuotationItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  subtotal: number;
  vat_amount: number;
  total: number;
}

interface Client {
  id: string;
  name: string;
}

export default function Quotations() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [currentQuotationId, setCurrentQuotationId] = useState<string | null>(null);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [deleteQuotationId, setDeleteQuotationId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadQuotations();
      loadClients();
    }
  }, [user]);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          clients (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error: any) {
      console.error('Error loading quotations:', error);
      toast.error('Error al cargar cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
    }
  };

  const loadQuotationItems = async (quotationId: string) => {
    try {
      const { data, error } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('created_at');

      if (error) throw error;
      setQuotationItems(data || []);
    } catch (error: any) {
      console.error('Error loading quotation items:', error);
      toast.error('Error al cargar items de cotización');
    }
  };

  const handleSaveQuotation = async (quotationData: any) => {
    try {
      if (!user) return;

      if (editingQuotation) {
        const { error } = await supabase
          .from('quotations')
          .update(quotationData)
          .eq('id', editingQuotation.id);

        if (error) throw error;
        toast.success('Cotización actualizada');
      } else {
        // Generar número de cotización
        const { data: numberData, error: numberError } = await supabase
          .rpc('generate_quotation_number');

        if (numberError) throw numberError;

        const { error } = await supabase.from('quotations').insert([
          {
            ...quotationData,
            quotation_number: numberData,
            user_id: user.id,
          },
        ]);

        if (error) throw error;
        toast.success('Cotización creada');
      }

      loadQuotations();
      setEditingQuotation(null);
    } catch (error: any) {
      console.error('Error saving quotation:', error);
      toast.error('Error al guardar cotización');
      throw error;
    }
  };

  const handleSaveItems = async () => {
    if (!currentQuotationId) return;

    try {
      // Eliminar items existentes
      await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', currentQuotationId);

      // Insertar nuevos items
      if (quotationItems.length > 0) {
        const itemsToInsert = quotationItems.map((item) => ({
          quotation_id: currentQuotationId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
          subtotal: item.subtotal,
          vat_amount: item.vat_amount,
          total: item.total,
        }));

        const { error: itemsError } = await supabase
          .from('quotation_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Calcular totales
      const totals = quotationItems.reduce(
        (acc, item) => ({
          subtotal: acc.subtotal + item.subtotal,
          vat_amount: acc.vat_amount + item.vat_amount,
          total: acc.total + item.total,
        }),
        { subtotal: 0, vat_amount: 0, total: 0 }
      );

      // Actualizar totales en la cotización
      const { error: updateError } = await supabase
        .from('quotations')
        .update({
          subtotal: totals.subtotal,
          vat_amount: totals.vat_amount,
          total_amount: totals.total,
        })
        .eq('id', currentQuotationId);

      if (updateError) throw updateError;

      toast.success('Items guardados correctamente');
      setItemsDialogOpen(false);
      setCurrentQuotationId(null);
      setQuotationItems([]);
      loadQuotations();
    } catch (error: any) {
      console.error('Error saving items:', error);
      toast.error('Error al guardar items');
    }
  };

  const handleDeleteQuotation = async () => {
    if (!deleteQuotationId) return;

    try {
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', deleteQuotationId);

      if (error) throw error;

      toast.success('Cotización eliminada');
      loadQuotations();
      setDeleteQuotationId(null);
    } catch (error: any) {
      console.error('Error deleting quotation:', error);
      toast.error('Error al eliminar cotización');
    }
  };

  const handleManageItems = async (quotation: Quotation) => {
    setCurrentQuotationId(quotation.id);
    await loadQuotationItems(quotation.id);
    setItemsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Borrador' },
      sent: { variant: 'default', label: 'Enviada' },
      accepted: { variant: 'default', label: 'Aceptada' },
      rejected: { variant: 'destructive', label: 'Rechazada' },
      expired: { variant: 'outline', label: 'Expirada' },
    };

    const config = variants[status] || variants.draft;
    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  const filteredQuotations = quotations.filter((quotation) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      quotation.title.toLowerCase().includes(searchLower) ||
      quotation.quotation_number.toLowerCase().includes(searchLower) ||
      quotation.clients?.name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Cotizaciones</h2>
            <p className="text-muted-foreground">
              Crea y administra cotizaciones para tus clientes
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 hover-scale">
            <Plus className="h-4 w-4" />
            Nueva Cotización
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, número o cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredQuotations.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Válida hasta</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotations.map((quotation) => (
                      <TableRow key={quotation.id}>
                        <TableCell className="font-mono text-sm">
                          {quotation.quotation_number}
                        </TableCell>
                        <TableCell className="font-medium">{quotation.title}</TableCell>
                        <TableCell>
                          {quotation.clients?.name || (
                            <span className="text-muted-foreground">Sin cliente</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(quotation.total_amount)}
                        </TableCell>
                        <TableCell>
                          {quotation.valid_until ? (
                            format(new Date(quotation.valid_until), 'PP', { locale: es })
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleManageItems(quotation)}
                              title="Gestionar items"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingQuotation(quotation);
                                setDialogOpen(true);
                              }}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteQuotationId(quotation.id)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                              title="Eliminar"
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
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {searchQuery
                    ? 'No se encontraron cotizaciones'
                    : 'No hay cotizaciones aún. Crea tu primera cotización.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <QuotationDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingQuotation(null);
        }}
        onSave={handleSaveQuotation}
        quotation={editingQuotation}
        clients={clients}
      />

      <AlertDialog open={itemsDialogOpen} onOpenChange={setItemsDialogOpen}>
        <AlertDialogContent className="max-w-5xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Gestionar Items de Cotización</AlertDialogTitle>
            <AlertDialogDescription>
              Agrega, edita o elimina los items de esta cotización
            </AlertDialogDescription>
          </AlertDialogHeader>
          <QuotationItemsManager
            items={quotationItems}
            onItemsChange={setQuotationItems}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveItems}>
              Guardar Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteQuotationId} onOpenChange={() => setDeleteQuotationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La cotización y todos sus items serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuotation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
