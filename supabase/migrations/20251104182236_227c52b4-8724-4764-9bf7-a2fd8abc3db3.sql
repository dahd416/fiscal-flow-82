-- Remove admin policies that allow viewing all transactions and clients
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can create transactions for any user" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update any transaction" ON public.transactions;
DROP POLICY IF EXISTS "Admins can delete any transaction" ON public.transactions;

-- Keep only user-specific policies for transactions
-- Users (including admins) can only see their own transactions
-- The existing "Users can view their own transactions" policy will handle this

-- Keep only user-specific policies for clients
-- Users (including admins) can only see their own clients
-- The existing "Users can view their own clients" policy will handle this