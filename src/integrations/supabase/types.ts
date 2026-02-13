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
      contrato_contatos: {
        Row: {
          contrato_id: string
          created_at: string
          email: string | null
          funcao: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          contrato_id: string
          created_at?: string
          email?: string | null
          funcao?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          contrato_id?: string
          created_at?: string
          email?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          telefone?: string | null
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
      equipamentos: {
        Row: {
          categoria: Database["public"]["Enums"]["equipment_category"]
          created_at: string
          data_instalacao: string | null
          id: string
          marca: string | null
          modelo: string | null
          nome: string
          numero_serie: string | null
          observacoes: string | null
          qr_code: string | null
          uop_id: string
          updated_at: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["equipment_category"]
          created_at?: string
          data_instalacao?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nome: string
          numero_serie?: string | null
          observacoes?: string | null
          qr_code?: string | null
          uop_id: string
          updated_at?: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["equipment_category"]
          created_at?: string
          data_instalacao?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nome?: string
          numero_serie?: string | null
          observacoes?: string | null
          qr_code?: string | null
          uop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_uop_id_fkey"
            columns: ["uop_id"]
            isOneToOne: false
            referencedRelation: "uops"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          assinatura_digital: string | null
          codigo: string
          contrato_id: string | null
          created_at: string
          data_abertura: string
          data_encerramento: string | null
          descricao: string | null
          equipamento_id: string | null
          foto_antes: string | null
          foto_depois: string | null
          id: string
          prioridade: Database["public"]["Enums"]["os_prioridade"]
          responsavel_encerramento_id: string | null
          responsavel_execucao_id: string | null
          responsavel_id: string | null
          responsavel_triagem_id: string | null
          solicitante_id: string
          status: Database["public"]["Enums"]["os_status"]
          tipo: Database["public"]["Enums"]["os_tipo"]
          titulo: string
          uop_id: string | null
          updated_at: string
        }
        Insert: {
          assinatura_digital?: string | null
          codigo: string
          contrato_id?: string | null
          created_at?: string
          data_abertura?: string
          data_encerramento?: string | null
          descricao?: string | null
          equipamento_id?: string | null
          foto_antes?: string | null
          foto_depois?: string | null
          id?: string
          prioridade?: Database["public"]["Enums"]["os_prioridade"]
          responsavel_encerramento_id?: string | null
          responsavel_execucao_id?: string | null
          responsavel_id?: string | null
          responsavel_triagem_id?: string | null
          solicitante_id: string
          status?: Database["public"]["Enums"]["os_status"]
          tipo?: Database["public"]["Enums"]["os_tipo"]
          titulo: string
          uop_id?: string | null
          updated_at?: string
        }
        Update: {
          assinatura_digital?: string | null
          codigo?: string
          contrato_id?: string | null
          created_at?: string
          data_abertura?: string
          data_encerramento?: string | null
          descricao?: string | null
          equipamento_id?: string | null
          foto_antes?: string | null
          foto_depois?: string | null
          id?: string
          prioridade?: Database["public"]["Enums"]["os_prioridade"]
          responsavel_encerramento_id?: string | null
          responsavel_execucao_id?: string | null
          responsavel_id?: string | null
          responsavel_triagem_id?: string | null
          solicitante_id?: string
          status?: Database["public"]["Enums"]["os_status"]
          tipo?: Database["public"]["Enums"]["os_tipo"]
          titulo?: string
          uop_id?: string | null
          updated_at?: string
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
            foreignKeyName: "ordens_servico_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
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
          categoria: Database["public"]["Enums"]["equipment_category"]
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
          categoria: Database["public"]["Enums"]["equipment_category"]
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
          categoria?: Database["public"]["Enums"]["equipment_category"]
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
          created_at: string
          full_name: string
          id: string
          phone: string | null
          regional_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          regional_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
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
          total_custos: number | null
          valor_total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
      equipment_category:
        | "ar_condicionado"
        | "gerador"
        | "eletrica"
        | "telhado"
        | "hidraulica"
        | "elevador"
        | "outro"
      frequencia_manutencao: "mensal" | "trimestral" | "semestral" | "anual"
      os_prioridade: "baixa" | "media" | "alta" | "urgente"
      os_status: "aberta" | "triagem" | "execucao" | "encerrada"
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
      ],
      equipment_category: [
        "ar_condicionado",
        "gerador",
        "eletrica",
        "telhado",
        "hidraulica",
        "elevador",
        "outro",
      ],
      frequencia_manutencao: ["mensal", "trimestral", "semestral", "anual"],
      os_prioridade: ["baixa", "media", "alta", "urgente"],
      os_status: ["aberta", "triagem", "execucao", "encerrada"],
      os_tipo: ["corretiva", "preventiva"],
    },
  },
} as const
