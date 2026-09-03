// src/components/Modais/ModalEntradaUniforme.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  getListaDepartamentos,
  TAMANHOS_PADRAO,
  FABRICANTES_PADRAO,
  getTamanhosPorDepartamento,
} from '../../services/uniformesService';
import '../Visual/modal.css';

export default function ModalEntradaUniforme({
  isOpen,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState({
    departamento: 'Hortifruti',
    tamanho: 'M',
    quantidade: '1',
    estado: 'Novo',
    fabricante: 'Jucicler',
    outroFabricante: '',
    observacoes: '',
  });

  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        departamento: 'Hortifruti',
        tamanho: 'M',
        quantidade: '1',
        estado: 'Novo',
        fabricante: 'Jucicler',
        outroFabricante: '',
        observacoes: '',
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.departamento) {
      toast.warn('Selecione o departamento.');
      return;
    }
    if (!formData.tamanho) {
      toast.warn('Selecione o tamanho.');
      return;
    }
    const qtd = parseInt(formData.quantidade, 10);
    if (!qtd || qtd <= 0) {
      toast.warn('Informe uma quantidade maior que zero.');
      return;
    }
    if (formData.fabricante === 'Outro' && !formData.outroFabricante.trim()) {
      toast.warn('Informe o nome do fabricante.');
      return;
    }

    setSalvando(true);
    try {
      const fabricanteFinal =
        formData.fabricante === 'Outro'
          ? formData.outroFabricante.trim()
          : formData.fabricante;

      const payload = {
        departamento: formData.departamento,
        tamanho: formData.tamanho,
        quantidade: qtd,
        estado: formData.estado,
        fabricante: fabricanteFinal,
        observacoes: formData.observacoes.trim(),
      };

      await onSave(payload);
      toast.success(
        `Entrada de ${qtd} uniforme(s) para ${formData.departamento} cadastrada com sucesso!`
      );
      onClose();
    } catch (err) {
      console.error('Erro ao cadastrar entrada de uniforme:', err);
      toast.error('Erro ao salvar a entrada do uniforme.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-box modal-md"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', width: '92%' }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            ➕
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', color: '#f8fafc' }}>
              Cadastrar Entrada de Uniforme
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Registre o recebimento e abastecimento de uniformes novos ou usados no estoque.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Linha 1: Departamento e Estado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
            <div className="form-row">
              <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                🏢 Departamento referente ao Uniforme:
              </label>
              <select
                name="departamento"
                value={formData.departamento}
                onChange={handleChange}
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

            <div className="form-row">
              <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                🏷️ Estado do Uniforme:
              </label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                style={{ height: '36px', fontSize: '13px' }}
                required
              >
                <option value="Novo">✨ Novo</option>
                <option value="Usado">🔄 Usado</option>
              </select>
            </div>
          </div>

          {/* Linha 2: Tamanho e Quantidade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <div className="form-row">
              <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                📏 Tamanho do Uniforme:
              </label>
              <select
                name="tamanho"
                value={formData.tamanho}
                onChange={handleChange}
                style={{ height: '36px', fontSize: '13px' }}
                required
              >
                {getTamanhosPorDepartamento(formData.departamento).map((tam) => (
                  <option key={tam} value={tam}>
                    {tam.startsWith('Boné') ? '🧢 ' : 'Tamanho: '}
                    {tam}
                  </option>
                ))}
                <option value="Personalizado">Outro Tamanho (Digitar)...</option>
              </select>
              {formData.tamanho === 'Personalizado' && (
                <input
                  type="text"
                  placeholder="Ex: 56, Sob Medida..."
                  value={tamanhoCustom}
                  onChange={(e) => setTamanhoCustom(e.target.value)}
                  style={{ marginTop: '6px', height: '34px', fontSize: '12.5px' }}
                  required
                />
              )}
            </div>

            <div className="form-row">
              <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                🔢 Quantidade a ser dada Entrada:
              </label>
              <input
                type="number"
                name="quantidade"
                min="1"
                step="1"
                placeholder="Ex: 5"
                value={formData.quantidade}
                onChange={handleChange}
                style={{ height: '36px', fontSize: '13px', fontWeight: 700 }}
                required
              />
            </div>
          </div>

          {/* Linha 3: Empresa Responsável pela Fabricação */}
          <div className="form-row">
            <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
              🏭 Empresa Responsável pela Fabricação:
            </label>
            <select
              name="fabricante"
              value={formData.fabricante}
              onChange={handleChange}
              style={{ height: '36px', fontSize: '13px' }}
              required
            >
              {FABRICANTES_PADRAO.map((fab) => (
                <option key={fab} value={fab}>
                  {fab}
                </option>
              ))}
            </select>
            {formData.fabricante === 'Outro' && (
              <input
                type="text"
                placeholder="Digite o nome da confecção/fabricante..."
                value={fabricanteCustom}
                onChange={(e) => setFabricanteCustom(e.target.value)}
                style={{ marginTop: '6px', height: '34px', fontSize: '12.5px' }}
                required
              />
            )}
          </div>

          {/* Linha 4: Observações / Lote / Detalhes */}
          <div className="form-row">
            <label style={{ fontSize: '12px', color: '#cbd5e1' }}>
              📝 Observações / Nº Nota / Lote (Opcional):
            </label>
            <textarea
              name="observacoes"
              rows="2"
              value={formData.observacoes}
              onChange={handleChange}
              placeholder="Ex: Lote recebido em perfeito estado referente ao pedido #4491..."
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #2b2b2e',
                background: '#121214',
                color: '#fff',
                fontSize: '12.5px',
                resize: 'vertical',
                minHeight: '44px',
              }}
            />
          </div>

          {/* Rodapé de Ações */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              style={{
                background: '#242b35',
                border: '1px solid #334155',
                color: '#cbd5e1',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={salvando}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                border: 'none',
                padding: '8px 18px',
                fontSize: '12.5px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
              }}
            >
              {salvando ? 'Salvando...' : '💾 Confirmar Entrada no Estoque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
