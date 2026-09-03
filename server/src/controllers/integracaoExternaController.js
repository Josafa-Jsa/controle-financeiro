// server/src/controllers/integracaoExternaController.js
import pool from '../config/db.js';

// Chave padrão ou configurável via variável de ambiente (.env)
const API_KEY_PADRAO = process.env.INTEGRACAO_API_KEY || 'bigmaster_jsa_api_secret_2026';

/**
 * Middleware de Autenticação para Sistemas Externos
 * Aceita autenticação via Header 'x-api-key', 'Authorization: Bearer <key>' ou query parameter '?api_key=<key>'
 */
export function autenticarIntegracao(req, res, next) {
  const apiKey =
    req.headers['x-api-key'] ||
    req.headers['x-token'] ||
    (req.headers['authorization'] && req.headers['authorization'].replace(/^Bearer\s+/i, '')) ||
    req.query.api_key;

  if (!apiKey || (apiKey !== API_KEY_PADRAO && apiKey !== process.env.API_KEY)) {
    return res.status(401).json({
      sucesso: false,
      codigo: 'NAO_AUTORIZADO',
      erro: 'Acesso não autorizado. Envie a chave de integração no cabeçalho "x-api-key" ou "Authorization: Bearer <token>".',
      dataHora: new Date().toISOString(),
    });
  }

  next();
}

/**
 * GET /api/v1/integracao/info
 * Metadados, versão e documentação rápida dos endpoints disponíveis
 */
export async function getInfoIntegracao(req, res) {
  res.json({
    sistema: 'Big Master Supermercados & JSA TI',
    versao: '1.0.0',
    status: 'ONLINE',
    dataHoraServidor: new Date().toISOString(),
    modulosDisponiveis: ['prevencao', 'uniformes'],
    autenticacao: {
      tipo: 'API Key',
      headersAceitos: ['x-api-key', 'Authorization: Bearer <token>'],
    },
    endpoints: {
      uniformes: {
        listarEstoque: 'GET /api/v1/integracao/uniformes/estoque',
        listarMovimentacoes: 'GET /api/v1/integracao/uniformes/movimentacoes',
        registrarEntrada: 'POST /api/v1/integracao/uniformes/entrada',
        registrarEntrega: 'POST /api/v1/integracao/uniformes/entrega',
        registrarTransferencia: 'POST /api/v1/integracao/uniformes/transferencia',
        registrarBaixaDescarte: 'POST /api/v1/integracao/uniformes/descarte',
      },
      prevencao: {
        listarOcorrencias: 'GET /api/v1/integracao/prevencao/ocorrencias',
        obterOcorrenciaPorId: 'GET /api/v1/integracao/prevencao/ocorrencias/:id',
        criarOcorrencia: 'POST /api/v1/integracao/prevencao/ocorrencias',
        atualizarStatus: 'PUT /api/v1/integracao/prevencao/ocorrencias/:id/status',
        adicionarEventoCustodia: 'POST /api/v1/integracao/prevencao/ocorrencias/:id/custodia',
      },
    },
  });
}

/* =========================================================================
   =================== MÓDULO 1: UNIFORMES (INTEGRAÇÃO) ===================
   ========================================================================= */

/**
 * GET /api/v1/integracao/uniformes/estoque
 * Retorna o estoque consolidado de uniformes com filtros opcionais
 */
export async function getEstoqueUniformes(req, res) {
  try {
    const { departamento, tamanho } = req.query;
    let sql = `SELECT * FROM uniformes_estoque WHERE 1=1`;
    const params = [];

    if (departamento) {
      sql += ` AND departamento = ?`;
      params.push(departamento);
    }
    if (tamanho) {
      sql += ` AND tamanho = ?`;
      params.push(tamanho);
    }

    sql += ` ORDER BY departamento ASC, tamanho ASC`;

    const [rows] = await pool.query(sql, params);

    const totalNovos = rows.reduce((acc, i) => acc + (Number(i.estado_novo_qtd) || 0), 0);
    const totalUsados = rows.reduce((acc, i) => acc + (Number(i.estado_usado_qtd) || 0), 0);
    const totalGeral = rows.reduce((acc, i) => acc + (Number(i.total_qtd) || 0), 0);

    res.json({
      sucesso: true,
      resumo: {
        totalItensCadastrados: rows.length,
        totalEstoqueNovos: totalNovos,
        totalEstoqueUsados: totalUsados,
        totalEstoqueGeral: totalGeral,
      },
      itens: rows,
    });
  } catch (error) {
    console.error('[API Integração Uniformes] Erro ao buscar estoque:', error);
    res.status(500).json({ sucesso: false, erro: 'Erro interno ao consultar estoque de uniformes.', detalhes: error.message });
  }
}

