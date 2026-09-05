// src/components/Modais/ModalEntregaUniforme.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  getListaDepartamentos,
  TAMANHOS_PADRAO,
  getTamanhosPorDepartamento,
} from '../../services/uniformesService';
import {
  gerarComprovanteUniformeBlob,
} from '../../utils/gerarComprovanteUniformePDF';
import ModalVisualizadorDocumento from './ModalVisualizadorDocumento';
import { getUser } from '../../auth/auth';
import '../Visual/modal.css';

export default function ModalEntregaUniforme({
  isOpen,
  onClose,
  estoque = [],
  onSave,
}) {
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    matricula: '',
    departamento: 'Hortifruti',
    tamanho: 'M',
    estado: 'Novo',
    quantidade: '1',
    trocaComDevolucao: true,
    observacoes: '',
  });

  const [salvando, setSalvando] = useState(false);
  const [modalTermoAberto, setModalTermoAberto] = useState(false);
  const [termoBlob, setTermoBlob] = useState(null);

  // Calcula saldo em estoque disponível para a combinação selecionada
  const saldoDisponivel = useMemo(() => {
    const item = estoque.find(
      (i) => i.departamento === formData.departamento && i.tamanho === formData.tamanho
    );
    if (!item) return 0;
    return formData.estado === 'Novo'
      ? (Number(item.estado_novo_qtd) || 0)
      : (Number(item.estado_usado_qtd) || 0);
  }, [estoque, formData.departamento, formData.tamanho, formData.estado]);

  // Inicializa o formulário ao abrir
  useEffect(() => {
    if (isOpen) {
      setFormData({
        nome: '',
        cpf: '',
        matricula: '',
        departamento: 'Hortifruti',
        tamanho: 'M',
        estado: 'Novo',
        quantidade: '1',
        trocaDevolucao: false,
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

  const formatCPF = (v) => {
    const d = String(v || '').replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'cpf') {
      setFormData((prev) => ({ ...prev, cpf: formatCPF(value) }));
    } else if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validarCampos = () => {
    if (!formData.nome.trim()) {
      toast.warn('Informe o nome completo do colaborador.');
      return false;
    }
    if (!formData.cpf.trim() || formData.cpf.replace(/\D/g, '').length < 11) {
      toast.warn('Informe um CPF válido com 11 dígitos.');
      return false;
    }
    if (!formData.matricula.trim()) {
      toast.warn('Informe a matrícula do colaborador.');
      return false;
    }
    if (!formData.departamento) {
      toast.warn('Selecione o departamento.');
      return false;
    }
    if (!formData.tamanho) {
      toast.warn('Selecione o tamanho do uniforme.');
      return false;
    }
    const qtd = parseInt(formData.quantidade, 10);
    if (!qtd || qtd <= 0) {
      toast.warn('A quantidade deve ser maior que zero.');
      return false;
    }

    // TRAVA OBRIGATÓRIA: Bloqueio estrito de entrega sem estoque
    if (saldoDisponivel <= 0) {
      toast.error(
        `⛔ Entrega Bloqueada: Não há estoque disponível para ${formData.departamento} (Tam: ${formData.tamanho} - ${formData.estado}). Saldo atual: 0 un.`
      );
      return false;
    }

    if (qtd > saldoDisponivel) {
      toast.error(
        `⛔ Entrega Bloqueada: A quantidade informada (${qtd} un) excede o saldo disponível em estoque (${saldoDisponivel} un).`
      );
      return false;
    }

    return true;
  };

  // Ação Imprimir Termo / Recibo em Modal Nativo do Sistema
  const handleImprimir = () => {
    if (!validarCampos()) return;
    const user = getUser();
    const dadosParaPDF = {
      ...formData,
      responsavel: user?.name || user?.nome || 'Operador / Encarregado',
    };

    try {
      const blob = gerarComprovanteUniformeBlob(dadosParaPDF);
      setTermoBlob(blob);
      setModalTermoAberto(true);
    } catch (err) {
      console.error('Erro ao gerar termo de entrega em PDF:', err);
      toast.error('Erro ao abrir visualização do termo.');
    }
  };

  const executarSalvarEntrega = async () => {
    setSalvando(true);
    try {
      const user = getUser();
      const payload = {
        ...formData,
        responsavel: user?.name || user?.nome || 'Operador',
        assinatura: 'Assinatura na Folha A4 Impressa',
        colaborador: formData.nome.trim(),
      };

      await onSave(payload);
      toast.success(`Entrega de ${formData.quantidade} uniforme(s) registrada com sucesso!`);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar entrega de uniforme:', err);
      toast.error('Erro ao registrar a entrega do uniforme.');
    } finally {
      setSalvando(false);
    }
  };

  // Ação Salvar Entrega
  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!validarCampos()) return;
    await executarSalvarEntrega();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-box modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '92%', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '10px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📦</span> Registrar Entrega de Uniforme
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Preencha os dados do colaborador, emita o termo oficial e recolha a assinatura física na folha A4 impressa.
            </p>
          </div>
        </div>

        {/* ALERTA DE REGRA DE TROCA */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 700 }}>
            REGRA DE TROCA: A substituição de uniforme é realizada somente mediante a DEVOLUÇÃO DO USADO (VELHO).
          </span>
        </div>

        <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Linha 1: Nome Completo */}
          <div className="form-row">
            <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
              👤 Nome Completo do Colaborador:
            </label>
            <input
              type="text"
              name="nome"
              placeholder="Ex: João da Silva Santos"
              value={formData.nome}
              onChange={handleChange}
              style={{ height: '36px', fontSize: '13px' }}
              required
            />
          </div>

          {/* Linha 2: CPF e Matrícula */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-row">
              <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                📄 CPF:
              </label>
              <input
                type="text"
                name="cpf"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={handleChange}
                style={{ height: '36px', fontSize: '13px' }}
                required
              />
            </div>

            <div className="form-row">
              <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                🏷️ Matrícula / Registro:
              </label>
              <input
                type="text"
                name="matricula"
                placeholder="Ex: 10458"
                value={formData.matricula}
                onChange={handleChange}
                style={{ height: '36px', fontSize: '13px' }}
                required
              />
            </div>
          </div>

          {/* Linha 3: Departamento e Tamanho */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
            <div className="form-row">
              <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                🏢 Departamento:
              </label>
              <select
                name="departamento"
                value={formData.departamento}
                onChange={handleChange}
                style={{ height: '36px', fontSize: '13px' }}
                required
              >
                {getListaDepartamentos().map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

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
                {getTamanhosPorDepartamento(formData.departamento).map((t) => (
                  <option key={t} value={t}>
                    {t.startsWith('Boné') ? '🧢 ' : 'Tamanho: '}
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 4: Estado do Uniforme e Quantidade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-row">
              <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                ✨ Estado do Uniforme:
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

            <div className="form-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                  🔢 Quantidade Entregue:
                </label>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: saldoDisponivel > 0 ? '#34d399' : '#f87171',
                  }}
                >
                  Saldo: {saldoDisponivel} un
                </span>
              </div>
              <input
                type="number"
                name="quantidade"
                min="1"
                max={Math.max(1, saldoDisponivel)}
                step="1"
                value={formData.quantidade}
                onChange={handleChange}
                style={{
                  height: '36px',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderColor: saldoDisponivel <= 0 ? '#ef4444' : undefined,
                }}
                required
              />
            </div>
          </div>

          {/* Linha 5: Confirmação de Troca / Devolução do Usado */}
          <div
            style={{
              background: '#111827',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <input
              type="checkbox"
              id="trocaDevolucao"
              name="trocaDevolucao"
              checked={formData.trocaDevolucao}
              onChange={handleChange}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label
              htmlFor="trocaDevolucao"
              style={{ fontSize: '12.5px', color: '#f8fafc', cursor: 'pointer', margin: 0 }}
            >
              <strong>Troca com Devolução:</strong> Confirmo que o colaborador entregou o uniforme velho/usado na troca.
            </label>
          </div>

          {/* Linha 6: Campo de Assinatura na Folha A4 Impressa */}
          <div className="form-row" style={{ marginTop: '6px' }}>
            <label style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              ✍️ Assinatura do Colaborador:
            </label>

            <div
              style={{
                border: '2px dashed #475569',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.65)',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '380px',
                  borderBottom: '1.5px solid #94a3b8',
                  height: '24px',
                  marginBottom: '6px',
                }}
              />
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                {formData.nome ? formData.nome.toUpperCase() : 'NOME DO COLABORADOR'}
              </div>
              <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                CPF: {formData.cpf || '000.000.000-00'} • Matrícula: {formData.matricula || '---'}
              </div>
              <span style={{ fontSize: '11.5px', color: '#38bdf8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* <span>📄</span> A assinatura será coletada manualmente na folha impressa (Termo A4) no momento da entrega. */}
              </span>
            </div>
          </div>

          {/* Rodapé de Ações: Fechar, Imprimir e Salvar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #1e293b',
              paddingTop: '12px',
              marginTop: '6px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              style={{
                background: '#242b35',
                border: '1px solid #334155',
                color: '#cbd5e1',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleImprimir}
                disabled={salvando}
                style={{
                  background: '#1e293b',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🖨️</span> Imprimir Termo
              </button>

              <button
                type="submit"
                disabled={salvando}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
                }}
              >
                {salvando ? 'Salvando...' : '💾 Salvar Entrega'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Visualização Nativa do Termo de Entrega */}
      <ModalVisualizadorDocumento
        isOpen={modalTermoAberto}
        onClose={() => setModalTermoAberto(false)}
        titulo="Termo Oficial de Entrega de Uniforme"
        subtitulo={`Colaborador(a): ${formData.nome} • Departamento: ${formData.departamento} • Tamanho: ${formData.tamanho}`}
        blob={termoBlob}
        nomeArquivo={`Termo_Entrega_Uniforme_${(formData.nome || 'Colaborador').replace(/\s+/g, '_')}.pdf`}
      />
    </div>
  );
}
