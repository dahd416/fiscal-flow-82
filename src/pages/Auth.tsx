import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordInputWithValidation } from '@/components/ui/password-input-with-validation';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { TrendingUp, ArrowLeft } from 'lucide-react';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rfc, setRfc] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  
  const { platformSettings } = usePlatformSettings();
  
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
  const { signIn, signUp, resetPassword, updatePassword } = useAuth();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar correo
    if (!validateEmail(email)) {
      return;
    }
    
    // Si hay invitación, validar que el email coincida
    if (invitationToken && invitationEmail && email !== invitationEmail) {
      toast.error('El correo debe coincidir con la invitación');
      return;
    }
    
    // Validar contraseña
    const hasMinLength = password.length >= 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    
    if (!hasMinLength || !hasUpperCase || !hasLowerCase) {
      return;
    }
    
    setLoading(true);
    try {
      await signUp(email, password, firstName, lastName, rfc);
      
      // Si hay token de invitación, marcar como aceptada
      if (invitationToken) {
        await supabase
          .from('user_invitations')
          .update({ status: 'accepted' })
          .eq('token', invitationToken);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setShowForgotPassword(false);
      setEmail('');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar contraseña
    const hasMinLength = newPassword.length >= 6;
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    
    if (!hasMinLength || !hasUpperCase || !hasLowerCase) {
      return;
    }
    
    if (newPassword !== confirmPassword) {
      return;
    }
    
    setLoading(true);
    try {
      await updatePassword(newPassword);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const invitation = searchParams.get('invitation');
    if (invitation) {
      setInvitationToken(invitation);
      // Fetch invitation details
      const fetchInvitation = async () => {
        const { data, error } = await supabase
          .from('user_invitations')
          .select('email, status, expires_at')
          .eq('token', invitation)
          .single();
        
        if (error || !data) {
          toast.error('Invitación inválida o expirada');
          return;
        }
        
        if (data.status !== 'pending') {
          toast.error('Esta invitación ya fue utilizada');
          return;
        }
        
        const expiresAt = new Date(data.expires_at);
        if (expiresAt < new Date()) {
          toast.error('Esta invitación ha expirado');
          return;
        }
        
        setInvitationEmail(data.email);
        setEmail(data.email);
      };
      
      fetchInvitation();
    }
    
    if (mode === 'reset') {
      // User clicked the reset link in their email
    }
  }, [mode, searchParams]);

  // Reset password form (after clicking email link)
  if (mode === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
        <Card className="w-full max-w-md shadow-2xl border-primary/20">
          <CardHeader className="space-y-3">
            <div className="flex justify-center mb-2">
              {platformSettings?.logo_url ? (
                <div 
                  className={`p-3 rounded-xl ${
                    platformSettings.logo_background_enabled 
                      ? 'shadow-lg' 
                      : ''
                  }`}
                  style={{
                    backgroundColor: platformSettings.logo_background_enabled 
                      ? platformSettings.logo_background_color || 'hsl(var(--primary))'
                      : 'transparent'
                  }}
                >
                  <img 
                    src={platformSettings.logo_url} 
                    alt={platformSettings.platform_name}
                    className="h-12 w-auto"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl text-center">Restablecer Contraseña</CardTitle>
            <CardDescription className="text-center">Ingresa tu nueva contraseña</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <PasswordInputWithValidation
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-destructive">Las contraseñas no coinciden</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading || newPassword !== confirmPassword}>
                {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forgot password form
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
        <Card className="w-full max-w-md shadow-2xl border-primary/20">
          <CardHeader className="space-y-3">
            <div className="flex justify-center mb-2">
              {platformSettings?.logo_url ? (
                <div 
                  className={`p-3 rounded-xl ${
                    platformSettings.logo_background_enabled 
                      ? 'shadow-lg' 
                      : ''
                  }`}
                  style={{
                    backgroundColor: platformSettings.logo_background_enabled 
                      ? platformSettings.logo_background_color || 'hsl(var(--primary))'
                      : 'transparent'
                  }}
                >
                  <img 
                    src={platformSettings.logo_url} 
                    alt={platformSettings.platform_name}
                    className="h-12 w-auto"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl text-center">Recuperar Contraseña</CardTitle>
            <CardDescription className="text-center">Ingresa tu correo para recibir un enlace de restablecimiento</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Correo Electrónico</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      validateEmail(e.target.value);
                    }}
                    onBlur={() => validateEmail(email)}
                    required
                    className={emailError ? 'border-destructive' : ''}
                  />
                  {emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Enlace de Restablecimiento'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full gap-2"
                onClick={() => setShowForgotPassword(false)}
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20 backdrop-blur-sm">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex justify-center mb-2">
            {platformSettings?.logo_url ? (
              <div 
                className={`p-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                  platformSettings.logo_background_enabled 
                    ? 'shadow-lg hover:shadow-xl' 
                    : ''
                }`}
                style={{
                  backgroundColor: platformSettings.logo_background_enabled 
                    ? platformSettings.logo_background_color || 'hsl(var(--primary))'
                    : 'transparent'
                }}
              >
                <img 
                  src={platformSettings.logo_url} 
                  alt={platformSettings.platform_name}
                  className="h-16 w-auto"
                />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                <TrendingUp className="h-8 w-8 text-primary-foreground" />
              </div>
            )}
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold">
              {platformSettings?.platform_name || 'Control Financiero'}
            </CardTitle>
            <CardDescription className="text-base">
              Gestiona tus ingresos, clientes y declaraciones de IVA
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin" className="text-base">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup" className="text-base">Registrarse</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Correo Electrónico</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      validateEmail(e.target.value);
                    }}
                    onBlur={() => validateEmail(email)}
                    required
                    className={emailError ? 'border-destructive' : ''}
                  />
                  {emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Contraseña</Label>
                  <PasswordInput
                    id="signin-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm"
                  onClick={() => setShowForgotPassword(true)}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-firstname">Nombre</Label>
                  <Input
                    id="signup-firstname"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Ej: Juan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-lastname">Apellido</Label>
                  <Input
                    id="signup-lastname"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Ej: Pérez"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-rfc">RFC</Label>
                  <Input
                    id="signup-rfc"
                    type="text"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase())}
                    required
                    placeholder="Ej: XAXX010101000"
                    maxLength={13}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo Electrónico</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      validateEmail(e.target.value);
                    }}
                    onBlur={() => validateEmail(email)}
                    required
                    disabled={!!invitationEmail}
                    className={emailError ? 'border-destructive' : ''}
                  />
                  {invitationEmail && (
                    <p className="text-sm text-muted-foreground">
                      Email pre-asignado por invitación
                    </p>
                  )}
                  {emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <PasswordInputWithValidation
                    id="signup-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creando cuenta...' : 'Registrarse'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
