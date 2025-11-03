-- Crear tabla de cotizaciones
CREATE TABLE public.quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  quotation_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  valid_until DATE,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de items de cotización
CREATE TABLE public.quotation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 16,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para quotations
CREATE POLICY "Users can view their own quotations"
  ON public.quotations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quotations"
  ON public.quotations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotations"
  ON public.quotations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotations"
  ON public.quotations FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas RLS para quotation_items
CREATE POLICY "Users can view items of their quotations"
  ON public.quotation_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations
      WHERE quotations.id = quotation_items.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create items for their quotations"
  ON public.quotation_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotations
      WHERE quotations.id = quotation_items.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items of their quotations"
  ON public.quotation_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations
      WHERE quotations.id = quotation_items.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items of their quotations"
  ON public.quotation_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations
      WHERE quotations.id = quotation_items.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- Trigger para actualizar updated_at
CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para generar número de cotización
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  year_part TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(quotation_number FROM '[0-9]+$') AS INTEGER
    )
  ), 0) + 1
  INTO next_number
  FROM quotations
  WHERE quotation_number LIKE 'COT-' || year_part || '%';
  
  RETURN 'COT-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$;