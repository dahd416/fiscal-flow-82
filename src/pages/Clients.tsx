import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Mail, Phone, Building, User } from 'lucide-react';
import { toast } from 'sonner';

interface Client {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  vat_number: string | null;
  address: string | null;
  person_type: string | null;
}

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    vat_number: '',
    address: '',
    person_type: '',
  });
  const [emailError, setEmailError] = useState('');

  const formatPhone = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // Format as XXX - XXX - XXXX
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)} - ${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)} - ${cleaned.slice(3, 6)} - ${cleaned.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError('');
      return true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Formato de correo electrónico inválido');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData({ ...formData, email });
    validateEmail(email);
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setClients(data);
  };

  useEffect(() => {
    if (user) fetchClients();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate person type
    if (!formData.person_type) {
      toast.error('Por favor, selecciona el tipo de persona');
      return;
    }
    
    // Validate email before submitting
    if (formData.email && !validateEmail(formData.email)) {
      toast.error('Por favor, ingresa un correo electrónico válido');
      return;
    }

    const { error } = await supabase.from('clients').insert([
      { ...formData, user_id: user!.id }
    ]);

    if (error) {
      toast.error('Error al agregar cliente');
    } else {
      toast.success('Cliente agregado exitosamente');
      setOpen(false);
      setFormData({ first_name: '', last_name: '', email: '', phone: '', vat_number: '', address: '', person_type: '' });
      setEmailError('');
      fetchClients();
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
            <p className="text-muted-foreground">Gestiona tu base de datos de clientes</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nombre *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Nombre del cliente"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Apellido del cliente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="person_type">Tipo de Persona *</Label>
                  <Select
                    value={formData.person_type}
                    onValueChange={(value) => setFormData({ ...formData, person_type: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="persona_fisica">Persona Física</SelectItem>
                      <SelectItem value="persona_moral">Persona Moral</SelectItem>
                      <SelectItem value="na">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleEmailChange}
                    placeholder="ejemplo@correo.com"
                    className={emailError ? 'border-destructive' : ''}
                  />
                  {emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="XXX - XXX - XXXX"
                    maxLength={16}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vat_number">RFC</Label>
                  <Input
                    id="vat_number"
                    value={formData.vat_number}
                    onChange={(e) => setFormData({ ...formData, vat_number: e.target.value.toUpperCase() })}
                    placeholder="RFC del cliente"
                    maxLength={13}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Dirección completa"
                  />
                </div>
                <Button type="submit" className="w-full">Agregar Cliente</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    {client.first_name} {client.last_name}
                  </div>
                  {client.person_type && (
                    <Badge variant="outline" className="gap-1">
                      <User className="h-3 w-3" />
                      {client.person_type === 'persona_fisica' 
                        ? 'Física'
                        : client.person_type === 'persona_moral'
                        ? 'Moral'
                        : 'N/A'}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {client.phone}
                  </div>
                )}
                {client.vat_number && (
                  <div className="text-sm">
                    <span className="font-medium">RFC:</span> {client.vat_number}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
