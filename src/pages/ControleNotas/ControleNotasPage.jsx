// src/pages/ControleNotas/ControleNotasPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  listarControleNotas,
  salvarControleNota,
  atualizarControleNota,
  excluirControleNota,
  sincronizarControleNotasDoServidor,
} from '../../services/controleNotasService';
import { formatCurrencyBRL, formatDateBR } from '../../utils/telegram';
import { getUser, isAdmin } from '../../auth/auth';
import { normalizarNomeFilial } from '../../utils/filialUtils';
import ModalInserirControleNota from '../../components/Modais/ModalInserirControleNota';
import ModalCadastrarFornecedor from '../../components/Modais/ModalCadastrarFornecedor';
import ModalAnexarDanfe from '../../components/Modais/ModalAnexarDanfe';
import ModalVisualizadorDocumento from '../../components/Modais/ModalVisualizadorDocumento';
import ModalExcluirControleNota from '../../components/Modais/ModalExcluirControleNota';
import ModalAlertaNotaExcluida from '../../components/Modais/ModalAlertaNotaExcluida';
import ModalRelatorioControleNotas from '../../components/Modais/ModalRelatorioControleNotas';
import ModalSelecionarDataRelatorio from '../../components/Modais/ModalSelecionarDataRelatorio';
import { sincronizarFornecedoresDoServidor } from '../../services/fornecedoresService';
import './controleNotas.css';

