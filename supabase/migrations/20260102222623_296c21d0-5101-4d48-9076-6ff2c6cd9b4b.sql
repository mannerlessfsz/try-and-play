-- Add cliente_id column to transacoes table to link transactions to clients
ALTER TABLE public.transacoes 
ADD COLUMN cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_transacoes_cliente_id ON public.transacoes(cliente_id);

-- Add comment for documentation
COMMENT ON COLUMN public.transacoes.cliente_id IS 'Optional link to a client (pessoa física or jurídica) for personal finance control';