-- Add new fields to transactions table
ALTER TABLE transactions 
ADD COLUMN folio TEXT,
ADD COLUMN payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia')),
ADD COLUMN is_invoice BOOLEAN DEFAULT false,
DROP COLUMN category;

-- Rename description column to concept
ALTER TABLE transactions RENAME COLUMN description TO concept;

-- Add index on folio for better performance
CREATE INDEX idx_transactions_folio ON transactions(folio);

-- Add comment to explain folio
COMMENT ON COLUMN transactions.folio IS 'Folio/Número de la transacción. Si viene de cotización, se convierte en nota de venta';