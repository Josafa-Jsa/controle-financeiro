// server/src/controllers/controleNotasController.js
import pool from '../config/db.js';

let tabelaCriada = false;

async function checarTabelaControleNotas() {
  if (tabelaCriada) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS controle_notas (
        id BIGINT PRIMARY KEY,
        filial VARCHAR(100) DEFAULT 'Filial 1',
        chavedeacesso VARCHAR(60) NULL,
        numero VARCHAR(50) NULL,
        fornecedor VARCHAR(255) NULL,
        cnpj VARCHAR(30) NULL,
        data_emissao DATE NULL,
        valor DECIMAL(15, 2) DEFAULT 0,
        data_hora_entrega DATETIME NULL,
        quem_recebeu VARCHAR(150) NULL,
        quem_recebeu_email VARCHAR(150) NULL,
        observacoes TEXT NULL,
        status VARCHAR(50) DEFAULT 'Recebida',
        situacao_nota VARCHAR(100) NULL,
        responsavel_liberacao VARCHAR(150) NULL,
        data_hora_liberacao DATETIME NULL,
        anexo_danfe LONGTEXT NULL,
        anexo_nome VARCHAR(255) NULL,
        anexo_tipo VARCHAR(100) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_controle_notas_filial (filial)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Migração segura para tabelas já existentes
    try {
      await pool.query(`ALTER TABLE controle_notas ADD COLUMN filial VARCHAR(100) DEFAULT 'Filial 1';`);
    } catch (_) {}
    try {
      await pool.query(`ALTER TABLE controle_notas ADD COLUMN situacao_nota VARCHAR(100) NULL;`);
    } catch (_) {}
    try {
      await pool.query(`ALTER TABLE controle_notas ADD COLUMN responsavel_liberacao VARCHAR(150) NULL;`);
    } catch (_) {}
    try {
      await pool.query(`ALTER TABLE controle_notas ADD COLUMN data_hora_liberacao DATETIME NULL;`);
    } catch (_) {}
    try {
      await pool.query(`ALTER TABLE controle_notas ADD COLUMN anexo_danfe LONGTEXT NULL;`);
    } catch (_) {}
    try {
      await pool.query(`ALTER TABLE controle_notas ADD COLUMN anexo_nome VARCHAR(255) NULL;`);
    } catch (_) {}
    try {
      await pool.query(`ALTER TABLE controle_notas ADD COLUMN anexo_tipo VARCHAR(100) NULL;`);
    } catch (_) {}

    tabelaCriada = true;
  } catch (err) {
    console.warn('[ControleNotas] Aviso ao inicializar tabela controle_notas:', err.message);
  }
}

const ADMIN_EMAILS = ['jsa@jsa.com', 'jsa.admin@gmail.com', 'josafa.santos.jss@gmail.com'];

function normalizarFilial(f) {
  if (!f) return 'Filial 1';
  const s = String(f).trim();
  if (!s || /^todas/i.test(s)) return 'Todas';
  if (/particular/i.test(s)) return 'Filial Particular';
  const matchNum = s.match(/\d+/);
  if (matchNum) {
    return `Filial ${parseInt(matchNum[0], 10)}`;
  }
  return s;
}

export async function listControleNotas(req, res) {
  try {
    await checarTabelaControleNotas();
    const { filial, data, isAdmin } = req.query;
    const reqEmail = String(req.headers['x-user-email'] || req.query.user_email || req.query.userEmail || '').trim().toLowerCase();
    const isMasterAdmin = String(isAdmin) === 'true' || (reqEmail && ADMIN_EMAILS.includes(reqEmail));

    let sql = 'SELECT * FROM controle_notas WHERE 1=1';
    const params = [];

    if (!isMasterAdmin) {
      // Usuário comum é estritamente restrito à sua própria filial (ex: Filial 4)
      const filialFinal = normalizarFilial(filial || 'Filial 1');
      sql += ' AND (LOWER(TRIM(filial)) = LOWER(?) OR filial = ?)';
      params.push(filialFinal, filialFinal);
    } else if (filial && filial.trim() && filial.trim().toLowerCase() !== 'todas' && filial.trim().toLowerCase() !== 'todas as filiais') {
      const filialFinal = normalizarFilial(filial.trim());
      sql += ' AND (LOWER(TRIM(filial)) = LOWER(?) OR filial = ?)';
      params.push(filialFinal, filialFinal);
    }

    if (data && data.trim()) {
      sql += ' AND (DATE(data_hora_entrega) = ? OR data_emissao = ?)';
      params.push(data.trim(), data.trim());
    }

    sql += ' ORDER BY data_hora_entrega DESC, id DESC';

    const [rows] = await pool.query(sql, params);
    
    const formatadas = rows.map((r) => ({
      id: r.id,
      filial: normalizarFilial(r.filial || 'Filial 1'),
      chavedeacesso: r.chavedeacesso,
      numero: r.numero,
      fornecedor: r.fornecedor,
      cnpj: r.cnpj,
      dataEmissao: r.data_emissao ? r.data_emissao.toISOString().slice(0, 10) : null,
      valor: Number(r.valor) || 0,
      dataHoraEntrega: r.data_hora_entrega ? r.data_hora_entrega.toISOString().slice(0, 16) : null,
      quemRecebeu: r.quem_recebeu,
      quemRecebeuEmail: r.quem_recebeu_email,
      observacoes: r.observacoes,
      status: r.status || 'Recebida',
      situacaoNota: r.situacao_nota || null,
      responsavelLiberacao: r.responsavel_liberacao || null,
      dataHoraLiberacao: r.data_hora_liberacao ? (r.data_hora_liberacao instanceof Date ? r.data_hora_liberacao.toISOString() : r.data_hora_liberacao) : null,
      anexoDanfe: r.anexo_danfe
        ? {
            dataUrl: r.anexo_danfe,
            nome: r.anexo_nome || 'danfe.pdf',
            tipo: r.anexo_tipo || 'application/pdf',
          }
        : null,
      createdAt: r.created_at,
    }));

    res.json(formatadas);
  } catch (error) {
    console.error('Erro ao listar controle de notas:', error);
    res.status(500).json({ error: 'Erro ao buscar notas do controle.' });
  }
}

