// src/components/Modais/ModalStatusManutencao.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getUser } from '../../auth/auth';
import {
  salvarStatusSistema,
  TELAS_SISTEMA_CONFIG,
  GRUPOS_MANUTENCAO_VINCULADOS,
  resolverTelasVinculadasManutencao,
  obterGrupoVinculado,
} from '../../services/systemStatusService';
import '../Visual/modal.css';

export const OPCOES_TELAS = [
  'Prevenção de Perdas',
  'Controle de Uniformes',
  'Controle de Notas',
  'Notas Fiscais',
  'Gestão de Contas',
  'Gestão de Contratos',
  'Contrato Internet / Provedor',
  'Ordens de Serviço',
  'Fluxo de Caixa',
  'Controle de Estoque',
  'Central de Chamados',
  'Simulador de Créditos',
  'Dashboard Principal',
  'Painel Administrativo',
  'Geral do Sistema (Todas as Telas)',
];

export default function ModalStatusManutencao({ isOpen, onClose, currentStatus, onStatusChanged }) {
  const [emManutencao, setEmManutencao] = useState(false);
  const [telaPrincipal, setTelaPrincipal] = useState('Prevenção de Perdas');
  const [telasSelecionadas, setTelasSelecionadas] = useState(['Prevenção de Perdas', 'Controle de Uniformes', 'Controle de Notas']);
  const [telaPersonalizada, setTelaPersonalizada] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);

  const usuario = getUser();
  const nomeAdmin = usuario?.name || usuario?.nome || usuario?.email || 'Administrador';

  useEffect(() => {
    if (!isOpen) return;

    if (currentStatus) {
      setEmManutencao(Boolean(currentStatus.emManutencao));
      const telaRaw = String(currentStatus.tela || '').trim();

      if (telaRaw) {
        // Se houver múltiplas telas separadas por vírgula
        const listaTelas = telaRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

        if (listaTelas.length > 0) {
          const primeira = listaTelas[0];
          if (OPCOES_TELAS.includes(primeira)) {
            setTelaPrincipal(primeira);
          } else {
            setTelaPrincipal('Outra');
            setTelaPersonalizada(primeira);
          }

          // Resolve vínculos para todas as telas presentes
          const todasVinculadas = resolverTelasVinculadasManutencao(listaTelas);
          setTelasSelecionadas(todasVinculadas);
        } else {
          setTelaPrincipal('Prevenção de Perdas');
          setTelasSelecionadas(resolverTelasVinculadasManutencao('Prevenção de Perdas'));
        }
      } else {
        setTelaPrincipal('Prevenção de Perdas');
        setTelasSelecionadas(resolverTelasVinculadasManutencao('Prevenção de Perdas'));
        setTelaPersonalizada('');
      }
      setMensagem(currentStatus.mensagem || '');
    }
  }, [isOpen]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Trata a mudança da tela no select principal
  const handleSelecionarTela = (telaEscolhida) => {
    setTelaPrincipal(telaEscolhida);

    if (telaEscolhida === 'Outra') {
      setTelasSelecionadas(telaPersonalizada ? [telaPersonalizada] : []);
      return;
    }

    if (telaEscolhida === 'Geral do Sistema (Todas as Telas)') {
      setTelasSelecionadas(['Geral do Sistema (Todas as Telas)']);
      return;
    }

    // Se a tela escolhida pertencer a um grupo vinculado (ex: Prevenção -> Prevenção + Uniformes + Controle de Notas)
    const vinculadas = resolverTelasVinculadasManutencao(telaEscolhida);
    setTelasSelecionadas(vinculadas);
  };

  // Trata seleção direta de um Grupo Vinculado
  const handleSelecionarGrupo = (grupo) => {
    setTelaPrincipal(grupo.telas[0]);
    setTelasSelecionadas([...grupo.telas]);
  };

  // Trata alternância de checkbox individual
  const handleToggleTela = (nomeTela) => {
    // Se a tela pertence a um grupo, seleciona ou desmarca o grupo
    const grupo = obterGrupoVinculado(nomeTela);
    const telasDoGrupo = grupo ? grupo.telas : [nomeTela];

    const jaContem = telasDoGrupo.some((t) => telasSelecionadas.includes(t));

    if (jaContem) {
      const filtradas = telasSelecionadas.filter((t) => !telasDoGrupo.includes(t));
      setTelasSelecionadas(filtradas);
      if (filtradas.length > 0) {
        setTelaPrincipal(filtradas[0]);
      }
    } else {
      const novas = [...telasSelecionadas, ...telasDoGrupo];
      setTelasSelecionadas(Array.from(new Set(novas)));
      setTelaPrincipal(nomeTela);
    }
  };

  const handleSalvar = async (e) => {
    if (e) e.preventDefault();
    setSalvando(true);

    let telasFinais = [];
    if (emManutencao) {
      if (telaPrincipal === 'Outra') {
        const personalizada = telaPersonalizada.trim();
        telasFinais = personalizada ? [personalizada] : ['Outra Tela'];
      } else if (telaPrincipal === 'Geral do Sistema (Todas as Telas)') {
        telasFinais = ['Geral do Sistema (Todas as Telas)'];
      } else {
        telasFinais = telasSelecionadas.length > 0 ? telasSelecionadas : [telaPrincipal];
      }
    }

    const telaStringFinal = emManutencao ? telasFinais.join(', ') : '';

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
          `⚠️ Modo de manutenção ATIVADO para "${telaStringFinal}". Telas BLOQUEADAS para usuários comuns com aviso em tempo real.`
        );
      } else {
        toast.success(
          '🟢 Sistema restaurado para 100% Operacional & Online. O acesso de todos os usuários foi liberado!'
        );
      }

      onClose();
    } catch (err) {
      console.error(err);
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
      toast.success('🟢 Sistema restaurado para 100% Operacional & Online! O acesso de todos os usuários foi liberado.');
      onClose();
    } catch (err) {
      toast.error('Erro ao restaurar status.');
    } finally {
      setSalvando(false);
    }
  };

  const grupoAtivo = obterGrupoVinculado(telaPrincipal);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-box modal-md"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '94%', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            borderBottom: '1px solid #283340',
            paddingBottom: '10px',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚙️</span> Controle de Status & Manutenção do Sistema
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Alterne o status das telas e grupos correlacionados para ajustes simultâneos em tempo real.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Seletor de Estado Principal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div
              onClick={() => setEmManutencao(false)}
              style={{
                background: !emManutencao ? 'rgba(16, 185, 129, 0.15)' : '#181d24',
                border: !emManutencao ? '2px solid #10b981' : '1px solid #2d3748',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '22px', marginBottom: '4px' }}>🟢</div>
              <strong style={{ color: !emManutencao ? '#34d399' : '#cbd5e1', fontSize: '13px', display: 'block' }}>
                Operacional & Online
              </strong>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Todas as telas liberadas</span>
            </div>

            <div
              onClick={() => setEmManutencao(true)}
              style={{
                background: emManutencao ? 'rgba(245, 158, 11, 0.18)' : '#181d24',
                border: emManutencao ? '2px solid #f59e0b' : '1px solid #2d3748',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '22px', marginBottom: '4px' }}>🟡</div>
              <strong style={{ color: emManutencao ? '#fbbf24' : '#cbd5e1', fontSize: '13px', display: 'block' }}>
                Manutenção / Ajustes
              </strong>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Bloqueia telas selecionadas</span>
            </div>
          </div>

          {/* Configurações de Manutenção */}
          {emManutencao && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* 1. Atalhos de Grupos Vinculados Simultâneos */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#fef08a', textTransform: 'uppercase' }}>
                  🔗 Grupos com Ajustes Simultâneos (Clique para ativar o grupo):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', marginTop: '6px' }}>
                  {GRUPOS_MANUTENCAO_VINCULADOS.map((g) => {
                    const isGrupoSelecionado = g.telas.every((t) => telasSelecionadas.includes(t));
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelecionarGrupo(g)}
                        style={{
                          background: isGrupoSelecionado ? 'rgba(56, 189, 248, 0.22)' : '#111827',
                          border: isGrupoSelecionado ? '1.5px solid #38bdf8' : '1px solid #1e293b',
                          color: isGrupoSelecionado ? '#38bdf8' : '#e2e8f0',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <span>🔗 {g.nome}</span>
                          <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 500 }}>
                            {g.telas.join(' • ')}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isGrupoSelecionado ? '#0284c7' : '#1e293b',
                            color: '#fff',
                          }}
                        >
                          {isGrupoSelecionado ? '✓ Ativo' : 'Selecionar Grupo'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Seletor de Tela Principal */}
              <div className="form-row">
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#fef08a' }}>
                  Selecione a Tela Principal ou Módulo:
                </label>
                <select
                  value={telaPrincipal}
                  onChange={(e) => handleSelecionarTela(e.target.value)}
                  style={{ height: '36px', fontSize: '13px', borderRadius: '6px', background: '#0f172a', color: '#fff' }}
                >
                  <optgroup label="📋 Telas com Vínculo Simultâneo">
                    <option value="Prevenção de Perdas">🛡️ Prevenção de Perdas (Vinculada com Uniformes e Controle de Notas)</option>
                    <option value="Controle de Uniformes">👔 Controle de Uniformes (Vinculada com Prevenção e Controle de Notas)</option>
                    <option value="Controle de Notas">📋 Controle de Notas (Vinculada com Prevenção e Uniformes)</option>
                    <option value="Notas Fiscais">📑 Notas Fiscais (Vinculada com Gestão de Contas)</option>
                    <option value="Gestão de Contas">💳 Gestão de Contas (Vinculada com Notas Fiscais)</option>
                    <option value="Gestão de Contratos">📝 Gestão de Contratos (Vinculada com Internet e OS)</option>
                    <option value="Contrato Internet / Provedor">🌐 Contrato Internet / Provedor (Vinculada com Contratos e OS)</option>
                    <option value="Ordens de Serviço">🛠️ Ordens de Serviço (Vinculada com Contratos e Internet)</option>
                  </optgroup>
                  <optgroup label="📄 Telas Individuais">
                    <option value="Fluxo de Caixa">📈 Fluxo de Caixa (Individual)</option>
                    <option value="Controle de Estoque">📦 Controle de Estoque (Individual)</option>
                    <option value="Central de Chamados">🎧 Central de Chamados (Individual)</option>
                    <option value="Simulador de Créditos">🧮 Simulador de Créditos (Individual)</option>
                    <option value="Dashboard Principal">📊 Dashboard Principal (Individual)</option>
                    <option value="Painel Administrativo">⚙️ Painel Administrativo (Individual)</option>
                    <option value="Geral do Sistema (Todas as Telas)">🚨 Geral do Sistema (Todas as Telas)</option>
                  </optgroup>
                  <option value="Outra">✏️ Outra tela / Digitação livre...</option>
                </select>
              </div>

              {telaPrincipal === 'Outra' && (
                <div className="form-row">
                  <label style={{ fontSize: '12px', color: '#fef08a' }}>Nome da Tela Personalizada:</label>
                  <input
                    type="text"
                    placeholder="Ex: Módulo de Relatórios Gerenciais"
                    value={telaPersonalizada}
                    onChange={(e) => {
                      setTelaPersonalizada(e.target.value);
                      setTelasSelecionadas([e.target.value]);
                    }}
                    style={{ height: '36px', fontSize: '13px' }}
                    required
                  />
                </div>
              )}

              {/* 3. Painel de Telas que ficarão em Manutenção */}
              {telaPrincipal !== 'Outra' && telaPrincipal !== 'Geral do Sistema (Todas as Telas)' && (
                <div
                  style={{
                    background: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Telas que ficarão bloqueadas para os usuários:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {telasSelecionadas.map((t) => (
                      <span
                        key={t}
                        style={{
                          background: 'rgba(234, 179, 8, 0.18)',
                          color: '#fbbf24',
                          border: '1px solid rgba(234, 179, 8, 0.4)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        ⚠️ {t}
                      </span>
                    ))}
                  </div>

                  {grupoAtivo && (
                    <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '6px', fontStyle: 'italic' }}>
                      ℹ️ <strong>Grupo Vinculado:</strong> Ao colocar <strong>{telaPrincipal}</strong> em manutenção,
                      as telas correlacionadas ({grupoAtivo.telas.filter((x) => x !== telaPrincipal).join(', ')}) são
                      automaticamente sincronizadas em manutenção conjunta.
                    </div>
                  )}
                </div>
              )}

              {/* 4. Descrição do Ajuste */}
              <div className="form-row">
                <label style={{ fontSize: '12px', color: '#fef08a' }}>
                  Descrição do Ajuste / Mensagem aos Usuários (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aplicando melhorias na rotina de notas e relatórios."
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  style={{ height: '36px', fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          {/* Rodapé de Ações */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            {emManutencao ? (
              <button
                type="button"
                onClick={handleRestaurarOnline}
                disabled={salvando}
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  color: '#34d399',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🟢 Concluir Manutenção e Liberar Sistema
              </button>
            ) : (
              <div></div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={salvando}
                style={{
                  background: '#242b35',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="salve"
                disabled={salvando}
                style={{
                  padding: '8px 18px',
                  fontSize: '12.5px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {salvando ? 'Salvando...' : '💾 Salvar Status'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
