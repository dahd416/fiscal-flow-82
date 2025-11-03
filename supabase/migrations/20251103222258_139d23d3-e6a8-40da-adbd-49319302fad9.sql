-- Add first_name and last_name columns to clients table
ALTER TABLE public.clients 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Migrate existing data from name to first_name (temporarily)
UPDATE public.clients 
SET first_name = name
WHERE name IS NOT NULL;

-- Drop the old name column
ALTER TABLE public.clients 
DROP COLUMN name;

-- Make first_name required
ALTER TABLE public.clients 
ALTER COLUMN first_name SET NOT NULL;