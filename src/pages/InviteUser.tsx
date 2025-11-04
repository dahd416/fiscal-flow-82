import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function InviteUser() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const navigate = useNavigate();

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
    
    if (!validateEmail(email)) {
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Debes iniciar sesión');
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: { email },
      });

      if (error) {
        console.error('Error invoking function:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error);
      }

      console.log('Invitation sent successfully:', data);
      toast.success('Invitación enviada exitosamente. El usuario recibirá un correo con el enlace de registro.');
      setEmail('');
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Error al enviar la invitación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/users')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Invitar Usuario</CardTitle>
          </div>
          <CardDescription>
            Envía una invitación por correo electrónico para que un usuario se registre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
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
            <Button type="submit" className="w-full" disabled={loading || !!emailError}>
              {loading ? 'Enviando...' : 'Enviar Invitación'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
