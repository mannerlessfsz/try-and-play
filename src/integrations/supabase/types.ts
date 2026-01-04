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
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          manager_id: string | null
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          manager_id?: string | null
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          manager_id?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
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
      orcamentos: {
        Row: {
          ano: number
          categoria_id: string | null
          centro_custo_id: string | null
          created_at: string
          empresa_id: string
          id: string
          mes: number
          updated_at: string
          valor_planejado: number
        }
        Insert: {
          ano: number
          categoria_id?: string | null
          centro_custo_id?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          mes: number
          updated_at?: string
          valor_planejado?: number
        }
        Update: {
          ano?: number
          categoria_id?: string | null
          centro_custo_id?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          mes?: number
          updated_at?: string
          valor_planejado?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
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
      tarefas: {
        Row: {
          contato_id: string | null
          created_at: string
          data_vencimento: string | null
          departamento: Database["public"]["Enums"]["departamento_tipo"] | null
          descricao: string | null
          empresa_id: string | null
          id: string
          prioridade: string
          progresso: number | null
          responsavel: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          contato_id?: string | null
          created_at?: string
          data_vencimento?: string | null
          departamento?: Database["public"]["Enums"]["departamento_tipo"] | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          prioridade?: string
          progresso?: number | null
          responsavel?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          contato_id?: string | null
          created_at?: string
          data_vencimento?: string | null
          departamento?: Database["public"]["Enums"]["departamento_tipo"] | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          prioridade?: string
          progresso?: number | null
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
      user_permissions: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          is_pro_mode: boolean | null
          module: Database["public"]["Enums"]["app_module"]
          permission: Database["public"]["Enums"]["permission_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          is_pro_mode?: boolean | null
          module: Database["public"]["Enums"]["app_module"]
          permission: Database["public"]["Enums"]["permission_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          is_pro_mode?: boolean | null
          module?: Database["public"]["Enums"]["app_module"]
          permission?: Database["public"]["Enums"]["permission_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_empresa_id_fkey"
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
          empresa_id: string
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
          empresa_id: string
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
          empresa_id?: string
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
      [_ in never]: never
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
      get_empresas_safe: {
        Args: never
        Returns: {
          cnpj: string
          created_at: string
          email: string
          id: string
          manager_id: string
          nome: string
          telefone: string
          updated_at: string
        }[]
      }
      has_empresa_access: {
        Args: { _empresa_id: string; _user_id: string }
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
      link_user_to_empresa: {
        Args: { _empresa_id: string; _is_owner?: boolean; _user_id: string }
        Returns: undefined
      }
      sync_missing_profiles: { Args: never; Returns: number }
    }
    Enums: {
      app_module:
        | "taskvault"
        | "financialace"
        | "ajustasped"
        | "conferesped"
        | "erp"
        | "conversores"
        | "gestao"
      app_role: "admin" | "manager" | "user"
      departamento_tipo: "fiscal" | "contabil" | "departamento_pessoal"
      permission_type: "view" | "create" | "edit" | "delete" | "export"
      status_pedido:
        | "rascunho"
        | "pendente"
        | "aprovado"
        | "em_andamento"
        | "concluido"
        | "cancelado"
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
      app_module: [
        "taskvault",
        "financialace",
        "ajustasped",
        "conferesped",
        "erp",
        "conversores",
        "gestao",
      ],
      app_role: ["admin", "manager", "user"],
      departamento_tipo: ["fiscal", "contabil", "departamento_pessoal"],
      permission_type: ["view", "create", "edit", "delete", "export"],
      status_pedido: [
        "rascunho",
        "pendente",
        "aprovado",
        "em_andamento",
        "concluido",
        "cancelado",
      ],
      tipo_empresa: ["comercio", "servicos", "industria", "misto"],
      tipo_movimento_estoque: ["entrada", "saida", "ajuste", "transferencia"],
    },
  },
} as const
