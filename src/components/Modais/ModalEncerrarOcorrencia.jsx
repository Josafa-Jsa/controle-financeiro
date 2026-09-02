// src/components/Modais/ModalEncerrarOcorrencia.jsx
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getUser } from '../../auth/auth';
import '../Visual/modal.css';

// Compressão de foto do B.O. para economizar memória
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

export default function ModalEncerrarOcorrencia({
  isOpen,
  onClose,
  ocorrencia,
  onConfirmarEncerramento,
}) {
  const usuario = getUser();
  const nomeOperador = usuario?.name || usuario?.nome || usuario?.email || 'Gerente / Auditor';
  const fileInputRef = useRef(null);

  const [numeroBoletimCisc, setNumeroBoletimCisc] = useState('');
  const [orgaoPolicial, setOrgaoPolicial] = useState('CISC / Polícia Civil');
  const [boletimArquivo, setBoletimArquivo] = useState(null);
  const [responsavelEncerramento, setResponsavelEncerramento] = useState(nomeOperador);
  const [parecerEncerramento, setParecerEncerramento] = useState('');
  const [anexando, setAnexando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!isOpen || !ocorrencia) return;

    const bNum = ocorrencia.abordagem?.numeroBoletimCisc || ocorrencia.abordagem?.numeroBoletim || '';
    const bArq = ocorrencia.abordagem?.boletimArquivo || null;
    const resp = ocorrencia.responsaveisRegistro?.autorizouEncerramento?.nome || nomeOperador;
    const parecer = ocorrencia.responsaveisRegistro?.autorizouEncerramento?.despacho || ocorrencia.parecerFinal || '';

    setNumeroBoletimCisc(bNum);
    setBoletimArquivo(bArq);
    setResponsavelEncerramento(resp);
    setParecerEncerramento(parecer);
    setOrgaoPolicial('CISC / Polícia Civil');
  }, [isOpen]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !ocorrencia) return null;

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

      setBoletimArquivo(novoAnexo);
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
    setBoletimArquivo(null);
    toast.info('Arquivo do boletim removido.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação obrigatória e rígida de encerramento
    if (!numeroBoletimCisc.trim()) {
      toast.warn('⚠️ Obrigatório informar o Nº ou Protocolo do Boletim de Ocorrência (CISC) para encerrar.');
      return;
    }

    if (!boletimArquivo) {
      toast.warn('⚠️ Obrigatório anexar o arquivo (PDF ou Foto) do Boletim de Ocorrência do CISC para encerrar.');
      return;
    }

    setSalvando(true);
    try {
      await onConfirmarEncerramento({
        id: ocorrencia.id,
        numeroBoletimCisc: numeroBoletimCisc.trim(),
        orgaoPolicial,
        boletimArquivo,
        responsavelEncerramento: responsavelEncerramento.trim() || nomeOperador,
        parecerEncerramento: parecerEncerramento.trim(),
      });
      onClose();
    } catch (err) {
      console.error('Erro ao encerrar ocorrência:', err);
      toast.error('Erro ao encerrar ocorrência.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-box modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '92%' }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #283340', paddingBottom: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18.5px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔒</span> Encerramento de Ocorrência — {ocorrencia.numero}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Para finalizar e lavrar o termo oficial, é obrigatório vincular o Boletim CISC e seu anexo.
            </p>
          </div>
        </div>

        {/* Resumo da Ocorrência */}
        <div
          style={{
            background: '#181d24',
            border: '1px solid #283340',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '14px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '8px',
            fontSize: '12px',
          }}
        >
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Tipo:</span>
            <strong style={{ color: '#f8fafc' }}>{ocorrencia.tipo || 'Geral'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Local / Setor:</span>
            <strong style={{ color: '#f8fafc' }}>{ocorrencia.local || 'Loja'} {ocorrencia.setor ? `(${ocorrencia.setor})` : ''}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Valor Envolvido:</span>
            <strong style={{ color: '#34d399' }}>
              {Number(ocorrencia.valorTotalEnvolvido || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Caixa de Requisitos Obrigatórios */}
          <div
            style={{
              background: 'rgba(234, 88, 12, 0.08)',
              border: '1px solid rgba(234, 88, 12, 0.35)',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '12.5px', color: '#fdba74', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🚨</span> Dados Obrigatórios da Polícia / CISC:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <div className="form-row">
                <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                  📋 Nº / Protocolo B.O. CISC:
                </label>
                <input
                  type="text"
                  placeholder="Ex: CISC-2026/089412 ou BO-4458"
                  value={numeroBoletimCisc}
                  onChange={(e) => setNumeroBoletimCisc(e.target.value)}
                  style={{ height: '36px', fontSize: '13px', background: '#121214', border: '1px solid #f97316' }}
                  required
                />
              </div>

              <div className="form-row">
                <label style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                  🏛️ Órgão Policial:
                </label>
                <select
                  value={orgaoPolicial}
                  onChange={(e) => setOrgaoPolicial(e.target.value)}
                  style={{ height: '36px', fontSize: '13px', background: '#121214' }}
                >
                  <option value="CISC / Polícia Civil">CISC / Polícia Civil</option>
                  <option value="Polícia Militar (PM)">Polícia Militar (PM)</option>
                  <option value="Guarda Municipal">Guarda Municipal</option>
                  <option value="Polícia Federal">Polícia Federal</option>
                </select>
              </div>
            </div>

            {/* Campo de Anexo Obrigatório do Boletim */}
            <div className="form-row">
              <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
                📎 Anexo do Boletim de Ocorrência (PDF ou Foto do B.O.):
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="application/pdf,image/*"
                style={{ display: 'none' }}
              />

              {boletimArquivo ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10b981',
                    padding: '8px 12px',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>✅</span>
                    <span style={{ fontSize: '12.5px', color: '#34d399', fontWeight: 600 }}>
                      {boletimArquivo.nome} ({boletimArquivo.tamanhoStr})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {boletimArquivo.arquivoUrl && (
                      <a
                        href={boletimArquivo.arquivoUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#38bdf8', fontSize: '12px', textDecoration: 'underline' }}
                      >
                        Visualizar
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoverBoletim}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px' }}
                      title="Remover anexo do boletim"
                    >
                      🗑️
                    </button>
                  </div>
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
                    padding: '10px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.3)',
                  }}
                >
                  📎 {anexando ? 'Carregando arquivo...' : 'Anexar Cópia do Boletim CISC (PDF / Imagem) *'}
                </button>
              )}
            </div>
          </div>

          {/* Dados do Despacho de Encerramento */}
          <div className="form-row">
            <label style={{ fontSize: '12px', color: '#cbd5e1' }}>
              👤 Responsável pela Autorização do Encerramento:
            </label>
            <input
              type="text"
              value={responsavelEncerramento}
              onChange={(e) => setResponsavelEncerramento(e.target.value)}
              placeholder="Ex: Gerente Operacional / Coordenador de Prevenção"
              style={{ height: '36px', fontSize: '13px' }}
              required
            />
          </div>

          <div className="form-row">
            <label style={{ fontSize: '12px', color: '#cbd5e1' }}>
              📝 Parecer Técnico / Despacho Final de Encerramento (Opcional):
            </label>
            <textarea
              rows="2"
              value={parecerEncerramento}
              onChange={(e) => setParecerEncerramento(e.target.value)}
              placeholder="Ex: Procedimento concluído, mercadorias recuperadas, boletim lavrado junto ao CISC e suspeito qualificado."
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
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
              disabled={salvando || !numeroBoletimCisc.trim() || !boletimArquivo}
              style={{
                background: !numeroBoletimCisc.trim() || !boletimArquivo ? '#475569' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                padding: '8px 18px',
                fontSize: '12.5px',
                borderRadius: '6px',
                cursor: !numeroBoletimCisc.trim() || !boletimArquivo ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {salvando ? 'Encerrando...' : '🔒 Confirmar Encerramento da Ocorrência'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
