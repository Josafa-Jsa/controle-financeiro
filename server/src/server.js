import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/apiRoutes.js';
import pool from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis do arquivo .env raiz se existir
const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

const app = express();
const DEFAULT_PORT = Number(process.env.API_PORT || process.env.PORT || 4000);

// Middlewares Globais
app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging de requisições simples
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${req.method} ${req.originalUrl}`);
  next();
});

// Rotas da API
app.use('/api', apiRoutes);

// Tratamento de Rota Não Encontrada
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

// Tratamento Global de Erros
app.use((err, req, res, next) => {
  console.error('❌ Erro no Servidor:', err);
  res.status(500).json({ error: 'Erro interno do servidor.', details: err.message });
});

// Inicialização com suporte a fallback de porta
async function startServer(port = DEFAULT_PORT) {
  try {
    const conn = await pool.getConnection();
    console.log('✔ [MySQL] Conexão com o banco de dados estabelecida com sucesso!');
    conn.release();
  } catch (error) {
    console.warn('⚠️ [MySQL] Aviso: Não foi possível conectar ao banco de dados imediatamente.');
    console.warn(`   Detalhes: ${error.message}`);
    console.warn('   Execute "npm run db:migrate" para criar o banco e as tabelas.');
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log('====================================================');
    console.log(`🚀 [JSA Server] API Back-end rodando na porta ${port}`);
    console.log(`📡 URL Local: http://localhost:${port}/api/health`);
    console.log(`📱 Acessível para Frontend Desktop (5173) e Mobile (2515)`);
    console.log('====================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Porta ${port} ocupada ou sem permissão. Tentando porta ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Erro ao iniciar servidor:', err);
    }
  });
}

startServer();
