-- Agregar campo subtotal a la tabla transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0;

-- Actualizar registros existentes para calcular el subtotal correcto
-- Si amount es el total y vat_rate es la tasa, entonces subtotal = amount / (1 + vat_rate/100)
UPDATE transactions 
SET subtotal = CASE 
  WHEN vat_rate > 0 THEN amount / (1 + vat_rate/100)
  ELSE amount
END
WHERE subtotal = 0 OR subtotal IS NULL;

-- Recalcular vat_amount basado en el subtotal
UPDATE transactions
SET vat_amount = subtotal * (vat_rate / 100)
WHERE vat_rate > 0;