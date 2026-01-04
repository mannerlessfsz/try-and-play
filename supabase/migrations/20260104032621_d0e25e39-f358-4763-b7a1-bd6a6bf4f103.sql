-- Adicionar módulo 'gestao' ao enum app_module para unificar financialace e erp
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'gestao';

-- Comentário: Este módulo representa a unificação de 'financialace' e 'erp'
-- Os módulos legados (financialace, erp, ajustasped) são mantidos no enum
-- para compatibilidade com dados existentes, mas novos registros devem usar:
-- - 'gestao' ao invés de 'financialace' ou 'erp'
-- - 'conversores' ao invés de 'ajustasped'