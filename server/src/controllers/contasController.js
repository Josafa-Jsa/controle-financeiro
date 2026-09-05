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

// Filtra a lista de contas estritamente pelo usuário autenticado
function filtrarContasPorUsuario(lista = [], req) {
  const reqEmail = String(req.headers['x-user-email'] || req.query.userEmail || '').trim().toLowerCase();
  const reqId = String(req.headers['x-user-id'] || req.query.userId || '').trim();

  if (!reqEmail && !reqId) return lista;

  const isAdminReq = ADMIN_EMAILS.includes(reqEmail);
  if (isAdminReq) {
    // Administrador visualiza todas as contas do sistema financeiro
    return lista;
  }

  return lista.filter((c) => {
    const cEmail = String(c.userEmail || c.user_email || '').trim().toLowerCase();
    const cId = String(c.userId || c.user_id || '').trim();

    if (cEmail && reqEmail && cEmail === reqEmail) return true;
    if (cId && reqId && cId === reqId) return true;
    return false;
  });
}

export async function listContas(req, res) {
  const reqEmail = String(req.headers['x-user-email'] || req.query.userEmail || '').trim().toLowerCase();
  const reqId = String(req.headers['x-user-id'] || req.query.userId || '').trim();
  const isAdminReq = ADMIN_EMAILS.includes(reqEmail);

  try {
    let query = 'SELECT * FROM contas';
    const params = [];

    if (reqEmail || reqId) {
      if (isAdminReq) {
        query += ' ORDER BY vencimento ASC, id DESC';
      } else {
        query += ' WHERE (user_email = ? OR (user_id IS NOT NULL AND user_id != "" AND user_id = ?)) ORDER BY vencimento ASC, id DESC';
        params.push(reqEmail, reqId || '');
      }
    } else {
      query += ' ORDER BY vencimento ASC, id DESC';
    }

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
      userEmail: c.user_email || (isAdminReq ? 'jsa@jsa.com' : null),
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

  const reqEmail = String(req.body.userEmail || req.headers['x-user-email'] || req.query.userEmail || 'jsa@jsa.com').trim().toLowerCase();
  const reqId = String(req.body.userId || req.headers['x-user-id'] || req.query.userId || '1').trim();
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