export default function ControleNotasPage() {
  const usuarioLogado = getUser();
  const isUserAdmin = isAdmin(usuarioLogado);
  const perms = Array.isArray(usuarioLogado?.permissions || usuarioLogado?.permissoes)
    ? (usuarioLogado.permissions || usuarioLogado.permissoes)
    : [];
  const temPermissao = isUserAdmin || perms.includes('*') || perms.includes('controle-notas') || perms.includes('admin');

  const filialUsuario = normalizarNomeFilial(
    usuarioLogado?.filial ||
    usuarioLogado?.user_filial ||
    localStorage.getItem('usuario_filial') ||
    'Filial 1'
  );

  if (!temPermissao) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#f87171', maxWidth: '600px', margin: '40px auto', background: '#18181c', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ margin: '0 0 10px 0', color: '#fff' }}>Acesso Restrito</h2>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
          Você não possui permissão para acessar o <strong>Controle de Notas</strong>. Solicite liberação ao Administrador no painel de Usuários.
        </p>
      </div>
    );
  }

  const [notas, setNotas] = useState([]);
  const [filtroFilialAdmin, setFiltroFilialAdmin] = useState('Todas');
  const [buscaChaveOuNumero, setBuscaChaveOuNumero] = useState('');
  const [notaDestacada, setNotaDestacada] = useState(null);
  const [modalInserirAberto, setModalInserirAberto] = useState(false);
  const [modalCadastrarFornecedorAberto, setModalCadastrarFornecedorAberto] = useState(false);
  const [modalAnexarDanfeAberto, setModalAnexarDanfeAberto] = useState(false);
  const [notaParaAnexar, setNotaParaAnexar] = useState(null);
  const [modalVisualizadorAberto, setModalVisualizadorAberto] = useState(false);
  const [visualizadorConfig, setVisualizadorConfig] = useState({
    dataUrl: '',
    nomeArquivo: 'DANFE.pdf',
    titulo: 'Visualização da DANFE',
    subtitulo: '',
  });
  const [notaParaEditar, setNotaParaEditar] = useState(null);

  /* Estados para Exclusão e Alerta de Nota Excluída */
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [notaParaExcluir, setNotaParaExcluir] = useState(null);
  const [modalAlertaExclusaoAberto, setModalAlertaExclusaoAberto] = useState(false);
  const [infoNotaExcluida, setInfoNotaExcluida] = useState(null);

  /* Estado do Modal de Relatório de Notas e Seleção de Data */
  const [modalSelecionarDataAberto, setModalSelecionarDataAberto] = useState(false);
  const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);
  const [notasRelatorio, setNotasRelatorio] = useState([]);
  const [dataRelatorio, setDataRelatorio] = useState('');

  const carregarNotas = () => {
    const dados = listarControleNotas(usuarioLogado);
    setNotas(dados);
  };

  useEffect(() => {
    carregarNotas();
    sincronizarControleNotasDoServidor(usuarioLogado).then((res) => {
      if (Array.isArray(res)) setNotas(res);
    });
    sincronizarFornecedoresDoServidor();
  }, []);

  const handleSalvarNota = (notaPayload) => {
    try {
      if (notaPayload.id && notas.some((n) => String(n.id) === String(notaPayload.id))) {
        const atualizada = atualizarControleNota(notaPayload);
        if (atualizada) {
          toast.success(`Nota #${atualizada.numero || atualizada.id} atualizada com sucesso!`);
        }
      } else {
        const nova = salvarControleNota(notaPayload);
        toast.success(`Nota #${nova.numero || nova.id} registrada no Controle de Notas!`);
      }
      carregarNotas();
      setModalInserirAberto(false);
      setNotaParaEditar(null);
    } catch (err) {
      console.error('Erro ao salvar nota no controle:', err);
      toast.error('Falha ao salvar nota no controle.');
    }
  };

  const handleAbrirModalExcluir = (nota) => {
    setNotaParaExcluir(nota);
    setModalExcluirAberto(true);
  };

  const handleConfirmarExclusaoNota = (nota, auditoria) => {
    if (!nota) return;
    try {
      excluirControleNota(nota.id);
      
      if (notaDestacada && String(notaDestacada.id) === String(nota.id)) {
        setNotaDestacada(null);
      }
      
      carregarNotas();
      setModalExcluirAberto(false);
      setNotaParaExcluir(null);

      // Prepara e exibe o modal de alerta com o número da nota e quem excluiu
      setInfoNotaExcluida({
        numero: nota.numero ? `NF #${nota.numero}` : `NF #${nota.id}`,
        fornecedor: nota.fornecedor || 'Fornecedor',
        usuario: auditoria?.usuario || getUser()?.name || getUser()?.nome || getUser()?.username || 'Usuário Logado',
        dataHora: auditoria?.dataHora || new Date().toISOString(),
        valor: nota.valor,
      });
      setModalAlertaExclusaoAberto(true);

      toast.info(`Nota #${nota.numero || nota.id} foi excluída com sucesso por ${auditoria?.usuario || 'usuário'}.`);
    } catch (err) {
      console.error('Erro ao excluir nota:', err);
      toast.error('Erro ao excluir nota do controle.');
    }
  };

  const copiarChave = (chave) => {
    if (!chave) return;
    navigator.clipboard.writeText(chave);
    toast.success('Chave de acesso copiada para a área de transferência!');
  };

  const handleBuscarNotaRapida = (e) => {
    if (e) e.preventDefault();
    const termo = buscaChaveOuNumero.trim();
    if (!termo) {
      toast.info('Digite o número da nota ou a chave de acesso para filtrar.');
      return;
    }

    const termoLimpo = termo.replace(/\D+/g, '');
    const termoLower = termo.toLowerCase();

    const encontrada = notas.find((n) => {
      const chaveLimpa = (n.chavedeacesso || '').replace(/\D+/g, '');
      const numLimpo = (n.numero || '').replace(/\D+/g, '');
      const idLimpo = String(n.id || '').replace(/\D+/g, '');

      return (
        (termoLimpo && chaveLimpa === termoLimpo) ||
        (termoLimpo && numLimpo === termoLimpo) ||
        (termoLimpo && idLimpo === termoLimpo) ||
        (termoLimpo && chaveLimpa.includes(termoLimpo)) ||
        (termoLimpo && numLimpo.includes(termoLimpo)) ||
        String(n.numero || '').toLowerCase() === termoLower ||
        String(n.chavedeacesso || '').toLowerCase() === termoLower ||
        String(n.fornecedor || '').toLowerCase().includes(termoLower)
      );
    });

    if (encontrada) {
      setNotaDestacada(encontrada);
      toast.success(`Nota #${encontrada.numero || encontrada.id} carregada no container!`);
    } else {
      toast.warning('Nenhuma nota encontrada com esse número ou chave no Controle de Notas.');
    }
  };

  const handleVerNota = (nota) => {
    if (nota?.anexoDanfe?.dataUrl) {
      setVisualizadorConfig({
        dataUrl: nota.anexoDanfe.dataUrl,
        nomeArquivo: nota.anexoDanfe.nome || `DANFE_NF_${nota.numero || nota.id}.pdf`,
        titulo: `DANFE - NF #${nota.numero || nota.id}`,
        subtitulo: `Fornecedor: ${nota.fornecedor || 'Fornecedor'} • Protocolo de Entrega`,
      });
      setModalVisualizadorAberto(true);
    } else {
      toast.info('Esta nota ainda não possui DANFE anexada do FSIST.');
      setNotaParaAnexar(nota);
      setModalAnexarDanfeAberto(true);
    }
  };

  const handleImprimirNota = (nota) => {
    if (nota?.anexoDanfe?.dataUrl) {
      const dataUrl = nota.anexoDanfe.dataUrl;
      const ehPdf = nota.anexoDanfe.tipo === 'application/pdf' || (nota.anexoDanfe.nome || '').toLowerCase().endsWith('.pdf');
      
      if (ehPdf) {
        setVisualizadorConfig({
          dataUrl,
          nomeArquivo: nota.anexoDanfe.nome || `DANFE_NF_${nota.numero || nota.id}.pdf`,
          titulo: `Imprimir DANFE - NF #${nota.numero || nota.id}`,
          subtitulo: `Fornecedor: ${nota.fornecedor || 'Fornecedor'}`,
        });
        setModalVisualizadorAberto(true);
      } else {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(
            `<html><head><title>Imprimir DANFE - NF #${nota.numero || nota.id}</title></head><body style="margin:0; display:flex; justify-content:center;"><img src="${dataUrl}" style="max-width:100%; height:auto;" onload="window.print();"/></body></html>`
          );
          win.document.close();
        }
      }
    } else {
      toast.warning('Esta nota não possui DANFE baixada/anexada do FSIST para impressão. Deseja anexar agora?');
      setNotaParaAnexar(nota);
      setModalAnexarDanfeAberto(true);
    }
  };

  const handleSalvarAnexoParaNota = (anexo) => {
    if (!notaParaAnexar) return;
    const atualizada = { ...notaParaAnexar, anexoDanfe: anexo };
    atualizarControleNota(atualizada);
    carregarNotas();
    if (notaDestacada && String(notaDestacada.id) === String(notaParaAnexar.id)) {
      setNotaDestacada(atualizada);
    }
    toast.success(`DANFE "${anexo.nome}" anexada com sucesso à nota!`);
    setModalAnexarDanfeAberto(false);
    setNotaParaAnexar(null);
  };

  const formatarDataHoraEntrega = (dtStr) => {
    if (!dtStr) return '-';
    try {
      const dt = new Date(dtStr);
      if (isNaN(dt.getTime())) return dtStr;
      return `${dt.toLocaleDateString('pt-BR')} às ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dtStr;
    }
  };

  const getSituacaoBadgeStyle = (situacao) => {
    switch (situacao) {
      case 'Liberada':
        return { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' };
      case 'Liberar':
        return { backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)' };
      case 'Fornecedor bloqueado':
      case 'Divergente':
        return { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' };
      case 'Tributação':
      case 'Tributação comercial':
        return { backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' };
      case 'Vincular pedido':
      case 'Sem pedido':
      case 'Item sem pedido':
      case 'Custo':
      case 'Quantidade':
        return { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' };
      case 'Cadastro':
      case 'Em lançamento':
      case 'Guia':
        return { backgroundColor: 'rgba(20, 184, 166, 0.2)', color: '#2dd4bf', border: '1px solid rgba(20, 184, 166, 0.4)' };
      default:
        return { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.3)' };
    }
  };

  const handleLiberarNota = (nota) => {
    if (!nota) return;
    const agoraIso = new Date().toISOString();
    const nomeResp =
      usuarioLogado?.name ||
      usuarioLogado?.nome ||
      usuarioLogado?.username ||
      'Usuário Atual';

    const notaAtualizada = {
      ...nota,
      situacaoNota: 'Liberada',
      responsavelLiberacao: nota.responsavelLiberacao || nomeResp,
      dataHoraLiberacao: agoraIso,
      status: 'Liberada',
    };

    try {
      const atualizada = atualizarControleNota(notaAtualizada, usuarioLogado);
      if (atualizada) {
        carregarNotas();
        if (notaDestacada && String(notaDestacada.id) === String(nota.id)) {
          setNotaDestacada(atualizada);
        }
        const dataHoraFmt = formatarDataHoraEntrega(agoraIso);
        toast.success(`Nota #${nota.numero || nota.id} LIBERADA com sucesso! Data e hora fixadas: ${dataHoraFmt}`);
      }
    } catch (err) {
      console.error('Erro ao liberar nota:', err);
      toast.error('Erro ao registrar liberação da nota.');
    }
  };

  const notasPorFilial = useMemo(() => {
    if (!isUserAdmin) {
      const userFilialNorm = normalizarNomeFilial(filialUsuario || 'Filial 1').toLowerCase();
      return notas.filter((n) => normalizarNomeFilial(n.filial || 'Filial 1').toLowerCase() === userFilialNorm);
    }
    if (filtroFilialAdmin && filtroFilialAdmin !== 'Todas') {
      const filialFiltroNorm = normalizarNomeFilial(filtroFilialAdmin).toLowerCase();
      return notas.filter((n) => normalizarNomeFilial(n.filial || 'Filial 1').toLowerCase() === filialFiltroNorm);
    }
    return notas;
  }, [notas, isUserAdmin, filialUsuario, filtroFilialAdmin]);

  const metricas = useMemo(() => {
    const totalNotas = notasPorFilial.length;
    const valorTotal = notasPorFilial.reduce((acc, n) => acc + (Number(n.valor) || 0), 0);
    const fornecedoresSet = new Set(notasPorFilial.map((n) => n.fornecedor?.trim() || n.cnpj?.trim()).filter(Boolean));
    const hojeStr = new Date().toISOString().slice(0, 10);
    const entreguesHoje = notasPorFilial.filter((n) => String(n.dataHoraEntrega || '').slice(0, 10) === hojeStr).length;

    return {
      totalNotas,
      valorTotal,
      totalFornecedores: fornecedoresSet.size,
      entreguesHoje,
    };
  }, [notasPorFilial]);

  const notasFiltradas = useMemo(() => {
    const termo = buscaChaveOuNumero.trim();
    if (!termo) return notasPorFilial;
    const termoLower = termo.toLowerCase();
    const termoLimpo = termo.replace(/\D+/g, '');

    return notasPorFilial.filter((n) => {
      const chaveLimpa = (n.chavedeacesso || '').replace(/\D+/g, '');
      const numLimpo = (n.numero || '').replace(/\D+/g, '');
      const cnpjLimpo = (n.cnpj || '').replace(/\D+/g, '');

      return (
        (termoLimpo && chaveLimpa.includes(termoLimpo)) ||
        (termoLimpo && numLimpo.includes(termoLimpo)) ||
        (termoLimpo && cnpjLimpo.includes(termoLimpo)) ||
        String(n.numero || '').toLowerCase().includes(termoLower) ||
        String(n.fornecedor || '').toLowerCase().includes(termoLower) ||
        String(n.quemRecebeu || '').toLowerCase().includes(termoLower) ||
        String(n.chavedeacesso || '').toLowerCase().includes(termoLower)
      );
    });
  }, [notasPorFilial, buscaChaveOuNumero]);

  return (
    <div className="controle-notas-page">
      {/* Cabeçalho */}
      <div className="controle-header">
        <div className="controle-title-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1>
              <span>📋</span> Controle de Notas • Big Master
            </h1>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '20px',
                backgroundColor: isUserAdmin ? 'rgba(234, 179, 8, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                color: isUserAdmin ? '#fbbf24' : '#38bdf8',
                border: isUserAdmin ? '1px solid rgba(234, 179, 8, 0.35)' : '1px solid rgba(56, 189, 248, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              🏢 {isUserAdmin ? (filtroFilialAdmin === 'Todas' ? 'Todas as Filiais (Acesso Master)' : `${filtroFilialAdmin} (Filtrada)`) : `${filialUsuario} • Acesso Setorial`}
            </span>
          </div>
          <p>
            {isUserAdmin
              ? (filtroFilialAdmin === 'Todas'
                  ? 'Visualização global de todas as Notas Fiscais inseridas por todas as filiais • Big Master Supermercados'
                  : `Visualizando exclusivamente notas da ${filtroFilialAdmin} • Big Master Supermercados`)
              : `Notas Fiscais inseridas e compartilhadas exclusivamente pelos usuários da ${filialUsuario} • Big Master Supermercados`}
          </p>
        </div>

        <div className="controle-actions">
          <button
            type="button"
            className="btn-cadastrar-fornecedor-header"
            onClick={() => setModalCadastrarFornecedorAberto(true)}
            style={{
              height: '42px',
              padding: '0 16px',
              backgroundColor: '#1e293b',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              color: '#60a5fa',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🏢</span> Cadastrar Fornecedor
          </button>

          <button
            type="button"
            className="btn-relatorio-controle-header"
            onClick={() => setModalSelecionarDataAberto(true)}
            style={{
              height: '42px',
              padding: '0 16px',
              backgroundColor: '#1e293b',
              border: '1px solid #10b981',
              borderRadius: '8px',
              color: '#34d399',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)',
              transition: 'all 0.15s ease',
            }}
            title="Gerar Relatório Oficial com visualização, ordenação por hora de chegada e exportação em PDF"
          >
            <span>📑</span> Gerar Relatório de Notas
          </button>

          <button
            type="button"
            className="btn-inserir-controle"
            onClick={() => {
              setNotaParaEditar(null);
              setModalInserirAberto(true);
            }}
            style={{ height: '42px' }}
          >
            <span>➕</span> Inserir Nota
          </button>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtro */}
      <div className="controle-search-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isUserAdmin && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', whiteSpace: 'nowrap' }}>🏢 Filial:</span>
              <select
                value={filtroFilialAdmin}
                onChange={(e) => setFiltroFilialAdmin(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #d97706',
                  backgroundColor: '#18181c',
                  color: '#fbbf24',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="Todas">🌐 Todas as Filiais</option>
                <option value="Filial 1">Filial 1</option>
                <option value="Filial 2">Filial 2</option>
                <option value="Filial 3">Filial 3</option>
                <option value="Filial 4">Filial 4</option>
                <option value="Filial 5">Filial 5</option>
                <option value="Filial 6">Filial 6</option>
                <option value="Filial 7">Filial 7</option>
                <option value="Filial Particular">Filial Particular</option>
              </select>
            </div>
          )}

          <form onSubmit={handleBuscarNotaRapida} className="controle-search-form" style={{ flex: 1 }}>
            <div className="controle-search-input-wrapper">
              <span className="controle-search-icon">🔍</span>
              <input
                type="text"
                className="controle-search-input"
                placeholder={
                  isUserAdmin
                    ? 'Pesquisar por Nº da Nota, Chave de Acesso (44 dígitos), Fornecedor, CNPJ ou Quem Recebeu...'
                    : `Pesquisar notas da ${filialUsuario} por Nº, Chave (44 dígitos), Fornecedor, CNPJ ou Quem Recebeu...`
                }
                value={buscaChaveOuNumero}
                onChange={(e) => setBuscaChaveOuNumero(e.target.value)}
              />
              {buscaChaveOuNumero && (
                <button
                  type="button"
                  className="btn-limpar-busca-controle"
                  onClick={() => {
                    setBuscaChaveOuNumero('');
                    setNotaDestacada(null);
                  }}
                  title="Limpar pesquisa"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              className="btn-buscar-nota-controle"
              title="Buscar e carregar nota específica no container de destaque"
            >
              🔍 Buscar / Destacar
            </button>
          </form>
        </div>

        {buscaChaveOuNumero && (
          <div className="controle-search-badge">
            <span>Resultados: <strong>{notasFiltradas.length}</strong> de {notasPorFilial.length} notas</span>
          </div>
        )}
      </div>

      {/* Container de Destaque da Nota Filtrada/Buscada */}
      {notaDestacada && (
        <div className="controle-destaque-container">
          <div className="controle-destaque-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span className="controle-destaque-badge">📌 Nota Encontrada / Carregada</span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                {notaDestacada.numero ? `NF #${notaDestacada.numero}` : `NF #${notaDestacada.id}`}
              </span>
              <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.95rem' }}>
                {notaDestacada.fornecedor}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge status-recebida">{notaDestacada.status || 'Recebida'}</span>
              <button
                type="button"
                onClick={() => setNotaDestacada(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
                title="Fechar destaque"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="controle-destaque-grid">
            <div className="controle-destaque-item">
              <span className="item-label">CNPJ do Fornecedor</span>
              <span className="item-val" style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                {notaDestacada.cnpj || '-'}
              </span>
            </div>

            <div className="controle-destaque-item">
              <span className="item-label">Data de Emissão</span>
              <span className="item-val">{formatDateBR(notaDestacada.dataEmissao)}</span>
            </div>

            <div className="controle-destaque-item">
              <span className="item-label">Data/Hora da Entrega</span>
              <span className="item-val" style={{ color: '#fbbf24' }}>
                {formatarDataHoraEntrega(notaDestacada.dataHoraEntrega)}
              </span>
            </div>

            <div className="controle-destaque-item">
              <span className="item-label">Quem Recebeu</span>
              <span className="item-val" style={{ color: '#60a5fa' }}>
                👤 {notaDestacada.quemRecebeu || 'Não especificado'}
              </span>
            </div>

            <div className="controle-destaque-item">
              <span className="item-label">Valor da Nota</span>
              <span className="item-val" style={{ color: '#4ade80', fontSize: '1.05rem' }}>
                {formatCurrencyBRL(notaDestacada.valor || 0)}
              </span>
            </div>

            <div className="controle-destaque-item">
              <span className="item-label">Status da DANFE (FSIST)</span>
              <span
                className="item-val"
                style={{
                  color: notaDestacada.anexoDanfe ? '#34d399' : '#f87171',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {notaDestacada.anexoDanfe
                  ? `🟢 ${notaDestacada.anexoDanfe.nome}`
                  : '⚠️ Sem DANFE Anexada'}
              </span>
            </div>

            {notaDestacada.situacaoNota && (
              <div className="controle-destaque-item">
                <span className="item-label">Situação da Nota</span>
                <span
                  className="item-val"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.82rem',
                    width: 'fit-content',
                    ...getSituacaoBadgeStyle(notaDestacada.situacaoNota),
                  }}
                >
                  📌 {notaDestacada.situacaoNota}
                </span>
              </div>
            )}

            {notaDestacada.dataHoraLiberacao && (
              <div className="controle-destaque-item">
                <span className="item-label">Data/Hora da Liberação</span>
                <span className="item-val" style={{ color: '#34d399' }}>
                  ✅ {formatarDataHoraEntrega(notaDestacada.dataHoraLiberacao)}
                </span>
              </div>
            )}

            {notaDestacada.responsavelLiberacao && (
              <div className="controle-destaque-item">
                <span className="item-label">Responsável Liberação</span>
                <span className="item-val" style={{ color: '#38bdf8' }}>
                  👤 {notaDestacada.responsavelLiberacao}
                </span>
              </div>
            )}
          </div>

          {notaDestacada.chavedeacesso && (
            <div
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Chave de Acesso da Nota Fiscal:
                </span>
                <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#e2e8f0', wordBreak: 'break-all' }}>
                  {notaDestacada.chavedeacesso}
                </span>
              </div>
              <button
                type="button"
                className="btn-copy-chave"
                onClick={() => copiarChave(notaDestacada.chavedeacesso)}
                style={{ padding: '5px 10px', fontSize: '0.75rem' }}
              >
                📋 Copiar Chave
              </button>
            </div>
          )}

          {/* Barra de Ações Rápidas da Nota Destacada */}
          <div className="controle-destaque-actions">
            <button
              type="button"
              className={`btn-destaque-action ${notaDestacada.situacaoNota === 'Liberada' || notaDestacada.dataHoraLiberacao ? 'liberada' : ''}`}
              onClick={() => handleLiberarNota(notaDestacada)}
              style={
                notaDestacada.situacaoNota === 'Liberada' || notaDestacada.dataHoraLiberacao
                  ? {
                      background: 'rgba(16, 185, 129, 0.22)',
                      color: '#34d399',
                      border: '1px solid #10b981',
                      fontWeight: 800,
                    }
                  : {
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                    }
              }
              title={
                notaDestacada.dataHoraLiberacao
                  ? `Nota Liberada em ${formatarDataHoraEntrega(notaDestacada.dataHoraLiberacao)}. Clique para atualizar data/hora.`
                  : 'Fixar data e hora da liberação da nota'
              }
            >
              <span>{notaDestacada.situacaoNota === 'Liberada' || notaDestacada.dataHoraLiberacao ? '✅' : '🔓'}</span>
              Nota Liberada
            </button>

            <button
              type="button"
              className="btn-destaque-action ver"
              onClick={() => handleVerNota(notaDestacada)}
              title="Visualizar a DANFE anexada"
            >
              <span>👁️</span> Ver Nota
            </button>

            <button
              type="button"
              className="btn-destaque-action imprimir"
              onClick={() => handleImprimirNota(notaDestacada)}
              title="Imprimir a DANFE anexada do FSIST"
            >
              <span>🖨️</span> Imprimir Nota
            </button>

            <button
              type="button"
              className="btn-destaque-action anexar"
              onClick={() => {
                setNotaParaAnexar(notaDestacada);
                setModalAnexarDanfeAberto(true);
              }}
              title="Anexar ou substituir arquivo da DANFE baixado no FSIST"
            >
              <span>📎</span> {notaDestacada.anexoDanfe ? 'Trocar DANFE (FSIST)' : 'Anexar DANFE (FSIST)'}
            </button>

            <button
              type="button"
              className="btn-destaque-action edit"
              onClick={() => {
                setNotaParaEditar(notaDestacada);
                setModalInserirAberto(true);
              }}
              style={{
                background: '#27272a',
                color: '#e4e4e7',
                border: '1px solid #3f3f46',
              }}
              title="Editar dados da nota"
            >
              <span>✏️</span> Editar Dados
            </button>

            <button
              type="button"
              className="btn-destaque-action"
              onClick={() => handleAbrirModalExcluir(notaDestacada)}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.35)',
              }}
              title="Excluir Nota Fiscal"
            >
              <span>🗑️</span> Excluir Nota
            </button>

            <button
              type="button"
              className="btn-destaque-action fechar"
              onClick={() => setNotaDestacada(null)}
              style={{ marginLeft: 'auto' }}
            >
              ✕ Fechar Container
            </button>
          </div>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="controle-metrics-grid">
        <div className="metric-card-controle">
          <div className="metric-icon-box total">📑</div>
          <div className="metric-info">
            <h4>Total de Notas</h4>
            <div className="metric-value">{metricas.totalNotas}</div>
          </div>
        </div>

        <div className="metric-card-controle">
          <div className="metric-icon-box fornecedores">🏢</div>
          <div className="metric-info">
            <h4>Fornecedores</h4>
            <div className="metric-value">{metricas.totalFornecedores}</div>
          </div>
        </div>

        <div className="metric-card-controle">
          <div className="metric-icon-box hoje">📅</div>
          <div className="metric-info">
            <h4>Entregues Hoje</h4>
            <div className="metric-value">{metricas.entreguesHoje}</div>
          </div>
        </div>
      </div>

      {/* Grid de Cards de Todas as Notas Inseridas (Estrutura idêntica às Notas Fiscais) */}
      {notas.length === 0 ? (
        <div className="controle-empty-state">
          <div className="controle-empty-icon">📄</div>
          <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.15rem' }}>Nenhuma nota fiscal cadastrada</h3>
          <p style={{ margin: 0, maxWidth: '450px', fontSize: '0.88rem' }}>
            Clique no botão "➕ Inserir Nota" para registrar uma nova nota com validação automática de chave e fornecedor.
          </p>
          <button
            type="button"
            className="btn-inserir-controle"
            onClick={() => {
              setNotaParaEditar(null);
              setModalInserirAberto(true);
            }}
            style={{ marginTop: '8px' }}
          >
            <span>➕</span> Inserir Primeira Nota
          </button>
        </div>
      ) : notasFiltradas.length === 0 ? (
        <div className="controle-empty-state">
          <div className="controle-empty-icon">🔍</div>
          <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.15rem' }}>Nenhuma nota encontrada para a busca</h3>
          <p style={{ margin: 0, maxWidth: '450px', fontSize: '0.88rem' }}>
            Não encontramos nenhuma nota correspondente a "{buscaChaveOuNumero}". Verifique o termo ou limpe a pesquisa.
          </p>
          <button
            type="button"
            className="btn-buscar-nota-controle"
            onClick={() => {
              setBuscaChaveOuNumero('');
              setNotaDestacada(null);
            }}
            style={{ marginTop: '8px' }}
          >
            ✕ Limpar Pesquisa
          </button>
        </div>
      ) : (
        <div className="notas-cards-grid">
          {notasFiltradas.map((nota, index) => (
            <div
              key={nota.id}
              className="nota-card"
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              {/* Header do Card */}
              <div className="nota-card-header">
                <div className="header-left">
                  <span className="nota-number">
                    {nota.numero ? `NF #${nota.numero}` : `NF #${nota.id}`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span
                    className="badge"
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    🏢 {nota.filial || filialUsuario}
                  </span>
                  <span className="badge status-recebida">
                    {nota.status || 'Recebida'}
                  </span>
                  {nota.situacaoNota && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        ...getSituacaoBadgeStyle(nota.situacaoNota),
                      }}
                    >
                      {nota.situacaoNota === 'Liberada' ? '🟢 LIBERADA' : nota.situacaoNota.toUpperCase()}
                    </span>
                  )}
                  {nota.anexoDanfe ? (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                      }}
                      title={nota.anexoDanfe.nome || 'DANFE Anexada'}
                    >
                      📄 DANFE ANEXADA
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                      }}
                      title="Sem DANFE baixada no FSIST"
                    >
                      ⚠️ SEM DANFE
                    </span>
                  )}
                </div>
              </div>

              {/* Corpo do Card com Fornecedor, Valor e Detalhes */}
              <div className="nota-card-body">
                <div className="nota-main-info">
                  <span className="nota-cliente">
                    {nota.fornecedor || 'Fornecedor não informado'}
                  </span>
                  <span className="nota-valor">{formatCurrencyBRL(nota.valor || 0)}</span>
                </div>

                <div className="nota-details-grid">
                  {nota.cnpj && (
                    <div className="detail-item">
                      <span className="detail-label">CNPJ:</span>
                      <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {nota.cnpj}
                      </span>
                    </div>
                  )}

                  <div className="detail-item">
                    <span className="detail-label">Data de Emissão:</span>
                    <span className="detail-value">{formatDateBR(nota.dataEmissao)}</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Data/Hora Entrega:</span>
                    <span className="detail-value" style={{ color: '#fbbf24', fontWeight: 600 }}>
                      {formatarDataHoraEntrega(nota.dataHoraEntrega)}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Quem Recebeu:</span>
                    <span className="detail-value" style={{ color: '#60a5fa', fontWeight: 600 }}>
                      👤 {nota.quemRecebeu || 'Não especificado'}
                    </span>
                  </div>

                  {nota.situacaoNota && (
                    <div className="detail-item">
                      <span className="detail-label">Situação:</span>
                      <span
                        className="detail-value"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          width: 'fit-content',
                          ...getSituacaoBadgeStyle(nota.situacaoNota),
                        }}
                      >
                        📌 {nota.situacaoNota}
                      </span>
                    </div>
                  )}

                  {nota.dataHoraLiberacao && (
                    <div className="detail-item">
                      <span className="detail-label">Data/Hora Liberação:</span>
                      <span className="detail-value" style={{ color: '#34d399', fontWeight: 700 }}>
                        ✅ {formatarDataHoraEntrega(nota.dataHoraLiberacao)}
                      </span>
                    </div>
                  )}

                  {nota.responsavelLiberacao && (
                    <div className="detail-item">
                      <span className="detail-label">Resp. Liberação:</span>
                      <span className="detail-value" style={{ color: '#38bdf8', fontWeight: 600 }}>
                        👤 {nota.responsavelLiberacao}
                      </span>
                    </div>
                  )}

                  {nota.chavedeacesso && (
                    <div className="detail-item full-width">
                      <span className="detail-label">Chave de Acesso:</span>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span className="detail-value key-value">
                          {nota.chavedeacesso}
                        </span>
                        <button
                          type="button"
                          className="btn-copy-chave"
                          onClick={() => copiarChave(nota.chavedeacesso)}
                          title="Copiar Chave de Acesso"
                        >
                          📋 Copiar
                        </button>
                      </div>
                    </div>
                  )}

                  {nota.observacoes && (
                    <div className="detail-item full-width">
                      <span className="detail-label">Observações:</span>
                      <span className="detail-value" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {nota.observacoes}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rodapé do Card com os 4 Botões: Ver Nota, Nota Liberada, Editar Nota, Excluir Nota */}
              <div className="nota-card-footer">
                <button
                  type="button"
                  className="btn-card-action btn-ver-nota"
                  onClick={() => handleVerNota(nota)}
                  title="Visualizar a DANFE anexada da Nota"
                >
                  <span>👁️</span> Ver Nota
                </button>

                <button
                  type="button"
                  className={`btn-card-action btn-liberar-nota ${nota.situacaoNota === 'Liberada' || nota.dataHoraLiberacao ? 'liberada' : ''}`}
                  onClick={() => handleLiberarNota(nota)}
                  title={
                    nota.dataHoraLiberacao
                      ? `Nota Liberada em ${formatarDataHoraEntrega(nota.dataHoraLiberacao)} por ${nota.responsavelLiberacao || 'Responsável'}. Clique para atualizar data/hora.`
                      : 'Clique para fixar data e hora da liberação da nota'
                  }
                >
                  <span>{nota.situacaoNota === 'Liberada' || nota.dataHoraLiberacao ? '✅' : '🔓'}</span>
                  Nota Liberada
                </button>

                <button
                  type="button"
                  className="btn-card-action btn-editar-nota"
                  onClick={() => {
                    setNotaParaEditar(nota);
                    setModalInserirAberto(true);
                  }}
                  title="Editar dados da nota"
                >
                  <span>✏️</span> Editar Nota
                </button>

                <button
                  type="button"
                  className="btn-card-action btn-excluir-nota"
                  onClick={() => handleAbrirModalExcluir(nota)}
                  title="Excluir Nota Fiscal"
                >
                  <span>🗑️</span> Excluir Nota
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Principal de Inserção / Edição */}
      <ModalInserirControleNota
        isOpen={modalInserirAberto}
        onClose={() => {
          setModalInserirAberto(false);
          setNotaParaEditar(null);
        }}
        onSave={handleSalvarNota}
        notaParaEditar={notaParaEditar}
      />

      {/* Modal Direto de Cadastro de Fornecedor */}
      <ModalCadastrarFornecedor
        isOpen={modalCadastrarFornecedorAberto}
        onClose={() => setModalCadastrarFornecedorAberto(false)}
        onSave={(fornecedorSalvo) => {
          toast.success(`Fornecedor "${fornecedorSalvo.nome}" cadastrado com sucesso!`);
          setModalCadastrarFornecedorAberto(false);
        }}
      />

      {/* Modal de Visualização da DANFE / Documento */}
      <ModalVisualizadorDocumento
        isOpen={modalVisualizadorAberto}
        onClose={() => setModalVisualizadorAberto(false)}
        dataUrl={visualizadorConfig.dataUrl}
        nomeArquivo={visualizadorConfig.nomeArquivo}
        titulo={visualizadorConfig.titulo}
        subtitulo={visualizadorConfig.subtitulo}
      />

      {/* Modal Direto para Anexar/Substituir DANFE de Nota Existente */}
      <ModalAnexarDanfe
        isOpen={modalAnexarDanfeAberto}
        onClose={() => {
          setModalAnexarDanfeAberto(false);
          setNotaParaAnexar(null);
        }}
        onSaveAnexo={handleSalvarAnexoParaNota}
        chaveAcesso={notaParaAnexar?.chavedeacesso}
        fornecedor={notaParaAnexar?.fornecedor}
        numero={notaParaAnexar?.numero}
        anexoAtual={notaParaAnexar?.anexoDanfe}
      />

      {/* Modal de Confirmação de Exclusão com Alerta, Número da Nota e Quem Excluiu */}
      <ModalExcluirControleNota
        isOpen={modalExcluirAberto}
        onClose={() => {
          setModalExcluirAberto(false);
          setNotaParaExcluir(null);
        }}
        onConfirm={handleConfirmarExclusaoNota}
        nota={notaParaExcluir}
      />

      {/* Modal de Alerta Pós-Exclusão exibindo Número da Nota e Quem Excluiu */}
      <ModalAlertaNotaExcluida
        isOpen={modalAlertaExclusaoAberto}
        onClose={() => {
          setModalAlertaExclusaoAberto(false);
          setInfoNotaExcluida(null);
        }}
        infoExclusao={infoNotaExcluida}
      />

      {/* Modal de Seleção de Data para Consulta no Banco de Dados */}
      <ModalSelecionarDataRelatorio
        isOpen={modalSelecionarDataAberto}
        onClose={() => setModalSelecionarDataAberto(false)}
        onConfirm={(notasDoBanco, dataEscolhida) => {
          setNotasRelatorio(notasDoBanco || []);
          setDataRelatorio(dataEscolhida || '');
          setModalSelecionarDataAberto(false);
          setModalRelatorioAberto(true);
        }}
      />

      {/* Modal Oficial de Relatório de Notas (Cronológico por Hora de Chegada) */}
      <ModalRelatorioControleNotas
        isOpen={modalRelatorioAberto}
        onClose={() => setModalRelatorioAberto(false)}
        notas={notasRelatorio}
        dataReferencia={dataRelatorio}
      />
    </div>
  );
}
