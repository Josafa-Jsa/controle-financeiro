import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import * as contasController from '../controllers/contasController.js';
import * as notasController from '../controllers/notasController.js';
import * as osController from '../controllers/osController.js';
import * as chamadosController from '../controllers/chamadosController.js';
import * as contratosController from '../controllers/contratosController.js';
import * as estoqueController from '../controllers/estoqueController.js';
import * as simuladorController from '../controllers/simuladorController.js';
import * as logsController from '../controllers/logsController.js';
import * as prevencaoController from '../controllers/prevencaoController.js';
import * as systemStatusController from '../controllers/systemStatusController.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'JSA Gestão Financeira API', timestamp: new Date().toISOString() });
});

// Autenticação & Usuários
router.post('/auth/login', authController.login);
router.post('/auth/heartbeat', authController.heartbeat);
router.post('/auth/logout', authController.logout);
router.post('/auth/disconnect-all', authController.disconnectAllUsers);
router.get('/users', authController.listUsers);
router.post('/users', authController.createUser);
router.put('/users/:id', authController.updateUser);
router.delete('/users/:id', authController.deleteUser);

// Contas a Pagar / Receber
router.get('/contas', contasController.listContas);
router.post('/contas', contasController.createConta);
router.put('/contas/:id', contasController.updateConta);
router.delete('/contas/:id', contasController.deleteConta);

// Notas Fiscais
router.get('/notas', notasController.listNotas);
router.post('/notas', notasController.createNota);
router.put('/notas/:id', notasController.updateNota);
router.delete('/notas/:id', notasController.deleteNota);

// Ordens de Serviço (O.S)
router.get('/os', osController.listOS);
router.post('/os', osController.createOS);
router.put('/os/:id', osController.updateOS);
router.delete('/os/:id', osController.deleteOS);

// Chamados / Atendimento
router.get('/chamados', chamadosController.listChamados);
router.post('/chamados', chamadosController.createChamado);
router.put('/chamados/:id', chamadosController.updateChamado);
router.delete('/chamados/:id', chamadosController.deleteChamado);

// Contratos
router.get('/contratos', contratosController.listContratos);
router.post('/contratos', contratosController.createContrato);
router.put('/contratos/:id', contratosController.updateContrato);
router.delete('/contratos/:id', contratosController.deleteContrato);

// Estoque / Produtos
router.get('/produtos', estoqueController.listProdutos);
router.post('/produtos', estoqueController.createProduto);
router.put('/produtos/:id', estoqueController.updateProduto);
router.delete('/produtos/:id', estoqueController.deleteProduto);

// Simulações
router.get('/simulacoes', simuladorController.listSimulacoes);
router.post('/simulacoes', simuladorController.createSimulacao);
router.put('/simulacoes/:id/status', simuladorController.updateSimulacaoStatus);
router.delete('/simulacoes/:id', simuladorController.deleteSimulacao);

// Logs do Sistema
router.get('/logs', logsController.listLogs);
router.post('/logs', logsController.createLog);

// Prevenção de Perdas e Roubos
router.get('/prevencao', prevencaoController.listPrevencao);
router.post('/prevencao', prevencaoController.createPrevencao);
router.put('/prevencao/:id', prevencaoController.updatePrevencao);
router.delete('/prevencao/:id', prevencaoController.deletePrevencao);

// Status do Sistema & Manutenção
router.get('/system-status', systemStatusController.getSystemStatus);
router.post('/system-status', systemStatusController.updateSystemStatus);

export default router;