/**
 * GET /api/v1/integracao/uniformes/movimentacoes
 * Retorna o histórico de movimentações (entradas, entregas, descartes, transferências)
 */
export async function getMovimentacoesUniformes(req, res) {
  try {
    const { tipo, departamento, limite = 100 } = req.query;
    let sql = `SELECT * FROM uniformes_movimentacoes WHERE 1=1`;
    const params = [];

    if (tipo) {
      sql += ` AND tipo = ?`;
      params.push(String(tipo).toUpperCase());
    }
    if (departamento) {
      sql += ` AND departamento = ?`;
      params.push(departamento);
    }

    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(parseInt(limite, 10) || 100);

    const [rows] = await pool.query(sql, params);

    res.json({
      sucesso: true,
      totalRegistros: rows.length,
      movimentacoes: rows,
    });
  } catch (error) {
    console.error('[API Integração Uniformes] Erro ao buscar movimentações:', error);
    res.status(500).json({ sucesso: false, erro: 'Erro ao buscar movimentações de uniformes.', detalhes: error.message });
  }
}

/**
 * POST /api/v1/integracao/uniformes/entrada
 * Registra entrada de lote de uniformes
 */
export async function registrarEntradaUniforme(req, res) {
  const connection = await pool.getConnection();
  try {
    const { departamento, tamanho, quantidade, estado = 'Novo', fabricante = 'Jucicler', responsavel = 'Integração Externa / ERP', observacoes = '' } = req.body;

    const qtd = parseInt(quantidade, 10);
    if (!departamento || !tamanho || !qtd || qtd <= 0) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Campos obrigatórios inválidos: "departamento", "tamanho" e "quantidade" (maior que 0) são necessários.',
      });
    }

    await connection.beginTransaction();

    const isNovo = estado.toLowerCase() === 'novo';
    const campoQtd = isNovo ? 'estado_novo_qtd' : 'estado_usado_qtd';

    // 1. Atualiza ou insere saldo consolidado
    await connection.query(`
      INSERT INTO uniformes_estoque (departamento, tamanho, ${campoQtd}, total_qtd, fabricante_principal)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        ${campoQtd} = ${campoQtd} + VALUES(${campoQtd}),
        total_qtd = estado_novo_qtd + estado_usado_qtd,
        fabricante_principal = VALUES(fabricante_principal)
    `, [departamento, tamanho, qtd, qtd, fabricante]);

    // 2. Registra na tabela de movimentações
    const [result] = await connection.query(`
      INSERT INTO uniformes_movimentacoes (tipo, departamento, tamanho, quantidade, estado, fabricante, responsavel, motivo, observacoes)
      VALUES ('ENTRADA', ?, ?, ?, ?, ?, ?, 'Entrada via Integração API Externa', ?)
    `, [departamento, tamanho, qtd, isNovo ? 'Novo' : 'Usado', fabricante, responsavel, observacoes]);

    await connection.commit();

    res.status(201).json({
      sucesso: true,
      mensagem: `Entrada de ${qtd} un para ${departamento} (Tam: ${tamanho}) registrada com sucesso.`,
      movimentacaoId: result.insertId,
    });
  } catch (error) {
    await connection.rollback();
    console.error('[API Integração Uniformes] Erro ao registrar entrada:', error);
    res.status(500).json({ sucesso: false, erro: 'Erro ao registrar entrada de uniforme.', detalhes: error.message });
  } finally {
    connection.release();
  }
}

/**
 * POST /api/v1/integracao/uniformes/entrega
 * Registra entrega / retirada de uniforme por colaborador
 */
