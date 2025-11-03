import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface QuotationListProps {
  quotations: Quotation[];
  onEdit: (quotation: Quotation) => void;
  onDelete: (id: string) => void;
  onManageItems: (quotation: Quotation) => void;
}

export function QuotationList({ quotations, onEdit, onDelete, onManageItems }: QuotationListProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Borrador' },
      sent: { variant: 'default', label: 'Enviada' },
      accepted: { variant: 'default', label: 'Aceptada' },
      rejected: { variant: 'destructive', label: 'Rechazada' },
      completed: { variant: 'default', label: 'Completada' },
      expired: { variant: 'outline', label: 'Expirada' },
    };

    const config = variants[status] || variants.draft;
    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  return (
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
          {quotations.map((quotation) => (
            <TableRow key={quotation.id}>
              <TableCell className="font-mono text-sm">
                {quotation.quotation_number}
              </TableCell>
              <TableCell className="font-medium">{quotation.title}</TableCell>
              <TableCell>
                {quotation.clients ? (
                  `${quotation.clients.first_name} ${quotation.clients.last_name || ''}`
                ) : (
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
                    onClick={() => onManageItems(quotation)}
                    title="Gestionar items"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(quotation)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(quotation.id)}
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
  );
}
