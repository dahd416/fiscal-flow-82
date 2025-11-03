-- Allow anonymous users to read invitations by token (only for validation)
CREATE POLICY "Anyone can read invitation by token"
ON public.user_invitations
FOR SELECT
TO anon
USING (true);