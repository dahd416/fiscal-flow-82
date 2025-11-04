import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Percent, Receipt } from 'lucide-react';

interface TaxSettings {
  id: string;
  persona_fisica_rate: number;
  persona_moral_rate: number;
}

export function TaxSettings() {
  const [settings, setSettings] = useState<TaxSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [personaFisicaRate, setPersonaFisicaRate] = useState('13.79');
  const [personaMoralRate, setPersonaMoralRate] = useState('0');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setPersonaFisicaRate(settings.persona_fisica_rate.toString());
      setPersonaMoralRate(settings.persona_moral_rate.toString());
    }
  }, [settings]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tax_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading tax settings:', error);
      toast.error('Error al cargar configuración de impuestos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const personaFisica = parseFloat(personaFisicaRate);
      const personaMoral = parseFloat(personaMoralRate);

      if (isNaN(personaFisica) || isNaN(personaMoral)) {
        toast.error('Por favor ingresa valores numéricos válidos');
        return;
      }

      if (personaFisica < 0 || personaFisica > 100 || personaMoral < 0 || personaMoral > 100) {
        toast.error('Los porcentajes deben estar entre 0 y 100');
        return;
      }

      if (settings) {
        const { error } = await supabase
          .from('tax_settings')
          .update({
            persona_fisica_rate: personaFisica,
            persona_moral_rate: personaMoral,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tax_settings')
          .insert({
            persona_fisica_rate: personaFisica,
            persona_moral_rate: personaMoral,
          });

        if (error) throw error;
      }

      toast.success('Configuración de impuestos guardada exitosamente');
      await loadSettings();
    } catch (error) {
      console.error('Error saving tax settings:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Configuración de Resguardo de IVA
          </CardTitle>
          <CardDescription>
            Define los porcentajes de resguardo de IVA según el tipo de persona (Física o Moral)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Persona Física Rate */}
          <div className="space-y-2">
            <Label htmlFor="persona-fisica-rate" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Tasa de Resguardo - Persona Física (%)
            </Label>
            <Input
              id="persona-fisica-rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={personaFisicaRate}
              onChange={(e) => setPersonaFisicaRate(e.target.value)}
              placeholder="13.79"
            />
            <p className="text-xs text-muted-foreground">
              Porcentaje aplicado al monto total de la factura para calcular el resguardo de IVA cuando el cliente es Persona Física. 
              <br />
              <strong>Ejemplo:</strong> 13.79% significa que se calcula como (Monto × 13.79 / 100)
            </p>
          </div>

          {/* Persona Moral Rate */}
          <div className="space-y-2">
            <Label htmlFor="persona-moral-rate" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Tasa de Resguardo - Persona Moral (%)
            </Label>
            <Input
              id="persona-moral-rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={personaMoralRate}
              onChange={(e) => setPersonaMoralRate(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Porcentaje aplicado al monto total de la factura para calcular el resguardo de IVA cuando el cliente es Persona Moral.
              <br />
              <strong>Valor común:</strong> 0% (sin resguardo)
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={loadSettings}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Información Importante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">¿Cómo se calcula el Resguardo de IVA?</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                <strong>Persona Física:</strong> Resguardo = (Monto Total de la Factura × {personaFisicaRate}%)
              </li>
              <li>
                <strong>Persona Moral:</strong> Resguardo = (Monto Total de la Factura × {personaMoralRate}%)
              </li>
            </ul>
          </div>
          <div className="space-y-2 pt-3 border-t">
            <h4 className="font-semibold text-sm">Aplicación en el Dashboard</h4>
            <p className="text-sm text-muted-foreground">
              Estos porcentajes se aplicarán automáticamente en el Dashboard al calcular el "Resguardo de IVA" 
              basándose en el tipo de cliente de cada factura registrada.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
