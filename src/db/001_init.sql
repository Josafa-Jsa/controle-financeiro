-- ==========================================================
-- JSA Gestão Financeira - Database Schema Migration
-- Criação automática do banco e de todas as tabelas e índices
-- ==========================================================

-- 1. Criação do Banco de Dados
CREATE DATABASE IF NOT EXISTS `jsa_app` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `jsa_app`;

-- 2. Tabela de Usuários (users)
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(190) NOT NULL,
  `surname` VARCHAR(190) NULL,
  `email` VARCHAR(190) NOT NULL UNIQUE,
  `password` VARCHAR(255) NULL,
  `password_hash` VARCHAR(255) NULL,
  `whatsapp` VARCHAR(40) NULL,
  `telefone` VARCHAR(40) NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'user',
  `filial` VARCHAR(100) NULL,
  `permissions` JSON NULL,
  `avatar` LONGTEXT NULL,
  `blocked` TINYINT(1) NOT NULL DEFAULT 0,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_filial` (`filial`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Contas a Pagar e a Receber (contas)
CREATE TABLE IF NOT EXISTS `contas` (
  `id` BIGINT NOT NULL,
  `tipo` VARCHAR(20) NOT NULL,
  `descricao` VARCHAR(255) NOT NULL,
  `observacao` TEXT NULL,
  `valor` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `vencimento` DATE NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Pendente',
  `data_pagamento` DATE NULL,
  `referencia_tipo` VARCHAR(60) NULL,
  `referencia_id` VARCHAR(64) NULL,
  `editada` TINYINT(1) NOT NULL DEFAULT 0,
  `exclusao_pendente` TINYINT(1) NOT NULL DEFAULT 0,
  `delete_request_id` VARCHAR(64) NULL,
  `motivo_exclusao` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_contas_tipo` (`tipo`),
  INDEX `idx_contas_status` (`status`),
  INDEX `idx_contas_vencimento` (`vencimento`),
  INDEX `idx_contas_referencia` (`referencia_tipo`, `referencia_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Baixas de Contas (contas_baixas)
CREATE TABLE IF NOT EXISTS `contas_baixas` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `conta_id` BIGINT NOT NULL,
  `valor` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `data` DATE NOT NULL,
  `obs` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_baixas_conta` (`conta_id`),
  INDEX `idx_baixas_data` (`data`),
  CONSTRAINT `fk_baixas_conta` FOREIGN KEY (`conta_id`) REFERENCES `contas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela de Notas Fiscais (notas)
CREATE TABLE IF NOT EXISTS `notas` (
  `id` BIGINT NOT NULL,
  `numero` VARCHAR(100) NULL,
  `tipo` VARCHAR(50) NOT NULL DEFAULT 'NFe',
  `chavedeacesso` VARCHAR(60) NULL,
  `cliente_ou_servico` VARCHAR(255) NULL,
  `origem` VARCHAR(255) NULL,
  `valor` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `data_emissao` DATE NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Adicionada',
  `motivo_cancelamento` TEXT NULL,
  `status_cancelamento` VARCHAR(50) NULL,
  `cancel_request_id` VARCHAR(64) NULL,
  `exclusao_pendente` TINYINT(1) NOT NULL DEFAULT 0,
  `delete_request_id` VARCHAR(64) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_notas_numero` (`numero`),
  INDEX `idx_notas_chave` (`chavedeacesso`),
  INDEX `idx_notas_data` (`data_emissao`),
  INDEX `idx_notas_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabela de Ordens de Serviço (ordens_servico)
CREATE TABLE IF NOT EXISTS `ordens_servico` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `numero_os` VARCHAR(64) NOT NULL UNIQUE,
  `cliente` JSON NULL,
  `equipamento` JSON NULL,
  `servicos` TEXT NULL,
  `pecas` TEXT NULL,
  `custos` VARCHAR(50) NULL,
  `prazo_inicio` DATE NULL,
  `prazo_fim` DATE NULL,
  `forma_pagamento` VARCHAR(100) NULL,
  `valor_pagamento` VARCHAR(50) NULL,
  `tecnico` VARCHAR(190) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Pendente',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_os_numero` (`numero_os`),
  INDEX `idx_os_status` (`status`),
  INDEX `idx_os_tecnico` (`tecnico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabela de Chamados / Atendimentos (chamados)
CREATE TABLE IF NOT EXISTS `chamados` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `protocolo` VARCHAR(64) NOT NULL UNIQUE,
  `cliente_nome` VARCHAR(190) NOT NULL,
  `cliente_email` VARCHAR(190) NULL,
  `cliente_whatsapp` VARCHAR(40) NULL,
  `assunto` VARCHAR(255) NOT NULL,
  `categoria` VARCHAR(100) NULL,
  `prioridade` VARCHAR(30) NOT NULL DEFAULT 'Media',
  `status` VARCHAR(40) NOT NULL DEFAULT 'Aberto',
  `mensagens` JSON NULL,
  `anexos` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_chamados_protocolo` (`protocolo`),
  INDEX `idx_chamados_status` (`status`),
  INDEX `idx_chamados_email` (`cliente_email`),
  INDEX `idx_chamados_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabela de Contratos e Internet (contratos)
CREATE TABLE IF NOT EXISTS `contratos` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `parceiro` VARCHAR(190) NULL,
  `descricao` VARCHAR(255) NULL,
  `tipo` VARCHAR(60) NOT NULL DEFAULT 'Geral',
  `valor` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `vencimento` DATE NULL,
  `dados` JSON NULL,
  `arquivo_nome` VARCHAR(255) NULL,
  `arquivo_base64` LONGTEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_contratos_parceiro` (`parceiro`),
  INDEX `idx_contratos_vencimento` (`vencimento`),
  INDEX `idx_contratos_tipo` (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabela de Produtos / Estoque (produtos)
CREATE TABLE IF NOT EXISTS `produtos` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(190) NOT NULL,
  `descricao` VARCHAR(255) NULL,
  `quantidade` INT NOT NULL DEFAULT 0,
  `valor_unitario` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `estoque_minimo` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_produtos_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tabela de Simulações de Taxas / Maquininha (simulacoes)
CREATE TABLE IF NOT EXISTS `simulacoes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `valor` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `juros` DECIMAL(6,3) NOT NULL DEFAULT 0.000,
  `parcelas` INT NOT NULL DEFAULT 1,
  `total` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `juros_total` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `data_ref` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_simulacoes_data` (`data_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Tabela de Logs e Auditoria do Sistema (app_logs)
CREATE TABLE IF NOT EXISTS `app_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(64) NULL,
  `type` VARCHAR(60) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `screen` VARCHAR(100) NULL,
  `details` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_logs_type` (`type`),
  INDEX `idx_logs_user` (`user_id`),
  INDEX `idx_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Tabela de Prevenção de Perdas e Roubos (prevencao)
CREATE TABLE IF NOT EXISTS `prevencao` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `numero` VARCHAR(64) NOT NULL UNIQUE,
  `nome` VARCHAR(255) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Em Aberto',
  `data` DATE NOT NULL,
  `hora_inicio` VARCHAR(10) NULL,
  `hora_termino` VARCHAR(10) NULL,
  `tipo` VARCHAR(100) NOT NULL DEFAULT 'Geral',
  `classificacao` VARCHAR(50) NOT NULL DEFAULT 'Média',
  `local` VARCHAR(255) NULL,
  `setor` VARCHAR(255) NULL,
  `descricao` TEXT NULL,
  `relato_fatos` LONGTEXT NULL,
  `medidas_adotadas` LONGTEXT NULL,
  `pessoas_envolvidas` JSON NULL,
  `pessoa_envolvida` JSON NULL,
  `produtos_envolvidos` JSON NULL,
  `valor_total_envolvido` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `abordagem` JSON NULL,
  `evidencias` JSON NULL,
  `responsaveis_registro` JSON NULL,
  `historico_custodia` JSON NULL,
  `user_id` BIGINT NULL,
  `user_email` VARCHAR(190) NULL,
  `user_login` VARCHAR(100) NULL,
  `registrado_por` VARCHAR(190) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_prevencao_numero` (`numero`),
  INDEX `idx_prevencao_status` (`status`),
  INDEX `idx_prevencao_data` (`data`),
  INDEX `idx_prevencao_user_id` (`user_id`),
  INDEX `idx_prevencao_email` (`user_email`),
  INDEX `idx_prevencao_login` (`user_login`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Tabela de Fornecedores Cadastrados (fornecedores)
CREATE TABLE IF NOT EXISTS `fornecedores` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `cnpj` VARCHAR(30) NOT NULL UNIQUE,
  `cnpj_raw` VARCHAR(20) NOT NULL UNIQUE,
  `nome` VARCHAR(255) NOT NULL,
  `razao_social` VARCHAR(255) NULL,
  `nome_fantasia` VARCHAR(255) NULL,
  `categoria` VARCHAR(150) NULL,
  `produto_relacionado` VARCHAR(255) NULL,
  `tipo_conta` VARCHAR(50) DEFAULT 'Pagar',
  `tipo` VARCHAR(50) DEFAULT 'NFe',
  `telefone` VARCHAR(50) NULL,
  `email` VARCHAR(190) NULL,
  `origem_padrao` VARCHAR(100) DEFAULT 'manual',
  `created_by` VARCHAR(190) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_fornecedores_cnpj` (`cnpj_raw`),
  INDEX `idx_fornecedores_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


