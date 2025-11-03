import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Save, Image as ImageIcon, Trash2, Palette } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';

interface PlatformSettings {
  id: string;
  platform_name: string;
  logo_url: string | null;
  logo_background_enabled: boolean;
  logo_background_color: string;
}

export function PlatformCustomization() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [platformName, setPlatformName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [backgroundEnabled, setBackgroundEnabled] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('#8b5cf6');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setPlatformName(settings.platform_name);
      setLogoPreview(settings.logo_url);
      setBackgroundEnabled(settings.logo_background_enabled);
      setBackgroundColor(settings.logo_background_color || '#8b5cf6');
    }
  }, [settings]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading platform settings:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('El logo no debe exceder 2MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona una imagen válida');
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = async () => {
    if (!settings?.logo_url) return;

    try {
      // Extract the file path from the URL
      const urlParts = settings.logo_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { error: deleteError } = await supabase.storage
        .from('platform-logos')
        .remove([fileName]);

      if (deleteError) throw deleteError;

      // Update settings to remove logo
      const { error: updateError } = await supabase
        .from('platform_settings')
        .update({ logo_url: null })
        .eq('id', settings.id);

      if (updateError) throw updateError;

      setLogoPreview(null);
      setLogoFile(null);
      setSettings({ ...settings, logo_url: null });
      // Invalidar el cache para que se actualice en toda la app
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success('Logo eliminado');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Error al eliminar logo');
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return settings?.logo_url || null;

    try {
      setUploading(true);

      // Delete old logo if exists
      if (settings?.logo_url) {
        const urlParts = settings.logo_url.split('/');
        const oldFileName = urlParts[urlParts.length - 1];
        await supabase.storage.from('platform-logos').remove([oldFileName]);
      }

      // Upload new logo
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('platform-logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('platform-logos')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Error al subir logo');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Upload logo if changed
      const logoUrl = await uploadLogo();

      // Update settings
      if (settings) {
        const { error } = await supabase
          .from('platform_settings')
          .update({
            platform_name: platformName,
            logo_url: logoUrl,
            logo_background_enabled: backgroundEnabled,
            logo_background_color: backgroundColor,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_settings')
          .insert({
            platform_name: platformName,
            logo_url: logoUrl,
            logo_background_enabled: backgroundEnabled,
            logo_background_color: backgroundColor,
          });

        if (error) throw error;
      }

      toast.success('Configuración guardada exitosamente');
      await loadSettings();
      // Invalidar el cache para que se actualice en toda la app
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      setLogoFile(null);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ImageIcon className="h-6 w-6" />
            Personalización de la Plataforma
          </CardTitle>
          <CardDescription>
            Configura el nombre y logo que se mostrarán en toda la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Platform Name */}
          <div className="space-y-2">
            <Label htmlFor="platform-name">Nombre de la Plataforma</Label>
            <Input
              id="platform-name"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              placeholder="Ej: Control Financiero"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              Este nombre aparecerá en la barra de navegación y en el título de la página
            </p>
          </div>

          {/* Logo Upload */}
          <div className="space-y-4">
            <Label>Logo de la Plataforma</Label>
            
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Logo Preview */}
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-32 w-32 rounded-lg border-2 border-border">
                  {logoPreview ? (
                    <AvatarImage src={logoPreview} alt="Logo preview" className="object-contain p-2" />
                  ) : (
                    <AvatarFallback className="rounded-lg bg-muted">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                {logoPreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar Logo
                  </Button>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Label
                    htmlFor="logo-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Haz clic para subir un logo
                    </span>
                    <span className="text-xs text-muted-foreground">
                      PNG, JPG o WEBP (máx. 2MB)
                    </span>
                  </Label>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <strong>Recomendaciones:</strong>
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                    <li>Tamaño recomendado: 512x512 píxeles</li>
                    <li>Formato cuadrado para mejor visualización</li>
                    <li>Fondo transparente (PNG) preferido</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Background Customization */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Fondo del Logo</Label>
                <p className="text-sm text-muted-foreground">
                  Activa un fondo de color detrás del logo
                </p>
              </div>
              <Switch
                checked={backgroundEnabled}
                onCheckedChange={setBackgroundEnabled}
              />
            </div>

            {backgroundEnabled && (
              <div className="space-y-2 pl-4 border-l-2">
                <Label htmlFor="bg-color" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Color de Fondo
                </Label>
                <div className="flex gap-3 items-center">
                  <Input
                    id="bg-color"
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    placeholder="#8b5cf6"
                    className="flex-1 font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecciona un color que combine con tu marca
                </p>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={loadSettings}
              disabled={saving || uploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading || !platformName.trim()}
              className="gap-2"
            >
              {saving || uploading ? (
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

      {/* Preview Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Vista Previa</CardTitle>
          <CardDescription>
            Así se verá el logo y nombre en la barra de navegación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <div 
              className="h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden transition-all"
              style={{
                background: backgroundEnabled 
                  ? backgroundColor 
                  : 'transparent'
              }}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-primary-foreground font-bold text-sm">
                  {platformName.substring(0, 2).toUpperCase() || 'CF'}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {platformName || 'Control Financiero'}
              </h2>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
