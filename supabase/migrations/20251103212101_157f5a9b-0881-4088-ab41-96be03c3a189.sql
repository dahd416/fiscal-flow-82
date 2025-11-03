-- Add business fields to profiles
ALTER TABLE public.profiles
ADD COLUMN business_name TEXT,
ADD COLUMN fiscal_name TEXT;