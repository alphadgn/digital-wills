
-- Liveness checks table for dead-man switch
CREATE TABLE public.liveness_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id uuid NOT NULL UNIQUE,
  wallet_address text NOT NULL,
  last_check_in timestamptz NOT NULL DEFAULT now(),
  challenge_issued_at timestamptz,
  challenge_responded boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Audit logs table for security hardening
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  wallet_address text NOT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Encrypted payloads table for zero-knowledge storage
CREATE TABLE public.encrypted_payloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id uuid NOT NULL,
  payload_type text NOT NULL DEFAULT 'will_document',
  ciphertext text NOT NULL,
  iv text NOT NULL,
  salt text NOT NULL,
  algo text NOT NULL DEFAULT 'AES-256-GCM',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.liveness_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encrypted_payloads ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE TRIGGER update_liveness_checks_updated_at
  BEFORE UPDATE ON public.liveness_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_encrypted_payloads_updated_at
  BEFORE UPDATE ON public.encrypted_payloads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
