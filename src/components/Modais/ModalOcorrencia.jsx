// src/components/Modais/ModalOcorrencia.jsx
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { gerarProximoNumeroOcorrencia } from '../../services/prevencaoService';
import { getUser } from '../../auth/auth';
import '../Visual/modal.css';

export const TIPOS_OCORRENCIA = [
  'Furto',
  'Tentativa de furto',
  'Fraude',
  'Avaria',
  'Divergência de estoque',
  'Comportamento suspeito',
  'Conflito com cliente',
  'Outros',
];

export const CLASSIFICACOES = [
  { label: '🟢 Baixa', value: 'Baixa', cor: '#10b981' },
  { label: '🟡 Média', value: 'Média', cor: '#f59e0b' },
  { label: '🟠 Alta', value: 'Alta', cor: '#f97316' },
  { label: '🔴 Crítica', value: 'Crítica', cor: '#ef4444' },
];

export const STATUS_OCORRENCIA = [
  'Em Aberto',
  'Em Andamento',
  'Finalizada',
];

export const FILIAIS = [
  'Filial 1',
  'Filial 2',
  'Filial 3',
  'Filial 4',
  'Filial 5',
  'Filial 6',
  'Filial 7',
  'Filial Particular',
];

export default function ModalOcorrencia({
  isOpen,
  onClose,
  onSave,
  ocorrenciaParaEditar = null,
}) {
  const [formData, setFormData] = useState({
    numero: '',
    nome: '',
    status: 'Em Aberto',
    data: '',
    horaInicio: '',
    horaTermino: '',
    tipo: 'Furto',
    classificacao: 'Média',
    local: '',
    setor: '',
    filial: 'Filial 1',
    descricao: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    const user = getUser();
    const userFilialPadrao = user?.filial || 'Filial 1';

    if (ocorrenciaParaEditar) {
      setFormData({
        id: ocorrenciaParaEditar.id,
        numero: ocorrenciaParaEditar.numero || '',
        nome: ocorrenciaParaEditar.nome || ocorrenciaParaEditar.titulo || '',
        status: ocorrenciaParaEditar.status || 'Em Aberto',
        data: ocorrenciaParaEditar.data || '',
        horaInicio: ocorrenciaParaEditar.horaInicio || '',
        horaTermino: ocorrenciaParaEditar.horaTermino || '',
        tipo: ocorrenciaParaEditar.tipo || 'Furto',
        classificacao: ocorrenciaParaEditar.classificacao || 'Média',
        local: ocorrenciaParaEditar.local || '',
        setor: ocorrenciaParaEditar.setor || '',
        filial: ocorrenciaParaEditar.filial || userFilialPadrao,
        descricao: ocorrenciaParaEditar.descricao || '',
      });
    } else {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');

      setFormData({
        numero: gerarProximoNumeroOcorrencia(),
        nome: '',
        status: 'Em Aberto',
        data: `${yyyy}-${mm}-${dd}`,
        horaInicio: `${hh}:${min}`,
        horaTermino: '',
        tipo: 'Furto',
        classificacao: 'Média',
        local: '',
        setor: '',
        filial: userFilialPadrao,
        descricao: '',
      });
    }
  }, [isOpen, ocorrenciaParaEditar]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.warn('Por favor, informe o Nome da Ocorrência.');
      return;
    }
    if (!formData.data) {
      toast.warn('Por favor, informe a data da ocorrência.');
      return;
    }
    if (!formData.horaInicio) {
      toast.warn('Por favor, informe a hora do início.');
      return;
    }
    if (!formData.tipo) {
      toast.warn('Por favor, selecione o tipo de ocorrência.');
      return;
    }

    const user = getUser();
    const payload = {
      ...formData,
      nome: formData.nome.trim(),
      filial: formData.filial || user?.filial || 'Filial 1',
      registradoPor: user?.name || user?.nome || user?.email || 'Operador',
    };

    onSave(payload);
  };

  if (!isOpen) return null;

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
        aria-label={ocorrenciaParaEditar ? 'Editar Ocorrência' : 'Registrar Ocorrência'}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '19px' }}>
            {ocorrenciaParaEditar ? '🛡️ Editar Ocorrência' : '🛡️ Registrar Nova Ocorrência'}
          </h2>
          <span style={{ fontSize: '13px', color: '#00d2ff', fontWeight: 700, fontFamily: 'monospace', background: 'rgba(0, 210, 255, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
            {formData.numero}
          </span>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Linha 1: Nome da Ocorrência e Tipo */}
          <div className="form-grid">
            <div className="form-row">
              <label className="required">📌 Nome da Ocorrência:</label>
              <input
                type="text"
                name="nome"
                placeholder="Ex: Furto de ferramentas no setor de expedição"
                value={formData.nome}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <label className="required">⚠️ Tipo de Ocorrência (Do que se trata):</label>
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                required
              >
                {TIPOS_OCORRENCIA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 2: Data, Hora Início, Hora Término, Gravidade e Status */}
          <div className="form-grid-4">
            <div className="form-row">
              <label className="required">📅 Data:</label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <label className="required">⏱️ Hora Início:</label>
              <input
                type="time"
                name="horaInicio"
                value={formData.horaInicio}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <label className="required">🏷️ Gravidade:</label>
              <select
                name="classificacao"
                value={formData.classificacao}
                onChange={handleChange}
                required
              >
                {CLASSIFICACOES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label className="required">📌 Status:</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                {STATUS_OCORRENCIA.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 3: Local, Setor e Filial */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
            <div className="form-row">
              <label>📍 Local:</label>
              <input
                type="text"
                name="local"
                placeholder="Ex: Loja Física, Depósito, Estacionamento..."
                value={formData.local}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <label>🏢 Setor:</label>
              <input
                type="text"
                name="setor"
                placeholder="Ex: Caixa, Vendas, TI, Expedição..."
                value={formData.setor}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <label className="required">🏢 Filial Referente:</label>
              <select
                name="filial"
                value={formData.filial}
                onChange={handleChange}
                required
              >
                {FILIAIS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <hr className="modal-divider" style={{ margin: '4px 0' }} />

          {/* Botões de Ação */}
          <div className="modal-buttons" style={{ marginTop: '4px' }}>
            <button type="button" className="cancela" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="salve">
              💾 Salvar Ocorrência
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
