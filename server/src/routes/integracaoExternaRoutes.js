// server/src/routes/integracaoExternaRoutes.js
import { Router } from 'express';
import * as integracaoCtrl from '../controllers/integracaoExternaController.js';

const router = Router();

// Rota pública de metadados e documentação dos endpoints
router.get('/info', integracaoCtrl.getInfoIntegracao);
router.get('/docs', integracaoCtrl.getInfoIntegracao);

// Todas as rotas abaixo passam obrigatoriamente pela autenticação de API Key
router.use(integracaoCtrl.autenticarIntegracao);

/* =========================================================================
   =================== ROTAS DE INTEGRAÇÃO: UNIFORMES ===================
   ========================================================================= */
// Consultar estoque consolidado de uniformes (filtro opcional por departamento e tamanho)
router.get('/uniformes/estoque', integracaoCtrl.getEstoqueUniformes);

// Consultar histórico de movimentações de uniformes
router.get('/uniformes/movimentacoes', integracaoCtrl.getMovimentacoesUniformes);

// Registrar entrada de lote de uniformes (Compras/Fornecedor)
router.post('/uniformes/entrada', integracaoCtrl.registrarEntradaUniforme);

// Registrar entrega de uniforme a colaborador (RH)
router.post('/uniformes/entrega', integracaoCtrl.registrarEntregaUniforme);

// Registrar transferência de lote de uniformes para filial (Logística)
router.post('/uniformes/transferencia', integracaoCtrl.registrarTransferenciaFilial);

// Registrar saída por descarte, avaria ou baixa de uniformes
router.post('/uniformes/descarte', integracaoCtrl.registrarDescarteUniforme);

/* =========================================================================
   ============== ROTAS DE INTEGRAÇÃO: PREVENÇÃO DE PERDAS ================
   ========================================================================= */
// Consultar listagem de ocorrências
router.get('/prevencao/ocorrencias', integracaoCtrl.getOcorrenciasPrevencao);

// Obter detalhes de ocorrência específica por ID ou Número (ex: OC-123456)
router.get('/prevencao/ocorrencias/:id', integracaoCtrl.getOcorrenciaPorId);

// Criar nova ocorrência (vinda de sistemas externos, CFTV, totens ou portarias)
router.post('/prevencao/ocorrencias', integracaoCtrl.criarOcorrenciaPrevencao);

// Atualizar status / encerrar ocorrência
router.put('/prevencao/ocorrencias/:id/status', integracaoCtrl.atualizarStatusPrevencao);

export default router;
