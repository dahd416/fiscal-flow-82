-- Create providers table
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  vat_number TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Create policies for providers
CREATE POLICY "Users can view their own providers"
  ON public.providers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own providers"
  ON public.providers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own providers"
  ON public.providers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own providers"
  ON public.providers FOR DELETE
  USING (auth.uid() = user_id);

-- Create transaction_concepts table for autocomplete
CREATE TABLE IF NOT EXISTS public.transaction_concepts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  concept TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, concept)
);

-- Enable RLS
ALTER TABLE public.transaction_concepts ENABLE ROW LEVEL SECURITY;

-- Create policies for transaction_concepts
CREATE POLICY "Users can view their own concepts"
  ON public.transaction_concepts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own concepts"
  ON public.transaction_concepts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own concepts"
  ON public.transaction_concepts FOR UPDATE
  USING (auth.uid() = user_id);

-- Add provider_id to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS provider_id UUID,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_provider_id ON public.transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_transaction_concepts_user_id ON public.transaction_concepts(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON public.providers(user_id);