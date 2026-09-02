ALTER TABLE public.vaults
  ADD COLUMN IF NOT EXISTS donor_legal_name text,
  ADD COLUMN IF NOT EXISTS donor_dob date;

CREATE INDEX IF NOT EXISTS encrypted_payloads_vault_type_idx
  ON public.encrypted_payloads (vault_id, payload_type);