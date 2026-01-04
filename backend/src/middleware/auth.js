import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Gerar token JWT
export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      roles: user.roles || []
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Middleware de autenticação
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar usuário no banco
    const result = await pool.query(
      'SELECT id, email, full_name, active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].active) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    // Buscar roles do usuário
    const rolesResult = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [decoded.id]
    );

    req.user = {
      ...result.rows[0],
      roles: rolesResult.rows.map(r => r.role)
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ error: 'Erro interno de autenticação' });
  }
}

// Middleware para verificar role específica
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!req.user.roles.includes(role)) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    next();
  };
}

// Middleware para verificar se é admin
export const requireAdmin = requireRole('admin');
