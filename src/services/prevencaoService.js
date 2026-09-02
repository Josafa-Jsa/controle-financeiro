// src/services/prevencaoService.js
import { getUser, isAdmin } from '../auth/auth';
import { api } from '../api/client';

const STORAGE_KEY = 'jsa_ocorrencias_prevencao';

function _resolveUser(provided = null) {
  const u = provided || getUser() || {};
  const email = (u.email || u.user_email || '').trim().toLowerCase();
  const rawName = (u.name || u.nome || '').trim();
  const rawSurname = (u.surname || u.sobrenome || '').trim();
  let fullName = [rawName, rawSurname].filter(Boolean).join(' ');
  if (!fullName || fullName.toLowerCase() === 'usuario') {
    fullName = email ? email.split('@')[0] : 'Operador';
  }

  let username = (u.username || u.user_login || '').trim();
  if (!username) {
    username = email ? email.split('@')[0] : 'operador';
  }

  const id = u.id || null;
  const isUserAdmin = isAdmin(u);

  return { id, email, username, name: fullName, isUserAdmin };
}

function sanitizeList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((oc) => {
    if (!oc || !Array.isArray(oc.evidencias)) return oc;
    const cleanEvs = oc.evidencias.map((ev) => {
      // Se arquivoUrl for um base64 gigantesco (> 500KB), remove o blob pesado para preservar a memória
      if (ev && typeof ev.arquivoUrl === 'string' && ev.arquivoUrl.length > 500_000) {
        return { ...ev, arquivoUrl: '' };
      }
      return ev;
    });
    return { ...oc, evidencias: cleanEvs };
  });
}

function safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return sanitizeList(parsed);
  } catch {
    return [];
  }
}

function safeWrite(list) {
  try {
    const sanitizada = sanitizeList(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizada));
  } catch (e) {
    console.warn('Erro ao salvar no storage:', e);
  }
}

function _checkPertenceAoUsuario(oc, u) {
  if (!oc || !u) return false;
  if (u.isUserAdmin) return true;

  const ocEmail = String(oc.userEmail || oc.user_email || '').trim().toLowerCase();
  const ocUser = String(oc.userLogin || oc.user_login || '').trim().toLowerCase();
  const ocId = oc.userId || oc.user_id ? String(oc.userId || oc.user_id) : null;
  const ocNome = String(oc.registradoPor || oc.registrado_por || oc.responsaveisRegistro?.emitidoPor?.nome || '').trim().toLowerCase();

  const uEmail = String(u.email || '').trim().toLowerCase();
  const uUser = String(u.username || '').trim().toLowerCase();
  const uId = u.id ? String(u.id) : null;
  const uNome = String(u.name || '').trim().toLowerCase();

  // 1. Match exato por Email, Login ou ID numérico
  if (uEmail && ocEmail && uEmail === ocEmail) return true;
  if (uUser && ocUser && uUser === ocUser) return true;
  if (uId && ocId && String(uId) === String(ocId)) return true;

  // 2. Match normalizado de login (sem caracteres especiais)
  const clean = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean(uUser) && clean(ocUser) && clean(uUser) === clean(ocUser)) return true;

  // 3. Match por nome completo ou primeiro nome
  if (uNome && ocNome) {
    if (ocNome === uNome || ocNome.includes(uNome) || uNome.includes(ocNome)) return true;
    const pU = uNome.split(' ')[0];
    const pOc = ocNome.split(' ')[0];
    if (pU && pOc && pU.length >= 3 && pU === pOc) return true;
  }

  return false;
}

// Sincroniza em segundo plano com o banco de dados MySQL
export async function sincronizarPrevencaoDoServidor(customUser = null) {
  const u = _resolveUser(customUser);
  try {
    const res = await api.get('/prevencao');
    if (Array.isArray(res.data)) {
      const serverList = res.data;
      const localList = safeRead();
      const map = new Map();

      // Prioriza os dados mais atualizados do MySQL
      serverList.forEach((s) => map.set(String(s.numero || s.id), s));
      // Preserva dados locais que ainda estão em criação
      localList.forEach((l) => {
        const key = String(l.numero || l.id);
        if (!map.has(key)) map.set(key, l);
      });

      const merged = Array.from(map.values());
      safeWrite(merged);
      return listarOcorrencias(customUser);
    }
  } catch (err) {
    console.warn('[Prevencao Sync] Servidor indisponível:', err.message);
  }
  return listarOcorrencias(customUser);
}

