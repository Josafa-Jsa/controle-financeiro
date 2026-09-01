import React, { useEffect, useMemo, useState } from 'react';
import { formatarMoedaInput, converterMoedaParaNumero, parseToBackendFloat } from '../../utils/numberUtils';
import { decodificarChaveNFe, gerarDanfePDF } from '../../utils/gerarDanfePDF';
import '../Visual/modal.css';

export default function ModalNota({
  isOpen = false,
  onClose = () => {},
  onSave = () => {},
  notaParaEditar = null,
  onOpenDanfe = null,
}) {
  const base = useMemo(
    () => ({
      id: undefined,
      tipo: 'NFe',
      chavedeacesso: '',
      numero: '',
      clienteOuServico: '',
      valor: '',
      dataEmissao: new Date().toISOString().slice(0, 10),
      status: 'Emitida',
    }),
    []
  );

  const [form, setForm] = useState(base);
  const [busy, setBusy] = useState(false);
  const [lookupMsg, setLookupMsg] = useState('');

  const NFE_URL = String(import.meta.env.VITE_NFE_LOOKUP_URL || '').trim();
  const NFE_TOKEN = String(import.meta.env.VITE_NFE_LOOKUP_TOKEN || '').trim();

  useEffect(() => {
    if (isOpen) {
      setForm(
        notaParaEditar
          ? {
              id: notaParaEditar.id,
              numero: notaParaEditar.numero || '',
              tipo: notaParaEditar.tipo || 'NFe',
              chavedeacesso: notaParaEditar.chavedeacesso || '',
              clienteOuServico: notaParaEditar.clienteOuServico || '',
              valor:
                notaParaEditar.valor !== undefined &&
                notaParaEditar.valor !== null
                  ? formatarMoedaInput(
                      Math.round(Number(notaParaEditar.valor) * 100)
                    )
                  : '',
              dataEmissao:
                notaParaEditar.dataEmissao ||
                new Date().toISOString().slice(0, 10),
              status: notaParaEditar.status || 'Emitida',
            }
          : base
      );
      setLookupMsg('');
      setBusy(false);
    }
  }, [isOpen, notaParaEditar, base]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const handleChaveChange = (e) => {
    const val = e.target.value;
    change('chavedeacesso', val);

    const chaveLimpa = val.replace(/\D+/g, '');
    if (chaveLimpa.length === 44) {
      const info = decodificarChaveNFe(chaveLimpa);
      if (info) {
        setForm((prev) => ({
          ...prev,
          chavedeacesso: val,
          numero: prev.numero || info.numero,
          clienteOuServico: prev.clienteOuServico || `Emitente ${info.cnpj}`,
          dataEmissao: prev.dataEmissao || info.dataEmissao,
        }));
        setLookupMsg(`Chave 44 dígitos decodificada: NF #${info.numero} - Série ${info.serie} (${info.uf}) ✅`);
      }
    }
  };

  const handleValorChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarMoedaInput(valorDigitado);
    change('valor', valorFormatado);
  };

  const submit = (e) => {
    e.preventDefault();

    if (!form.clienteOuServico.trim()) return;

    const val = converterMoedaParaNumero(form.valor);
    if (!Number.isFinite(val) || val <= 0) return;

    const payload = {
      ...form,
      valor: val,
      status: form.status || 'Emitida',
    };

    if (!payload.id) delete payload.id;

    onSave(payload);
  };

  const chaveApenasNumeros = form.chavedeacesso.replace(/\D+/g, '');
  const canLookup = chaveApenasNumeros.length === 44;

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-card modal-lg"
        onClick={(e) => e.stopPropagation()}
        aria-label={form.id ? 'Editar Nota Fiscal' : 'Inserir Nota Fiscal'}
      >
        <h2>{form.id ? 'Editar Nota Fiscal' : 'Inserir Nota Fiscal'}</h2>

        <form className="modal-form" onSubmit={submit}>
          <div className="form-row">
            <label>Tipo:</label>
            <select
              value={form.tipo}
              onChange={(e) => change('tipo', e.target.value)}
            >
              <option value="NFe">Nota Fiscal Eletrônica (NF-e)</option>
            </select>
          </div>

          <div className="form-row">
            <label>Chave de Acesso (44 dígitos) / Nº da Nota:</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ flex: 1 }}
                type="text"
                placeholder="Cole a chave de 44 dígitos ou número da nota..."
                value={form.chavedeacesso}
                onChange={handleChaveChange}
              />
            </div>
            {lookupMsg && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: lookupMsg.includes('Falha') ? '#ff6b6b' : '#34d399',
                }}
              >
                {lookupMsg}
              </div>
            )}
          </div>

          <div className="form-row">
            <label>Origem / Serviço / Emitente:</label>
            <input
              type="text"
              placeholder="Ex.: Cliente X, Auto Posto Y…"
              value={form.clienteOuServico}
              onChange={(e) => change('clienteOuServico', e.target.value)}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label>Valor (R$):</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={form.valor}
                onChange={handleValorChange}
                required
              />
            </div>

            <div className="form-row">
              <label>Data de Emissão:</label>
              <input
                type="date"
                value={form.dataEmissao}
                onChange={(e) => change('dataEmissao', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-buttons" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="submit" className="salve" disabled={busy}>
              Salvar
            </button>

            <button
              type="button"
              className="btn-danfe"
              onClick={() => {
                if (onOpenDanfe) {
                  onOpenDanfe(form);
                } else {
                  gerarDanfePDF(form);
                }
              }}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Visualizar e imprimir DANFE em modal do sistema"
            >
              🖨️ Imprimir DANFE
            </button>

            <button
              type="button"
              className="cancela"
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}