/**
 * GET /api/relatorio-controle-notas
 * Consulta relatório de notas por data e filial diretamente no banco de dados
 */
export async function getRelatorioControleNotas(req, res) {
  try {
    await checarTabelaControleNotas();
    const { data, filial, isAdmin } = req.query;
    const reqEmail = String(req.headers['x-user-email'] || req.query.user_email || req.query.userEmail || '').trim().toLowerCase();
    const isMasterAdmin = String(isAdmin) === 'true' || (reqEmail && ADMIN_EMAILS.includes(reqEmail));

    let sql = 'SELECT * FROM controle_notas WHERE 1=1';
    const params = [];

    if (!isMasterAdmin) {
      const filialFinal = normalizarFilial(filial || 'Filial 1');
      sql += ' AND (LOWER(TRIM(filial)) = LOWER(?) OR filial = ?)';
      params.push(filialFinal, filialFinal);
    } else if (filial && filial.trim() && filial.trim().toLowerCase() !== 'todas' && filial.trim().toLowerCase() !== 'todas as filiais') {
      const filialFinal = normalizarFilial(filial.trim());
      sql += ' AND (LOWER(TRIM(filial)) = LOWER(?) OR filial = ?)';
      params.push(filialFinal, filialFinal);
    }

    if (data && data.trim()) {
      sql += ' AND (DATE(data_hora_entrega) = ? OR data_emissao = ?)';
      params.push(data.trim(), data.trim());
    }

    sql += ' ORDER BY data_hora_entrega ASC, id ASC';

    const [rows] = await pool.query(sql, params);

    const formatadas = rows.map((r) => ({
      id: r.id,
      filial: normalizarFilial(r.filial || 'Filial 1'),
      chavedeacesso: r.chavedeacesso,
      numero: r.numero,
      fornecedor: r.fornecedor,
      cnpj: r.cnpj,
      dataEmissao: r.data_emissao ? r.data_emissao.toISOString().slice(0, 10) : null,
      valor: Number(r.valor) || 0,
      dataHoraEntrega: r.data_hora_entrega ? r.data_hora_entrega.toISOString().slice(0, 16) : null,
      quemRecebeu: r.quem_recebeu,
      quemRecebeuEmail: r.quem_recebeu_email,
      observacoes: r.observacoes,
      status: r.status || 'Recebida',
      situacaoNota: r.situacao_nota || null,
      responsavelLiberacao: r.responsavel_liberacao || null,
      dataHoraLiberacao: r.data_hora_liberacao ? (r.data_hora_liberacao instanceof Date ? r.data_hora_liberacao.toISOString() : r.data_hora_liberacao) : null,
      anexoDanfe: r.anexo_danfe
        ? {
            dataUrl: r.anexo_danfe,
            nome: r.anexo_nome || 'danfe.pdf',
            tipo: r.anexo_tipo || 'application/pdf',
          }
        : null,
      createdAt: r.created_at,
    }));

    res.json(formatadas);
  } catch (error) {
    console.error('Erro ao buscar relatório de notas:', error);
    res.status(500).json({ error: 'Erro ao buscar relatório de notas no banco de dados.' });
  }
}

