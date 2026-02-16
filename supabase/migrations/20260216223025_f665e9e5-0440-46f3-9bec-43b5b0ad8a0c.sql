
-- ============================================
-- LIMPEZA COMPLETA DA BASE (EXCETO CONVERSORES)
-- Mantém: 3 usuários + todas as tabelas de conversores intactas
-- ============================================

-- 1. Messenger
DELETE FROM public.messenger_messages;
DELETE FROM public.messenger_participants;
DELETE FROM public.messenger_presence;
DELETE FROM public.messenger_external_contacts;
DELETE FROM public.messenger_conversations;

-- 2. APAE
DELETE FROM public.apae_resultados;
DELETE FROM public.apae_razao_linhas;
DELETE FROM public.apae_relatorio_linhas;
DELETE FROM public.apae_banco_aplicacoes;
DELETE FROM public.apae_plano_contas;
DELETE FROM public.apae_sessoes;

-- 3. Financeiro
DELETE FROM public.transacao_anexos;
DELETE FROM public.transacoes;
DELETE FROM public.importacoes_extrato;
DELETE FROM public.recorrencias;
DELETE FROM public.metas_financeiras;
DELETE FROM public.categorias_financeiras;
DELETE FROM public.centros_custo;
DELETE FROM public.contas_bancarias;

-- 4. ERP
DELETE FROM public.venda_itens;
DELETE FROM public.vendas;
DELETE FROM public.compra_itens;
DELETE FROM public.compras;
DELETE FROM public.estoque_movimentos;
DELETE FROM public.produtos;
DELETE FROM public.categorias_produtos;
DELETE FROM public.unidades_medida;
DELETE FROM public.orcamento_itens;
DELETE FROM public.orcamentos_servico;
DELETE FROM public.clientes;
DELETE FROM public.fornecedores;

-- 5. Tarefas
DELETE FROM public.tarefa_arquivos;
DELETE FROM public.atividades;
DELETE FROM public.tarefas;
DELETE FROM public.tarefas_modelo;
DELETE FROM public.tarefa_modelo_regimes;

-- 6. Admin
DELETE FROM public.audit_logs;
DELETE FROM public.admin_notifications;
DELETE FROM public.admin_logicas;
DELETE FROM public.admin_prompts;

-- 7. Permissões
DELETE FROM public.permission_profile_items;
DELETE FROM public.permission_profiles;

-- 8. Contatos e departamentos
DELETE FROM public.contato_departamentos;
DELETE FROM public.empresa_contatos;

-- 9. Empresa config e módulos
DELETE FROM public.empresa_config;
DELETE FROM public.empresa_modulos;

-- 10. Domain events
DELETE FROM public.domain_events;

-- 11. RBAC novo
DELETE FROM public.entity_module_access;
DELETE FROM public.account_entities;
DELETE FROM public.legacy_entity_mapping;
DELETE FROM public.user_account_roles;
DELETE FROM public.accounts;
DELETE FROM public.entities;

-- 12. Vínculos empresa-usuário
DELETE FROM public.user_empresas;

-- 13. Empresas
DELETE FROM public.empresas;

-- 14. Profiles (manter apenas os 3 usuários)
DELETE FROM public.profiles 
WHERE id NOT IN (
  'ea1c9a69-e436-4de2-953b-432e5fff60ae',
  '0dd8d6c8-b2dc-4fe5-a7de-f0270319a51c',
  '87cbf0b0-3ade-438f-8155-b0d2101932ac'
);
