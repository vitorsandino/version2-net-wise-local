import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import pool from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middlewares de Segurança =====
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitar para desenvolvimento
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
});

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limite mais restrito para autenticação
}));

app.use(limiter);

// ===== Middlewares Gerais =====
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Rotas =====
app.use('/api', routes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    name: 'Version2 NetWise API',
    version: '2.0.0',
    status: 'running',
    documentation: '/api/health'
  });
});

// ===== Tratamento de Erros =====
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Rota 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ===== Inicialização do Servidor =====
async function startServer() {
  try {
    // Testar conexão com o banco
    await pool.query('SELECT NOW()');
    console.log('✅ Conexão com PostgreSQL estabelecida');

    // Iniciar servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📡 API disponível em http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Tratamento de sinais de encerramento
process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido, encerrando gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recebido, encerrando gracefully...');
  await pool.end();
  process.exit(0);
});

startServer();
