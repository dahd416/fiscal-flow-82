-- Create platform_settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL DEFAULT 'Control Financiero',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view platform settings"
  ON public.platform_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert platform settings"
  ON public.platform_settings
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for platform logo
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-logos', 'platform-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for platform logos
CREATE POLICY "Anyone can view platform logos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'platform-logos');

CREATE POLICY "Admins can upload platform logos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'platform-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update platform logos"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'platform-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete platform logos"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'platform-logos' AND has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings if none exist
INSERT INTO public.platform_settings (platform_name, logo_url)
SELECT 'Control Financiero', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- Create trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();