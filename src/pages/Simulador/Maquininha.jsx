import React from 'react';
import { formatCurrencyBRL } from '../../utils/telegram';
import '../../components/Visual/Maquininha.css';

/**
 * Componente Visual e Interativo da Maquininha de Cartão (Moderninha Pro)
 * Desenvolvido 100% em CSS + JSX para alta performance, nitidez e interatividade total.
 */
export default function Maquininha({
  valor,
  onValorChange,
  parcelas,
  onParcelasChange,
  juros,
  tabelaJuros,
  previewCalculo,
  onCancela,
  onApaga,
  onConfirma,
  onMenu,
  onDigitoClick,
}) {
  return (
    <div className="pos-device-container">
      <div className="pos-device-chassis">
        {/* TOPO: Compartimento da Bobina e Slot de Impressão */}
        <div className="pos-top-printer-area">
          <div className="pos-printer-slot" />
          <div className="pos-brand-text">
            JSA <span>Pay Pro</span>
          </div>
          <div className="pos-contactless-icon" title="Aproximação Contactless / NFC">
            📶 💳
          </div>
        </div>

        {/* MOLDURA E VISOR DIGITAL */}
        <div className="pos-screen-bezel">
          <div className="pos-screen-display">
            {/* Status Bar */}
            <div className="pos-screen-statusbar">
              <span className="pos-screen-title">⚡ JSA • CRÉDITO</span>
              <span className="pos-screen-icons">Wi-Fi • 🔋 100%</span>
            </div>

            {/* Formulário no Visor */}
            <div className="pos-screen-form">
              {/* Campo 1: Valor */}
              <div className="pos-form-group">
                <label className="pos-label">Valor do Crédito:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={valor}
                  onChange={onValorChange}
                  placeholder="R$ 0,00"
                  className="pos-input-visor"
                  autoFocus
                />
              </div>

              {/* Grid: Parcelas e Juros */}
              <div className="pos-row-grid">
                <div className="pos-form-group">
                  <label className="pos-label">Parcelas:</label>
                  <select
                    value={parcelas}
                    onChange={onParcelasChange}
                    className="pos-select-visor"
                  >
                    <option value="">Selecione</option>
                    {Object.keys(tabelaJuros).map((qtd) => (
                      <option key={qtd} value={qtd}>
                        {qtd}x
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pos-form-group">
                  <label className="pos-label">Juros (% a.m.):</label>
                  <input
                    type="text"
                    value={juros ? `${juros}%` : '0.00%'}
                    readOnly
                    tabIndex="-1"
                    className="pos-input-visor"
                    style={{
                      backgroundColor: '#16171f',
                      color: '#94a3b8',
                      fontSize: '0.85rem',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
              </div>

              {/* Live Preview no Visor */}
              {previewCalculo && previewCalculo.valido ? (
                <div className="pos-live-preview">
                  <div className="pos-preview-header">
                    <span>PARCELA ({parcelas}X):</span>
                    <strong className="pos-preview-value">
                      {formatCurrencyBRL(previewCalculo.parcela)}
                    </strong>
                  </div>
                  <div className="pos-preview-footer">
                    <span>Total: {formatCurrencyBRL(previewCalculo.totalPago)}</span>
                    <span>Juros: {formatCurrencyBRL(previewCalculo.totalJuros)}</span>
                  </div>
                </div>
              ) : (
                <div className="pos-live-preview" style={{ opacity: 0.6, borderStyle: 'dotted' }}>
                  <div className="pos-preview-header">
                    <span>PARCELA ESTIMADA:</span>
                    <strong className="pos-preview-value">R$ 0,00</strong>
                  </div>
                  <div className="pos-preview-footer">
                    <span>Informe o valor e selecione as parcelas</span>
                  </div>
                </div>
              )}
            </div>

            {/* Dica de Teclas no Rodapé do Visor */}
            <div className="pos-screen-hint">
              <span>🟢 Confirma • 🟡 Corrige • 🔴 Cancela • 📑 Menu</span>
            </div>
          </div>
        </div>

        {/* TECLADO FÍSICO 3D (KEYPAD) */}
        <div className="pos-keypad-grid">
          {/* Linha 1 */}
          <button
            type="button"
            className="pos-key-btn"
            onClick={() => onDigitoClick && onDigitoClick('1')}
          >
            <span className="key-num">1</span>
            <span className="key-letters">QZ</span>
          </button>

          <button
            type="button"
            className="pos-key-btn"
            onClick={() => onDigitoClick && onDigitoClick('2')}
          >
            <span className="key-num">2</span>
            <span className="key-letters">ABC</span>
          </button>

          <button
            type="button"
            className="pos-key-btn"
            onClick={() => onDigitoClick && onDigitoClick('3')}
          >
            <span className="key-num">3</span>
            <span className="key-letters">DEF</span>
          </button>

          {/* Botão Vermelho (Cancela / Limpa) */}
          <button
            type="button"
            className="pos-key-red"
            onClick={onCancela}
            title="Cancelar / Limpar Simulação"
          >
            CANCELA
          </button>

          {/* Linha 2 */}
          <button
            type="button"
            className="pos-key-btn"
            onClick={() => onDigitoClick && onDigitoClick('4')}
          >
            <span className="key-num">4</span>
            <span className="key-letters">GHI</span>
          </button>

          <button
            type="button"
            className="pos-key-btn"
            onClick={() => onDigitoClick && onDigitoClick('5')}
          >
            <span className="key-num">5</span>
            <span className="key-letters">JKL</span>
          </button>

          <button
            type="button"
            className="pos-key-btn"
            onClick={() => onDigitoClick && onDigitoClick('6')}
          >
            <span className="key-num">6</span>
            <span className="key-letters">MNO</span>
          </button>

          {/* Botão Amarelo (Corrige / Apaga) */}
          <button
            type="button"
            className="pos-key-yellow"
            onClick={onApaga}
            title="Apagar / Corrigir Dígito"
          >
            CORRIGE
          </button>

          {/* Linha 3 */}
          <button
            type="button"
            className="pos-key-btn"
            onClick={() => onDigitoClick && onDigitoClick('7')}
          >
            <span className="key-num">7</span>
            <span className="key-letters">PRS</span>
          </button>

          <button
            type="button"
            className="pos-key-btn"
            onClick={() => onDigitoClick && onDigitoClick('8')}
          >
            <span className="key-num">8</span>
            <span className="key-letters">TUV</span>
          </button>

          <button
            type="button"
            className="pos-key-btn"
            onClick={() => onDigitoClick && onDigitoClick('9')}
          >
            <span className="key-num">9</span>
            <span className="key-letters">WXY</span>
          </button>

          {/* Botão Verde (Confirma / Entra - Ocupa Linhas 3 e 4) */}
          <button
            type="button"
            className="pos-key-green"
            onClick={onConfirma}
            title="Confirmar e Calcular Simulação"
          >
            <span className="pos-green-led" />
            <span>ENTRA</span>
          </button>

          {/* Linha 4 */}
          <button
            type="button"
            className="pos-key-btn"
            onClick={() => onDigitoClick && onDigitoClick('00')}
            title="Inserir centavos / zeros"
          >
            <span className="key-num">00</span>
            <span className="key-letters">AV PAPEL</span>
          </button>

          <button
            type="button"
            className="pos-key-btn"
            onClick={() => onDigitoClick && onDigitoClick('0')}
          >
            <span className="key-num">0</span>
            <span className="key-letters">.*#</span>
          </button>

          {/* Botão MENU (Relatório de Simulações) */}
          <button
            type="button"
            className="pos-key-btn pos-key-menu-btn"
            onClick={onMenu}
            title="Gerar Relatório de Simulações do Mês Vigente"
          >
            <span style={{ fontSize: '0.48rem', opacity: 0.9 }}>IMPRIMIR</span>
          </button>
        </div>
      </div>
    </div>
  );
}
