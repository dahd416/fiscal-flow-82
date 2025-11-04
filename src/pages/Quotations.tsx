import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { QuotationList } from '@/components/quotations/QuotationList';
import { QuotationKanban } from '@/components/quotations/QuotationKanban';
import { toast } from 'sonner';
import { Plus, Search, LayoutList, LayoutGrid } from 'lucide-react';

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
    first_name: string;
    last_name: string | null;
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
  first_name: string;
  last_name: string | null;
}

export default function Quotations() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
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
            first_name,
            last_name
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
        .select('id, first_name, last_name')
        .order('first_name');

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

  const handleStatusChange = async (quotationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('quotations')
        .update({ status: newStatus })
        .eq('id', quotationId);

      if (error) throw error;

      toast.success('Estado actualizado');
      loadQuotations();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const handleManageItems = async (quotation: Quotation) => {
    setCurrentQuotationId(quotation.id);
    await loadQuotationItems(quotation.id);
    setItemsDialogOpen(true);
  };

  const handleEdit = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setDialogOpen(true);
  };

  const handleDownloadPDF = async (quotation: Quotation) => {
    try {
      toast.loading('Generando PDF...');
      
      const { data, error } = await supabase.functions.invoke('generate-quotation-pdf', {
        body: { quotationId: quotation.id },
      });

      if (error) throw error;

      // Create blob from HTML and open in new window for printing
      const blob = new Blob([data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            toast.dismiss();
            toast.success('PDF listo para descargar');
          }, 500);
        };
      } else {
        toast.dismiss();
        toast.error('Habilita las ventanas emergentes para descargar el PDF');
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Error al generar PDF');
    }
  };

  const filteredQuotations = quotations.filter((quotation) => {
    const searchLower = searchQuery.toLowerCase();
    const clientName = quotation.clients 
      ? `${quotation.clients.first_name} ${quotation.clients.last_name || ''}`.toLowerCase()
      : '';
    return (
      quotation.title.toLowerCase().includes(searchLower) ||
      quotation.quotation_number.toLowerCase().includes(searchLower) ||
      clientName.includes(searchLower)
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, número o cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'kanban')}>
                <TabsList>
                  <TabsTrigger value="list" className="gap-2">
                    <LayoutList className="h-4 w-4" />
                    Lista
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Kanban
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredQuotations.length > 0 ? (
              viewMode === 'list' ? (
                <QuotationList
                  quotations={filteredQuotations}
                  onEdit={handleEdit}
                  onDelete={setDeleteQuotationId}
                  onManageItems={handleManageItems}
                  onDownloadPDF={handleDownloadPDF}
                />
              ) : (
                <QuotationKanban
                  quotations={filteredQuotations}
                  onEdit={handleEdit}
                  onDelete={setDeleteQuotationId}
                  onManageItems={handleManageItems}
                  onStatusChange={handleStatusChange}
                  onDownloadPDF={handleDownloadPDF}
                />
              )
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
