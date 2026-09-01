import React, { useEffect, useState } from 'react';
import '../Visual/modal.css';

const VAZIO = {
  parceiro: '',
  descricao: '',
  valor: '',
  vencimento: '',
  arquivoNome: '',
  arquivoBase64: '',
};

const ModalContrato = ({ isOpen, onClose, onSave, contratoParaEditar }) => {
  const [contrato, setContrato] = useState(VAZIO);

  // Preenche o formulário quando abre para edição
  useEffect(() => {
    if (contratoParaEditar) {
      setContrato({
        parceiro: contratoParaEditar.parceiro ?? '',
        descricao: contratoParaEditar.descricao ?? '',
        valor: contratoParaEditar.valor ?? '',
        vencimento: contratoParaEditar.vencimento ?? '',
        arquivoNome: contratoParaEditar.arquivoNome ?? '',
        arquivoBase64: contratoParaEditar.arquivoBase64 ?? '',
      });
    } else {
      setContrato(VAZIO);
    }
  }, [contratoParaEditar]);

  // Fechar com ESC
  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setContrato((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      alert('Por favor, selecione um arquivo PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setContrato((prev) => ({
        ...prev,
        arquivoNome: file.name,
        arquivoBase64: String(reader.result || ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(contrato);
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{contratoParaEditar ? 'Editar Contrato' : 'Novo Contrato'}</h2>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Parceiro - linha inteira */}
          <div className="form-row">
            <label className="required">Cliente / Fornecedor:</label>
            <input
              type="text"
              name="parceiro"
              value={contrato.parceiro}
              onChange={handleChange}
              required
              placeholder="Nome do cliente/fornecedor"
            />
          </div>

          {/* Descrição - linha inteira */}
          <div className="form-row">
            <label className="required">Descrição:</label>
            <input
              type="text"
              name="descricao"
              value={contrato.descricao}
              onChange={handleChange}
              required
              placeholder="Ex.: Contrato de manutenção, suporte, etc."
            />
          </div>

          {/* Valor + Vencimento - grade em 2 colunas */}
          <div className="form-grid">
            <div className="form-row">
              <label className="required">Valor:</label>
              <input
                type="number"
                name="valor"
                step="0.01"
                min="0"
                value={contrato.valor}
                onChange={handleChange}
                required
                placeholder="0,00"
              />
            </div>

            <div className="form-row">
              <label className="required">Vencimento:</label>
              <input
                type="date"
                name="vencimento"
                value={contrato.vencimento}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Arquivo PDF */}
          <div className="form-row">
            <label>Arquivo (PDF):</label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
            />
            {contrato.arquivoNome && (
              <small className="modal-hint">
                Arquivo selecionado: <strong>{contrato.arquivoNome}</strong>
              </small>
            )}
          </div>

          {/* Ações */}
          <div className="modal-buttons">
            <button className="salve" type="submit">Salvar</button>
            <button className="cancela" type="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalContrato;
