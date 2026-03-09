
-- Vaults table: stores each vault created by a user
CREATE TABLE public.vaults (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  vault_contract_address TEXT,
  vault_name TEXT NOT NULL DEFAULT 'My Vault',
  chain_id INTEGER NOT NULL DEFAULT 33139,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLAIMED', 'DISTRIBUTED', 'PAUSED')),
  inactivity_period_days INTEGER NOT NULL DEFAULT 365,
  total_value_eth NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vaults"
  ON public.vaults FOR SELECT
  USING (lower(wallet_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address'));

CREATE POLICY "Users can insert their own vaults"
  ON public.vaults FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own vaults"
  ON public.vaults FOR UPDATE
  USING (lower(wallet_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address'));

-- Vault beneficiaries
CREATE TABLE public.vault_beneficiaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  allocation_percent INTEGER NOT NULL CHECK (allocation_percent > 0 AND allocation_percent <= 100),
  invite_sent BOOLEAN NOT NULL DEFAULT false,
  invite_accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view beneficiaries of their vaults"
  ON public.vault_beneficiaries FOR SELECT
  USING (vault_id IN (SELECT id FROM public.vaults WHERE lower(wallet_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address')));

CREATE POLICY "Users can insert beneficiaries"
  ON public.vault_beneficiaries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update beneficiaries of their vaults"
  ON public.vault_beneficiaries FOR UPDATE
  USING (vault_id IN (SELECT id FROM public.vaults WHERE lower(wallet_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address')));

CREATE POLICY "Users can delete beneficiaries of their vaults"
  ON public.vault_beneficiaries FOR DELETE
  USING (vault_id IN (SELECT id FROM public.vaults WHERE lower(wallet_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address')));

-- Deposit history
CREATE TABLE public.deposit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  tx_hash TEXT NOT NULL,
  amount_eth NUMERIC NOT NULL,
  from_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deposit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deposits for their vaults"
  ON public.deposit_history FOR SELECT
  USING (vault_id IN (SELECT id FROM public.vaults WHERE lower(wallet_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address')));

CREATE POLICY "Anyone can insert deposits"
  ON public.deposit_history FOR INSERT
  WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_vaults_updated_at
  BEFORE UPDATE ON public.vaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
