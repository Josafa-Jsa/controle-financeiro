// src/components/Modais/ModalStatusManutencao.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { getUser } from '../../auth/auth';
import {
  salvarStatusSistema,
  TELAS_SISTEMA_CONFIG,
  isManutencaoGeral,
} from '../../services/systemStatusService';
import '../Visual/modal.css';

export default function ModalStatusManutencao({ isOpen, onClose, currentStatus, onStatusChanged }) {
  const [emManutencao, setEmManutencao] = useState(false);
  const [telasSelecionadas, setTelasSelecionadas] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);
  const hasInitializedRef = useRef(false);

  const usuario = getUser();
  const nomeAdmin = usuario?.name || usuario?.nome || usuario?.email || 'Administrador';

  // Todas as telas disponíveis no sistema
  const todasAsTelas = useMemo(() => TELAS_SISTEMA_CONFIG.map((t) => t.nome), []);

  // Inicializa o estado do modal SOMENTE no momento em que ele é aberto,
  // impedindo que o polling de segundo plano feche ou limpe as seleções do usuário
  useEffect(() => {
    if (isOpen) {
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        const status = currentStatus || {};
        const estaAtivo = Boolean(status.emManutencao);
        setEmManutencao(estaAtivo);

        const telaRaw = String(status.tela || '').trim();

        if (estaAtivo && telaRaw) {
          if (isManutencaoGeral(status) || telaRaw.toLowerCase().includes('todas as telas') || telaRaw === '*') {
            setTelasSelecionadas([...todasAsTelas]);
          } else {
            const listaCarregada = telaRaw
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean);

            // Normaliza os nomes para corresponderem exatamente aos cadastrados em TELAS_SISTEMA_CONFIG
            const mapeadas = [];
            listaCarregada.forEach((item) => {
              const itemLower = item.toLowerCase();
              const config = TELAS_SISTEMA_CONFIG.find(
                (c) =>
                  c.nome.toLowerCase() === itemLower ||
                  c.key.toLowerCase() === itemLower ||
                  (c.aliases || []).some((a) => a.toLowerCase() === itemLower)
              );
              if (config) {
                if (!mapeadas.includes(config.nome)) mapeadas.push(config.nome);
              } else if (item.length > 0) {
                if (!mapeadas.includes(item)) mapeadas.push(item);
              }
            });

            setTelasSelecionadas(mapeadas.length > 0 ? mapeadas : ['Notas Fiscais', 'Gestão de Contas']);
          }
        } else {
          setTelasSelecionadas([]);
        }

        setMensagem(status.mensagem || '');
      }
    } else {
      hasInitializedRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && !salvando && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, salvando, onClose]);

  if (!isOpen) return null;

  const todasEstaoSelecionadas = todasAsTelas.length > 0 && todasAsTelas.every((t) => telasSelecionadas.includes(t));
  const nenhumaSelecionada = telasSelecionadas.length === 0;

  // Alterna uma tela individual
  const handleToggleTela = (nomeTela) => {
    if (telasSelecionadas.includes(nomeTela)) {
      setTelasSelecionadas(telasSelecionadas.filter((t) => t !== nomeTela));
    } else {
      setTelasSelecionadas([...telasSelecionadas, nomeTela]);
    }
  };

  // Alterna selecionar/desmarcar todas as telas
  const handleToggleTodas = () => {
    if (todasEstaoSelecionadas) {
      setTelasSelecionadas([]);
    } else {
      setTelasSelecionadas([...todasAsTelas]);
    }
  };

  // Limpa todas
  const handleLimparSelecao = () => {
    setTelasSelecionadas([]);
  };

  const handleSalvar = async (e) => {
    if (e) e.preventDefault();

    if (emManutencao && telasSelecionadas.length === 0) {
      toast.warn('Por favor, selecione ao menos uma tela para colocar em manutenção ou marque "Operacional & Online".');
      return;
    }

    setSalvando(true);

    let telaStringFinal = '';
    if (emManutencao) {
      if (todasEstaoSelecionadas) {
        telaStringFinal = 'Geral do Sistema (Todas as Telas)';
      } else {
        telaStringFinal = telasSelecionadas.join(', ');
      }
    }

    const payload = {
      emManutencao,
      tela: telaStringFinal,
      mensagem: emManutencao ? mensagem.trim() : '',
      tipo: 'ajuste',
    };

    try {
      const atualizado = await salvarStatusSistema(payload, nomeAdmin);
      if (onStatusChanged) onStatusChanged(atualizado);

      if (emManutencao) {
        toast.warn(
          `⚠️ Modo de manutenção ATIVADO para: ${telaStringFinal}. Apenas as telas selecionadas foram bloqueadas para operadores.`
        );
      } else {
        toast.success(
          '🟢 Sistema 100% Operacional & Online. Todas as telas foram liberadas!'
        );
      }

      onClose();
    } catch (err) {
      console.error('Erro ao salvar status do sistema:', err);
      toast.error('Erro ao salvar status do sistema.');
    } finally {
      setSalvando(false);
    }
  };

  const handleRestaurarOnline = async () => {
    setSalvando(true);
    const payload = {
      emManutencao: false,
      tela: '',
      mensagem: '',
      tipo: 'ajuste',
    };

    try {
      const atualizado = await salvarStatusSistema(payload, nomeAdmin);
      if (onStatusChanged) onStatusChanged(atualizado);
      setEmManutencao(false);
      setTelasSelecionadas([]);
      toast.success('🟢 Sistema restaurado para 100% Operacional & Online! O acesso de todas as telas foi liberado.');
      onClose();
    } catch (err) {
      console.error('Erro ao restaurar status:', err);
      toast.error('Erro ao restaurar status online.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" style={{ zIndex: 999999 }}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '860px',
          width: '95%',
          maxHeight: '96vh',
          overflowY: 'auto',
          backgroundColor: '#11151e',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '14px 18px',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.9)',
          boxSizing: 'border-box',
        }}
      >
        {/* Cabeçalho Compacto */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚙️</span>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  color: '#f8fafc',
                  fontWeight: 800,
                  lineHeight: 1.2,
                }}
              >
                Controle de Status & Manutenção do Sistema
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Marque individualmente as telas para manutenção ou selecione todas com 1 clique.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.1rem',
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: '6px',
              lineHeight: 1,
            }}
            title="Fechar (ESC)"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Seletor de Modo: Operacional vs Manutenção (Compacto lado a lado) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div
              onClick={() => setEmManutencao(false)}
              style={{
                background: !emManutencao ? 'rgba(16, 185, 129, 0.15)' : '#0b0f17',
                border: !emManutencao ? '1.5px solid #10b981' : '1px solid #1e293b',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '20px' }}>🟢</div>
              <div style={{ textAlign: 'left' }}>
                <strong style={{ color: !emManutencao ? '#34d399' : '#cbd5e1', fontSize: '0.88rem', display: 'block' }}>
                  Operacional & Online
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Todas as telas 100% liberadas</span>
              </div>
            </div>

            <div
              onClick={() => {
                setEmManutencao(true);
                if (telasSelecionadas.length === 0) {
                  setTelasSelecionadas(['Notas Fiscais', 'Gestão de Contas']);
                }
              }}
              style={{
                background: emManutencao ? 'rgba(245, 158, 11, 0.15)' : '#0b0f17',
                border: emManutencao ? '1.5px solid #f59e0b' : '1px solid #1e293b',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '20px' }}>🟡</div>
              <div style={{ textAlign: 'left' }}>
                <strong style={{ color: emManutencao ? '#fbbf24' : '#cbd5e1', fontSize: '0.88rem', display: 'block' }}>
                  Manutenção / Ajustes
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Bloqueia telas selecionadas</span>
              </div>
            </div>
          </div>

          {/* Painel de Seleção de Telas */}
          {emManutencao && (
            <div
              style={{
                background: '#090d16',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {/* Barra de Controle Geral: Selecionar Todas + Contador */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '6px 10px',
                }}
              >
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={todasEstaoSelecionadas}
                    onChange={handleToggleTodas}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#f59e0b',
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fef08a' }}>
                    ☑️ Selecionar Todas as Telas do Sistema
                  </span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: telasSelecionadas.length > 0 ? 'rgba(245, 158, 11, 0.2)' : '#1f2937',
                      color: telasSelecionadas.length > 0 ? '#fbbf24' : '#94a3b8',
                      border: telasSelecionadas.length > 0 ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #374151',
                    }}
                  >
                    {telasSelecionadas.length}/{todasAsTelas.length} marcadas
                  </span>

                  {telasSelecionadas.length > 0 && (
                    <button
                      type="button"
                      onClick={handleLimparSelecao}
                      style={{
                        background: 'transparent',
                        border: '1px solid #475569',
                        color: '#94a3b8',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Desmarcar todas"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Grid Compacto das 14 Telas em 3 a 4 Colunas */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
                  gap: '6px',
                }}
              >
                {TELAS_SISTEMA_CONFIG.map((tela) => {
                  const isSelecionada = telasSelecionadas.includes(tela.nome);

                  return (
                    <div
                      key={tela.key}
                      onClick={() => handleToggleTela(tela.nome)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        backgroundColor: isSelecionada ? 'rgba(245, 158, 11, 0.16)' : '#111827',
                        border: isSelecionada ? '1px solid #f59e0b' : '1px solid #1f2937',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelecionada}
                        onChange={() => {}}
                        style={{
                          width: '14px',
                          height: '14px',
                          accentColor: '#f59e0b',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      />

                      <span style={{ fontSize: '13px', flexShrink: 0 }}>{tela.icon}</span>

                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: isSelecionada ? 800 : 600,
                            color: isSelecionada ? '#fbbf24' : '#e2e8f0',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={tela.nome}
                        >
                          {tela.nome}
                        </div>
                      </div>

                      {isSelecionada && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(245, 158, 11, 0.3)',
                            color: '#fbbf24',
                            flexShrink: 0,
                          }}
                        >
                          Ajuste
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Linha de Resumo Rápido das Telas Bloqueadas */}
              {telasSelecionadas.length > 0 ? (
                <div
                  style={{
                    backgroundColor: '#0c121e',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, flexShrink: 0 }}>
                    🔒 Bloqueadas ({telasSelecionadas.length}):
                  </span>
                  <div style={{ display: 'inline-flex', gap: '4px', flexWrap: 'wrap' }}>
                    {telasSelecionadas.map((nome) => {
                      const cfg = TELAS_SISTEMA_CONFIG.find((t) => t.nome === nome);
                      return (
                        <span
                          key={nome}
                          style={{
                            backgroundColor: 'rgba(245, 158, 11, 0.18)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <span>{cfg?.icon || '⚠️'}</span> {nome}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '6px',
                    padding: '5px 8px',
                    color: '#f87171',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                  }}
                >
                  ⚠️ Nenhuma tela selecionada. Marque as caixinhas acima ou alterne para "Operacional & Online".
                </div>
              )}

              {/* Mensagem Opcional de Aviso */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  💬 Mensagem (Opcional):
                </span>
                <input
                  type="text"
                  placeholder="Ex: Realizando ajustes técnicos..."
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  style={{
                    flex: 1,
                    height: '30px',
                    padding: '0 8px',
                    borderRadius: '5px',
                    border: '1px solid #334155',
                    backgroundColor: '#111827',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Rodapé de Ações Compacto */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #1e293b',
              paddingTop: '8px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {emManutencao ? (
              <button
                type="button"
                onClick={handleRestaurarOnline}
                disabled={salvando}
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid #10b981',
                  color: '#34d399',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🟢</span> Liberar Sistema Inteiro
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={salvando}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={salvando}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  padding: '6px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: salvando ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
                }}
              >
                {salvando ? '💾 Salvando...' : '💾 Salvar Status'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
