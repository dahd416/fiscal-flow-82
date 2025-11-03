import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Provider {
  id: string;
  name: string;
  vat_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface ProviderManagerProps {
  providers: Provider[];
  onUpdate: () => void;
}

export function ProviderManager({ providers, onUpdate }: ProviderManagerProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    vat_number: '',
    phone: '',
    email: '',
    address: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      vat_number: '',
      phone: '',
      email: '',
      address: '',
    });
    setEditingProvider(null);
  };

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      vat_number: provider.vat_number || '',
      phone: provider.phone || '',
      email: provider.email || '',
      address: provider.address || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('providers').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar proveedor');
    } else {
      toast.success('Proveedor eliminado');
      onUpdate();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingProvider) {
      const { error } = await supabase
        .from('providers')
        .update(formData)
        .eq('id', editingProvider.id);
      
      if (error) {
        toast.error('Error al actualizar proveedor');
      } else {
        toast.success('Proveedor actualizado');
        setOpen(false);
        resetForm();
        onUpdate();
      }
    } else {
      const { error } = await supabase.from('providers').insert([
        {
          user_id: user!.id,
          ...formData,
        },
      ]);

      if (error) {
        toast.error('Error al crear proveedor');
      } else {
        toast.success('Proveedor creado');
        setOpen(false);
        resetForm();
        onUpdate();
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Gestionar Proveedores</Label>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <Plus className="h-3 w-3" />
              Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider-name">Nombre *</Label>
                <Input
                  id="provider-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-vat">RFC</Label>
                <Input
                  id="provider-vat"
                  value={formData.vat_number}
                  onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-phone">Teléfono</Label>
                <Input
                  id="provider-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-email">Email</Label>
                <Input
                  id="provider-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-address">Dirección</Label>
                <Input
                  id="provider-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingProvider ? 'Actualizar' : 'Crear'} Proveedor
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {providers.length > 0 && (
        <div className="border rounded-md max-h-40 overflow-y-auto">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center justify-between p-2 hover:bg-accent border-b last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{provider.name}</p>
                {provider.vat_number && (
                  <p className="text-xs text-muted-foreground">{provider.vat_number}</p>
                )}
              </div>
              <div className="flex gap-1 ml-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(provider)}
                  className="h-7 w-7 p-0"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(provider.id)}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
