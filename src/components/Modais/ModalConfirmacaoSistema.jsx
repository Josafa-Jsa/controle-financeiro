// src/components/Modais/ModalConfirmacaoSistema.jsx
import React, { useEffect } from 'react';
import '../Visual/modal.css';

export default function ModalConfirmacaoSistema({
  isOpen = false,
  onClose = () => {},
  onConfirmar = () => {},
  titulo = 'Confirmação',
  mensagem = 'Deseja realmente prosseguir com esta ação?',
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  tipo = 'alerta', // 'alerta', 'perigo', 'info'
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

  if (!isOpen) return null;

  const cores = {
    alerta: {
      icone: '⚠️',
      cor: '#f59e0b',
      borda: '#f59e0b',
      btnBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },
    perigo: {
      icone: '🚨',
      cor: '#ef4444',
      borda: '#ef4444',
      btnBg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    },
    info: {
      icone: 'ℹ️',
      cor: '#38bdf8',
      borda: '#38bdf8',
      btnBg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    },
  };

  const estiloAtual = cores[tipo] || cores.alerta;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 999999 }}
    >
      <div
        className="modal-box modal-sm"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          width: '92%',
          background: '#0f172a',
          border: `1px solid ${estiloAtual.borda}`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
          animation: 'fadeInPage 0.2s ease',
        }}
      >
        {/* Topo do Modal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0,
            }}
          >
            {estiloAtual.icone}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', fontWeight: 700 }}>
              {titulo}
            </h3>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Big Master • Confirmação de Operação</span>
          </div>
        </div>

        {/* Corpo com a mensagem */}
        <div
          style={{
            fontSize: '13.5px',
            color: '#cbd5e1',
            lineHeight: '1.5',
            background: '#0b0f19',
            padding: '12px 14px',
            borderRadius: '8px',
            border: '1px solid #1e293b',
            marginBottom: '18px',
          }}
        >
          {mensagem}
        </div>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {textoCancelar}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirmar();
              onClose();
            }}
            style={{
              background: estiloAtual.btnBg,
              color: '#ffffff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
