
-- Drop the open SELECT policy on purchases
DROP POLICY IF EXISTS "Anyone can check purchase status" ON public.purchases;
