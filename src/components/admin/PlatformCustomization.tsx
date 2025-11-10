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
  favicon_url: string | null;
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

  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setPlatformName(settings.platform_name);
      setLogoPreview(settings.logo_url);
      setFaviconPreview(settings.favicon_url);
      setBackgroundEnabled(settings.logo_background_enabled);
      setBackgroundColor(settings.logo_background_color || '#8b5cf6');
      
      // Update favicon in the browser
      const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (link && settings.favicon_url) {
        link.href = settings.favicon_url;
      }
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
      if (file.size > 2 * 1024 * 1024) { // 2MB
        toast.error('El logo no debe exceder 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona una imagen válida');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) { // 1MB
        toast.error('El favicon no debe exceder 1MB');
        return;
      }
      if (!['image/png', 'image/x-icon', 'image/svg+xml'].includes(file.type)) {
        toast.error('Favicon debe ser .png, .ico, o .svg');
        return;
      }
      setFaviconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFaviconPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = async () => {
    if (!settings?.logo_url) return;
    try {
      const fileName = settings.logo_url.split('/').pop()!;
      await supabase.storage.from('platform-logos').remove([fileName]);
      await supabase.from('platform_settings').update({ logo_url: null }).eq('id', settings.id);
      setLogoPreview(null);
      setLogoFile(null);
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success('Logo eliminado');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Error al eliminar logo');
    }
  };
  
  const handleRemoveFavicon = async () => {
    if (!settings?.favicon_url) return;
    try {
      const fileName = settings.favicon_url.split('/').pop()!;
      await supabase.storage.from('platform-favicons').remove([fileName]);
      await supabase.from('platform_settings').update({ favicon_url: null }).eq('id', settings.id);
      setFaviconPreview(null);
      setFaviconFile(null);
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success('Favicon eliminado');
    } catch (error) {
      console.error('Error removing favicon:', error);
      toast.error('Error al eliminar favicon');
    }
  };

  const uploadFile = async (
    file: File | null,
    currentUrl: string | null | undefined,
    bucket: string,
    prefix: string
  ): Promise<string | null> => {
    if (!file) return currentUrl || null;
    setUploading(true);
    try {
      if (currentUrl) {
        const oldFileName = currentUrl.split('/').pop()!;
        await supabase.storage.from(bucket).remove([oldFileName]);
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `${prefix}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error(`Error uploading to ${bucket}:`, error);
      toast.error(`Error al subir archivo a ${bucket}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Start with current values
      const updates: any = {
        platform_name: platformName,
        logo_background_enabled: backgroundEnabled,
        logo_background_color: backgroundColor,
        logo_url: settings?.logo_url || null,
        favicon_url: settings?.favicon_url || null,
      };

      // Upload new logo if selected
      if (logoFile) {
        console.log('Uploading logo...');
        const logoUrl = await uploadFile(logoFile, settings?.logo_url, 'platform-logos', 'logo');
        if (logoUrl) {
          updates.logo_url = logoUrl;
          console.log('Logo uploaded:', logoUrl);
        }
      }

      // Upload new favicon if selected
      if (faviconFile) {
        console.log('Uploading favicon...');
        const faviconUrl = await uploadFile(faviconFile, settings?.favicon_url, 'platform-logos', 'favicon');
        if (faviconUrl) {
          updates.favicon_url = faviconUrl;
          console.log('Favicon uploaded:', faviconUrl);
        }
      }

      console.log('Saving updates:', updates);

      if (settings) {
        const { error } = await supabase
          .from('platform_settings')
          .update(updates)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_settings')
          .insert(updates);
        if (error) throw error;
      }

      toast.success('Configuración guardada exitosamente');
      await loadSettings();
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      setLogoFile(null);
      setFaviconFile(null);
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
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-40 w-full" />
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
            Configura el nombre, logo y favicon que se mostrarán en toda la aplicación
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
          </div>

          {/* Logo Upload */}
          <div className="space-y-4 pt-4 border-t">
            <Label>Logo de la Plataforma</Label>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
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
                  <Button variant="outline" size="sm" onClick={handleRemoveLogo} className="gap-2">
                    <Trash2 className="h-4 w-4" /> Eliminar Logo
                  </Button>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-upload" />
                  <Label htmlFor="logo-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium">Haz clic para subir un logo</span>
                    <span className="text-xs text-muted-foreground">PNG, JPG, WEBP (máx. 2MB)</span>
                  </Label>
                </div>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>Tamaño recomendado: 512x512 píxeles</li>
                  <li>Fondo transparente (PNG) preferido</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Favicon Upload */}
          <div className="space-y-4 pt-4 border-t">
            <Label>Favicon de la Plataforma</Label>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-16 w-16 rounded-lg border-2 border-border">
                  {faviconPreview ? (
                    <AvatarImage src={faviconPreview} alt="Favicon preview" className="object-contain p-1" />
                  ) : (
                    <AvatarFallback className="rounded-lg bg-muted">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                {faviconPreview && (
                  <Button variant="outline" size="sm" onClick={handleRemoveFavicon} className="gap-2">
                    <Trash2 className="h-4 w-4" /> Eliminar Favicon
                  </Button>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Input type="file" accept="image/png, image/x-icon, image/svg+xml" onChange={handleFaviconChange} className="hidden" id="favicon-upload" />
                  <Label htmlFor="favicon-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium">Haz clic para subir un favicon</span>
                    <span className="text-xs text-muted-foreground">PNG, ICO, SVG (máx. 1MB)</span>
                  </Label>
                </div>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>Tamaño recomendado: 32x32 píxeles</li>
                  <li>Formato .ico es el más compatible</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Background Customization */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Fondo del Logo</Label>
                <p className="text-sm text-muted-foreground">Activa un fondo de color detrás del logo en la barra de navegación</p>
              </div>
              <Switch checked={backgroundEnabled} onCheckedChange={setBackgroundEnabled} />
            </div>
            {backgroundEnabled && (
              <div className="space-y-2 pl-4 border-l-2">
                <Label htmlFor="bg-color" className="flex items-center gap-2"><Palette className="h-4 w-4" /> Color de Fondo</Label>
                <div className="flex gap-3 items-center">
                  <Input id="bg-color" type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-20 h-10 cursor-pointer" />
                  <Input type="text" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="flex-1 font-mono text-sm" />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={loadSettings} disabled={saving || uploading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || uploading || !platformName.trim()} className="gap-2">
              {(saving || uploading) ? (
                <><div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Guardando...</>
              ) : (
                <><Save className="h-4 w-4" /> Guardar Cambios</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Vista Previa</CardTitle>
          <CardDescription>Así se verá en la aplicación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Barra de Navegación</Label>
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg mt-1">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden transition-all" style={{ background: backgroundEnabled ? backgroundColor : 'transparent' }}>
                {logoPreview ? <img src={logoPreview} alt="Logo" className="h-full w-full object-contain p-1" /> : <span className="text-primary-foreground font-bold text-sm">{platformName.substring(0, 2).toUpperCase() || 'CF'}</span>}
              </div>
              <div>
                <h2 className="text-lg font-bold">{platformName || 'Nombre Plataforma'}</h2>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Pestaña del Navegador</Label>
            <div className="p-2 bg-muted rounded-lg mt-1">
              <div className="flex items-center p-2 bg-background rounded-t-md border border-b-0 shadow-sm">
                {faviconPreview ? <img src={faviconPreview} alt="Favicon" className="h-4 w-4 mr-2" /> : <ImageIcon className="h-4 w-4 mr-2 text-muted-foreground" />}
                <p className="text-xs text-foreground truncate flex-1">{platformName || 'Nombre Plataforma'} | Panel</p>
                <div className="text-muted-foreground text-xl">×</div>
              </div>
              <div className="h-12 bg-background rounded-b-md border border-t-0"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
