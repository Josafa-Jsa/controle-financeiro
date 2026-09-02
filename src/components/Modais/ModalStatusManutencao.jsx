// src/components/Modais/ModalStatusManutencao.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getUser } from '../../auth/auth';
import { salvarStatusSistema } from '../../services/systemStatusService';
import '../Visual/modal.css';

const OPCOES_TELAS = [
  'Prevenção de Perdas',
  'Gestão de Contas',
  'Notas Fiscais',
  'Ordens de Serviço',
  'Controle de Estoque',
  'Central de Chamados',
  'Simulador de Créditos',
  'Gestão de Contratos',
  'Painel Administrativo',
  'Geral do Sistema (Todas as Telas)',
];

export default function ModalStatusManutencao({ isOpen, onClose, currentStatus, onStatusChanged }) {
  const [emManutencao, setEmManutencao] = useState(false);
  const [tela, setTela] = useState('Prevenção de Perdas');
  const [telaPersonalizada, setTelaPersonalizada] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);

  const usuario = getUser();
  const nomeAdmin = usuario?.name || usuario?.nome || usuario?.email || 'Administrador';

  useEffect(() => {
    if (!isOpen) return;

    if (currentStatus) {
      setEmManutencao(Boolean(currentStatus.emManutencao));
      if (OPCOES_TELAS.includes(currentStatus.tela)) {
        setTela(currentStatus.tela);
        setTelaPersonalizada('');
      } else if (currentStatus.tela) {
        setTela('Outra');
        setTelaPersonalizada(currentStatus.tela);
      } else {
        setTela('Prevenção de Perdas');
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

  const handleSalvar = async (e) => {
    if (e) e.preventDefault();
    setSalvando(true);

    const telaFinal = emManutencao ? (tela === 'Outra' ? telaPersonalizada.trim() : tela) : '';

    const payload = {
      emManutencao,
      tela: telaFinal,
      mensagem: emManutencao ? mensagem.trim() : '',
      tipo: 'ajuste',
    };

    try {
      const atualizado = await salvarStatusSistema(payload, nomeAdmin);
      if (onStatusChanged) onStatusChanged(atualizado);

      if (emManutencao) {
        toast.warn(`⚠️ Modo de manutenção ATIVADO para a tela "${telaFinal}". O Dashboard agora exibe o status em amarelo.`);
      } else {
        toast.success('🟢 Sistema restaurado para 100% Operacional & Online (Verde).');
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
      toast.success('🟢 Status do sistema restaurado para "Sistema Operacional & Online" com sucesso!');
      onClose();
    } catch (err) {
      toast.error('Erro ao restaurar status.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-box modal-md"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', width: '92%' }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #283340', paddingBottom: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span> Controle de Status & Manutenção do Sistema
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Alterne o indicador de status exibido no Dashboard para todos os usuários em tempo real.
            </p>
          </div>
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
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Badge verde normal</span>
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
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Badge amarelo com aviso</span>
            </div>
          </div>

          {/* Configurações de Manutenção (Aparecem quando Manutenção estiver selecionada) */}
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
              <div className="form-row">
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#fef08a' }}>
                  Selecione a Tela / Módulo em Manutenção:
                </label>
                <select
                  value={tela}
                  onChange={(e) => setTela(e.target.value)}
                  style={{ height: '36px', fontSize: '13px', borderRadius: '6px' }}
                >
                  {OPCOES_TELAS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Outra">Outra tela / Digitação livre...</option>
                </select>
              </div>

              {tela === 'Outra' && (
                <div className="form-row">
                  <label style={{ fontSize: '12px', color: '#fef08a' }}>Nome da Tela Personalizada:</label>
                  <input
                    type="text"
                    placeholder="Ex: Módulo de Relatórios Gerenciais"
                    value={telaPersonalizada}
                    onChange={(e) => setTelaPersonalizada(e.target.value)}
                    style={{ height: '36px', fontSize: '13px' }}
                    required
                  />
                </div>
              )}

              <div className="form-row">
                <label style={{ fontSize: '12px', color: '#fef08a' }}>
                  Descrição do Ajuste / Mensagem aos Usuários (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aplicando melhorias na rotina de evidências e relatórios."
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  style={{ height: '36px', fontSize: '13px' }}
                />
              </div>

              <div style={{ fontSize: '11.5px', color: '#fbbf24', fontStyle: 'italic' }}>
                💡 O Dashboard exibirá a mensagem: <strong>"Manutenção:
                  {tela === 'Outra' ? (telaPersonalizada || 'Tela') : tela}"</strong> com efeito pulsante amarelo.
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
                🟢 Concluir & Voltar para 100% Online
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
