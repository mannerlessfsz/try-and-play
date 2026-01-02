-- Drop the old constraint and create a new one that accepts "pago"
ALTER TABLE transacoes DROP CONSTRAINT transacoes_status_check;
ALTER TABLE transacoes ADD CONSTRAINT transacoes_status_check CHECK (status = ANY (ARRAY['pendente'::text, 'pago'::text, 'confirmado'::text, 'cancelado'::text]));