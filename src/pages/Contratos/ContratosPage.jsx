// src/pages/Contratos/ContratosPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import ModalContrato from '../../components/Modais/ModalContrato';
import ModalExcluirContrato from '../../components/Modais/ModalExcluirContrato';
import {
  listarContratos,
  salvarContrato,
  atualizarContrato,
  excluirContrato,
} from '../../services/contratosService';
import { toast } from 'react-toastify';
import { logEvent } from '../../utils/logger';
import { sendTelegramEvent, formatCurrencyBRL, formatDateBR } from '../../utils/telegram';
import { gerarContratoServicosPDF } from '../../utils/gerarContratoServicosPDF';
import { FaEdit, FaTrash, FaFileAlt, FaThLarge, FaList, FaFileContract, FaPlus } from 'react-icons/fa';
import '../../components/Visual/contas.css';
import '../../components/Visual/contratos.css';

const POLL_INTERVAL = 4000;

export default function ContratosPage() {
  const [contratos, setContratos] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [contratoSelecionado, setContratoSelecionado] = useState(null);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [contratoParaExcluir, setContratoParaExcluir] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modoVisualizacao, setModoVisualizacao] = useState('cards'); // 'cards' | 'tabela'

  const pendentesRef = useRef({});
  const lastUpdateIdRef = useRef(0);

  useEffect(() => {
    carregarContratos();
  }, []);

  const carregarContratos = () => {
    try {
      const dados = listarContratos() || [];
      setContratos(dados);
    } catch (e) {
      console.error('Erro ao carregar contratos:', e);
      setContratos([]);
    }
  };

  const tgBase = () => {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    return token ? `https://api.telegram.org/bot${token}` : '';
  };

  const tgSendRaw = async (texto, replyMarkupObj) => {
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    const base = tgBase();

    if (!base || !chatId) return;

    const url = `${base}/sendMessage`;
    const params = {
      chat_id: String(chatId),
      text: texto,
      parse_mode: 'HTML',
    };

    if (replyMarkupObj) {
      params.reply_markup = JSON.stringify(replyMarkupObj);
    }

    const body = new URLSearchParams(params).toString();
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  };

  const checarRespostaTelegram = async (requestId) => {
    const base = tgBase();
    if (!base) return null;

    try {
      const url = `${base}/getUpdates?offset=${lastUpdateIdRef.current + 1}`;
      const resp = await fetch(url);
      const json = await resp.json();

      if (!json.ok) return null;

      for (const upd of json.result) {
        if (upd.update_id > lastUpdateIdRef.current) {
          lastUpdateIdRef.current = upd.update_id;
        }

        const data = upd?.callback_query?.data;
        if (data === `contrato:aprovar:${requestId}`) return 'aprovado';
        if (data === `contrato:negar:${requestId}`) return 'negado';
      }
    } catch {
      return null;
    }

    return null;
  };

  const iniciarPolling = (requestId, contratoId) => {
    const loop = async () => {
      const r = await checarRespostaTelegram(requestId);

      if (r === 'aprovado') {
        excluirContrato(contratoId);
        toast.success('Exclusão do Contrato Aprovada!');

        logEvent({
          type: 'contratos',
          title: 'Contrato excluído com aprovação',
          details: { id: contratoId },
        });

        carregarContratos();
        return;
      }

      if (r === 'negado') {
        toast.warn('Exclusão do Contrato foi Recusada.');
        carregarContratos();
        return;
      }

      pendentesRef.current[requestId] = setTimeout(loop, POLL_INTERVAL);
    };

    loop();
  };

  const abrirModalExclusao = (contrato) => {
    setContratoParaExcluir(contrato);
    setModalExcluirAberto(true);
  };

  const handleConfirmarExclusao = async (motivo) => {
    if (!contratoParaExcluir) return;

    try {
      excluirContrato(contratoParaExcluir.id);
      toast.success(`Contrato de "${contratoParaExcluir.parceiro || 'Parceiro'}" encerrado e excluído com sucesso!`);

      logEvent({
        type: 'contratos',
        title: 'Contrato excluído',
        details: {
          id: contratoParaExcluir.id,
          parceiro: contratoParaExcluir.parceiro,
          motivo: motivo || 'Encerramento confirmado pelo usuário',
        },
      });

      // Notifica no Telegram para histórico e auditoria
      sendTelegramEvent({
        title: 'Contrato Encerrado / Excluído',
        emoji: '🗑️',
        lines: [
          `Parceiro: ${contratoParaExcluir.parceiro || '-'}`,
          `Descrição: ${contratoParaExcluir.descricao || '-'}`,
          `Valor: ${formatCurrencyBRL(contratoParaExcluir.valor)}`,
          `Motivo: ${motivo || 'Encerramento no sistema'}`,
          `Data: ${new Date().toLocaleString('pt-BR')}`,
        ],
      }).catch((e) => console.warn('Aviso ao notificar exclusão no Telegram:', e));

      setModalExcluirAberto(false);
      setContratoParaExcluir(null);
      carregarContratos();
    } catch (err) {
      console.error('Erro ao excluir contrato:', err);
      toast.error('Erro ao excluir contrato.');
    }
  };

  const handleSalvar = (contrato) => {
    try {
      if (contrato.id) {
        atualizarContrato(contrato);
        toast.success('Contrato atualizado com sucesso!');
        logEvent({
          type: 'contratos',
          title: 'Contrato atualizado',
          details: { id: contrato.id, parceiro: contrato.parceiro },
        });
      } else {
        salvarContrato(contrato);
        toast.success('Novo contrato cadastrado com sucesso!');
        logEvent({
          type: 'contratos',
          title: 'Contrato criado',
          details: { parceiro: contrato.parceiro },
        });
      }

      carregarContratos();
      setModalAberto(false);
      setContratoSelecionado(null);
    } catch (e) {
      console.error('Erro ao salvar contrato:', e);
      toast.error('Erro ao salvar contrato.');
    }
  };

  const handleEditar = (contrato) => {
    setContratoSelecionado(contrato);
    setModalAberto(true);
  };

  const handleGerarPDF = (contrato) => {
    try {
      gerarContratoServicosPDF(contrato);
      toast.success(`PDF do contrato de "${contrato.parceiro || 'Cliente'}" gerado!`);
    } catch (e) {
      console.error('Erro ao gerar PDF do contrato:', e);
      toast.error('Erro ao gerar PDF do contrato.');
    }
  };

  const totalValor = contratos.reduce((acc, c) => acc + Number(c.valor || 0), 0);
  const contratosFiltrados = contratos.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.parceiro?.toLowerCase().includes(term) ||
      c.descricao?.toLowerCase().includes(term) ||
      c.dadosContratante?.cnpj?.toLowerCase().includes(term) ||
      c.dadosContratante?.cpf?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="page-container fade-in-page">
      {/* Header */}
      <div className="notas-header-bar" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ color: '#00d2ff', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
            📝 Gestão de Contratos
          </h1>
          <p className="page-subtitle" style={{ color: '#8a94a6', fontSize: '0.95rem', marginTop: '4px' }}>
            Acompanhamento de contratos com clientes, prestadores de serviço e parceiros.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-nova-conta"
            onClick={() => {
              setContratoSelecionado(null);
              setModalAberto(true);
            }}
          >
            <FaPlus size={12} style={{ marginRight: '6px' }} /> Novo Contrato
          </button>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div className="notas-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #00d2ff' }}>
          <div className="stat-icon" style={{ background: 'rgba(0, 210, 255, 0.15)', color: '#00d2ff' }}>
            📄
          </div>
          <div className="stat-data">
            <span className="stat-title">Total de Contratos</span>
            <span className="stat-value">{contratos.length}</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            💰
          </div>
          <div className="stat-data">
            <span className="stat-title">Valor Total Contratado</span>
            <span className="stat-value" style={{ color: '#10b981' }}>
              {formatCurrencyBRL(totalValor)}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Controles e Pesquisa */}
      <div className="contratos-control-bar">
        <input
          type="text"
          placeholder="🔍 Pesquisar por parceiro, cliente, CNPJ ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="contratos-search-input"
        />

        <div className="contratos-view-toggle">
          <button
            type="button"
            className={`btn-toggle-view ${modoVisualizacao === 'cards' ? 'active' : ''}`}
            onClick={() => setModoVisualizacao('cards')}
            title="Visualização em Containers/Cards (Padrão de Contas)"
          >
            <FaThLarge size={13} /> Cards
          </button>
          <button
            type="button"
            className={`btn-toggle-view ${modoVisualizacao === 'tabela' ? 'active' : ''}`}
            onClick={() => setModoVisualizacao('tabela')}
            title="Visualização em Tabela"
          >
            <FaList size={13} /> Tabela
          </button>
        </div>
      </div>

      {/* Renderização em Containers (Cards estilo Contas) */}
      {modoVisualizacao === 'cards' ? (
        <div className="contas-lista contratos-lista no-print">
          {contratosFiltrados.length === 0 ? (
            <div className="contratos-empty-state">
              <div className="contratos-empty-icon">📂</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#f1f5f9' }}>Nenhum contrato encontrado</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                {searchTerm
                  ? 'Nenhum contrato corresponde aos termos pesquisados.'
                  : 'Cadastre seu primeiro contrato clicando no botão "+ Novo Contrato".'}
              </p>
            </div>
          ) : (
            contratosFiltrados.map((c, index) => (
              <div
                key={c.id}
                className="conta-card contrato-card card-slide-in"
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                {/* Cabeçalho do Card */}
                <div className="conta-card-header contrato-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge-tipo receber contrato-badge-tipo">
                      <FaFileContract size={11} /> Contrato de Serviço
                    </span>
                    <span className="contrato-codigo-tag" title="Identificador do Contrato">
                      #{String(c.id).padStart(4, '0')}
                    </span>
                  </div>
                  <span className="badge-status pago contrato-badge-status">
                    Vigente
                  </span>
                </div>

                {/* Corpo do Card */}
                <div className="conta-card-body contrato-card-body">
                  <h3>
                    <span>{c.parceiro || c.dadosContratante?.razaoSocial || c.dadosContratante?.nome || 'Cliente / Parceiro'}</span>
                  </h3>

                  {(c.dadosContratante?.cnpj || c.dadosContratante?.cpf) && (
                    <p className="contrato-doc-info">
                      <strong>Doc:</strong> {c.dadosContratante.cnpj || c.dadosContratante.cpf}
                    </p>
                  )}

                  <div className="contrato-desc-box" title={c.descricao || c.objetoServico}>
                    <strong>Objeto:</strong> {c.descricao || c.objetoServico || 'Prestação de Serviços Especializados'}
                  </div>

                  <div className="contrato-info-row">
                    <strong>Valor:</strong>
                    <span className="contrato-valor-destaque">
                      {formatCurrencyBRL(c.valor)}
                    </span>
                  </div>

                  <div className="contrato-info-row">
                    <strong>Pagamento:</strong>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                      {c.tipoPagamento === 'mensal' ? '📅 Mensalidade' : '💼 Pagamento Fixo'}
                    </span>
                  </div>

                  <div className="contrato-info-row">
                    <strong>Vencimento:</strong>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                      {formatDateBR(c.vencimento)}
                    </span>
                  </div>

                  {/* Pills com detalhes extras do contrato */}
                  <div className="contrato-pills-row">
                    <span className="contrato-pill">
                      ⏳ {c.vigenciaMeses ? `${c.vigenciaMeses} meses` : '12 meses'} vigência
                    </span>
                    {c.formaPagamento && (
                      <span className="contrato-pill">
                        💳 {c.formaPagamento.toUpperCase()}
                      </span>
                    )}
                    {(c.cidadeForo || c.estadoForo) && (
                      <span className="contrato-pill">
                        🏛️ {c.cidadeForo || 'Tangará da Serra'}-{c.estadoForo || 'MT'}
                      </span>
                    )}
                    {c.dadosContratante?.telefone && (
                      <span className="contrato-pill">
                        📞 {c.dadosContratante.telefone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ações do Card: os 3 botões solicitados */}
                <div className="conta-card-actions contrato-card-actions">
                  <div className="contrato-actions-row">
                    <button
                      type="button"
                      className="btn-visualizar-contrato"
                      onClick={() => handleGerarPDF(c)}
                      title="Visualizar e Baixar PDF Oficial do Contrato"
                    >
                      <FaFileAlt size={13} /> Visualizar Contrato
                    </button>

                    <button
                      type="button"
                      className="btn-editar-contrato"
                      onClick={() => handleEditar(c)}
                      title="Editar Dados do Contrato"
                    >
                      <FaEdit size={13} /> Editar Contrato
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn-encerrar-contrato"
                    onClick={() => abrirModalExclusao(c)}
                    title="Encerrar Contrato e Excluir do Sistema"
                  >
                    <FaTrash size={12} /> Encerrar Contrato (excluir)
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Visualização em Tabela (opção secundária) */
        <div className="table-responsive" style={{ background: '#181d24', borderRadius: '10px', border: '1px solid #283340', overflow: 'hidden' }}>
          <table className="contasTable" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1e2632', borderBottom: '1px solid #2d3748' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Parceiro / Cliente</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Descrição</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Valor</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Vencimento</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contratosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Nenhum contrato cadastrado ou encontrado.
                  </td>
                </tr>
              ) : (
                contratosFiltrados.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f1f5f9' }}>
                      {c.parceiro || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                      {c.descricao || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#10b981' }}>
                      {formatCurrencyBRL(c.valor)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                      {formatDateBR(c.vencimento)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-visualizar-contrato"
                          onClick={() => handleGerarPDF(c)}
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          title="Visualizar Contrato"
                        >
                          <FaFileAlt size={12} /> Visualizar Contrato
                        </button>
                        <button
                          type="button"
                          className="btn-editar-contrato"
                          onClick={() => handleEditar(c)}
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          title="Editar Contrato"
                        >
                          <FaEdit size={12} /> Editar Contrato
                        </button>
                        <button
                          type="button"
                          className="btn-encerrar-contrato"
                          onClick={() => abrirModalExclusao(c)}
                          style={{ padding: '5px 10px', fontSize: '12px', width: 'auto' }}
                          title="Encerrar Contrato (excluir)"
                        >
                          <FaTrash size={12} /> Encerrar Contrato (excluir)
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Criação e Edição de Contrato */}
      <ModalContrato
        isOpen={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setContratoSelecionado(null);
        }}
        onSave={handleSalvar}
        contratoParaEditar={contratoSelecionado}
      />

      {/* Modal Nativo do Sistema para Confirmação de Exclusão/Encerramento */}
      <ModalExcluirContrato
        isOpen={modalExcluirAberto}
        onClose={() => {
          setModalExcluirAberto(false);
          setContratoParaExcluir(null);
        }}
        onConfirm={handleConfirmarExclusao}
        contrato={contratoParaExcluir}
      />
    </div>
  );
}