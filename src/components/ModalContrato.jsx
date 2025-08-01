import React, { useEffect, useState } from 'react';
import './modal.css';

const ModalContrato = ({ isOpen, onClose, onSave, contratoParaEditar }) => {
  const [contrato, setContrato] = useState({
    parceiro: '',
    descricao: '',
    valor: '',
    vencimento: '',
    arquivoNome: '',
    arquivoBase64: ''
  });

  useEffect(() => {
    if (contratoParaEditar) {
      setContrato(contratoParaEditar);
    } else {
      setContrato({
        parceiro: '',
        descricao: '',
        valor: '',
        vencimento: '',
        arquivoNome: '',
        arquivoBase64: ''
      });
    }
  }, [contratoParaEditar]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setContrato({ ...contrato, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setContrato({
          ...contrato,
          arquivoNome: file.name,
          arquivoBase64: reader.result
        });
      };
      reader.readAsDataURL(file);
    } else {
      alert('Por favor, selecione um arquivo PDF.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(contrato);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{contratoParaEditar ? 'Editar Contrato' : 'Novo Contrato'}</h2>
        <form onSubmit={handleSubmit}>
          <label>Cliente / Fornecedor:</label>
          <input
            type="text"
            name="parceiro"
            value={contrato.parceiro}
            onChange={handleChange}
            required
          />

          <label>Descrição:</label>
          <input
            type="text"
            name="descricao"
            value={contrato.descricao}
            onChange={handleChange}
            required
          />

          <label>Valor:</label>
          <input
            type="number"
            name="valor"
            value={contrato.valor}
            onChange={handleChange}
            step="0.01"
            required
          />

          <label>Vencimento:</label>
          <input
            type="date"
            name="vencimento"
            value={contrato.vencimento}
            onChange={handleChange}
            required
          />

          <label>Arquivo (PDF):</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
          />

          {contrato.arquivoNome && (
            <p>Arquivo selecionado: <strong>{contrato.arquivoNome}</strong></p>
          )}

          <div className="modal-buttons">
            <button type="submit">Salvar</button>
            <button type="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalContrato;
