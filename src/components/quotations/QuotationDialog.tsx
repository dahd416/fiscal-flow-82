import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  first_name: string;
  last_name: string | null;
}

interface Quotation {
  id?: string;
  title: string;
  description: string | null;
  client_id: string | null;
  valid_until: string | null;
  status: string;
  notes: string | null;
}

interface QuotationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (quotation: Partial<Quotation>) => Promise<void>;
  quotation?: Quotation | null;
  clients: Client[];
}

export function QuotationDialog({
  open,
  onClose,
  onSave,
  quotation,
  clients,
}: QuotationDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string>('');
  const [validUntil, setValidUntil] = useState<Date | undefined>();
  const [status, setStatus] = useState('draft');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (quotation) {
      setTitle(quotation.title);
      setDescription(quotation.description || '');
      setClientId(quotation.client_id || '');
      setValidUntil(quotation.valid_until ? new Date(quotation.valid_until) : undefined);
      setStatus(quotation.status);
      setNotes(quotation.notes || '');
    } else {
      resetForm();
    }
  }, [quotation, open]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setClientId('');
    setValidUntil(undefined);
    setStatus('draft');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      await onSave({
        ...(quotation?.id && { id: quotation.id }),
        title,
        description: description || null,
        client_id: clientId || null,
        valid_until: validUntil ? format(validUntil, 'yyyy-MM-dd') : null,
        status,
        notes: notes || null,
      });
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {quotation ? 'Editar Cotización' : 'Nueva Cotización'}
          </DialogTitle>
          <DialogDescription>
            {quotation
              ? 'Modifica los detalles de la cotización'
              : 'Completa la información básica. Podrás agregar items después.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Cotización de servicios web"
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Cliente</Label>
            <Select value={clientId || undefined} onValueChange={(value) => setClientId(value)}>
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
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción general de la cotización"
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Válida hasta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !validUntil && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validUntil ? format(validUntil, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={validUntil}
                    onSelect={setValidUntil}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="sent">Enviada</SelectItem>
                  <SelectItem value="accepted">Aceptada</SelectItem>
                  <SelectItem value="rejected">Rechazada</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas (no visibles para el cliente)"
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : quotation ? 'Actualizar' : 'Crear Cotización'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
