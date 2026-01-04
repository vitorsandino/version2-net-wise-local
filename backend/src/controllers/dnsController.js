import pool from '../config/database.js';
import crypto from 'crypto';
import { installDNSServer, executeSSHCommand } from '../services/sshService.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Criptografar senha
function encryptPassword(password) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Descriptografar senha
export function decryptPassword(encryptedPassword) {
  const parts = encryptedPassword.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Listar servidores DNS
export async function listDNSServers(req, res) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    let query = `
      SELECT id, name, ipv4, ipv6, ssh_user, ssh_port, status, 
             allowed_ssh_ips, allowed_dns_ipv4, allowed_dns_ipv6,
             loopback_ipv4_1, loopback_ipv4_2, loopback_ipv6_1, loopback_ipv6_2,
             agent_token, pending_command, command_status, last_agent_check,
             client_id, client_name, created_at, updated_at
      FROM dns_servers
    `;

    const params = [];

    if (!isAdmin) {
      query += ' WHERE user_id = $1';
      params.push(userId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar servidores DNS:', error);
    res.status(500).json({ error: 'Erro ao listar servidores DNS' });
  }
}

// Criar servidor DNS
export async function createDNSServer(req, res) {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const {
      name,
      ipv4,
      ipv6,
      sshUser,
      sshPassword,
      sshPort,
      allowedSshIps,
      allowedDnsIpv4,
      allowedDnsIpv6,
      loopbackIpv4_1,
      loopbackIpv4_2,
      loopbackIpv6_1,
      loopbackIpv6_2,
      clientId,
      clientName
    } = req.body;

    // Validação
    if (!name || !ipv4 || !sshUser || !sshPassword) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    await client.query('BEGIN');

    // Criptografar senha SSH
    const encryptedPassword = encryptPassword(sshPassword);

    // Gerar token do agente
    const agentToken = crypto.randomBytes(32).toString('hex');

    // Inserir servidor
    const result = await client.query(
      `INSERT INTO dns_servers (
        name, ipv4, ipv6, ssh_user, ssh_password_encrypted, ssh_port,
        allowed_ssh_ips, allowed_dns_ipv4, allowed_dns_ipv6,
        loopback_ipv4_1, loopback_ipv4_2, loopback_ipv6_1, loopback_ipv6_2,
        agent_token, client_id, client_name, user_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        name, ipv4, ipv6, sshUser, encryptedPassword, sshPort || 22,
        allowedSshIps || [], allowedDnsIpv4 || [], allowedDnsIpv6 || [],
        loopbackIpv4_1, loopbackIpv4_2, loopbackIpv6_1, loopbackIpv6_2,
        agentToken, clientId, clientName, userId, 'pending'
      ]
    );

    await client.query('COMMIT');

    const server = result.rows[0];

    // Remover senha da resposta
    delete server.ssh_password_encrypted;

    res.status(201).json(server);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar servidor DNS:', error);
    res.status(500).json({ error: 'Erro ao criar servidor DNS' });
  } finally {
    client.release();
  }
}

// Instalar servidor DNS
export async function installDNS(req, res) {
  try {
    const { serverId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    // Buscar servidor
    let query = 'SELECT * FROM dns_servers WHERE id = $1';
    const params = [serverId];

    if (!isAdmin) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servidor não encontrado' });
    }

    const server = result.rows[0];

    // Atualizar status para 'installing'
    await pool.query(
      'UPDATE dns_servers SET status = $1 WHERE id = $2',
      ['installing', serverId]
    );

    // Iniciar instalação em background
    installDNSServer(server).catch(err => {
      console.error('Erro na instalação DNS:', err);
    });

    res.json({ message: 'Instalação iniciada', serverId });
  } catch (error) {
    console.error('Erro ao iniciar instalação DNS:', error);
    res.status(500).json({ error: 'Erro ao iniciar instalação' });
  }
}

// Obter detalhes do servidor DNS
export async function getDNSServer(req, res) {
  try {
    const { serverId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    let query = 'SELECT * FROM dns_servers WHERE id = $1';
    const params = [serverId];

    if (!isAdmin) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servidor não encontrado' });
    }

    const server = result.rows[0];
    delete server.ssh_password_encrypted;

    res.json(server);
  } catch (error) {
    console.error('Erro ao buscar servidor DNS:', error);
    res.status(500).json({ error: 'Erro ao buscar servidor' });
  }
}

// Atualizar servidor DNS
export async function updateDNSServer(req, res) {
  try {
    const { serverId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    const {
      name,
      allowedSshIps,
      allowedDnsIpv4,
      allowedDnsIpv6,
      clientId,
      clientName
    } = req.body;

    let query = 'UPDATE dns_servers SET ';
    const params = [];
    const updates = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (allowedSshIps !== undefined) {
      updates.push(`allowed_ssh_ips = $${paramIndex++}`);
      params.push(allowedSshIps);
    }
    if (allowedDnsIpv4 !== undefined) {
      updates.push(`allowed_dns_ipv4 = $${paramIndex++}`);
      params.push(allowedDnsIpv4);
    }
    if (allowedDnsIpv6 !== undefined) {
      updates.push(`allowed_dns_ipv6 = $${paramIndex++}`);
      params.push(allowedDnsIpv6);
    }
    if (clientId !== undefined) {
      updates.push(`client_id = $${paramIndex++}`);
      params.push(clientId);
    }
    if (clientName !== undefined) {
      updates.push(`client_name = $${paramIndex++}`);
      params.push(clientName);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    query += updates.join(', ');
    query += ` WHERE id = $${paramIndex++}`;
    params.push(serverId);

    if (!isAdmin) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }

    query += ' RETURNING *';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servidor não encontrado' });
    }

    const server = result.rows[0];
    delete server.ssh_password_encrypted;

    res.json(server);
  } catch (error) {
    console.error('Erro ao atualizar servidor DNS:', error);
    res.status(500).json({ error: 'Erro ao atualizar servidor' });
  }
}

// Deletar servidor DNS
export async function deleteDNSServer(req, res) {
  try {
    const { serverId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    let query = 'DELETE FROM dns_servers WHERE id = $1';
    const params = [serverId];

    if (!isAdmin) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    query += ' RETURNING id';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servidor não encontrado' });
    }

    res.json({ message: 'Servidor deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar servidor DNS:', error);
    res.status(500).json({ error: 'Erro ao deletar servidor' });
  }
}

// Executar comando SSH
export async function executeCommand(req, res) {
  try {
    const { serverId } = req.params;
    const { command } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    if (!command) {
      return res.status(400).json({ error: 'Comando não fornecido' });
    }

    let query = 'SELECT * FROM dns_servers WHERE id = $1';
    const params = [serverId];

    if (!isAdmin) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servidor não encontrado' });
    }

    const server = result.rows[0];

    // Executar comando
    const output = await executeSSHCommand(server, command);

    res.json({ output });
  } catch (error) {
    console.error('Erro ao executar comando:', error);
    res.status(500).json({ error: 'Erro ao executar comando' });
  }
}

// Obter estatísticas de queries DNS
export async function getDNSQueryStats(req, res) {
  try {
    const { serverId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    // Verificar acesso ao servidor
    let query = 'SELECT id FROM dns_servers WHERE id = $1';
    const params = [serverId];

    if (!isAdmin) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    const serverResult = await pool.query(query, params);

    if (serverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Servidor não encontrado' });
    }

    // Buscar top domínios
    const topDomainsResult = await pool.query(
      `SELECT domain, SUM(query_count) as total_queries
       FROM dns_query_logs
       WHERE server_id = $1
       AND logged_at > NOW() - INTERVAL '24 hours'
       GROUP BY domain
       ORDER BY total_queries DESC
       LIMIT 10`,
      [serverId]
    );

    // Buscar queries por tipo
    const queryTypeResult = await pool.query(
      `SELECT query_type, SUM(query_count) as total
       FROM dns_query_logs
       WHERE server_id = $1
       AND logged_at > NOW() - INTERVAL '24 hours'
       GROUP BY query_type
       ORDER BY total DESC`,
      [serverId]
    );

    res.json({
      topDomains: topDomainsResult.rows,
      queryTypes: queryTypeResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas DNS:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
}

// Obter histórico de monitoramento
export async function getDNSMonitoringHistory(req, res) {
  try {
    const { serverId } = req.params;
    const { hours = 24 } = req.query;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    // Verificar acesso
    let query = 'SELECT id FROM dns_servers WHERE id = $1';
    const params = [serverId];

    if (!isAdmin) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    const serverResult = await pool.query(query, params);

    if (serverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Servidor não encontrado' });
    }

    // Buscar histórico
    const historyResult = await pool.query(
      `SELECT * FROM dns_monitoring_history
       WHERE server_id = $1
       AND checked_at > NOW() - INTERVAL '${parseInt(hours)} hours'
       ORDER BY checked_at DESC
       LIMIT 1000`,
      [serverId]
    );

    res.json(historyResult.rows);
  } catch (error) {
    console.error('Erro ao buscar histórico de monitoramento:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
}