export async function registrarEntregaUniforme(req, res) {
  const connection = await pool.getConnection();
  try {
    const {
      colaborador,
      cpf = '',
      matricula = '',
      departamento,
      tamanho,
      quantidade = 1,
      estado = 'Novo',
      responsavel = 'Integração RH / Externa',
      observacoes = '',
    } = req.body;

    const qtd = parseInt(quantidade, 10);
    if (!colaborador || !departamento || !tamanho || !qtd || qtd <= 0) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Campos obrigatórios: "colaborador", "departamento", "tamanho" e "quantidade" são necessários.',
      });
    }

    await connection.beginTransaction();

    const isNovo = estado.toLowerCase() === 'novo';
    const campoQtd = isNovo ? 'estado_novo_qtd' : 'estado_usado_qtd';

    // Abate do estoque (permite ficar negativo com log de alerta ou bloqueia)
    await connection.query(`
      UPDATE uniformes_estoque
      SET ${campoQtd} = GREATEST(0, ${campoQtd} - ?),
          total_qtd = estado_novo_qtd + estado_usado_qtd
      WHERE departamento = ? AND tamanho = ?
    `, [qtd, departamento, tamanho]);

    const obsCompleta = `Colaborador: ${colaborador}${cpf ? ` | CPF: ${cpf}` : ''}${matricula ? ` | Matrícula: ${matricula}` : ''}. ${observacoes}`;

    const [result] = await connection.query(`
      INSERT INTO uniformes_movimentacoes (tipo, departamento, tamanho, quantidade, estado, responsavel, motivo, observacoes)
      VALUES ('SAIDA', ?, ?, ?, ?, ?, 'Entrega a Colaborador (RH/API)', ?)
    `, [departamento, tamanho, qtd, isNovo ? 'Novo' : 'Usado', responsavel, obsCompleta]);

    await connection.commit();

    res.status(201).json({
      sucesso: true,
      mensagem: `Entrega de ${qtd} un para ${colaborador} (${departamento}) registrada com sucesso.`,
      movimentacaoId: result.insertId,
    });
  } catch (error) {
    await connection.rollback();
    console.error('[API Integração Uniformes] Erro ao registrar entrega:', error);
    res.status(500).json({ sucesso: false, erro: 'Erro ao registrar entrega de uniforme.', detalhes: error.message });
  } finally {
    connection.release();
  }
}

/**
 * POST /api/v1/integracao/uniformes/transferencia
 * Registra transferência / remessa em lote para filial
 */
export async function registrarTransferenciaFilial(req, res) {
  const connection = await pool.getConnection();
  try {
    const { filialDestino, enviadoPor = 'Logística Externa', quemIraReceber = '', motorista = '', itens = [], observacoes = '' } = req.body;

    if (!filialDestino || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Campos obrigatórios: "filialDestino" e array "itens" com ao menos 1 item contendo {departamento, tamanho, quantidade, estado}.',
      });
    }

    await connection.beginTransaction();

    let totalTransferido = 0;

    for (const item of itens) {
      const qtd = parseInt(item.quantidade, 10) || 0;
      if (qtd > 0 && item.departamento && item.tamanho) {
        const isNovo = (item.estado || 'Novo').toLowerCase() === 'novo';
        const campoQtd = isNovo ? 'estado_novo_qtd' : 'estado_usado_qtd';

        // Abate do estoque da matriz
        await connection.query(`
          UPDATE uniformes_estoque
          SET ${campoQtd} = GREATEST(0, ${campoQtd} - ?),
              total_qtd = estado_novo_qtd + estado_usado_qtd
          WHERE departamento = ? AND tamanho = ?
        `, [qtd, item.departamento, item.tamanho]);

        const obsItem = `Destino: ${filialDestino}${quemIraReceber ? ` | Destinatário: ${quemIraReceber}` : ''}${motorista ? ` | Motorista: ${motorista}` : ''}. ${observacoes}`;

        await connection.query(`
          INSERT INTO uniformes_movimentacoes (tipo, departamento, tamanho, quantidade, estado, responsavel, motivo, observacoes)
          VALUES ('TRANSFERENCIA', ?, ?, ?, ?, ?, ?, ?)
        `, [item.departamento, item.tamanho, qtd, isNovo ? 'Novo' : 'Usado', enviadoPor, `Transferência para ${filialDestino}`, obsItem]);

        totalTransferido += qtd;
      }
    }

    await connection.commit();

    res.status(201).json({
      sucesso: true,
      mensagem: `Transferência de ${totalTransferido} uniformes para ${filialDestino} registrada com sucesso.`,
      filialDestino,
      totalItens: itens.length,
      totalPecas: totalTransferido,
    });
  } catch (error) {
    await connection.rollback();
    console.error('[API Integração Uniformes] Erro ao registrar transferência:', error);
    res.status(500).json({ sucesso: false, erro: 'Erro ao registrar transferência.', detalhes: error.message });
  } finally {
    connection.release();
  }
}

/**
 * POST /api/v1/integracao/uniformes/descarte
 * Registra baixa / descarte / avaria de uniformes
 */
