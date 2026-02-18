export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_entities: {
        Row: {
          account_id: string
          created_at: string
          entity_id: string
          id: string
          is_active: boolean
          relationship: Database["public"]["Enums"]["account_entity_relationship"]
          settings: Json | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          entity_id: string
          id?: string
          is_active?: boolean
          relationship?: Database["public"]["Enums"]["account_entity_relationship"]
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          entity_id?: string
          id?: string
          is_active?: boolean
          relationship?: Database["public"]["Enums"]["account_entity_relationship"]
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_entities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_entities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          settings: Json | null
          slug: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          settings?: Json | null
          slug?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          settings?: Json | null
          slug?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      admin_logicas: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          modulo: string
          nome_logica: string
          updated_at: string
          versao: string
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          modulo: string
          nome_logica: string
          updated_at?: string
          versao?: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          modulo?: string
          nome_logica?: string
          updated_at?: string
          versao?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          dados: Json | null
          empresa_id: string | null
          id: string
          lida: boolean | null
          lida_em: string | null
          lida_por: string | null
          mensagem: string
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string
          dados?: Json | null
          empresa_id?: string | null
          id?: string
          lida?: boolean | null
          lida_em?: string | null
          lida_por?: string | null
          mensagem: string
          tipo: string
          titulo: string
        }
        Update: {
          created_at?: string
          dados?: Json | null
          empresa_id?: string | null
          id?: string
          lida?: boolean | null
          lida_em?: string | null
          lida_por?: string | null
          mensagem?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_prompts: {
        Row: {
          conteudo: string
          created_at: string
          created_by: string | null
          data: string
          id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      apae_banco_aplicacoes: {
        Row: {
          aplicacao1_codigo: string | null
          aplicacao2_codigo: string | null
          aplicacao3_codigo: string | null
          aplicacao4_codigo: string | null
          aplicacao5_codigo: string | null
          banco_codigo: string
          created_at: string
          id: string
          nome_relatorio: string | null
          sessao_id: string
        }
        Insert: {
          aplicacao1_codigo?: string | null
          aplicacao2_codigo?: string | null
          aplicacao3_codigo?: string | null
          aplicacao4_codigo?: string | null
          aplicacao5_codigo?: string | null
          banco_codigo: string
          created_at?: string
          id?: string
          nome_relatorio?: string | null
          sessao_id: string
        }
        Update: {
          aplicacao1_codigo?: string | null
          aplicacao2_codigo?: string | null
          aplicacao3_codigo?: string | null
          aplicacao4_codigo?: string | null
          aplicacao5_codigo?: string | null
          banco_codigo?: string
          created_at?: string
          id?: string
          nome_relatorio?: string | null
          sessao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apae_banco_aplicacoes_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "apae_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      apae_banco_aplicacoes_empresa: {
        Row: {
          aplicacao1_codigo: string | null
          aplicacao2_codigo: string | null
          aplicacao3_codigo: string | null
          aplicacao4_codigo: string | null
          aplicacao5_codigo: string | null
          banco_codigo: string
          created_at: string
          empresa_id: string
          id: string
          nome_relatorio: string | null
        }
        Insert: {
          aplicacao1_codigo?: string | null
          aplicacao2_codigo?: string | null
          aplicacao3_codigo?: string | null
          aplicacao4_codigo?: string | null
          aplicacao5_codigo?: string | null
          banco_codigo: string
          created_at?: string
          empresa_id: string
          id?: string
          nome_relatorio?: string | null
        }
        Update: {
          aplicacao1_codigo?: string | null
          aplicacao2_codigo?: string | null
          aplicacao3_codigo?: string | null
          aplicacao4_codigo?: string | null
          aplicacao5_codigo?: string | null
          banco_codigo?: string
          created_at?: string
          empresa_id?: string
          id?: string
          nome_relatorio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apae_banco_aplicacoes_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      apae_plano_contas: {
        Row: {
          classificacao: string | null
          cnpj: string | null
          codigo: string
          created_at: string
          descricao: string
          id: string
          is_aplicacao: boolean | null
          is_banco: boolean | null
          ordem: number | null
          sessao_id: string
        }
        Insert: {
          classificacao?: string | null
          cnpj?: string | null
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          is_aplicacao?: boolean | null
          is_banco?: boolean | null
          ordem?: number | null
          sessao_id: string
        }
        Update: {
          classificacao?: string | null
          cnpj?: string | null
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          is_aplicacao?: boolean | null
          is_banco?: boolean | null
          ordem?: number | null
          sessao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apae_plano_contas_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "apae_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      apae_planos_empresa: {
        Row: {
          classificacao: string | null
          cnpj: string | null
          codigo: string
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          is_aplicacao: boolean | null
          is_banco: boolean | null
          ordem: number | null
        }
        Insert: {
          classificacao?: string | null
          cnpj?: string | null
          codigo: string
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          is_aplicacao?: boolean | null
          is_banco?: boolean | null
          ordem?: number | null
        }
        Update: {
          classificacao?: string | null
          cnpj?: string | null
          codigo?: string
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          is_aplicacao?: boolean | null
          is_banco?: boolean | null
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "apae_planos_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      apae_razao_linhas: {
        Row: {
          conta_codigo: string
          conta_descricao: string | null
          created_at: string
          credito: string | null
          cta_c_part: string | null
          data: string | null
          debito: string | null
          historico: string | null
          id: string
          linha_numero: number
          saldo: string | null
          sessao_id: string
        }
        Insert: {
          conta_codigo: string
          conta_descricao?: string | null
          created_at?: string
          credito?: string | null
          cta_c_part?: string | null
          data?: string | null
          debito?: string | null
          historico?: string | null
          id?: string
          linha_numero?: number
          saldo?: string | null
          sessao_id: string
        }
        Update: {
          conta_codigo?: string
          conta_descricao?: string | null
          created_at?: string
          credito?: string | null
          cta_c_part?: string | null
          data?: string | null
          debito?: string | null
          historico?: string | null
          id?: string
          linha_numero?: number
          saldo?: string | null
          sessao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apae_razao_linhas_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "apae_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      apae_relatorio_linhas: {
        Row: {
          col_a: string | null
          col_b: string | null
          col_c: string | null
          col_d: string | null
          col_e: string | null
          col_f: string | null
          col_g: string | null
          col_h: string | null
          col_i: string | null
          created_at: string
          id: string
          linha_numero: number
          par_id: number | null
          sessao_id: string
          tipo_linha: string
        }
        Insert: {
          col_a?: string | null
          col_b?: string | null
          col_c?: string | null
          col_d?: string | null
          col_e?: string | null
          col_f?: string | null
          col_g?: string | null
          col_h?: string | null
          col_i?: string | null
          created_at?: string
          id?: string
          linha_numero: number
          par_id?: number | null
          sessao_id: string
          tipo_linha?: string
        }
        Update: {
          col_a?: string | null
          col_b?: string | null
          col_c?: string | null
          col_d?: string | null
          col_e?: string | null
          col_f?: string | null
          col_g?: string | null
          col_h?: string | null
          col_i?: string | null
          created_at?: string
          id?: string
          linha_numero?: number
          par_id?: number | null
          sessao_id?: string
          tipo_linha?: string
        }
        Relationships: [
          {
            foreignKeyName: "apae_relatorio_linhas_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "apae_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      apae_resultados: {
        Row: {
          centro_custo: string | null
          conta_credito_codigo: string | null
          conta_debito: string | null
          conta_debito_codigo: string | null
          created_at: string
          data_pagto: string | null
          fornecedor: string | null
          historico_concatenado: string | null
          historico_original: string | null
          id: string
          n_doc: string | null
          par_id: number
          sessao_id: string
          status: string | null
          valor: string | null
          valor_pago: string | null
          vencimento: string | null
        }
        Insert: {
          centro_custo?: string | null
          conta_credito_codigo?: string | null
          conta_debito?: string | null
          conta_debito_codigo?: string | null
          created_at?: string
          data_pagto?: string | null
          fornecedor?: string | null
          historico_concatenado?: string | null
          historico_original?: string | null
          id?: string
          n_doc?: string | null
          par_id: number
          sessao_id: string
          status?: string | null
          valor?: string | null
          valor_pago?: string | null
          vencimento?: string | null
        }
        Update: {
          centro_custo?: string | null
          conta_credito_codigo?: string | null
          conta_debito?: string | null
          conta_debito_codigo?: string | null
          created_at?: string
          data_pagto?: string | null
          fornecedor?: string | null
          historico_concatenado?: string | null
          historico_original?: string | null
          id?: string
          n_doc?: string | null
          par_id?: number
          sessao_id?: string
          status?: string | null
          valor?: string | null
          valor_pago?: string | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apae_resultados_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "apae_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      apae_sessoes: {
        Row: {
          codigo_vinculo: string | null
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          metadados: Json | null
          nome_sessao: string | null
          passo_atual: number
          plano_contas_arquivo: string | null
          relatorio_arquivo: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          codigo_vinculo?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: string
          metadados?: Json | null
          nome_sessao?: string | null
          passo_atual?: number
          plano_contas_arquivo?: string | null
          relatorio_arquivo?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          codigo_vinculo?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          metadados?: Json | null
          nome_sessao?: string | null
          passo_atual?: number
          plano_contas_arquivo?: string | null
          relatorio_arquivo?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apae_sessoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades: {
        Row: {
          created_at: string
          descricao: string
          empresa_id: string | null
          id: string
          metadados: Json | null
          modulo: string | null
          tarefa_id: string | null
          tipo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          empresa_id?: string | null
          id?: string
          metadados?: Json | null
          modulo?: string | null
          tarefa_id?: string | null
          tipo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          empresa_id?: string | null
          id?: string
          metadados?: Json | null
          modulo?: string | null
          tarefa_id?: string | null
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categorias_financeiras: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string
          empresa_id: string
          icone: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string
          empresa_id: string
          icone?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string
          empresa_id?: string
          icone?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_financeiras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_produtos: {
        Row: {
          ativo: boolean | null
          categoria_pai_id: string | null
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          categoria_pai_id?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          categoria_pai_id?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_produtos_categoria_pai_id_fkey"
            columns: ["categoria_pai_id"]
            isOneToOne: false
            referencedRelation: "categorias_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_custo: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "centros_custo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          empresa_id: string
          endereco: string | null
          estado: string | null
          id: string
          limite_credito: number | null
          nome: string
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          pais: string | null
          rg_ie: string | null
          telefone: string | null
          tipo_pessoa: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id: string
          endereco?: string | null
          estado?: string | null
          id?: string
          limite_credito?: number | null
          nome: string
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          rg_ie?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          limite_credito?: number | null
          nome?: string
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          rg_ie?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      compra_itens: {
        Row: {
          compra_id: string
          created_at: string
          desconto_percentual: number | null
          desconto_valor: number | null
          id: string
          observacao: string | null
          preco_unitario: number
          produto_id: string
          quantidade: number
          quantidade_recebida: number | null
          total: number
        }
        Insert: {
          compra_id: string
          created_at?: string
          desconto_percentual?: number | null
          desconto_valor?: number | null
          id?: string
          observacao?: string | null
          preco_unitario: number
          produto_id: string
          quantidade?: number
          quantidade_recebida?: number | null
          total: number
        }
        Update: {
          compra_id?: string
          created_at?: string
          desconto_percentual?: number | null
          desconto_valor?: number | null
          id?: string
          observacao?: string | null
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          quantidade_recebida?: number | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "compra_itens_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      compras: {
        Row: {
          condicao_pagamento: string | null
          created_at: string
          created_by: string | null
          data_compra: string
          data_entrega_prevista: string | null
          data_entrega_real: string | null
          desconto_percentual: number | null
          desconto_valor: number | null
          empresa_id: string
          forma_pagamento: string | null
          fornecedor_id: string | null
          frete: number | null
          id: string
          numero: number | null
          observacoes: string | null
          observacoes_internas: string | null
          outras_despesas: number | null
          status: Database["public"]["Enums"]["status_pedido"] | null
          subtotal: number | null
          total: number | null
          updated_at: string
        }
        Insert: {
          condicao_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          data_compra?: string
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          empresa_id: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          frete?: number | null
          id?: string
          numero?: number | null
          observacoes?: string | null
          observacoes_internas?: string | null
          outras_despesas?: number | null
          status?: Database["public"]["Enums"]["status_pedido"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          condicao_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          data_compra?: string
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          empresa_id?: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          frete?: number | null
          id?: string
          numero?: number | null
          observacoes?: string | null
          observacoes_internas?: string | null
          outras_despesas?: number | null
          status?: Database["public"]["Enums"]["status_pedido"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco: string
          conta: string | null
          cor: string | null
          created_at: string
          empresa_id: string
          id: string
          nome: string
          saldo_inicial: number | null
          tipo: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco: string
          conta?: string | null
          cor?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          saldo_inicial?: number | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco?: string
          conta?: string | null
          cor?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          saldo_inicial?: number | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contato_departamentos: {
        Row: {
          contato_id: string
          created_at: string
          departamento: Database["public"]["Enums"]["departamento_tipo"]
          id: string
        }
        Insert: {
          contato_id: string
          created_at?: string
          departamento: Database["public"]["Enums"]["departamento_tipo"]
          id?: string
        }
        Update: {
          contato_id?: string
          created_at?: string
          departamento?: Database["public"]["Enums"]["departamento_tipo"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contato_departamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "empresa_contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      controle_creditos_guias: {
        Row: {
          controle_id: string
          created_at: string
          credito_icms_proprio: number
          credito_icms_st: number
          guia_id: string
          id: string
          numero_nota: string
          observacao: string | null
          status_guia: string | null
          valor_guia: number
          valor_utilizado: number
        }
        Insert: {
          controle_id: string
          created_at?: string
          credito_icms_proprio?: number
          credito_icms_st?: number
          guia_id: string
          id?: string
          numero_nota: string
          observacao?: string | null
          status_guia?: string | null
          valor_guia?: number
          valor_utilizado?: number
        }
        Update: {
          controle_id?: string
          created_at?: string
          credito_icms_proprio?: number
          credito_icms_st?: number
          guia_id?: string
          id?: string
          numero_nota?: string
          observacao?: string | null
          status_guia?: string | null
          valor_guia?: number
          valor_utilizado?: number
        }
        Relationships: [
          {
            foreignKeyName: "controle_creditos_guias_controle_id_fkey"
            columns: ["controle_id"]
            isOneToOne: false
            referencedRelation: "controle_creditos_icms_st"
            referencedColumns: ["id"]
          },
        ]
      }
      controle_creditos_icms_st: {
        Row: {
          competencia_ano: number
          competencia_mes: number
          conferido_em: string | null
          conferido_por: string | null
          created_at: string
          credito_periodo: number
          empresa_id: string
          estornado_periodo: number
          guias_nao_pagas: number
          guias_utilizadas: number
          guias_utilizaveis: number
          id: string
          observacoes: string | null
          saldo_anterior: number
          saldo_final: number
          status: string
          total_guias: number
          updated_at: string
          utilizado_periodo: number
        }
        Insert: {
          competencia_ano: number
          competencia_mes: number
          conferido_em?: string | null
          conferido_por?: string | null
          created_at?: string
          credito_periodo?: number
          empresa_id: string
          estornado_periodo?: number
          guias_nao_pagas?: number
          guias_utilizadas?: number
          guias_utilizaveis?: number
          id?: string
          observacoes?: string | null
          saldo_anterior?: number
          saldo_final?: number
          status?: string
          total_guias?: number
          updated_at?: string
          utilizado_periodo?: number
        }
        Update: {
          competencia_ano?: number
          competencia_mes?: number
          conferido_em?: string | null
          conferido_por?: string | null
          created_at?: string
          credito_periodo?: number
          empresa_id?: string
          estornado_periodo?: number
          guias_nao_pagas?: number
          guias_utilizadas?: number
          guias_utilizaveis?: number
          id?: string
          observacoes?: string | null
          saldo_anterior?: number
          saldo_final?: number
          status?: string
          total_guias?: number
          updated_at?: string
          utilizado_periodo?: number
        }
        Relationships: []
      }
      conversoes_arquivos: {
        Row: {
          arquivo_convertido_url: string | null
          arquivo_original_url: string | null
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          linhas_erro: number | null
          linhas_processadas: number | null
          mensagem_erro: string | null
          metadados: Json | null
          modulo: string
          nome_arquivo_convertido: string | null
          nome_arquivo_original: string
          status: string
          total_linhas: number | null
        }
        Insert: {
          arquivo_convertido_url?: string | null
          arquivo_original_url?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: string
          linhas_erro?: number | null
          linhas_processadas?: number | null
          mensagem_erro?: string | null
          metadados?: Json | null
          modulo: string
          nome_arquivo_convertido?: string | null
          nome_arquivo_original: string
          status?: string
          total_linhas?: number | null
        }
        Update: {
          arquivo_convertido_url?: string | null
          arquivo_original_url?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          linhas_erro?: number | null
          linhas_processadas?: number | null
          mensagem_erro?: string | null
          metadados?: Json | null
          modulo?: string
          nome_arquivo_convertido?: string | null
          nome_arquivo_original?: string
          status?: string
          total_linhas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversoes_arquivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_events: {
        Row: {
          account_id: string
          created_at: string
          entity_id: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          source_module: string
        }
        Insert: {
          account_id: string
          created_at?: string
          entity_id?: string | null
          event_type: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          source_module: string
        }
        Update: {
          account_id?: string
          created_at?: string
          entity_id?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          source_module?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_config: {
        Row: {
          campos_customizados: Json | null
          configuracoes: Json | null
          created_at: string
          empresa_id: string
          id: string
          modulos_habilitados: Json | null
          tipo_empresa: Database["public"]["Enums"]["tipo_empresa"]
          updated_at: string
        }
        Insert: {
          campos_customizados?: Json | null
          configuracoes?: Json | null
          created_at?: string
          empresa_id: string
          id?: string
          modulos_habilitados?: Json | null
          tipo_empresa?: Database["public"]["Enums"]["tipo_empresa"]
          updated_at?: string
        }
        Update: {
          campos_customizados?: Json | null
          configuracoes?: Json | null
          created_at?: string
          empresa_id?: string
          id?: string
          modulos_habilitados?: Json | null
          tipo_empresa?: Database["public"]["Enums"]["tipo_empresa"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_contatos: {
        Row: {
          ativo: boolean | null
          cargo: string | null
          created_at: string
          email: string
          empresa_id: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cargo?: string | null
          created_at?: string
          email: string
          empresa_id: string
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cargo?: string | null
          created_at?: string
          email?: string
          empresa_id?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_contatos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_modulos: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          modo: string
          modulo: Database["public"]["Enums"]["app_module"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          modo?: string
          modulo: Database["public"]["Enums"]["app_module"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          modo?: string
          modulo?: Database["public"]["Enums"]["app_module"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_modulos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          apae_plano_contas_arquivo: string | null
          ativo: boolean
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          manager_id: string | null
          nome: string
          regime_tributario:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          apae_plano_contas_arquivo?: string | null
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          manager_id?: string | null
          nome: string
          regime_tributario?:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          apae_plano_contas_arquivo?: string | null
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          manager_id?: string | null
          nome?: string
          regime_tributario?:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      empresas_externas_conversores: {
        Row: {
          ativo: boolean | null
          cnpj: string | null
          codigo_empresa: string
          created_at: string
          created_by: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          codigo_empresa: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          codigo_empresa?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      entities: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          legal_name: string
          metadata: Json | null
          phone: string | null
          regime_tributario:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          tax_id: string | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name: string
          metadata?: Json | null
          phone?: string | null
          regime_tributario?:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string
          metadata?: Json | null
          phone?: string | null
          regime_tributario?:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      entity_module_access: {
        Row: {
          access_level: Database["public"]["Enums"]["entity_access_level"]
          account_entity_id: string
          created_at: string
          id: string
          is_active: boolean
          module: string
          updated_at: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["entity_access_level"]
          account_entity_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          module: string
          updated_at?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["entity_access_level"]
          account_entity_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          module?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_module_access_account_entity_id_fkey"
            columns: ["account_entity_id"]
            isOneToOne: false
            referencedRelation: "account_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_movimentos: {
        Row: {
          created_at: string
          created_by: string | null
          custo_total: number | null
          custo_unitario: number | null
          documento_id: string | null
          documento_tipo: string | null
          empresa_id: string
          id: string
          lote: string | null
          observacao: string | null
          produto_id: string
          quantidade: number
          saldo_anterior: number | null
          saldo_posterior: number | null
          tipo: Database["public"]["Enums"]["tipo_movimento_estoque"]
          validade: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo_total?: number | null
          custo_unitario?: number | null
          documento_id?: string | null
          documento_tipo?: string | null
          empresa_id: string
          id?: string
          lote?: string | null
          observacao?: string | null
          produto_id: string
          quantidade: number
          saldo_anterior?: number | null
          saldo_posterior?: number | null
          tipo: Database["public"]["Enums"]["tipo_movimento_estoque"]
          validade?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo_total?: number | null
          custo_unitario?: number | null
          documento_id?: string | null
          documento_tipo?: string | null
          empresa_id?: string
          id?: string
          lote?: string | null
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          saldo_anterior?: number | null
          saldo_posterior?: number | null
          tipo?: Database["public"]["Enums"]["tipo_movimento_estoque"]
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          condicao_pagamento: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          empresa_id: string
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          pais: string | null
          prazo_entrega_dias: number | null
          rg_ie: string | null
          telefone: string | null
          tipo_pessoa: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          condicao_pagamento?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          prazo_entrega_dias?: number | null
          rg_ie?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          condicao_pagamento?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          prazo_entrega_dias?: number | null
          rg_ie?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      guias_pagamentos: {
        Row: {
          codigo_barras: string | null
          created_at: string
          credito_icms_proprio: string | null
          credito_icms_st: string | null
          data_nota: string | null
          data_pagamento: string | null
          empresa_id: string
          id: string
          numero_doc_pagamento: string | null
          numero_nota: string
          observacoes: string | null
          produto: string | null
          status: string | null
          updated_at: string
          valor_guia: number
        }
        Insert: {
          codigo_barras?: string | null
          created_at?: string
          credito_icms_proprio?: string | null
          credito_icms_st?: string | null
          data_nota?: string | null
          data_pagamento?: string | null
          empresa_id: string
          id?: string
          numero_doc_pagamento?: string | null
          numero_nota: string
          observacoes?: string | null
          produto?: string | null
          status?: string | null
          updated_at?: string
          valor_guia?: number
        }
        Update: {
          codigo_barras?: string | null
          created_at?: string
          credito_icms_proprio?: string | null
          credito_icms_st?: string | null
          data_nota?: string | null
          data_pagamento?: string | null
          empresa_id?: string
          id?: string
          numero_doc_pagamento?: string | null
          numero_nota?: string
          observacoes?: string | null
          produto?: string | null
          status?: string | null
          updated_at?: string
          valor_guia?: number
        }
        Relationships: [
          {
            foreignKeyName: "guias_pagamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      importacoes_extrato: {
        Row: {
          conta_bancaria_id: string
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          empresa_id: string
          erro_mensagem: string | null
          id: string
          nome_arquivo: string
          status: string
          tipo_arquivo: string
          total_transacoes: number | null
          transacoes_duplicadas: number | null
          transacoes_importadas: number | null
        }
        Insert: {
          conta_bancaria_id: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id: string
          erro_mensagem?: string | null
          id?: string
          nome_arquivo: string
          status?: string
          tipo_arquivo: string
          total_transacoes?: number | null
          transacoes_duplicadas?: number | null
          transacoes_importadas?: number | null
        }
        Update: {
          conta_bancaria_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string
          erro_mensagem?: string | null
          id?: string
          nome_arquivo?: string
          status?: string
          tipo_arquivo?: string
          total_transacoes?: number | null
          transacoes_duplicadas?: number | null
          transacoes_importadas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "importacoes_extrato_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacoes_extrato_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_entity_mapping: {
        Row: {
          id: string
          migrated_at: string
          new_account_id: string
          new_entity_id: string
          old_empresa_id: string
        }
        Insert: {
          id?: string
          migrated_at?: string
          new_account_id: string
          new_entity_id: string
          old_empresa_id: string
        }
        Update: {
          id?: string
          migrated_at?: string
          new_account_id?: string
          new_entity_id?: string
          old_empresa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legacy_entity_mapping_new_account_id_fkey"
            columns: ["new_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_entity_mapping_new_entity_id_fkey"
            columns: ["new_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          departamento: Database["public"]["Enums"]["departamento_tipo"] | null
          description: string | null
          empresa_id: string
          id: string
          is_private: boolean | null
          name: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          departamento?: Database["public"]["Enums"]["departamento_tipo"] | null
          description?: string | null
          empresa_id: string
          id?: string
          is_private?: boolean | null
          name?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          departamento?: Database["public"]["Enums"]["departamento_tipo"] | null
          description?: string | null
          empresa_id?: string
          id?: string
          is_private?: boolean | null
          name?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_conversations_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_external_contacts: {
        Row: {
          avatar_url: string | null
          cliente_id: string | null
          conversation_id: string | null
          created_at: string
          empresa_id: string
          fornecedor_id: string | null
          id: string
          is_active: boolean | null
          last_message_at: string | null
          name: string
          phone: string
          tag: string | null
          updated_at: string
          whatsapp_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          cliente_id?: string | null
          conversation_id?: string | null
          created_at?: string
          empresa_id: string
          fornecedor_id?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          name: string
          phone: string
          tag?: string | null
          updated_at?: string
          whatsapp_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          cliente_id?: string | null
          conversation_id?: string | null
          created_at?: string
          empresa_id?: string
          fornecedor_id?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          name?: string
          phone?: string
          tag?: string | null
          updated_at?: string
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messenger_external_contacts_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messenger_external_contacts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "messenger_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messenger_external_contacts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messenger_external_contacts_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          mentions: string[] | null
          message_type: string | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          mentions?: string[] | null
          message_type?: string | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          mentions?: string[] | null
          message_type?: string | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "messenger_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messenger_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messenger_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_participants: {
        Row: {
          conversation_id: string
          id: string
          is_muted: boolean | null
          joined_at: string
          last_read_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "messenger_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_presence: {
        Row: {
          empresa_id: string
          last_seen_at: string | null
          status: Database["public"]["Enums"]["presence_status"] | null
          status_message: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          empresa_id: string
          last_seen_at?: string | null
          status?: Database["public"]["Enums"]["presence_status"] | null
          status_message?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          empresa_id?: string
          last_seen_at?: string | null
          status?: Database["public"]["Enums"]["presence_status"] | null
          status_message?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_presence_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_financeiras: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          tipo: string
          updated_at: string
          valor_atual: number | null
          valor_meta: number
        }
        Insert: {
          ativo?: boolean | null
          categoria_id?: string | null
          created_at?: string
          data_fim: string
          data_inicio: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
          tipo: string
          updated_at?: string
          valor_atual?: number | null
          valor_meta: number
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string | null
          created_at?: string
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          valor_atual?: number | null
          valor_meta?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_financeiras_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_financeiras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_entrada_st: {
        Row: {
          bc_icms_st: number | null
          competencia: string | null
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          desconto: number | null
          empresa_id: string
          fornecedor: string
          frete: number | null
          id: string
          ipi: number | null
          ncm: string | null
          nfe: string
          observacoes: string | null
          pct_fecp: number | null
          pct_icms_interestadual: number | null
          pct_icms_interno: number | null
          pct_mva: number | null
          quantidade: number | null
          total_st: number | null
          updated_at: string
          valor_fecp: number | null
          valor_icms_nf: number | null
          valor_icms_st: number | null
          valor_produto: number | null
          valor_st_un: number | null
          valor_total: number | null
        }
        Insert: {
          bc_icms_st?: number | null
          competencia?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          desconto?: number | null
          empresa_id: string
          fornecedor: string
          frete?: number | null
          id?: string
          ipi?: number | null
          ncm?: string | null
          nfe: string
          observacoes?: string | null
          pct_fecp?: number | null
          pct_icms_interestadual?: number | null
          pct_icms_interno?: number | null
          pct_mva?: number | null
          quantidade?: number | null
          total_st?: number | null
          updated_at?: string
          valor_fecp?: number | null
          valor_icms_nf?: number | null
          valor_icms_st?: number | null
          valor_produto?: number | null
          valor_st_un?: number | null
          valor_total?: number | null
        }
        Update: {
          bc_icms_st?: number | null
          competencia?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          desconto?: number | null
          empresa_id?: string
          fornecedor?: string
          frete?: number | null
          id?: string
          ipi?: number | null
          ncm?: string | null
          nfe?: string
          observacoes?: string | null
          pct_fecp?: number | null
          pct_icms_interestadual?: number | null
          pct_icms_interno?: number | null
          pct_mva?: number | null
          quantidade?: number | null
          total_st?: number | null
          updated_at?: string
          valor_fecp?: number | null
          valor_icms_nf?: number | null
          valor_icms_st?: number | null
          valor_produto?: number | null
          valor_st_un?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_entrada_st_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens: {
        Row: {
          created_at: string
          desconto_percentual: number | null
          desconto_valor: number | null
          descricao: string
          id: string
          observacao: string | null
          orcamento_id: string
          quantidade: number
          total: number
          unidade: string | null
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          desconto_percentual?: number | null
          desconto_valor?: number | null
          descricao: string
          id?: string
          observacao?: string | null
          orcamento_id: string
          quantidade?: number
          total: number
          unidade?: string | null
          valor_unitario: number
        }
        Update: {
          created_at?: string
          desconto_percentual?: number | null
          desconto_valor?: number | null
          descricao?: string
          id?: string
          observacao?: string | null
          orcamento_id?: string
          quantidade?: number
          total?: number
          unidade?: string | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos_servico: {
        Row: {
          cliente_id: string | null
          condicao_pagamento: string | null
          created_at: string
          created_by: string | null
          data_orcamento: string
          data_validade: string | null
          desconto_percentual: number | null
          desconto_valor: number | null
          descricao: string | null
          empresa_id: string
          id: string
          numero: number | null
          observacoes: string | null
          observacoes_internas: string | null
          status: string
          subtotal: number | null
          titulo: string
          total: number | null
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          condicao_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          data_orcamento?: string
          data_validade?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          descricao?: string | null
          empresa_id: string
          id?: string
          numero?: number | null
          observacoes?: string | null
          observacoes_internas?: string | null
          status?: string
          subtotal?: number | null
          titulo: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          condicao_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          data_orcamento?: string
          data_validade?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          numero?: number | null
          observacoes?: string | null
          observacoes_internas?: string | null
          status?: string
          subtotal?: number | null
          titulo?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_servico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_profile_items: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_export: boolean | null
          can_view: boolean | null
          created_at: string
          id: string
          module: string
          profile_id: string
          resource: string
          sub_module: string | null
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_export?: boolean | null
          can_view?: boolean | null
          created_at?: string
          id?: string
          module: string
          profile_id: string
          resource: string
          sub_module?: string | null
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_export?: boolean | null
          can_view?: boolean | null
          created_at?: string
          id?: string
          module?: string
          profile_id?: string
          resource?: string
          sub_module?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_profile_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_profiles: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          role_padrao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          role_padrao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          role_padrao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      permissions_catalog: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          module: string
          resource: string | null
          sub_module: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
          resource?: string | null
          sub_module?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          resource?: string | null
          sub_module?: string | null
        }
        Relationships: []
      }
      planos_contas_externos: {
        Row: {
          arquivo_url: string | null
          ativo: boolean | null
          created_at: string
          created_by: string | null
          empresa_externa_id: string
          id: string
          metadados: Json | null
          nome_arquivo: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          ativo?: boolean | null
          created_at?: string
          created_by?: string | null
          empresa_externa_id: string
          id?: string
          metadados?: Json | null
          nome_arquivo: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          ativo?: boolean | null
          created_at?: string
          created_by?: string | null
          empresa_externa_id?: string
          id?: string
          metadados?: Json | null
          nome_arquivo?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_contas_externos_empresa_externa_id_fkey"
            columns: ["empresa_externa_id"]
            isOneToOne: false
            referencedRelation: "empresas_externas_conversores"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          codigo: string | null
          codigo_barras: string | null
          controla_estoque: boolean | null
          created_at: string
          descricao: string | null
          empresa_id: string
          estoque_atual: number | null
          estoque_maximo: number | null
          estoque_minimo: number | null
          id: string
          imagem_url: string | null
          margem_lucro: number | null
          ncm: string | null
          nome: string
          peso: number | null
          preco_custo: number | null
          preco_venda: number | null
          sku: string | null
          tipo: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          categoria_id?: string | null
          codigo?: string | null
          codigo_barras?: string | null
          controla_estoque?: boolean | null
          created_at?: string
          descricao?: string | null
          empresa_id: string
          estoque_atual?: number | null
          estoque_maximo?: number | null
          estoque_minimo?: number | null
          id?: string
          imagem_url?: string | null
          margem_lucro?: number | null
          ncm?: string | null
          nome: string
          peso?: number | null
          preco_custo?: number | null
          preco_venda?: number | null
          sku?: string | null
          tipo?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string | null
          codigo?: string | null
          codigo_barras?: string | null
          controla_estoque?: boolean | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          estoque_atual?: number | null
          estoque_maximo?: number | null
          estoque_minimo?: number | null
          id?: string
          imagem_url?: string | null
          margem_lucro?: number | null
          ncm?: string | null
          nome?: string
          peso?: number | null
          preco_custo?: number | null
          preco_venda?: number | null
          sku?: string | null
          tipo?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recorrencias: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          centro_custo_id: string | null
          conta_bancaria_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string
          dia_semana: number | null
          dia_vencimento: number | null
          empresa_id: string
          frequencia: string
          gerar_automatico: boolean | null
          id: string
          proxima_geracao: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean | null
          categoria_id?: string | null
          centro_custo_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao: string
          dia_semana?: number | null
          dia_vencimento?: number | null
          empresa_id: string
          frequencia: string
          gerar_automatico?: boolean | null
          id?: string
          proxima_geracao: string
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string | null
          centro_custo_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string
          dia_semana?: number | null
          dia_vencimento?: number | null
          empresa_id?: string
          frequencia?: string
          gerar_automatico?: boolean | null
          id?: string
          proxima_geracao?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "recorrencias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_exclusao_lider: {
        Row: {
          ativo: boolean | null
          conta_credito: string | null
          conta_debito: string | null
          created_at: string
          created_by: string | null
          descricao: string
          empresa_id: string
          id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          conta_credito?: string | null
          conta_debito?: string | null
          created_at?: string
          created_by?: string | null
          descricao: string
          empresa_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          conta_credito?: string | null
          conta_debito?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string
          empresa_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_exclusao_lider_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          account_id: string
          conditions: Json | null
          created_at: string
          effect: Database["public"]["Enums"]["permission_effect"]
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["system_role"]
        }
        Insert: {
          account_id: string
          conditions?: Json | null
          created_at?: string
          effect?: Database["public"]["Enums"]["permission_effect"]
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["system_role"]
        }
        Update: {
          account_id?: string
          conditions?: Json | null
          created_at?: string
          effect?: Database["public"]["Enums"]["permission_effect"]
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["system_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_arquivos: {
        Row: {
          created_at: string
          id: string
          nome: string
          tamanho: number
          tarefa_id: string
          tipo: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          tamanho: number
          tarefa_id: string
          tipo: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          tamanho?: number
          tarefa_id?: string
          tipo?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_arquivos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_modelo_regimes: {
        Row: {
          created_at: string
          id: string
          regime_tributario: Database["public"]["Enums"]["regime_tributario"]
          tarefa_modelo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          regime_tributario: Database["public"]["Enums"]["regime_tributario"]
          tarefa_modelo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          regime_tributario?: Database["public"]["Enums"]["regime_tributario"]
          tarefa_modelo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_modelo_regimes_tarefa_modelo_id_fkey"
            columns: ["tarefa_modelo_id"]
            isOneToOne: false
            referencedRelation: "tarefas_modelo"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          contato_id: string | null
          created_at: string
          data_envio_automatico: string | null
          data_vencimento: string | null
          departamento: Database["public"]["Enums"]["departamento_tipo"] | null
          descricao: string | null
          empresa_id: string | null
          envio_automatico: boolean | null
          id: string
          justificativa: string | null
          prazo_entrega: string | null
          prioridade: string
          progresso: number | null
          requer_anexo: boolean | null
          responsavel: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          contato_id?: string | null
          created_at?: string
          data_envio_automatico?: string | null
          data_vencimento?: string | null
          departamento?: Database["public"]["Enums"]["departamento_tipo"] | null
          descricao?: string | null
          empresa_id?: string | null
          envio_automatico?: boolean | null
          id?: string
          justificativa?: string | null
          prazo_entrega?: string | null
          prioridade?: string
          progresso?: number | null
          requer_anexo?: boolean | null
          responsavel?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          contato_id?: string | null
          created_at?: string
          data_envio_automatico?: string | null
          data_vencimento?: string | null
          departamento?: Database["public"]["Enums"]["departamento_tipo"] | null
          descricao?: string | null
          empresa_id?: string | null
          envio_automatico?: boolean | null
          id?: string
          justificativa?: string | null
          prazo_entrega?: string | null
          prioridade?: string
          progresso?: number | null
          requer_anexo?: boolean | null
          responsavel?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "empresa_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas_modelo: {
        Row: {
          ativo: boolean | null
          created_at: string
          departamento: Database["public"]["Enums"]["departamento_tipo"]
          descricao: string | null
          dia_vencimento: number | null
          id: string
          justificativa: string | null
          periodicidade: string
          prazo_dias: number | null
          prioridade: string
          requer_anexo: boolean | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          departamento: Database["public"]["Enums"]["departamento_tipo"]
          descricao?: string | null
          dia_vencimento?: number | null
          id?: string
          justificativa?: string | null
          periodicidade?: string
          prazo_dias?: number | null
          prioridade?: string
          requer_anexo?: boolean | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          departamento?: Database["public"]["Enums"]["departamento_tipo"]
          descricao?: string | null
          dia_vencimento?: number | null
          id?: string
          justificativa?: string | null
          periodicidade?: string
          prazo_dias?: number | null
          prioridade?: string
          requer_anexo?: boolean | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      transacao_anexos: {
        Row: {
          created_at: string
          id: string
          nome: string
          tamanho: number
          tipo: string
          transacao_id: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          tamanho: number
          tipo: string
          transacao_id: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          tamanho?: number
          tipo?: string
          transacao_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transacao_anexos_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "transacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes: {
        Row: {
          categoria_id: string | null
          centro_custo_id: string | null
          cliente_id: string | null
          competencia_ano: number | null
          competencia_mes: number | null
          conciliado: boolean | null
          conta_bancaria_id: string | null
          conta_destino_id: string | null
          created_at: string
          created_by: string | null
          data_conciliacao: string | null
          data_pagamento: string | null
          data_transacao: string
          data_vencimento: string | null
          descricao: string
          empresa_id: string
          forma_pagamento: string | null
          id: string
          importacao_extrato_id: string | null
          numero_documento: string | null
          observacoes: string | null
          origem_extrato: boolean | null
          parcela_numero: number | null
          parcela_total: number | null
          parcelamento_id: string | null
          recorrencia_id: string | null
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          competencia_ano?: number | null
          competencia_mes?: number | null
          conciliado?: boolean | null
          conta_bancaria_id?: string | null
          conta_destino_id?: string | null
          created_at?: string
          created_by?: string | null
          data_conciliacao?: string | null
          data_pagamento?: string | null
          data_transacao?: string
          data_vencimento?: string | null
          descricao: string
          empresa_id: string
          forma_pagamento?: string | null
          id?: string
          importacao_extrato_id?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          origem_extrato?: boolean | null
          parcela_numero?: number | null
          parcela_total?: number | null
          parcelamento_id?: string | null
          recorrencia_id?: string | null
          status?: string
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          competencia_ano?: number | null
          competencia_mes?: number | null
          conciliado?: boolean | null
          conta_bancaria_id?: string | null
          conta_destino_id?: string | null
          created_at?: string
          created_by?: string | null
          data_conciliacao?: string | null
          data_pagamento?: string | null
          data_transacao?: string
          data_vencimento?: string | null
          descricao?: string
          empresa_id?: string
          forma_pagamento?: string | null
          id?: string
          importacao_extrato_id?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          origem_extrato?: boolean | null
          parcela_numero?: number | null
          parcela_total?: number | null
          parcelamento_id?: string | null
          recorrencia_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_importacao_extrato_id_fkey"
            columns: ["importacao_extrato_id"]
            isOneToOne: false
            referencedRelation: "importacoes_extrato"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades_medida: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_medida_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_account_roles: {
        Row: {
          account_id: string
          created_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["system_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["system_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["system_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_account_roles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_applied_profiles: {
        Row: {
          applied_at: string
          applied_by: string | null
          empresa_id: string
          id: string
          profile_id: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          empresa_id: string
          id?: string
          profile_id: string
          user_id: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          empresa_id?: string
          id?: string
          profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_applied_profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_applied_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_empresas: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          is_owner: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          is_owner?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          is_owner?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_export: boolean | null
          can_view: boolean | null
          created_at: string | null
          empresa_id: string | null
          id: string
          is_pro_mode: boolean | null
          module: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_export?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          is_pro_mode?: boolean | null
          module: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_export?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          is_pro_mode?: boolean | null
          module?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_permissions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_resource_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_export: boolean | null
          can_view: boolean | null
          created_at: string
          empresa_id: string | null
          id: string
          module: string
          resource: string
          sub_module: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_export?: boolean | null
          can_view?: boolean | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          module: string
          resource: string
          sub_module?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_export?: boolean | null
          can_view?: boolean | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          module?: string
          resource?: string
          sub_module?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_resource_permissions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venda_itens: {
        Row: {
          created_at: string
          desconto_percentual: number | null
          desconto_valor: number | null
          id: string
          observacao: string | null
          preco_unitario: number
          produto_id: string
          quantidade: number
          total: number
          venda_id: string
        }
        Insert: {
          created_at?: string
          desconto_percentual?: number | null
          desconto_valor?: number | null
          id?: string
          observacao?: string | null
          preco_unitario: number
          produto_id: string
          quantidade?: number
          total: number
          venda_id: string
        }
        Update: {
          created_at?: string
          desconto_percentual?: number | null
          desconto_valor?: number | null
          id?: string
          observacao?: string | null
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          total?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          acrescimo: number | null
          cliente_id: string | null
          comissao_percentual: number | null
          comissao_valor: number | null
          condicao_pagamento: string | null
          created_at: string
          created_by: string | null
          data_entrega: string | null
          data_venda: string
          desconto_percentual: number | null
          desconto_valor: number | null
          empresa_id: string
          forma_pagamento: string | null
          frete: number | null
          id: string
          numero: number | null
          observacoes: string | null
          observacoes_internas: string | null
          status: Database["public"]["Enums"]["status_pedido"] | null
          subtotal: number | null
          total: number | null
          updated_at: string
          vendedor_id: string | null
        }
        Insert: {
          acrescimo?: number | null
          cliente_id?: string | null
          comissao_percentual?: number | null
          comissao_valor?: number | null
          condicao_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          data_entrega?: string | null
          data_venda?: string
          desconto_percentual?: number | null
          desconto_valor?: number | null
          empresa_id: string
          forma_pagamento?: string | null
          frete?: number | null
          id?: string
          numero?: number | null
          observacoes?: string | null
          observacoes_internas?: string | null
          status?: Database["public"]["Enums"]["status_pedido"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string
          vendedor_id?: string | null
        }
        Update: {
          acrescimo?: number | null
          cliente_id?: string | null
          comissao_percentual?: number | null
          comissao_valor?: number | null
          condicao_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          data_entrega?: string | null
          data_venda?: string
          desconto_percentual?: number | null
          desconto_valor?: number | null
          empresa_id?: string
          forma_pagamento?: string | null
          frete?: number | null
          id?: string
          numero?: number | null
          observacoes?: string | null
          observacoes_internas?: string | null
          status?: Database["public"]["Enums"]["status_pedido"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_system_integrity: {
        Row: {
          quantidade: number | null
          tipo: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_empresa_modulo: {
        Args: {
          _ativo?: boolean
          _empresa_id: string
          _modo?: string
          _modulo: Database["public"]["Enums"]["app_module"]
        }
        Returns: undefined
      }
      add_user_permission: {
        Args: {
          _empresa_id: string
          _is_pro_mode?: boolean
          _module: Database["public"]["Enums"]["app_module"]
          _permission: Database["public"]["Enums"]["permission_type"]
          _user_id: string
        }
        Returns: undefined
      }
      apply_module_mode_to_users: {
        Args: { _empresa_id: string; _modo: string; _modulo: string }
        Returns: undefined
      }
      apply_permission_profile: {
        Args: {
          p_assign_role?: boolean
          p_empresa_id: string
          p_profile_id: string
          p_user_id: string
        }
        Returns: number
      }
      assign_manager_role: { Args: { _user_id: string }; Returns: undefined }
      assign_user_role: { Args: { _user_id: string }; Returns: undefined }
      create_empresa_for_manager: {
        Args: {
          _cnpj?: string
          _manager_id?: string
          _nome: string
          _telefone?: string
        }
        Returns: string
      }
      create_user_by_admin: {
        Args: { p_email: string; p_full_name?: string; p_password: string }
        Returns: string
      }
      fix_permission_inconsistencies: { Args: never; Returns: Json }
      gerar_tarefas_empresa: {
        Args: { p_ano: number; p_empresa_id: string; p_mes: number }
        Returns: number
      }
      get_empresas_safe: {
        Args: never
        Returns: {
          ativo: boolean
          cnpj: string
          created_at: string
          email: string
          id: string
          manager_id: string
          nome: string
          regime_tributario: Database["public"]["Enums"]["regime_tributario"]
          telefone: string
          updated_at: string
        }[]
      }
      get_user_module_permissions: {
        Args: { p_user_id: string }
        Returns: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_export: boolean
          can_view: boolean
          empresa_id: string
          id: string
          is_pro_mode: boolean
          module: string
          user_id: string
        }[]
      }
      grant_module_permission: {
        Args: {
          p_can_create?: boolean
          p_can_delete?: boolean
          p_can_edit?: boolean
          p_can_export?: boolean
          p_can_view?: boolean
          p_empresa_id?: string
          p_is_pro_mode?: boolean
          p_module: string
          p_user_id: string
        }
        Returns: string
      }
      has_account_access: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      has_account_role: {
        Args: {
          _account_id: string
          _role: Database["public"]["Enums"]["system_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_empresa_access: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
      has_entity_access: {
        Args: { _entity_id: string; _user_id: string }
        Returns: boolean
      }
      has_module_permission: {
        Args: {
          p_action?: string
          p_empresa_id?: string
          p_module: string
          p_user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: {
          _empresa_id: string
          _module: Database["public"]["Enums"]["app_module"]
          _permission: Database["public"]["Enums"]["permission_type"]
          _user_id: string
        }
        Returns: boolean
      }
      has_pro_mode: {
        Args: {
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inicializar_empresa_config: {
        Args: {
          _empresa_id: string
          _tipo_empresa?: Database["public"]["Enums"]["tipo_empresa"]
        }
        Returns: string
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_empresa_owner: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      link_user_to_empresa: {
        Args: { _empresa_id: string; _is_owner?: boolean; _user_id: string }
        Returns: undefined
      }
      reapply_profile_permissions: {
        Args: { p_profile_id: string }
        Returns: number
      }
      revoke_module_permission: {
        Args: { p_empresa_id?: string; p_module: string; p_user_id: string }
        Returns: boolean
      }
      sync_missing_profiles: { Args: never; Returns: number }
      user_has_empresa_access: {
        Args: { check_empresa_id: string }
        Returns: boolean
      }
      user_in_empresa: { Args: { check_empresa_id: string }; Returns: boolean }
    }
    Enums: {
      account_entity_relationship: "self" | "client"
      account_status: "active" | "suspended" | "cancelled"
      app_module:
        | "taskvault"
        | "financialace"
        | "ajustasped"
        | "conferesped"
        | "erp"
        | "conversores"
        | "gestao"
        | "messenger"
      app_role: "admin" | "manager" | "user"
      conversation_type: "direct" | "group" | "channel"
      departamento_tipo: "fiscal" | "contabil" | "departamento_pessoal"
      entity_access_level: "deliver_only" | "portal" | "full"
      permission_effect: "allow" | "deny"
      permission_type: "view" | "create" | "edit" | "delete" | "export"
      presence_status: "online" | "away" | "busy" | "in_meeting" | "offline"
      regime_tributario:
        | "nano_empreendedor"
        | "mei"
        | "simples_nacional"
        | "lucro_presumido"
        | "lucro_real"
      status_pedido:
        | "rascunho"
        | "pendente"
        | "aprovado"
        | "em_andamento"
        | "concluido"
        | "cancelado"
      system_role:
        | "super_admin"
        | "owner"
        | "admin"
        | "manager"
        | "operator"
        | "viewer"
        | "client_portal"
      tipo_empresa: "comercio" | "servicos" | "industria" | "misto"
      tipo_movimento_estoque: "entrada" | "saida" | "ajuste" | "transferencia"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_entity_relationship: ["self", "client"],
      account_status: ["active", "suspended", "cancelled"],
      app_module: [
        "taskvault",
        "financialace",
        "ajustasped",
        "conferesped",
        "erp",
        "conversores",
        "gestao",
        "messenger",
      ],
      app_role: ["admin", "manager", "user"],
      conversation_type: ["direct", "group", "channel"],
      departamento_tipo: ["fiscal", "contabil", "departamento_pessoal"],
      entity_access_level: ["deliver_only", "portal", "full"],
      permission_effect: ["allow", "deny"],
      permission_type: ["view", "create", "edit", "delete", "export"],
      presence_status: ["online", "away", "busy", "in_meeting", "offline"],
      regime_tributario: [
        "nano_empreendedor",
        "mei",
        "simples_nacional",
        "lucro_presumido",
        "lucro_real",
      ],
      status_pedido: [
        "rascunho",
        "pendente",
        "aprovado",
        "em_andamento",
        "concluido",
        "cancelado",
      ],
      system_role: [
        "super_admin",
        "owner",
        "admin",
        "manager",
        "operator",
        "viewer",
        "client_portal",
      ],
      tipo_empresa: ["comercio", "servicos", "industria", "misto"],
      tipo_movimento_estoque: ["entrada", "saida", "ajuste", "transferencia"],
    },
  },
} as const
