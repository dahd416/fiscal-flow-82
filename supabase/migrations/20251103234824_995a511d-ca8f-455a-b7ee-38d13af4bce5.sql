-- Add foreign key constraint for provider_id
ALTER TABLE public.transactions
ADD CONSTRAINT fk_transactions_provider
FOREIGN KEY (provider_id) REFERENCES public.providers(id)
ON DELETE SET NULL;