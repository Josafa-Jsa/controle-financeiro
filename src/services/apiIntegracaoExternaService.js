// src/services/apiIntegracaoExternaService.js
/**
 * SDK / Cliente de Integração Externa para Big Master (Prevenção de Perdas & Uniformes)
 * Este arquivo pode ser exportado e utilizado em qualquer aplicação JavaScript, Node.js ou Frontend
 * para interagir diretamente com a API do sistema Big Master / JSA.
 */

export class BigMasterIntegracaoClient {
  /**
   * @param {Object} config
   * @param {string} [config.baseURL] - URL base da API (ex: 'http://localhost:4000/api/v1/integracao' ou 'http://192.168.40.67:4000/api/v1/integracao')
   * @param {string} [config.apiKey] - Chave de autenticação (Header x-api-key)
   */
  constructor({ baseURL = 'http://localhost:4000/api/v1/integracao', apiKey = 'bigmaster_jsa_api_secret_2026' } = {}) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  /**
   * Método interno para realizar requisições HTTP
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.erro || data?.message || `Erro HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (err) {
      console.error(`[BigMaster SDK Error] ${options.method || 'GET'} ${url}:`, err);
      throw err;
    }
  }

  /* =========================================================================
     ==================== MÓDULO: UNIFORMES ==================================
     ========================================================================= */

  /**
   * Consulta o estoque consolidado de uniformes
   * @param {Object} [filtros]
   * @param {string} [filtros.departamento]
   * @param {string} [filtros.tamanho]
   */
  async obterEstoqueUniformes(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.departamento) params.append('departamento', filtros.departamento);
    if (filtros.tamanho) params.append('tamanho', filtros.tamanho);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/uniformes/estoque${qs}`, { method: 'GET' });
  }

  /**
   * Consulta histórico de movimentações de uniformes
   * @param {Object} [filtros]
   * @param {string} [filtros.tipo] - 'ENTRADA', 'SAIDA', 'TRANSFERENCIA'
   * @param {string} [filtros.departamento]
   * @param {number} [filtros.limite]
   */
  async obterMovimentacoesUniformes(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.tipo) params.append('tipo', filtros.tipo);
    if (filtros.departamento) params.append('departamento', filtros.departamento);
    if (filtros.limite) params.append('limite', filtros.limite);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/uniformes/movimentacoes${qs}`, { method: 'GET' });
  }

  /**
   * Registra entrada de novos uniformes no estoque
   * @param {Object} dados
   * @param {string} dados.departamento - Ex: 'Açougue', 'Padaria', 'Hortifruti'
   * @param {string} dados.tamanho - Ex: 'P', 'M', 'G', 'GG'
   * @param {number} dados.quantidade - Quantidade de peças
   * @param {string} [dados.estado='Novo'] - 'Novo' ou 'Usado'
   * @param {string} [dados.fabricante='Jucicler']
   * @param {string} [dados.responsavel]
   * @param {string} [dados.observacoes]
   */
  async registrarEntradaUniforme(dados) {
    return this.request('/uniformes/entrada', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  /**
   * Registra entrega de uniforme a colaborador (RH / Operação)
   * @param {Object} dados
   * @param {string} dados.colaborador - Nome completo
   * @param {string} [dados.cpf]
   * @param {string} [dados.matricula]
   * @param {string} dados.departamento
   * @param {string} dados.tamanho
   * @param {number} [dados.quantidade=1]
   * @param {string} [dados.estado='Novo']
   * @param {string} [dados.responsavel]
   * @param {string} [dados.observacoes]
   */
  async registrarEntregaUniforme(dados) {
    return this.request('/uniformes/entrega', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  /**
   * Registra transferência de uniformes em massa para filiais
   * @param {Object} dados
   * @param {string} dados.filialDestino - Ex: 'Filial 2', 'Filial 3', 'Filial 5'
   * @param {Array<{departamento: string, tamanho: string, quantidade: number, estado: string}>} dados.itens
   * @param {string} [dados.enviadoPor]
   * @param {string} [dados.quemIraReceber]
   * @param {string} [dados.motorista]
   * @param {string} [dados.observacoes]
   */
  async registrarTransferenciaFilial(dados) {
    return this.request('/uniformes/transferencia', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  /**
   * Registra baixa ou descarte de uniforme (avaria/rasgado/impróprio)
   * @param {Object} dados
   * @param {string} dados.departamento
   * @param {string} dados.tamanho
   * @param {number} [dados.quantidade=1]
   * @param {string} [dados.motivo] - 'Rasgado', 'Manchado', etc.
   * @param {string} [dados.responsavel]
   * @param {string} [dados.observacoes]
   */
  async registrarDescarteUniforme(dados) {
    return this.request('/uniformes/descarte', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  /* =========================================================================
     ==================== MÓDULO: PREVENÇÃO DE PERDAS ========================
     ========================================================================= */

  /**
   * Consulta ocorrências de prevenção com filtros
   * @param {Object} [filtros]
   * @param {string} [filtros.status] - 'Em Andamento', 'Encerrada', etc.
   * @param {string} [filtros.tipo] - 'Furto', 'Consumo no Local', 'Fraude', etc.
   * @param {string} [filtros.filial]
   * @param {string} [filtros.dataInicio] - 'YYYY-MM-DD'
   * @param {string} [filtros.dataFim] - 'YYYY-MM-DD'
   * @param {number} [filtros.limite=50]
   * @param {number} [filtros.pagina=1]
   */
  async obterOcorrenciasPrevencao(filtros = {}) {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, v);
    });
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/prevencao/ocorrencias${qs}`, { method: 'GET' });
  }

  /**
   * Obtém os detalhes completos de uma ocorrência por ID ou Número (ex: 'OC-123456')
   * @param {string|number} idOuNumero
   */
  async obterOcorrenciaPorId(idOuNumero) {
    return this.request(`/prevencao/ocorrencias/${idOuNumero}`, { method: 'GET' });
  }

  /**
   * Cria uma nova ocorrência vinda de sistema terceiro (ex: CFTV, Totem, App de Segurança)
   * @param {Object} dados
   * @param {string} dados.tipo - Ex: 'Furto', 'Consumo no Local', 'Fraude', 'Apropriação Indébita'
   * @param {string} dados.filial - Ex: 'Filial 1', 'Filial 2'
   * @param {string} [dados.data_fato] - 'YYYY-MM-DD'
   * @param {string} [dados.hora_fato] - 'HH:mm'
   * @param {string} [dados.local_especifico] - Ex: 'Corredor 4 - Bebidas'
   * @param {string} [dados.descricao]
   * @param {number} [dados.valor_estimado]
   * @param {boolean} [dados.recuperado]
   * @param {string} [dados.operador]
   * @param {Array<Object>} [dados.pessoas]
   * @param {Array<Object>} [dados.produtos]
   * @param {Array<Object>} [dados.evidencias]
   */
  async criarOcorrenciaPrevencao(dados) {
    return this.request('/prevencao/ocorrencias', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  /**
   * Atualiza status ou encerra uma ocorrência
   * @param {string|number} idOuNumero
   * @param {Object} dados
   * @param {string} dados.novoStatus - Ex: 'Encerrada', 'Em Análise', 'Encaminhada à Polícia'
   * @param {string} [dados.motivoEncerramento]
   * @param {string} [dados.operador]
   */
  async atualizarStatusPrevencao(idOuNumero, dados) {
    return this.request(`/prevencao/ocorrencias/${idOuNumero}/status`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  }
}

// Instância singleton padrão pronta para uso no próprio projeto
export const apiIntegracao = new BigMasterIntegracaoClient();
export default BigMasterIntegracaoClient;
