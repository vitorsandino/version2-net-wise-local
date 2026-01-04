import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';
import * as dnsController from '../controllers/dnsController.js';
import * as zabbixController from '../controllers/zabbixController.js';
import pool from '../config/database.js';

const router = express.Router();

// ===== Rotas Públicas =====
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Health check
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// ===== Rotas Autenticadas =====
router.use(authenticate);

// Perfil do usuário
router.get('/auth/profile', authController.getProfile);
router.put('/auth/profile', authController.updateProfile);

// ===== DNS =====
router.get('/dns/servers', dnsController.listDNSServers);
router.post('/dns/servers', dnsController.createDNSServer);
router.get('/dns/servers/:serverId', dnsController.getDNSServer);
router.put('/dns/servers/:serverId', dnsController.updateDNSServer);
router.delete('/dns/servers/:serverId', dnsController.deleteDNSServer);
router.post('/dns/servers/:serverId/install', dnsController.installDNS);
router.post('/dns/servers/:serverId/command', dnsController.executeCommand);
router.get('/dns/servers/:serverId/stats', dnsController.getDNSQueryStats);
router.get('/dns/servers/:serverId/monitoring', dnsController.getDNSMonitoringHistory);

// ===== Zabbix =====
router.get('/zabbix/servers', zabbixController.listZabbixServers);
router.post('/zabbix/servers', zabbixController.createZabbixServer);
router.get('/zabbix/servers/:serverId', zabbixController.getZabbixServer);
router.delete('/zabbix/servers/:serverId', zabbixController.deleteZabbixServer);
router.post('/zabbix/servers/:serverId/install', zabbixController.installZabbix);
router.get('/zabbix/servers/:serverId/proxies', zabbixController.listZabbixProxies);
router.get('/zabbix/servers/:serverId/monitoring', zabbixController.getZabbixMonitoringHistory);

// ===== Clientes (Admin) =====
router.get('/clients', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clients ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
});

router.post('/clients', requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, userId } = req.body;
    const createdBy = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const result = await pool.query(
      `INSERT INTO clients (name, email, phone, user_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, email, phone, userId, createdBy]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

// ===== Usuários (Admin) =====
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.created_at, u.last_login, u.active,
              array_agg(ur.role) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

router.put('/users/:userId/role', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role inválida' });
    }

    // Remover roles existentes
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

    // Adicionar nova role
    await pool.query(
      'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
      [userId, role]
    );

    res.json({ message: 'Role atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar role:', error);
    res.status(500).json({ error: 'Erro ao atualizar role' });
  }
});

// ===== Tickets =====
router.get('/tickets', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    let query = `
      SELECT t.*, u.email as user_email, u.full_name as user_name
      FROM tickets t
      JOIN users u ON t.user_id = u.id
    `;

    const params = [];

    if (!isAdmin) {
      query += ' WHERE t.user_id = $1';
      params.push(userId);
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar tickets:', error);
    res.status(500).json({ error: 'Erro ao listar tickets' });
  }
});

router.post('/tickets', async (req, res) => {
  try {
    const { subject, priority } = req.body;
    const userId = req.user.id;

    if (!subject) {
      return res.status(400).json({ error: 'Assunto é obrigatório' });
    }

    const result = await pool.query(
      `INSERT INTO tickets (subject, priority, user_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [subject, priority || 'medium', userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar ticket:', error);
    res.status(500).json({ error: 'Erro ao criar ticket' });
  }
});

router.get('/tickets/:ticketId/messages', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    // Verificar acesso ao ticket
    let ticketQuery = 'SELECT id FROM tickets WHERE id = $1';
    const ticketParams = [ticketId];

    if (!isAdmin) {
      ticketQuery += ' AND user_id = $2';
      ticketParams.push(userId);
    }

    const ticketResult = await pool.query(ticketQuery, ticketParams);

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    // Buscar mensagens
    const result = await pool.query(
      `SELECT tm.*, u.email as sender_email, u.full_name as sender_name
       FROM ticket_messages tm
       JOIN users u ON tm.sender_id = u.id
       WHERE tm.ticket_id = $1
       ORDER BY tm.created_at ASC`,
      [ticketId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

router.post('/tickets/:ticketId/messages', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    if (!content) {
      return res.status(400).json({ error: 'Conteúdo é obrigatório' });
    }

    // Verificar acesso ao ticket
    let ticketQuery = 'SELECT id FROM tickets WHERE id = $1';
    const ticketParams = [ticketId];

    if (!isAdmin) {
      ticketQuery += ' AND user_id = $2';
      ticketParams.push(userId);
    }

    const ticketResult = await pool.query(ticketQuery, ticketParams);

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    // Criar mensagem
    const result = await pool.query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [ticketId, userId, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar mensagem:', error);
    res.status(500).json({ error: 'Erro ao criar mensagem' });
  }
});

// ===== Agente de Monitoramento =====
router.post('/agent/check', async (req, res) => {
  try {
    const { serverId, token, type = 'dns' } = req.body;

    if (!serverId || !token) {
      return res.status(400).json({ error: 'serverId e token são obrigatórios' });
    }

    const table = type === 'zabbix' ? 'zabbix_servers' : 'dns_servers';

    // Verificar token e buscar comando pendente
    const result = await pool.query(
      `SELECT pending_command FROM ${table}
       WHERE id = $1 AND agent_token = $2`,
      [serverId, token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Atualizar último check
    await pool.query(
      `UPDATE ${table} SET last_agent_check = NOW() WHERE id = $1`,
      [serverId]
    );

    const command = result.rows[0].pending_command;

    res.json({ command: command || null });
  } catch (error) {
    console.error('Erro no agent check:', error);
    res.status(500).json({ error: 'Erro no agent check' });
  }
});

router.post('/agent/result', async (req, res) => {
  try {
    const { serverId, token, output, exitCode, type = 'dns' } = req.body;

    if (!serverId || !token) {
      return res.status(400).json({ error: 'serverId e token são obrigatórios' });
    }

    const table = type === 'zabbix' ? 'zabbix_servers' : 'dns_servers';

    // Verificar token
    const checkResult = await pool.query(
      `SELECT id FROM ${table} WHERE id = $1 AND agent_token = $2`,
      [serverId, token]
    );

    if (checkResult.rows.length === 0) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Atualizar resultado do comando
    await pool.query(
      `UPDATE ${table}
       SET command_output = $1,
           command_status = $2,
           pending_command = NULL
       WHERE id = $3`,
      [output, exitCode === 0 ? 'success' : 'error', serverId]
    );

    res.json({ message: 'Resultado registrado' });
  } catch (error) {
    console.error('Erro ao registrar resultado:', error);
    res.status(500).json({ error: 'Erro ao registrar resultado' });
  }
});

export default router;
