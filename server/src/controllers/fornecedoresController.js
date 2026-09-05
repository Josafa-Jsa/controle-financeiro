// server/src/controllers/fornecedoresController.js
import pool from '../config/db.js';

let tabelaCriada = false;

// Helper para extrair 14 dígitos de CNPJ ou Chave NFe
function extrairCnpjLimpo(valor) {
  if (!valor) return '';
  const limpo = String(valor).replace(/\D+/g, '');
  if (limpo.length === 44) {
    // Na chave de 44 dígitos da NF-e, o CNPJ fica entre os índices 6 e 20 (14 dígitos)
    return limpo.slice(6, 20);
  }
  if (limpo.length >= 14) {
    return limpo.slice(0, 14);
  }
  return limpo;
}

// Formata CNPJ 00.000.000/0000-00
function formatarCnpj(cnpjRaw) {
  const limpo = extrairCnpjLimpo(cnpjRaw);
  if (limpo.length !== 14) return cnpjRaw || '';
  return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12)}`;
}

/**
 * Garante que a tabela 'fornecedores' exista no MySQL com todos os campos e índices
 */
async function checarTabelaFornecedores() {
  if (tabelaCriada) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fornecedores (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        cnpj VARCHAR(30) NOT NULL UNIQUE,
        cnpj_raw VARCHAR(20) NOT NULL UNIQUE,
        nome VARCHAR(255) NOT NULL,
        razao_social VARCHAR(255) NULL,
        nome_fantasia VARCHAR(255) NULL,
        categoria VARCHAR(150) NULL,
        produto_relacionado VARCHAR(255) NULL,
        tipo_conta VARCHAR(50) DEFAULT 'Pagar',
        tipo VARCHAR(50) DEFAULT 'NFe',
        telefone VARCHAR(50) NULL,
        email VARCHAR(190) NULL,
        origem_padrao VARCHAR(100) DEFAULT 'manual',
        created_by VARCHAR(190) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_fornecedores_cnpj (cnpj_raw),
        INDEX idx_fornecedores_nome (nome)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed padrão inicial: AUTO POSTO DELCAS
    try {
      await pool.query(`
        INSERT IGNORE INTO fornecedores (cnpj, cnpj_raw, nome, razao_social, produto_relacionado, tipo_conta, origem_padrao)
        VALUES ('26.536.763/0001-45', '26536763000145', 'AUTO POSTO DELCAS', 'AUTO POSTO DELCAS', 'ABASTECIMENTO', 'Pagar', 'predefinido')
      `);
    } catch (_) {}

    tabelaCriada = true;
  } catch (err) {
    console.warn('[Fornecedores] Aviso ao inicializar tabela fornecedores:', err.message);
  }
}

/**
 * GET /api/fornecedores
 * Lista todos os fornecedores cadastrados no banco de dados
 */
export async function listFornecedores(req, res) {
  try {
    await checarTabelaFornecedores();
    const [rows] = await pool.query('SELECT * FROM fornecedores ORDER BY nome ASC');

    const formatados = rows.map((r) => ({
      id: r.id,
      cnpj: r.cnpj || formatarCnpj(r.cnpj_raw),
      cnpjRaw: r.cnpj_raw,
      nome: r.nome,
      razaoSocial: r.razao_social || r.nome,
      nomeFantasia: r.nome_fantasia || r.nome,
      categoria: r.categoria,
      produtoRelacionado: r.produto_relacionado,
      tipoConta: r.tipo_conta || 'Pagar',
      tipo: r.tipo || 'NFe',
      telefone: r.telefone,
      email: r.email,
      origemPadrao: r.origem_padrao,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    res.json(formatados);
  } catch (error) {
    console.error('Erro ao listar fornecedores:', error);
    res.status(500).json({ error: 'Erro ao buscar fornecedores no banco de dados.' });
  }
}

/**
 * GET /api/fornecedores/consultar/:cnpj
 * Consulta um fornecedor por CNPJ ou por Chave de Acesso da NF-e
 */
export async function getFornecedorByCnpj(req, res) {
  try {
    await checarTabelaFornecedores();
    const { cnpj } = req.params;
    const cnpjPuro = extrairCnpjLimpo(cnpj);

    if (!cnpjPuro || cnpjPuro.length !== 14) {
      return res.status(400).json({ error: 'CNPJ ou Chave inválida. Informe 14 dígitos numéricos ou a chave de 44 dígitos.' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM fornecedores WHERE cnpj_raw = ? OR cnpj = ? LIMIT 1',
      [cnpjPuro, formatarCnpj(cnpjPuro)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        found: false,
        message: 'Fornecedor não encontrado no banco de dados.',
        cnpjRaw: cnpjPuro,
        cnpj: formatarCnpj(cnpjPuro),
      });
    }

    const r = rows[0];
    res.json({
      found: true,
      id: r.id,
      cnpj: r.cnpj || formatarCnpj(r.cnpj_raw),
      cnpjRaw: r.cnpj_raw,
      nome: r.nome,
      razaoSocial: r.razao_social || r.nome,
      clienteOuServico: r.nome,
      origem: r.nome,
      produtoRelacionado: r.produto_relacionado || r.categoria || '',
      categoria: r.categoria,
      tipoConta: r.tipo_conta || 'Pagar',
      tipo: r.tipo || 'NFe',
      telefone: r.telefone,
      email: r.email,
      updatedAt: r.updated_at,
    });
  } catch (error) {
    console.error('Erro ao consultar fornecedor por CNPJ:', error);
    res.status(500).json({ error: 'Erro ao consultar fornecedor no banco de dados.' });
  }
}

/**
 * POST /api/fornecedores
 * Cadastra ou atualiza fornecedor (Upsert)
 */
export async function createOrUpdateFornecedor(req, res) {
  try {
    await checarTabelaFornecedores();
    const {
      cnpj,
      cnpjRaw,
      nome,
      razaoSocial,
      nomeFantasia,
      categoria,
      produtoRelacionado,
      tipoConta = 'Pagar',
      tipo = 'NFe',
      telefone,
      email,
      origemPadrao = 'manual',
      createdBy,
    } = req.body;

    const cnpjLimpo = extrairCnpjLimpo(cnpjRaw || cnpj);

    if (!cnpjLimpo || cnpjLimpo.length !== 14) {
      return res.status(400).json({ error: 'CNPJ inválido. Forneça 14 dígitos numéricos.' });
    }

    const nomeFinal = String(nome || razaoSocial || `FORNECEDOR ${cnpjLimpo}`).trim().toUpperCase();
    const cnpjFormatado = formatarCnpj(cnpjLimpo);
    const produtoFinal = String(produtoRelacionado || categoria || '').trim().toUpperCase();

    const query = `
      INSERT INTO fornecedores (
        cnpj, cnpj_raw, nome, razao_social, nome_fantasia, categoria,
        produto_relacionado, tipo_conta, tipo, telefone, email, origem_padrao, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nome = VALUES(nome),
        razao_social = VALUES(razao_social),
        nome_fantasia = VALUES(nome_fantasia),
        categoria = VALUES(categoria),
        produto_relacionado = VALUES(produto_relacionado),
        tipo_conta = VALUES(tipo_conta),
        tipo = VALUES(tipo),
        telefone = COALESCE(VALUES(telefone), telefone),
        email = COALESCE(VALUES(email), email),
        origem_padrao = VALUES(origem_padrao),
        updated_at = CURRENT_TIMESTAMP
    `;

    const [result] = await pool.query(query, [
      cnpjFormatado,
      cnpjLimpo,
      nomeFinal,
      razaoSocial ? String(razaoSocial).toUpperCase() : nomeFinal,
      nomeFantasia ? String(nomeFantasia).toUpperCase() : nomeFinal,
      categoria ? String(categoria).toUpperCase() : null,
      produtoFinal || null,
      tipoConta,
      tipo,
      telefone || null,
      email || null,
      origemPadrao,
      createdBy || null,
    ]);

    res.status(201).json({
      success: true,
      message: 'Fornecedor salvo com sucesso no banco de dados.',
      cnpj: cnpjFormatado,
      cnpjRaw: cnpjLimpo,
      nome: nomeFinal,
      produtoRelacionado: produtoFinal,
      tipoConta,
    });
  } catch (error) {
    console.error('Erro ao salvar fornecedor:', error);
    res.status(500).json({ error: 'Erro ao salvar fornecedor no banco de dados.' });
  }
}

/**
 * DELETE /api/fornecedores/:id
 * Remove um fornecedor do banco de dados
 */
export async function deleteFornecedor(req, res) {
  try {
    await checarTabelaFornecedores();
    const { id } = req.params;
    await pool.query('DELETE FROM fornecedores WHERE id = ? OR cnpj_raw = ?', [id, id]);
    res.json({ message: 'Fornecedor removido com sucesso do banco de dados.' });
  } catch (error) {
    console.error('Erro ao excluir fornecedor:', error);
    res.status(500).json({ error: 'Erro ao excluir fornecedor do banco de dados.' });
  }
}
