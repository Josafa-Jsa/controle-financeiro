// src/components/Modais/ModalContrato.jsx
import React, { useEffect, useState } from 'react';
import { DADOS_JSA_PADRAO, montarTextoContrato } from '../../utils/contratoModeloTexto';
import { gerarContratoServicosPDF } from '../../utils/gerarContratoServicosPDF';
import { formatarCPFouCNPJ, formatarTelefone, buscarClientePorDocumento } from '../../services/clientesService';
import { toast } from 'react-toastify';
import '../Visual/modal.css';

const VAZIO = {
  // Contratante / Cliente
  dadosContratante: {
    tipoPessoa: 'PJ', // 'PJ' ou 'PF'
    razaoSocial: '',
    documento: '',
    endereco: '',
    telefone: '',
    email: '',
    representanteNome: 'Josafá da Silva Santos',
    representanteNacionalidade: 'brasileiro',
    representanteEstadoCivil: 'casado',
    representanteProfissao: 'Empresário',
    representanteRG: '',
    representanteOrgaoRG: 'SSP/MT',
    representanteCPF: '',
    representanteEndereco: '',
    representanteCargo: 'Sócio / Representante Legal',
  },

  // Objeto & Serviço
  objetoServico: 'Prestação de serviços profissionais especializados em Tecnologia da Informação, incluindo suporte técnico preventivo e corretivo, manutenção de infraestrutura de rede, monitoramento, segurança eletrônica e consultoria técnica.',
  recursosOperacionais: 'não aplicável',

  // Prazos e Execução
  diasInicio: '2',
  tipoVigencia: 'indeterminado', // 'determinado' ou 'indeterminado'
  prazoConclusao: '',
  vencimento: new Date().toISOString().slice(0, 10),

  // Preço e Condições
  tipoPagamento: 'mensal', // 'mensal' ou 'parcelado'
  valor: '',
  valorExtenso: '',
  periodoPagamento: 'mês',
  diasAdimplemento: '5',
  parcelasDetalhes: '',
  indiceCorrecao: 'IPCA',

  // Níveis de Serviço (SLA)
  slaSeguranca: 'conforme normas técnicas e de segurança vigentes',
  slaQualidade: 'aprovação formal dos entregáveis e relatórios técnicos de atendimento',
  slaPontualidade: 'cumprimento rigoroso dos prazos e cronogramas acordados',
  slaComunicacao: 'canais de atendimento corporativo (65) 98402-7342 e jsa.tech.jsa@gmail.com, com resposta em até 4h úteis',

  // Exclusividade
  tipoExclusividade: 'sem_exclusividade', // 'sem_exclusividade' ou 'com_exclusividade'
  segmentoExclusividade: '',

  // Cláusulas Adicionais
  diasEnvioNF: '5',
  diasSanarVicio: '5',
  multaRescisao: '10',
  diasAvisoPrevio: '30',
  foroCidade: 'Tangará da Serra',
  foroUF: 'MT',

  // Testemunhas
  testemunha1Nome: '',
  testemunha1CPF: '',
  testemunha2Nome: '',
  testemunha2CPF: '',

  // Data de Assinatura
  dataAssinatura: new Date().toISOString().slice(0, 10),
};

