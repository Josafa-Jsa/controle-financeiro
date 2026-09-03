// src/components/Modais/ModalAdicionarItemEnvio.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  getListaDepartamentos,
  TAMANHOS_PADRAO,
  getTamanhosPorDepartamento,
} from '../../services/uniformesService';
import '../Visual/modal.css';

export default function ModalAdicionarItemEnvio({
  isOpen,
  onClose,
  estoque = [],
  onAdicionar,
}) {
  const [departamento, setDepartamento] = useState('Hortifruti');
  const [tamanho, setTamanho] = useState('M');
  const [estado, setEstado] = useState('Novo');
  const [quantidade, setQuantidade] = useState('1');

  useEffect(() => {
    if (isOpen) {
      setDepartamento('Hortifruti');
      setTamanho('M');
      setEstado('Novo');
      setQuantidade('1');
    }
  }, [isOpen]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  // Consulta saldo disponível em estoque para a combinação
  const saldoDisponivel = useMemo(() => {
    const item = estoque.find(
      (i) => i.departamento === departamento && i.tamanho === tamanho
    );
    if (!item) return 0;
    return estado === 'Novo' ? (Number(item.estado_novo_qtd) || 0) : (Number(item.estado_usado_qtd) || 0);
  }, [estoque, departamento, tamanho, estado]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const qtd = parseInt(quantidade, 10);

    if (!departamento) {
      toast.warn('Selecione o departamento.');
      return;
    }
    if (!tamanho) {
      toast.warn('Selecione o tamanho.');
      return;
    }
    if (!qtd || qtd <= 0) {
      toast.warn('A quantidade deve ser maior que zero.');
      return;
    }

    if (qtd > saldoDisponivel) {
      const confirmExcedente = window.confirm(
        `Atenção: A quantidade informada (${qtd} un) é maior que o saldo atual em estoque (${saldoDisponivel} un). Deseja incluir mesmo assim?`
      );
      if (!confirmExcedente) return;
    }

    onAdicionar({
      id: `${departamento}_${tamanho}_${estado}_${Date.now()}`,
      departamento,
      tamanho,
      estado,
      quantidade: qtd,
      fabricante: 'Jucicler / Stamp',
    });

    toast.success(`Adicionado: ${qtd}x ${departamento} (Tam: ${tamanho} - ${estado})`);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-box modal-md"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '92%' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>➕</span> Adicionar Uniforme ao Envio
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
              Selecione o departamento, tamanho e a quantidade a enviar
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-row">
            <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
              🏢 Departamento:
            </label>
            <select
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              style={{ height: '36px', fontSize: '13px' }}
              required
            >
              {getListaDepartamentos().map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <div className="form-row">
              <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                📏 Tamanho:
              </label>
              <select
                value={tamanho}
                onChange={(e) => setTamanho(e.target.value)}
                style={{ height: '36px', fontSize: '13px' }}
                required
              >
                {getTamanhosPorDepartamento(departamento).map((tam) => (
                  <option key={tam} value={tam}>
                    {tam.startsWith('Boné') ? '🧢 ' : 'Tamanho: '}
                    {tam}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                🏷️ Estado:
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                style={{ height: '36px', fontSize: '13px' }}
                required
              >
                <option value="Novo">✨ Novo</option>
                <option value="Usado">🔄 Usado</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                🔢 Quantidade a Enviar:
              </label>
              <span style={{ fontSize: '11.5px', color: saldoDisponivel > 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                Saldo em Estoque: {saldoDisponivel} un
              </span>
            </div>
            <input
              type="number"
              min="1"
              step="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              style={{ height: '36px', fontSize: '13px', fontWeight: 700 }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#242b35',
                border: '1px solid #334155',
                color: '#cbd5e1',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                border: 'none',
                padding: '6px 16px',
                fontSize: '12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ➕ Adicionar ao Envio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
