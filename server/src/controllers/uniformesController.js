import pool from '../config/db.js';

let tablesInitialized = false;

async function ensureTablesExist() {
  if (tablesInitialized) return;
  try {
    // Tabela de Estoque Consolidado de Uniformes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uniformes_estoque (
        id INT AUTO_INCREMENT PRIMARY KEY,
        departamento VARCHAR(100) NOT NULL,
        tamanho VARCHAR(30) NOT NULL,
        estado_novo_qtd INT NOT NULL DEFAULT 0,
        estado_usado_qtd INT NOT NULL DEFAULT 0,
        total_qtd INT NOT NULL DEFAULT 0,
        fabricante_principal VARCHAR(100) DEFAULT 'Jucicler',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_dep_tam (departamento, tamanho)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabela de Movimentações (Entradas e Saídas)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uniformes_movimentacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tipo VARCHAR(20) NOT NULL DEFAULT 'ENTRADA',
        departamento VARCHAR(100) NOT NULL,
        tamanho VARCHAR(30) NOT NULL,
        quantidade INT NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'Novo',
        fabricante VARCHAR(100) DEFAULT 'Jucicler',
        responsavel VARCHAR(150) DEFAULT 'Operador',
        motivo VARCHAR(255) DEFAULT 'Entrada de Estoque',
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    tablesInitialized = true;
  } catch (err) {
    console.error('[Uniformes DB Init Error]', err.message);
  }
}

