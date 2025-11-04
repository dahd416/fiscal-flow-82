-- Permitir que admins y super_admins creen transacciones para cualquier usuario
CREATE POLICY "Admins can create transactions for any user"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);