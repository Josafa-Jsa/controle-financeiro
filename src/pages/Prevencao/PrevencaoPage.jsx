// src/pages/Prevencao/PrevencaoPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  listarOcorrencias,
  sincronizarPrevencaoDoServidor,
  salvarOcorrencia,
  salvarRelatoFatos,
  salvarPessoasEnvolvidas,
  salvarProdutosEnvolvidos,
  salvarAbordagem,
  salvarResponsaveisRegistro,
  salvarEvidencias,
  adicionarEventoCustodia,
  registrarVisualizacaoCustodia,
  atualizarStatusOcorrencia,
  atualizarOcorrencia,
  excluirOcorrencia,
} from '../../services/prevencaoService';
import ModalOcorrencia, {
  TIPOS_OCORRENCIA,
  CLASSIFICACOES,
  STATUS_OCORRENCIA,
} from '../../components/Modais/ModalOcorrencia';
import ModalRelatoFatos from '../../components/Modais/ModalRelatoFatos';
import ModalPessoaEnvolvida from '../../components/Modais/ModalPessoaEnvolvida';
import ModalProdutosEnvolvidos from '../../components/Modais/ModalProdutosEnvolvidos';
import ModalAbordagem from '../../components/Modais/ModalAbordagem';
import ModalResponsaveisRegistro from '../../components/Modais/ModalResponsaveisRegistro';
import ModalRelatorioPrevencao from '../../components/Modais/ModalRelatorioPrevencao';
import ModalEvidencias from '../../components/Modais/ModalEvidencias';
import ModalExcluirOcorrencia from '../../components/Modais/ModalExcluirOcorrencia';
import { getUser, isAdmin } from '../../auth/auth';
import { logEvent } from '../../utils/logger';
import brasaoImg from '../../assets/big.jpg';
import './prevencao.css';

