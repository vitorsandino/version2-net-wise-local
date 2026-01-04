import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { generateToken } from '../middleware/auth.js';

// Registro de novo usuário
export async function register(req, res) {
  const client = await pool.connect();
  
  try {
    const { email, password, fullName } = req.body;

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    }

    await client.query('BEGIN');

    // Verificar se usuário já existe
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Criar usuário
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, full_name, created_at`,
      [email.toLowerCase(), passwordHash, fullName || null]
    );

    const user = userResult.rows[0];

    // Atribuir role 'user' por padrão
    await client.query(
      'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
      [user.id, 'user']
    );

    await client.query('COMMIT');

    // Gerar token
    const token = generateToken({ ...user, roles: ['user'] });

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name
      },
      token
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  } finally {
    client.release();
  }
}

// Login
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const userResult = await pool.query(
      'SELECT id, email, password_hash, full_name, active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = userResult.rows[0];

    if (!user.active) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Buscar roles
    const rolesResult = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [user.id]
    );

    const roles = rolesResult.rows.map(r => r.role);

    // Atualizar último login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Gerar token
    const token = generateToken({ ...user, roles });

    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        roles
      },
      token
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
}

// Obter perfil do usuário autenticado
export async function getProfile(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.created_at, u.last_login,
              array_agg(ur.role) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
}

// Atualizar perfil
export async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { fullName, currentPassword, newPassword } = req.body;

    // Se está mudando senha, validar senha atual
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Senha atual é obrigatória' });
      }

      const userResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      const validPassword = await bcrypt.compare(
        currentPassword,
        userResult.rows[0].password_hash
      );

      if (!validPassword) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newPasswordHash, userId]
      );
    }

    // Atualizar nome
    if (fullName !== undefined) {
      await pool.query(
        'UPDATE users SET full_name = $1 WHERE id = $2',
        [fullName, userId]
      );
    }

    res.json({ message: 'Perfil atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
}
