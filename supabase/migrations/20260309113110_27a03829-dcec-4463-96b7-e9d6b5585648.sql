
-- Add invite token to vault_beneficiaries for shareable invite links
ALTER TABLE public.vault_beneficiaries ADD COLUMN IF NOT EXISTS invite_token text UNIQUE;

-- Add donor contact info to vaults for emergency warnings
ALTER TABLE public.vaults ADD COLUMN IF NOT EXISTS donor_email text;
ALTER TABLE public.vaults ADD COLUMN IF NOT EXISTS donor_phone text;

-- Add NFT support columns to deposit_history
ALTER TABLE public.deposit_history ADD COLUMN IF NOT EXISTS token_type text NOT NULL DEFAULT 'ETH';
ALTER TABLE public.deposit_history ADD COLUMN IF NOT EXISTS token_address text;
ALTER TABLE public.deposit_history ADD COLUMN IF NOT EXISTS token_id text;

-- Add emergency_attempts table to track failed verification attempts
CREATE TABLE IF NOT EXISTS public.emergency_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id uuid REFERENCES public.vaults(id) ON DELETE CASCADE NOT NULL,
  wallet_address text NOT NULL,
  attempt_number integer NOT NULL DEFAULT 1,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their emergency attempts"
  ON public.emergency_attempts FOR SELECT TO public
  USING (lower(wallet_address) = lower((current_setting('request.headers'::text, true)::json->>'x-wallet-address')));

CREATE POLICY "Users can insert their emergency attempts"
  ON public.emergency_attempts FOR INSERT TO public
  WITH CHECK (lower(wallet_address) = lower((current_setting('request.headers'::text, true)::json->>'x-wallet-address')));
