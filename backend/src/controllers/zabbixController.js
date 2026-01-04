import pool from '../config/database.js';
import crypto from 'crypto';
import { installZabbixServer } from '../services/zabbixService.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function encryptPassword(password) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Listar servidores Zabbix
export async function listZabbixServers(req, res) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    let query = `
      SELECT id, name, client_name, ipv4, ipv6, ssh_user, ssh_port, status,
             zabbix_db_user, install_grafana, agent_token, pending_command,
             command_status, last_agent_check, created_at, updated_at
      FROM zabbix_servers
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
    console.error('Erro ao listar servidores Zabbix:', error);
    res.status(500).json({ error: 'Erro ao listar servidores Zabbix' });
  }
}

// Criar servidor Zabbix
export async function createZabbixServer(req, res) {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const {
      name,
      clientName,
      ipv4,
      ipv6,
      sshUser,
      sshPassword,
      sshPort,
      zabbixDbUser,
      zabbixDbPassword,
      zabbixDbRootPassword,
      zabbixRootPassword,
      installGrafana
    } = req.body;

    if (!name || !ipv4 || !sshUser || !sshPassword || !zabbixDbUser || !zabbixDbPassword || !zabbixDbRootPassword) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    await client.query('BEGIN');

    const encryptedSshPassword = encryptPassword(sshPassword);
    const agentToken = crypto.randomBytes(32).toString('hex');

    const result = await client.query(
      `INSERT INTO zabbix_servers (
        name, client_name, ipv4, ipv6, ssh_user, ssh_password_encrypted, ssh_port,
        zabbix_db_user, zabbix_db_password, zabbix_db_root_password, zabbix_root_password,
        install_grafana, agent_token, user_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        name, clientName, ipv4, ipv6, sshUser, encryptedSshPassword, sshPort || 22,
        zabbixDbUser, zabbixDbPassword, zabbixDbRootPassword, zabbixRootPassword,
        installGrafana || false, agentToken, userId, 'pending'
      ]
    );

    await client.query('COMMIT');

    const server = result.rows[0];
    delete server.ssh_password_encrypted;
    delete server.zabbix_db_password;
    delete server.zabbix_db_root_password;
    delete server.zabbix_root_password;

    res.status(201).json(server);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar servidor Zabbix:', error);
    res.status(500).json({ error: 'Erro ao criar servidor Zabbix' });
  } finally {
    client.release();
  }
}

// Instalar servidor Zabbix
export async function installZabbix(req, res) {
  try {
    const { serverId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    let query = 'SELECT * FROM zabbix_servers WHERE id = $1';
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

    await pool.query(
      'UPDATE zabbix_servers SET status = $1 WHERE id = $2',
      ['installing', serverId]
    );

    installZabbixServer(server).catch(err => {
      console.error('Erro na instalação Zabbix:', err);
    });

    res.json({ message: 'Instalação iniciada', serverId });
  } catch (error) {
    console.error('Erro ao iniciar instalação Zabbix:', error);
    res.status(500).json({ error: 'Erro ao iniciar instalação' });
  }
}

// Obter detalhes do servidor Zabbix
export async function getZabbixServer(req, res) {
  try {
    const { serverId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    let query = 'SELECT * FROM zabbix_servers WHERE id = $1';
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
    delete server.zabbix_db_password;
    delete server.zabbix_db_root_password;
    delete server.zabbix_root_password;

    res.json(server);
  } catch (error) {
    console.error('Erro ao buscar servidor Zabbix:', error);
    res.status(500).json({ error: 'Erro ao buscar servidor' });
  }
}

// Deletar servidor Zabbix
export async function deleteZabbixServer(req, res) {
  try {
    const { serverId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    let query = 'DELETE FROM zabbix_servers WHERE id = $1';
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
    console.error('Erro ao deletar servidor Zabbix:', error);
    res.status(500).json({ error: 'Erro ao deletar servidor' });
  }
}

// Listar proxies Zabbix
export async function listZabbixProxies(req, res) {
  try {
    const { serverId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    // Verificar acesso ao servidor
    let serverQuery = 'SELECT id FROM zabbix_servers WHERE id = $1';
    const serverParams = [serverId];

    if (!isAdmin) {
      serverQuery += ' AND user_id = $2';
      serverParams.push(userId);
    }

    const serverResult = await pool.query(serverQuery, serverParams);

    if (serverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Servidor não encontrado' });
    }

    // Buscar proxies
    const result = await pool.query(
      'SELECT * FROM zabbix_proxies WHERE server_id = $1 ORDER BY created_at DESC',
      [serverId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar proxies Zabbix:', error);
    res.status(500).json({ error: 'Erro ao listar proxies' });
  }
}

// Obter histórico de monitoramento Zabbix
export async function getZabbixMonitoringHistory(req, res) {
  try {
    const { serverId } = req.params;
    const { hours = 24 } = req.query;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    let query = 'SELECT id FROM zabbix_servers WHERE id = $1';
    const params = [serverId];

    if (!isAdmin) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    const serverResult = await pool.query(query, params);

    if (serverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Servidor não encontrado' });
    }

    const historyResult = await pool.query(
      `SELECT * FROM zabbix_monitoring_history
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
