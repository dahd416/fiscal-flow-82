import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, FileText, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { useState } from 'react';

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
  onStatusChange: (quotationId: string, newStatus: string) => Promise<void>;
}

const statusColumns = [
  { key: 'draft', label: 'Borrador', color: 'bg-secondary/10 border-secondary' },
  { key: 'sent', label: 'Enviada', color: 'bg-blue-500/10 border-blue-500' },
  { key: 'accepted', label: 'Aceptada', color: 'bg-green-500/10 border-green-500' },
  { key: 'rejected', label: 'Rechazada', color: 'bg-destructive/10 border-destructive' },
  { key: 'expired', label: 'Expirada', color: 'bg-muted/20 border-muted' },
];

function DroppableColumn({ 
  id, 
  children, 
  color, 
  label, 
  count 
}: { 
  id: string; 
  children: React.ReactNode; 
  color: string; 
  label: string; 
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="space-y-3">
      <div className={`rounded-lg border-2 ${color} p-3`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{label}</h3>
          <Badge variant="outline" className="ml-2">
            {count}
          </Badge>
        </div>
      </div>

      <div 
        ref={setNodeRef}
        className={`space-y-3 min-h-[400px] p-2 rounded-lg transition-colors ${
          isOver ? 'bg-accent/20 border-2 border-dashed border-accent' : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function DraggableQuotation({
  quotation,
  onEdit,
  onDelete,
  onManageItems,
}: {
  quotation: Quotation;
  onEdit: (quotation: Quotation) => void;
  onDelete: (id: string) => void;
  onManageItems: (quotation: Quotation) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: quotation.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                <div {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
                  <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                </div>
                <CardTitle className="text-sm font-semibold line-clamp-2">
                  {quotation.title}
                </CardTitle>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground ml-6">
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
              onClick={(e) => {
                e.stopPropagation();
                onManageItems(quotation);
              }}
              className="flex-1"
              title="Gestionar items"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(quotation);
              }}
              className="flex-1"
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(quotation.id);
              }}
              className="flex-1 hover:bg-destructive/10 hover:text-destructive"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function QuotationKanban({ quotations, onEdit, onDelete, onManageItems, onStatusChange }: QuotationKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getQuotationsByStatus = (status: string) => {
    return quotations.filter((q) => q.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const quotationId = active.id as string;
    const newStatus = over.id as string;
    
    const quotation = quotations.find(q => q.id === quotationId);
    
    if (quotation && quotation.status !== newStatus) {
      await onStatusChange(quotationId, newStatus);
    }
    
    setActiveId(null);
  };

  const activeQuotation = quotations.find(q => q.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statusColumns.map((column) => {
          const columnQuotations = getQuotationsByStatus(column.key);
          
          return (
            <DroppableColumn
              key={column.key}
              id={column.key}
              color={column.color}
              label={column.label}
              count={columnQuotations.length}
            >
              {columnQuotations.map((quotation) => (
                <DraggableQuotation
                  key={quotation.id}
                  quotation={quotation}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onManageItems={onManageItems}
                />
              ))}

              {columnQuotations.length === 0 && (
                <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                  Sin cotizaciones
                </div>
              )}
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeQuotation && (
          <Card className="opacity-90 rotate-2 shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                {activeQuotation.title}
              </CardTitle>
              <p className="text-xs font-mono text-muted-foreground">
                {activeQuotation.quotation_number}
              </p>
            </CardHeader>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
