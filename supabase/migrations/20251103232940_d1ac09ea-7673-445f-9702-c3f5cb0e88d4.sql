-- Eliminar el constraint existente si existe
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;

-- Agregar el nuevo constraint que incluye 'completed'
ALTER TABLE quotations ADD CONSTRAINT quotations_status_check 
CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'completed'));