export async function createControleNota(req, res) {
  try {
    await checarTabelaControleNotas();
    const {
      id = Date.now(),
      filial = 'Filial 1',
      chavedeacesso,
      numero,
      fornecedor,
      cnpj,
      dataEmissao,
      valor = 0,
      dataHoraEntrega,
      quemRecebeu,
      quemRecebeuEmail,
      observacoes,
      status = 'Recebida',
      situacaoNota,
      responsavelLiberacao,
      dataHoraLiberacao,
      anexoDanfe,
    } = req.body;

    const filialFinal = normalizarFilial(filial || 'Filial 1');
    const dataEmissaoValida = dataEmissao ? new Date(dataEmissao).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const dataHoraEntregaValida = dataHoraEntrega ? new Date(dataHoraEntrega) : new Date();
    const dataHoraLiberacaoValida = dataHoraLiberacao ? new Date(dataHoraLiberacao) : null;

    const anexoDataUrl = typeof anexoDanfe === 'string' ? anexoDanfe : anexoDanfe?.dataUrl || null;
    const anexoNome = anexoDanfe?.nome || null;
    const anexoTipo = anexoDanfe?.tipo || null;

    await pool.query(
      `INSERT INTO controle_notas (id, filial, chavedeacesso, numero, fornecedor, cnpj, data_emissao, valor, data_hora_entrega, quem_recebeu, quem_recebeu_email, observacoes, status, situacao_nota, responsavel_liberacao, data_hora_liberacao, anexo_danfe, anexo_nome, anexo_tipo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        filialFinal,
        chavedeacesso || null,
        numero || null,
        fornecedor || null,
        cnpj || null,
        dataEmissaoValida,
        Number(valor) || 0,
        dataHoraEntregaValida,
        quemRecebeu || null,
        quemRecebeuEmail || null,
        observacoes || null,
        status,
        situacaoNota || null,
        responsavelLiberacao || null,
        dataHoraLiberacaoValida,
        anexoDataUrl,
        anexoNome,
        anexoTipo,
      ]
    );

    res.status(201).json({ id, filial: filialFinal, numero, fornecedor, cnpj, valor, status, situacaoNota, responsavelLiberacao, dataHoraLiberacao });
  } catch (error) {
    console.error('Erro ao criar nota no controle:', error);
    res.status(500).json({ error: 'Erro ao salvar nota no controle.' });
  }
}

export async function updateControleNota(req, res) {
  try {
    await checarTabelaControleNotas();
    const { id } = req.params;
    const {
      filial,
      chavedeacesso,
      numero,
      fornecedor,
      cnpj,
      dataEmissao,
      valor,
      dataHoraEntrega,
      quemRecebeu,
      quemRecebeuEmail,
      observacoes,
      status,
      situacaoNota,
      responsavelLiberacao,
      dataHoraLiberacao,
      anexoDanfe,
    } = req.body;

    const filialFinal = filial !== undefined ? normalizarFilial(filial) : undefined;
    const anexoDataUrl = typeof anexoDanfe === 'string' ? anexoDanfe : anexoDanfe?.dataUrl !== undefined ? anexoDanfe.dataUrl : undefined;
    const anexoNome = anexoDanfe?.nome !== undefined ? anexoDanfe.nome : undefined;
    const anexoTipo = anexoDanfe?.tipo !== undefined ? anexoDanfe.tipo : undefined;

    await pool.query(
      `UPDATE controle_notas SET
         filial = COALESCE(?, filial),
         chavedeacesso = COALESCE(?, chavedeacesso),
         numero = COALESCE(?, numero),
         fornecedor = COALESCE(?, fornecedor),
         cnpj = COALESCE(?, cnpj),
         data_emissao = COALESCE(?, data_emissao),
         valor = COALESCE(?, valor),
         data_hora_entrega = COALESCE(?, data_hora_entrega),
         quem_recebeu = COALESCE(?, quem_recebeu),
         quem_recebeu_email = COALESCE(?, quem_recebeu_email),
         observacoes = COALESCE(?, observacoes),
         status = COALESCE(?, status),
         situacao_nota = COALESCE(?, situacao_nota),
         responsavel_liberacao = COALESCE(?, responsavel_liberacao),
         data_hora_liberacao = COALESCE(?, data_hora_liberacao),
         anexo_danfe = COALESCE(?, anexo_danfe),
         anexo_nome = COALESCE(?, anexo_nome),
         anexo_tipo = COALESCE(?, anexo_tipo)
       WHERE id = ?`,
      [
        filialFinal,
        chavedeacesso,
        numero,
        fornecedor,
        cnpj,
        dataEmissao ? new Date(dataEmissao).toISOString().slice(0, 10) : null,
        valor !== undefined ? Number(valor) : null,
        dataHoraEntrega ? new Date(dataHoraEntrega) : null,
        quemRecebeu,
        quemRecebeuEmail,
        observacoes,
        status,
        situacaoNota !== undefined ? situacaoNota : null,
        responsavelLiberacao !== undefined ? responsavelLiberacao : null,
        dataHoraLiberacao !== undefined ? (dataHoraLiberacao ? new Date(dataHoraLiberacao) : null) : null,
        anexoDataUrl,
        anexoNome,
        anexoTipo,
        id,
      ]
    );

    res.json({ message: 'Nota do controle atualizada com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar nota do controle:', error);
    res.status(500).json({ error: 'Erro ao atualizar nota no controle.' });
  }
}

export async function deleteControleNota(req, res) {
  try {
    await checarTabelaControleNotas();
    const { id } = req.params;
    await pool.query('DELETE FROM controle_notas WHERE id = ?', [id]);
    res.json({ message: 'Nota removida do controle com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir nota do controle:', error);
    res.status(500).json({ error: 'Erro ao excluir nota do controle.' });
  }
}
