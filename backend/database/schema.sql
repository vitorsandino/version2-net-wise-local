-- Schema completo para Version2 NetWise Local
-- PostgreSQL 14+

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum para roles de usuários
CREATE TYPE app_role AS ENUM ('admin', 'user');

-- Tabela de usuários (substitui Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT TRUE
);

-- Tabela de roles de usuários
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role app_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Tabela de clientes
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de servidores DNS
CREATE TABLE dns_servers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  ipv4 VARCHAR(45) NOT NULL,
  ipv6 VARCHAR(45),
  ssh_user VARCHAR(100) NOT NULL,
  ssh_port INTEGER DEFAULT 22,
  ssh_password_encrypted TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  allowed_ssh_ips TEXT[] DEFAULT '{}',
  allowed_dns_ipv4 TEXT[] DEFAULT '{}',
  allowed_dns_ipv6 TEXT[] DEFAULT '{}',
  loopback_ipv4_1 VARCHAR(45),
  loopback_ipv4_2 VARCHAR(45),
  loopback_ipv6_1 VARCHAR(45),
  loopback_ipv6_2 VARCHAR(45),
  installation_log TEXT,
  agent_token VARCHAR(255),
  pending_command TEXT,
  command_status VARCHAR(50),
  command_output TEXT,
  last_agent_check TIMESTAMP WITH TIME ZONE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(255),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs de queries DNS
CREATE TABLE dns_query_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES dns_servers(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  query_type VARCHAR(20) DEFAULT 'A',
  client_ip VARCHAR(45),
  query_count INTEGER DEFAULT 1,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de histórico de monitoramento DNS
CREATE TABLE dns_monitoring_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES dns_servers(id) ON DELETE CASCADE,
  ping_status VARCHAR(20) NOT NULL,
  ping_latency NUMERIC(10, 2),
  dns_status VARCHAR(20) NOT NULL,
  dns_response_time NUMERIC(10, 2),
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de servidores Zabbix
CREATE TABLE zabbix_servers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  ipv4 VARCHAR(45) NOT NULL,
  ipv6 VARCHAR(45),
  ssh_user VARCHAR(100) NOT NULL,
  ssh_port INTEGER DEFAULT 22,
  ssh_password_encrypted TEXT,
  zabbix_db_user VARCHAR(100) NOT NULL,
  zabbix_db_password VARCHAR(255) NOT NULL,
  zabbix_db_root_password VARCHAR(255) NOT NULL,
  zabbix_root_password VARCHAR(255),
  install_grafana BOOLEAN DEFAULT FALSE,
  agent_token VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  installation_log TEXT,
  pending_command TEXT,
  command_status VARCHAR(50),
  command_output TEXT,
  last_agent_check TIMESTAMP WITH TIME ZONE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de proxies Zabbix
CREATE TABLE zabbix_proxies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES zabbix_servers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  ipv4 VARCHAR(45) NOT NULL,
  proxy_type VARCHAR(50) DEFAULT 'active',
  status VARCHAR(50) DEFAULT 'pending',
  installation_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de histórico de monitoramento Zabbix
CREATE TABLE zabbix_monitoring_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES zabbix_servers(id) ON DELETE CASCADE,
  ping_status VARCHAR(20) NOT NULL,
  ping_latency NUMERIC(10, 2),
  web_status VARCHAR(20),
  web_response_time NUMERIC(10, 2),
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50) DEFAULT 'medium',
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de mensagens de tickets
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de páginas da wiki
CREATE TABLE wiki_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de diagramas de rede
CREATE TABLE network_diagrams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  diagram_data JSONB NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_dns_servers_user_id ON dns_servers(user_id);
CREATE INDEX idx_dns_servers_status ON dns_servers(status);
CREATE INDEX idx_dns_query_logs_server_id ON dns_query_logs(server_id);
CREATE INDEX idx_dns_query_logs_logged_at ON dns_query_logs(logged_at);
CREATE INDEX idx_dns_monitoring_history_server_id ON dns_monitoring_history(server_id);
CREATE INDEX idx_dns_monitoring_history_checked_at ON dns_monitoring_history(checked_at);
CREATE INDEX idx_zabbix_servers_user_id ON zabbix_servers(user_id);
CREATE INDEX idx_zabbix_monitoring_history_server_id ON zabbix_monitoring_history(server_id);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dns_servers_updated_at BEFORE UPDATE ON dns_servers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zabbix_servers_updated_at BEFORE UPDATE ON zabbix_servers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar role do usuário
CREATE OR REPLACE FUNCTION has_role(user_id_param UUID, role_param app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_id_param AND role = role_param
  );
END;
$$ LANGUAGE plpgsql;
