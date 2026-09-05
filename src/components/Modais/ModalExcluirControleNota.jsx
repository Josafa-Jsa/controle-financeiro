// src/components/Modais/ModalExcluirControleNota.jsx
import React, { useEffect, useState } from 'react';
import { formatCurrencyBRL, formatDateBR } from '../../utils/telegram';
import { getUser } from '../../auth/auth';
import '../Visual/modal.css';

export default function ModalExcluirControleNota({
  isOpen = false,
  onClose = () => {},
  onConfirm = () => {},
  nota = null,
}) {
  const [processando, setProcessando] = useState(false);

  const usuarioLogado = getUser();
  const nomeUsuarioLogado =
    usuarioLogado?.name ||
    usuarioLogado?.nome ||
    usuarioLogado?.username ||
    localStorage.getItem('usuario_nome') ||
    'Usuário Logado';
  const emailUsuarioLogado = usuarioLogado?.email || localStorage.getItem('usuario_email') || '';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setProcessando(false);
    }
  }, [isOpen]);

  if (!isOpen || !nota) return null;

  const handleConfirmar = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (processando) return;
    setProcessando(true);
    onConfirm(nota, {
      usuario: nomeUsuarioLogado,
      email: emailUsuarioLogado,
      dataHora: new Date().toISOString(),
    });
  };

  const numExibicao = nota.numero ? `NF #${nota.numero}` : `NF #${nota.id}`;
  const fornecedorExibicao = nota.fornecedor || 'Fornecedor não informado';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 99999 }}
    >
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '92%',
          background: 'linear-gradient(145deg, #18181c 0%, #111827 100%)',
          border: '1.5px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '16px',
          padding: '24px 26px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75), 0 0 30px rgba(239, 68, 68, 0.2)',
          animation: 'fadeInPage 0.2s ease',
          color: '#f8fafc',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Topo / Header do Modal de Alerta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '14px',
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1.5px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              flexShrink: 0,
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.25)',
            }}
          >
            ⚠️
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f87171', fontWeight: 800, letterSpacing: '0.2px' }}>
                ALERTA DE EXCLUSÃO
              </h3>
              <span
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                Controle de Notas
              </span>
            </div>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
              Confirmação de exclusão e registro de auditoria
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.4rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px',
              transition: 'color 0.15s',
            }}
            title="Fechar (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Card Informativo com Número da Nota e Quem Excluiu */}
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '16px 18px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Linha do Número da Nota */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #1e293b',
              paddingBottom: '10px',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
              Número da Nota:
            </span>
            <span
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.12)',
                padding: '4px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontFamily: 'monospace',
              }}
            >
              {numExibicao}
            </span>
          </div>

          {/* Linha de Quem Excluiu a Nota */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #1e293b',
              paddingBottom: '10px',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
              Quem excluiu a nota:
            </span>
            <span
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#fbbf24',
                background: 'rgba(245, 158, 11, 0.12)',
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>👤</span> {nomeUsuarioLogado}
            </span>
          </div>

          {/* Detalhes Complementares: Fornecedor, Valor e Emissão */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px 12px',
              fontSize: '0.82rem',
            }}
          >
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                Fornecedor
              </span>
              <strong style={{ color: '#f1f5f9' }}>{fornecedorExibicao}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                Valor da Nota
              </span>
              <strong style={{ color: '#4ade80', fontSize: '0.95rem' }}>
                {formatCurrencyBRL(nota.valor || 0)}
              </strong>
            </div>

            {nota.cnpj && (
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  CNPJ
                </span>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{nota.cnpj}</span>
              </div>
            )}

            {nota.dataEmissao && (
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  Data de Emissão
                </span>
                <span style={{ color: '#cbd5e1' }}>{formatDateBR(nota.dataEmissao)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mensagem de Aviso Crítico */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '20px',
            fontSize: '0.82rem',
            color: '#fca5a5',
            lineHeight: 1.45,
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🛑</span>
          <div>
            <strong>Confirmação de Exclusão:</strong> Tem certeza que deseja excluir esta nota do controle? Esta ação removerá a nota e o anexo DANFE permanentemente.
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={processando}
            style={{
              padding: '10px 18px',
              background: '#27272a',
              color: '#e4e4e7',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: processando ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={processando}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: processando ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
              transition: 'all 0.15s ease',
              opacity: processando ? 0.7 : 1,
            }}
          >
            {processando ? 'Excluindo...' : '🗑️ Sim, Excluir Nota'}
          </button>
        </div>
      </div>
    </div>
  );
}
