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
      clients: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      dns_monitoring_history: {
        Row: {
          checked_at: string
          dns_response_time: number | null
          dns_status: string
          id: string
          ping_latency: number | null
          ping_status: string
          server_id: string
        }
        Insert: {
          checked_at?: string
          dns_response_time?: number | null
          dns_status: string
          id?: string
          ping_latency?: number | null
          ping_status: string
          server_id: string
        }
        Update: {
          checked_at?: string
          dns_response_time?: number | null
          dns_status?: string
          id?: string
          ping_latency?: number | null
          ping_status?: string
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dns_monitoring_history_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "dns_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      dns_query_logs: {
        Row: {
          client_ip: string | null
          domain: string
          id: string
          logged_at: string
          query_count: number
          query_type: string
          server_id: string
        }
        Insert: {
          client_ip?: string | null
          domain: string
          id?: string
          logged_at?: string
          query_count?: number
          query_type?: string
          server_id: string
        }
        Update: {
          client_ip?: string | null
          domain?: string
          id?: string
          logged_at?: string
          query_count?: number
          query_type?: string
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dns_query_logs_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "dns_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      dns_servers: {
        Row: {
          agent_token: string | null
          allowed_dns_ipv4: string[]
          allowed_dns_ipv6: string[]
          allowed_ssh_ips: string[]
          client_id: string | null
          client_name: string | null
          command_output: string | null
          command_status: string | null
          created_at: string
          id: string
          installation_log: string | null
          ipv4: string
          ipv6: string | null
          last_agent_check: string | null
          loopback_ipv4_1: string | null
          loopback_ipv4_2: string | null
          loopback_ipv6_1: string | null
          loopback_ipv6_2: string | null
          name: string
          pending_command: string | null
          ssh_password_encrypted: string | null
          ssh_port: number
          ssh_user: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_token?: string | null
          allowed_dns_ipv4?: string[]
          allowed_dns_ipv6?: string[]
          allowed_ssh_ips?: string[]
          client_id?: string | null
          client_name?: string | null
          command_output?: string | null
          command_status?: string | null
          created_at?: string
          id?: string
          installation_log?: string | null
          ipv4: string
          ipv6?: string | null
          last_agent_check?: string | null
          loopback_ipv4_1?: string | null
          loopback_ipv4_2?: string | null
          loopback_ipv6_1?: string | null
          loopback_ipv6_2?: string | null
          name: string
          pending_command?: string | null
          ssh_password_encrypted?: string | null
          ssh_port?: number
          ssh_user: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_token?: string | null
          allowed_dns_ipv4?: string[]
          allowed_dns_ipv6?: string[]
          allowed_ssh_ips?: string[]
          client_id?: string | null
          client_name?: string | null
          command_output?: string | null
          command_status?: string | null
          created_at?: string
          id?: string
          installation_log?: string | null
          ipv4?: string
          ipv6?: string | null
          last_agent_check?: string | null
          loopback_ipv4_1?: string | null
          loopback_ipv4_2?: string | null
          loopback_ipv6_1?: string | null
          loopback_ipv6_2?: string | null
          name?: string
          pending_command?: string | null
          ssh_password_encrypted?: string | null
          ssh_port?: number
          ssh_user?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dns_servers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      zabbix_monitoring_history: {
        Row: {
          checked_at: string
          id: string
          ping_latency: number | null
          ping_status: string
          server_id: string
          web_response_time: number | null
          web_status: string | null
        }
        Insert: {
          checked_at?: string
          id?: string
          ping_latency?: number | null
          ping_status: string
          server_id: string
          web_response_time?: number | null
          web_status?: string | null
        }
        Update: {
          checked_at?: string
          id?: string
          ping_latency?: number | null
          ping_status?: string
          server_id?: string
          web_response_time?: number | null
          web_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zabbix_monitoring_history_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "zabbix_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      zabbix_proxies: {
        Row: {
          agent_token: string | null
          command_output: string | null
          command_status: string | null
          created_at: string
          id: string
          installation_log: string | null
          ipv4: string
          ipv6: string | null
          last_agent_check: string | null
          name: string
          pending_command: string | null
          proxy_db_password: string
          proxy_db_root_password: string
          proxy_db_user: string
          proxy_type: string
          server_id: string
          ssh_password_encrypted: string | null
          ssh_port: number
          ssh_user: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_token?: string | null
          command_output?: string | null
          command_status?: string | null
          created_at?: string
          id?: string
          installation_log?: string | null
          ipv4: string
          ipv6?: string | null
          last_agent_check?: string | null
          name: string
          pending_command?: string | null
          proxy_db_password: string
          proxy_db_root_password: string
          proxy_db_user?: string
          proxy_type?: string
          server_id: string
          ssh_password_encrypted?: string | null
          ssh_port?: number
          ssh_user: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_token?: string | null
          command_output?: string | null
          command_status?: string | null
          created_at?: string
          id?: string
          installation_log?: string | null
          ipv4?: string
          ipv6?: string | null
          last_agent_check?: string | null
          name?: string
          pending_command?: string | null
          proxy_db_password?: string
          proxy_db_root_password?: string
          proxy_db_user?: string
          proxy_type?: string
          server_id?: string
          ssh_password_encrypted?: string | null
          ssh_port?: number
          ssh_user?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zabbix_proxies_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "zabbix_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      zabbix_servers: {
        Row: {
          agent_token: string | null
          client_name: string | null
          command_output: string | null
          command_status: string | null
          created_at: string
          id: string
          install_grafana: boolean
          installation_log: string | null
          ipv4: string
          ipv6: string | null
          last_agent_check: string | null
          name: string
          pending_command: string | null
          ssh_password_encrypted: string | null
          ssh_port: number
          ssh_user: string
          status: string
          updated_at: string
          user_id: string
          zabbix_db_password: string
          zabbix_db_root_password: string
          zabbix_db_user: string
          zabbix_root_password: string | null
        }
        Insert: {
          agent_token?: string | null
          client_name?: string | null
          command_output?: string | null
          command_status?: string | null
          created_at?: string
          id?: string
          install_grafana?: boolean
          installation_log?: string | null
          ipv4: string
          ipv6?: string | null
          last_agent_check?: string | null
          name: string
          pending_command?: string | null
          ssh_password_encrypted?: string | null
          ssh_port?: number
          ssh_user: string
          status?: string
          updated_at?: string
          user_id: string
          zabbix_db_password: string
          zabbix_db_root_password: string
          zabbix_db_user?: string
          zabbix_root_password?: string | null
        }
        Update: {
          agent_token?: string | null
          client_name?: string | null
          command_output?: string | null
          command_status?: string | null
          created_at?: string
          id?: string
          install_grafana?: boolean
          installation_log?: string | null
          ipv4?: string
          ipv6?: string | null
          last_agent_check?: string | null
          name?: string
          pending_command?: string | null
          ssh_password_encrypted?: string | null
          ssh_port?: number
          ssh_user?: string
          status?: string
          updated_at?: string
          user_id?: string
          zabbix_db_password?: string
          zabbix_db_root_password?: string
          zabbix_db_user?: string
          zabbix_root_password?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
