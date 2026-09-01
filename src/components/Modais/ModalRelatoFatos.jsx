// src/components/Modais/ModalRelatoFatos.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import '../Visual/modal.css';

const EXEMPLO_MODELO =
  'Durante o acompanhamento realizado pela equipe de prevenção de perdas, foi observado que o indivíduo retirou produtos da área de exposição e os colocou em uma mochila, posteriormente deslocando-se em direção à saída do estabelecimento sem realizar o pagamento dos produtos.';

export default function ModalRelatoFatos({
  isOpen,
  onClose,
  ocorrencia,
  onSave,
}) {
  const [relatoFatos, setRelatoFatos] = useState('');
  const [medidasAdotadas, setMedidasAdotadas] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (ocorrencia) {
      setRelatoFatos(ocorrencia.relatoFatos || '');
      setMedidasAdotadas(ocorrencia.medidasAdotadas || '');
    }
  }, [ocorrencia, isOpen]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !ocorrencia) return null;

  const handleSalvar = (abrirPessoa = false) => {
    if (!relatoFatos.trim()) {
      toast.warn('Por favor, redija o relato dos fatos observados.');
      return;
    }

    onSave({
      id: ocorrencia.id,
      relatoFatos: relatoFatos.trim(),
      medidasAdotadas: medidasAdotadas.trim(),
      abrirPessoa,
    });
  };

  const handleUsarExemplo = () => {
    if (!relatoFatos.trim()) {
      setRelatoFatos(EXEMPLO_MODELO);
      toast.info('Estrutura de exemplo inserida. Adapte aos detalhes do caso.');
    }
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
        aria-label="Relato Factual dos Fatos"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '19px' }}>
            📝 Relato dos Fatos — {ocorrencia.numero}
          </h2>
          <div style={{ display: 'flex', gap: '6px', fontSize: '11.5px' }}>
            <span style={{ background: '#242b35', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
              Tipo: <strong style={{ color: '#fff' }}>{ocorrencia.tipo}</strong>
            </span>
            <span style={{ background: '#242b35', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
              Gravidade: <strong style={{ color: '#fff' }}>{ocorrencia.classificacao}</strong>
            </span>
          </div>
        </div>

        {/* Banner de Orientação Factual & Objetiva */}
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '10px',
            fontSize: '12px',
            color: '#cbd5e1',
            lineHeight: 1.35,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              💡 <strong>Diretriz Factual:</strong> Descreva de forma objetiva apenas o que foi observado em ordem cronológica (sem juízo de valor).
            </span>
            <button
              type="button"
              onClick={handleUsarExemplo}
              className="quick-action-btn"
              style={{ padding: '2px 8px', fontSize: '11px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', borderColor: '#3b82f6', whiteSpace: 'nowrap' }}
              title="Inserir modelo como base"
            >
              📄 Usar Modelo
            </button>
          </div>
        </div>

        <form
          className="modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSalvar(false);
          }}
        >
          {/* Campo Grande de Relato dos Fatos */}
          <div className="form-row">
            <label className="required">📋 Descrição Objetiva dos Fatos Observados:</label>
            <textarea
              name="relatoFatos"
              rows="4"
              placeholder="Descreva de maneira detalhada e factual o comportamento observado, itens envolvidos, dinâmica do ocorrido e desfecho..."
              value={relatoFatos}
              onChange={(e) => setRelatoFatos(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #2b2b2e',
                background: '#121214',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
                fontSize: '13px',
                fontFamily: 'inherit',
                minHeight: '90px',
                maxHeight: '130px',
                resize: 'vertical',
                lineHeight: 1.45,
              }}
              required
            />
          </div>

          {/* Campo Complementar: Providências Adotadas */}
          <div className="form-row">
            <label>🛡️ Providências & Medidas Adotadas (Opcional):</label>
            <input
              type="text"
              name="medidasAdotadas"
              placeholder="Ex: Abordagem orientada na saída, mercadorias recuperadas voluntariamente, acionamento da liderança..."
              value={medidasAdotadas}
              onChange={(e) => setMedidasAdotadas(e.target.value)}
            />
          </div>

          <hr className="modal-divider" style={{ margin: '4px 0' }} />

          {/* Botões de Ação */}
          <div className="modal-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="cancela"
              onClick={onClose}
              disabled={enviando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="salve"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#fff' }}
              onClick={() => handleSalvar(true)}
              disabled={enviando}
            >
              👥 Relatar Pessoas Envolvidas
            </button>
            <button
              type="submit"
              className="salve"
              disabled={enviando}
            >
              💾 Salvar Relato
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
