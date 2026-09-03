// src/components/Modais/ModalProdutoOS.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  buscarEquipamentoPorSerie,
  salvarEquipamentoNaBase,
} from '../../services/produtosOSService';
import { toast } from 'react-toastify';
import '../Visual/modal.css';

export default function ModalProdutoOS({
  isOpen,
  onClose,
  dadosEquipamento = {},
  onSalvar,
  ordens = [],
}) {
  const [equipamento, setEquipamento] = useState({
    marca: '',
    modelo: '',
    serie: '',
    problema: '',
  });

  const [produtoLocalizado, setProdutoLocalizado] = useState(false);
  const [nomeLocalizado, setNomeLocalizado] = useState('');
  const serieInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setEquipamento({
        marca: dadosEquipamento?.marca || '',
        modelo: dadosEquipamento?.modelo || '',
        serie: dadosEquipamento?.serie || '',
        problema: dadosEquipamento?.problema || '',
      });
      setProdutoLocalizado(false);
      setNomeLocalizado('');
      setTimeout(() => {
        serieInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, dadosEquipamento]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSerieChange = (e) => {
    const valor = e.target.value;
    setEquipamento((prev) => ({ ...prev, serie: valor }));

    if (valor.trim().length >= 2) {
      const encontrado = buscarEquipamentoPorSerie(valor, ordens);
      if (encontrado) {
        setEquipamento({
          marca: encontrado.marca || equipamento.marca,
          modelo: encontrado.modelo || equipamento.modelo,
          serie: valor,
          problema: encontrado.problema || equipamento.problema,
        });
        setProdutoLocalizado(true);
        setNomeLocalizado(`${encontrado.marca || ''} ${encontrado.modelo || ''}`.trim() || valor);
        toast.success(`✓ Produto localizado: ${encontrado.marca} ${encontrado.modelo}! Dados preenchidos automaticamente.`);
      } else {
        if (produtoLocalizado) setProdutoLocalizado(false);
      }
    } else {
      if (produtoLocalizado) setProdutoLocalizado(false);
    }
  };

  const handleChange = (campo, valor) => {
    setEquipamento((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!equipamento.marca?.trim() && !equipamento.modelo?.trim() && !equipamento.serie?.trim()) {
      toast.warn('Preencha ao menos a marca, modelo ou número de série do produto.');
      return;
    }

    // Salva na base de equipamentos/produtos para reutilização
    salvarEquipamentoNaBase(equipamento);

    onSalvar?.(equipamento);
    toast.success('Dados do produto/equipamento salvos com sucesso!');
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
            <span style={{ fontSize: '1.4rem' }}>📦</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#ff5252' }}>
                Cadastrar Produto / Equipamento
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                Informe a série, marca e modelo ou problema do equipamento
              </span>
            </div>
          </div>
        </div>

        {/* Alerta de Auto-busca ou Sucesso */}
        {produtoLocalizado ? (
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid #22c55e',
              color: '#86efac',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>✅</span>
            <div>
              <strong>Produto Reconhecido:</strong> {nomeLocalizado} — os dados foram preenchidos automaticamente pela série!
            </div>
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: '#93c5fd',
              padding: '9px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>💡</span>
            <span>
              <strong>Dica:</strong> Ao inserir o <u>Número de Série</u> de um produto já cadastrado ou atendido, os dados de Marca e Modelo serão preenchidos automaticamente.
            </span>
          </div>
        )}

        {/* Formulário */}
        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Número de Série em destaque */}
          <div className="form-row">
            <label htmlFor="prod-serie" style={{ color: '#fff', fontWeight: 700 }}>
              🔢 Número de Série (Auto-busca):
            </label>
            <input
              ref={serieInputRef}
              id="prod-serie"
              type="text"
              value={equipamento.serie}
              placeholder="Ex: SN-987654321, MAC ou Nº de Série"
              onChange={handleSerieChange}
              style={{
                borderColor: produtoLocalizado ? '#22c55e' : undefined,
                boxShadow: produtoLocalizado ? '0 0 0 2px rgba(34, 197, 94, 0.2)' : undefined,
              }}
            />
          </div>

          <div className="form-grid">
            {/* Marca */}
            <div className="form-row">
              <label htmlFor="prod-marca" style={{ color: '#fff', fontWeight: 700 }}>
                🏷️ Marca:
              </label>
              <input
                id="prod-marca"
                type="text"
                value={equipamento.marca}
                placeholder="Ex: MikroTik, Ubiquiti, Intelbras, Dell..."
                onChange={(e) => handleChange('marca', e.target.value)}
                required
              />
            </div>

            {/* Modelo */}
            <div className="form-row">
              <label htmlFor="prod-modelo" style={{ color: '#fff', fontWeight: 700 }}>
                💻 Modelo:
              </label>
              <input
                id="prod-modelo"
                type="text"
                value={equipamento.modelo}
                placeholder="Ex: RB750Gr3, LiteBeam M5, Switch 24p..."
                onChange={(e) => handleChange('modelo', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Problema Relatado */}
          <div className="form-row">
            <label htmlFor="prod-problema">⚠️ Problema Relatado pelo Cliente:</label>
            <textarea
              id="prod-problema"
              rows={4}
              value={equipamento.problema}
              placeholder="Descreva o defeito, falha ou comportamento apresentado pelo produto..."
              onChange={(e) => handleChange('problema', e.target.value)}
            />
          </div>

          {/* Botões */}
          <div className="modal-buttons" style={{ marginTop: '16px' }}>
            <button className="salve" type="submit">
              💾 Salvar Produto
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
