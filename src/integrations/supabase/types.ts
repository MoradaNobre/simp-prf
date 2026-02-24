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
      agendamentos_visita: {
        Row: {
          created_at: string
          created_by: string
          data_agendamento: string
          descricao: string
          id: string
          observacoes_pos_visita: string | null
          os_id: string
          responsavel_tecnico: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          data_agendamento: string
          descricao: string
          id?: string
          observacoes_pos_visita?: string | null
          os_id: string
          responsavel_tecnico: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data_agendamento?: string
          descricao?: string
          id?: string
          observacoes_pos_visita?: string | null
          os_id?: string
          responsavel_tecnico?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_visita_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contrato_aditivos: {
        Row: {
          contrato_id: string
          created_at: string
          created_by: string
          data_aditivo: string
          descricao: string
          id: string
          numero_aditivo: string | null
          valor: number
        }
        Insert: {
          contrato_id: string
          created_at?: string
          created_by: string
          data_aditivo?: string
          descricao: string
          id?: string
          numero_aditivo?: string | null
          valor?: number
        }
        Update: {
          contrato_id?: string
          created_at?: string
          created_by?: string
          data_aditivo?: string
          descricao?: string
          id?: string
          numero_aditivo?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contrato_aditivos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_aditivos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_saldo"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_contatos: {
        Row: {
          contrato_id: string
          created_at: string
          email: string | null
          funcao: string | null
          id: string
          nome: string
          telefone: string | null
          user_id: string | null
        }
        Insert: {
          contrato_id: string
          created_at?: string
          email?: string | null
          funcao?: string | null
          id?: string
          nome: string
          telefone?: string | null
          user_id?: string | null
        }
        Update: {
          contrato_id?: string
          created_at?: string
          email?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_contatos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_contatos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_saldo"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          empresa: string
          id: string
          numero: string
          objeto: string | null
          preposto_email: string | null
          preposto_nome: string | null
          preposto_telefone: string | null
          preposto_user_id: string | null
          regional_id: string | null
          status: string
          tipo_servico: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio: string
          empresa: string
          id?: string
          numero: string
          objeto?: string | null
          preposto_email?: string | null
          preposto_nome?: string | null
          preposto_telefone?: string | null
          preposto_user_id?: string | null
          regional_id?: string | null
          status?: string
          tipo_servico?: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          empresa?: string
          id?: string
          numero?: string
          objeto?: string | null
          preposto_email?: string | null
          preposto_nome?: string | null
          preposto_telefone?: string | null
          preposto_user_id?: string | null
          regional_id?: string | null
          status?: string
          tipo_servico?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionais"
            referencedColumns: ["id"]
          },
        ]
      }
      delegacias: {
        Row: {
          created_at: string
          id: string
          municipio: string | null
          nome: string
          regional_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          municipio?: string | null
          nome: string
          regional_id: string
        }
        Update: {
          created_at?: string
          id?: string
          municipio?: string | null
          nome?: string
          regional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegacias_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionais"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_anual: {
        Row: {
          created_at: string
          exercicio: number
          id: string
          observacoes: string | null
          regional_id: string
          updated_at: string
          valor_dotacao: number
        }
        Insert: {
          created_at?: string
          exercicio: number
          id?: string
          observacoes?: string | null
          regional_id: string
          updated_at?: string
          valor_dotacao?: number
        }
        Update: {
          created_at?: string
          exercicio?: number
          id?: string
          observacoes?: string | null
          regional_id?: string
          updated_at?: string
          valor_dotacao?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_anual_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionais"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_creditos: {
        Row: {
          created_at: string
          created_by: string
          data_credito: string
          descricao: string
          id: string
          numero_documento: string | null
          orcamento_id: string
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          created_by: string
          data_credito?: string
          descricao: string
          id?: string
          numero_documento?: string | null
          orcamento_id: string
          tipo?: string
          valor?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          data_credito?: string
          descricao?: string
          id?: string
          numero_documento?: string | null
          orcamento_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_creditos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamento_anual"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_creditos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "vw_orcamento_regional_saldo"
            referencedColumns: ["orcamento_id"]
          },
        ]
      }
      orcamento_empenhos: {
        Row: {
          created_at: string
          created_by: string
          data_empenho: string
          descricao: string
          id: string
          numero_empenho: string | null
          orcamento_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          created_by: string
          data_empenho?: string
          descricao: string
          id?: string
          numero_empenho?: string | null
          orcamento_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          data_empenho?: string
          descricao?: string
          id?: string
          numero_empenho?: string | null
          orcamento_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_empenhos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamento_anual"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_empenhos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "vw_orcamento_regional_saldo"
            referencedColumns: ["orcamento_id"]
          },
        ]
      }
      orcamento_loa: {
        Row: {
          created_at: string
          created_by: string | null
          exercicio: number
          id: string
          observacoes: string | null
          updated_at: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exercicio: number
          id?: string
          observacoes?: string | null
          updated_at?: string
          valor_total?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exercicio?: number
          id?: string
          observacoes?: string | null
          updated_at?: string
          valor_total?: number
        }
        Relationships: []
      }
      ordens_servico: {
        Row: {
          arquivo_orcamento: string | null
          assinatura_digital: string | null
          codigo: string
          contrato_id: string | null
          created_at: string
          data_abertura: string
          data_encerramento: string | null
          descricao: string | null
          documentos_pagamento: Json | null
          equipamento_id: string | null
          foto_antes: string | null
          foto_depois: string | null
          id: string
          motivo_restituicao: string | null
          prioridade: Database["public"]["Enums"]["os_prioridade"]
          regional_id: string | null
          responsavel_encerramento_id: string | null
          responsavel_execucao_id: string | null
          responsavel_id: string | null
          solicitante_id: string
          status: Database["public"]["Enums"]["os_status"]
          tipo: Database["public"]["Enums"]["os_tipo"]
          titulo: string
          uop_id: string | null
          updated_at: string
          valor_orcamento: number | null
        }
        Insert: {
          arquivo_orcamento?: string | null
          assinatura_digital?: string | null
          codigo: string
          contrato_id?: string | null
          created_at?: string
          data_abertura?: string
          data_encerramento?: string | null
          descricao?: string | null
          documentos_pagamento?: Json | null
          equipamento_id?: string | null
          foto_antes?: string | null
          foto_depois?: string | null
          id?: string
          motivo_restituicao?: string | null
          prioridade?: Database["public"]["Enums"]["os_prioridade"]
          regional_id?: string | null
          responsavel_encerramento_id?: string | null
          responsavel_execucao_id?: string | null
          responsavel_id?: string | null
          solicitante_id: string
          status?: Database["public"]["Enums"]["os_status"]
          tipo?: Database["public"]["Enums"]["os_tipo"]
          titulo: string
          uop_id?: string | null
          updated_at?: string
          valor_orcamento?: number | null
        }
        Update: {
          arquivo_orcamento?: string | null
          assinatura_digital?: string | null
          codigo?: string
          contrato_id?: string | null
          created_at?: string
          data_abertura?: string
          data_encerramento?: string | null
          descricao?: string | null
          documentos_pagamento?: Json | null
          equipamento_id?: string | null
          foto_antes?: string | null
          foto_depois?: string | null
          id?: string
          motivo_restituicao?: string | null
          prioridade?: Database["public"]["Enums"]["os_prioridade"]
          regional_id?: string | null
          responsavel_encerramento_id?: string | null
          responsavel_execucao_id?: string | null
          responsavel_id?: string | null
          solicitante_id?: string
          status?: Database["public"]["Enums"]["os_status"]
          tipo?: Database["public"]["Enums"]["os_tipo"]
          titulo?: string
          uop_id?: string | null
          updated_at?: string
          valor_orcamento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_saldo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_uop_id_fkey"
            columns: ["uop_id"]
            isOneToOne: false
            referencedRelation: "uops"
            referencedColumns: ["id"]
          },
        ]
      }
      os_custos: {
        Row: {
          created_at: string
          descricao: string
          id: string
          os_id: string
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          os_id: string
          tipo?: string
          valor?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          os_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "os_custos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_manutencao: {
        Row: {
          ativo: boolean
          created_at: string
          descricao_atividades: string | null
          frequencia: Database["public"]["Enums"]["frequencia_manutencao"]
          id: string
          nome: string
          proxima_execucao: string | null
          uop_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao_atividades?: string | null
          frequencia: Database["public"]["Enums"]["frequencia_manutencao"]
          id?: string
          nome: string
          proxima_execucao?: string | null
          uop_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao_atividades?: string | null
          frequencia?: Database["public"]["Enums"]["frequencia_manutencao"]
          id?: string
          nome?: string
          proxima_execucao?: string | null
          uop_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_manutencao_uop_id_fkey"
            columns: ["uop_id"]
            isOneToOne: false
            referencedRelation: "uops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          full_name: string
          id: string
          must_change_password: boolean
          phone: string | null
          regional_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          phone?: string | null
          regional_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          phone?: string | null
          regional_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionais"
            referencedColumns: ["id"]
          },
        ]
      }
      regionais: {
        Row: {
          created_at: string
          id: string
          nome: string
          sigla: string
          uf: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          sigla: string
          uf: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          sigla?: string
          uf?: string
        }
        Relationships: []
      }
      regional_os_seq: {
        Row: {
          id: string
          last_number: number
          regional_id: string
        }
        Insert: {
          id?: string
          last_number?: number
          regional_id: string
        }
        Update: {
          id?: string
          last_number?: number
          regional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regional_os_seq_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: true
            referencedRelation: "regionais"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios_execucao: {
        Row: {
          codigo_os: string
          contrato_empresa: string | null
          contrato_id: string | null
          contrato_numero: string | null
          dados_json: Json
          email_destinatarios: string[] | null
          email_enviado: boolean
          gerado_em: string
          gerado_por_id: string
          id: string
          os_id: string
          regional_id: string | null
          titulo_os: string
          valor_orcamento: number
        }
        Insert: {
          codigo_os: string
          contrato_empresa?: string | null
          contrato_id?: string | null
          contrato_numero?: string | null
          dados_json?: Json
          email_destinatarios?: string[] | null
          email_enviado?: boolean
          gerado_em?: string
          gerado_por_id: string
          id?: string
          os_id: string
          regional_id?: string | null
          titulo_os: string
          valor_orcamento?: number
        }
        Update: {
          codigo_os?: string
          contrato_empresa?: string | null
          contrato_id?: string | null
          contrato_numero?: string | null
          dados_json?: Json
          email_destinatarios?: string[] | null
          email_enviado?: boolean
          gerado_em?: string
          gerado_por_id?: string
          id?: string
          os_id?: string
          regional_id?: string | null
          titulo_os?: string
          valor_orcamento?: number
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_execucao_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_execucao_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_saldo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_execucao_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_execucao_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionais"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios_os: {
        Row: {
          codigo_os: string
          contrato_empresa: string | null
          contrato_numero: string | null
          dados_json: Json
          gerado_em: string
          gerado_por_id: string
          id: string
          os_id: string
          regional_id: string | null
          titulo_os: string
          valor_atestado: number
        }
        Insert: {
          codigo_os: string
          contrato_empresa?: string | null
          contrato_numero?: string | null
          dados_json?: Json
          gerado_em?: string
          gerado_por_id: string
          id?: string
          os_id: string
          regional_id?: string | null
          titulo_os: string
          valor_atestado?: number
        }
        Update: {
          codigo_os?: string
          contrato_empresa?: string | null
          contrato_numero?: string | null
          dados_json?: Json
          gerado_em?: string
          gerado_por_id?: string
          id?: string
          os_id?: string
          regional_id?: string | null
          titulo_os?: string
          valor_atestado?: number
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_os_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_os_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionais"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_credito: {
        Row: {
          created_at: string
          id: string
          motivo: string
          os_id: string | null
          regional_id: string
          respondido_em: string | null
          respondido_por: string | null
          resposta: string | null
          saldo_contrato: number
          saldo_orcamento: number
          solicitante_id: string
          status: string
          valor_aprovado: number | null
          valor_os: number
          valor_solicitado: number
        }
        Insert: {
          created_at?: string
          id?: string
          motivo: string
          os_id?: string | null
          regional_id: string
          respondido_em?: string | null
          respondido_por?: string | null
          resposta?: string | null
          saldo_contrato?: number
          saldo_orcamento?: number
          solicitante_id: string
          status?: string
          valor_aprovado?: number | null
          valor_os?: number
          valor_solicitado?: number
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string
          os_id?: string | null
          regional_id?: string
          respondido_em?: string | null
          respondido_por?: string | null
          resposta?: string | null
          saldo_contrato?: number
          saldo_orcamento?: number
          solicitante_id?: string
          status?: string
          valor_aprovado?: number | null
          valor_os?: number
          valor_solicitado?: number
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_credito_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_credito_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionais"
            referencedColumns: ["id"]
          },
        ]
      }
      uops: {
        Row: {
          area_m2: number | null
          created_at: string
          delegacia_id: string
          endereco: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
        }
        Insert: {
          area_m2?: number | null
          created_at?: string
          delegacia_id: string
          endereco?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
        }
        Update: {
          area_m2?: number | null
          created_at?: string
          delegacia_id?: string
          endereco?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "uops_delegacia_id_fkey"
            columns: ["delegacia_id"]
            isOneToOne: false
            referencedRelation: "delegacias"
            referencedColumns: ["id"]
          },
        ]
      }
      user_regionais: {
        Row: {
          created_at: string
          id: string
          regional_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          regional_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          regional_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_regionais_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionais"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      contratos_saldo: {
        Row: {
          empresa: string | null
          id: string | null
          numero: string | null
          saldo: number | null
          total_aditivos: number | null
          total_custos: number | null
          valor_total: number | null
          valor_total_com_aditivos: number | null
        }
        Relationships: []
      }
      vw_orcamento_regional_saldo: {
        Row: {
          credito_nao_empenhado: number | null
          exercicio: number | null
          orcamento_id: string | null
          regional_id: string | null
          saldo_disponivel: number | null
          total_consumo_os: number | null
          total_creditos: number | null
          total_empenhos: number | null
          valor_dotacao: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_anual_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionais"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_regional_ids: { Args: { _user_id: string }; Returns: string[] }
      get_users_in_same_regionals: {
        Args: { _user_id: string }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
      is_nacional: { Args: { _user_id: string }; Returns: boolean }
      transition_os_status: {
        Args: {
          _expected_status: Database["public"]["Enums"]["os_status"]
          _new_status: Database["public"]["Enums"]["os_status"]
          _os_id: string
          _updates?: Json
        }
        Returns: string
      }
      user_has_regional: {
        Args: { _regional_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "gestor_nacional"
        | "gestor_regional"
        | "fiscal_contrato"
        | "operador"
        | "preposto"
        | "terceirizado"
        | "gestor_master"
      frequencia_manutencao: "mensal" | "trimestral" | "semestral" | "anual"
      os_prioridade: "baixa" | "media" | "alta" | "urgente"
      os_status:
        | "aberta"
        | "orcamento"
        | "autorizacao"
        | "execucao"
        | "ateste"
        | "faturamento"
        | "pagamento"
        | "encerrada"
      os_tipo: "corretiva" | "preventiva"
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
      app_role: [
        "gestor_nacional",
        "gestor_regional",
        "fiscal_contrato",
        "operador",
        "preposto",
        "terceirizado",
        "gestor_master",
      ],
      frequencia_manutencao: ["mensal", "trimestral", "semestral", "anual"],
      os_prioridade: ["baixa", "media", "alta", "urgente"],
      os_status: [
        "aberta",
        "orcamento",
        "autorizacao",
        "execucao",
        "ateste",
        "faturamento",
        "pagamento",
        "encerrada",
      ],
      os_tipo: ["corretiva", "preventiva"],
    },
  },
} as const
