
-- Adicionar 'super_admin' ao enum system_role (será commitado nesta transação)
ALTER TYPE public.system_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'owner';
