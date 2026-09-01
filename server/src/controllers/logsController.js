import pool from '../config/db.js';

async function ensureLogsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        user_name VARCHAR(255) NULL,
        user_email VARCHAR(255) NULL,
        type VARCHAR(100) DEFAULT 'Sistema',
        title VARCHAR(255) NOT NULL,
        screen VARCHAR(100) NULL,
        details LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [cols] = await pool.query("SHOW COLUMNS FROM app_logs");
    const colNames = cols.map((c) => c.Field);
    if (!colNames.includes('user_name')) {
      await pool.query("ALTER TABLE app_logs ADD COLUMN user_name VARCHAR(255) NULL");
    }
    if (!colNames.includes('user_email')) {
      await pool.query("ALTER TABLE app_logs ADD COLUMN user_email VARCHAR(255) NULL");
    }
  } catch (err) {
    console.warn("Aviso ao inicializar tabela app_logs:", err.message);
  }
}

export async function listLogs(req, res) {
  try {
    await ensureLogsTable();
    const [rows] = await pool.query(`
      SELECT 
        l.id,
        l.user_id AS userId,
        COALESCE(l.user_name, u.name, 'Usuário do Sistema') AS userName,
        COALESCE(l.user_email, u.email, 'sem_email@sistema.com') AS userEmail,
        u.username AS userLogin,
        l.type,
        l.title,
        l.screen,
        l.details,
        l.created_at AS createdAt
      FROM app_logs l
      LEFT JOIN users u ON l.user_id = u.id OR (l.user_email IS NOT NULL AND LOWER(l.user_email) = LOWER(u.email))
      ORDER BY l.created_at DESC
      LIMIT 1000
    `);

    const logs = rows.map((l) => {
      let parsedDetails = l.details;
      if (typeof l.details === 'string') {
        try {
          parsedDetails = JSON.parse(l.details);
        } catch {
          parsedDetails = l.details;
        }
      }
      return {
        id: l.id,
        userId: l.userId,
        userName: l.userName,
        userEmail: l.userEmail,
        userLogin: l.userLogin,
        type: l.type || 'Sistema',
        title: l.title,
        screen: l.screen || 'Sistema',
        details: parsedDetails,
        ts: l.createdAt,
        formattedDate: new Date(l.createdAt).toLocaleString('pt-BR'),
        createdAt: l.createdAt,
      };
    });

    res.json(logs);
  } catch (error) {
    console.error('Erro ao listar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs.' });
  }
}

export async function createLog(req, res) {
  try {
    await ensureLogsTable();
    const { userId, userName, userEmail, type = 'Sistema', title, screen = 'Sistema', details } = req.body;
    if (!title) return res.status(400).json({ error: 'Título do log é obrigatório.' });

    const strDetails = typeof details === 'object' ? JSON.stringify(details) : (details ? String(details) : null);

    const [result] = await pool.query(
      `INSERT INTO app_logs (user_id, user_name, user_email, type, title, screen, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId || null, userName || null, userEmail || null, type, title, screen || null, strDetails]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error('Erro ao registrar log:', error);
    res.status(500).json({ error: 'Erro ao registrar log.' });
  }
}
