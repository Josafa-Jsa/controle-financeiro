// src/components/Modais/ModalCustosPagamentoOS.jsx
import React, { useState, useEffect, useRef } from 'react';
import { formatarMoedaInput } from '../../utils/numberUtils';
import { toast } from 'react-toastify';
import '../Visual/modal.css';

export default function ModalCustosPagamentoOS({
  isOpen,
  onClose,
  dadosIniciais = {},
  onSalvar,
}) {
  const [valores, setValores] = useState({
    custos: '',
    formaPagamento: '',
    valorPagamento: '',
    prazoInicio: '',
    prazoFim: '',
  });

  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setValores({
        custos: dadosIniciais.custos || '',
        formaPagamento: dadosIniciais.formaPagamento || '',
        valorPagamento: dadosIniciais.valorPagamento || '',
        prazoInicio: dadosIniciais.prazoInicio || '',
        prazoFim: dadosIniciais.prazoFim || '',
      });
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, dadosIniciais]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCustosChange = (e) => {
    const formatado = formatarMoedaInput(e.target.value);
    setValores((prev) => ({ ...prev, custos: formatado }));
  };

  const handleValorPagamentoChange = (e) => {
    const formatado = formatarMoedaInput(e.target.value);
    setValores((prev) => ({ ...prev, valorPagamento: formatado }));
  };

  const handleChange = (campo, valor) => {
    setValores((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validação de prazos se preenchidos
    if (valores.prazoInicio && valores.prazoFim) {
      const ini = new Date(valores.prazoInicio);
      const fim = new Date(valores.prazoFim);
      if (ini > fim) {
        toast.warn('O início do prazo não pode ser posterior ao fim.');
        return;
      }
    }

    onSalvar?.(valores);
    toast.success('Custos, Pagamento e Prazos salvos com sucesso!');
    onClose?.();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box modal-lg"
        style={{ maxWidth: '640px', width: 'min(640px, 94vw)' }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #2b2b36',
            paddingBottom: '12px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>💰</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#ff5252' }}>
                Custos, Pagamento & Prazos
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                Defina os valores, condição de pagamento e os prazos do serviço
              </span>
            </div>
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
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Formulário */}
        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Seção 1: Valores */}
          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="custos-val" style={{ color: '#fff', fontWeight: 700 }}>
                💵 Custo Estimado Total:
              </label>
              <input
                ref={firstInputRef}
                id="custos-val"
                type="text"
                inputMode="numeric"
                value={valores.custos}
                placeholder="R$ 0,00"
                onChange={handleCustosChange}
              />
            </div>

            <div className="form-row">
              <label htmlFor="pag-val" style={{ color: '#fff', fontWeight: 700 }}>
                💳 Valor do Pagamento:
              </label>
              <input
                id="pag-val"
                type="text"
                inputMode="numeric"
                value={valores.valorPagamento}
                placeholder="R$ 0,00"
                onChange={handleValorPagamentoChange}
              />
            </div>
          </div>

          {/* Seção 2: Forma de Pagamento */}
          <div className="form-row">
            <label htmlFor="pag-forma">🏷️ Forma de Pagamento:</label>
            <input
              id="pag-forma"
              type="text"
              value={valores.formaPagamento}
              placeholder="Ex: Pix, Dinheiro, Cartão de Crédito (3x), Boleto Bancário..."
              onChange={(e) => handleChange('formaPagamento', e.target.value)}
            />
          </div>

          {/* Seção 3: Prazos */}
          <div className="form-grid" style={{ marginTop: '4px' }}>
            <div className="form-row">
              <label htmlFor="prazo-ini">📅 Início do Serviço / Prazo:</label>
              <input
                id="prazo-ini"
                type="date"
                value={valores.prazoInicio}
                onChange={(e) => handleChange('prazoInicio', e.target.value)}
              />
            </div>

            <div className="form-row">
              <label htmlFor="prazo-fim">🏁 Término Previsto do Serviço:</label>
              <input
                id="prazo-fim"
                type="date"
                value={valores.prazoFim}
                min={valores.prazoInicio || undefined}
                onChange={(e) => handleChange('prazoFim', e.target.value)}
              />
            </div>
          </div>

          {/* Botões */}
          <div className="modal-buttons" style={{ marginTop: '16px' }}>
            <button className="salve" type="submit">
              💾 Salvar Custos e Prazos
            </button>
            <button className="cancela" type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