// Lista todo o estoque consolidado
export async function listEstoque(req, res) {
  try {
    await ensureTablesExist();
    const [rows] = await pool.query(`
      SELECT * FROM uniformes_estoque
      ORDER BY departamento ASC, tamanho ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar estoque de uniformes:', error);
    res.status(500).json({ error: 'Erro ao listar estoque de uniformes.', details: error.message });
  }
}

// Lista histórico de movimentações (entradas e saídas)
export async function listMovimentacoes(req, res) {
  try {
    await ensureTablesExist();
    const [rows] = await pool.query(`
      SELECT * FROM uniformes_movimentacoes
      ORDER BY created_at DESC
      LIMIT 500
    `);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar movimentações de uniformes:', error);
    res.status(500).json({ error: 'Erro ao listar movimentações.', details: error.message });
  }
}

// Cadastrar Entrada de Uniforme (Novo ou Usado)
export async function cadastrarEntrada(req, res) {
  try {
    await ensureTablesExist();
    const {
      departamento,
      tamanho,
      quantidade,
      estado = 'Novo',
      fabricante = 'Jucicler',
      responsavel = 'Operador',
      observacoes = '',
    } = req.body || {};

    if (!departamento || !tamanho || !quantidade || Number(quantidade) <= 0) {
      return res.status(400).json({ error: 'Departamento, tamanho e quantidade válida são obrigatórios.' });
    }

    const qtd = parseInt(quantidade, 10);
    const estadoUniforme = String(estado).toLowerCase() === 'usado' ? 'Usado' : 'Novo';
    const fab = fabricante || 'Jucicler';
    const resp = responsavel || 'Operador';

    // 1. Registra a movimentação de Entrada
    const [movResult] = await pool.query(
      `INSERT INTO uniformes_movimentacoes 
        (tipo, departamento, tamanho, quantidade, estado, fabricante, responsavel, motivo, observacoes)
       VALUES ('ENTRADA', ?, ?, ?, ?, ?, ?, 'Entrada de Estoque', ?)`,
      [departamento, tamanho, qtd, estadoUniforme, fab, resp, observacoes]
    );

    // 2. Atualiza ou insere no estoque consolidado
    const isNovo = estadoUniforme === 'Novo';
    const sqlEstoque = `
      INSERT INTO uniformes_estoque 
        (departamento, tamanho, estado_novo_qtd, estado_usado_qtd, total_qtd, fabricante_principal)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        estado_novo_qtd = estado_novo_qtd + VALUES(estado_novo_qtd),
        estado_usado_qtd = estado_usado_qtd + VALUES(estado_usado_qtd),
        total_qtd = total_qtd + VALUES(total_qtd),
        fabricante_principal = VALUES(fabricante_principal)
    `;

    const novoQtd = isNovo ? qtd : 0;
    const usadoQtd = isNovo ? 0 : qtd;

    await pool.query(sqlEstoque, [
      departamento,
      tamanho,
      novoQtd,
      usadoQtd,
      qtd,
      fab,
    ]);

    res.status(201).json({
      success: true,
      message: 'Entrada de uniforme cadastrada com sucesso!',
      movimentacaoId: movResult.insertId,
    });
  } catch (error) {
    console.error('Erro ao cadastrar entrada de uniforme:', error);
    res.status(500).json({ error: 'Erro ao cadastrar entrada de uniforme.', details: error.message });
  }
}

// Cadastrar Saída / Entrega de Uniforme
export async function cadastrarSaida(req, res) {
  try {
    await ensureTablesExist();
    const {
      departamento,
      tamanho,
      quantidade,
      estado = 'Novo',
      colaborador = '',
      cpf = '',
      matricula = '',
      trocaDevolucao = false,
      responsavel = 'Operador',
      observacoes = '',
    } = req.body || {};

    if (!departamento || !tamanho || !quantidade || Number(quantidade) <= 0) {
      return res.status(400).json({ error: 'Departamento, tamanho e quantidade válida são obrigatórios.' });
    }

    const qtd = parseInt(quantidade, 10);
    const estadoUniforme = String(estado).toLowerCase() === 'usado' ? 'Usado' : 'Novo';
    const isNovo = estadoUniforme === 'Novo';

    // 1. Registra a movimentação de Saída
    const infoColaborador = [
      colaborador ? `Colaborador: ${colaborador}` : '',
      cpf ? `CPF: ${cpf}` : '',
      matricula ? `Matrícula: ${matricula}` : '',
      trocaDevolucao ? '[Troca c/ Devolução de Usado]' : '[Entrega Regular]',
    ].filter(Boolean).join(' • ');

    const motivoSaida = infoColaborador || 'Saída de Estoque';
    const obsFinal = observacoes ? `${observacoes} | ${infoColaborador}` : infoColaborador;

    const [movResult] = await pool.query(
      `INSERT INTO uniformes_movimentacoes 
        (tipo, departamento, tamanho, quantidade, estado, responsavel, motivo, observacoes)
       VALUES ('SAIDA', ?, ?, ?, ?, ?, ?, ?)`,
      [departamento, tamanho, qtd, estadoUniforme, responsavel || 'Operador', motivoSaida, obsFinal]
    );

    // 2. Subtrai do estoque
    const sqlSubtrai = isNovo
      ? `UPDATE uniformes_estoque 
         SET estado_novo_qtd = GREATEST(0, estado_novo_qtd - ?), 
             total_qtd = GREATEST(0, total_qtd - ?) 
         WHERE departamento = ? AND tamanho = ?`
      : `UPDATE uniformes_estoque 
         SET estado_usado_qtd = GREATEST(0, estado_usado_qtd - ?), 
             total_qtd = GREATEST(0, total_qtd - ?) 
         WHERE departamento = ? AND tamanho = ?`;

    await pool.query(sqlSubtrai, [qtd, qtd, departamento, tamanho]);

    res.json({
      success: true,
      message: 'Saída de uniforme registrada com sucesso!',
      movimentacaoId: movResult.insertId,
    });
  } catch (error) {
    console.error('Erro ao cadastrar saída de uniforme:', error);
    res.status(500).json({ error: 'Erro ao cadastrar saída.', details: error.message });
  }
}

// Excluir ou Estornar Movimentação
export async function deleteMovimentacao(req, res) {
  try {
    await ensureTablesExist();
    const { id } = req.params;
    await pool.query('DELETE FROM uniformes_movimentacoes WHERE id = ?', [id]);
    res.json({ success: true, message: 'Movimentação removida.' });
  } catch (error) {
    console.error('Erro ao excluir movimentação:', error);
    res.status(500).json({ error: 'Erro ao excluir movimentação.' });
  }
}
