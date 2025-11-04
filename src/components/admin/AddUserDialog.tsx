import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { PasswordInputWithValidation } from '@/components/ui/password-input-with-validation';

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const userSchema = z.object({
  email: z.string().email('Correo electrónico inválido').max(255),
  password: z.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula'),
  firstName: z.string().min(1, 'El nombre es requerido').max(100),
  lastName: z.string().min(1, 'El apellido es requerido').max(100),
  rfc: z.string().min(12, 'RFC inválido').max(13, 'RFC inválido'),
  subscriptionDurationDays: z.number().min(1, 'Debe ser al menos 1 día').max(365),
});

export function AddUserDialog({ open, onClose, onSuccess }: AddUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    rfc: '',
    subscriptionDurationDays: '30',
  });
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Formato de correo inválido');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(formData.email)) {
      return;
    }

    try {
      // Validar datos con zod
      const validatedData = userSchema.parse({
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        rfc: formData.rfc.trim().toUpperCase(),
        subscriptionDurationDays: parseInt(formData.subscriptionDurationDays),
      });

      setLoading(true);

      // Llamar a la edge function para crear el usuario
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: validatedData.email,
          password: validatedData.password,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          rfc: validatedData.rfc,
          subscriptionDurationDays: validatedData.subscriptionDurationDays,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Usuario creado exitosamente. Puede iniciar sesión inmediatamente.');
      
      // Resetear formulario
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        rfc: '',
        subscriptionDurationDays: '30',
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else if (error.message?.includes('already registered')) {
        toast.error('Este correo ya está registrado');
      } else {
        toast.error(error.message || 'Error al crear el usuario');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        rfc: '',
        subscriptionDurationDays: '30',
      });
      setEmailError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Crea un usuario que puede acceder inmediatamente sin verificación de correo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Ej: Juan"
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Ej: Pérez"
                required
                maxLength={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  validateEmail(e.target.value);
                }}
                onBlur={() => validateEmail(formData.email)}
                placeholder="usuario@ejemplo.com"
                required
                className={emailError ? 'border-destructive' : ''}
                maxLength={255}
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rfc">RFC *</Label>
              <Input
                id="rfc"
                value={formData.rfc}
                onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                placeholder="Ej: XAXX010101000"
                required
                maxLength={13}
                minLength={12}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <PasswordInputWithValidation
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscriptionDays">Duración Suscripción (días) *</Label>
              <Input
                id="subscriptionDays"
                type="number"
                min="1"
                max="365"
                value={formData.subscriptionDurationDays}
                onChange={(e) => setFormData({ ...formData, subscriptionDurationDays: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Días de acceso a la plataforma
              </p>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> El usuario podrá iniciar sesión inmediatamente con el correo y contraseña especificados, sin necesidad de verificar su correo electrónico.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !!emailError}>
              {loading ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
