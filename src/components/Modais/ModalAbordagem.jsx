// src/components/Modais/ModalAbordagem.jsx
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getUser } from '../../auth/auth';
import '../Visual/modal.css';

// Função utilitária para compressão de fotos do B.O.
const compressImage = (file) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(null);
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 1600;
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        resolve(compressedBase64);
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

export default function ModalAbordagem({
  isOpen,
  onClose,
  ocorrencia,
  onSave,
}) {
  const usuario = getUser();
  const nomeOperador = usuario?.name || usuario?.nome || usuario?.email || 'Operador';
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    houveAbordagem: 'Sim',
    data: '',
    hora: '',
    local: '',
    responsaveis: '',
    comportamento: 'Pacífico / Cooperativo',
    recuperacaoMercadorias: 'Sim - Total',
    acionamentoPolicial: 'Não',
    numeroBoletim: '',
    numeroBoletimCisc: '',
    conducaoSalaReservada: 'Não',
    relatoAbordagem: '',
    boletimArquivo: null,
  });

  const [anexando, setAnexando] = useState(false);

  useEffect(() => {
    if (!isOpen || !ocorrencia) return;

    if (ocorrencia.abordagem) {
      setFormData({
        houveAbordagem: ocorrencia.abordagem.houveAbordagem || 'Sim',
        data: ocorrencia.abordagem.data || ocorrencia.data || '',
        hora: ocorrencia.abordagem.hora || ocorrencia.horaTermino || ocorrencia.horaInicio || '',
        local: ocorrencia.abordagem.local || ocorrencia.local || 'Linha de Caixas / Saída',
        responsaveis: ocorrencia.abordagem.responsaveis || nomeOperador,
        comportamento: ocorrencia.abordagem.comportamento || 'Pacífico / Cooperativo',
        recuperacaoMercadorias: ocorrencia.abordagem.recuperacaoMercadorias || 'Sim - Total',
        acionamentoPolicial: ocorrencia.abordagem.acionamentoPolicial || 'Não',
        numeroBoletim: ocorrencia.abordagem.numeroBoletim || '',
        numeroBoletimCisc: ocorrencia.abordagem.numeroBoletimCisc || ocorrencia.abordagem.numeroBoletim || '',
        conducaoSalaReservada: ocorrencia.abordagem.conducaoSalaReservada || 'Não',
        relatoAbordagem: ocorrencia.abordagem.relatoAbordagem || '',
        boletimArquivo: ocorrencia.abordagem.boletimArquivo || null,
      });
    } else {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');

      setFormData({
        houveAbordagem: 'Sim',
        data: ocorrencia.data || `${yyyy}-${mm}-${dd}`,
        hora: `${hh}:${min}`,
        local: ocorrencia.local ? `${ocorrencia.local} (Área de Saída)` : 'Saída da Loja',
        responsaveis: nomeOperador,
        comportamento: 'Pacífico / Cooperativo',
        recuperacaoMercadorias: 'Sim - Total',
        acionamentoPolicial: 'Não',
        numeroBoletim: '',
        numeroBoletimCisc: '',
        conducaoSalaReservada: 'Não',
        relatoAbordagem: '',
        boletimArquivo: null,
      });
    }
  }, [ocorrencia, isOpen, nomeOperador]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !ocorrencia) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreencherModelo = () => {
    const textoModelo =
      'O indivíduo foi abordado de forma discreta e respeitosa na área de saída do estabelecimento, após ultrapassar a linha de caixas sem efetuar o pagamento. Foi solicitada a apresentação do comprovante fiscal dos produtos em sua posse. O indivíduo colaborou com a verificação, devolveu os itens intactos e foi orientado quanto aos procedimentos da empresa.';
    setFormData((prev) => ({ ...prev, relatoAbordagem: textoModelo }));
    toast.info('Modelo de relato de abordagem inserido.');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnexando(true);
    try {
      let arquivoUrl = '';
      const tamanhoBytes = file.size;
      const tamanhoStr = tamanhoBytes > 1024 * 1024
        ? `${(tamanhoBytes / (1024 * 1024)).toFixed(1)} MB`
        : `${(tamanhoBytes / 1024).toFixed(0)} KB`;

      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file);
        arquivoUrl = compressed || URL.createObjectURL(file);
      } else {
        // PDF / Documento
        arquivoUrl = URL.createObjectURL(file);
      }

      const novoAnexo = {
        id: Date.now(),
        nome: file.name,
        tipo: file.type || 'application/pdf',
        tamanhoStr,
        arquivoUrl,
        dataUpload: new Date().toISOString(),
      };

      setFormData((prev) => ({ ...prev, boletimArquivo: novoAnexo }));
      toast.success(`Boletim "${file.name}" anexado com sucesso!`);
    } catch (err) {
      console.error('Erro ao anexar boletim:', err);
      toast.error('Erro ao anexar arquivo do Boletim de Ocorrência.');
    } finally {
      setAnexando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoverBoletim = () => {
    setFormData((prev) => ({ ...prev, boletimArquivo: null }));
    toast.info('Arquivo do boletim removido.');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Sincroniza numeroBoletim e numeroBoletimCisc
    const dadosFinais = {
      ...formData,
      numeroBoletim: formData.numeroBoletimCisc || formData.numeroBoletim || '',
      numeroBoletimCisc: formData.numeroBoletimCisc || formData.numeroBoletim || '',
    };

    onSave({
      id: ocorrencia.id,
      dadosAbordagem: dadosFinais,
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
        aria-label="Relatório de Abordagem e Intervenção"
        style={{ maxWidth: '900px' }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '19px' }}>
              🚨 Relatório de Abordagem & B.O. CISC — {ocorrencia.numero}
            </h2>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Ocorrência: <strong style={{ color: '#00d2ff' }}>{ocorrencia.nome || ocorrencia.tipo}</strong>
          </div>
        </div>

        {/* Banner Diretriz de Abordagem */}
        <div
          style={{
            background: 'rgba(249, 115, 22, 0.08)',
            border: '1px solid rgba(249, 115, 22, 0.3)',
            borderRadius: '6px',
            padding: '6px 12px',
            marginBottom: '10px',
            fontSize: '11.5px',
            color: '#fdba74',
            lineHeight: 1.35,
          }}
        >
          ⚖️ <strong>Procedimento Operacional:</strong> A abordagem deve ser realizada com discrição e respeito, após transpor a linha de caixas. Registre o acionamento e anexe o Boletim CISC se houver.
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Linha 1: 4 Colunas (Houve Abordagem, Data, Hora, Local) */}
          <div className="form-grid-4">
            <div className="form-row">
              <label className="required">Houve abordagem?</label>
              <select
                name="houveAbordagem"
                value={formData.houveAbordagem}
                onChange={handleChange}
                required
              >
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
                <option value="Tentativa sem êxito (Fuga)">Tentativa sem êxito (Fuga)</option>
                <option value="Não aplicável">Não aplicável</option>
              </select>
            </div>

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
              <label className="required">⏱️ Hora:</label>
              <input
                type="time"
                name="hora"
                value={formData.hora}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <label className="required">📍 Local da Abordagem:</label>
              <input
                type="text"
                name="local"
                value={formData.local}
                onChange={handleChange}
                placeholder="Ex: Saída, Estacionamento..."
                required
              />
            </div>
          </div>

          {/* Linha 2: 3 Colunas (Responsáveis, Comportamento, Recuperação) */}
          <div className="form-grid-3">
            <div className="form-row">
              <label>Fiscais / Agentes da Abordagem:</label>
              <input
                type="text"
                name="responsaveis"
                value={formData.responsaveis}
                onChange={handleChange}
                placeholder="Ex: Carlos (Fiscal) e Marcos (Segurança)"
              />
            </div>

            <div className="form-row">
              <label>Comportamento do Indivíduo:</label>
              <select
                name="comportamento"
                value={formData.comportamento}
                onChange={handleChange}
              >
                <option value="Pacífico / Cooperativo">Pacífico / Cooperativo</option>
                <option value="Conflito Verbal / Exaltado">Conflito Verbal / Exaltado</option>
                <option value="Tentativa de Fuga">Tentativa de Fuga</option>
                <option value="Resistência Física">Resistência Física</option>
                <option value="Ameaça à Equipe">Ameaça à Equipe</option>
              </select>
            </div>

            <div className="form-row">
              <label>Recuperação das Mercadorias:</label>
              <select
                name="recuperacaoMercadorias"
                value={formData.recuperacaoMercadorias}
                onChange={handleChange}
              >
                <option value="Sim - Total">Sim - Total</option>
                <option value="Sim - Parcial">Sim - Parcial</option>
                <option value="Não Recuperado">Não Recuperado</option>
                <option value="Não Houve Subtração">Não Houve Subtração</option>
              </select>
            </div>
          </div>

          {/* Linha 3: Polícia, Protocolo B.O. CISC e Sala Reservada */}
          <div className="form-grid-3">
            <div className="form-row">
              <label>Acionamento Policial (PM / CISC)?</label>
              <select
                name="acionamentoPolicial"
                value={formData.acionamentoPolicial}
                onChange={handleChange}
              >
                <option value="Não">Não</option>
                <option value="Sim - CISC / Polícia Civil">Sim - CISC / Polícia Civil</option>
                <option value="Sim - Polícia Militar">Sim - Polícia Militar</option>
                <option value="Sim - Guarda Municipal">Sim - Guarda Municipal</option>
              </select>
            </div>

            <div className="form-row">
              <label style={{ color: '#fed7aa', fontWeight: 600 }}>
                📋 Nº / Protocolo Boletim de Ocorrência (CISC / PM):
              </label>
              <input
                type="text"
                name="numeroBoletimCisc"
                value={formData.numeroBoletimCisc}
                onChange={handleChange}
                placeholder="Ex: CISC-2026/09412 ou BO PM-5541"
              />
            </div>

            <div className="form-row">
              <label>Conduzido a Sala Reservada?</label>
              <select
                name="conducaoSalaReservada"
                value={formData.conducaoSalaReservada}
                onChange={handleChange}
              >
                <option value="Não">Não</option>
                <option value="Sim (Com presença de testemunhas)">Sim (Com presença de testemunhas)</option>
              </select>
            </div>
          </div>

          {/* Linha Especial: Anexar Boletim de Ocorrência CISC */}
          <div
            style={{
              background: '#181d24',
              border: '1px dashed #f97316',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>📑</span>
              <div>
                <strong style={{ fontSize: '13px', color: '#fdba74', display: 'block' }}>
                  Anexar Cópia do Boletim de Ocorrência (B.O. CISC)
                </strong>
                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                  Anexe a foto ou PDF do documento lavrado na delegacia/CISC.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="application/pdf,image/*"
                style={{ display: 'none' }}
              />

              {formData.boletimArquivo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(234, 88, 12, 0.15)', border: '1px solid #ea580c', padding: '4px 10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#fdba74', fontWeight: 600 }}>
                    📄 {formData.boletimArquivo.nome} ({formData.boletimArquivo.tamanhoStr})
                  </span>
                  {formData.boletimArquivo.arquivoUrl && (
                    <a
                      href={formData.boletimArquivo.arquivoUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#38bdf8', fontSize: '11.5px', textDecoration: 'underline' }}
                    >
                      Visualizar
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoverBoletim}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px' }}
                    title="Remover anexo do boletim"
                  >
                    🗑️
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={anexando}
                  style={{
                    background: '#ea580c',
                    color: '#fff',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  📎 {anexando ? 'Carregando...' : 'Anexar Boletim (PDF / Foto)'}
                </button>
              )}
            </div>
          </div>

          {/* Linha 4: Relato Descritivo da Abordagem */}
          <div className="form-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ margin: 0 }}>Relato Descritivo da Abordagem:</label>
              <button
                type="button"
                onClick={handlePreencherModelo}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#00d2ff',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                ✨ Inserir Modelo Padrão
              </button>
            </div>
            <textarea
              name="relatoAbordagem"
              rows="3"
              value={formData.relatoAbordagem}
              onChange={handleChange}
              placeholder="Descreva de forma clara e objetiva o desenrolar da abordagem e os desfechos..."
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
                minHeight: '52px',
                maxHeight: '80px',
                resize: 'vertical',
              }}
            />
          </div>

          <hr className="modal-divider" style={{ margin: '4px 0' }} />

          {/* Botões do Rodapé */}
          <div className="modal-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="cancela" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="salve" style={{ background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', color: '#fff' }}>
              💾 Salvar Relatório de Abordagem & B.O.
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
