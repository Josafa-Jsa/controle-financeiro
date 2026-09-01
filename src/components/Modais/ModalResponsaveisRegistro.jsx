// src/components/Modais/ModalResponsaveisRegistro.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getUser } from '../../auth/auth';
import '../Visual/modal.css';

export default function ModalResponsaveisRegistro({
  isOpen,
  onClose,
  ocorrencia,
  onSave,
}) {
  const usuario = getUser();
  const nomeOperador = usuario?.name || usuario?.nome || usuario?.email || 'Operador';

  const [formData, setFormData] = useState({
    emitidoPor: {
      nome: '',
      cargo: 'Prevenção de Perdas',
      dataHora: '',
    },
    presenciou: {
      nome: '',
      cargo: '',
    },
    atendeu: {
      nome: '',
      cargo: 'Fiscal de Loja / Segurança',
    },
    recebeu: {
      nome: '',
      cargo: 'Central de Monitoramento (CFTV)',
    },
    analisou: {
      nome: '',
    },
    autorizouEncerramento: {
      nome: '',
    },
  });

  useEffect(() => {
    if (!isOpen || !ocorrencia) return;

    const now = new Date();
    const dataHoraAtual = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;

    if (ocorrencia.responsaveisRegistro) {
      const resp = ocorrencia.responsaveisRegistro;
      setFormData({
        emitidoPor: {
          nome: resp.emitidoPor?.nome || ocorrencia.registradoPor || nomeOperador,
          cargo: 'Prevenção de Perdas',
          dataHora: resp.emitidoPor?.dataHora || dataHoraAtual,
        },
        presenciou: {
          nome: resp.presenciou?.nome || '',
          cargo: resp.presenciou?.cargo || '',
        },
        atendeu: {
          nome: resp.atendeu?.nome || ocorrencia.abordagem?.responsaveis || '',
          cargo: 'Fiscal de Loja / Segurança',
        },
        recebeu: {
          nome: resp.recebeu?.nome || '',
          cargo: 'Central de Monitoramento (CFTV)',
        },
        analisou: {
          nome: resp.analisou?.nome || '',
        },
        autorizouEncerramento: {
          nome: resp.autorizouEncerramento?.nome || '',
        },
      });
    } else {
      setFormData({
        emitidoPor: {
          nome: ocorrencia.registradoPor || nomeOperador,
          cargo: 'Prevenção de Perdas',
          dataHora: dataHoraAtual,
        },
        presenciou: {
          nome: '',
          cargo: '',
        },
        atendeu: {
          nome: ocorrencia.abordagem?.responsaveis || '',
          cargo: 'Fiscal de Loja / Segurança',
        },
        recebeu: {
          nome: '',
          cargo: 'Central de Monitoramento (CFTV)',
        },
        analisou: {
          nome: '',
        },
        autorizouEncerramento: {
          nome: '',
        },
      });
    }
  }, [ocorrencia, isOpen, nomeOperador]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !ocorrencia) return null;

  const handleFieldChange = (secao, campo, valor) => {
    setFormData((prev) => ({
      ...prev,
      [secao]: {
        ...prev[secao],
        [campo]: valor,
      },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.emitidoPor.nome.trim()) {
      toast.warn('Por favor, informe o nome de quem emitiu/registrou a ocorrência.');
      return;
    }

    onSave({
      id: ocorrencia.id,
      dadosResponsaveis: formData,
      usuario: nomeOperador,
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
        aria-label="Responsáveis pelo Registro da Ocorrência"
        style={{ maxWidth: '860px' }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '19px' }}>
              👤 Responsáveis pelo Registro & Papéis — {ocorrencia.numero}
            </h2>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Ocorrência: <strong style={{ color: '#00d2ff' }}>{ocorrencia.nome || ocorrencia.tipo}</strong>
          </div>
        </div>

        {/* Banner Informativo */}
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '6px',
            padding: '6px 12px',
            marginBottom: '10px',
            fontSize: '11.5px',
            color: '#c7d2fe',
            lineHeight: 1.35,
          }}
        >
          📋 <strong>Segregação de Funções:</strong> Separação clara entre quem emitiu/registrou, presenciou, atendeu, recebeu, analisou e autorizou.
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Seção 1: EMITIDO POR (QUEM REGISTROU) - DESTAQUE */}
          <div
            style={{
              background: '#15171b',
              border: '1px solid #283340',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '10px',
            }}
          >
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✍️</span> 1. Quem Registrou (Emitido por):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr', gap: '8px' }}>
              <div className="form-row">
                <label className="required" style={{ fontSize: '11px' }}>Nome do Emissor:</label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={formData.emitidoPor.nome}
                  onChange={(e) => handleFieldChange('emitidoPor', 'nome', e.target.value)}
                  style={{ height: '32px', fontSize: '12px' }}
                  required
                />
              </div>

              <div className="form-row">
                <label style={{ fontSize: '11px' }}>Departamento / Cargo (Fixado):</label>
                <input
                  type="text"
                  value="Prevenção de Perdas"
                  disabled
                  style={{
                    height: '32px',
                    fontSize: '12px',
                    background: '#1c2331',
                    color: '#38bdf8',
                    fontWeight: 700,
                    cursor: 'not-allowed',
                    border: '1px solid #334155',
                  }}
                />
              </div>

              <div className="form-row">
                <label style={{ fontSize: '11px' }}>Data / Hora do Registro:</label>
                <input
                  type="text"
                  placeholder="31/08/2026 11:05:43"
                  value={formData.emitidoPor.dataHora}
                  onChange={(e) => handleFieldChange('emitidoPor', 'dataHora', e.target.value)}
                  style={{ height: '32px', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* Seção 2: QUEM PRESENCIOU & QUEM ATENDEU (2 Colunas) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            {/* Quem Presenciou */}
            <div
              style={{
                background: '#15171b',
                border: '1px solid #283340',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', marginBottom: '6px' }}>
                👁️ 2. Quem Presenciou?
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div className="form-row">
                  <label style={{ fontSize: '10.5px' }}>Nome / Testemunha:</label>
                  <input
                    type="text"
                    placeholder="Ex: Maria Testemunha"
                    value={formData.presenciou.nome}
                    onChange={(e) => handleFieldChange('presenciou', 'nome', e.target.value)}
                    style={{ height: '30px', fontSize: '12px' }}
                  />
                </div>
                <div className="form-row">
                  <label style={{ fontSize: '10.5px' }}>Cargo / Setor:</label>
                  <input
                    type="text"
                    placeholder="Ex: Operadora de Caixa / Balcão"
                    value={formData.presenciou.cargo}
                    onChange={(e) => handleFieldChange('presenciou', 'cargo', e.target.value)}
                    style={{ height: '30px', fontSize: '12px' }}
                  />
                </div>
              </div>
            </div>

            {/* Quem Atendeu / Abordou */}
            <div
              style={{
                background: '#15171b',
                border: '1px solid #283340',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fb923c', marginBottom: '6px' }}>
                👮‍♂️ 3. Quem Atendeu / Abordou?
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div className="form-row">
                  <label style={{ fontSize: '10.5px' }}>Nome do Agente:</label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Segurança"
                    value={formData.atendeu.nome}
                    onChange={(e) => handleFieldChange('atendeu', 'nome', e.target.value)}
                    style={{ height: '30px', fontSize: '12px' }}
                  />
                </div>
                <div className="form-row">
                  <label style={{ fontSize: '10.5px' }}>Função / Empresa (Fixado):</label>
                  <input
                    type="text"
                    value="Fiscal de Loja / Segurança"
                    disabled
                    style={{
                      height: '30px',
                      fontSize: '11px',
                      background: '#1c2331',
                      color: '#fb923c',
                      fontWeight: 600,
                      cursor: 'not-allowed',
                      border: '1px solid #334155',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 3: QUEM RECEBEU, QUEM ANALISOU & QUEM AUTORIZOU ENCERRAMENTO (3 Colunas) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            {/* Quem Recebeu */}
            <div
              style={{
                background: '#15171b',
                border: '1px solid #283340',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#c084fc', marginBottom: '6px' }}>
                📥 4. Quem Recebeu?
              </div>
              <div className="form-row" style={{ marginBottom: '4px' }}>
                <label style={{ fontSize: '10.5px' }}>Nome do Receptor:</label>
                <input
                  type="text"
                  placeholder="Ex: Lucas Operador"
                  value={formData.recebeu.nome}
                  onChange={(e) => handleFieldChange('recebeu', 'nome', e.target.value)}
                  style={{ height: '30px', fontSize: '12px' }}
                />
              </div>
              <div className="form-row">
                <label style={{ fontSize: '10.5px' }}>Setor / Recepção (Fixado):</label>
                <input
                  type="text"
                  value="Central de Monitoramento (CFTV)"
                  disabled
                  style={{
                    height: '28px',
                    fontSize: '11px',
                    background: '#1c2331',
                    color: '#c084fc',
                    fontWeight: 600,
                    cursor: 'not-allowed',
                    border: '1px solid #334155',
                  }}
                />
              </div>
            </div>

            {/* Quem Analisou */}
            <div
              style={{
                background: '#15171b',
                border: '1px solid #283340',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80', marginBottom: '6px' }}>
                🔍 5. Quem Analisou?
              </div>
              <div className="form-row">
                <label style={{ fontSize: '10.5px' }}>Auditor / Supervisor:</label>
                <input
                  type="text"
                  placeholder="Ex: Marcos Supervisor"
                  value={formData.analisou.nome}
                  onChange={(e) => handleFieldChange('analisou', 'nome', e.target.value)}
                  style={{ height: '30px', fontSize: '12px' }}
                />
              </div>
            </div>

            {/* Quem Autorizou Encerramento */}
            <div
              style={{
                background: '#15171b',
                border: '1px solid #283340',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', marginBottom: '6px' }}>
                ⚖️ 6. Quem Autorizou?
              </div>
              <div className="form-row">
                <label style={{ fontSize: '10.5px' }}>Gerente / Autorizador:</label>
                <input
                  type="text"
                  placeholder="Ex: Roberto Gerente"
                  value={formData.autorizouEncerramento.nome}
                  onChange={(e) => handleFieldChange('autorizouEncerramento', 'nome', e.target.value)}
                  style={{ height: '30px', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          <hr className="modal-divider" style={{ margin: '4px 0' }} />

          {/* Botões do Rodapé */}
          <div className="modal-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="cancela" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="salve"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff' }}
            >
              💾 Salvar Responsáveis pelo Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
