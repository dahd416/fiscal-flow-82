-- Agregar política para que admins puedan ver todas las transacciones
CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Agregar política para que admins puedan ver todos los clientes
CREATE POLICY "Admins can view all clients"
ON public.clients
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));