export function listarOcorrencias(customUser = null) {
  try {
    const u = _resolveUser(customUser);
    const list = safeRead();

    // ADMIN: Visualiza TODAS as ocorrências de todos os usuários
    if (u.isUserAdmin) {
      return list;
    }

    // USUÁRIO COMUM: Visualiza SOMENTE as ocorrências registradas por ele mesmo
    return list.filter((oc) => _checkPertenceAoUsuario(oc, u));
  } catch (e) {
    console.error('Erro ao listar ocorrências de prevenção:', e);
    return [];
  }
}

export function gerarProximoNumeroOcorrencia() {
  const lista = safeRead();
  const ano = new Date().getFullYear();
  const totalNoAno = lista.filter((o) => String(o.numero || '').includes(`OC-${ano}-`)).length + 1;
  const seq = String(totalNoAno).padStart(4, '0');
  return `OC-${ano}-${seq}`;
}

export async function salvarOcorrencia(ocorrencia, customUser = null) {
  try {
    const u = _resolveUser(customUser);
    const lista = safeRead();
    const numeroAuto = ocorrencia.numero || gerarProximoNumeroOcorrencia();
    const usuarioLogado = u.name || ocorrencia.registradoPor || 'Operador';
    const nowIso = new Date().toISOString();

    const nova = {
      id: ocorrencia.id || Date.now(),
      numero: numeroAuto,
      nome: ocorrencia.nome || ocorrencia.titulo || `Ocorrência - ${ocorrencia.tipo || 'Geral'}`,
      status: ocorrencia.status || 'Em Aberto',
      data: ocorrencia.data || nowIso.slice(0, 10),
      horaInicio: ocorrencia.horaInicio || new Date().toTimeString().slice(0, 5),
      horaTermino: ocorrencia.horaTermino || '',
      tipo: ocorrencia.tipo || 'Geral',
      classificacao: ocorrencia.classificacao || 'Média',
      local: ocorrencia.local || 'Loja Principal',
      setor: ocorrencia.setor || 'Geral',
      descricao: ocorrencia.descricao || '',
      relatoFatos: ocorrencia.relatoFatos || '',
      medidasAdotadas: ocorrencia.medidasAdotadas || '',
      pessoasEnvolvidas: ocorrencia.pessoasEnvolvidas || [],
      pessoaEnvolvida: ocorrencia.pessoaEnvolvida || (ocorrencia.pessoasEnvolvidas?.[0] || null),
      produtosEnvolvidos: ocorrencia.produtosEnvolvidos || [],
      valorTotalEnvolvido: Number(ocorrencia.valorTotalEnvolvido) || 0,
      abordagem: ocorrencia.abordagem || null,
      evidencias: ocorrencia.evidencias || [],
      responsaveisRegistro: ocorrencia.responsaveisRegistro || {
        emitidoPor: {
          nome: usuarioLogado,
          cargo: ocorrencia.cargo || 'Prevenção de Perdas',
          matricula: ocorrencia.matricula || '',
          dataHora: nowIso,
        },
        presenciou: { nome: '', cargo: '', matricula: '' },
        atendeu: { nome: '', cargo: '', matricula: '' },
        recebeu: { nome: '', cargo: '', dataHora: '' },
        analisou: { nome: '', parecer: '', dataHora: '' },
        autorizouEncerramento: { nome: '', cargo: '', despacho: '', dataHora: '' },
      },
      historicoCustodia: ocorrencia.historicoCustodia || [
        {
          id: Date.now(),
          dataHora: nowIso,
          usuario: usuarioLogado,
          acao: `${usuarioLogado} registrou a ocorrência ${numeroAuto} no sistema`,
          tipo: 'sistema',
        },
      ],
      userId: u.id,
      userEmail: u.email,
      userLogin: u.username,
      registradoPor: usuarioLogado,
      createdAt: nowIso,
    };

    lista.unshift(nova);
    safeWrite(lista);

    // Persiste no banco de dados MySQL via API
    try {
      api.post('/prevencao', nova).catch((err) => console.warn('[Prevencao API POST error]', err.message));
    } catch {}

    return nova;
  } catch (e) {
    console.error('Erro ao salvar ocorrência:', e);
    throw e;
  }
}

