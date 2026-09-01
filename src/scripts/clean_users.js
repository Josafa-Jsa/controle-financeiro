import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

async function cleanUsers() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'jsa_app',
  });

  console.log('✔ Conectado ao MySQL.');
  
  // Apaga todos os usuários exceto jsa@jsa.com
  await conn.query(`DELETE FROM users WHERE LOWER(email) != 'jsa@jsa.com'`);
  
  // Garante que o jsa@jsa.com existe com senha admin e permissões totais
  const [existing] = await conn.query(`SELECT id FROM users WHERE LOWER(email) = 'jsa@jsa.com'`);
  if (!existing || existing.length === 0) {
    await conn.query(
      `INSERT INTO users (name, surname, email, password, role, permissions, blocked, must_change_password)
       VALUES ('JSA Admin', '', 'jsa@jsa.com', 'admin', 'admin', JSON_ARRAY('*'), 0, 0)`
    );
  } else {
    await conn.query(
      `UPDATE users SET name = 'JSA Admin', surname = NULL, password = 'admin', role = 'admin', permissions = JSON_ARRAY('*'), blocked = 0, must_change_password = 0 WHERE LOWER(email) = 'jsa@jsa.com'`
    );
  }

  const [users] = await conn.query(`SELECT id, name, email, role, password FROM users`);
  console.log('✅ Usuários no banco de dados agora:', users);
  await conn.end();
}

cleanUsers().catch(console.error);