export async function registrarDescarteUniforme(req, res) {
  const connection = await pool.getConnection();
  try {
    const { departamento, tamanho, quantidade = 1, estado = 'Usado', motivo = 'Rasgado / Desgaste Natural', responsavel = 'Integração API', observacoes = '' } = req.body;

    const qtd = parseInt(quantidade, 10);
    if (!departamento || !tamanho || !qtd || qtd <= 0) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Campos obrigatórios: "departamento", "tamanho" e "quantidade" são necessários.',
      });
    }

    await connection.beginTransaction();

    const isNovo = estado.toLowerCase() === 'novo';
    const campoQtd = isNovo ? 'estado_novo_qtd' : 'estado_usado_qtd';

    // Abate do estoque
    await connection.query(`
      UPDATE uniformes_estoque
      SET ${campoQtd} = GREATEST(0, ${campoQtd} - ?),
          total_qtd = estado_novo_qtd + estado_usado_qtd
      WHERE departamento = ? AND tamanho = ?
    `, [qtd, departamento, tamanho]);

    const [result] = await connection.query(`
      INSERT INTO uniformes_movimentacoes (tipo, departamento, tamanho, quantidade, estado, responsavel, motivo, observacoes)
      VALUES ('SAIDA', ?, ?, ?, ?, ?, ?, ?)
    `, [departamento, tamanho, qtd, isNovo ? 'Novo' : 'Usado', responsavel, `Baixa / Descarte: ${motivo}`, observacoes]);

    await connection.commit();

    res.status(201).json({
      sucesso: true,
      mensagem: `Baixa de ${qtd} un de ${departamento} (Motivo: ${motivo}) registrada com sucesso.`,
      movimentacaoId: result.insertId,
    });
  } catch (error) {
    await connection.rollback();
    console.error('[API Integração Uniformes] Erro ao registrar descarte:', error);
    res.status(500).json({ sucesso: false, erro: 'Erro ao registrar descarte.', detalhes: error.message });
  } finally {
    connection.release();
  }
}

/* =========================================================================
   =================== MÓDULO 2: PREVENÇÃO DE PERDAS (API) ===================
   ========================================================================= */

/**
 * GET /api/v1/integracao/prevencao/ocorrencias
 * Retorna a listagem de ocorrências com paginação e filtros
 */
export async function getOcorrenciasPrevencao(req, res) {
  try {
    const { status, tipo, filial, dataInicio, dataFim, limite = 50, pagina = 1 } = req.query;
    let sql = `SELECT * FROM prevencao_ocorrencias WHERE 1=1`;
    const params = [];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (tipo) {
      sql += ` AND (tipo = ? OR nome = ?)`;
      params.push(tipo, tipo);
    }
    if (filial) {
      sql += ` AND filial = ?`;
      params.push(filial);
    }
    if (dataInicio) {
      sql += ` AND data_fato >= ?`;
      params.push(dataInicio);
    }
    if (dataFim) {
      sql += ` AND data_fato <= ?`;
      params.push(dataFim);
    }

    const offset = (parseInt(pagina, 10) - 1) * parseInt(limite, 10);
    sql += ` ORDER BY data_fato DESC, id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limite, 10), Math.max(0, offset));

    const [rows] = await pool.query(sql, params);

    // Formata campos JSON se armazenados como string
    const formatadas = rows.map((r) => ({
      ...r,
      pessoas: typeof r.pessoas === 'string' ? JSON.parse(r.pessoas || '[]') : (r.pessoas || []),
      produtos: typeof r.produtos === 'string' ? JSON.parse(r.produtos || '[]') : (r.produtos || []),
      evidencias: typeof r.evidencias === 'string' ? JSON.parse(r.evidencias || '[]') : (r.evidencias || []),
      custodia: typeof r.custodia === 'string' ? JSON.parse(r.custodia || '[]') : (r.custodia || []),
    }));

    res.json({
      sucesso: true,
      pagina: parseInt(pagina, 10),
      totalRetornado: formatadas.length,
      ocorrencias: formatadas,
    });
  } catch (error) {
    console.error('[API Integração Prevenção] Erro ao listar ocorrências:', error);
    res.status(500).json({ sucesso: false, erro: 'Erro ao consultar ocorrências da prevenção.', detalhes: error.message });
  }
}

/**
 * GET /api/v1/integracao/prevencao/ocorrencias/:id
 * Retorna detalhes completos de uma ocorrência específica
 */
export async function getOcorrenciaPorId(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`SELECT * FROM prevencao_ocorrencias WHERE id = ? OR numero = ?`, [id, id]);

    if (rows.length === 0) {
      return res.status(404).json({ sucesso: false, erro: `Ocorrência com identificador ${id} não encontrada.` });
    }

    const r = rows[0];
    const ocorrencia = {
      ...r,
      pessoas: typeof r.pessoas === 'string' ? JSON.parse(r.pessoas || '[]') : (r.pessoas || []),
      produtos: typeof r.produtos === 'string' ? JSON.parse(r.produtos || '[]') : (r.produtos || []),
      evidencias: typeof r.evidencias === 'string' ? JSON.parse(r.evidencias || '[]') : (r.evidencias || []),
      custodia: typeof r.custodia === 'string' ? JSON.parse(r.custodia || '[]') : (r.custodia || []),
    };

    res.json({ sucesso: true, ocorrencia });
  } catch (error) {
    console.error('[API Integração Prevenção] Erro ao obter ocorrência:', error);
    res.status(500).json({ sucesso: false, erro: 'Erro ao buscar dados da ocorrência.', detalhes: error.message });
  }
}

/**
 * POST /api/v1/integracao/prevencao/ocorrencias
 * Criação de nova ocorrência por sistema terceiro (ex: CFTV, Totem, App de Segurança)
 */
export async function criarOcorrenciaPrevencao(req, res) {
  try {
    const {
      tipo,
      nome,
      filial = 'Filial 1',
      data_fato = new Date().toISOString().split('T')[0],
      hora_fato = new Date().toTimeString().split(' ')[0].substring(0, 5),
      local_especifico = '',
      descricao = '',
      valor_estimado = 0,
      recuperado = false,
      status = 'Em Andamento',
      operador = 'Integração Externa',
      pessoas = [],
      produtos = [],
      evidencias = [],
    } = req.body;

    const tipoFinal = tipo || nome || 'Furto';
    const numeroGerado = `OC-${Date.now().toString().slice(-6)}`;

    const custodiaInicial = [
      {
        id: `cust_${Date.now()}`,
        data: new Date().toLocaleString('pt-BR'),
        acao: `Ocorrência registrada via Integração de API Externa por ${operador}`,
        usuario: operador,
      },
    ];

    const [result] = await pool.query(`
      INSERT INTO prevencao_ocorrencias (
        numero, tipo, nome, filial, data_fato, hora_fato, local_especifico,
        descricao, valor_estimado, recuperado, status, operador,
        pessoas, produtos, evidencias, custodia
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      numeroGerado,
      tipoFinal,
      tipoFinal,
      filial,
      data_fato,
      hora_fato,
      local_especifico,
      descricao,
      Number(valor_estimado) || 0,
      recuperado ? 1 : 0,
      status,
      operador,
      JSON.stringify(pessoas),
      JSON.stringify(produtos),
      JSON.stringify(evidencias),
      JSON.stringify(custodiaInicial),
    ]);

    res.status(201).json({
      sucesso: true,
      mensagem: 'Ocorrência de prevenção criada com sucesso via integração.',
      id: result.insertId,
      numero: numeroGerado,
    });
  } catch (error) {
    console.error('[API Integração Prevenção] Erro ao criar ocorrência:', error);
    res.status(500).json({ sucesso: false, erro: 'Erro ao criar ocorrência.', detalhes: error.message });
  }
}