export function atualizarStatusOcorrencia(id, novoStatus, usuario = 'Operador') {
  try {
    const lista = safeRead();
    const idx = lista.findIndex((o) => String(o.id) === String(id) || o.numero === id);
    if (idx !== -1) {
      const oc = lista[idx];
      const nowIso = new Date().toISOString();
      const historico = Array.isArray(oc.historicoCustodia) ? [...oc.historicoCustodia] : [];

      historico.unshift({
        id: Date.now(),
        dataHora: nowIso,
        usuario,
        acao: `${usuario} alterou o status para "${novoStatus}"`,
        tipo: 'status',
      });

      lista[idx] = {
        ...oc,
        status: novoStatus,
        historicoCustodia: historico,
        updatedAt: nowIso,
      };
      safeWrite(lista);

      // Sincroniza com o MySQL
      try {
        api.put(`/prevencao/${oc.id || oc.numero}`, { status: novoStatus, historicoCustodia: historico }).catch(() => {});
      } catch {}

      return lista[idx];
    }
    return null;
  } catch (e) {
    console.error('Erro ao atualizar status da ocorrência:', e);
    throw e;
  }
}

export function salvarRelatoFatos(id, relatoFatos, medidasAdotadas = '', usuario = 'Operador') {
  try {
    const lista = safeRead();
    const idx = lista.findIndex((o) => String(o.id) === String(id) || o.numero === id);
    if (idx !== -1) {
      const oc = lista[idx];
      const nowIso = new Date().toISOString();
      const historico = Array.isArray(oc.historicoCustodia) ? [...oc.historicoCustodia] : [];

      historico.unshift({
        id: Date.now(),
        dataHora: nowIso,
        usuario,
        acao: `${usuario} registrou o relato factual dos acontecimentos`,
        tipo: 'relato',
      });

      lista[idx] = {
        ...oc,
        relatoFatos: relatoFatos || '',
        medidasAdotadas: medidasAdotadas || '',
        historicoCustodia: historico,
        relatadoEm: nowIso,
        updatedAt: nowIso,
      };
      safeWrite(lista);

      try {
        api.put(`/prevencao/${oc.id || oc.numero}`, lista[idx]).catch(() => {});
      } catch {}

      return lista[idx];
    }
    return null;
  } catch (e) {
    console.error('Erro ao salvar relato dos fatos:', e);
    throw e;
  }
}

export function salvarPessoasEnvolvidas(id, listaPessoas, usuario = 'Operador') {
  try {
    const lista = safeRead();
    const idx = lista.findIndex((o) => String(o.id) === String(id) || o.numero === id);
    if (idx !== -1) {
      const oc = lista[idx];
      const nowIso = new Date().toISOString();
      const historico = Array.isArray(oc.historicoCustodia) ? [...oc.historicoCustodia] : [];

      const pessoasFormatadas = Array.isArray(listaPessoas)
        ? listaPessoas.map((p, i) => ({
            id: p.id || Date.now() + i,
            nome: p.nome || '',
            documento: p.documento || '',
            sexo: p.sexo || 'Não informado',
            descricaoFisica: p.descricaoFisica || '',
            vestimenta: p.vestimenta || '',
            caracteristicas: p.caracteristicas || '',
            clienteIdentificado: p.clienteIdentificado ?? 'Não',
            funcionario: p.funcionario ?? 'Não',
            formaIdentificacao: p.formaIdentificacao || '',
            observacoes: p.observacoes || '',
          }))
        : [];

      historico.unshift({
        id: Date.now(),
        dataHora: nowIso,
        usuario,
        acao: `${usuario} atualizou o registro de pessoas envolvidas (${pessoasFormatadas.length} ${pessoasFormatadas.length === 1 ? 'pessoa' : 'pessoas'})`,
        tipo: 'pessoa',
      });

      lista[idx] = {
        ...oc,
        pessoasEnvolvidas: pessoasFormatadas,
        pessoaEnvolvida: pessoasFormatadas[0] || null,
        historicoCustodia: historico,
        updatedAt: nowIso,
      };
      safeWrite(lista);

      try {
        api.put(`/prevencao/${oc.id || oc.numero}`, lista[idx]).catch(() => {});
      } catch {}

      return lista[idx];
    }
    return null;
  } catch (e) {
    console.error('Erro ao salvar pessoas envolvidas:', e);
    throw e;
  }
}

