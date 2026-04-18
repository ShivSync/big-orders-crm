-- Fix infinite recursion in users table RLS policy
-- The old policy had: EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
-- This caused infinite recursion because querying users triggers the same policy.
-- Fix: use a SECURITY DEFINER function that bypasses RLS for the is_root check.

CREATE OR REPLACE FUNCTION public.is_user_root(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_root FROM public.users WHERE id = p_user_id),
    false
  );
$$;

DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users
  FOR SELECT
  USING (
    auth.uid() = id
    OR is_user_root(auth.uid())
    OR user_has_permission(auth.uid(), 'users.view'::text)
  );

DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users
  FOR UPDATE
  USING (
    auth.uid() = id
    OR is_user_root(auth.uid())
    OR user_has_permission(auth.uid(), 'users.edit'::text)
  );
