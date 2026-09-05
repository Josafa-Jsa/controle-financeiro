import React, { useEffect, useState } from 'react';
import { formatarMoedaInput, converterMoedaParaNumero } from '../../utils/numberUtils';
import '../Visual/modal.css';

export default function ModalEditarNota({
  isOpen = false,
  onClose = () => { },
  onSave = () => { },
  nota = null,
}) {
  const [tipoConta, setTipoConta] = useState('Receber');
  const [valor, setValor] = useState('');

  useEffect(() => {
    if (isOpen && nota) {
      setTipoConta(nota.tipoConta || 'Receber');
      setValor(
        nota.valor !== undefined && nota.valor !== null && nota.valor !== ''
          ? formatarMoedaInput(Math.round(Number(nota.valor) * 100))
          : ''
      );
    }
  }, [isOpen, nota]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !nota) return null;

  const handleValorChange = (e) => {
    const formatado = formatarMoedaInput(e.target.value);
    setValor(formatado);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const valNumerico = converterMoedaParaNumero(valor);
    if (!Number.isFinite(valNumerico) || valNumerico < 0) return;

    onSave({
      ...nota,
      tipoConta: tipoConta || 'Receber',
      valor: valNumerico,
    });
    onClose();
  };

  const nomeEmitente = nota.clienteOuServico || nota.origem || 'Emitente / Fornecedor';
  const numeroNF = nota.numero ? `#${nota.numero}` : `#${nota.id}`;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        alignItems: 'center',
        padding: '16px',
        zIndex: 99999,
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '95%',
          margin: '0 auto',
          padding: '16px 20px',
          backgroundColor: '#18181c',
          border: '1px solid #2e2e38',
          borderRadius: '12px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', color: '#f8fafc' }}>
            <span>✏️</span> Editar Nota Fiscal {numeroNF}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.3rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '2px 6px',
            }}
            title="Fechar (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Resumo dos Dados Fixos da Nota */}
        <div
          style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '0.82rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Emitente / Razão Social:</span>
            <strong style={{ color: '#f1f5f9', textAlign: 'right' }}>{nomeEmitente}</strong>
          </div>

          {nota.cnpj && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>CNPJ:</span>
              <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{nota.cnpj}</span>
            </div>
          )}

          {nota.produtoRelacionado && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Produto / Serviço:</span>
              <span style={{ color: '#38bdf8' }}>{nota.produtoRelacionado}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Data de Emissão:</span>
            <span style={{ color: '#cbd5e1' }}>
              {nota.dataEmissao ? new Date(nota.dataEmissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Campo 1: Forma de Receber ou Pagar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>
              Forma da Nota (Conta Financeira):
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setTipoConta('Receber')}
                style={{
                  height: '42px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: `2px solid ${tipoConta === 'Receber' ? '#10b981' : '#27272a'}`,
                  backgroundColor: tipoConta === 'Receber' ? 'rgba(16, 185, 129, 0.22)' : '#18181b',
                  color: tipoConta === 'Receber' ? '#34d399' : '#a1a1aa',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <span>🟢</span> A RECEBER
              </button>

              <button
                type="button"
                onClick={() => setTipoConta('Pagar')}
                style={{
                  height: '42px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: `2px solid ${tipoConta === 'Pagar' ? '#ef4444' : '#27272a'}`,
                  backgroundColor: tipoConta === 'Pagar' ? 'rgba(239, 68, 68, 0.22)' : '#18181b',
                  color: tipoConta === 'Pagar' ? '#f87171' : '#a1a1aa',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <span>🔴</span> A PAGAR
              </button>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#8a94a6' }}>
              Define se esta nota será lançada nas contas como valor <strong>A Receber</strong> ou despesa <strong>A Pagar</strong>.
            </span>
          </div>

          {/* Campo 2: Valor Total da Nota */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>
              Valor Total da Nota (R$):
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={valor}
              onChange={handleValorChange}
              required
              autoFocus
              style={{
                height: '42px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1.5px solid #334155',
                backgroundColor: '#111827',
                color: '#4ade80',
                fontWeight: 700,
                fontSize: '1.1rem',
                outline: 'none',
                transition: 'border 0.2s',
              }}
            />
            <span style={{ fontSize: '0.74rem', color: '#8a94a6' }}>
              Informe o valor financeiro corrigido da nota fiscal.
            </span>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button
              type="submit"
              style={{
                height: '38px',
                padding: '0 18px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.15s',
              }}
            >
              💾 Salvar Alterações
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                height: '38px',
                padding: '0 14px',
                background: '#27272a',
                color: '#e4e4e7',
                border: '1px solid #3f3f46',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