export default function ModalContrato({
  isOpen,
  onClose,
  onSave,
  contratoParaEditar = null,
}) {
  const [abaAtiva, setAbaAtiva] = useState('formulario'); // 'formulario' | 'previa'
  const [contrato, setContrato] = useState(VAZIO);
  const [mostrarDadosJsa, setMostrarDadosJsa] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (contratoParaEditar) {
        setContrato({
          ...VAZIO,
          ...contratoParaEditar,
          dadosContratante: {
            ...VAZIO.dadosContratante,
            ...(contratoParaEditar.dadosContratante || {}),
            razaoSocial: contratoParaEditar.dadosContratante?.razaoSocial || contratoParaEditar.parceiro || '',
            documento: contratoParaEditar.dadosContratante?.documento || '',
            endereco: contratoParaEditar.dadosContratante?.endereco || '',
          },
          objetoServico: contratoParaEditar.objetoServico || contratoParaEditar.descricao || VAZIO.objetoServico,
          valor: contratoParaEditar.valor || '',
          vencimento: contratoParaEditar.vencimento ? contratoParaEditar.vencimento.slice(0, 10) : VAZIO.vencimento,
        });
      } else {
        setContrato(VAZIO);
      }
      setAbaAtiva('formulario');
    }
  }, [isOpen, contratoParaEditar]);

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleContratanteChange = (campo, valor) => {
    setContrato((prev) => {
      const novosDados = { ...prev.dadosContratante, [campo]: valor };
      return {
        ...prev,
        dadosContratante: novosDados,
      };
    });
  };

  const handleDocumentoChange = (e) => {
    const valorFormatado = formatarCPFouCNPJ(e.target.value);
    const digits = valorFormatado.replace(/\D/g, '');
    const tipo = digits.length > 11 ? 'PJ' : 'PF';

    setContrato((prev) => ({
      ...prev,
      dadosContratante: {
        ...prev.dadosContratante,
        documento: valorFormatado,
        tipoPessoa: tipo,
      },
    }));

    // Auto-busca no histórico se houver
    const encontrado = buscarClientePorDocumento(valorFormatado);
    if (encontrado) {
      setContrato((prev) => ({
        ...prev,
        dadosContratante: {
          ...prev.dadosContratante,
          documento: valorFormatado,
          razaoSocial: encontrado.nome || prev.dadosContratante.razaoSocial,
          endereco: encontrado.endereco || prev.dadosContratante.endereco,
          telefone: formatarTelefone(encontrado.telefone || prev.dadosContratante.telefone),
          email: encontrado.email || prev.dadosContratante.email,
        },
      }));
      toast.info(`Dados de "${encontrado.nome}" preenchidos automaticamente!`);
    }
  };

  const handleChangeGeral = (campo, valor) => {
    setContrato((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // Compila o objeto pronto para salvar e gerar PDF
  const prepararPayload = () => {
    const parceiroNome =
      contrato.dadosContratante.razaoSocial ||
      contrato.dadosContratante.nome ||
      'Cliente';
    const descricaoServico = contrato.objetoServico || 'Prestação de Serviços Especializados';
    const textoCompilado = montarTextoContrato(contrato);

    return {
      ...contrato,
      parceiro: parceiroNome,
      descricao: descricaoServico,
      valor: Number(contrato.valor || 0),
      vencimento: contrato.vencimento,
      texto: textoCompilado,
    };
  };

  const handleSalvar = (e) => {
    e?.preventDefault();
    if (!contrato.dadosContratante.razaoSocial.trim()) {
      toast.warn('Por favor, informe a Razão Social ou Nome do Contratante.');
      return;
    }
    const payload = prepararPayload();
    onSave?.(payload);
    onClose?.();
  };

  const handleGerarPDF = () => {
    try {
      const payload = prepararPayload();
      gerarContratoServicosPDF(payload);
      toast.success('PDF do Contrato de Prestação de Serviços gerado!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar PDF do Contrato.');
    }
  };

  const textoPrevia = montarTextoContrato(contrato);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '920px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #27272a',
            paddingBottom: '14px',
            marginBottom: '14px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.28rem', color: '#00d2ff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📜</span> {contratoParaEditar ? 'Editar Contrato de Prestação de Serviços' : 'Novo Contrato de Prestação de Serviços'}
            </h2>
            <span style={{ fontSize: '0.84rem', color: '#a1a1aa', marginTop: '2px', display: 'block' }}>
              Estrutura jurídica com 13 cláusulas completas • Dados da JSA pré-preenchidos
            </span>
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
              lineHeight: 1,
              padding: '4px 8px',
            }}
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Banner Informativo da CONTRATADA (JSA) */}
        <div
          style={{
            background: '#1e1e24',
            border: '1px solid #2e2e38',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.3rem' }}>🏢</span>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#38bdf8' }}>
                CONTRATADA: {DADOS_JSA_PADRAO.razaoSocial}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                CNPJ: {DADOS_JSA_PADRAO.cnpj} • Repr: {DADOS_JSA_PADRAO.representanteNome} ({DADOS_JSA_PADRAO.representanteCPF})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMostrarDadosJsa(!mostrarDadosJsa)}
            style={{
              background: 'transparent',
              border: '1px solid #3f3f46',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.76rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {mostrarDadosJsa ? '▲ Ocultar Detalhes JSA' : '▼ Ver Dados JSA'}
          </button>
        </div>

        {/* Detalhes expandidos da JSA */}
        {mostrarDadosJsa && (
          <div
            style={{
              background: '#121214',
              border: '1px solid #27272a',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '14px',
              fontSize: '0.8rem',
              color: '#cbd5e1',
              lineHeight: 1.5,
            }}
          >
            <strong>Endereço Sede:</strong> {DADOS_JSA_PADRAO.endereco} | <strong>Email:</strong> {DADOS_JSA_PADRAO.email} | <strong>Telefone:</strong> {DADOS_JSA_PADRAO.telefone}<br />
            <strong>Representante Legal:</strong> {DADOS_JSA_PADRAO.representanteNome}, {DADOS_JSA_PADRAO.representanteNacionalidade}, {DADOS_JSA_PADRAO.representanteEstadoCivil}, RG: {DADOS_JSA_PADRAO.representanteRG} {DADOS_JSA_PADRAO.representanteOrgaoRG}, CPF: {DADOS_JSA_PADRAO.representanteCPF}
          </div>
        )}

        {/* Abas de Navegação */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #27272a', paddingBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setAbaAtiva('formulario')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: abaAtiva === 'formulario' ? '#0284c7' : '#27272a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <span>📝</span> 1. Preenchimento dos Dados
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('previa')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: abaAtiva === 'previa' ? '#0284c7' : '#27272a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <span>👁️</span> 2. Prévia do Contrato Completo (13 Cláusulas)
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
          {abaAtiva === 'formulario' ? (
            <form id="form-contrato-completo" onSubmit={handleSalvar}>
              {/* SEÇÃO 1: DADOS DO CONTRATANTE (CLIENTE) */}
              <div style={{ marginBottom: '20px', background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>👤</span> Dados da CONTRATANTE (Cliente / Tomador do Serviço)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  {/* CNPJ ou CPF */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#e4e4e7', fontWeight: 600, marginBottom: '4px' }}>
                      CPF ou CNPJ: *
                    </label>
                    <input
                      type="text"
                      placeholder="Digite o CPF ou CNPJ..."
                      value={contrato.dadosContratante.documento}
                      onChange={handleDocumentoChange}
                      style={{ width: '100%', padding: '9px 12px', background: '#121214', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', boxSizing: 'border-box' }}
                      required
                    />
                  </div>

                  {/* Razão Social / Nome Completo */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#e4e4e7', fontWeight: 600, marginBottom: '4px' }}>
                      Razão Social ou Nome Completo: *
                    </label>
                    <input
                      type="text"
                      placeholder="Nome do cliente ou empresa..."
                      value={contrato.dadosContratante.razaoSocial}
                      onChange={(e) => handleContratanteChange('razaoSocial', e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', background: '#121214', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                </div>

                {/* Endereço */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#e4e4e7', fontWeight: 600, marginBottom: '4px' }}>
                    Endereço Completo (Rua, nº, Bairro, Cidade - UF): *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Av. Brasil, n. 1200, Centro, Tangará da Serra - MT"
                    value={contrato.dadosContratante.endereco}
                    onChange={(e) => handleContratanteChange('endereco', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', background: '#121214', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#e4e4e7', fontWeight: 600, marginBottom: '4px' }}>
                      Telefone / WhatsApp:
                    </label>
                    <input
                      type="text"
                      placeholder="(XX) XXXXX-XXXX"
                      value={contrato.dadosContratante.telefone}
                      onChange={(e) => handleContratanteChange('telefone', formatarTelefone(e.target.value))}
                      style={{ width: '100%', padding: '9px 12px', background: '#121214', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#e4e4e7', fontWeight: 600, marginBottom: '4px' }}>
                      E-mail:
                    </label>
                    <input
                      type="email"
                      placeholder="cliente@email.com"
                      value={contrato.dadosContratante.email}
                      onChange={(e) => handleContratanteChange('email', e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', background: '#121214', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Representante Legal (se PJ) */}
                {contrato.dadosContratante.tipoPessoa === 'PJ' && (
                  <div style={{ background: '#121214', border: '1px solid #27272a', borderRadius: '8px', padding: '12px', marginTop: '10px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', marginBottom: '10px' }}>
                      👤 Representante Legal da Empresa Contratante:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.76rem', color: '#a1a1aa' }}>Nome do Representante:</label>
                        <input
                          type="text"
                          value={contrato.dadosContratante.representanteNome}
                          placeholder="Nome completo do sócio/procurador"
                          onChange={(e) => handleContratanteChange('representanteNome', e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', background: '#18181b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.76rem', color: '#a1a1aa' }}>CPF do Representante:</label>
                        <input
                          type="text"
                          value={contrato.dadosContratante.representanteCPF}
                          placeholder="000.000.000-00"
                          onChange={(e) => handleContratanteChange('representanteCPF', formatarCPFouCNPJ(e.target.value))}
                          style={{ width: '100%', padding: '7px 10px', background: '#18181b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.76rem', color: '#a1a1aa' }}>RG e Órgão:</label>
                        <input
                          type="text"
                          value={contrato.dadosContratante.representanteRG}
                          placeholder="Ex: 1234567-8 SSP/MT"
                          onChange={(e) => handleContratanteChange('representanteRG', e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', background: '#18181b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.76rem', color: '#a1a1aa' }}>Cargo / Qualificação:</label>
                        <input
                          type="text"
                          value={contrato.dadosContratante.representanteCargo}
                          placeholder="Sócio Administrador / Diretor"
                          onChange={(e) => handleContratanteChange('representanteCargo', e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', background: '#18181b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO 2: OBJETO DO CONTRATO */}
              <div style={{ marginBottom: '20px', background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🛠️</span> Objeto dos Serviços (Cláusula 1ª)
                </h4>
                <textarea
                  rows={3}
                  value={contrato.objetoServico}
                  onChange={(e) => handleChangeGeral('objetoServico', e.target.value)}
                  placeholder="Especifique detalhadamente os serviços contratados..."
                  style={{ width: '100%', padding: '10px 12px', background: '#121214', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', lineHeight: 1.5, boxSizing: 'border-box', outline: 'none' }}
                  required
                />
              </div>

              {/* SEÇÃO 3: VALORES E PAGAMENTO */}
              <div style={{ marginBottom: '20px', background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💰</span> Preço e Condições de Pagamento (Cláusula 7ª)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#e4e4e7', fontWeight: 600, marginBottom: '4px' }}>
                      Modelo de Cobrança:
                    </label>
                    <select
                      value={contrato.tipoPagamento}
                      onChange={(e) => handleChangeGeral('tipoPagamento', e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', background: '#121214', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    >
                      <option value="mensal">Mensal / Recorrente (Mensalidade)</option>
                      <option value="parcelado">Fixo / Parcelado</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#e4e4e7', fontWeight: 600, marginBottom: '4px' }}>
                      Valor (R$): *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={contrato.valor}
                      onChange={(e) => handleChangeGeral('valor', e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', background: '#121214', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', boxSizing: 'border-box' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#e4e4e7', fontWeight: 600, marginBottom: '4px' }}>
                      Vencimento / Dia do Pagamento: *
                    </label>
                    <input
                      type="date"
                      value={contrato.vencimento}
                      onChange={(e) => handleChangeGeral('vencimento', e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', background: '#121214', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                </div>

                {contrato.tipoPagamento === 'parcelado' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#e4e4e7', fontWeight: 600, marginBottom: '4px' }}>
                      Detalhamento das Parcelas:
                    </label>
                    <textarea
                      rows={2}
                      value={contrato.parcelasDetalhes}
                      onChange={(e) => handleChangeGeral('parcelasDetalhes', e.target.value)}
                      placeholder="Ex: a) 1ª parcela: R$ 500,00 em 10/10/2026; b) 2ª parcela: R$ 500,00 em 10/11/2026..."
                      style={{ width: '100%', padding: '8px 12px', background: '#121214', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '0.84rem', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>

              {/* SEÇÃO 4: VIGÊNCIA E CLÁUSULAS */}
              <div style={{ marginBottom: '20px', background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚖️</span> Vigência, Exclusividade e Foro
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#e4e4e7', fontWeight: 600, marginBottom: '4px' }}>
                      Vigência (Cláusula 4ª):
                    </label>
                    <select
                      value={contrato.tipoVigencia}
                      onChange={(e) => handleChangeGeral('tipoVigencia', e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', background: '#121214', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    >
                      <option value="indeterminado">Prazo Indeterminado / Recorrente</option>
                      <option value="determinado">Prazo Determinado (com término)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#e4e4e7', fontWeight: 600, marginBottom: '4px' }}>
                      Exclusividade (Cláusula 6ª):
                    </label>
                    <select
                      value={contrato.tipoExclusividade}
                      onChange={(e) => handleChangeGeral('tipoExclusividade', e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', background: '#121214', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    >
                      <option value="sem_exclusividade">Sem Exclusividade (Padrão)</option>
                      <option value="com_exclusividade">Com Exclusividade no Segmento</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#e4e4e7', fontWeight: 600, marginBottom: '4px' }}>
                      Foro de Eleição (Cláusula 13ª):
                    </label>
                    <input
                      type="text"
                      value={contrato.foroCidade + ' / ' + contrato.foroUF}
                      readOnly
                      style={{ width: '100%', padding: '9px 12px', background: '#121214', border: '1px solid #27272a', borderRadius: '8px', color: '#94a3b8', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </form>
          ) : (
            /* ABA 2: PRÉVIA COMPLETA DO CONTRATO */
            <div style={{ background: '#121214', border: '1px solid #27272a', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #27272a', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                  📄 Texto Completo Formatado (13 Cláusulas)
                </span>
                <span style={{ fontSize: '0.78rem', color: '#a1a1aa' }}>
                  Atualizado em tempo real com as informações preenchidas
                </span>
              </div>
              <pre
                style={{
                  margin: 0,
                  fontSize: '0.82rem',
                  lineHeight: 1.6,
                  color: '#e4e4e7',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'inherit',
                  maxHeight: '480px',
                  overflowY: 'auto',
                  paddingRight: '8px',
                }}
              >
                {textoPrevia}
              </pre>
            </div>
          )}
        </div>

        {/* Rodapé com Botões de Ação */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            borderTop: '1px solid #27272a',
            paddingTop: '14px',
            marginTop: '14px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleGerarPDF}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              <span>📄</span> Baixar / Visualizar PDF
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="cancela"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#27272a',
                border: '1px solid #3f3f46',
                color: '#e4e4e7',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.88rem',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="salve"
              onClick={handleSalvar}
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <span>💾</span> Salvar Contrato
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
