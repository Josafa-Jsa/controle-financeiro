import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.resolve(DATA_DIR, 'contas.json');

const ADMIN_EMAILS = ['jsa@jsa.com', 'jsa.admin@gmail.com', 'josafa.santos.jss@gmail.com'];

// Garante que o diretório server/data exista
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}

function readJsonFallback() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const list = JSON.parse(content || '[]');
      return Array.isArray(list) ? list : [];
    }
  } catch (e) {
    console.error('Erro ao ler fallback JSON de contas:', e.message);
  }
  return [];
}

function writeJsonFallback(lista) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(lista, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao gravar fallback JSON de contas:', e.message);
  }
}

let tableInitialized = false;

async function ensureContasTable() {
  if (tableInitialized) return;
  try {
    // 1. Cria a tabela contas caso não exista
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contas (
        id BIGINT NOT NULL PRIMARY KEY,
        codigo VARCHAR(64) NULL,
        user_email VARCHAR(190) NULL,
        user_id VARCHAR(64) NULL,
        tipo VARCHAR(20) NOT NULL,
        descricao VARCHAR(255) NOT NULL,
        observacao TEXT NULL,
        valor DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        vencimento DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Pendente',
        data_pagamento DATE NULL,
        referencia_tipo VARCHAR(60) NULL,
        referencia_id VARCHAR(64) NULL,
        editada TINYINT(1) NOT NULL DEFAULT 0,
        exclusao_pendente TINYINT(1) NOT NULL DEFAULT 0,
        delete_request_id VARCHAR(64) NULL,
        motivo_exclusao TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_contas_user_email (user_email),
        INDEX idx_contas_user_id (user_id),
        INDEX idx_contas_tipo (tipo),
        INDEX idx_contas_status (status),
        INDEX idx_contas_vencimento (vencimento)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Cria a tabela contas_baixas caso não exista
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contas_baixas (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        conta_id BIGINT NOT NULL,
        valor DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        data DATE NOT NULL,
        obs VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_baixas_conta (conta_id),
        INDEX idx_baixas_data (data)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Garante que colunas adicionadas em atualizações recentes existam na tabela contas
    const [cols] = await pool.query("SHOW COLUMNS FROM contas");
    const existingCols = cols.map((c) => c.Field);

    if (!existingCols.includes('user_email')) {
      await pool.query("ALTER TABLE contas ADD COLUMN user_email VARCHAR(190) NULL, ADD INDEX idx_contas_user_email (user_email)");
    }
    if (!existingCols.includes('user_id')) {
      await pool.query("ALTER TABLE contas ADD COLUMN user_id VARCHAR(64) NULL, ADD INDEX idx_contas_user_id (user_id)");
    }
    if (!existingCols.includes('codigo')) {
      await pool.query("ALTER TABLE contas ADD COLUMN codigo VARCHAR(64) NULL");
    }
    if (!existingCols.includes('referencia_tipo')) {
      await pool.query("ALTER TABLE contas ADD COLUMN referencia_tipo VARCHAR(60) NULL");
    }
    if (!existingCols.includes('referencia_id')) {
      await pool.query("ALTER TABLE contas ADD COLUMN referencia_id VARCHAR(64) NULL");
    }
    if (!existingCols.includes('editada')) {
      await pool.query("ALTER TABLE contas ADD COLUMN editada TINYINT(1) NOT NULL DEFAULT 0");
    }
    if (!existingCols.includes('exclusao_pendente')) {
      await pool.query("ALTER TABLE contas ADD COLUMN exclusao_pendente TINYINT(1) NOT NULL DEFAULT 0");
    }
    if (!existingCols.includes('delete_request_id')) {
      await pool.query("ALTER TABLE contas ADD COLUMN delete_request_id VARCHAR(64) NULL");
    }
    if (!existingCols.includes('motivo_exclusao')) {
      await pool.query("ALTER TABLE contas ADD COLUMN motivo_exclusao TEXT NULL");
    }

    tableInitialized = true;
  } catch (err) {
    // Silencia se o banco ainda estiver conectando ou inicializando
  }
}

// Inicializa verificação de tabela
ensureContasTable();

// Filtra a lista de contas estritamente pelo usuário autenticado
function filtrarContasPorUsuario(lista = [], req) {
  const reqEmail = String(req.headers['x-user-email'] || req.query.userEmail || req.query.user_email || '').trim().toLowerCase();
  const reqId = String(req.headers['x-user-id'] || req.query.userId || req.query.user_id || '').trim();
  const verTodas = String(req.query.verTodas || '').toLowerCase() === 'true';

  if (verTodas && (ADMIN_EMAILS.includes(reqEmail) || String(req.query.isAdmin) === 'true')) {
    return lista;
  }

  if (!reqEmail && !reqId) return [];

  return lista.filter((c) => {
    const cEmail = String(c.userEmail || c.user_email || '').trim().toLowerCase();
    const cId = String(c.userId || c.user_id || '').trim();

    if (cEmail && reqEmail && cEmail === reqEmail) return true;
    if (cId && reqId && cId === reqId) return true;
    return false;
  });
}

export async function listContas(req, res) {
  const reqEmail = String(req.headers['x-user-email'] || req.query.userEmail || req.query.user_email || '').trim().toLowerCase();
  const reqId = String(req.headers['x-user-id'] || req.query.userId || req.query.user_id || '').trim();
  const verTodas = String(req.query.verTodas || '').toLowerCase() === 'true';

  try {
    await ensureContasTable();
    let query = 'SELECT * FROM contas';
    const params = [];

    if (!verTodas) {
      if (reqEmail && reqId) {
        query += ' WHERE (LOWER(user_email) = LOWER(?) OR (user_email IS NULL AND user_id = ?))';
        params.push(reqEmail, reqId);
      } else if (reqEmail) {
        query += ' WHERE LOWER(user_email) = LOWER(?)';
        params.push(reqEmail);
      } else if (reqId) {
        query += ' WHERE user_id = ?';
        params.push(reqId);
      } else {
        // Sem identificação de usuário: não retorna registros para evitar vazamento
        return res.json([]);
      }
    }

    query += ' ORDER BY vencimento ASC, id DESC';

    const [contas] = await pool.query(query, params);
    const [baixas] = await pool.query('SELECT * FROM contas_baixas ORDER BY data ASC');

    const baixasMap = {};
    for (const b of baixas) {
      if (!baixasMap[b.conta_id]) baixasMap[b.conta_id] = [];
      baixasMap[b.conta_id].push({
        id: b.id,
        valor: Number(b.valor),
        data: b.data,
        obs: b.obs,
      });
    }

    const resultado = contas.map((c) => ({
      id: c.id,
      codigo: c.codigo || String(c.id).slice(-6).padStart(6, '0'),
      codigoConta: c.codigo || String(c.id).slice(-6).padStart(6, '0'),
      userEmail: c.user_email || null,
      userId: c.user_id || null,
      tipo: c.tipo,
      descricao: c.descricao,
      observacao: c.observacao,
      valor: Number(c.valor),
      vencimento: c.vencimento ? c.vencimento.toISOString().slice(0, 10) : null,
      status: c.status,
      dataPagamento: c.data_pagamento ? c.data_pagamento.toISOString().slice(0, 10) : null,
      referenciaTipo: c.referencia_tipo,
      referenciaId: c.referencia_id,
      editada: Boolean(c.editada),
      exclusaoPendente: Boolean(c.exclusao_pendente),
      deleteRequestId: c.delete_request_id,
      motivoExclusao: c.motivo_exclusao,
      baixas: baixasMap[c.id] || [],
    }));

    const resultadoFiltrado = filtrarContasPorUsuario(resultado, req);
    return res.json(resultadoFiltrado);
  } catch (error) {
    console.warn('⚠️ [MySQL] listContas usando fallback JSON sincronizado:', error.message);
    const fallbackList = readJsonFallback();
    const fallbackFiltrado = filtrarContasPorUsuario(fallbackList, req);
    return res.json(fallbackFiltrado);
  }
}

export async function createConta(req, res) {
  const {
    id = Date.now(),
    codigo,
    codigoConta,
    tipo = 'Pagar',
    descricao,
    observacao,
    valor = 0,
    vencimento,
    status = 'Pendente',
    referenciaTipo,
    referenciaId,
    baixas = [],
  } = req.body;

  if (!descricao) {
    return res.status(400).json({ error: 'Descrição da conta é obrigatória.' });
  }

  const reqEmail = String(req.body.userEmail || req.body.user_email || req.headers['x-user-email'] || req.query.userEmail || req.query.user_email || '').trim().toLowerCase() || null;
  const reqId = String(req.body.userId || req.body.user_id || req.headers['x-user-id'] || req.query.userId || req.query.user_id || '').trim() || null;
  const codFinal = String(codigo || codigoConta || String(id).slice(-6).padStart(6, '0'));

  const novaContaObj = {
    id: Number(id),
    codigo: codFinal,
    codigoConta: codFinal,
    userEmail: reqEmail,
    userId: reqId || null,
    tipo,
    descricao,
    observacao: observacao || '',
    valor: Number(valor) || 0,
    vencimento: vencimento ? String(vencimento).slice(0, 10) : new Date().toISOString().slice(0, 10),
    status,
    referenciaTipo: referenciaTipo || null,
    referenciaId: referenciaId || null,
    baixas: Array.isArray(baixas) ? baixas : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await ensureContasTable();
    await pool.query(
      `INSERT INTO contas (id, tipo, descricao, observacao, valor, vencimento, status, referencia_tipo, referencia_id, user_email, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         tipo = VALUES(tipo),
         descricao = VALUES(descricao),
         observacao = VALUES(observacao),
         valor = VALUES(valor),
         vencimento = VALUES(vencimento),
         status = VALUES(status),
         user_email = VALUES(user_email),
         user_id = VALUES(user_id)`,
      [
        id,
        tipo,
        descricao,
        observacao || null,
        Number(valor) || 0,
        novaContaObj.vencimento,
        status,
        referenciaTipo || null,
        referenciaId || null,
        reqEmail,
        reqId || null,
      ]
    );

    if (Array.isArray(baixas) && baixas.length) {
      await pool.query('DELETE FROM contas_baixas WHERE conta_id = ?', [id]);
      for (const b of baixas) {
        await pool.query(
          `INSERT INTO contas_baixas (conta_id, valor, data, obs) VALUES (?, ?, ?, ?)`,
          [id, Number(b.valor) || 0, b.data || new Date().toISOString().slice(0, 10), b.obs || null]
        );
      }
    }
  } catch (error) {
    console.warn('⚠️ [MySQL] createConta gravando no fallback JSON:', error.message);
  }

  // Atualiza arquivo fallback compartilhado
  const lista = readJsonFallback();
  const index = lista.findIndex((c) => String(c.id) === String(id));
  if (index !== -1) {
    lista[index] = { ...lista[index], ...novaContaObj };
  } else {
    lista.push(novaContaObj);
  }
  writeJsonFallback(lista);

  return res.status(201).json(novaContaObj);
}

export async function updateConta(req, res) {
  const { id } = req.params;
  const updateData = req.body;
  const reqEmail = String(req.body.userEmail || req.headers['x-user-email'] || '').trim().toLowerCase();

  try {
    await ensureContasTable();
    const {
      tipo,
      descricao,
      observacao,
      valor,
      vencimento,
      status,
      dataPagamento,
      editada,
      exclusaoPendente,
      deleteRequestId,
      motivoExclusao,
      baixas,
    } = updateData;

    await pool.query(
      `UPDATE contas SET 
         tipo = COALESCE(?, tipo),
         descricao = COALESCE(?, descricao),
         observacao = COALESCE(?, observacao),
         valor = COALESCE(?, valor),
         vencimento = COALESCE(?, vencimento),
         status = COALESCE(?, status),
         data_pagamento = COALESCE(?, data_pagamento),
         editada = COALESCE(?, editada),
         exclusao_pendente = COALESCE(?, exclusao_pendente),
         delete_request_id = COALESCE(?, delete_request_id),
         motivo_exclusao = COALESCE(?, motivo_exclusao),
         user_email = COALESCE(?, user_email)
       WHERE id = ?`,
      [
        tipo,
        descricao,
        observacao,
        valor !== undefined ? Number(valor) : null,
        vencimento ? new Date(vencimento).toISOString().slice(0, 10) : null,
        status,
        dataPagamento ? new Date(dataPagamento).toISOString().slice(0, 10) : null,
        editada !== undefined ? (editada ? 1 : 0) : null,
        exclusaoPendente !== undefined ? (exclusaoPendente ? 1 : 0) : null,
        deleteRequestId,
        motivoExclusao,
        reqEmail || null,
        id,
      ]
    );

    if (Array.isArray(baixas)) {
      await pool.query('DELETE FROM contas_baixas WHERE conta_id = ?', [id]);
      for (const b of baixas) {
        await pool.query(
          `INSERT INTO contas_baixas (conta_id, valor, data, obs) VALUES (?, ?, ?, ?)`,
          [id, Number(b.valor) || 0, b.data || new Date().toISOString().slice(0, 10), b.obs || null]
        );
      }
    }
  } catch (error) {
    console.warn('⚠️ [MySQL] updateConta atualizando no fallback JSON:', error.message);
  }

  // Atualiza arquivo fallback compartilhado
  const lista = readJsonFallback();
  const index = lista.findIndex((c) => String(c.id) === String(id));
  if (index !== -1) {
    lista[index] = { ...lista[index], ...updateData, id: Number(id) };
  } else {
    lista.push({ ...updateData, id: Number(id) });
  }
  writeJsonFallback(lista);

  return res.json({ message: 'Conta atualizada com sucesso.' });
}

export async function deleteConta(req, res) {
  const { id } = req.params;

  try {
    await ensureContasTable();
    await pool.query('DELETE FROM contas WHERE id = ?', [id]);
    await pool.query('DELETE FROM contas_baixas WHERE conta_id = ?', [id]);
  } catch (error) {
    console.warn('⚠️ [MySQL] deleteConta removendo no fallback JSON:', error.message);
  }

  // Remove do fallback compartilhado
  const lista = readJsonFallback().filter((c) => String(c.id) !== String(id));
  writeJsonFallback(lista);

  return res.json({ message: 'Conta excluída com sucesso.' });
}
