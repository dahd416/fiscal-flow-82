-- Add person_type column to clients table
ALTER TABLE public.clients 
ADD COLUMN person_type text CHECK (person_type IN ('persona_fisica', 'persona_moral', 'na'));