export function salvarProdutosEnvolvidos(id, listaProdutos, usuario = 'Operador') {
  try {
    const lista = safeRead();
    const idx = lista.findIndex((o) => String(o.id) === String(id) || o.numero === id);
    if (idx !== -1) {
      const oc = lista[idx];
      const nowIso = new Date().toISOString();
      const historico = Array.isArray(oc.historicoCustodia) ? [...oc.historicoCustodia] : [];

      let valorTotal = 0;
      const produtosFormatados = Array.isArray(listaProdutos)
        ? listaProdutos.map((p, i) => {
            const qtd = Number(p.quantidade) || 1;
            const unit = Number(p.valorUnitario) || 0;
            const subtotal = Number(p.total) || qtd * unit;
            valorTotal += subtotal;

            return {
              id: p.id || Date.now() + i,
              produto: p.produto || '',
              codigo: p.codigo || '',
              quantidade: qtd,
              valorUnitario: unit,
              total: subtotal,
              recuperado: p.recuperado ?? 'Sim',
              avaria: p.avaria ?? 'Não',
              setor: p.setor || '',
            };
          })
        : [];

      historico.unshift({
        id: Date.now(),
        dataHora: nowIso,
        usuario,
        acao: `${usuario} atualizou a relação de produtos envolvidos (${produtosFormatados.length} itens - Total R$ ${valorTotal.toFixed(2)})`,
        tipo: 'produto',
      });

      lista[idx] = {
        ...oc,
        produtosEnvolvidos: produtosFormatados,
        valorTotalEnvolvido: valorTotal,
        historicoCustodia: historico,
        updatedAt: nowIso,
      };
      safeWrite(lista);

      try {
        api.put(`/prevencao/${oc.id || oc.numero}`, lista[idx]).catch(() => {});
      } catch {}

      return lista[idx];
    }
    return null;
  } catch (e) {
    console.error('Erro ao salvar produtos envolvidos:', e);
    throw e;
  }
}

export function salvarAbordagem(id, dadosAbordagem, usuario = 'Operador') {
  try {
    const lista = safeRead();
    const idx = lista.findIndex((o) => String(o.id) === String(id) || o.numero === id);
    if (idx !== -1) {
      const oc = lista[idx];
      const nowIso = new Date().toISOString();
      const historico = Array.isArray(oc.historicoCustodia) ? [...oc.historicoCustodia] : [];

      const abordagemFormatada = {
        houveAbordagem: dadosAbordagem.houveAbordagem || 'Sim',
        data: dadosAbordagem.data || nowIso.slice(0, 10),
        hora: dadosAbordagem.hora || '',
        local: dadosAbordagem.local || '',
        responsaveis: dadosAbordagem.responsaveis || '',
        comportamento: dadosAbordagem.comportamento || 'Pacífico / Cooperativo',
        recuperacaoMercadorias: dadosAbordagem.recuperacaoMercadorias || 'Sim - Total',
        acionamentoPolicial: dadosAbordagem.acionamentoPolicial || 'Não',
        numeroBoletim: dadosAbordagem.numeroBoletimCisc || dadosAbordagem.numeroBoletim || '',
        numeroBoletimCisc: dadosAbordagem.numeroBoletimCisc || dadosAbordagem.numeroBoletim || '',
        conducaoSalaReservada: dadosAbordagem.conducaoSalaReservada || 'Não',
        relatoAbordagem: dadosAbordagem.relatoAbordagem || '',
        boletimArquivo: dadosAbordagem.boletimArquivo || null,
        registradoEm: nowIso,
      };

      // Se houver arquivo do B.O. anexado, vincula também na lista de evidências
      let evidenciasAtualizadas = Array.isArray(oc.evidencias) ? [...oc.evidencias] : [];
      if (dadosAbordagem.boletimArquivo && dadosAbordagem.boletimArquivo.nome) {
        const jaExiste = evidenciasAtualizadas.some((e) => e.arquivoNome === dadosAbordagem.boletimArquivo.nome);
        if (!jaExiste) {
          evidenciasAtualizadas.unshift({
            id: Date.now(),
            numeroSequencial: `#${String(evidenciasAtualizadas.length + 1).padStart(3, '0')}`,
            tipo: 'Boletim de Ocorrência (B.O. CISC)',
            camera: 'Polícia Civil / CISC',
            local: dadosAbordagem.local || oc.local || 'Delegacia / Loja',
            data: dadosAbordagem.data || oc.data,
            horaInicio: dadosAbordagem.hora || '',
            horaFim: '',
            arquivoNome: dadosAbordagem.boletimArquivo.nome,
            tamanhoStr: dadosAbordagem.boletimArquivo.tamanhoStr || 'PDF/Img',
            arquivoUrl: dadosAbordagem.boletimArquivo.arquivoUrl || '',
            adicionadoPor: usuario,
            dataHoraUpload: nowIso,
            descricaoEvidencia: `Cópia do Boletim de Ocorrência nº ${dadosAbordagem.numeroBoletimCisc || dadosAbordagem.numeroBoletim || 'S/N'}`,
          });
        }
      }

      historico.unshift({
        id: Date.now(),
        dataHora: nowIso,
        usuario,
        acao: `${usuario} registrou o relatório de abordagem${dadosAbordagem.numeroBoletimCisc ? ` e B.O. CISC nº ${dadosAbordagem.numeroBoletimCisc}` : ''}`,
        tipo: 'abordagem',
      });

      lista[idx] = {
        ...oc,
        abordagem: abordagemFormatada,
        evidencias: evidenciasAtualizadas,
        historicoCustodia: historico,
        updatedAt: nowIso,
      };
      safeWrite(lista);

      try {
        api.put(`/prevencao/${oc.id || oc.numero}`, lista[idx]).catch(() => {});
      } catch {}

      return lista[idx];
    }
    return null;
  } catch (e) {
    console.error('Erro ao salvar abordagem:', e);
    throw e;
  }
}