export default function PrevencaoPage() {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [modalRegistroAberto, setModalRegistroAberto] = useState(false);
  const [modalRelatoAberto, setModalRelatoAberto] = useState(false);
  const [modalPessoaAberto, setModalPessoaAberto] = useState(false);
  const [modalProdutosAberto, setModalProdutosAberto] = useState(false);
  const [modalAbordagemAberto, setModalAbordagemAberto] = useState(false);
  const [modalResponsaveisAberto, setModalResponsaveisAberto] = useState(false);
  const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);
  const [modalEvidenciasAberto, setModalEvidenciasAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [ocorrenciaSelecionada, setOcorrenciaSelecionada] = useState(null);
  const [ocorrenciaParaExcluir, setOcorrenciaParaExcluir] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroClassificacao, setFiltroClassificacao] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [visualizacao, setVisualizacao] = useState('containers'); // 'containers' ou 'tabela'
  const [modoVisual, setModoVisual] = useState('menu'); // 'menu' (painel nativo em grade) ou 'lista' (ocorrências)

  const usuario = getUser();
  const nomeOperador = usuario?.name || usuario?.nome || usuario?.email || 'Operador';
  const isUserAdmin = isAdmin(usuario);

  useEffect(() => {
    carregarOcorrencias();
  }, [usuario?.email, usuario?.id, isUserAdmin]);

  const carregarOcorrencias = async () => {
    try {
      const dadosLocais = listarOcorrencias(usuario) || [];
      setOcorrencias(dadosLocais);

      // Sincroniza em segundo plano com a tabela 'prevencao' no MySQL
      const doServidor = await sincronizarPrevencaoDoServidor(usuario);
      if (Array.isArray(doServidor)) {
        setOcorrencias(doServidor);
      }
    } catch (e) {
      console.error('Erro ao carregar ocorrências:', e);
    }
  };

  const formatarDataBR = (iso) => {
    if (!iso) return '-';
    try {
      const parts = String(iso).split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
      return iso;
    }
  };

  const formatarBRL = (num) => {
    return Number(num || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const getClassificacaoBadge = (classificacao) => {
    switch (classificacao) {
      case 'Crítica':
        return { bg: 'rgba(239, 68, 68, 0.18)', color: '#f87171', border: 'rgba(239, 68, 68, 0.4)', label: '🔴 Crítica' };
      case 'Alta':
        return { bg: 'rgba(249, 115, 22, 0.18)', color: '#fb923c', border: 'rgba(249, 115, 22, 0.4)', label: '🟠 Alta' };
      case 'Média':
        return { bg: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.4)', label: '🟡 Média' };
      case 'Baixa':
      default:
        return { bg: 'rgba(16, 185, 129, 0.18)', color: '#4ade80', border: 'rgba(16, 185, 129, 0.4)', label: '🟢 Baixa' };
    }
  };

  const getStatusBadge = (status = 'Em Aberto') => {
    switch (status) {
      case 'Finalizada':
        return { bg: 'rgba(16, 185, 129, 0.22)', color: '#4ade80', border: 'rgba(16, 185, 129, 0.5)', label: '✅ Finalizada' };
      case 'Em Andamento':
        return { bg: 'rgba(139, 92, 246, 0.22)', color: '#c4b5fd', border: 'rgba(139, 92, 246, 0.5)', label: '⏳ Em Andamento' };
      case 'Em Aberto':
      default:
        return { bg: 'rgba(245, 158, 11, 0.22)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.5)', label: '⚠️ Em Aberto' };
    }
  };

  const handleMudarStatus = (id, novoStatus) => {
    try {
      atualizarStatusOcorrencia(id, novoStatus, nomeOperador);
      toast.success(`Status alterado para "${novoStatus}"`);
      carregarOcorrencias();
    } catch (e) {
      console.error('Erro ao mudar status:', e);
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleSalvarOcorrencia = (dadosOcorrencia) => {
    try {
      if (dadosOcorrencia.id) {
        const atualizada = atualizarOcorrencia(dadosOcorrencia);
        toast.success(`Ocorrência "${dadosOcorrencia.nome || dadosOcorrencia.numero}" atualizada!`);

        logEvent({
          type: 'prevencao',
          title: 'Ocorrência atualizada',
          details: { id: dadosOcorrencia.id, numero: dadosOcorrencia.numero, nome: dadosOcorrencia.nome },
        });
      } else {
        const criada = salvarOcorrencia(dadosOcorrencia);
        toast.success(`Ocorrência "${criada.nome || criada.numero}" registrada!`);

        logEvent({
          type: 'prevencao',
          title: 'Nova ocorrência registrada',
          details: { numero: criada.numero, nome: criada.nome, tipo: criada.tipo },
        });
      }

      carregarOcorrencias();
      setModalRegistroAberto(false);
      setOcorrenciaSelecionada(null);
    } catch (e) {
      console.error('Erro ao salvar ocorrência:', e);
      toast.error('Erro ao salvar ocorrência.');
    }
  };

  const handleSalvarRelato = ({ id, relatoFatos, medidasAdotadas, abrirPessoa }) => {
    try {
      const atualizada = salvarRelatoFatos(id, relatoFatos, medidasAdotadas, nomeOperador);
      if (atualizada) {
        toast.success(`Relato dos fatos de ${atualizada.numero} salvo!`);
        logEvent({
          type: 'prevencao',
          title: 'Relato dos fatos registrado',
          details: { id, numero: atualizada.numero },
        });

        carregarOcorrencias();
        setModalRelatoAberto(false);

        if (abrirPessoa) {
          setOcorrenciaSelecionada(atualizada);
          setModalPessoaAberto(true);
        } else {
          setOcorrenciaSelecionada(null);
        }
      }
    } catch (e) {
      console.error('Erro ao salvar relato:', e);
      toast.error('Erro ao salvar relato dos fatos.');
    }
  };

  const handleSalvarPessoasEnvolvidas = ({ id, pessoas }) => {
    try {
      const atualizada = salvarPessoasEnvolvidas(id, pessoas, nomeOperador);
      if (atualizada) {
        const total = Array.isArray(pessoas) ? pessoas.length : 1;
        toast.success(`Informações de ${total} ${total === 1 ? 'pessoa envolvida' : 'pessoas envolvidas'} salvas!`);
        logEvent({
          type: 'prevencao',
          title: 'Pessoas envolvidas registradas',
          details: { id, numero: atualizada.numero, total },
        });
      }

      carregarOcorrencias();
      setModalPessoaAberto(false);
      setOcorrenciaSelecionada(null);
    } catch (e) {
      console.error('Erro ao salvar pessoas envolvidas:', e);
      toast.error('Erro ao salvar informações das pessoas envolvidas.');
    }
  };

  const handleSalvarProdutos = ({ id, produtos }) => {
    try {
      const atualizada = salvarProdutosEnvolvidos(id, produtos, nomeOperador);
      if (atualizada) {
        toast.success(`Relação de produtos de ${atualizada.numero} salva com sucesso!`);
        logEvent({
          type: 'prevencao',
          title: 'Produtos envolvidos atualizados',
          details: { id, numero: atualizada.numero, total: atualizada.valorTotalEnvolvido },
        });
      }

      carregarOcorrencias();
      setModalProdutosAberto(false);
      setOcorrenciaSelecionada(null);
    } catch (e) {
      console.error('Erro ao salvar produtos:', e);
      toast.error('Erro ao salvar relação de produtos.');
    }
  };

  const handleSalvarAbordagem = ({ id, dadosAbordagem, usuario: operador }) => {
    try {
      const atualizada = salvarAbordagem(id, dadosAbordagem, operador || nomeOperador);
      if (atualizada) {
        toast.success(`Relatório de abordagem de ${atualizada.numero} salvo!`);
        logEvent({
          type: 'prevencao',
          title: 'Abordagem registrada',
          details: { id, numero: atualizada.numero, houve: dadosAbordagem.houveAbordagem },
        });
      }

      carregarOcorrencias();
      setModalAbordagemAberto(false);
      setOcorrenciaSelecionada(null);
    } catch (e) {
      console.error('Erro ao salvar abordagem:', e);
      toast.error('Erro ao salvar relatório de abordagem.');
    }
  };

  const handleSalvarResponsaveis = ({ id, dadosResponsaveis, usuario: operador }) => {
    try {
      const atualizada = salvarResponsaveisRegistro(id, dadosResponsaveis, operador || nomeOperador);
      if (atualizada) {
        toast.success(`Responsáveis pelo registro de ${atualizada.numero} salvos!`);
        logEvent({
          type: 'prevencao',
          title: 'Responsáveis pelo registro atualizados',
          details: { id, numero: atualizada.numero, emitidoPor: dadosResponsaveis.emitidoPor?.nome },
        });
      }

      carregarOcorrencias();
      setModalResponsaveisAberto(false);
      setOcorrenciaSelecionada(null);
    } catch (e) {
      console.error('Erro ao salvar responsáveis:', e);
      toast.error('Erro ao salvar responsáveis pelo registro.');
    }
  };

  const handleSalvarEvidencias = ({ id, evidencias, usuario: operador }) => {
    try {
      const atualizada = salvarEvidencias(id, evidencias, operador || nomeOperador);
      if (atualizada) {
        toast.success(`Acervo de evidências de ${atualizada.numero} atualizado!`);
        logEvent({
          type: 'prevencao',
          title: 'Evidências atualizadas',
          details: { id, numero: atualizada.numero, total: evidencias.length },
        });
      }

      carregarOcorrencias();
    } catch (e) {
      console.error('Erro ao salvar evidências:', e);
      toast.error('Erro ao salvar evidências.');
    }
  };

  const handleAddEventoCustodia = ({ id, acao, usuario: operador }) => {
    try {
      const atualizada = adicionarEventoCustodia(id, acao, operador || nomeOperador);
      if (atualizada) {
        carregarOcorrencias();
        setOcorrenciaSelecionada(atualizada);
      }
    } catch (e) {
      console.error('Erro ao adicionar evento de custódia:', e);
      toast.error('Erro ao registrar despacho.');
    }
  };

  const handleAbrirRelato = (oc) => {
    setOcorrenciaSelecionada(oc);
    setModalRelatoAberto(true);
  };

  const handleAbrirPessoa = (oc) => {
    setOcorrenciaSelecionada(oc);
    setModalPessoaAberto(true);
  };

  const handleAbrirProdutos = (oc) => {
    setOcorrenciaSelecionada(oc);
    setModalProdutosAberto(true);
  };

  const handleAbrirAbordagem = (oc) => {
    setOcorrenciaSelecionada(oc);
    setModalAbordagemAberto(true);
  };

  const handleAbrirResponsaveis = (oc) => {
    setOcorrenciaSelecionada(oc);
    setModalResponsaveisAberto(true);
  };

  const handleAbrirEvidencias = (oc) => {
    registrarVisualizacaoCustodia(oc.id, nomeOperador);
    const atualizada = listarOcorrencias().find((o) => o.id === oc.id) || oc;

    setOcorrenciaSelecionada(atualizada);
    setModalEvidenciasAberto(true);
    carregarOcorrencias();
  };

  const handleEditar = (oc) => {
    setOcorrenciaSelecionada(oc);
    setModalRegistroAberto(true);
  };

  const handleGerarRelatorio = (oc) => {
    setOcorrenciaSelecionada(oc);
    setModalRelatorioAberto(true);
  };

  const handleSolicitarExclusao = (oc) => {
    if (!isAdmin(usuario)) {
      toast.error('🔒 Acesso negado: Somente administradores (ADMIN) têm permissão para excluir ocorrências.');
      return;
    }

    setOcorrenciaParaExcluir(oc);
    setModalExcluirAberto(true);
  };

  const handleConfirmarExclusao = () => {
    if (!ocorrenciaParaExcluir) return;

    try {
      excluirOcorrencia(ocorrenciaParaExcluir.id);
      toast.success(`Ocorrência ${ocorrenciaParaExcluir.numero} excluída com sucesso.`);
      logEvent({
        type: 'prevencao',
        title: 'Ocorrência excluída pelo Administrador',
        details: { id: ocorrenciaParaExcluir.id, numero: ocorrenciaParaExcluir.numero, admin: nomeOperador },
      });
      carregarOcorrencias();
      setModalExcluirAberto(false);
      setOcorrenciaParaExcluir(null);
    } catch (e) {
      console.error('Erro ao excluir ocorrência:', e);
      toast.error('Erro ao excluir ocorrência.');
    }
  };

  // Cálculos dos 5 Cards de Estatísticas
  const totalOcorrencias = ocorrencias.length;

  const totalValorRecuperado = ocorrencias.reduce(
    (acc, curr) => acc + (Number(curr.valorTotalEnvolvido) || 0),
    0
  );

  const totalEmAberto = ocorrencias.filter(
    (o) => !o.status || o.status === 'Em Aberto'
  ).length;

  const totalEmAndamento = ocorrencias.filter(
    (o) => o.status === 'Em Andamento'
  ).length;

  const totalFinalizadas = ocorrencias.filter(
    (o) => o.status === 'Finalizada'
  ).length;

  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias.filter((oc) => {
      const term = searchTerm.toLowerCase();
      const statusOc = oc.status || 'Em Aberto';
      const matchText =
        String(oc.numero || '').toLowerCase().includes(term) ||
        String(oc.nome || '').toLowerCase().includes(term) ||
        String(oc.relatoFatos || '').toLowerCase().includes(term) ||
        (Array.isArray(oc.pessoasEnvolvidas) &&
          oc.pessoasEnvolvidas.some((p) =>
            String(p.nome || '').toLowerCase().includes(term)
          )) ||
        String(oc.pessoaEnvolvida?.nome || '').toLowerCase().includes(term) ||
        (Array.isArray(oc.produtosEnvolvidos) &&
          oc.produtosEnvolvidos.some((p) =>
            String(p.produto || '').toLowerCase().includes(term) ||
            String(p.codigo || '').toLowerCase().includes(term)
          )) ||
        String(oc.responsaveisRegistro?.emitidoPor?.nome || '').toLowerCase().includes(term) ||
        String(oc.registradoPor || '').toLowerCase().includes(term) ||
        String(oc.local || '').toLowerCase().includes(term) ||
        String(oc.setor || '').toLowerCase().includes(term);

      const matchTipo = !filtroTipo || oc.tipo === filtroTipo;
      const matchClass = !filtroClassificacao || oc.classificacao === filtroClassificacao;
      const matchStatus = !filtroStatus || statusOc === filtroStatus;

      return matchText && matchTipo && matchClass && matchStatus;
    });
  }, [ocorrencias, searchTerm, filtroTipo, filtroClassificacao, filtroStatus]);

  return (
    <div className="page-container fade-in-page">
      {/* Header */}
      <div
        className="notas-header-bar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '15px',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 auto' }}>
          <img
            src={brasaoImg}
            alt="Brasão Big Master"
            style={{ width: '150px', height: '150px', objectFit: 'contain', flexShrink: 0 }}
          />
          <div>
            <h1 className="page-title" style={{ color: '#00d2ff', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
              Prevenção de Perdas e Roubos
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
              <p className="page-subtitle" style={{ color: '#8a94a6', fontSize: '0.95rem', margin: 0 }}>
                Registro de ocorrências, matriz de responsabilidades, qualificação, abordagem e custódia.
              </p>
              {isUserAdmin ? (
                <span className="admin-badge-indicator" style={{ fontSize: '0.82rem', padding: '3px 10px' }}>
                  👑 Visão Geral Admin (Todas as Ocorrências do Sistema)
                </span>
              ) : (
                <span className="badge-recente" style={{ fontSize: '0.82rem', padding: '3px 10px' }}>
                  🛡️ Minhas Ocorrências
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto', flexShrink: 0 }}>
          <button
            className="btn-nova-conta"
            onClick={() => {
              setOcorrenciaSelecionada(null);
              setModalRegistroAberto(true);
            }}
            style={{ whiteSpace: 'nowrap' }}
          >
            ➕ Registrar Ocorrência
          </button>
        </div>
      </div>

      {/* Grid de 5 Métricas Principais */}
      <div className="prevencao-stats-grid">
        {/* Card 1: Total de Ocorrências */}
        <div className="prevencao-stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="prevencao-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            🛡️
          </div>
          <div className="prevencao-stat-data">
            <span className="prevencao-stat-title">Ocorrências</span>
            <span className="prevencao-stat-value" style={{ color: '#38bdf8' }}>{totalOcorrencias}</span>
          </div>
        </div>

        {/* Card 2: Produtos Recuperados / Valor Total */}
        <div className="prevencao-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="prevencao-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            💰
          </div>
          <div className="prevencao-stat-data">
            <span className="prevencao-stat-title">Recuperado</span>
            <span className="prevencao-stat-value" style={{ color: '#4ade80' }}>
              {formatarBRL(totalValorRecuperado)}
            </span>
          </div>
        </div>

        {/* Card 3: Ocorrências Em Aberto */}
        <div className="prevencao-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="prevencao-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            ⚠️
          </div>
          <div className="prevencao-stat-data">
            <span className="prevencao-stat-title">Em Aberto</span>
            <span className="prevencao-stat-value" style={{ color: '#fbbf24' }}>
              {totalEmAberto}
            </span>
          </div>
        </div>

        {/* Card 4: Ocorrências Em Andamento */}
        <div className="prevencao-stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="prevencao-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            ⏳
          </div>
          <div className="prevencao-stat-data">
            <span className="prevencao-stat-title">Em Andamento</span>
            <span className="prevencao-stat-value" style={{ color: '#c4b5fd' }}>
              {totalEmAndamento}
            </span>
          </div>
        </div>

        {/* Card 5: Ocorrências Finalizadas */}
        <div className="prevencao-stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="prevencao-stat-icon" style={{ background: 'rgba(5, 150, 105, 0.15)', color: '#059669' }}>
            ✅
          </div>
          <div className="prevencao-stat-data">
            <span className="prevencao-stat-title">Finalizadas</span>
            <span className="prevencao-stat-value" style={{ color: '#34d399' }}>
              {totalFinalizadas}
            </span>
          </div>
        </div>
      </div>

      {/* Abas Rápidas de Filtro por Status */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setFiltroStatus('')}
          style={{
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: !filtroStatus ? '1px solid #38bdf8' : '1px solid #334155',
            background: !filtroStatus ? 'rgba(56, 189, 248, 0.18)' : '#181d24',
            color: !filtroStatus ? '#38bdf8' : '#94a3b8',
            transition: 'all 0.2s',
          }}
        >
          📋 Todas ({totalOcorrencias})
        </button>
        <button
          type="button"
          onClick={() => setFiltroStatus('Em Aberto')}
          style={{
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: filtroStatus === 'Em Aberto' ? '1px solid #fbbf24' : '1px solid #334155',
            background: filtroStatus === 'Em Aberto' ? 'rgba(245, 158, 11, 0.22)' : '#181d24',
            color: filtroStatus === 'Em Aberto' ? '#fbbf24' : '#94a3b8',
            transition: 'all 0.2s',
          }}
        >
          ⚠️ Em Aberto ({totalEmAberto})
        </button>
        <button
          type="button"
          onClick={() => setFiltroStatus('Em Andamento')}
          style={{
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: filtroStatus === 'Em Andamento' ? '1px solid #c4b5fd' : '1px solid #334155',
            background: filtroStatus === 'Em Andamento' ? 'rgba(139, 92, 246, 0.22)' : '#181d24',
            color: filtroStatus === 'Em Andamento' ? '#c4b5fd' : '#94a3b8',
            transition: 'all 0.2s',
          }}
        >
          ⏳ Em Andamento ({totalEmAndamento})
        </button>
        <button
          type="button"
          onClick={() => setFiltroStatus('Finalizada')}
          style={{
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: filtroStatus === 'Finalizada' ? '1px solid #4ade80' : '1px solid #334155',
            background: filtroStatus === 'Finalizada' ? 'rgba(16, 185, 129, 0.22)' : '#181d24',
            color: filtroStatus === 'Finalizada' ? '#4ade80' : '#94a3b8',
            transition: 'all 0.2s',
          }}
        >
          ✅ Finalizadas ({totalFinalizadas})
        </button>
      </div>

      {/* Barra de Filtros & Visualização */}
      <div className="control-bar" style={{ background: '#181d24', padding: '14px 16px', borderRadius: '10px', border: '1px solid #283340', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
          <input
            type="text"
            placeholder="🔍 Buscar por nome, ID, produto, responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="modal-input"
            style={{ maxWidth: '280px' }}
          />

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="select-input"
            style={{ maxWidth: '170px' }}
          >
            <option value="">Todos os Status</option>
            {STATUS_OCORRENCIA.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="select-input"
            style={{ maxWidth: '170px' }}
          >
            <option value="">Todos os Tipos</option>
            {TIPOS_OCORRENCIA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={filtroClassificacao}
            onChange={(e) => setFiltroClassificacao(e.target.value)}
            className="select-input"
            style={{ maxWidth: '160px' }}
          >
            <option value="">Todas as Gravidades</option>
            {CLASSIFICACOES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Alternador de Visualização */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => setVisualizacao('containers')}
            style={{
              background: visualizacao === 'containers' ? '#3b82f6' : '#242b35',
              color: visualizacao === 'containers' ? '#fff' : '#94a3b8',
              borderColor: visualizacao === 'containers' ? '#3b82f6' : '#334155',
            }}
          >
            🗂️ Containers / Cards
          </button>
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => setVisualizacao('tabela')}
            style={{
              background: visualizacao === 'tabela' ? '#3b82f6' : '#242b35',
              color: visualizacao === 'tabela' ? '#fff' : '#94a3b8',
              borderColor: visualizacao === 'tabela' ? '#3b82f6' : '#334155',
            }}
          >
            📊 Tabela
          </button>
        </div>
      </div>

      {/* Exibição em Containers / Cards de Ocorrência */}
      {visualizacao === 'containers' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {ocorrenciasFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#181d24', borderRadius: '10px', border: '1px solid #283340', color: '#64748b' }}>
              Nenhuma ocorrência registrada ou encontrada. Clique em <strong>"➕ Registrar Ocorrência"</strong> para criar o primeiro registro.
            </div>
          ) : (
            ocorrenciasFiltradas.map((oc) => {
              const badge = getClassificacaoBadge(oc.classificacao);
              const statusBadge = getStatusBadge(oc.status);
              const horario = oc.horaTermino ? `${oc.horaInicio} às ${oc.horaTermino}` : oc.horaInicio || '-';
              const nomeOcorrencia = oc.nome || oc.titulo || `Ocorrência de ${oc.tipo}`;
              const temRelato = Boolean(oc.relatoFatos);
              const listaPessoas = Array.isArray(oc.pessoasEnvolvidas) && oc.pessoasEnvolvidas.length > 0
                ? oc.pessoasEnvolvidas
                : oc.pessoaEnvolvida
                  ? [oc.pessoaEnvolvida]
                  : [];
              const temPessoa = listaPessoas.length > 0;
              const temProdutos = Array.isArray(oc.produtosEnvolvidos) && oc.produtosEnvolvidos.length > 0;
              const temAbordagem = Boolean(oc.abordagem);
              const totalEvidencias = Array.isArray(oc.evidencias) ? oc.evidencias.length : 0;
              const resp = oc.responsaveisRegistro || {};
              const temResponsavelConfigurado = Boolean(resp.emitidoPor?.nome);
              const autorNome = oc.registradoPor || resp.emitidoPor?.nome || 'Operador';

              return (
                <div
                  key={oc.id}
                  className="prevencao-container-card"
                >
                  {/* Topo do Container: ID, Nome, Tipo, Classificação, Status, Data e Hora */}
                  <div className="prevencao-card-header">
                    <div className="prevencao-card-title-group">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#00d2ff', fontFamily: 'monospace', background: 'rgba(0, 210, 255, 0.12)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(0, 210, 255, 0.3)' }}>
                          {oc.numero}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                          {nomeOcorrencia}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, background: '#242b35', border: '1px solid #334155', color: '#f1f5f9' }}>
                          ⚠️ {oc.tipo}
                        </span>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                        <select
                          value={oc.status || 'Em Aberto'}
                          onChange={(e) => handleMudarStatus(oc.id, e.target.value)}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: statusBadge.bg,
                            color: statusBadge.color,
                            border: `1px solid ${statusBadge.border}`,
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {STATUS_OCORRENCIA.map((s) => (
                            <option key={s} value={s} style={{ background: '#1b1b1d', color: '#fff' }}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="prevencao-card-meta">
                      <span>📅 <strong>{formatarDataBR(oc.data)}</strong> às <strong>{horario}</strong></span>
                      {oc.local && (
                        <span style={{ color: '#64748b', fontSize: '11.5px' }}>
                          📍 {oc.local} {oc.setor ? `(${oc.setor})` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Faixa em Destaque: Quem Registrou & Status Atual */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(51, 65, 85, 0.7)',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      marginBottom: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>👤</span> Registrado por: <strong style={{ color: '#fff' }}>{autorNome}</strong>
                      </span>
                      {oc.userLogin && (
                        <span style={{ color: '#94a3b8', fontSize: '11.5px', background: '#1e293b', padding: '1px 6px', borderRadius: '4px' }}>
                          @{oc.userLogin}
                        </span>
                      )}
                      {oc.userEmail && (
                        <span style={{ color: '#64748b', fontSize: '11px' }}>
                          • {oc.userEmail}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: statusBadge.bg,
                          color: statusBadge.color,
                          border: `1px solid ${statusBadge.border}`,
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Relato Factual dos Fatos (Se preenchido) ou Aviso Pendente */}
                  {temRelato ? (
                    <div
                      style={{
                        background: 'rgba(59, 130, 246, 0.06)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <strong style={{ color: '#60a5fa', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📋</span> Relato Factual dos Fatos Observados:
                        </strong>
                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                          ✅ Relato Concluído
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13.5px', color: '#f1f5f9', lineHeight: 1.5, fontStyle: 'italic' }}>
                        "{oc.relatoFatos}"
                      </p>
                      {oc.medidasAdotadas && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(59, 130, 246, 0.15)', fontSize: '12.5px', color: '#94a3b8' }}>
                          <strong style={{ color: '#cbd5e1' }}>Providências: </strong> {oc.medidasAdotadas}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px dashed rgba(245, 158, 11, 0.35)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 600 }}>
                        ⚠️ Esta ocorrência ainda não possui o relato detalhado e objetivo dos fatos.
                      </span>
                      <button
                        type="button"
                        className="btn-pendente-alerta-amarelo"
                        onClick={() => handleAbrirRelato(oc)}
                        style={{
                          border: 'none',
                          padding: '7px 16px',
                          borderRadius: '6px',
                          fontSize: '12.5px',
                        }}
                      >
                        📝 Relatar Ocorrência
                      </button>
                    </div>
                  )}

                  {/* Bloco de Pessoas Envolvidas (Se cadastradas) */}
                  {temPessoa && (
                    <div
                      style={{
                        background: 'rgba(139, 92, 246, 0.08)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ color: '#c4b5fd', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>👥</span> Pessoas Envolvidas ({listaPessoas.length}):
                        </strong>
                        <span style={{ fontSize: '11px', color: '#a78bfa' }}>
                          Qualificação registrada
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {listaPessoas.map((p, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: '#1b1626',
                              border: '1px solid rgba(139, 92, 246, 0.3)',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#e2e8f0',
                            }}
                          >
                            <strong style={{ color: '#fff' }}>👤 {p.nome || `Pessoa ${idx + 1}`}</strong>{' '}
                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                              ({p.clienteIdentificado === 'Sim' ? 'Cliente' : p.funcionario === 'Sim' ? 'Funcionário' : 'Terceiro'})
                            </span>
                            {p.vestimenta && (
                              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                                👕 {p.vestimenta}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bloco de Relação de Produtos Envolvidos (Se cadastrados) */}
                  {temProdutos && (
                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.07)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ color: '#6ee7b7', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📦</span> Produtos Relacionados ({oc.produtosEnvolvidos.length} {oc.produtosEnvolvidos.length === 1 ? 'item' : 'itens'}):
                        </strong>
                        <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: 800 }}>
                          Total: {formatarBRL(oc.valorTotalEnvolvido)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {oc.produtosEnvolvidos.map((p, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: '#151c19',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#e2e8f0',
                            }}
                          >
                            <strong style={{ color: '#6ee7b7' }}>{p.quantidade}x</strong> {p.produto}{' '}
                            <span style={{ color: '#94a3b8' }}>({formatarBRL(p.total)})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bloco de Relatório de Abordagem (Se registrado) */}
                  {temAbordagem && (
                    <div
                      style={{
                        background: 'rgba(234, 88, 12, 0.08)',
                        border: '1px solid rgba(234, 88, 12, 0.3)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginBottom: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ color: '#fb923c', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🚨</span> Abordagem Realizada: <span style={{ color: '#fff' }}>{oc.abordagem.houveAbordagem}</span>
                        </strong>
                        <span style={{ fontSize: '11px', background: 'rgba(234, 88, 12, 0.2)', color: '#fdba74', padding: '1px 6px', borderRadius: '4px' }}>
                          Recuperação: {oc.abordagem.recuperacaoMercadorias}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>📍 Local: {oc.abordagem.local}</span>
                        <span>👮‍♂️ Agentes: {oc.abordagem.responsaveis || 'Segurança'}</span>
                        {oc.abordagem.numeroBoletim && <span>📑 B.O.: {oc.abordagem.numeroBoletim}</span>}
                      </div>
                      {oc.abordagem.relatoAbordagem && (
                        <p style={{ margin: '6px 0 0 0', fontSize: '12.5px', color: '#f1f5f9', fontStyle: 'italic', lineHeight: 1.4 }}>
                          "{oc.abordagem.relatoAbordagem}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Bloco de Evidências Anexadas (Se existirem) */}
                  {totalEvidencias > 0 && (
                    <div
                      style={{
                        background: 'rgba(56, 189, 248, 0.06)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginBottom: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px' }}>📁</span>
                        <span style={{ fontSize: '12.5px', color: '#38bdf8', fontWeight: 600 }}>
                          Acervo Probatório: <strong>{totalEvidencias} {totalEvidencias === 1 ? 'evidência cadastrada' : 'evidências cadastradas'}</strong>
                        </span>
                        <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc', padding: '1px 6px', borderRadius: '4px' }}>
                          🛡️ Cadeia de Custódia Ativa
                        </span>
                      </div>

                      <button
                        type="button"
                        className="quick-action-btn"
                        onClick={() => handleAbrirEvidencias(oc)}
                        style={{ background: '#0284c7', color: '#fff', borderColor: '#0284c7', padding: '3px 10px', fontSize: '11.5px', fontWeight: 700 }}
                      >
                        📂 Abrir Evidências & Custódia
                      </button>
                    </div>
                  )}

                  {/* Bloco de Responsabilidade do Registro */}
                  <div
                    style={{
                      background: '#13171e',
                      border: '1px solid #242e3b',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      fontSize: '11.5px',
                    }}
                  >
                    <div style={{ color: '#cbd5e1' }}>
                      ✍️ <strong>Emitido por:</strong> <span style={{ color: '#38bdf8', fontWeight: 700 }}>{resp.emitidoPor?.nome || oc.registradoPor || 'Operador'}</span>
                      <span style={{ color: '#94a3b8' }}> ({resp.emitidoPor?.cargo || 'Prevenção de Perdas'})</span>
                      {resp.emitidoPor?.dataHora && <span style={{ color: '#64748b' }}> • {resp.emitidoPor.dataHora}</span>}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {resp.presenciou?.nome && (
                        <span style={{ background: '#1c2331', border: '1px solid #334155', padding: '1px 6px', borderRadius: '4px', color: '#fbbf24' }}>
                          👁️ Presenciou: {resp.presenciou.nome}
                        </span>
                      )}
                      {resp.atendeu?.nome && (
                        <span style={{ background: '#1c2331', border: '1px solid #334155', padding: '1px 6px', borderRadius: '4px', color: '#fb923c' }}>
                          👮‍♂️ Atendeu: {resp.atendeu.nome}
                        </span>
                      )}
                      {resp.recebeu?.nome && (
                        <span style={{ background: '#1c2331', border: '1px solid #334155', padding: '1px 6px', borderRadius: '4px', color: '#c084fc' }}>
                          📥 Recebeu: {resp.recebeu.nome}
                        </span>
                      )}
                      {resp.analisou?.nome && (
                        <span style={{ background: '#1c2331', border: '1px solid #334155', padding: '1px 6px', borderRadius: '4px', color: '#4ade80' }}>
                          🔍 Analisou: {resp.analisou.nome}
                        </span>
                      )}
                      {resp.autorizouEncerramento?.nome && (
                        <span style={{ background: '#1c2331', border: '1px solid #334155', padding: '1px 6px', borderRadius: '4px', color: '#34d399' }}>
                          ⚖️ Autorizou: {resp.autorizouEncerramento.nome}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rodapé do Container com Ações Touch-Friendly */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '6px' }}>
                    {/* Botão Dinâmico Principal em Destaque */}
                    {!temRelato ? (
                      <button
                        type="button"
                        className="quick-action-btn btn-pendente-alerta-amarelo"
                        onClick={() => handleAbrirRelato(oc)}
                        style={{ width: '100%', padding: '10px', fontSize: '13px', marginBottom: '8px' }}
                      >
                        📝 Preencher Relato Factual Obrigatório
                      </button>
                    ) : !temPessoa ? (
                      <button
                        type="button"
                        className="quick-action-btn btn-pendente-pessoa-pulse"
                        onClick={() => handleAbrirPessoa(oc)}
                        style={{ width: '100%', padding: '10px', fontSize: '13px', marginBottom: '8px' }}
                      >
                        👥 Qualificar Pessoas Envolvidas
                      </button>
                    ) : !temProdutos ? (
                      <button
                        type="button"
                        className="quick-action-btn btn-pendente-produtos-pulse"
                        onClick={() => handleAbrirProdutos(oc)}
                        style={{ width: '100%', padding: '10px', fontSize: '13px', marginBottom: '8px' }}
                      >
                        📦 Registrar Produtos Relacionados
                      </button>
                    ) : !temAbordagem ? (
                      <button
                        type="button"
                        className="quick-action-btn btn-pendente-abordagem-pulse"
                        onClick={() => handleAbrirAbordagem(oc)}
                        style={{ width: '100%', padding: '10px', fontSize: '13px', marginBottom: '8px' }}
                      >
                        🚨 Relatar Abordagem e Segurança
                      </button>
                    ) : !temResponsavelConfigurado ? (
                      <button
                        type="button"
                        className="quick-action-btn btn-pendente-responsavel-pulse"
                        onClick={() => handleAbrirResponsaveis(oc)}
                        style={{ width: '100%', padding: '10px', fontSize: '13px', marginBottom: '8px' }}
                      >
                        👤 Definir Responsáveis pelo Registro
                      </button>
                    ) : totalEvidencias === 0 ? (
                      <button
                        type="button"
                        className="quick-action-btn btn-pendente-evidencias-pulse"
                        onClick={() => handleAbrirEvidencias(oc)}
                        style={{ width: '100%', padding: '10px', fontSize: '13px', marginBottom: '8px' }}
                      >
                        📁 Anexar Evidências e Cadeia de Custódia
                      </button>
                    ) : null}

                    {/* Grade de Atalhos e Edição Rápida */}
                    <div className="prevencao-actions-grid">
                      <button
                        type="button"
                        className={`quick-action-btn ${!temRelato ? 'btn-pendente-alerta-amarelo' : ''}`}
                        onClick={() => handleAbrirRelato(oc)}
                        style={temRelato ? { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.4)' } : undefined}
                        title="Relato dos Fatos"
                      >
                        📝 Relato
                      </button>

                      <button
                        type="button"
                        className={`quick-action-btn ${!temPessoa ? 'btn-pendente-pessoa-pulse' : ''}`}
                        onClick={() => handleAbrirPessoa(oc)}
                        style={temPessoa ? { background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd', borderColor: 'rgba(139, 92, 246, 0.4)' } : undefined}
                        title="Pessoas Envolvidas"
                      >
                        👥 Pessoas ({listaPessoas.length})
                      </button>

                      <button
                        type="button"
                        className={`quick-action-btn ${!temProdutos ? 'btn-pendente-produtos-pulse' : ''}`}
                        onClick={() => handleAbrirProdutos(oc)}
                        style={temProdutos ? { background: 'rgba(16, 185, 129, 0.15)', color: '#4ade80', borderColor: 'rgba(16, 185, 129, 0.4)' } : undefined}
                        title="Produtos Relacionados"
                      >
                        📦 Itens ({oc.produtosEnvolvidos?.length || 0})
                      </button>

                      <button
                        type="button"
                        className={`quick-action-btn ${!temAbordagem ? 'btn-pendente-abordagem-pulse' : ''}`}
                        onClick={() => handleAbrirAbordagem(oc)}
                        style={temAbordagem ? { background: 'rgba(234, 88, 12, 0.15)', color: '#fb923c', borderColor: 'rgba(234, 88, 12, 0.4)' } : undefined}
                        title="Relatório de Abordagem"
                      >
                        🚨 Abordagem
                      </button>

                      <button
                        type="button"
                        className={`quick-action-btn ${!temResponsavelConfigurado ? 'btn-pendente-responsavel-pulse' : ''}`}
                        onClick={() => handleAbrirResponsaveis(oc)}
                        style={temResponsavelConfigurado ? { background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', borderColor: 'rgba(99, 102, 241, 0.4)' } : undefined}
                        title="Responsável pelo Registro"
                      >
                        👤 Responsável
                      </button>

                      <button
                        type="button"
                        className={`quick-action-btn ${totalEvidencias === 0 ? 'btn-pendente-evidencias-pulse' : ''}`}
                        onClick={() => handleAbrirEvidencias(oc)}
                        style={totalEvidencias > 0 ? { background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' } : undefined}
                        title="Evidências e Cadeia de Custódia"
                      >
                        📁 Evidências ({totalEvidencias})
                      </button>

                      <button
                        type="button"
                        className="quick-action-btn"
                        onClick={() => handleEditar(oc)}
                        title="Editar Dados Básicos"
                      >
                        ⚙️ Editar
                      </button>

                      <button
                        type="button"
                        className="quick-action-btn"
                        onClick={() => handleGerarRelatorio(oc)}
                        style={{
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          color: '#ffffff',
                          borderColor: '#38bdf8',
                          fontWeight: 700,
                        }}
                        title="Gerar Relatório Completo PDF"
                      >
                        📄 Relatório
                      </button>

                      {isUserAdmin ? (
                        <button
                          type="button"
                          className="quick-action-btn"
                          onClick={() => handleSolicitarExclusao(oc)}
                          style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          title="Excluir Ocorrência (ADMIN)"
                        >
                          🗑️ Excluir
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Visualização em Tabela */
        <div className="table-responsive" style={{ background: '#181d24', borderRadius: '10px', border: '1px solid #283340', overflow: 'hidden' }}>
          <table className="contasTable" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1e2632', borderBottom: '1px solid #2d3748' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Nome da Ocorrência</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Registrado por</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Do que se trata</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Gravidade</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Valor Envolvido</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Módulos & Provas</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {ocorrenciasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Nenhuma ocorrência encontrada.
                  </td>
                </tr>
              ) : (
                ocorrenciasFiltradas.map((oc) => {
                  const badge = getClassificacaoBadge(oc.classificacao);
                  const statusBadge = getStatusBadge(oc.status);
                  const nomeOcorrencia = oc.nome || oc.titulo || `Ocorrência de ${oc.tipo}`;
                  const autorNome = oc.registradoPor || oc.responsaveisRegistro?.emitidoPor?.nome || 'Operador';
                  const listaPessoas = Array.isArray(oc.pessoasEnvolvidas) && oc.pessoasEnvolvidas.length > 0
                    ? oc.pessoasEnvolvidas
                    : oc.pessoaEnvolvida
                      ? [oc.pessoaEnvolvida]
                      : [];
                  const temPessoa = listaPessoas.length > 0;
                  const temProdutos = Array.isArray(oc.produtosEnvolvidos) && oc.produtosEnvolvidos.length > 0;
                  const temAbordagem = Boolean(oc.abordagem);
                  const resp = oc.responsaveisRegistro || {};
                  const temResponsavelConfigurado = Boolean(resp.emitidoPor?.nome && resp.emitidoPor?.matricula);
                  const totalEvidencias = Array.isArray(oc.evidencias) ? oc.evidencias.length : 0;

                  return (
                    <tr key={oc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#00d2ff', fontFamily: 'monospace' }}>
                        {oc.numero}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f1f5f9' }}>
                        {nomeOcorrencia}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#38bdf8', fontSize: '12.5px', fontWeight: 600 }}>
                        👤 {autorNome}
                        {oc.userLogin && <span style={{ color: '#94a3b8', fontSize: '11px', display: 'block', fontWeight: 400 }}>@{oc.userLogin}</span>}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', background: '#242b35', border: '1px solid #334155' }}>
                          {oc.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <select
                          value={oc.status || 'Em Aberto'}
                          onChange={(e) => handleMudarStatus(oc.id, e.target.value)}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: statusBadge.bg,
                            color: statusBadge.color,
                            border: `1px solid ${statusBadge.border}`,
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {STATUS_OCORRENCIA.map((s) => (
                            <option key={s} value={s} style={{ background: '#1b1b1d', color: '#fff' }}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: oc.valorTotalEnvolvido > 0 ? '#4ade80' : '#64748b' }}>
                        {formatarBRL(oc.valorTotalEnvolvido)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className={`quick-action-btn ${!temRelato ? 'btn-pendente-alerta-amarelo' : ''}`}
                            onClick={() => handleAbrirRelato(oc)}
                            style={temRelato ? {
                              padding: '3px 8px',
                              fontSize: '11px',
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#60a5fa',
                              borderColor: 'rgba(59, 130, 246, 0.4)',
                            } : {
                              padding: '3px 8px',
                              fontSize: '11px',
                            }}
                            title="Relato Factual"
                          >
                            {temRelato ? '📝 Relato' : '+ Relato'}
                          </button>
                          <button
                            type="button"
                            className={`quick-action-btn ${!temPessoa ? 'btn-pendente-pessoa-pulse' : ''}`}
                            onClick={() => handleAbrirPessoa(oc)}
                            style={temPessoa ? {
                              padding: '3px 8px',
                              fontSize: '11px',
                              background: 'rgba(139, 92, 246, 0.15)',
                              color: '#c4b5fd',
                              borderColor: 'rgba(139, 92, 246, 0.4)',
                            } : {
                              padding: '3px 8px',
                              fontSize: '11px',
                            }}
                            title="Pessoas Envolvidas"
                          >
                            {temPessoa ? `👥 (${listaPessoas.length})` : '+ Pessoa'}
                          </button>
                          <button
                            type="button"
                            className={`quick-action-btn ${!temProdutos ? 'btn-pendente-produtos-pulse' : ''}`}
                            onClick={() => handleAbrirProdutos(oc)}
                            style={temProdutos ? {
                              padding: '3px 8px',
                              fontSize: '11px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#4ade80',
                              borderColor: 'rgba(16, 185, 129, 0.4)',
                            } : {
                              padding: '3px 8px',
                              fontSize: '11px',
                            }}
                            title="Produtos Relacionados"
                          >
                            {temProdutos ? `📦 (${oc.produtosEnvolvidos?.length || 0})` : '+ Produtos'}
                          </button>
                          <button
                            type="button"
                            className={`quick-action-btn ${!temAbordagem ? 'btn-pendente-abordagem-pulse' : ''}`}
                            onClick={() => handleAbrirAbordagem(oc)}
                            style={temAbordagem ? {
                              padding: '3px 8px',
                              fontSize: '11px',
                              background: 'rgba(234, 88, 12, 0.15)',
                              color: '#fb923c',
                              borderColor: 'rgba(234, 88, 12, 0.4)',
                            } : {
                              padding: '3px 8px',
                              fontSize: '11px',
                            }}
                            title="Relatório de Abordagem"
                          >
                            {temAbordagem ? '🚨 Abordagem' : '+ Abordagem'}
                          </button>
                          <button
                            type="button"
                            className={`quick-action-btn ${!temResponsavelConfigurado ? 'btn-pendente-responsavel-pulse' : ''}`}
                            onClick={() => handleAbrirResponsaveis(oc)}
                            style={temResponsavelConfigurado ? {
                              padding: '3px 8px',
                              fontSize: '11px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: '#a5b4fc',
                              borderColor: 'rgba(99, 102, 241, 0.4)',
                            } : {
                              padding: '3px 8px',
                              fontSize: '11px',
                            }}
                            title="Responsável pelo Registro"
                          >
                            {temResponsavelConfigurado ? '👤 Resp.' : '+ Resp.'}
                          </button>
                          <button
                            type="button"
                            className={`quick-action-btn ${totalEvidencias === 0 ? 'btn-pendente-evidencias-pulse' : ''}`}
                            onClick={() => handleAbrirEvidencias(oc)}
                            style={totalEvidencias > 0 ? {
                              padding: '3px 8px',
                              fontSize: '11px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              borderColor: 'rgba(56, 189, 248, 0.4)',
                            } : {
                              padding: '3px 8px',
                              fontSize: '11px',
                            }}
                            title="Evidências e Custódia"
                          >
                            {totalEvidencias > 0 ? `📁 (${totalEvidencias})` : '+ Mídia'}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="quick-action-btn"
                            onClick={() => handleAbrirRelato(oc)}
                            style={{ padding: '4px 8px', fontSize: '11.5px' }}
                            title="Relato dos Fatos"
                          >
                            📝
                          </button>
                          <button
                            type="button"
                            className="quick-action-btn"
                            onClick={() => handleEditar(oc)}
                            style={{ padding: '4px 8px', fontSize: '11.5px' }}
                            title="Editar Ocorrência"
                          >
                            ⚙️
                          </button>
                          <button
                            type="button"
                            className="quick-action-btn"
                            onClick={() => handleGerarRelatorio(oc)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '11.5px',
                              background: '#0284c7',
                              color: '#fff',
                              borderColor: '#38bdf8',
                              fontWeight: 700,
                            }}
                            title="Gerar Relatório Completo"
                          >
                            📄
                          </button>
                          {isUserAdmin ? (
                            <button
                              type="button"
                              className="quick-action-btn"
                              onClick={() => handleSolicitarExclusao(oc)}
                              style={{ padding: '4px 8px', fontSize: '11.5px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              title="Excluir Ocorrência (Exclusivo Administrador)"
                            >
                              🗑️
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="quick-action-btn"
                              onClick={() => toast.warn('🔒 Apenas administradores podem excluir ocorrências.')}
                              style={{
                                padding: '4px 8px',
                                fontSize: '11.5px',
                                background: 'rgba(100, 116, 139, 0.1)',
                                color: '#64748b',
                                borderColor: 'rgba(100, 116, 139, 0.25)',
                                cursor: 'not-allowed',
                                opacity: 0.6,
                              }}
                              title="Exclusão bloqueada: Apenas Administrador"
                            >
                              🔒
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal 1: Registro / Edição da Ocorrência */}
      <ModalOcorrencia
        isOpen={modalRegistroAberto}
        onClose={() => {
          setModalRegistroAberto(false);
          setOcorrenciaSelecionada(null);
        }}
        onSave={handleSalvarOcorrencia}
        ocorrenciaParaEditar={ocorrenciaSelecionada}
      />

      {/* Modal 2: Relato Factual dos Fatos */}
      <ModalRelatoFatos
        isOpen={modalRelatoAberto}
        onClose={() => {
          setModalRelatoAberto(false);
          setOcorrenciaSelecionada(null);
        }}
        ocorrencia={ocorrenciaSelecionada}
        onSave={handleSalvarRelato}
      />

      {/* Modal 3: Pessoas Envolvidas */}
      <ModalPessoaEnvolvida
        isOpen={modalPessoaAberto}
        onClose={() => {
          setModalPessoaAberto(false);
          setOcorrenciaSelecionada(null);
        }}
        ocorrencia={ocorrenciaSelecionada}
        onSave={handleSalvarPessoasEnvolvidas}
      />

      {/* Modal 4: Relação de Produtos Envolvidos */}
      <ModalProdutosEnvolvidos
        isOpen={modalProdutosAberto}
        onClose={() => {
          setModalProdutosAberto(false);
          setOcorrenciaSelecionada(null);
        }}
        ocorrencia={ocorrenciaSelecionada}
        onSave={handleSalvarProdutos}
      />

      {/* Modal 5: Relatório de Abordagem & Intervenção */}
      <ModalAbordagem
        isOpen={modalAbordagemAberto}
        onClose={() => {
          setModalAbordagemAberto(false);
          setOcorrenciaSelecionada(null);
        }}
        ocorrencia={ocorrenciaSelecionada}
        onSave={handleSalvarAbordagem}
      />

      {/* Modal 6: Responsáveis pelo Registro & Papéis */}
      <ModalResponsaveisRegistro
        isOpen={modalResponsaveisAberto}
        onClose={() => {
          setModalResponsaveisAberto(false);
          setOcorrenciaSelecionada(null);
        }}
        ocorrencia={ocorrenciaSelecionada}
        onSave={handleSalvarResponsaveis}
      />

      {/* Modal 7: Visualização e Impressão de Relatório Oficial */}
      <ModalRelatorioPrevencao
        isOpen={modalRelatorioAberto}
        onClose={() => {
          setModalRelatorioAberto(false);
          setOcorrenciaSelecionada(null);
        }}
        ocorrencia={ocorrenciaSelecionada}
      />

      {/* Modal 8: Evidências & Cadeia de Custódia */}
      <ModalEvidencias
        isOpen={modalEvidenciasAberto}
        onClose={() => {
          setModalEvidenciasAberto(false);
          setOcorrenciaSelecionada(null);
        }}
        ocorrencia={ocorrenciaSelecionada}
        onSaveEvidencias={handleSalvarEvidencias}
        onAddEventoCustodia={handleAddEventoCustodia}
      />

      {/* Modal 9: Confirmação de Exclusão de Ocorrência (Próprio do Sistema) */}
      <ModalExcluirOcorrencia
        isOpen={modalExcluirAberto}
        onClose={() => {
          setModalExcluirAberto(false);
          setOcorrenciaParaExcluir(null);
        }}
        onConfirm={handleConfirmarExclusao}
        ocorrencia={ocorrenciaParaExcluir}
      />
    </div>
  );
}
