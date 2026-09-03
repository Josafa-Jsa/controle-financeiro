import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  getListaDepartamentos,
  TAMANHOS_PADRAO,
  getTamanhosPorDepartamento,
} from '../../services/uniformesService';
import {
  gerarRelatorioBaixasUniformePDF,
  gerarRelatorioBaixasUniformeBlob,
} from '../../utils/gerarRelatorioBaixasUniformePDF';
import ModalVisualizadorDocumento from './ModalVisualizadorDocumento';
import { getUser } from '../../auth/auth';
import '../Visual/modal.css';

export const MOTIVOS_DESCARTE = [
  'Rasgado',
  'Manchado',
  'Impróprio para o Uso',
  'Desgaste Natural / Fim de Vida Útil',
  'Defeito de Fabricação',
  'Outro Motivo',
];

export default function ModalSaidaUniformeDescarte({
  isOpen,
  onClose,
  estoque = [],
  onSalvarBaixa,
}) {
  const [formData, setFormData] = useState({
    motivo: 'Rasgado',
    outroMotivoTexto: '',
    departamento: 'Hortifruti',
    tamanho: 'M',
    estado: 'Usado',
    quantidade: '1',
    observacoes: '',
  });

  const [salvando, setSalvando] = useState(false);
  const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);
  const [relatorioBlob, setRelatorioBlob] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        motivo: 'Rasgado',
        outroMotivoTexto: '',
        departamento: 'Hortifruti',
        tamanho: 'M',
        estado: 'Usado',
        quantidade: '1',
        observacoes: '',
      });
      setModalRelatorioAberto(false);
      setRelatorioBlob(null);
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
      (i) => i.departamento === formData.departamento && i.tamanho === formData.tamanho
    );
    if (!item) return 0;
    return formData.estado === 'Novo'
      ? (Number(item.estado_novo_qtd) || 0)
      : (Number(item.estado_usado_qtd) || 0);
  }, [estoque, formData.departamento, formData.tamanho, formData.estado]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validarCampos = () => {
    if (!formData.motivo) {
      toast.warn('Selecione o motivo da baixa / descarte.');
      return false;
    }
    if (formData.motivo === 'Outro Motivo' && !formData.outroMotivoTexto.trim()) {
      toast.warn('Por favor, informe e descreva o motivo no campo "Especifique o Outro Motivo".');
      return false;
    }
    if (!formData.departamento) {
      toast.warn('Selecione o departamento.');
      return false;
    }
    if (!formData.tamanho) {
      toast.warn('Selecione o tamanho.');
      return false;
    }
    const qtd = parseInt(formData.quantidade, 10);
    if (!qtd || qtd <= 0) {
      toast.warn('Informe uma quantidade maior que zero.');
      return false;
    }
    return true;
  };

  const motivoFormatado = formData.motivo === 'Outro Motivo'
    ? `Outro: ${formData.outroMotivoTexto.trim()}`
    : formData.motivo;

  // Ação Gerar Relatório de Baixas no Modal do Sistema
  const handleGerarRelatorio = () => {
    if (!validarCampos()) return;
    const user = getUser();
    const dadosParaPDF = {
      ...formData,
      motivo: motivoFormatado,
      responsavel: user?.name || user?.nome || 'Operador / Estoquista',
    };
    try {
      const blob = gerarRelatorioBaixasUniformeBlob(dadosParaPDF);
      setRelatorioBlob(blob);
      setModalRelatorioAberto(true);
    } catch (err) {
      console.error('Erro ao gerar laudo em PDF:', err);
      toast.error('Erro ao abrir o relatório.');
    }
  };

  // Ação Salvar Baixa
  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!validarCampos()) return;

    setSalvando(true);
    try {
      const user = getUser();
      const payload = {
        departamento: formData.departamento,
        tamanho: formData.tamanho,
        quantidade: parseInt(formData.quantidade, 10),
        estado: formData.estado,
        colaborador: `Baixa por ${motivoFormatado}`,
        responsavel: user?.name || user?.nome || 'Operador',
        observacoes: `[BAIXA/DESCARTE • ${motivoFormatado.toUpperCase()}] ${formData.observacoes.trim()}`,
      };

      await onSalvarBaixa(payload);
      toast.success(
        `Baixa de ${formData.quantidade} uniforme(s) (${motivoFormatado}) registrada e abatida do estoque com sucesso!`
      );
      onClose();
    } catch (err) {
      console.error('Erro ao registrar baixa de uniforme:', err);
      toast.error('Erro ao salvar a baixa do uniforme.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-box modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '92%' }}
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
            <h2 style={{ margin: 0, fontSize: '18px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🗑️</span> Saída de Uniforme (Baixa / Avaria)
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Registre a baixa de uniformes rasgados, manchados ou impróprios para o uso abatendo do estoque.
            </p>
          </div>
        </div>

        <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Linha 1: Motivo do Descarte / Baixa */}
          <div className="form-row">
            <label className="required" style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 700 }}>
              ⚠️ Motivo da Saída / Baixa:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '8px', marginTop: '4px' }}>
              {MOTIVOS_DESCARTE.map((mot) => (
                <button
                  key={mot}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, motivo: mot }))}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: formData.motivo === mot ? '1px solid #ef4444' : '1px solid #334155',
                    background: formData.motivo === mot ? 'rgba(239, 68, 68, 0.2)' : '#111827',
                    color: formData.motivo === mot ? '#fca5a5' : '#cbd5e1',
                    fontSize: '12px',
                    fontWeight: formData.motivo === mot ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'center',
                  }}
                >
                  {mot === 'Rasgado' && '✂️ '}
                  {mot === 'Manchado' && '🎨 '}
                  {mot === 'Impróprio para o Uso' && '🚫 '}
                  {mot === 'Desgaste Natural / Fim de Vida Útil' && '⏳ '}
                  {mot === 'Defeito de Fabricação' && '⚠️ '}
                  {mot === 'Outro Motivo' && '📝 '}
                  {mot}
                </button>
              ))}
            </div>
          </div>

          {/* Campo Condicional: Especificação Obrigatória do Outro Motivo */}
          {formData.motivo === 'Outro Motivo' && (
            <div className="form-row" style={{ animation: 'fadeInPage 0.2s ease' }}>
              <label className="required" style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 700 }}>
                📝 Especifique o Outro Motivo (Obrigatório):
              </label>
              <input
                type="text"
                name="outroMotivoTexto"
                placeholder="Descreva exatamente o motivo da baixa (Ex: Extraviado na lavanderia, Queimado por ferro...)"
                value={formData.outroMotivoTexto}
                onChange={handleChange}
                style={{
                  height: '38px',
                  fontSize: '13px',
                  border: '1px solid #ef4444',
                  background: '#181114',
                }}
                autoFocus
                required
              />
            </div>
          )}

          {/* Linha 2: Departamento Referente ao Uniforme */}
          <div className="form-row">
            <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
              🏢 Departamento Referente ao Uniforme:
            </label>
            <select
              name="departamento"
              value={formData.departamento}
              onChange={handleChange}
              style={{ height: '38px', fontSize: '13px' }}
              required
            >
              {getListaDepartamentos().map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>

          {/* Linha 3: Tamanho e Estado */}
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
              </select>
            </div>

            <div className="form-row">
              <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                🏷️ Estado da Peça:
              </label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                style={{ height: '36px', fontSize: '13px' }}
                required
              >
                <option value="Usado">🔄 Usado / Desgastado</option>
                <option value="Novo">✨ Novo (Defeito de Fábrica)</option>
              </select>
            </div>
          </div>

          {/* Linha 4: Quantidade e Saldo em Estoque */}
          <div className="form-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                🔢 Quantidade a Ser Dada Baixa (Abatimento):
              </label>
              <span style={{ fontSize: '12px', color: saldoDisponivel > 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                Saldo Atual em Estoque: {saldoDisponivel} un
              </span>
            </div>
            <input
              type="number"
              name="quantidade"
              min="1"
              step="1"
              value={formData.quantidade}
              onChange={handleChange}
              style={{ height: '38px', fontSize: '13.5px', fontWeight: 700 }}
              required
            />
          </div>

          {/* Linha 5: Observações / Laudo */}
          <div className="form-row">
            <label style={{ fontSize: '12px', color: '#cbd5e1' }}>
              📝 Descrição do Dano / Justificativa de Descarte (Opcional):
            </label>
            <textarea
              name="observacoes"
              rows="2"
              value={formData.observacoes}
              onChange={handleChange}
              placeholder="Ex: Peça rasgada na costura lateral, sem condições de reparo..."
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

          {/* Rodapé de Ações: Fechar, Gerar Relatório e Salvar */}
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
                onClick={handleGerarRelatorio}
                disabled={salvando}
                style={{
                  background: '#1e293b',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
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
                <span>📄</span> Gerar Relatório de Baixas
              </button>

              <button
                type="submit"
                disabled={salvando}
                style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
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
                  boxShadow: '0 2px 10px rgba(220, 38, 38, 0.35)',
                }}
              >
                {salvando ? 'Salvando Baixa...' : '💾 Salvar Baixa no Estoque'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Visualização Nativa do Laudo de Baixa e Descarte */}
      <ModalVisualizadorDocumento
        isOpen={modalRelatorioAberto}
        onClose={() => setModalRelatorioAberto(false)}
        titulo="Laudo Oficial de Baixa & Descarte de Uniformes"
        subtitulo={`Departamento: ${formData.departamento} • Motivo: ${motivoFormatado} • Quantidade: ${formData.quantidade} un`}
        blob={relatorioBlob}
        nomeArquivo={`Laudo_Baixa_Uniforme_${formData.departamento}_${Date.now()}.pdf`}
      />
    </div>
  );
}
