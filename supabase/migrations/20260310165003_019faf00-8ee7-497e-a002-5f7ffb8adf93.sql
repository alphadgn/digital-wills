CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text,
  email text,
  stripe_session_id text UNIQUE,
  tier text NOT NULL DEFAULT 'standard',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check purchase status"
ON public.purchases
FOR SELECT
TO public
USING (true);