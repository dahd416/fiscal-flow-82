-- Crear tabla para configuración de impuestos
CREATE TABLE IF NOT EXISTS public.tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_fisica_rate numeric NOT NULL DEFAULT 13.79,
  persona_moral_rate numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Solo admins pueden modificar, todos pueden ver
CREATE POLICY "Admins can insert tax settings"
ON public.tax_settings
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tax settings"
ON public.tax_settings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view tax settings"
ON public.tax_settings
FOR SELECT
TO authenticated
USING (true);

-- Insertar configuración por defecto
INSERT INTO public.tax_settings (persona_fisica_rate, persona_moral_rate)
VALUES (13.79, 0)
ON CONFLICT DO NOTHING;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_tax_settings_updated_at
BEFORE UPDATE ON public.tax_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();