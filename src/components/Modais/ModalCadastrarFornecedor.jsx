import React, { useEffect, useState } from 'react';
import { formatarCnpj, extrairCnpjLimpo, salvarPadraoCnpj } from '../../services/memoriaCnpjService';
import { salvarFornecedorNoBanco } from '../../services/fornecedoresService';
import '../Visual/modal.css';

export default function ModalCadastrarFornecedor({
  isOpen = false,
  onClose = () => { },
  onSave = () => { },
  cnpj = '',
}) {
  const [cnpjInput, setCnpjInput] = useState('');
  const [nomeFornecedor, setNomeFornecedor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [telefone, setTelefone] = useState('');
  const [erroMsg, setErroMsg] = useState('');

  const cnpjFixo = Boolean(cnpj && extrairCnpjLimpo(cnpj).length === 14);

  useEffect(() => {
    if (isOpen) {
      setCnpjInput(cnpj ? formatarCnpj(cnpj) : '');
      setNomeFornecedor('');
      setCategoria('');
      setTelefone('');
      setErroMsg('');
    }
  }, [isOpen, cnpj]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCnpjChange = (e) => {
    const val = e.target.value;
    const limpo = val.replace(/\D+/g, '').slice(0, 14);
    setCnpjInput(formatarCnpj(limpo));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErroMsg('');

    const nomeLimpo = nomeFornecedor.trim().toUpperCase();
    const cnpjLimpo = extrairCnpjLimpo(cnpjInput || cnpj);

    if (!nomeLimpo) {
      setErroMsg('Por favor, informe o Nome do Fornecedor.');
      return;
    }

    if (cnpjLimpo.length !== 14) {
      setErroMsg('Por favor, informe um CNPJ válido com 14 dígitos numéricos.');
      return;
    }

    const cnpjFormatado = formatarCnpj(cnpjLimpo);

    const fornecedorPayload = {
      cnpj: cnpjFormatado,
      cnpjRaw: cnpjLimpo,
      nome: nomeLimpo,
      razaoSocial: nomeLimpo,
      categoria: categoria.trim().toUpperCase(),
      produtoRelacionado: categoria.trim().toUpperCase() || 'FORNECEDOR',
      tipoConta: 'Pagar',
      telefone: telefone.trim(),
    };

    // Salva no banco de dados MySQL e na memória persistente
    try {
      await salvarFornecedorNoBanco(fornecedorPayload);
    } catch (_) {
      salvarPadraoCnpj(cnpjLimpo, fornecedorPayload);
    }

    onSave(fornecedorPayload);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        alignItems: 'center',
        padding: '16px',
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          width: '95%',
          margin: '0 auto',
          padding: '18px 22px',
          backgroundColor: '#18181c',
          border: '1.5px solid #3b82f6',
          borderRadius: '12px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9), 0 0 20px rgba(59, 130, 246, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.18rem', color: '#60a5fa' }}>
            <span>🏢</span> Cadastrar Fornecedor
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

        {/* Mensagem de Orientação */}
        <div
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '14px',
            fontSize: '0.82rem',
            color: '#93c5fd',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>ℹ️</span> {cnpjFixo ? 'Fornecedor não cadastrado na chave' : 'Novo Cadastro de Fornecedor'}
          </div>
          <span style={{ color: '#cbd5e1' }}>
            {cnpjFixo
              ? `O CNPJ ${formatarCnpj(cnpj)} ainda não possui cadastro. Digite o nome da empresa abaixo:`
              : 'Cadastre o Fornecedor com CNPJ e Nome em MAIÚSCULAS para preenchimento automático nas notas.'}
          </span>
        </div>

        {erroMsg && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '12px',
            }}
          >
            ⚠️ {erroMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Campo CNPJ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
                CNPJ do Fornecedor: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {cnpjFixo && (
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>🔒 Validado na Chave</span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="00.000.000/0000-00"
                value={cnpjInput}
                onChange={handleCnpjChange}
                readOnly={cnpjFixo}
                disabled={cnpjFixo}
                required
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: `1px solid ${cnpjFixo ? '#334155' : '#3b82f6'}`,
                  backgroundColor: cnpjFixo ? '#0f172a' : '#111827',
                  color: cnpjFixo ? '#38bdf8' : '#fff',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  outline: 'none',
                  cursor: cnpjFixo ? 'not-allowed' : 'text',
                  boxSizing: 'border-box',
                }}
              />
              {cnpjFixo && (
                <span
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.75rem',
                    color: '#64748b',
                  }}
                >
                  🔒 Fixo
                </span>
              )}
            </div>
          </div>

          {/* Campo Nome do Fornecedor (SEMPRE EM MAIÚSCULAS) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9' }}>
                Nome / Razão Social do Fornecedor: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>EM MAIÚSCULAS</span>
            </div>
            <input
              type="text"
              placeholder="DIGITE O NOME DO FORNECEDOR..."
              value={nomeFornecedor}
              onChange={(e) => setNomeFornecedor(e.target.value.toUpperCase())}
              required
              autoFocus
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1.5px solid #3b82f6',
                backgroundColor: '#111827',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.88rem',
                textTransform: 'uppercase',
                outline: 'none',
                boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
              }}
            />
          </div>

          {/* Campo Produto / Categoria Principal (Opcional) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ccc' }}>
              Produto / Ramo Principal (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: ABASTECIMENTO, ALIMENTOS, PEÇAS..."
              value={categoria}
              onChange={(e) => setCategoria(e.target.value.toUpperCase())}
              style={{
                height: '36px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid #334155',
                backgroundColor: '#111827',
                color: '#fff',
                fontSize: '0.82rem',
                textTransform: 'uppercase',
                outline: 'none',
              }}
            />
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button
              type="submit"
              style={{
                height: '38px',
                padding: '0 18px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
                transition: 'all 0.15s',
              }}
            >
              🏢 Cadastrar Fornecedor
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
