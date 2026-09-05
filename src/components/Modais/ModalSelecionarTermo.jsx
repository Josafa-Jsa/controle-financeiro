// src/components/Modais/ModalSelecionarTermo.jsx
import React, { useState, useEffect } from 'react';
import { MODELOS_TERMOS } from '../../data/termosCondicoes';
import '../Visual/modal.css';

export default function ModalSelecionarTermo({
  isOpen,
  onClose,
  termoSelecionadoId = 'conscientizacao',
  textoBotaoConfirmar = '💾 Confirmar e Salvar OS',
  onConfirmar,
}) {
  const [idEscolhido, setIdEscolhido] = useState(termoSelecionadoId || 'conscientizacao');

  useEffect(() => {
    if (isOpen) {
      setIdEscolhido(termoSelecionadoId || 'conscientizacao');
    }
  }, [isOpen, termoSelecionadoId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modeloAtual = MODELOS_TERMOS.find((m) => m.id === idEscolhido) || MODELOS_TERMOS[0];

  const handleConfirmar = () => {
    onConfirmar?.(modeloAtual);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{
          maxWidth: '720px',
          width: 'min(720px, 95vw)',
          padding: '24px 26px',
          borderRadius: '16px',
          background: '#18181b',
          border: '1px solid #27272a',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1px solid #27272a',
            paddingBottom: '14px',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                color: '#fff',
                fontSize: '1.25rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span>📜</span> Selecionar Termo de Garantia / Condições
            </h3>
            <p style={{ margin: '6px 0 0 0', color: '#a1a1aa', fontSize: '0.88rem' }}>
              Escolha qual termo será anexado à Ordem de Serviço e impresso no PDF:
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              fontSize: '1.4rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'all 0.2s',
            }}
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Lista dos 3 Modelos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {MODELOS_TERMOS.map((modelo) => {
            const isSelected = modelo.id === idEscolhido;
            return (
              <div
                key={modelo.id}
                onClick={() => setIdEscolhido(modelo.id)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: isSelected ? 'rgba(255, 82, 82, 0.08)' : '#1e1e24',
                  border: isSelected
                    ? '2px solid #ff5252'
                    : '1px solid #2e2e38',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: isSelected
                    ? '0 4px 14px rgba(255, 82, 82, 0.2)'
                    : '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                {/* Radio Button Customizado */}
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? '#ff5252' : '#52525b'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: isSelected ? '#ff5252' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  {isSelected && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#fff',
                      }}
                    />
                  )}
                </div>

                {/* Ícone */}
                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{modelo.icone}</span>

                {/* Textos */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.98rem',
                        color: isSelected ? '#fff' : '#e4e4e7',
                      }}
                    >
                      {modelo.titulo}
                    </span>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: `${modelo.badgeCor}22`,
                        color: modelo.badgeCor,
                        border: `1px solid ${modelo.badgeCor}44`,
                      }}
                    >
                      {modelo.badge}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: '#a1a1aa',
                      marginTop: '3px',
                    }}
                  >
                    {modelo.subtitulo}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prévia do Termo Selecionado */}
        <div
          style={{
            background: '#121214',
            border: '1px solid #27272a',
            borderRadius: '10px',
            padding: '14px 16px',
            marginTop: '2px',
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#71717a',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>👁️</span> Texto que será impresso no PDF da OS:
          </div>
          <pre
            style={{
              margin: 0,
              fontSize: '0.84rem',
              lineHeight: 1.55,
              color: '#e4e4e7',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
              maxHeight: '140px',
              overflowY: 'auto',
            }}
          >
            {modeloAtual.texto}
          </pre>
        </div>

        {/* Botões de Ação */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '6px',
            paddingTop: '12px',
            borderTop: '1px solid #27272a',
          }}
        >
          <button
            type="button"
            className="cancela"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #3f3f46',
              background: '#27272a',
              color: '#e4e4e7',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="salve"
            onClick={handleConfirmar}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.92rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s',
            }}
          >
            {textoBotaoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
