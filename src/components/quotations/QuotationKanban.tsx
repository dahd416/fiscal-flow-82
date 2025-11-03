import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, FileText } from 'lucide-react';
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
    first_name: string;
    last_name: string | null;
  };
}

interface QuotationKanbanProps {
  quotations: Quotation[];
  onEdit: (quotation: Quotation) => void;
  onDelete: (id: string) => void;
  onManageItems: (quotation: Quotation) => void;
}

const statusColumns = [
  { key: 'draft', label: 'Borrador', color: 'bg-secondary/10 border-secondary' },
  { key: 'sent', label: 'Enviada', color: 'bg-blue-500/10 border-blue-500' },
  { key: 'accepted', label: 'Aceptada', color: 'bg-green-500/10 border-green-500' },
  { key: 'rejected', label: 'Rechazada', color: 'bg-destructive/10 border-destructive' },
  { key: 'expired', label: 'Expirada', color: 'bg-muted/20 border-muted' },
];

export function QuotationKanban({ quotations, onEdit, onDelete, onManageItems }: QuotationKanbanProps) {
  const getQuotationsByStatus = (status: string) => {
    return quotations.filter((q) => q.status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statusColumns.map((column) => {
        const columnQuotations = getQuotationsByStatus(column.key);
        
        return (
          <div key={column.key} className="space-y-3">
            <div className={`rounded-lg border-2 ${column.color} p-3`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{column.label}</h3>
                <Badge variant="outline" className="ml-2">
                  {columnQuotations.length}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 min-h-[400px]">
              {columnQuotations.map((quotation) => (
                <Card key={quotation.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-semibold line-clamp-2">
                          {quotation.title}
                        </CardTitle>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">
                        {quotation.quotation_number}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Cliente</p>
                        <p className="font-medium">
                          {quotation.clients ? (
                            `${quotation.clients.first_name} ${quotation.clients.last_name || ''}`
                          ) : (
                            <span className="text-muted-foreground">Sin cliente</span>
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold text-lg">
                          {formatCurrency(quotation.total_amount)}
                        </p>
                      </div>

                      {quotation.valid_until && (
                        <div>
                          <p className="text-xs text-muted-foreground">Válida hasta</p>
                          <p className="text-sm">
                            {format(new Date(quotation.valid_until), 'PP', { locale: es })}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onManageItems(quotation)}
                        className="flex-1"
                        title="Gestionar items"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(quotation)}
                        className="flex-1"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(quotation.id)}
                        className="flex-1 hover:bg-destructive/10 hover:text-destructive"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {columnQuotations.length === 0 && (
                <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                  Sin cotizaciones
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
