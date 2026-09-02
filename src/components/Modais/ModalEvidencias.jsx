// src/components/Modais/ModalEvidencias.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getUser } from '../../auth/auth';
import '../Visual/modal.css';

export const TIPOS_EVIDENCIA = [
  { label: '📹 Vídeo', value: 'Vídeo' },
  { label: '📷 Imagem', value: 'Imagem' },
  { label: '📄 Documento', value: 'Documento' },
  { label: '📝 Relatório', value: 'Relatório' },
  { label: '🎙️ Áudio', value: 'Áudio' },
  { label: '📁 Outros', value: 'Outros' },
];

export default function ModalEvidencias({
  isOpen,
  onClose,
  ocorrencia,
  onSaveEvidencias,
  onAddEventoCustodia,
}) {
  const [abaAtiva, setAbaAtiva] = useState('evidencias'); // 'evidencias' ou 'custodia'
  const [listaEvidencias, setListaEvidencias] = useState([]);
  const [historicoCustodia, setHistoricoCustodia] = useState([]);

  // Form para Nova Evidência
  const [novaEvidencia, setNovaEvidencia] = useState({
    tipo: 'Vídeo',
    camera: '',
    local: '',
    data: '',
    horaInicio: '',
    horaFim: '',
    arquivoNome: '',
    arquivoUrl: '',
    observacao: '',
  });

  // Evento Manual de Custódia
  const [novoEventoTexto, setNovoEventoTexto] = useState('');

  // Preview de Mídia
  const [previewMedia, setPreviewMedia] = useState(null); // { tipo: 'Vídeo'|'Imagem', url: '', nome: '' }

  const usuario = getUser();
  const nomeOperador = usuario?.name || usuario?.nome || usuario?.email || 'Operador';

  useEffect(() => {
    if (!isOpen || !ocorrencia) return;

    setListaEvidencias(Array.isArray(ocorrencia.evidencias) ? ocorrencia.evidencias : []);
    setHistoricoCustodia(Array.isArray(ocorrencia.historicoCustodia) ? ocorrencia.historicoCustodia : []);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    setNovaEvidencia({
      tipo: 'Vídeo',
      camera: 'CAM-023',
      local: ocorrencia.local || 'Área de Monitoramento',
      data: `${yyyy}-${mm}-${dd}`,
      horaInicio: `${hh}:${min}:00`,
      horaFim: '',
      arquivoNome: '',
      arquivoUrl: '',
      observacao: '',
    });

    setNovoEventoTexto('');
    setPreviewMedia(null);
  }, [ocorrencia, isOpen]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !ocorrencia) return null;

  const handleInputChange = (campo, valor) => {
    setNovaEvidencia((prev) => ({ ...prev, [campo]: valor }));
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.72);
            resolve(compressed);
          } else {
            resolve(e.target.result);
          }
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // Upload protegido contra estouro de memória
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formatSize = (bytes) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const tamanhoStr = formatSize(file.size);

    if (file.type.startsWith('image/')) {
      try {
        const compressedBase64 = await compressImage(file);
        setNovaEvidencia((prev) => ({
          ...prev,
          arquivoNome: file.name,
          arquivoUrl: compressedBase64,
          tamanho: tamanhoStr,
        }));
        toast.success(`Imagem "${file.name}" (${tamanhoStr}) otimizada com sucesso.`);
      } catch (err) {
        console.error(err);
        setNovaEvidencia((prev) => ({
          ...prev,
          arquivoNome: file.name,
          arquivoUrl: '',
          tamanho: tamanhoStr,
        }));
      }
    } else if (file.type.startsWith('video/')) {
      // Para vídeos: usamos Blob Object URL para preview em memória sem converter para string base64 pesada
      let objectUrl = '';
      try {
        objectUrl = URL.createObjectURL(file);
      } catch {}

      setNovaEvidencia((prev) => ({
        ...prev,
        arquivoNome: file.name,
        arquivoUrl: objectUrl,
        tamanho: tamanhoStr,
      }));
      toast.success(`Vídeo "${file.name}" (${tamanhoStr}) registrado.`);
    } else {
      let objectUrl = '';
      try {
        objectUrl = URL.createObjectURL(file);
      } catch {}

      setNovaEvidencia((prev) => ({
        ...prev,
        arquivoNome: file.name,
        arquivoUrl: objectUrl,
        tamanho: tamanhoStr,
      }));
      toast.success(`Arquivo "${file.name}" (${tamanhoStr}) registrado.`);
    }

    e.target.value = '';
  };

  const handleAdicionarEvidencia = (e) => {
    e.preventDefault();

    const seqNum = `#${String(listaEvidencias.length + 1).padStart(3, '0')}`;
    const nomePadraoArquivo = novaEvidencia.arquivoNome || `evidencia_${ocorrencia.numero.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${novaEvidencia.camera.toLowerCase().replace(/[^a-z0-9]/g, '') || 'item'}.${novaEvidencia.tipo === 'Vídeo' ? 'mp4' : novaEvidencia.tipo === 'Imagem' ? 'jpg' : 'pdf'}`;

    const nova = {
      id: Date.now(),
      numeroSequencial: seqNum,
      tipo: novaEvidencia.tipo,
      camera: novaEvidencia.camera.trim(),
      local: novaEvidencia.local.trim(),
      data: novaEvidencia.data,
      horaInicio: novaEvidencia.horaInicio,
      horaFim: novaEvidencia.horaFim,
      arquivoNome: nomePadraoArquivo,
      arquivoUrl: novaEvidencia.arquivoUrl || '',
      tamanho: novaEvidencia.tamanho || '',
      adicionadoPor: nomeOperador,
      dataHoraUpload: new Date().toISOString(),
      observacao: novaEvidencia.observacao.trim(),
    };

    const novaLista = [...listaEvidencias, nova];
    setListaEvidencias(novaLista);

    // Salvar e atualizar cadeia de custódia
    onSaveEvidencias({
      id: ocorrencia.id,
      evidencias: novaLista,
      usuario: nomeOperador,
    });

    toast.success(`Evidência ${seqNum} (${nova.tipo}) registrada com sucesso!`);

    // Reset formulário
    setNovaEvidencia((prev) => ({
      ...prev,
      camera: '',
      horaFim: '',
      arquivoNome: '',
      arquivoUrl: '',
      tamanho: '',
      observacao: '',
    }));
  };

  const handleRemoverEvidencia = (id, numeroSeq) => {
    if (!confirm(`Remover a evidência ${numeroSeq}?`)) return;
    const filtrada = listaEvidencias.filter((ev) => ev.id !== id);
    setListaEvidencias(filtrada);

    onSaveEvidencias({
      id: ocorrencia.id,
      evidencias: filtrada,
      usuario: nomeOperador,
    });
    toast.info(`Evidência ${numeroSeq} removida.`);
  };

  const handleAdicionarEventoCustodiaManual = (e) => {
    if (e) e.preventDefault();
    if (!novoEventoTexto.trim()) return;

    onAddEventoCustodia({
      id: ocorrencia.id,
      acao: novoEventoTexto.trim(),
      usuario: nomeOperador,
    });

    setNovoEventoTexto('');
    toast.success('Evento registrado na cadeia de custódia!');
  };

  const handleAtalhoCustodia = (texto) => {
    onAddEventoCustodia({
      id: ocorrencia.id,
      acao: texto,
      usuario: nomeOperador,
    });
    toast.success('Evento registrado na cadeia de custódia!');
  };

  const formatarDataHoraCustodia = (iso) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } catch {
      return iso;
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
        aria-label="Evidências e Cadeia de Custódia"
        style={{ maxWidth: '920px' }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '19px' }}>
              📁 Evidências & Cadeia de Custódia — {ocorrencia.numero}
            </h2>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Ocorrência: <strong style={{ color: '#00d2ff' }}>{ocorrencia.nome || ocorrencia.tipo}</strong>
          </div>
        </div>

        {/* Barra de Alternância de Abas: Evidências vs Cadeia de Custódia */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #283340',
            paddingBottom: '8px',
            marginBottom: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => setAbaAtiva('evidencias')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: abaAtiva === 'evidencias' ? 700 : 500,
              cursor: 'pointer',
              background: abaAtiva === 'evidencias' ? '#3b82f6' : '#242b35',
              color: abaAtiva === 'evidencias' ? '#ffffff' : '#94a3b8',
              border: abaAtiva === 'evidencias' ? '1px solid #3b82f6' : '1px solid #334155',
            }}
          >
            📁 Acervo de Evidências ({listaEvidencias.length})
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('custodia')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: abaAtiva === 'custodia' ? 700 : 500,
              cursor: 'pointer',
              background: abaAtiva === 'custodia' ? '#10b981' : '#242b35',
              color: abaAtiva === 'custodia' ? '#ffffff' : '#94a3b8',
              border: abaAtiva === 'custodia' ? '1px solid #10b981' : '1px solid #334155',
            }}
          >
            🛡️ Cadeia de Custódia Interna ({historicoCustodia.length})
          </button>
        </div>

        {/* CONTEÚDO DA ABA 1: EVIDÊNCIAS */}
        {abaAtiva === 'evidencias' && (
          <div>
            {/* Formulário Compacto para Adicionar Nova Evidência */}
            <div
              style={{
                background: '#15171b',
                border: '1px solid #283340',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '10px',
              }}
            >
              <form onSubmit={handleAdicionarEvidencia}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr 1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div className="form-row">
                    <label style={{ fontSize: '11px' }}>Tipo de Evidência:</label>
                    <select
                      value={novaEvidencia.tipo}
                      onChange={(e) => handleInputChange('tipo', e.target.value)}
                      style={{ height: '32px', fontSize: '12px' }}
                    >
                      {TIPOS_EVIDENCIA.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
                    <label style={{ fontSize: '11px' }}>Câmera / Fonte:</label>
                    <input
                      type="text"
                      placeholder="Ex: CAM-023"
                      value={novaEvidencia.camera}
                      onChange={(e) => handleInputChange('camera', e.target.value)}
                      style={{ height: '32px', fontSize: '12px' }}
                    />
                  </div>

                  <div className="form-row">
                    <label style={{ fontSize: '11px' }}>Local do Registro:</label>
                    <input
                      type="text"
                      placeholder="Ex: Corredor 05"
                      value={novaEvidencia.local}
                      onChange={(e) => handleInputChange('local', e.target.value)}
                      style={{ height: '32px', fontSize: '12px' }}
                    />
                  </div>

                  <div className="form-row">
                    <label style={{ fontSize: '11px' }}>Data:</label>
                    <input
                      type="date"
                      value={novaEvidencia.data}
                      onChange={(e) => handleInputChange('data', e.target.value)}
                      style={{ height: '32px', fontSize: '12px' }}
                    />
                  </div>

                  <div className="form-row">
                    <label style={{ fontSize: '11px' }}>Hora Início:</label>
                    <input
                      type="text"
                      placeholder="10:42:15"
                      value={novaEvidencia.horaInicio}
                      onChange={(e) => handleInputChange('horaInicio', e.target.value)}
                      style={{ height: '32px', fontSize: '12px' }}
                    />
                  </div>

                  <div className="form-row">
                    <label style={{ fontSize: '11px' }}>Hora Término:</label>
                    <input
                      type="text"
                      placeholder="10:47:32"
                      value={novaEvidencia.horaFim}
                      onChange={(e) => handleInputChange('horaFim', e.target.value)}
                      style={{ height: '32px', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.5fr auto', gap: '8px', alignItems: 'flex-end' }}>
                  <div className="form-row">
                    <label style={{ fontSize: '11px' }}>Arquivo de Mídia / Documento:</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="file"
                        id="file-upload-evidencia"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                      <label
                        htmlFor="file-upload-evidencia"
                        style={{
                          background: '#242b35',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          color: '#00d2ff',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        📂 Selecionar Arquivo
                      </label>
                      <input
                        type="text"
                        placeholder="Nome do arquivo ou anexo..."
                        value={novaEvidencia.arquivoNome}
                        onChange={(e) => handleInputChange('arquivoNome', e.target.value)}
                        style={{ height: '32px', fontSize: '12px', flex: 1 }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <label style={{ fontSize: '11px' }}>Observação:</label>
                    <input
                      type="text"
                      placeholder="Ex: Trecho com indivíduo guardando itens na bolsa"
                      value={novaEvidencia.observacao}
                      onChange={(e) => handleInputChange('observacao', e.target.value)}
                      style={{ height: '32px', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="salve"
                      style={{ height: '32px', padding: '0 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                    >
                      ➕ Anexar Evidência
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Listagem das Evidências Cadastradas */}
            <div
              style={{
                maxHeight: '210px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              {listaEvidencias.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', background: '#121214', borderRadius: '8px', color: '#64748b', fontSize: '13px', border: '1px solid #2b2b2e' }}>
                  Nenhuma evidência anexada a esta ocorrência ainda. Utilize o formulário acima para registrar imagens, vídeos e documentos.
                </div>
              ) : (
                listaEvidencias.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      background: '#181d24',
                      border: '1px solid #283340',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace', background: 'rgba(56, 189, 248, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                          EVIDÊNCIA {ev.numeroSequencial}
                        </span>
                        <strong style={{ fontSize: '13px', color: '#f1f5f9' }}>
                          {ev.tipo === 'Vídeo' ? '📹' : ev.tipo === 'Imagem' ? '📷' : ev.tipo === 'Documento' ? '📄' : ev.tipo === 'Áudio' ? '🎙️' : '📁'} {ev.tipo}
                          {ev.camera ? ` • Câmera: ${ev.camera}` : ''}
                        </strong>
                        {ev.local && (
                          <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                            📍 {ev.local}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '11.5px', color: '#cbd5e1', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>📅 {ev.data} {ev.horaInicio ? `(${ev.horaInicio}${ev.horaFim ? ` às ${ev.horaFim}` : ''})` : ''}</span>
                        <span>📎 <code>{ev.arquivoNome}</code></span>
                        <span>👤 Por: <strong style={{ color: '#94a3b8' }}>{ev.adicionadoPor}</strong></span>
                      </div>

                      {ev.observacao && (
                        <div style={{ fontSize: '11.5px', color: '#fbbf24', fontStyle: 'italic', marginTop: '2px' }}>
                          💬 "{ev.observacao}"
                        </div>
                      )}
                    </div>

                    {/* Ações da Evidência: Visualizar / Remover */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {ev.tipo === 'Vídeo' && (
                        <button
                          type="button"
                          className="quick-action-btn"
                          onClick={() => setPreviewMedia({ tipo: 'Vídeo', url: ev.arquivoUrl, nome: ev.arquivoNome })}
                          style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.4)', padding: '4px 10px', fontSize: '11.5px', fontWeight: 700 }}
                        >
                          ▶ Visualizar Vídeo
                        </button>
                      )}

                      {ev.tipo === 'Imagem' && (
                        <button
                          type="button"
                          className="quick-action-btn"
                          onClick={() => setPreviewMedia({ tipo: 'Imagem', url: ev.arquivoUrl, nome: ev.arquivoNome })}
                          style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#4ade80', borderColor: 'rgba(16, 185, 129, 0.4)', padding: '4px 10px', fontSize: '11.5px', fontWeight: 700 }}
                        >
                          🖼 Visualizar Imagem
                        </button>
                      )}

                      {(ev.tipo === 'Documento' || ev.tipo === 'Relatório' || ev.tipo === 'Outros' || ev.tipo === 'Áudio') && (
                        <button
                          type="button"
                          className="quick-action-btn"
                          onClick={() => {
                            if (ev.arquivoUrl) {
                              window.open(ev.arquivoUrl, '_blank');
                            } else {
                              toast.info(`Documento "${ev.arquivoNome}" registrado no acervo custodial.`);
                            }
                          }}
                          style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.4)', padding: '4px 10px', fontSize: '11.5px', fontWeight: 700 }}
                        >
                          📄 Abrir / Baixar
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoverEvidencia(ev.id, ev.numeroSequencial)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '4px',
                        }}
                        title="Remover evidência"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: CADEIA DE CUSTÓDIA */}
        {abaAtiva === 'custodia' && (
          <div>
            {/* Banner de Rastreabilidade e Auditoria */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '8px 14px',
                marginBottom: '10px',
                fontSize: '12px',
                color: '#a7f3d0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                🔒 <strong>Cadeia de Custódia Oficial:</strong> Rastreabilidade e integridade probatória de todas as ações executadas nesta ocorrência.
              </span>
            </div>

            {/* Ações Rápidas de Encaminhamento */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Ações Rápidas:</span>
              <button
                type="button"
                className="quick-action-btn"
                onClick={() => handleAtalhoCustodia(`${nomeOperador} encaminhou a ocorrência para a autoridade policial`)}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                🚔 Encaminhado à Autoridade Policial
              </button>
              <button
                type="button"
                className="quick-action-btn"
                onClick={() => handleAtalhoCustodia(`${nomeOperador} arquivou cópia das mídias em cofre de segurança`)}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                🔒 Mídia Preservada em Cofre
              </button>
              <button
                type="button"
                className="quick-action-btn"
                onClick={() => handleAtalhoCustodia(`${nomeOperador} enviou relatório e evidências para o Departamento Jurídico`)}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                ⚖️ Encaminhado ao Jurídico
              </button>
              <button
                type="button"
                className="quick-action-btn"
                onClick={() => handleAtalhoCustodia(`${nomeOperador} realizou backup das imagens e logs`)}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                💾 Backup de Segurança Realizado
              </button>
            </div>

            {/* Linha do Tempo / Timeline da Cadeia de Custódia */}
            <div
              style={{
                maxHeight: '210px',
                overflowY: 'auto',
                background: '#121214',
                border: '1px solid #2b2b2e',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '10px',
              }}
            >
              {historicoCustodia.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  Nenhum evento custodial registrado.
                </div>
              ) : (
                historicoCustodia.map((ev, idx) => (
                  <div
                    key={ev.id || idx}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      borderLeft: '2px solid #3b82f6',
                      paddingLeft: '10px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11.5px', color: '#60a5fa', fontWeight: 700, fontFamily: 'monospace' }}>
                          ⏱️ {formatarDataHoraCustodia(ev.dataHora)}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', background: '#1c1f26', padding: '1px 6px', borderRadius: '4px' }}>
                          Operador: <strong style={{ color: '#f1f5f9' }}>{ev.usuario || 'Sistema'}</strong>
                        </span>
                      </div>
                      <span style={{ fontSize: '12.5px', color: '#e2e8f0', lineHeight: 1.4 }}>
                        {ev.acao}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Inserir Evento Personalizado na Custódia */}
            <form onSubmit={handleAdicionarEventoCustodiaManual} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Digitar novo despacho ou registro custodial..."
                value={novoEventoTexto}
                onChange={(e) => setNovoEventoTexto(e.target.value)}
                style={{
                  flex: 1,
                  height: '34px',
                  background: '#15171b',
                  border: '1px solid #283340',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '0 10px',
                  fontSize: '12.5px',
                }}
              />
              <button
                type="submit"
                className="salve"
                style={{ height: '34px', padding: '0 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
              >
                ➕ Registrar Despacho
              </button>
            </form>
          </div>
        )}

        <hr className="modal-divider" style={{ margin: '6px 0' }} />

        {/* Rodapé */}
        <div className="modal-buttons" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="cancela" onClick={onClose}>
            Fechar
          </button>
        </div>

        {/* Modal / Lightbox de Preview de Mídia */}
        {previewMedia && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.85)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setPreviewMedia(null)}
          >
            <div
              style={{
                background: '#181d24',
                borderRadius: '12px',
                border: '1px solid #283340',
                padding: '16px',
                maxWidth: '650px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#00d2ff', fontSize: '14px' }}>
                  {previewMedia.tipo === 'Vídeo' ? '📹 Reprodução de Vídeo' : '📷 Visualização de Imagem'} — {previewMedia.nome}
                </strong>
                <button
                  type="button"
                  onClick={() => setPreviewMedia(null)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {previewMedia.tipo === 'Vídeo' ? (
                previewMedia.url ? (
                  <video
                    src={previewMedia.url}
                    controls
                    autoPlay
                    style={{ width: '100%', maxHeight: '350px', borderRadius: '8px', background: '#000' }}
                  />
                ) : (
                  <div style={{ padding: '40px 20px', textAlign: 'center', background: '#090b0e', borderRadius: '8px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📹</div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#f1f5f9', fontWeight: 600 }}>
                      Arquivo: {previewMedia.nome}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                      (Vídeo preservado no repositório de evidências)
                    </p>
                  </div>
                )
              ) : previewMedia.url ? (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.nome}
                  style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '8px' }}
                />
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: '#090b0e', borderRadius: '8px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#f1f5f9', fontWeight: 600 }}>
                    Arquivo: {previewMedia.nome}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    (Imagem preservada no repositório de evidências)
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="quick-action-btn"
                  onClick={() => setPreviewMedia(null)}
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
