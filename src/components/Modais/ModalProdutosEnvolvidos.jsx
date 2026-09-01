// src/components/Modais/ModalProdutosEnvolvidos.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import '../Visual/modal.css';

export default function ModalProdutosEnvolvidos({
  isOpen,
  onClose,
  ocorrencia,
  onSave,
}) {
  const [listaProdutos, setListaProdutos] = useState([]);
  const [novoItem, setNovoItem] = useState({
    codigo: '',
    produto: '',
    quantidade: '1',
    valorUnitario: '',
  });

  useEffect(() => {
    if (!isOpen || !ocorrencia) return;

    if (Array.isArray(ocorrencia.produtosEnvolvidos)) {
      setListaProdutos(ocorrencia.produtosEnvolvidos);
    } else {
      setListaProdutos([]);
    }

    setNovoItem({
      codigo: '',
      produto: '',
      quantidade: '1',
      valorUnitario: '',
    });
  }, [ocorrencia, isOpen]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !ocorrencia) return null;

  const handleInputChange = (campo, valor) => {
    setNovoItem((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleAdicionarProduto = (e) => {
    e.preventDefault();

    if (!novoItem.produto.trim()) {
      toast.warn('Por favor, informe a descrição do produto.');
      return;
    }

    const qtd = Number(novoItem.quantidade) || 1;
    const vlr = Number(novoItem.valorUnitario) || 0;

    const itemFormatado = {
      id: Date.now(),
      codigo: novoItem.codigo.trim() || `ITEM-${listaProdutos.length + 1}`,
      produto: novoItem.produto.trim(),
      quantidade: qtd,
      valorUnitario: vlr,
      total: qtd * vlr,
    };

    setListaProdutos((prev) => [...prev, itemFormatado]);
    setNovoItem({
      codigo: '',
      produto: '',
      quantidade: '1',
      valorUnitario: '',
    });
  };

  const handleRemoverProduto = (id) => {
    setListaProdutos((prev) => prev.filter((item) => item.id !== id));
  };

  const valorTotalEnvolvido = listaProdutos.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalUnidades = listaProdutos.reduce((acc, curr) => acc + (curr.quantidade || 0), 0);

  const formatarBRL = (num) => {
    return Number(num || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleSalvar = () => {
    onSave({
      id: ocorrencia.id,
      produtos: listaProdutos,
    });
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-box modal-xl modal-compact"
        onClick={(e) => e.stopPropagation()}
        aria-label="Relação de Produtos Envolvidos"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '19px' }}>
              📦 Relação de Produtos — {ocorrencia.numero}
            </h2>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Ocorrência: <strong style={{ color: '#00d2ff' }}>{ocorrencia.nome || ocorrencia.tipo}</strong>
          </div>
        </div>

        {/* Formulário Compacto para Adicionar Novo Item */}
        <div
          style={{
            background: '#15171b',
            border: '1px solid #283340',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '10px',
          }}
        >
          <form onSubmit={handleAdicionarProduto}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2.5fr 1fr 1.3fr auto', gap: '8px', alignItems: 'flex-end' }}>
              <div className="form-row">
                <label style={{ fontSize: '11.5px' }}>Código:</label>
                <input
                  type="text"
                  placeholder="Ex: 12345"
                  value={novoItem.codigo}
                  onChange={(e) => handleInputChange('codigo', e.target.value)}
                  style={{ height: '34px', fontSize: '12.5px' }}
                />
              </div>

              <div className="form-row">
                <label style={{ fontSize: '11.5px' }}>Produto *</label>
                <input
                  type="text"
                  placeholder="Ex: Whisky X / Chocolate Y"
                  value={novoItem.produto}
                  onChange={(e) => handleInputChange('produto', e.target.value)}
                  style={{ height: '34px', fontSize: '12.5px' }}
                  required
                />
              </div>

              <div className="form-row">
                <label style={{ fontSize: '11.5px' }}>Qtd. *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={novoItem.quantidade}
                  onChange={(e) => handleInputChange('quantidade', e.target.value)}
                  style={{ height: '34px', fontSize: '12.5px' }}
                  required
                />
              </div>

              <div className="form-row">
                <label style={{ fontSize: '11.5px' }}>Valor unit. (R$):</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="99,90"
                  value={novoItem.valorUnitario}
                  onChange={(e) => handleInputChange('valorUnitario', e.target.value)}
                  style={{ height: '34px', fontSize: '12.5px' }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="salve"
                  style={{ height: '34px', padding: '0 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                >
                  ➕ Adicionar
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Tabela de Produtos Adicionados */}
        <div
          style={{
            maxHeight: '180px',
            overflowY: 'auto',
            background: '#121214',
            border: '1px solid #2b2b2e',
            borderRadius: '8px',
            marginBottom: '10px',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#1c1f26', borderBottom: '1px solid #2d3748', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#94a3b8' }}>Código</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#94a3b8' }}>Produto</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', color: '#94a3b8' }}>Qtd.</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', color: '#94a3b8' }}>Valor Unit.</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', color: '#94a3b8' }}>Total</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '40px', color: '#94a3b8' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaProdutos.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    Nenhum produto adicionado ainda. Utilize os campos acima para relacionar os itens.
                  </td>
                </tr>
              ) : (
                listaProdutos.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: '#00d2ff', fontWeight: 600 }}>
                      {item.codigo}
                    </td>
                    <td style={{ padding: '7px 12px', color: '#f1f5f9', fontWeight: 500 }}>
                      {item.produto}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'center', color: '#cbd5e1' }}>
                      {item.quantidade}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: '#94a3b8' }}>
                      {formatarBRL(item.valorUnitario)}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>
                      {formatarBRL(item.total)}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoverProduto(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '2px 4px',
                        }}
                        title="Remover produto"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Resumo e Totalizador Automático */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '10px 16px',
            marginBottom: '10px',
          }}
        >
          <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
            Itens Relacionados: <strong style={{ color: '#fff' }}>{listaProdutos.length} produtos</strong> ({totalUnidades} unidades)
          </span>
          <div style={{ fontSize: '14px', color: '#a7f3d0' }}>
            Valor total envolvido:{' '}
            <strong style={{ fontSize: '17px', color: '#4ade80', fontWeight: 800 }}>
              {formatarBRL(valorTotalEnvolvido)}
            </strong>
          </div>
        </div>

        <hr className="modal-divider" style={{ margin: '4px 0' }} />

        {/* Botões do Rodapé */}
        <div className="modal-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="cancela" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="salve"
            onClick={handleSalvar}
          >
            💾 Salvar Relação de Produtos
          </button>
        </div>
      </div>
    </div>
  );
}
