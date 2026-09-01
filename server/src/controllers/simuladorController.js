import pool from '../config/db.js';

async function ensureSimulacoesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS simulacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        user_email VARCHAR(255) NULL,
        user_name VARCHAR(255) NULL,
        user_login VARCHAR(255) NULL,
        valor DECIMAL(10,2) NOT NULL,
        juros DECIMAL(10,4) NOT NULL,
        parcelas INT NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        juros_total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDENTE',
        data_ref TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [cols] = await pool.query("SHOW COLUMNS FROM simulacoes");
    const colNames = cols.map((c) => c.Field);
    if (!colNames.includes('user_id')) {
      await pool.query("ALTER TABLE simulacoes ADD COLUMN user_id INT NULL");
    }
    if (!colNames.includes('user_email')) {
      await pool.query("ALTER TABLE simulacoes ADD COLUMN user_email VARCHAR(255) NULL");
    }
    if (!colNames.includes('user_name')) {
      await pool.query("ALTER TABLE simulacoes ADD COLUMN user_name VARCHAR(255) NULL");
    }
    if (!colNames.includes('user_login')) {
      await pool.query("ALTER TABLE simulacoes ADD COLUMN user_login VARCHAR(255) NULL");
    }
    if (!colNames.includes('status')) {
      await pool.query("ALTER TABLE simulacoes ADD COLUMN status VARCHAR(50) DEFAULT 'PENDENTE'");
    }
  } catch (err) {
    console.warn("Aviso ao inicializar tabela simulacoes:", err.message);
  }
}

export async function listSimulacoes(req, res) {
  try {
    await ensureSimulacoesTable();
    const userEmail = req.query?.email || req.headers['x-user-email'];
    const userId = req.query?.userId;
    const userLogin = req.query?.username;
    const isAdmin = String(req.query?.isAdmin || '').toLowerCase() === 'true' ||
                    String(userEmail || '').toLowerCase() === 'jsa@jsa.com' ||
                    String(userEmail || '').toLowerCase() === 'josafa.santos.jss@gmail.com';

    let query = `
      SELECT 
        s.*, 
        COALESCE(s.user_name, CONCAT_WS(' ', u.name, u.surname), u.name, SUBSTRING_INDEX(s.user_email, '@', 1), 'Operador') AS resolved_user_name,
        COALESCE(s.user_login, u.username, SUBSTRING_INDEX(s.user_email, '@', 1), 'operador') AS resolved_user_login
      FROM simulacoes s
      LEFT JOIN users u ON (s.user_id = u.id OR (s.user_email IS NOT NULL AND LOWER(s.user_email) = LOWER(u.email)))
    `;
    const params = [];

    // Se NÃO for admin, filtra estritamente as do próprio usuário
    if (!isAdmin && (userEmail || userId || userLogin)) {
      query += ' WHERE (LOWER(s.user_email) = LOWER(?) AND ? IS NOT NULL) OR (s.user_id = ? AND ? IS NOT NULL) OR (LOWER(s.user_login) = LOWER(?) AND ? IS NOT NULL) OR s.user_email IS NULL OR s.user_email = ""';
      params.push(
        userEmail || null, userEmail || null,
        userId || null, userId || null,
        userLogin || null, userLogin || null
      );
    }

    query += ' ORDER BY s.data_ref DESC LIMIT 300';

    const [rows] = await pool.query(query, params);
    const simulacoes = rows.map((s) => {
      const userName = (s.user_name && s.user_name !== 'Usuario' && s.user_name !== 'Operador')
        ? s.user_name
        : (s.resolved_user_name || 'Operador');
      const userLogin = (s.user_login && s.user_login !== 'usuario' && s.user_login !== 'operador')
        ? s.user_login
        : (s.resolved_user_login || 'operador');

      return {
        id: s.id,
        userId: s.user_id,
        userEmail: s.user_email,
        userName,
        userLogin,
        valor: Number(s.valor),
        juros: Number(s.juros),
        parcelas: s.parcelas,
        total: Number(s.total),
        jurosTotal: Number(s.juros_total),
        status: s.status || 'PENDENTE',
        data: s.data_ref ? new Date(s.data_ref).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'),
        createdAt: s.data_ref ? new Date(s.data_ref).toISOString() : new Date().toISOString(),
      };
    });
    res.json(simulacoes);
  } catch (error) {
    console.error('Erro ao listar simulações:', error);
    res.status(500).json({ error: 'Erro ao buscar simulações.' });
  }
}

export async function createSimulacao(req, res) {
  try {
    await ensureSimulacoesTable();
    const {
      valor = 0,
      juros = 0,
      parcelas = 1,
      total = 0,
      jurosTotal = 0,
      status = 'PENDENTE',
      userId = null,
      userEmail = null,
      userName = null,
      userLogin = null,
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO simulacoes (user_id, user_email, user_name, user_login, valor, juros, parcelas, total, juros_total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        userEmail || null,
        userName || null,
        userLogin || null,
        Number(valor) || 0,
        Number(juros) || 0,
        Number(parcelas) || 1,
        Number(total) || 0,
        Number(jurosTotal) || 0,
        status || 'PENDENTE',
      ]
    );

    res.status(201).json({ id: result.insertId, total, parcelas, userEmail, status });
  } catch (error) {
    console.error('Erro ao salvar simulação:', error);
    res.status(500).json({ error: 'Erro ao salvar simulação.' });
  }
}

export async function updateSimulacaoStatus(req, res) {
  try {
    await ensureSimulacoesTable();
    const { id } = req.params;
    const { status } = req.body;
    if (!id || !status) return res.status(400).json({ error: 'ID e status são obrigatórios.' });

    await pool.query('UPDATE simulacoes SET status = ? WHERE id = ?', [status, id]);
    res.json({ ok: true, id, status });
  } catch (error) {
    console.error('Erro ao atualizar status da simulação:', error);
    res.status(500).json({ error: 'Erro ao atualizar status da simulação.' });
  }
}

export async function deleteSimulacao(req, res) {
  try {
    await ensureSimulacoesTable();
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID da simulação é obrigatório.' });

    await pool.query('DELETE FROM simulacoes WHERE id = ?', [id]);
    res.json({ ok: true, deletedId: id });
  } catch (error) {
    console.error('Erro ao excluir simulação:', error);
    res.status(500).json({ error: 'Erro ao excluir simulação.' });
  }
}
