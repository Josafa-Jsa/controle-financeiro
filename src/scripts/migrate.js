/**
 * migrate.js
 * Executa a criação automática do banco de dados, de todas as tabelas,
 * colunas, índices e constraints do sistema JSA Gestão Financeira.
 *
 * Suporta execução via terminal:
 *   node src/scripts/migrate.js
 *   node src/scripts/migrate.js --seed ./data/export.json
 *
 * Ou via npm scripts:
 *   npm run db:migrate
 *   npm run db:seed
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis do arquivo .env na raiz do projeto
const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const MYSQL_HOST = process.env.MYSQL_HOST || process.env.DB_HOST || "127.0.0.1";
const MYSQL_PORT = Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || process.env.DB_USER || "root";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || "";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || process.env.DB_NAME || "jsa_app";

const SEED_PATH = process.argv.includes("--seed")
  ? process.argv[process.argv.indexOf("--seed") + 1]
  : null;

function chunk(arr, size = 500) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function toDateOnly(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

export const DDL_SCHEMA = `
-- 1. Criação do Banco de Dados
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE \`${MYSQL_DATABASE}\`;

-- 2. Tabela de Usuários (users)
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(190) NOT NULL,
  \`surname\` VARCHAR(190) NULL,
  \`email\` VARCHAR(190) NOT NULL UNIQUE,
  \`password\` VARCHAR(255) NULL,
  \`password_hash\` VARCHAR(255) NULL,
  \`whatsapp\` VARCHAR(40) NULL,
  \`telefone\` VARCHAR(40) NULL,
  \`role\` VARCHAR(50) NOT NULL DEFAULT 'user',
  \`permissions\` JSON NULL,
  \`avatar\` LONGTEXT NULL,
  \`blocked\` TINYINT(1) NOT NULL DEFAULT 0,
  \`must_change_password\` TINYINT(1) NOT NULL DEFAULT 0,
  \`is_online\` TINYINT(1) NOT NULL DEFAULT 0,
  \`last_login_at\` DATETIME NULL,
  \`last_seen_at\` DATETIME NULL,
  \`last_logout_at\` DATETIME NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_users_email\` (\`email\`),
  INDEX \`idx_users_role\` (\`role\`),
  INDEX \`idx_users_online\` (\`is_online\`, \`last_seen_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Contas a Pagar e a Receber (contas)
CREATE TABLE IF NOT EXISTS \`contas\` (
  \`id\` BIGINT NOT NULL,
  \`tipo\` VARCHAR(20) NOT NULL,
  \`descricao\` VARCHAR(255) NOT NULL,
  \`observacao\` TEXT NULL,
  \`valor\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`vencimento\` DATE NOT NULL,
  \`status\` VARCHAR(50) NOT NULL DEFAULT 'Pendente',
  \`data_pagamento\` DATE NULL,
  \`referencia_tipo\` VARCHAR(60) NULL,
  \`referencia_id\` VARCHAR(64) NULL,
  \`editada\` TINYINT(1) NOT NULL DEFAULT 0,
  \`exclusao_pendente\` TINYINT(1) NOT NULL DEFAULT 0,
  \`delete_request_id\` VARCHAR(64) NULL,
  \`motivo_exclusao\` TEXT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_contas_tipo\` (\`tipo\`),
  INDEX \`idx_contas_status\` (\`status\`),
  INDEX \`idx_contas_vencimento\` (\`vencimento\`),
  INDEX \`idx_contas_referencia\` (\`referencia_tipo\`, \`referencia_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Baixas de Contas (contas_baixas)
CREATE TABLE IF NOT EXISTS \`contas_baixas\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT,
  \`conta_id\` BIGINT NOT NULL,
  \`valor\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`data\` DATE NOT NULL,
  \`obs\` VARCHAR(255) NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_baixas_conta\` (\`conta_id\`),
  INDEX \`idx_baixas_data\` (\`data\`),
  CONSTRAINT \`fk_baixas_conta\` FOREIGN KEY (\`conta_id\`) REFERENCES \`contas\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela de Notas Fiscais (notas)
CREATE TABLE IF NOT EXISTS \`notas\` (
  \`id\` BIGINT NOT NULL,
  \`numero\` VARCHAR(100) NULL,
  \`tipo\` VARCHAR(50) NOT NULL DEFAULT 'NFe',
  \`chavedeacesso\` VARCHAR(60) NULL,
  \`cliente_ou_servico\` VARCHAR(255) NULL,
  \`origem\` VARCHAR(255) NULL,
  \`valor\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`data_emissao\` DATE NOT NULL,
  \`status\` VARCHAR(50) NOT NULL DEFAULT 'Adicionada',
  \`motivo_cancelamento\` TEXT NULL,
  \`status_cancelamento\` VARCHAR(50) NULL,
  \`cancel_request_id\` VARCHAR(64) NULL,
  \`exclusao_pendente\` TINYINT(1) NOT NULL DEFAULT 0,
  \`delete_request_id\` VARCHAR(64) NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_notas_numero\` (\`numero\`),
  INDEX \`idx_notas_chave\` (\`chavedeacesso\`),
  INDEX \`idx_notas_data\` (\`data_emissao\`),
  INDEX \`idx_notas_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabela de Ordens de Serviço (ordens_servico)
CREATE TABLE IF NOT EXISTS \`ordens_servico\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT,
  \`numero_os\` VARCHAR(64) NOT NULL UNIQUE,
  \`cliente\` JSON NULL,
  \`equipamento\` JSON NULL,
  \`servicos\` TEXT NULL,
  \`pecas\` TEXT NULL,
  \`custos\` VARCHAR(50) NULL,
  \`prazo_inicio\` DATE NULL,
  \`prazo_fim\` DATE NULL,
  \`forma_pagamento\` VARCHAR(100) NULL,
  \`valor_pagamento\` VARCHAR(50) NULL,
  \`tecnico\` VARCHAR(190) NULL,
  \`status\` VARCHAR(50) NOT NULL DEFAULT 'Pendente',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_os_numero\` (\`numero_os\`),
  INDEX \`idx_os_status\` (\`status\`),
  INDEX \`idx_os_tecnico\` (\`tecnico\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabela de Chamados / Atendimentos (chamados)
CREATE TABLE IF NOT EXISTS \`chamados\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT,
  \`protocolo\` VARCHAR(64) NOT NULL UNIQUE,
  \`cliente_nome\` VARCHAR(190) NOT NULL,
  \`cliente_email\` VARCHAR(190) NULL,
  \`cliente_whatsapp\` VARCHAR(40) NULL,
  \`assunto\` VARCHAR(255) NOT NULL,
  \`categoria\` VARCHAR(100) NULL,
  \`prioridade\` VARCHAR(30) NOT NULL DEFAULT 'Media',
  \`status\` VARCHAR(40) NOT NULL DEFAULT 'Aberto',
  \`mensagens\` JSON NULL,
  \`anexos\` JSON NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_chamados_protocolo\` (\`protocolo\`),
  INDEX \`idx_chamados_status\` (\`status\`),
  INDEX \`idx_chamados_email\` (\`cliente_email\`),
  INDEX \`idx_chamados_created\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabela de Contratos e Internet (contratos)
CREATE TABLE IF NOT EXISTS \`contratos\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT,
  \`parceiro\` VARCHAR(190) NULL,
  \`descricao\` VARCHAR(255) NULL,
  \`tipo\` VARCHAR(60) NOT NULL DEFAULT 'Geral',
  \`valor\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`vencimento\` DATE NULL,
  \`dados\` JSON NULL,
  \`arquivo_nome\` VARCHAR(255) NULL,
  \`arquivo_base64\` LONGTEXT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_contratos_parceiro\` (\`parceiro\`),
  INDEX \`idx_contratos_vencimento\` (\`vencimento\`),
  INDEX \`idx_contratos_tipo\` (\`tipo\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabela de Produtos / Estoque (produtos)
CREATE TABLE IF NOT EXISTS \`produtos\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT,
  \`nome\` VARCHAR(190) NOT NULL,
  \`descricao\` VARCHAR(255) NULL,
  \`quantidade\` INT NOT NULL DEFAULT 0,
  \`valor_unitario\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`estoque_minimo\` INT NOT NULL DEFAULT 0,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_produtos_nome\` (\`nome\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tabela de Simulações de Taxas / Maquininha (simulacoes)
CREATE TABLE IF NOT EXISTS \`simulacoes\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT,
  \`valor\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`juros\` DECIMAL(6,3) NOT NULL DEFAULT 0.000,
  \`parcelas\` INT NOT NULL DEFAULT 1,
  \`total\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`juros_total\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`data_ref\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_simulacoes_data\` (\`data_ref\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Tabela de Logs e Auditoria do Sistema (app_logs)
CREATE TABLE IF NOT EXISTS \`app_logs\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT,
  \`user_id\` VARCHAR(64) NULL,
  \`type\` VARCHAR(60) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`screen\` VARCHAR(100) NULL,
  \`details\` JSON NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_logs_type\` (\`type\`),
  INDEX \`idx_logs_user\` (\`user_id\`),
  INDEX \`idx_logs_created\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Tabela de Fornecedores Cadastrados (fornecedores)
CREATE TABLE IF NOT EXISTS \`fornecedores\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT,
  \`cnpj\` VARCHAR(30) NOT NULL UNIQUE,
  \`cnpj_raw\` VARCHAR(20) NOT NULL UNIQUE,
  \`nome\` VARCHAR(255) NOT NULL,
  \`razao_social\` VARCHAR(255) NULL,
  \`nome_fantasia\` VARCHAR(255) NULL,
  \`categoria\` VARCHAR(150) NULL,
  \`produto_relacionado\` VARCHAR(255) NULL,
  \`tipo_conta\` VARCHAR(50) DEFAULT 'Pagar',
  \`tipo\` VARCHAR(50) DEFAULT 'NFe',
  \`telefone\` VARCHAR(50) NULL,
  \`email\` VARCHAR(190) NULL,
  \`origem_padrao\` VARCHAR(100) DEFAULT 'manual',
  \`created_by\` VARCHAR(190) NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_fornecedores_cnpj\` (\`cnpj_raw\`),
  INDEX \`idx_fornecedores_nome\` (\`nome\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export async function runMigration(options = {}) {
  const seedFile = options.seed || SEED_PATH;

  console.log("==================================================");
  console.log("🚀 [JSA Database Migration] Iniciando...");
  console.log(`📡 Host: ${MYSQL_HOST}:${MYSQL_PORT}`);
  console.log(`👤 Usuário: ${MYSQL_USER}`);
  console.log(`🗄️  Banco de Dados: ${MYSQL_DATABASE}`);
  console.log("==================================================");

  let conn;
  try {
    // 1) Conecta ao MySQL
    conn = await mysql.createConnection({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      port: MYSQL_PORT,
      multipleStatements: true,
      rowsAsArray: false,
    });

    console.log("✔ Conectado com sucesso ao servidor MySQL.");

    // 2) Executa o DDL completo (Criação de BD + 10 Tabelas + Índices + Chaves)
    const sqlFile = path.resolve(__dirname, "../db/001_init.sql");
    const sqlToRun = fs.existsSync(sqlFile)
      ? fs.readFileSync(sqlFile, "utf8")
      : DDL_SCHEMA;

    await conn.query(sqlToRun);
    await conn.changeUser({ database: MYSQL_DATABASE });
    console.log(`✔ Banco de dados '${MYSQL_DATABASE}' e todas as 10 tabelas criadas/atualizadas com sucesso!`);

    // 3) Criação Automática do Usuário Administrador Padrão (se não existir)
    const [existingAdmin] = await conn.query(
      `SELECT id FROM users WHERE email = 'jsa@jsa.com' LIMIT 1`
    );

    if (!existingAdmin || existingAdmin.length === 0) {
      await conn.query(
        `INSERT INTO users (name, surname, email, password, role, permissions, blocked, must_change_password)
         VALUES ('JSA', 'Admin', 'jsa@jsa.com', 'admin', 'admin', JSON_ARRAY('*'), 0, 0)`
      );
      console.log("✔ Usuário Administrador padrão (jsa@jsa.com) verificado/criado com sucesso!");
    }

    // 4) Seed opcional a partir de arquivo JSON
    if (seedFile && fs.existsSync(seedFile)) {
      console.log(`📥 Importando dados do arquivo de seed: ${seedFile}`);
      const raw = fs.readFileSync(seedFile, "utf8");
      const data = JSON.parse(raw);

      // USERS
      if (Array.isArray(data.users) && data.users.length) {
        const rows = data.users.map((u) => [
          u.id ?? null,
          String(u.name || "").trim() || "Usuário",
          u.surname ? String(u.surname).trim() : null,
          String(u.email || "").trim(),
          u.password || null,
          u.password_hash || null,
          u.whatsapp || null,
          u.telefone || null,
          u.role || "user",
          u.permissions ? JSON.stringify(u.permissions) : null,
          u.avatar || null,
          u.blocked ? 1 : 0,
          u.must_change_password ? 1 : 0,
          u.last_login_at ? new Date(u.last_login_at) : null,
        ]);

        for (const batch of chunk(rows, 500)) {
          await conn.query(
            `INSERT INTO users (id, name, surname, email, password, password_hash, whatsapp, telefone, role, permissions, avatar, blocked, must_change_password, last_login_at)
             VALUES ${batch.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",")}
             ON DUPLICATE KEY UPDATE
               name=VALUES(name), surname=VALUES(surname), role=VALUES(role), permissions=VALUES(permissions), last_login_at=VALUES(last_login_at)`,
            batch.flat()
          );
        }
        console.log(`✔ Users importados: ${rows.length}`);
      }

      // NOTAS
      if (Array.isArray(data.notas) && data.notas.length) {
        const rows = data.notas.map((n) => [
          n.id ?? null,
          n.numero ? String(n.numero) : null,
          String(n.tipo || "NFe"),
          n.chavedeacesso ? String(n.chavedeacesso).slice(0, 60) : null,
          n.clienteOuServico ? String(n.clienteOuServico).slice(0, 255) : null,
          n.origem ? String(n.origem).slice(0, 255) : null,
          Number(n.valor || 0),
          toDateOnly(n.dataEmissao) || toDateOnly(new Date()),
          String(n.status || "Adicionada"),
          n.motivoCancelamento || null,
          n.statusCancelamento || null,
          n.cancelRequestId || null,
          n.exclusaoPendente ? 1 : 0,
          n.deleteRequestId || null,
        ]);

        for (const batch of chunk(rows, 500)) {
          await conn.query(
            `INSERT INTO notas (id, numero, tipo, chavedeacesso, cliente_ou_servico, origem, valor, data_emissao, status,
                                motivo_cancelamento, status_cancelamento, cancel_request_id, exclusao_pendente, delete_request_id)
             VALUES ${batch.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",")}
             ON DUPLICATE KEY UPDATE
               numero=VALUES(numero),
               tipo=VALUES(tipo),
               chavedeacesso=VALUES(chavedeacesso),
               cliente_ou_servico=VALUES(cliente_ou_servico),
               origem=VALUES(origem),
               valor=VALUES(valor),
               data_emissao=VALUES(data_emissao),
               status=VALUES(status),
               motivo_cancelamento=VALUES(motivo_cancelamento),
               status_cancelamento=VALUES(status_cancelamento),
               cancel_request_id=VALUES(cancel_request_id),
               exclusao_pendente=VALUES(exclusao_pendente),
               delete_request_id=VALUES(delete_request_id)`,
            batch.flat()
          );
        }
        console.log(`✔ Notas importadas: ${rows.length}`);
      }

      // CONTAS + BAIXAS
      if (Array.isArray(data.contas) && data.contas.length) {
        let baixasToInsert = [];

        const rows = data.contas.map((c) => {
          const baixar = Array.isArray(c.baixas) ? c.baixas : [];
          baixar.forEach((b) => {
            baixasToInsert.push({
              conta_id: c.id,
              valor: Number(b.valor || 0),
              data: toDateOnly(b.data) || toDateOnly(new Date()),
              obs: b.obs ? String(b.obs).slice(0, 255) : null,
            });
          });

          return [
            c.id ?? null,
            String(c.tipo || "Receber"),
            c.descricao ? String(c.descricao).slice(0, 255) : "",
            c.observacao || null,
            Number(c.valor || 0),
            toDateOnly(c.vencimento) || toDateOnly(new Date()),
            String(c.status || "Pendente"),
            c.dataPagamento ? toDateOnly(c.dataPagamento) : null,
            c.referenciaTipo || null,
            c.referenciaId ? String(c.referenciaId) : null,
            c.editada ? 1 : 0,
            c.exclusaoPendente ? 1 : 0,
            c.deleteRequestId || null,
            c.motivoExclusao || null,
          ];
        });

        for (const batch of chunk(rows, 500)) {
          await conn.query(
            `INSERT INTO contas (id, tipo, descricao, observacao, valor, vencimento, status, data_pagamento, referencia_tipo, referencia_id, editada, exclusao_pendente, delete_request_id, motivo_exclusao)
             VALUES ${batch.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",")}
             ON DUPLICATE KEY UPDATE
               tipo=VALUES(tipo),
               descricao=VALUES(descricao),
               observacao=VALUES(observacao),
               valor=VALUES(valor),
               vencimento=VALUES(vencimento),
               status=VALUES(status),
               data_pagamento=VALUES(data_pagamento),
               referencia_tipo=VALUES(referencia_tipo),
               referencia_id=VALUES(referencia_id),
               editada=VALUES(editada),
               exclusao_pendente=VALUES(exclusao_pendente),
               delete_request_id=VALUES(delete_request_id),
               motivo_exclusao=VALUES(motivo_exclusao)`,
            batch.flat()
          );
        }
        console.log(`✔ Contas importadas: ${rows.length}`);

        if (baixasToInsert.length) {
          const rowsB = baixasToInsert.map((b) => [
            b.conta_id ?? null,
            b.valor,
            b.data,
            b.obs,
          ]);

          for (const batch of chunk(rowsB, 500)) {
            await conn.query(
              `INSERT INTO contas_baixas (conta_id, valor, data, obs)
               VALUES ${batch.map(() => "(?,?,?,?)").join(",")}`,
              batch.flat()
            );
          }
          console.log(`✔ Baixas importadas: ${rowsB.length}`);
        }
      }

      // ORDENS DE SERVIÇO
      if (Array.isArray(data.ordens_servico || data.os) && (data.ordens_servico || data.os).length) {
        const osList = data.ordens_servico || data.os;
        const rows = osList.map((os) => [
          os.id ?? null,
          os.numeroOS || os.numero_os || `OS-${Date.now()}`,
          os.cliente ? JSON.stringify(os.cliente) : null,
          os.equipamento ? JSON.stringify(os.equipamento) : null,
          os.servicos || null,
          os.pecas || null,
          os.custos ? String(os.custos) : null,
          toDateOnly(os.prazoInicio || os.prazo_inicio),
          toDateOnly(os.prazoFim || os.prazo_fim),
          os.formaPagamento || os.forma_pagamento || null,
          os.valorPagamento ? String(os.valorPagamento) : null,
          os.tecnico || null,
          os.status || "Pendente",
        ]);

        for (const batch of chunk(rows, 500)) {
          await conn.query(
            `INSERT INTO ordens_servico (id, numero_os, cliente, equipamento, servicos, pecas, custos, prazo_inicio, prazo_fim, forma_pagamento, valor_pagamento, tecnico, status)
             VALUES ${batch.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",")}
             ON DUPLICATE KEY UPDATE
               cliente=VALUES(cliente),
               equipamento=VALUES(equipamento),
               servicos=VALUES(servicos),
               pecas=VALUES(pecas),
               custos=VALUES(custos),
               prazo_inicio=VALUES(prazo_inicio),
               prazo_fim=VALUES(prazo_fim),
               forma_pagamento=VALUES(forma_pagamento),
               valor_pagamento=VALUES(valor_pagamento),
               tecnico=VALUES(tecnico),
               status=VALUES(status)`,
            batch.flat()
          );
        }
        console.log(`✔ Ordens de Serviço importadas: ${rows.length}`);
      }

      // CHAMADOS
      if (Array.isArray(data.chamados) && data.chamados.length) {
        const rows = data.chamados.map((ch) => [
          ch.id ?? null,
          ch.protocolo || `CH-${Date.now()}`,
          ch.clienteNome || ch.cliente_nome || "Cliente",
          ch.clienteEmail || ch.cliente_email || null,
          ch.clienteWhatsapp || ch.cliente_whatsapp || null,
          ch.assunto || "Sem assunto",
          ch.categoria || null,
          ch.prioridade || "Media",
          ch.status || "Aberto",
          ch.mensagens ? JSON.stringify(ch.mensagens) : null,
          ch.anexos ? JSON.stringify(ch.anexos) : null,
        ]);

        for (const batch of chunk(rows, 500)) {
          await conn.query(
            `INSERT INTO chamados (id, protocolo, cliente_nome, cliente_email, cliente_whatsapp, assunto, categoria, prioridade, status, mensagens, anexos)
             VALUES ${batch.map(() => "(?,?,?,?,?,?,?,?,?,?,?)").join(",")}
             ON DUPLICATE KEY UPDATE
               cliente_nome=VALUES(cliente_nome),
               cliente_email=VALUES(cliente_email),
               cliente_whatsapp=VALUES(cliente_whatsapp),
               assunto=VALUES(assunto),
               categoria=VALUES(categoria),
               prioridade=VALUES(prioridade),
               status=VALUES(status),
               mensagens=VALUES(mensagens),
               anexos=VALUES(anexos)`,
            batch.flat()
          );
        }
        console.log(`✔ Chamados importados: ${rows.length}`);
      }

      // CONTRATOS
      if (Array.isArray(data.contratos) && data.contratos.length) {
        const rows = data.contratos.map((c) => [
          c.id ?? null,
          c.parceiro ? String(c.parceiro).slice(0, 190) : null,
          c.descricao ? String(c.descricao).slice(0, 255) : null,
          c.tipo || "Geral",
          Number(c.valor || 0),
          toDateOnly(c.vencimento),
          c.dados ? JSON.stringify(c.dados) : null,
          c.arquivoNome || null,
          c.arquivoBase64 || null,
        ]);

        for (const batch of chunk(rows, 500)) {
          await conn.query(
            `INSERT INTO contratos (id, parceiro, descricao, tipo, valor, vencimento, dados, arquivo_nome, arquivo_base64)
             VALUES ${batch.map(() => "(?,?,?,?,?,?,?,?,?)").join(",")}
             ON DUPLICATE KEY UPDATE
               parceiro=VALUES(parceiro),
               descricao=VALUES(descricao),
               tipo=VALUES(tipo),
               valor=VALUES(valor),
               vencimento=VALUES(vencimento),
               dados=VALUES(dados),
               arquivo_nome=VALUES(arquivo_nome),
               arquivo_base64=VALUES(arquivo_base64)`,
            batch.flat()
          );
        }
        console.log(`✔ Contratos importados: ${rows.length}`);
      }

      // PRODUTOS
      if (Array.isArray(data.produtos) && data.produtos.length) {
        const rows = data.produtos.map((p) => [
          p.id ?? null,
          String(p.nome || "").slice(0, 190),
          p.descricao ? String(p.descricao).slice(0, 255) : null,
          Number(p.quantidade || 0),
          Number(p.valorUnitario || p.valor_unitario || 0),
          Number(p.estoqueMinimo || p.estoque_minimo || 0),
        ]);

        for (const batch of chunk(rows, 500)) {
          await conn.query(
            `INSERT INTO produtos (id, nome, descricao, quantidade, valor_unitario, estoque_minimo)
             VALUES ${batch.map(() => "(?,?,?,?,?,?)").join(",")}
             ON DUPLICATE KEY UPDATE
               nome=VALUES(nome),
               descricao=VALUES(descricao),
               quantidade=VALUES(quantidade),
               valor_unitario=VALUES(valor_unitario),
               estoque_minimo=VALUES(estoque_minimo)`,
            batch.flat()
          );
        }
        console.log(`✔ Produtos importados: ${rows.length}`);
      }

      // SIMULAÇÕES
      if (Array.isArray(data.simulacoes) && data.simulacoes.length) {
        const rows = data.simulacoes.map((s) => [
          s.id ?? null,
          Number(s.valor || 0),
          Number(s.juros || 0),
          Number(s.parcelas || 0),
          Number(s.total || 0),
          Number(s.jurosTotal || s.juros_total || 0),
          s.data ? new Date(s.data) : new Date(),
        ]);

        for (const batch of chunk(rows, 500)) {
          await conn.query(
            `INSERT INTO simulacoes (id, valor, juros, parcelas, total, juros_total, data_ref)
             VALUES ${batch.map(() => "(?,?,?,?,?,?,?)").join(",")}
             ON DUPLICATE KEY UPDATE
               valor=VALUES(valor),
               juros=VALUES(juros),
               parcelas=VALUES(parcelas),
               total=VALUES(total),
               juros_total=VALUES(juros_total),
               data_ref=VALUES(data_ref)`,
            batch.flat()
          );
        }
        console.log(`✔ Simulações importadas: ${rows.length}`);
      }

      // LOGS
      if (Array.isArray(data.logs) && data.logs.length) {
        const rows = data.logs.map((l) => [
          l.id ?? null,
          l.user_id ? String(l.user_id) : null,
          String(l.type || "app").slice(0, 60),
          String(l.title || "Evento").slice(0, 255),
          l.screen ? String(l.screen).slice(0, 100) : null,
          l.details ? JSON.stringify(l.details) : null,
        ]);

        for (const batch of chunk(rows, 500)) {
          await conn.query(
            `INSERT INTO app_logs (id, user_id, type, title, screen, details)
             VALUES ${batch.map(() => "(?,?,?,?,?,?)").join(",")}`,
            batch.flat()
          );
        }
        console.log(`✔ Logs importados: ${rows.length}`);
      }
    }

    console.log("==================================================");
    console.log("✅ [JSA Database Migration] Concluído com sucesso!");
    console.log("==================================================");
  } catch (e) {
    console.error("❌ [JSA Database Migration] Erro na migração:", e);
    throw e;
  } finally {
    if (conn) await conn.end();
  }
}

// Se executado diretamente via terminal (`node src/scripts/migrate.js`)
if (process.argv[1] && process.argv[1].endsWith("migrate.js")) {
  runMigration().catch(() => {
    process.exit(1);
  });
}
