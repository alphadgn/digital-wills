
-- Claims table
CREATE TABLE public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id uuid NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  beneficiary_wallet text NOT NULL,
  status text NOT NULL DEFAULT 'INITIATED',
  beneficiary_vote boolean NOT NULL DEFAULT false,
  oracle_vote boolean,
  oracle_confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Oracle results table
CREATE TABLE public.oracle_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  deceased boolean NOT NULL,
  confidence numeric NOT NULL,
  sources text[] NOT NULL DEFAULT '{}',
  matched_name text,
  matched_dob text,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oracle_results ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger to claims
CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for claims
ALTER PUBLICATION supabase_realtime ADD TABLE public.claims;