export function salvarResponsaveisRegistro(id, dadosResponsaveis, usuario = 'Operador') {
  try {
    const lista = safeRead();
    const idx = lista.findIndex((o) => String(o.id) === String(id) || o.numero === id);
    if (idx !== -1) {
      const oc = lista[idx];
      const nowIso = new Date().toISOString();
      const historico = Array.isArray(oc.historicoCustodia) ? [...oc.historicoCustodia] : [];

      const emitidoPorNome = dadosResponsaveis.emitidoPor?.nome || usuario;
      const emitidoPorCargo = dadosResponsaveis.emitidoPor?.cargo || 'Prevenção de Perdas';

      historico.unshift({
        id: Date.now(),
        dataHora: nowIso,
        usuario,
        acao: `${usuario} atualizou a matriz de responsabilidades do registro`,
        tipo: 'responsavel',
      });

      lista[idx] = {
        ...oc,
        responsaveisRegistro: {
          emitidoPor: {
            nome: emitidoPorNome,
            cargo: emitidoPorCargo,
            matricula: dadosResponsaveis.emitidoPor?.matricula || '',
            dataHora: dadosResponsaveis.emitidoPor?.dataHora || nowIso,
          },
          presenciou: {
            nome: dadosResponsaveis.presenciou?.nome || '',
            cargo: dadosResponsaveis.presenciou?.cargo || '',
            matricula: dadosResponsaveis.presenciou?.matricula || '',
          },
          atendeu: {
            nome: dadosResponsaveis.atendeu?.nome || '',
            cargo: dadosResponsaveis.atendeu?.cargo || '',
            matricula: dadosResponsaveis.atendeu?.matricula || '',
          },
          recebeu: {
            nome: dadosResponsaveis.recebeu?.nome || '',
            cargo: dadosResponsaveis.recebeu?.cargo || '',
            dataHora: dadosResponsaveis.recebeu?.dataHora || '',
          },
          analisou: {
            nome: dadosResponsaveis.analisou?.nome || '',
            parecer: dadosResponsaveis.analisou?.parecer || '',
            dataHora: dadosResponsaveis.analisou?.dataHora || '',
          },
          autorizouEncerramento: {
            nome: dadosResponsaveis.autorizouEncerramento?.nome || '',
            cargo: dadosResponsaveis.autorizouEncerramento?.cargo || '',
            despacho: dadosResponsaveis.autorizouEncerramento?.despacho || '',
            dataHora: dadosResponsaveis.autorizouEncerramento?.dataHora || '',
          },
          atualizadoEm: nowIso,
        },
        historicoCustodia: historico,
        updatedAt: nowIso,
      };
      safeWrite(lista);

      try {
        api.put(`/prevencao/${oc.id || oc.numero}`, lista[idx]).catch(() => {});
      } catch {}

      return lista[idx];
    }
    return null;
  } catch (e) {
    console.error('Erro ao salvar responsáveis pelo registro:', e);
    throw e;
  }
}

