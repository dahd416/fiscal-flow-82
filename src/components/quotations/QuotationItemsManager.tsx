import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';

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

interface QuotationItemsManagerProps {
  items: QuotationItem[];
  onItemsChange: (items: QuotationItem[]) => void;
  readOnly?: boolean;
}

export function QuotationItemsManager({
  items,
  onItemsChange,
  readOnly = false,
}: QuotationItemsManagerProps) {
  const [newItem, setNewItem] = useState<Omit<QuotationItem, 'id' | 'subtotal' | 'vat_amount' | 'total'>>({
    description: '',
    quantity: 1,
    unit_price: 0,
    vat_rate: 16,
  });

  const calculateItemTotals = (
    quantity: number,
    unitPrice: number,
    vatRate: number
  ): { subtotal: number; vatAmount: number; total: number } => {
    const subtotal = quantity * unitPrice;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;
    return {
      subtotal: Number(subtotal.toFixed(2)),
      vatAmount: Number(vatAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  };

  const handleAddItem = () => {
    if (!newItem.description.trim()) {
      toast.error('La descripción es requerida');
      return;
    }

    if (newItem.quantity <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    if (newItem.unit_price < 0) {
      toast.error('El precio unitario no puede ser negativo');
      return;
    }

    const totals = calculateItemTotals(
      newItem.quantity,
      newItem.unit_price,
      newItem.vat_rate
    );

    const itemToAdd: QuotationItem = {
      ...newItem,
      subtotal: totals.subtotal,
      vat_amount: totals.vatAmount,
      total: totals.total,
    };

    onItemsChange([...items, itemToAdd]);

    setNewItem({
      description: '',
      quantity: 1,
      unit_price: 0,
      vat_rate: 16,
    });

    toast.success('Item agregado');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
    toast.success('Item eliminado');
  };

  const totals = items.reduce(
    (acc, item) => ({
      subtotal: acc.subtotal + item.subtotal,
      vatAmount: acc.vatAmount + item.vat_amount,
      total: acc.total + item.total,
    }),
    { subtotal: 0, vatAmount: 0, total: 0 }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Items de la Cotización</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!readOnly && (
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Descripción del item"
                maxLength={200}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="unit_price">Precio Unit.</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                min="0"
                value={newItem.unit_price}
                onChange={(e) => setNewItem({ ...newItem, unit_price: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="vat_rate">IVA %</Label>
              <Input
                id="vat_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={newItem.vat_rate}
                onChange={(e) => setNewItem({ ...newItem, vat_rate: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-1">
              <Button onClick={handleAddItem} size="icon" className="w-full">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {items.length > 0 ? (
          <>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {!readOnly && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.vat_amount)}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({item.vat_rate}%)
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.total)}
                      </TableCell>
                      {!readOnly && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <div className="w-[300px] space-y-2 border rounded-lg p-4 bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA:</span>
                  <span className="font-medium">{formatCurrency(totals.vatAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {readOnly 
              ? 'No hay items en esta cotización' 
              : 'Agrega items a la cotización usando el formulario de arriba'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
