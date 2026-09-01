// src/components/Modais/ModalConfirmarPagamento.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import { formatCurrencyBRL, formatDateBR } from '../../utils/telegram';
import { parseToBackendFloat } from '../../utils/numberUtils';
import '../Visual/modal.css';

// Formata strings ou números para visualização BRL no input
const formatarMoedaInput = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return '';
  const apenasNumeros = String(valor).replace(/\D/g, '');
  if (!apenasNumeros) return '';
  const numero = Number(apenasNumeros) / 100;
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

// Converte string BRL (ex: "R$ 1.250,50") de volta para float puro
const converterMoedaParaNumero = (valor) => {
  if (typeof valor === 'number') return valor;
  if (!valor) return 0;
  const limpo = String(valor)
    .replace(/[^\d,-]/g, '')
    .replace(',', '.');
  return parseFloat(limpo) || 0;
};

export default function ModalConfirmarPagamento({
  isOpen,
  onClose,
  contas = [],
  contaSelecionadaInicial = null,
  onAplicarPagamento,
}) {
  const [codigoInput, setCodigoInput] = useState('');
  const [contaSelecionada, setContaSelecionada] = useState(null);
  const [tipoPagamento, setTipoPagamento] = useState('total'); // 'total' ou 'parcial'
  const [valorInput, setValorInput] = useState('');
  const [observacao, setObservacao] = useState('');
  const [dataPagamento, setDataPagamento] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const inputCodigoRef = useRef(null);

  // Calcula contas pendentes disponíveis para pagamento
  const contasPendentes = useMemo(() => {
    return (contas || [])
      .filter((c) => c.status !== 'Pago')
      .map((c) => {
        const totalBaixado = (c.baixas || []).reduce(
          (acc, b) => acc + (Number(b.valor) || 0),
          0
        );
        const saldoPendente = Math.max(0, (Number(c.valor) || 0) - totalBaixado);
        return {
          ...c,
          totalBaixado,
          saldoPendente,
        };
      })
      .filter((c) => c.saldoPendente > 0);
  }, [contas]);

  // Inicializa ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      if (contaSelecionadaInicial) {
        const cod =
          contaSelecionadaInicial.codigo ||
          contaSelecionadaInicial.codigoConta ||
          '';
        setCodigoInput(cod);
        carregarDadosConta(contaSelecionadaInicial);
      } else {
        setCodigoInput('');
        setContaSelecionada(null);
        setTipoPagamento('total');
        setValorInput('');
        setObservacao('');
        setDataPagamento(new Date().toISOString().slice(0, 10));
        setTimeout(() => {
          inputCodigoRef.current?.focus();
        }, 100);
      }
    }
  }, [isOpen, contaSelecionadaInicial]);

  // Listener para ESC fechar o modal
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const carregarDadosConta = (c) => {
    const totalBaixado = (c.baixas || []).reduce(
      (acc, b) => acc + (Number(b.valor) || 0),
      0
    );
    const saldoPendente = Math.max(0, (Number(c.valor) || 0) - totalBaixado);
    const contaEnriquecida = { ...c, totalBaixado, saldoPendente };

    setContaSelecionada(contaEnriquecida);
    setTipoPagamento('total');
    setValorInput(formatarMoedaInput(Math.round(saldoPendente * 100)));
  };

  // Trata digitação do código de 6 dígitos
  const handleCodigoChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCodigoInput(val);

    if (val.length === 6) {
      const encontrada = contas.find(
        (c) =>
          String(c.codigo || c.codigoConta) === val ||
          String(c.id) === val
      );
      if (encontrada) {
        carregarDadosConta(encontrada);
        toast.success(`✓ Conta #${val} (${encontrada.descricao}) identificada com sucesso!`);
      } else {
        setContaSelecionada(null);
        toast.warn(`Nenhuma conta localizada com o código #${val}.`);
      }
    } else {
      if (contaSelecionada) setContaSelecionada(null);
    }
  };

  // Trata seleção via dropdown
  const handleSelectContaDropdown = (e) => {
    const id = e.target.value;
    if (!id) {
      setContaSelecionada(null);
      setCodigoInput('');
      return;
    }
    const encontrada = contas.find((c) => String(c.id) === String(id));
    if (encontrada) {
      setCodigoInput(encontrada.codigo || encontrada.codigoConta || '');
      carregarDadosConta(encontrada);
    }
  };

  // Mudança do tipo de pagamento (Total vs Parcial)
  const handleTipoPagamentoChange = (novoTipo) => {
    setTipoPagamento(novoTipo);
    if (!contaSelecionada) return;

    if (novoTipo === 'total') {
      setValorInput(
        formatarMoedaInput(Math.round(contaSelecionada.saldoPendente * 100))
      );
    } else {
      setValorInput('');
    }
  };

  const handleValorChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarMoedaInput(valorDigitado);
    setValorInput(valorFormatado);
  };

  // Submissão
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!contaSelecionada) {
      toast.warn('Por favor, informe ou selecione o código de 6 dígitos da conta.');
      return;
    }

    const valorNumerico = converterMoedaParaNumero(valorInput);

    if (!valorNumerico || valorNumerico <= 0) {
      toast.warn('Informe um valor de pagamento válido maior que zero.');
      return;
    }

    if (valorNumerico > contaSelecionada.saldoPendente + 0.01) {
      toast.error(
        `O valor do pagamento (${formatCurrencyBRL(
          valorNumerico
        )}) não pode ser superior ao saldo pendente (${formatCurrencyBRL(
          contaSelecionada.saldoPendente
        )}).`
      );
      return;
    }

    onAplicarPagamento?.({
      identificador:
        contaSelecionada.codigo ||
        contaSelecionada.codigoConta ||
        contaSelecionada.id,
      tipoPagamento,
      valorPago: valorNumerico,
      observacao:
        observacao.trim() ||
        (tipoPagamento === 'total'
          ? 'Pagamento Total (Quitação)'
          : 'Pagamento Parcial'),
      dataPagamento,
    });

    onClose?.();
  };

  if (!isOpen) return null;

  const valorPagoNum = converterMoedaParaNumero(valorInput);
  const saldoRestantePrevia = contaSelecionada
    ? Math.max(0, contaSelecionada.saldoPendente - valorPagoNum)
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box modal-lg"
        style={{ maxWidth: '620px', width: 'min(620px, 94vw)' }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #2b2b36',
            paddingBottom: '12px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>💳</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#10b981' }}>
                Confirmar / Baixar Pagamento
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                Aplicação de pagamento total ou parcial direcionado à conta
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              fontSize: '1.4rem',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Seletor do Código de 6 Dígitos */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
            }}
          >
            <div className="form-grid">
              <div className="form-row">
                <label
                  htmlFor="pag-codigo"
                  style={{ color: '#fff', fontWeight: 700 }}
                >
                  🔢 Código de 6 Dígitos da Conta:
                </label>
                <input
                  ref={inputCodigoRef}
                  id="pag-codigo"
                  type="text"
                  maxLength={6}
                  value={codigoInput}
                  placeholder="Ex: 748291"
                  onChange={handleCodigoChange}
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    letterSpacing: '3px',
                    textAlign: 'center',
                    color: '#34d399',
                    borderColor: contaSelecionada ? '#10b981' : undefined,
                  }}
                />
              </div>

              <div className="form-row">
                <label style={{ color: '#ccc' }}>Ou selecione na lista:</label>
                <select
                  value={contaSelecionada?.id || ''}
                  onChange={handleSelectContaDropdown}
                >
                  <option value="">-- Selecione uma conta pendente --</option>
                  {contasPendentes.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.codigo || c.id} [{c.tipo === 'Pagar' ? 'A PAGAR' : 'A RECEBER'}] {c.descricao} (Saldo: {formatCurrencyBRL(c.saldoPendente)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card com Detalhes da Conta Selecionada */}
          {contaSelecionada ? (
            <div
              style={{
                background: '#16161a',
                border: '1px solid #2b2b35',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      background:
                        contaSelecionada.tipo === 'Receber'
                          ? 'rgba(34, 197, 94, 0.2)'
                          : 'rgba(239, 68, 68, 0.2)',
                      color:
                        contaSelecionada.tipo === 'Receber'
                          ? '#86efac'
                          : '#fca5a5',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {contaSelecionada.tipo === 'Receber'
                      ? '🟢 A Receber'
                      : '🔴 A Pagar'}
                  </span>
                  <span
                    style={{
                      color: '#a1a1aa',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    Cód: <strong>#{contaSelecionada.codigo || contaSelecionada.id}</strong>
                  </span>
                </div>

                <span
                  style={{
                    color: '#e4e4e7',
                    fontSize: '0.8rem',
                  }}
                >
                  📅 Venc: <strong>{formatDateBR(contaSelecionada.vencimento)}</strong>
                </span>
              </div>

              <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#fff' }}>
                {contaSelecionada.descricao}
              </h4>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '8px',
                  marginTop: '8px',
                  borderTop: '1px solid #24242e',
                  paddingTop: '8px',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>
                    Valor Total Original:
                  </span>
                  <div style={{ fontWeight: 600, color: '#d4d4d8' }}>
                    {formatCurrencyBRL(contaSelecionada.valor)}
                  </div>
                </div>

                {contaSelecionada.totalBaixado > 0 && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>
                      Já Baixado / Pago:
                    </span>
                    <div style={{ fontWeight: 600, color: '#38bdf8' }}>
                      {formatCurrencyBRL(contaSelecionada.totalBaixado)}
                    </div>
                  </div>
                )}

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>
                    Saldo Pendente Atual:
                  </span>
                  <div
                    style={{
                      fontWeight: 700,
                      color: '#34d399',
                      fontSize: '1rem',
                    }}
                  >
                    {formatCurrencyBRL(contaSelecionada.saldoPendente)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '18px 12px',
                color: '#71717a',
                fontSize: '0.85rem',
                border: '1px dashed #27272a',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              🔍 Digite o código de 6 dígitos acima ou escolha uma conta na lista para prosseguir.
            </div>
          )}

          {/* Tipo de Pagamento: Total vs Parcial */}
          {contaSelecionada && (
            <>
              <div className="form-row" style={{ marginBottom: '14px' }}>
                <label style={{ color: '#fff', fontWeight: 700 }}>
                  Modalidade de Pagamento:
                </label>
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '4px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleTipoPagamentoChange('total')}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border:
                        tipoPagamento === 'total'
                          ? '2px solid #10b981'
                          : '1px solid #2b2b2e',
                      background:
                        tipoPagamento === 'total'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : '#121214',
                      color: tipoPagamento === 'total' ? '#34d399' : '#a1a1aa',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🟢</span> Pagamento Total (Quitação)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTipoPagamentoChange('parcial')}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border:
                        tipoPagamento === 'parcial'
                          ? '2px solid #eab308'
                          : '1px solid #2b2b2e',
                      background:
                        tipoPagamento === 'parcial'
                          ? 'rgba(234, 179, 8, 0.15)'
                          : '#121214',
                      color: tipoPagamento === 'parcial' ? '#fde047' : '#a1a1aa',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🟡</span> Pagamento Parcial
                  </button>
                </div>
              </div>

              {/* Valor do Pagamento e Data */}
              <div className="form-grid">
                <div className="form-row">
                  <label htmlFor="pag-valor" style={{ color: '#fff', fontWeight: 700 }}>
                    💵 Valor a Aplicar (R$): *
                  </label>
                  <input
                    id="pag-valor"
                    type="text"
                    value={valorInput}
                    onChange={handleValorChange}
                    placeholder="R$ 0,00"
                    required
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#fff',
                    }}
                  />
                  {tipoPagamento === 'parcial' && (
                    <small
                      style={{
                        marginTop: '4px',
                        display: 'block',
                        color: saldoRestantePrevia > 0 ? '#38bdf8' : '#34d399',
                      }}
                    >
                      Restará na conta:{' '}
                      <strong>{formatCurrencyBRL(saldoRestantePrevia)}</strong>
                    </small>
                  )}
                </div>

                <div className="form-row">
                  <label htmlFor="pag-data" style={{ color: '#fff' }}>
                    📅 Data do Pagamento:
                  </label>
                  <input
                    id="pag-data"
                    type="date"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Observação / Forma de Pagamento */}
              <div className="form-row">
                <label htmlFor="pag-obs">📝 Observação / Forma de Pagamento (Opcional):</label>
                <input
                  id="pag-obs"
                  type="text"
                  value={observacao}
                  placeholder="Ex: Pix Cora, Dinheiro, Transferência bancária..."
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Botões do Rodapé */}
          <div className="modal-buttons" style={{ marginTop: '20px' }}>
            <button
              className="salve"
              type="submit"
              disabled={!contaSelecionada}
              style={{
                opacity: !contaSelecionada ? 0.5 : 1,
                cursor: !contaSelecionada ? 'not-allowed' : 'pointer',
                background: '#10b981',
                borderColor: '#10b981',
              }}
            >
              💾 Aplicar Pagamento
            </button>
            <button className="cancela" type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