export function salvarEvidencias(id, listaEvidencias, usuario = 'Operador') {
  try {
    const lista = safeRead();
    const idx = lista.findIndex((o) => String(o.id) === String(id) || o.numero === id);
    if (idx !== -1) {
      const oc = lista[idx];
      const nowIso = new Date().toISOString();
      const historico = Array.isArray(oc.historicoCustodia) ? [...oc.historicoCustodia] : [];

      const evidenciasFormatadas = Array.isArray(listaEvidencias)
        ? listaEvidencias.map((ev, i) => ({
            id: ev.id || Date.now() + i,
            numeroSequencial: ev.numeroSequencial || `#${String(i + 1).padStart(3, '0')}`,
            tipo: ev.tipo || 'Vídeo',
            camera: ev.camera || '',
            local: ev.local || '',
            data: ev.data || nowIso.slice(0, 10),
            horaInicio: ev.horaInicio || '',
            horaFim: ev.horaFim || '',
            arquivoNome: ev.arquivoNome || '',
            arquivoUrl: ev.arquivoUrl || '',
            adicionadoPor: ev.adicionadoPor || usuario,
            dataHoraUpload: ev.dataHoraUpload || nowIso,
            observacao: ev.observacao || '',
          }))
        : [];

      historico.unshift({
        id: Date.now(),
        dataHora: nowIso,
        usuario,
        acao: `${usuario} atualizou o acervo de evidências (${evidenciasFormatadas.length} itens)`,
        tipo: 'evidencia',
      });

      lista[idx] = {
        ...oc,
        evidencias: evidenciasFormatadas,
        historicoCustodia: historico,
        updatedAt: nowIso,
      };
      safeWrite(lista);

      try {
        api.put(`/prevencao/${oc.id || oc.numero}`, lista[idx]).catch(() => {});
      } catch {}

      return lista[idx];
    }
    return null;
  } catch (e) {
    console.error('Erro ao salvar evidências:', e);
    throw e;
  }
}

export function adicionarEventoCustodia(id, acao, usuario = 'Operador', tipo = 'custodia') {
  try {
    const lista = safeRead();
    const idx = lista.findIndex((o) => String(o.id) === String(id) || o.numero === id);
    if (idx !== -1) {
      const oc = lista[idx];
      const nowIso = new Date().toISOString();
      const historico = Array.isArray(oc.historicoCustodia) ? [...oc.historicoCustodia] : [];

      const novoEvento = {
        id: Date.now(),
        dataHora: nowIso,
        usuario,
        acao,
        tipo,
      };

      historico.unshift(novoEvento);

      lista[idx] = {
        ...oc,
        historicoCustodia: historico,
        updatedAt: nowIso,
      };
      safeWrite(lista);

      try {
        api.put(`/prevencao/${oc.id || oc.numero}`, { historicoCustodia: historico }).catch(() => {});
      } catch {}

      return lista[idx];
    }
    return null;
  } catch (e) {
    console.error('Erro ao adicionar evento de custódia:', e);
    throw e;
  }
}

export function registrarVisualizacaoCustodia(id, usuario = 'Operador') {
  return adicionarEventoCustodia(id, `${usuario} visualizou a ocorrência e cadeia de custódia`, usuario, 'visualizacao');
}

export function atualizarOcorrencia(ocorrencia) {
  try {
    const lista = safeRead();
    const idx = lista.findIndex((o) => String(o.id) === String(ocorrencia.id) || o.numero === ocorrencia.numero);
    if (idx !== -1) {
      lista[idx] = {
        ...lista[idx],
        ...ocorrencia,
        updatedAt: new Date().toISOString(),
      };
      safeWrite(lista);

      try {
        api.put(`/prevencao/${lista[idx].id || lista[idx].numero}`, lista[idx]).catch(() => {});
      } catch {}

      return lista[idx];
    }
    return null;
  } catch (e) {
    console.error('Erro ao atualizar ocorrência:', e);
    throw e;
  }
}

