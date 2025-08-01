import React, { useEffect, useState } from 'react';
import './modal.css';

const ModalNota = ({ isOpen, onClose, onSave, notaParaEditar }) => {
  const [nota, setNota] = useState({
    tipo: 'NFe',
    clienteOuServico: '',
    valor: '',
    dataEmissao: '',
    status: 'Emitida'
  });

  useEffect(() => {
    if (notaParaEditar) {
      setNota(notaParaEditar);
    } else {
      setNota({
        tipo: 'NFe',
        clienteOuServico: '',
        valor: '',
        dataEmissao: new Date().toISOString().substring(0, 10),
        status: 'Emitida'
      });
    }
  }, [notaParaEditar]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNota({ ...nota, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(nota);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{notaParaEditar ? 'Editar Nota Fiscal' : 'Emitir Nota Fiscal'}</h2>
        <form onSubmit={handleSubmit}>
          <label>Tipo:</label>
          <select name="tipo" value={nota.tipo} onChange={handleChange}>
            <option value="NFe">Nota Fiscal Eletrônica (NFe)</option>
            <option value="NFSe">Nota Fiscal de Serviço Eletrônica (NFSe)</option>
          </select>

          <label>Cliente / Serviço:</label>
          <input
            type="text"
            name="clienteOuServico"
            value={nota.clienteOuServico}
            onChange={handleChange}
            required
          />

          <label>Valor:</label>
          <input
            type="number"
            step="0.01"
            name="valor"
            value={nota.valor}
            onChange={handleChange}
            required
          />

          <label>Data de Emissão:</label>
          <input
            type="date"
            name="dataEmissao"
            value={nota.dataEmissao}
            onChange={handleChange}
            required
          />

          <div className="modal-buttons">
            <button type="submit">Salvar</button>
            <button type="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNota;
