-- Donor notification audit trail.
--
-- The donor's ability to cancel an improper claim depends on being told a claim was filed,
-- so every notification attempt is recorded here — including attempts that were skipped for
-- want of a configured provider or a contact method on file. A missing message must be
-- visible after the fact, not indistinguishable from a delivered one.
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id uuid REFERENCES public.vaults(id) ON DELETE CASCADE NOT NULL,
  kind text NOT NULL,                       -- CLAIM_INITIATED | EMERGENCY_ATTEMPT
  channel text NOT NULL,                    -- email | sms
  status text NOT NULL,                     -- sent | failed | skipped
  provider_id text,                         -- Resend message id / Twilio SID
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_vault_id_idx ON public.notifications (vault_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications (created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Written only by edge functions using the service role, which bypasses RLS. No public
-- policy is granted: notification records are read back through claim-api, which scopes
-- the query to vaults the caller owns.

-- Claim freeze + donor cancellation state, mirroring the on-chain vault.
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS donor_window_ends timestamptz;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS donor_notified_at timestamptz;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS cancelled_by text;

ALTER TABLE public.vaults ADD COLUMN IF NOT EXISTS frozen boolean NOT NULL DEFAULT false;
ALTER TABLE public.vaults ADD COLUMN IF NOT EXISTS frozen_at timestamptz;
