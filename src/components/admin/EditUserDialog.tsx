import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  rfc: string | null;
  email: string;
  business_name: string | null;
  fiscal_name: string | null;
}

interface EditUserDialogProps {
  user: UserProfile | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUserDialog({ user, open, onClose, onSuccess }: EditUserDialogProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rfc, setRfc] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [fiscalName, setFiscalName] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setRfc(user.rfc || '');
      setBusinessName(user.business_name || '');
      setFiscalName(user.fiscal_name || '');
    }
  }, [user]);

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError('El correo es requerido');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Formato de correo inválido');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!validateEmail(email)) {
      toast.error('Por favor, ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-update-user', {
        body: {
          userId: user.id,
          email: email.trim(),
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          rfc: rfc.trim().toUpperCase() || null,
          businessName: businessName.trim() || null,
          fiscalName: fiscalName.trim() || null,
        },
      });

      if (error) throw error;

      toast.success('Usuario actualizado exitosamente');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(email)}
              placeholder="usuario@ejemplo.com"
              required
              className={emailError ? 'border-destructive' : ''}
            />
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstName">Nombre</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Nombre del usuario"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Apellido</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Apellido del usuario"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessName">Nombre de Negocio</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Nombre comercial del negocio"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fiscalName">Nombre Fiscal</Label>
            <Input
              id="fiscalName"
              value={fiscalName}
              onChange={(e) => setFiscalName(e.target.value)}
              placeholder="Razón social o nombre fiscal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rfc">RFC</Label>
            <Input
              id="rfc"
              value={rfc}
              onChange={(e) => setRfc(e.target.value.toUpperCase())}
              placeholder="RFC del usuario"
              maxLength={13}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !!emailError}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
