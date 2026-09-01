# 🗄️ Guia de Criação e Configuração do Banco de Dados MySQL
## JSA Gestão Financeira

Este documento contém todos os comandos prontos para você executar no terminal e criar automaticamente o banco de dados `jsa_app` com **todas as 10 tabelas, colunas, índices e o usuário administrador padrão**.

---

## ⚡ Opção 1: Criação Automática via Terminal do Projeto (Recomendado)

Abra o terminal (PowerShell ou Prompt de Comando) na pasta do projeto e execute:

```bash
# 1. Executa o script de migração automatizado
npm run db:migrate
```

*Ou diretamente via Node.js:*
```bash
node src/scripts/migrate.js
```

> **O que este comando faz automaticamente:**
> 1. Conecta ao seu MySQL local (porta 3306).
> 2. Executa `CREATE DATABASE IF NOT EXISTS \`jsa_app\``.
> 3. Cria todas as 10 tabelas com seus tipos de dados e relacionamentos:
>    - `users` (Usuários, Senhas e Permissões)
>    - `contas` (Contas a Pagar e a Receber)
>    - `contas_baixas` (Baixas Parciais/Totais)
>    - `notas` (Notas Fiscais e Chaves de Acesso)
>    - `ordens_servico` (Ordens de Serviço O.S)
>    - `chamados` (Atendimentos e Tickets)
>    - `contratos` (Contratos e Internet)
>    - `produtos` (Estoque e Almoxarifado)
>    - `simulacoes` (Taxas e Maquininhas)
>    - `app_logs` (Auditoria e Logs de Sistema)
> 4. Cria o usuário administrador padrão:
>    - **E-mail:** `jsa@jsa.com`
>    - **Senha:** `admin`

---

## 💻 Opção 2: Executar Script em Lote (Windows 1-Clique)

Basta dar dois cliques no arquivo:
```
setup_database.bat
```
Ou no terminal:
```cmd
.\setup_database.bat
```

---

## 🛠️ Opção 3: Criação Manual via Terminal MySQL (MySQL CLI)

Caso queira criar o banco de dados diretamente pelo terminal do MySQL:

### 1. Conecte ao MySQL:
```bash
mysql -u root -p
```
*(Pressione Enter ou digite sua senha de root se houver)*

### 2. Cole os comandos SQL abaixo:

```sql
-- Criação do Banco de Dados
CREATE DATABASE IF NOT EXISTS `jsa_app` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `jsa_app`;

-- Importa o arquivo de schema oficial do projeto:
SOURCE src/db/001_init.sql;
```

---

## ⚙️ Configuração das Variáveis de Ambiente (.env)

Verifique se as seguintes variáveis estão presentes no arquivo `.env` da raiz do projeto:

```env
# Configurações do Banco de Dados MySQL
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=jsa_app
```

---

## 🚀 Como Iniciar o Back-end (API Node.js/Express)

Após criar o banco de dados, você pode iniciar o servidor backend:

```bash
# Iniciar o servidor backend na porta 3001
npm run server
```

E para rodar o frontend (Desktop 5173 + Mobile 2515) e o backend juntos:
```bash
npm run dev:full
```
