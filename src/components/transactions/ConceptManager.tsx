import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Concept {
  id: string;
  concept: string;
  usage_count: number;
}

interface ConceptManagerProps {
  concepts: string[];
  onUpdate: () => void;
}

export function ConceptManager({ concepts, onUpdate }: ConceptManagerProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState<{ id: string; concept: string } | null>(null);
  const [conceptText, setConceptText] = useState('');

  const resetForm = () => {
    setConceptText('');
    setEditingConcept(null);
  };

  const fetchConceptId = async (conceptName: string): Promise<string | null> => {
    const { data } = await supabase
      .from('transaction_concepts')
      .select('id')
      .eq('user_id', user!.id)
      .eq('concept', conceptName)
      .single();
    return data?.id || null;
  };

  const handleEdit = async (conceptName: string) => {
    const id = await fetchConceptId(conceptName);
    if (id) {
      setEditingConcept({ id, concept: conceptName });
      setConceptText(conceptName);
      setOpen(true);
    }
  };

  const handleDelete = async (conceptName: string) => {
    const id = await fetchConceptId(conceptName);
    if (!id) return;

    const { error } = await supabase
      .from('transaction_concepts')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar concepto');
    } else {
      toast.success('Concepto eliminado');
      onUpdate();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conceptText.trim()) return;

    if (editingConcept) {
      const { error } = await supabase
        .from('transaction_concepts')
        .update({ concept: conceptText.trim() })
        .eq('id', editingConcept.id);

      if (error) {
        toast.error('Error al actualizar concepto');
      } else {
        toast.success('Concepto actualizado');
        setOpen(false);
        resetForm();
        onUpdate();
      }
    } else {
      const { error } = await supabase.from('transaction_concepts').insert([
        {
          user_id: user!.id,
          concept: conceptText.trim(),
          usage_count: 1,
        },
      ]);

      if (error) {
        toast.error('Error al crear concepto');
      } else {
        toast.success('Concepto creado');
        setOpen(false);
        resetForm();
        onUpdate();
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Gestionar Conceptos</Label>
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
                {editingConcept ? 'Editar Concepto' : 'Nuevo Concepto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="concept-text">Concepto *</Label>
                <Input
                  id="concept-text"
                  value={conceptText}
                  onChange={(e) => setConceptText(e.target.value)}
                  placeholder="Ej: Consultoría"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingConcept ? 'Actualizar' : 'Crear'} Concepto
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {concepts.length > 0 && (
        <div className="border rounded-md max-h-40 overflow-y-auto">
          {concepts.map((concept, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 hover:bg-accent border-b last:border-b-0"
            >
              <p className="text-sm flex-1 min-w-0 truncate">{concept}</p>
              <div className="flex gap-1 ml-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(concept)}
                  className="h-7 w-7 p-0"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(concept)}
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
