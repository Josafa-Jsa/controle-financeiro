// src/components/Modais/ModalAlertaNotaExcluida.jsx
import React, { useEffect } from 'react';
import '../Visual/modal.css';

export default function ModalAlertaNotaExcluida({
  isOpen = false,
  onClose = () => {},
  infoExclusao = null,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !infoExclusao) return null;

  const {
    numero = 'S/N',
    fornecedor = 'Fornecedor',
    usuario = 'Usuário do Sistema',
    dataHora = new Date().toISOString(),
    valor = null,
  } = infoExclusao;

  const dataHoraFormatada = (() => {
    try {
      const dt = new Date(dataHora);
      if (isNaN(dt.getTime())) return dataHora;
      return `${dt.toLocaleDateString('pt-BR')} às ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } catch {
      return dataHora;
    }
  })();

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 999999 }}
    >
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '500px',
          width: '92%',
          background: 'linear-gradient(145deg, #18181b 0%, #0f172a 100%)',
          border: '1.5px solid #f59e0b',
          borderRadius: '16px',
          padding: '24px 26px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(245, 158, 11, 0.25)',
          animation: 'fadeInPage 0.25s ease',
          color: '#f8fafc',
          fontFamily: "'Inter', sans-serif",
          position: 'relative',
        }}
      >
        {/* Ícone e Título de Alerta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(245, 158, 11, 0.18)',
              border: '1.5px solid rgba(245, 158, 11, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              flexShrink: 0,
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.3)',
            }}
          >
            📢
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fbbf24', fontWeight: 800 }}>
              ALERTA: NOTA EXCLUÍDA
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Registro de exclusão de nota fiscal
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
            }}
            title="Fechar (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Bloco de Informações da Nota Excluída */}
        <div
          style={{
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '16px 18px',
            marginBottom: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Número da Nota */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
              Número da Nota:
            </span>
            <span
              style={{
                fontSize: '1.2rem',
                fontWeight: 900,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.12)',
                padding: '4px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                fontFamily: 'monospace',
              }}
            >
              {String(numero).startsWith('NF') ? numero : `NF #${numero}`}
            </span>
          </div>

          {/* Quem Excluiu a Nota */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
              Quem excluiu a nota:
            </span>
            <span
              style={{
                fontSize: '0.95rem',
                fontWeight: 800,
                color: '#f87171',
                background: 'rgba(239, 68, 68, 0.12)',
                padding: '4px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>👤</span> {usuario}
            </span>
          </div>

          {/* Fornecedor */}
          {fornecedor && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Fornecedor:</span>
              <span style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 700 }}>
                {fornecedor}
              </span>
            </div>
          )}

          {/* Data e Hora da Exclusão */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Data/Hora da Exclusão:</span>
            <span style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 600 }}>
              📅 {dataHoraFormatada}
            </span>
          </div>
        </div>

        {/* Botão de Fechar / Entendido */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.15s ease',
            }}
          >
            ✓ Entendido / Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
