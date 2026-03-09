
-- Fix permissive INSERT policies on vaults
DROP POLICY "Users can insert their own vaults" ON public.vaults;
CREATE POLICY "Users can insert their own vaults"
  ON public.vaults FOR INSERT
  WITH CHECK (lower(wallet_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address'));

-- Fix permissive INSERT policies on vault_beneficiaries
DROP POLICY "Users can insert beneficiaries" ON public.vault_beneficiaries;
CREATE POLICY "Users can insert beneficiaries"
  ON public.vault_beneficiaries FOR INSERT
  WITH CHECK (vault_id IN (SELECT id FROM public.vaults WHERE lower(wallet_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address')));

-- Fix permissive INSERT policies on deposit_history
DROP POLICY "Anyone can insert deposits" ON public.deposit_history;
CREATE POLICY "Users can insert deposits for their vaults"
  ON public.deposit_history FOR INSERT
  WITH CHECK (vault_id IN (SELECT id FROM public.vaults WHERE lower(wallet_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address')));