export async function encerrarOcorrenciaComBoletim({
  id,
  numeroBoletimCisc,
  orgaoPolicial = 'CISC / Polícia Civil',
  boletimArquivo,
  responsavelEncerramento = 'Gerente',
  parecerEncerramento = '',
}) {
  try {
    const lista = safeRead();
    const idx = lista.findIndex((o) => String(o.id) === String(id) || o.numero === id);
    if (idx === -1) return null;

    const oc = lista[idx];
    const nowIso = new Date().toISOString();
    const historico = Array.isArray(oc.historicoCustodia) ? [...oc.historicoCustodia] : [];

    const abordagemAtual = oc.abordagem || {};
    const abordagemAtualizada = {
      ...abordagemAtual,
      acionamentoPolicial: `Sim - ${orgaoPolicial}`,
      numeroBoletim: numeroBoletimCisc,
      numeroBoletimCisc,
      boletimArquivo,
      registradoEm: abordagemAtual.registradoEm || nowIso,
    };

    let evidenciasAtualizadas = Array.isArray(oc.evidencias) ? [...oc.evidencias] : [];
    if (boletimArquivo && boletimArquivo.nome) {
      const jaExiste = evidenciasAtualizadas.some((e) => e.arquivoNome === boletimArquivo.nome);
      if (!jaExiste) {
        evidenciasAtualizadas.unshift({
          id: Date.now(),
          numeroSequencial: `#${String(evidenciasAtualizadas.length + 1).padStart(3, '0')}`,
          tipo: 'Boletim de Ocorrência (B.O. CISC)',
          camera: orgaoPolicial,
          local: oc.local || 'CISC / Delegacia',
          data: nowIso.slice(0, 10),
          horaInicio: '',
          horaFim: '',
          arquivoNome: boletimArquivo.nome,
          tamanhoStr: boletimArquivo.tamanhoStr || 'PDF/Img',
          arquivoUrl: boletimArquivo.arquivoUrl || '',
          adicionadoPor: responsavelEncerramento,
          dataHoraUpload: nowIso,
          descricaoEvidencia: `Cópia do Boletim de Ocorrência CISC nº ${numeroBoletimCisc}`,
        });
      }
    }

    const resp = oc.responsaveisRegistro || {};
    const responsaveisAtualizados = {
      ...resp,
      autorizouEncerramento: {
        nome: responsavelEncerramento,
        cargo: 'Gerência Operacional / Auditoria',
        despacho: parecerEncerramento,
        dataHora: nowIso,
      },
    };

    historico.unshift({
      id: Date.now(),
      dataHora: nowIso,
      usuario: responsavelEncerramento,
      acao: `${responsavelEncerramento} encerrou a ocorrência formalmente com B.O. CISC nº ${numeroBoletimCisc}`,
      tipo: 'encerramento',
    });

    const atualizada = {
      ...oc,
      status: 'Finalizada',
      abordagem: abordagemAtualizada,
      evidencias: evidenciasAtualizadas,
      responsaveisRegistro: responsaveisAtualizados,
      parecerFinal: parecerEncerramento || oc.parecerFinal || '',
      historicoCustodia: historico,
      updatedAt: nowIso,
    };

    lista[idx] = atualizada;
    safeWrite(lista);

    try {
      await api.put(`/prevencao/${oc.id || oc.numero}`, atualizada);
    } catch (err) {
      console.warn('[Prevencao API PUT error]', err.message);
    }

    return atualizada;
  } catch (e) {
    console.error('Erro ao encerrar ocorrência com boletim:', e);
    throw e;
  }
}

export async function excluirOcorrencia(id) {
  try {
    const lista = safeRead();
    const filtrada = lista.filter((o) => String(o.id) !== String(id) && o.numero !== id);
    safeWrite(filtrada);

    // Emite evento em tempo real para sincronização entre abas e usuários
    try {
      localStorage.setItem('ocorrencia_excluida_evento', JSON.stringify({ id, timestamp: Date.now() }));
      window.dispatchEvent(new CustomEvent('ocorrencia_excluida_evento', { detail: { id } }));
    } catch {}

    try {
      await api.delete(`/prevencao/${id}`);
    } catch (err) {
      console.warn('[Prevencao API DELETE error]', err.message);
    }

    return true;
  } catch (e) {
    console.error('Erro ao excluir ocorrência:', e);
    return false;
  }
}
