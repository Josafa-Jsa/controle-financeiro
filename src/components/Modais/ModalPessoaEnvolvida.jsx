// src/components/Modais/ModalPessoaEnvolvida.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import '../Visual/modal.css';

const criarNovaPessoa = (index = 1) => ({
  id: Date.now() + Math.random(),
  nome: '',
  documento: '',
  sexo: 'Não informado',
  descricaoFisica: '',
  vestimenta: '',
  caracteristicas: '',
  clienteIdentificado: 'Não',
  funcionario: 'Não',
  formaIdentificacao: '',
  observacoes: '',
});

export default function ModalPessoaEnvolvida({
  isOpen,
  onClose,
  ocorrencia,
  onSave,
}) {
  const [listaPessoas, setListaPessoas] = useState([criarNovaPessoa(1)]);
  const [abaAtiva, setAbaAtiva] = useState(0);

  useEffect(() => {
    if (!isOpen || !ocorrencia) return;

    if (Array.isArray(ocorrencia.pessoasEnvolvidas) && ocorrencia.pessoasEnvolvidas.length > 0) {
      setListaPessoas(ocorrencia.pessoasEnvolvidas);
    } else if (ocorrencia.pessoaEnvolvida) {
      setListaPessoas([ocorrencia.pessoaEnvolvida]);
    } else {
      setListaPessoas([criarNovaPessoa(1)]);
    }
    setAbaAtiva(0);
  }, [ocorrencia, isOpen]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !ocorrencia) return null;

  const pessoaAtual = listaPessoas[abaAtiva] || listaPessoas[0] || criarNovaPessoa(1);

  const handleCampoChange = (campo, valor) => {
    setListaPessoas((prev) => {
      const novaLista = [...prev];
      if (novaLista[abaAtiva]) {
        novaLista[abaAtiva] = {
          ...novaLista[abaAtiva],
          [campo]: valor,
        };
      }
      return novaLista;
    });
  };

  const handleAdicionarNovaPessoa = () => {
    const nova = criarNovaPessoa(listaPessoas.length + 1);
    setListaPessoas((prev) => [...prev, nova]);
    setAbaAtiva(listaPessoas.length);
    toast.info(`Guia para Pessoa ${listaPessoas.length + 1} criada.`);
  };

  const handleRemoverPessoa = (index, e) => {
    if (e) e.stopPropagation();

    if (listaPessoas.length <= 1) {
      // Limpa os dados em vez de excluir a única guia
      setListaPessoas([criarNovaPessoa(1)]);
      toast.info('Campos da pessoa envolvida limpos.');
      return;
    }

    const novaLista = listaPessoas.filter((_, idx) => idx !== index);
    setListaPessoas(novaLista);
    if (abaAtiva >= novaLista.length) {
      setAbaAtiva(Math.max(0, novaLista.length - 1));
    }
    toast.info('Pessoa envolvida removida.');
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    onSave({
      id: ocorrencia.id,
      pessoas: listaPessoas,
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
        aria-label="Identificação das Pessoas Envolvidas"
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '19px' }}>
              👥 Pessoas Envolvidas — {ocorrencia.numero}
            </h2>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Ocorrência: <strong style={{ color: '#00d2ff' }}>{ocorrencia.nome || ocorrencia.tipo}</strong>
          </div>
        </div>

        {/* Barra de Guias / Tabs das Pessoas Envolvidas */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderBottom: '1px solid #283340',
            paddingBottom: '8px',
            marginBottom: '10px',
            overflowX: 'auto',
          }}
        >
          {listaPessoas.map((p, idx) => {
            const estaAtiva = abaAtiva === idx;
            const nomeGuia = p.nome?.trim() ? `👤 ${p.nome.trim()}` : `👤 Pessoa ${idx + 1}`;

            return (
              <div
                key={p.id || idx}
                onClick={() => setAbaAtiva(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: estaAtiva ? 700 : 500,
                  cursor: 'pointer',
                  background: estaAtiva ? '#3b82f6' : '#242b35',
                  color: estaAtiva ? '#ffffff' : '#94a3b8',
                  border: estaAtiva ? '1px solid #3b82f6' : '1px solid #334155',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{nomeGuia}</span>
                {listaPessoas.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoverPessoa(idx, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: estaAtiva ? '#fee2e2' : '#f87171',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: 0,
                      lineHeight: 1,
                    }}
                    title="Remover esta pessoa"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          {/* Botão + para Adicionar Nova Pessoa */}
          <button
            type="button"
            onClick={handleAdicionarNovaPessoa}
            className="quick-action-btn"
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#4ade80',
              borderColor: 'rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
            title="Adicionar outra pessoa envolvida"
          >
            <span>➕</span> Nova Pessoa
          </button>
        </div>

        {/* Nota LGPD / ANPD */}
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '6px',
            padding: '6px 12px',
            marginBottom: '10px',
            fontSize: '11.5px',
            color: '#a7f3d0',
            lineHeight: 1.35,
          }}
        >
          🔒 <strong>Minimização (LGPD/ANPD):</strong> Colete apenas o estritamente necessário. Documentos (CPF/RG) são facultativos.
        </div>

        {/* Formulário da Pessoa Ativa */}
        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Linha 1: 3 Colunas (Nome, Documento, Sexo) */}
          <div className="form-grid-3">
            <div className="form-row">
              <label>Nome (se informado / identificado):</label>
              <input
                type="text"
                name="nome"
                value={pessoaAtual.nome || ''}
                onChange={(e) => handleCampoChange('nome', e.target.value)}
                placeholder={`Ex: Nome da Pessoa ${abaAtiva + 1}`}
              />
            </div>

            <div className="form-row">
              <label>Documento (se houver base legal):</label>
              <input
                type="text"
                name="documento"
                value={pessoaAtual.documento || ''}
                onChange={(e) => handleCampoChange('documento', e.target.value)}
                placeholder="CPF / RG (Facultativo - LGPD)"
              />
            </div>

            <div className="form-row">
              <label>Sexo (se necessário):</label>
              <select
                name="sexo"
                value={pessoaAtual.sexo || 'Não informado'}
                onChange={(e) => handleCampoChange('sexo', e.target.value)}
              >
                <option value="Não informado">Não informado</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          {/* Linha 2: 3 Colunas (Cliente?, Funcionário?, Forma de Identificação) */}
          <div className="form-grid-3">
            <div className="form-row">
              <label>Cliente identificado?</label>
              <select
                name="clienteIdentificado"
                value={pessoaAtual.clienteIdentificado || 'Não'}
                onChange={(e) => handleCampoChange('clienteIdentificado', e.target.value)}
              >
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>

            <div className="form-row">
              <label>Funcionário / Colaborador?</label>
              <select
                name="funcionario"
                value={pessoaAtual.funcionario || 'Não'}
                onChange={(e) => handleCampoChange('funcionario', e.target.value)}
              >
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>

            <div className="form-row">
              <label>Identificação obtida de que forma?</label>
              <input
                type="text"
                name="formaIdentificacao"
                value={pessoaAtual.formaIdentificacao || ''}
                onChange={(e) => handleCampoChange('formaIdentificacao', e.target.value)}
                placeholder="Ex: Câmeras CFTV, abordagem, testemunha..."
              />
            </div>
          </div>

          {/* Linha 3: 3 Colunas (Descrição Física, Vestimenta, Características) */}
          <div className="form-grid-3">
            <div className="form-row">
              <label>Descrição Física:</label>
              <input
                type="text"
                name="descricaoFisica"
                value={pessoaAtual.descricaoFisica || ''}
                onChange={(e) => handleCampoChange('descricaoFisica', e.target.value)}
                placeholder="Ex: Estatura média, aprox. 30 anos..."
              />
            </div>

            <div className="form-row">
              <label>Vestimenta:</label>
              <input
                type="text"
                name="vestimenta"
                value={pessoaAtual.vestimenta || ''}
                onChange={(e) => handleCampoChange('vestimenta', e.target.value)}
                placeholder="Ex: Camiseta preta, calça jeans, boné..."
              />
            </div>

            <div className="form-row">
              <label>Características Relevantes:</label>
              <input
                type="text"
                name="caracteristicas"
                value={pessoaAtual.caracteristicas || ''}
                onChange={(e) => handleCampoChange('caracteristicas', e.target.value)}
                placeholder="Ex: Tatuagem, mochila, óculos..."
              />
            </div>
          </div>

          {/* Linha 4: Observações Gerais */}
          <div className="form-row">
            <label>Observações Gerais da Pessoa:</label>
            <textarea
              name="observacoes"
              rows="2"
              value={pessoaAtual.observacoes || ''}
              onChange={(e) => handleCampoChange('observacoes', e.target.value)}
              placeholder="Outras informações pertinentes a este envolvido..."
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #2b2b2e',
                background: '#121214',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
                fontSize: '13px',
                fontFamily: 'inherit',
                minHeight: '46px',
                maxHeight: '70px',
                resize: 'vertical',
              }}
            />
          </div>

          <hr className="modal-divider" style={{ margin: '4px 0' }} />

          {/* Botões do Rodapé */}
          <div className="modal-buttons" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Total de envolvidos:{' '}
              <strong style={{ color: '#fff' }}>
                {listaPessoas.length} {listaPessoas.length === 1 ? 'pessoa' : 'pessoas'}
              </strong>
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="cancela"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="salve"
              >
                💾 Salvar Pessoas Envolvidas
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