/**
 * PUT /api/v1/integracao/prevencao/ocorrencias/:id/status
 * Atualização de status ou encerramento de ocorrência
 */
export async function atualizarStatusPrevencao(req, res) {
  try {
    const { id } = req.params;
    const { novoStatus, motivoEncerramento = '', operador = 'Integração Externa' } = req.body;

    if (!novoStatus) {
      return res.status(400).json({ sucesso: false, erro: 'Campo "novoStatus" é obrigatório.' });
    }

    const [rows] = await pool.query(`SELECT * FROM prevencao_ocorrencias WHERE id = ? OR numero = ?`, [id, id]);
    if (rows.length === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Ocorrência não encontrada.' });
    }

    const ocorrencia = rows[0];
    const custodiaAtual = typeof ocorrencia.custodia === 'string' ? JSON.parse(ocorrencia.custodia || '[]') : (ocorrencia.custodia || []);

    custodiaAtual.push({
      id: `cust_${Date.now()}`,
      data: new Date().toLocaleString('pt-BR'),
      acao: `Status alterado de "${ocorrencia.status}" para "${novoStatus}" via Integração API.${motivoEncerramento ? ` Motivo: ${motivoEncerramento}` : ''}`,
      usuario: operador,
    });

    await pool.query(`
      UPDATE prevencao_ocorrencias
      SET status = ?, custodia = ?
      WHERE id = ?
    `, [novoStatus, JSON.stringify(custodiaAtual), ocorrencia.id]);

    res.json({
      sucesso: true,
      mensagem: `Status da ocorrência ${ocorrencia.numero} atualizado para "${novoStatus}".`,
      id: ocorrencia.id,
      numero: ocorrencia.numero,
      status: novoStatus,
    });
  } catch (error) {
    console.error('[API Integração Prevenção] Erro ao atualizar status:', error);
    res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar status da ocorrência.', detalhes: error.message });
  }
}
