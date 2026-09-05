import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatarMoedaInput, converterMoedaParaNumero } from '../../utils/numberUtils';
import { formatarChaveBlocos, limparChave } from '../../services/consultaNFeService';
import { extrairCnpjLimpo, formatarCnpj, obterPadraoCnpj, obterPadraoCnpjAsync, salvarPadraoCnpj } from '../../services/memoriaCnpjService';
import { decodificarChaveControle } from '../../services/controleNotasService';
import { getUser } from '../../auth/auth';
import ModalCadastrarFornecedor from './ModalCadastrarFornecedor';
import ModalPerguntaAnexarDanfe from './ModalPerguntaAnexarDanfe';
import ModalAnexarDanfe from './ModalAnexarDanfe';
import '../Visual/modal.css';

export default function ModalInserirControleNota({
  isOpen = false,
  onClose = () => { },
  onSave = () => { },
  notaParaEditar = null,
}) {
  const usuarioLogado = getUser();
  const nomeUsuarioLogado =
    usuarioLogado?.name ||
    usuarioLogado?.nome ||
    usuarioLogado?.username ||
    'Usuário Atual';
  const emailUsuarioLogado = usuarioLogado?.email || '';
  const filialUsuarioLogado =
    usuarioLogado?.filial ||
    usuarioLogado?.user_filial ||
    localStorage.getItem('usuario_filial') ||
    'Filial 1';

  const getAgoraIsoDateTime = () => {
    const agora = new Date();
    const tzOffset = agora.getTimezoneOffset() * 60000;
    const localIso = new Date(agora.getTime() - tzOffset).toISOString().slice(0, 16);
    return localIso;
  };

  const base = useMemo(
    () => ({
      id: undefined,
      filial: filialUsuarioLogado,
      chavedeacesso: '',
      numero: '',
      fornecedor: '',
      cnpj: '',
      dataEmissao: new Date().toISOString().slice(0, 10),
      valor: '',
      dataHoraEntrega: getAgoraIsoDateTime(),
      quemRecebeu: nomeUsuarioLogado,
      quemRecebeuEmail: emailUsuarioLogado,
      observacoes: '',
      status: 'Recebida',
      anexoDanfe: null,
    }),
    [nomeUsuarioLogado, emailUsuarioLogado, filialUsuarioLogado]
  );

  const [form, setForm] = useState(base);
  const [lookupMsg, setLookupMsg] = useState({ text: '', tipo: '' });
  const [modalFornecedorAberto, setModalFornecedorAberto] = useState(false);
  const [modalPerguntaAnexarAberto, setModalPerguntaAnexarAberto] = useState(false);
  const [modalAnexarDanfeAberto, setModalAnexarDanfeAberto] = useState(false);
  const [cnpjParaCadastrar, setCnpjParaCadastrar] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (notaParaEditar) {
        setForm({
          id: notaParaEditar.id,
          filial: notaParaEditar.filial || filialUsuarioLogado,
          chavedeacesso: notaParaEditar.chavedeacesso || '',
          numero: notaParaEditar.numero || '',
          fornecedor: notaParaEditar.fornecedor || notaParaEditar.clienteOuServico || '',
          cnpj: notaParaEditar.cnpj || '',
          dataEmissao:
            notaParaEditar.dataEmissao ||
            new Date().toISOString().slice(0, 10),
          valor:
            notaParaEditar.valor !== undefined &&
              notaParaEditar.valor !== null &&
              notaParaEditar.valor !== ''
              ? formatarMoedaInput(
                Math.round(Number(notaParaEditar.valor) * 100)
              )
              : '',
          dataHoraEntrega: notaParaEditar.dataHoraEntrega || getAgoraIsoDateTime(),
          quemRecebeu: notaParaEditar.quemRecebeu || nomeUsuarioLogado,
          quemRecebeuEmail: notaParaEditar.quemRecebeuEmail || emailUsuarioLogado,
          observacoes: notaParaEditar.observacoes || '',
          status: notaParaEditar.status || 'Recebida',
          anexoDanfe: notaParaEditar.anexoDanfe || null,
        });
      } else {
        setForm({
          ...base,
          filial: filialUsuarioLogado,
          dataHoraEntrega: getAgoraIsoDateTime(),
          quemRecebeu: nomeUsuarioLogado,
          quemRecebeuEmail: emailUsuarioLogado,
        });
      }
      setLookupMsg({ text: '', tipo: '' });
      setModalFornecedorAberto(false);
      setModalPerguntaAnexarAberto(false);
      setModalAnexarDanfeAberto(false);
    }
  }, [isOpen, notaParaEditar, base, nomeUsuarioLogado, emailUsuarioLogado, filialUsuarioLogado]);

  useEffect(() => {
    const onEsc = (e) =>
      e.key === 'Escape' &&
      isOpen &&
      !modalFornecedorAberto &&
      !modalPerguntaAnexarAberto &&
      !modalAnexarDanfeAberto &&
      onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, modalFornecedorAberto, modalPerguntaAnexarAberto, modalAnexarDanfeAberto, onClose]);

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  /**
   * Processa a inserção/validação da chave de 44 dígitos
   */
  const processarChaveAcesso = async (chave) => {
    const limpa = limparChave(chave);
    if (limpa.length !== 44) return;

    let info = decodificarChaveControle(limpa);
    if (!info) return;

    // Se ainda não localizou localmente, consulta no banco de dados MySQL
    if (!info.fornecedorCadastrado || !info.fornecedor) {
      const dbFornecedor = await obterPadraoCnpjAsync(info.cnpjRaw);
      if (dbFornecedor && dbFornecedor.nome) {
        info = {
          ...info,
          fornecedor: dbFornecedor.nome.toUpperCase(),
          fornecedorCadastrado: true,
          padrao: dbFornecedor,
        };
      }
    }

    // Se o fornecedor já for cadastrado no sistema / banco de dados
    if (info.fornecedorCadastrado && info.fornecedor) {
      setForm((prev) => ({
        ...prev,
        chavedeacesso: limpa,
        numero: info.numero || prev.numero,
        cnpj: info.cnpj || prev.cnpj,
        dataEmissao: info.dataEmissao || prev.dataEmissao,
        fornecedor: info.fornecedor,
      }));

      setLookupMsg({
        text: `✅ Chave validada! Fornecedor "${info.fornecedor}" recuperado do banco de dados e dados preenchidos.`,
        tipo: 'sucesso',
      });

      // Abre o modal perguntando se deseja anexar a nota em recebidos
      setModalPerguntaAnexarAberto(true);
    } else {
      // Fornecedor não cadastrado -> preenche os dados extraídos da chave e abre o modal de cadastro
      setForm((prev) => ({
        ...prev,
        chavedeacesso: limpa,
        numero: info.numero || prev.numero,
        cnpj: info.cnpj || prev.cnpj,
        dataEmissao: info.dataEmissao || prev.dataEmissao,
        fornecedor: '', // Deixa em branco para inserção manual
      }));

      setLookupMsg({
        text: `⚠️ CNPJ ${info.cnpj} não cadastrado no banco. Abrindo cadastro de fornecedor...`,
        tipo: 'alerta',
      });

      // Abre modal de cadastro de fornecedor com CNPJ fixo
      setCnpjParaCadastrar(info.cnpjRaw);
      setModalFornecedorAberto(true);
    }
  };

  const handleChaveChange = (e) => {
    const val = e.target.value;
    change('chavedeacesso', val);

    const limpa = limparChave(val);

    // Se já tiver ao menos 20 dígitos, o CNPJ já está presente (dígitos 6 a 20)
    if (limpa.length >= 20 && !form.fornecedor) {
      const cnpjExtraido = limpa.slice(6, 20);
      const padrao = obterPadraoCnpj(cnpjExtraido);
      if (padrao && padrao.nome) {
        setForm((prev) => ({
          ...prev,
          cnpj: prev.cnpj || padrao.cnpj,
          fornecedor: padrao.nome.toUpperCase(),
        }));
      } else {
        obterPadraoCnpjAsync(cnpjExtraido).then((res) => {
          if (res && res.nome) {
            setForm((prev) => ({
              ...prev,
              cnpj: prev.cnpj || res.cnpj,
              fornecedor: res.nome.toUpperCase(),
            }));
          }
        });
      }
    }

    if (limpa.length === 44) {
      processarChaveAcesso(limpa);
    } else if (limpa.length > 0 && limpa.length < 44) {
      setLookupMsg({
        text: `Digitando chave (${limpa.length}/44 dígitos)...`,
        tipo: 'info',
      });
    } else if (limpa.length === 0) {
      setLookupMsg({ text: '', tipo: '' });
    }
  };

  const handleCnpjChange = (e) => {
    const val = e.target.value;
    const limpo = val.replace(/\D+/g, '').slice(0, 14);
    const formatado = formatarCnpj(limpo);

    if (limpo.length === 14) {
      const padrao = obterPadraoCnpj(limpo);
      if (padrao && padrao.nome) {
        setForm((prev) => ({
          ...prev,
          cnpj: formatado,
          fornecedor: padrao.nome.toUpperCase(),
        }));
        setLookupMsg({
          text: `✅ Fornecedor cadastrado "${padrao.nome.toUpperCase()}" reconhecido pelo CNPJ!`,
          tipo: 'sucesso',
        });
        return;
      } else {
        obterPadraoCnpjAsync(limpo).then((res) => {
          if (res && res.nome) {
            setForm((prev) => ({
              ...prev,
              cnpj: formatado,
              fornecedor: res.nome.toUpperCase(),
            }));
            setLookupMsg({
              text: `✅ Fornecedor "${res.nome.toUpperCase()}" localizado no banco de dados!`,
              tipo: 'sucesso',
            });
          }
        });
      }
    }

    setForm((prev) => ({
      ...prev,
      cnpj: limpo.length === 14 ? formatado : val,
    }));
  };

  const handleValorChange = (e) => {
    const formatado = formatarMoedaInput(e.target.value);
    change('valor', formatado);
  };

  const handleFornecedorCadastradoComSucesso = (dadosFornecedor) => {
    const nomeMaiusculo = (dadosFornecedor.nome || '').toUpperCase();
    setForm((prev) => ({
      ...prev,
      fornecedor: nomeMaiusculo,
      cnpj: dadosFornecedor.cnpj || prev.cnpj,
    }));

    setLookupMsg({
      text: `✅ Fornecedor "${nomeMaiusculo}" cadastrado com sucesso e preenchido na nota!`,
      tipo: 'sucesso',
    });

    setModalFornecedorAberto(false);

    // Imediatamente abre o modal perguntando se quer anexar a nota em recebidos
    setModalPerguntaAnexarAberto(true);
  };

  const handleConfirmarPerguntaAnexar = () => {
    setModalPerguntaAnexarAberto(false);
    setModalAnexarDanfeAberto(true);
  };

  const handleSalvarAnexoDanfe = (anexoSalvo) => {
    change('anexoDanfe', anexoSalvo);
    setModalAnexarDanfeAberto(false);
  };

  const submit = (e) => {
    e.preventDefault();

    const fornecedorMaiusculo = form.fornecedor.trim().toUpperCase();

    if (!fornecedorMaiusculo) {
      setLookupMsg({
        text: 'Por favor, informe o Nome do Fornecedor.',
        tipo: 'alerta',
      });
      return;
    }

    const valNumerico = converterMoedaParaNumero(form.valor);
    if (!Number.isFinite(valNumerico) || valNumerico < 0) {
      setLookupMsg({
        text: 'Por favor, informe um valor válido para a nota fiscal.',
        tipo: 'alerta',
      });
      return;
    }

    // Salva o padrão de preenchimento do fornecedor na memória
    const cnpjOuChave = form.cnpj || form.chavedeacesso;
    if (cnpjOuChave) {
      salvarPadraoCnpj(cnpjOuChave, {
        nome: fornecedorMaiusculo,
      });
    }

    const payload = {
      ...form,
      filial: form.filial || filialUsuarioLogado,
      fornecedor: fornecedorMaiusculo,
      valor: valNumerico,
      status: form.status || 'Recebida',
    };

    if (!payload.id) delete payload.id;

    onSave(payload);
    onClose();
  };

  if (!isOpen) return null;

  const chaveLimpa = limparChave(form.chavedeacesso);
  const podeValidarChave = chaveLimpa.length === 44;

  return (
    <>
      <div
        className="modal-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        style={{
          alignItems: 'flex-start',
          paddingTop: '20px',
          paddingBottom: '20px',
          zIndex: 99999,
        }}
      >
        <div
          className="modal-card modal-lg"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '680px',
            width: '95%',
            margin: '0 auto',
            padding: '14px 18px',
            backgroundColor: '#18181c',
            border: '1px solid #2e2e38',
            borderRadius: '12px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
          }}
        >
          {/* Cabeçalho */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', color: '#f8fafc' }}>
              <span>📋</span> {form.id ? 'Editar Nota - Controle de Notas' : 'Inserir Nota - Controle de Notas'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.3rem',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '2px 6px',
              }}
              title="Fechar (ESC)"
            >
              ✕
            </button>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Linha da Chave de Acesso */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc' }}>
                  Chave de Acesso (44 dígitos) / Nº da Nota:
                </label>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {chaveLimpa.length > 0 ? `${chaveLimpa.length}/44 dígitos` : 'Cole ou digite a chave de 44 dígitos'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  style={{
                    flex: 1,
                    height: '34px',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    letterSpacing: '0.5px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: '#111827',
                    color: '#fff',
                    outline: 'none',
                  }}
                  type="text"
                  placeholder="Cole ou digite a chave de 44 dígitos..."
                  value={form.chavedeacesso}
                  onChange={handleChaveChange}
                />
                <button
                  type="button"
                  onClick={() => processarChaveAcesso(form.chavedeacesso)}
                  disabled={!podeValidarChave}
                  style={{
                    height: '34px',
                    padding: '0 12px',
                    background: podeValidarChave ? '#0284c7' : '#334155',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: podeValidarChave ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.2s',
                  }}
                  title="Validar Chave e extrair dados da Nota"
                >
                  🔍 Validar Chave
                </button>
              </div>

              {lookupMsg.text && (
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: '5px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor:
                      lookupMsg.tipo === 'sucesso'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : lookupMsg.tipo === 'alerta'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(56, 189, 248, 0.15)',
                    color:
                      lookupMsg.tipo === 'sucesso'
                        ? '#34d399'
                        : lookupMsg.tipo === 'alerta'
                          ? '#f87171'
                          : '#38bdf8',
                    border: `1px solid ${lookupMsg.tipo === 'sucesso'
                      ? 'rgba(16, 185, 129, 0.3)'
                      : lookupMsg.tipo === 'alerta'
                        ? 'rgba(239, 68, 68, 0.3)'
                        : 'rgba(56, 189, 248, 0.3)'
                      }`,
                  }}
                >
                  {lookupMsg.text}
                </div>
              )}
            </div>

            {/* Linha 1: Fornecedor (60%) e CNPJ (40%) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc' }}>
                    Nome / Razão Social do Fornecedor: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {!form.fornecedor && form.cnpj && (
                    <button
                      type="button"
                      onClick={() => {
                        setCnpjParaCadastrar(extrairCnpjLimpo(form.cnpj || form.chavedeacesso));
                        setModalFornecedorAberto(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      + Cadastrar
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="DIGITE O NOME DO FORNECEDOR..."
                  value={form.fornecedor}
                  onChange={(e) => change('fornecedor', e.target.value.toUpperCase())}
                  required
                  style={{
                    height: '34px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: '#111827',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    textTransform: 'uppercase',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc' }}>
                  CNPJ do Fornecedor:
                </label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={form.cnpj}
                  onChange={handleCnpjChange}
                  style={{
                    height: '34px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: '#111827',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Linha 2: Nº da Nota (30%), Data de Emissão (35%) e Valor Total (35%) */}
            <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr 1.1fr', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc' }}>
                  Nº da Nota Fiscal:
                </label>
                <input
                  type="text"
                  placeholder="Ex: 194640"
                  value={form.numero}
                  onChange={(e) => change('numero', e.target.value)}
                  style={{
                    height: '34px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: '#111827',
                    color: '#fff',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc' }}>
                  Data de Emissão:
                </label>
                <input
                  type="date"
                  value={form.dataEmissao}
                  onChange={(e) => change('dataEmissao', e.target.value)}
                  required
                  style={{
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: '#111827',
                    color: '#fff',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc' }}>
                  Valor da Nota (R$): <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={form.valor}
                  onChange={handleValorChange}
                  required
                  style={{
                    height: '34px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: '#111827',
                    color: '#4ade80',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Linha 3: Data e Hora que foi entregue (50%) e Quem Recebeu (50% - FIXO/TRAVADO) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc' }}>
                  Data e Hora que foi entregue a nota:
                </label>
                <input
                  type="datetime-local"
                  value={form.dataHoraEntrega}
                  onChange={(e) => change('dataHoraEntrega', e.target.value)}
                  required
                  style={{
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: '#111827',
                    color: '#fff',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Campo Quem Recebeu: FIXADO SEM EDIÇÃO com o nome do usuário logado */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>
                    Quem recebeu:
                  </label>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>🔒 Fixado (Usuário Logado)</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={form.quemRecebeu}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #334155',
                      backgroundColor: '#0f172a',
                      color: '#38bdf8',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      outline: 'none',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.75rem',
                      color: '#64748b',
                    }}
                  >
                    👤
                  </span>
                </div>
              </div>
            </div>

            {/* Linha 4: Observações Opcionais */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc' }}>
                Observações / Detalhes da Entrega (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ex: Entregue pelo motorista, canhoto assinado, caixa 02..."
                value={form.observacoes}
                onChange={(e) => change('observacoes', e.target.value)}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  backgroundColor: '#111827',
                  color: '#fff',
                  fontSize: '0.8rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Linha 5: Anexo da DANFE / Nota Fiscal */}
            <div
              style={{
                backgroundColor: form.anexoDanfe ? 'rgba(16, 185, 129, 0.08)' : '#0f172a',
                border: `1px solid ${form.anexoDanfe ? 'rgba(16, 185, 129, 0.4)' : '#1e293b'}`,
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>{form.anexoDanfe ? '📄' : '📎'}</span>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: form.anexoDanfe ? '#34d399' : '#cbd5e1' }}>
                    {form.anexoDanfe ? `DANFE Anexada: ${form.anexoDanfe.nome}` : 'Nenhuma DANFE anexada a esta nota'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {form.anexoDanfe
                      ? `${(form.anexoDanfe.tamanho ? (form.anexoDanfe.tamanho / 1024).toFixed(1) + ' KB • ' : '')}Pronta para arquivamento e protocolo`
                      : 'Você pode consultar e baixar a DANFE no site fsist.com.br'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {form.anexoDanfe ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (form.anexoDanfe.dataUrl) {
                          const win = window.open();
                          if (win) {
                            win.document.write(
                              `<iframe src="${form.anexoDanfe.dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                            );
                          }
                        }
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#1e293b',
                        color: '#38bdf8',
                        border: '1px solid #0284c7',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title="Visualizar arquivo anexado"
                    >
                      👁️ Ver
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalAnexarDanfeAberto(true)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#1e293b',
                        color: '#f59e0b',
                        border: '1px solid #d97706',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Substituir arquivo anexo"
                    >
                      🔄 Trocar
                    </button>

                    <button
                      type="button"
                      onClick={() => change('anexoDanfe', null)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Remover anexo"
                    >
                      🗑️
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setModalPerguntaAnexarAberto(true)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid #0284c7',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>📎</span> Anexar DANFE (FSIST)
                  </button>
                )}
              </div>
            </div>

            {/* Rodapé com Botões de Ação */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                type="submit"
                style={{
                  height: '36px',
                  padding: '0 18px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.15s',
                }}
              >
                💾 Salvar Nota
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  background: '#27272a',
                  color: '#e4e4e7',
                  border: '1px solid #3f3f46',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal Subsequente 1: Cadastrar Fornecedor quando Chave CNPJ for Inédita */}
      <ModalCadastrarFornecedor
        isOpen={modalFornecedorAberto}
        onClose={() => setModalFornecedorAberto(false)}
        onSave={handleFornecedorCadastradoComSucesso}
        cnpj={cnpjParaCadastrar}
      />

      {/* Modal Subsequente 2: Perguntar se quer anexar nota em recebidos */}
      <ModalPerguntaAnexarDanfe
        isOpen={modalPerguntaAnexarAberto}
        onClose={() => setModalPerguntaAnexarAberto(false)}
        onConfirm={handleConfirmarPerguntaAnexar}
        chaveAcesso={form.chavedeacesso}
        fornecedor={form.fornecedor}
        numero={form.numero}
      />

      {/* Modal Subsequente 3: Anexar o arquivo da DANFE */}
      <ModalAnexarDanfe
        isOpen={modalAnexarDanfeAberto}
        onClose={() => setModalAnexarDanfeAberto(false)}
        onSaveAnexo={handleSalvarAnexoDanfe}
        chaveAcesso={form.chavedeacesso}
        fornecedor={form.fornecedor}
        numero={form.numero}
        anexoAtual={form.anexoDanfe}
      />
    </>
  );
}
