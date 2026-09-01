// src/components/ModalFiltroCobranca.jsx
import React, { useState, useEffect } from 'react';
import '../Visual/modal.css';

export default function ModalFiltroCobranca({
  isOpen,
  onClose,
  filtrosAtuais,
  onAplicarFiltros,
}) {
  const [filtros, setFiltros] = useState({
    tipo: filtrosAtuais?.tipo || 'Todos',
    status: filtrosAtuais?.status || 'Todos',
    dataInicio: filtrosAtuais?.dataInicio || '',
    dataFim: filtrosAtuais?.dataFim || '',
    descricao: filtrosAtuais?.descricao || '',
    somenteComBaixa: filtrosAtuais?.somenteComBaixa || false,
  });

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFiltros((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleLimpar = () => {
    const limpos = {
      tipo: 'Todos',
      status: 'Todos',
      dataInicio: '',
      dataFim: '',
      descricao: '',
      somenteComBaixa: false,
    };
    setFiltros(limpos);
    onAplicarFiltros(limpos);
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAplicarFiltros(filtros);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>Buscar / Filtrar Cobranças</h2>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-row">
              <label>Tipo:</label>
              <select name="tipo" value={filtros.tipo} onChange={handleChange}>
                <option value="Todos">Todos</option>
                <option value="Receber">A Receber</option>
                <option value="Pagar">A Pagar</option>
              </select>
            </div>

            <div className="form-row">
              <label>Status:</label>
              <select name="status" value={filtros.status} onChange={handleChange}>
                <option value="Todos">Todos</option>
                <option value="Pendente">Pendente</option>
                <option value="Pago">Pago</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label>Data Inicial (Vencimento):</label>
              <input
                type="date"
                name="dataInicio"
                value={filtros.dataInicio}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <label>Data Final (Vencimento):</label>
              <input
                type="date"
                name="dataFim"
                value={filtros.dataFim}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <label>Buscar por Descrição / Origem:</label>
            <input
              type="text"
              name="descricao"
              placeholder="Ex.: Abastecimento, Cliente X..."
              value={filtros.descricao}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="somenteComBaixa"
                checked={filtros.somenteComBaixa}
                onChange={handleChange}
              />
              Somente cobranças com baixas registradas
            </label>
          </div>

          <div className="modal-buttons">
            <button type="submit" className="salve">
              Aplicar Filtros
            </button>
            <button type="button" className="cancela" onClick={handleLimpar}>
              Limpar
            </button>
            <button type="button" className="cancela" onClick={onClose}>
              Fechar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}