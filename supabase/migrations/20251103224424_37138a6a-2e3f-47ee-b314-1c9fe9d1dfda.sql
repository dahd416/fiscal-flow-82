-- Add quotation_id to transactions table
ALTER TABLE public.transactions 
ADD COLUMN quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_transactions_quotation_id ON public.transactions(quotation_id);

-- Create trigger function to update quotation status when income is created
CREATE OR REPLACE FUNCTION public.update_quotation_on_income()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this is an income transaction linked to a quotation with status 'accepted'
  IF NEW.type = 'income' AND NEW.quotation_id IS NOT NULL THEN
    UPDATE public.quotations
    SET status = 'completed'
    WHERE id = NEW.quotation_id 
      AND status = 'accepted';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_quotation_on_income ON public.transactions;
CREATE TRIGGER trigger_update_quotation_on_income
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quotation_on_income();

-- Add 'completed' status to quotations if not exists
-- This is safe to run even if the status already exists
COMMENT ON COLUMN public.quotations.status IS 'Status: draft, sent, accepted, rejected, expired, completed';