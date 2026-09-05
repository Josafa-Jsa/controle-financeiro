// server/src/controllers/systemStatusController.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../../data/system_status.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initial = {
      emManutencao: false,
      tela: '',
      mensagem: '',
      tipo: 'ajuste',
      updatedAt: new Date().toISOString(),
      updatedBy: 'Sistema',
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

async function ensureTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`system_status\` (
        \`id\` INT PRIMARY KEY AUTO_INCREMENT,
        \`em_manutencao\` TINYINT(1) NOT NULL DEFAULT 0,
        \`tela\` TEXT NULL,
        \`mensagem\` TEXT NULL,
        \`tipo\` VARCHAR(100) NULL DEFAULT 'ajuste',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`updated_by\` VARCHAR(255) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await pool.query('ALTER TABLE `system_status` MODIFY COLUMN `tela` TEXT NULL');
    } catch {}

    const [rows] = await pool.query('SELECT COUNT(*) as count FROM `system_status`');
    if (rows[0].count === 0) {
      await pool.query(
        'INSERT INTO `system_status` (em_manutencao, tela, mensagem, tipo, updated_by) VALUES (0, "", "", "ajuste", "Sistema")'
      );
    }
  } catch (err) {
    console.warn('[SystemStatus] Aviso ao verificar tabela MySQL:', err.message);
  }
}

// Inicializa tabela e arquivo
ensureDataFile();
ensureTable();

export async function getSystemStatus(req, res) {
  try {
    // Tenta obter do MySQL
    try {
      const [rows] = await pool.query('SELECT * FROM `system_status` ORDER BY id DESC LIMIT 1');
      if (rows && rows.length > 0) {
        const row = rows[0];
        return res.json({
          emManutencao: Boolean(row.em_manutencao),
          tela: row.tela || '',
          mensagem: row.mensagem || '',
          tipo: row.tipo || 'ajuste',
          updatedAt: row.updated_at,
          updatedBy: row.updated_by || 'Sistema',
        });
      }
    } catch {}

    // Fallback JSON
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return res.json(data);
  } catch (err) {
    console.error('Erro ao ler status do sistema:', err);
    return res.json({
      emManutencao: false,
      tela: '',
      mensagem: '',
      tipo: 'ajuste',
      updatedAt: new Date().toISOString(),
      updatedBy: 'Sistema',
    });
  }
}

export async function updateSystemStatus(req, res) {
  try {
    const { emManutencao, tela, mensagem, tipo, updatedBy } = req.body;

    const payload = {
      emManutencao: Boolean(emManutencao),
      tela: tela ? String(tela).trim() : '',
      mensagem: mensagem ? String(mensagem).trim() : '',
      tipo: tipo || 'ajuste',
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Administrador',
    };

    // Salva no JSON
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');

    // Salva no MySQL
    try {
      await pool.query(
        'UPDATE `system_status` SET em_manutencao = ?, tela = ?, mensagem = ?, tipo = ?, updated_by = ?, updated_at = NOW() WHERE id = 1',
        [payload.emManutencao ? 1 : 0, payload.tela, payload.mensagem, payload.tipo, payload.updatedBy]
      );
    } catch (dbErr) {
      console.warn('[SystemStatus DB UPDATE error]', dbErr.message);
    }

    return res.json({ ok: true, status: payload, message: 'Status do sistema atualizado com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar status do sistema:', err);
    return res.status(500).json({ error: 'Erro ao atualizar status do sistema.', details: err.message });
  }
}
