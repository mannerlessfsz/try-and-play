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
      atividades: {
        Row: {
          created_at: string
          descricao: string
          empresa_id: string | null
          id: string
          tarefa_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          descricao: string
          empresa_id?: string | null
          id?: string
          tarefa_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          descricao?: string
          empresa_id?: string | null
          id?: string
          tarefa_id?: string | null
          tipo?: string
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
            foreignKeyName: "atividades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_view"
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
          {
            foreignKeyName: "categorias_financeiras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_view"
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
          {
            foreignKeyName: "centros_custo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_view"
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
          {
            foreignKeyName: "contas_bancarias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_view"
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
          {
            foreignKeyName: "empresa_modulos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_view"
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
          {
            foreignKeyName: "importacoes_extrato_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_view"
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
          {
            foreignKeyName: "metas_financeiras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_view"
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
          {
            foreignKeyName: "orcamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_view"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
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
          {
            foreignKeyName: "recorrencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_view"
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
          created_at: string
          data_vencimento: string | null
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
          created_at?: string
          data_vencimento?: string | null
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
          created_at?: string
          data_vencimento?: string | null
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
            foreignKeyName: "tarefas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_view"
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
          numero_documento: string | null
          observacoes: string | null
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
          numero_documento?: string | null
          observacoes?: string | null
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
          numero_documento?: string | null
          observacoes?: string | null
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
            foreignKeyName: "transacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_view"
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
          {
            foreignKeyName: "user_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_view"
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
          {
            foreignKeyName: "user_permissions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_view"
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
    }
    Views: {
      empresas_view: {
        Row: {
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string | null
          manager_id: string | null
          nome: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: never
          created_at?: string | null
          email?: never
          id?: string | null
          manager_id?: string | null
          nome?: string | null
          telefone?: never
          updated_at?: string | null
        }
        Update: {
          cnpj?: never
          created_at?: string | null
          email?: never
          id?: string | null
          manager_id?: string | null
          nome?: string | null
          telefone?: never
          updated_at?: string | null
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_empresa_owner: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
      link_user_to_empresa: {
        Args: { _empresa_id: string; _is_owner?: boolean; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_module: "taskvault" | "financialace" | "ajustasped" | "conferesped"
      app_role: "admin" | "manager" | "user"
      permission_type: "view" | "create" | "edit" | "delete" | "export"
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
      app_module: ["taskvault", "financialace", "ajustasped", "conferesped"],
      app_role: ["admin", "manager", "user"],
      permission_type: ["view", "create", "edit", "delete", "export"],
    },
  },
} as const
