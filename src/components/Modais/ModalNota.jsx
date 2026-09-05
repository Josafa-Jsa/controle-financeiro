import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatarMoedaInput, converterMoedaParaNumero } from '../../utils/numberUtils';
import { decodificarChaveNFe, gerarDanfePDF } from '../../utils/gerarDanfePDF';
import { consultarDadosChaveNFe, formatarChaveBlocos, limparChave } from '../../services/consultaNFeService';
import { obterPadraoCnpj, obterPadraoCnpjAsync, salvarPadraoCnpj, formatarCnpj, extrairCnpjLimpo } from '../../services/memoriaCnpjService';
import { parseNFeXml } from '../../utils/xmlNfeParser';
import { getUser } from '../../auth/auth';
import '../Visual/modal.css';

export default function ModalNota({
  isOpen = false,
  onClose = () => { },
  onSave = () => { },
  notaParaEditar = null,
  onOpenDanfe = null,
}) {
  const curUser = getUser() || {};
  const userFilial = curUser.filial || curUser.user_filial || localStorage.getItem('usuario_filial') || 'Filial 1';

  const base = useMemo(
    () => ({
      id: undefined,
      filial: userFilial,
      tipo: 'NFe',
      tipoConta: 'Receber', // 'Receber' ou 'Pagar'
      chavedeacesso: '',
      numero: '',
      clienteOuServico: '',
      cnpj: '',
      dataEmissao: new Date().toISOString().slice(0, 10),
      produtoRelacionado: '',
      valor: '',
      status: 'Adicionada',
      itens: null,
      naturezaOperacao: '',
      emitente: null,
      destinatario: null,
    }),
    [userFilial]
  );

  const [form, setForm] = useState(base);
  const [consultando, setConsultando] = useState(false);
  const [lookupMsg, setLookupMsg] = useState({ text: '', tipo: '' });
  const [arrastandoXml, setArrastandoXml] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      let formInicial = base;

      if (notaParaEditar) {
        formInicial = {
          id: notaParaEditar.id,
          filial: notaParaEditar.filial || userFilial,
          numero: notaParaEditar.numero || '',
          tipo: notaParaEditar.tipo || 'NFe',
          tipoConta: notaParaEditar.tipoConta || 'Receber',
          chavedeacesso: notaParaEditar.chavedeacesso || '',
          clienteOuServico: notaParaEditar.clienteOuServico || notaParaEditar.origem || '',
          cnpj: notaParaEditar.cnpj || '',
          dataEmissao:
            notaParaEditar.dataEmissao ||
            new Date().toISOString().slice(0, 10),
          produtoRelacionado:
            notaParaEditar.produtoRelacionado ||
            notaParaEditar.produto_relacionado ||
            notaParaEditar.produto ||
            '',
          valor:
            notaParaEditar.valor !== undefined &&
              notaParaEditar.valor !== null &&
              notaParaEditar.valor !== ''
              ? formatarMoedaInput(
                Math.round(Number(notaParaEditar.valor) * 100)
              )
              : '',
          status: notaParaEditar.status || 'Adicionada',
          itens: notaParaEditar.itens || null,
          naturezaOperacao: notaParaEditar.naturezaOperacao || '',
          emitente: notaParaEditar.emitente || null,
          destinatario: notaParaEditar.destinatario || null,
        };
      }

      // Aplica padrão de CNPJ memorizado se disponível e campos estiverem vazios ou padrão
      const chaveOuCnpj = formInicial.chavedeacesso || formInicial.cnpj;
      if (chaveOuCnpj) {
        const padrao = obterPadraoCnpj(chaveOuCnpj);
        if (padrao) {
          if (!formInicial.clienteOuServico || formInicial.clienteOuServico.startsWith('EMITENTE CNPJ') || formInicial.clienteOuServico === 'Emitente') {
            formInicial.clienteOuServico = padrao.nome;
          }
          if (!formInicial.produtoRelacionado) {
            formInicial.produtoRelacionado = padrao.produtoRelacionado;
          }
          if (!formInicial.cnpj) {
            formInicial.cnpj = padrao.cnpj;
          }
          if (!notaParaEditar?.tipoConta && padrao.tipoConta) {
            formInicial.tipoConta = padrao.tipoConta;
          }
        } else {
          obterPadraoCnpjAsync(chaveOuCnpj).then((p) => {
            if (p) {
              setForm((prev) => ({
                ...prev,
                clienteOuServico:
                  !prev.clienteOuServico || prev.clienteOuServico.startsWith('EMITENTE CNPJ') || prev.clienteOuServico === 'Emitente'
                    ? p.nome
                    : prev.clienteOuServico,
                produtoRelacionado: prev.produtoRelacionado || p.produtoRelacionado || '',
                cnpj: prev.cnpj || p.cnpj || '',
                tipoConta: !notaParaEditar?.tipoConta && p.tipoConta ? p.tipoConta : prev.tipoConta,
              }));
            }
          }).catch(() => {});
        }
      }

      setForm(formInicial);
      setLookupMsg({ text: '', tipo: '' });
      setConsultando(false);
    }
  }, [isOpen, notaParaEditar, base]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  /**
   * Processa o arquivo XML importado
   */
  const processarArquivoXml = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xml') && file.type !== 'text/xml') {
      setLookupMsg({
        text: 'Por favor, selecione um arquivo válido no formato XML (.xml).',
        tipo: 'alerta',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlText = e.target.result;
        const dados = parseNFeXml(xmlText);
        const padrao = obterPadraoCnpj(dados.cnpj || dados.chavedeacesso);

        const nomeFinal = padrao?.nome || dados.clienteOuServico || '';
        const produtoFinal = padrao?.produtoRelacionado || dados.produtoRelacionado || '';
        const tipoContaFinal = padrao?.tipoConta || dados.tipoConta || 'Receber';

        setForm((prev) => ({
          ...prev,
          chavedeacesso: dados.chavedeacesso || prev.chavedeacesso,
          numero: dados.numero || prev.numero,
          tipo: dados.tipo || prev.tipo || 'NFe',
          tipoConta: tipoContaFinal,
          dataEmissao: dados.dataEmissao || prev.dataEmissao,
          clienteOuServico: nomeFinal || prev.clienteOuServico,
          cnpj: formatarCnpj(dados.cnpj) || prev.cnpj,
          produtoRelacionado: produtoFinal || prev.produtoRelacionado,
          naturezaOperacao: dados.naturezaOperacao || prev.naturezaOperacao,
          itens: dados.itens || prev.itens,
          emitente: dados.emitente || prev.emitente,
          destinatario: dados.destinatario || prev.destinatario,
          valor:
            dados.valor > 0
              ? formatarMoedaInput(Math.round(Number(dados.valor) * 100))
              : prev.valor,
        }));

        setLookupMsg({
          text: padrao
            ? `✅ XML da NF-e #${dados.numero} importado com padrão memorizado para "${padrao.nome}"!`
            : `✅ XML da NF-e #${dados.numero} importado! Dados, itens e DANFE preenchidos (Conta a ${tipoContaFinal === 'Pagar' ? 'PAGAR' : 'RECEBER'}).`,
          tipo: 'sucesso',
        });
      } catch (err) {
        console.error('Erro ao processar XML da NF-e:', err);
        setLookupMsg({
          text: `⚠️ Falha ao ler XML: ${err.message || 'Arquivo XML inválido.'}`,
          tipo: 'alerta',
        });
      }
    };
    reader.readAsText(file);
  };

  /**
   * Executa a consulta no portal Meu DANFE / Base Nacional
   */
  const executarConsultaChave = async (chaveParaConsultar) => {
    const limpa = limparChave(chaveParaConsultar);
    if (limpa.length !== 44) {
      setLookupMsg({
        text: 'A chave deve conter exatamente 44 dígitos numéricos.',
        tipo: 'alerta',
      });
      return;
    }

    setConsultando(true);
    setLookupMsg({
      text: '🔍 Validando chave e verificando padrão do CNPJ...',
      tipo: 'info',
    });

    try {
      const res = await consultarDadosChaveNFe(limpa);

      if (res && res.sucesso) {
        setForm((prev) => ({
          ...prev,
          chavedeacesso: limpa,
          numero: prev.numero || res.numero || '',
          clienteOuServico: res.nome || prev.clienteOuServico || '',
          cnpj: res.cnpj || prev.cnpj || '',
          dataEmissao: res.dataEmissao || prev.dataEmissao || '',
          produtoRelacionado: res.produtoRelacionado || prev.produtoRelacionado || '',
          tipo: res.tipo || prev.tipo || 'NFe',
          tipoConta: res.tipoConta || prev.tipoConta || 'Receber',
          valor:
            res.valor != null && res.valor > 0
              ? formatarMoedaInput(Math.round(Number(res.valor) * 100))
              : prev.valor || '',
        }));

        setLookupMsg({
          text: res.padraoMemorizado
            ? `✅ Chave validada! Padrão memorizado para "${res.nome}" aplicado. (Campos editáveis)`
            : `✅ Chave validada no portal Meu DANFE! Dados de "${res.nome}" preenchidos. (Campos editáveis)`,
          tipo: 'sucesso',
        });
      }
    } catch (err) {
      console.warn('[ModalNota] Falha ao consultar Meu DANFE:', err);
      const cnpjExtraido = limpa.slice(6, 20);
      const padrao = obterPadraoCnpj(cnpjExtraido);
      const info = decodificarChaveNFe(limpa);

      if (padrao || info) {
        setForm((prev) => ({
          ...prev,
          chavedeacesso: limpa,
          numero: prev.numero || info?.numero || '',
          cnpj: prev.cnpj || padrao?.cnpj || info?.cnpj || '',
          dataEmissao: prev.dataEmissao || info?.dataEmissao || '',
          clienteOuServico: padrao?.nome || prev.clienteOuServico || `Emitente ${info?.cnpj || cnpjExtraido}`,
          produtoRelacionado: padrao?.produtoRelacionado || prev.produtoRelacionado || '',
          tipoConta: padrao?.tipoConta || prev.tipoConta || 'Receber',
        }));
        setLookupMsg({
          text: padrao
            ? `✅ Padrão memorizado para "${padrao.nome}" aplicado!`
            : `ℹ️ Chave decodificada: NF #${info?.numero} (Série ${info?.serie} - ${info?.uf}). Preencha os campos restantes.`,
          tipo: padrao ? 'sucesso' : 'info',
        });
      } else {
        setLookupMsg({
          text: `⚠️ Não foi possível obter dados automáticos (${err.message || 'Erro na consulta'}). Preencha manualmente.`,
          tipo: 'alerta',
        });
      }
    } finally {
      setConsultando(false);
    }
  };

  const handleChaveChange = (e) => {
    const val = e.target.value;
    change('chavedeacesso', val);

    const limpa = limparChave(val);

    // Se já tiver ao menos 20 dígitos, o CNPJ já está presente (dígitos 6 a 20)
    if (limpa.length >= 20) {
      const cnpjExtraido = limpa.slice(6, 20);
      const padrao = obterPadraoCnpj(cnpjExtraido);
      if (padrao) {
        setForm((prev) => ({
          ...prev,
          cnpj: prev.cnpj || padrao.cnpj,
          clienteOuServico:
            prev.clienteOuServico && !prev.clienteOuServico.startsWith('EMITENTE')
              ? prev.clienteOuServico
              : (padrao.nome || prev.clienteOuServico),
          produtoRelacionado: prev.produtoRelacionado || padrao.produtoRelacionado || '',
          tipoConta: padrao.tipoConta || prev.tipoConta,
        }));
      } else {
        obterPadraoCnpjAsync(cnpjExtraido).then((res) => {
          if (res) {
            setForm((prev) => ({
              ...prev,
              cnpj: prev.cnpj || res.cnpj,
              clienteOuServico:
                prev.clienteOuServico && !prev.clienteOuServico.startsWith('EMITENTE')
                  ? prev.clienteOuServico
                  : (res.nome || prev.clienteOuServico),
              produtoRelacionado: prev.produtoRelacionado || res.produtoRelacionado || '',
              tipoConta: res.tipoConta || prev.tipoConta,
            }));
          }
        }).catch(() => {});
      }
    }

    if (limpa.length === 44 && !consultando) {
      executarConsultaChave(limpa);
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
    change('cnpj', val);

    const cnpjLimpo = extrairCnpjLimpo(val);
    if (cnpjLimpo.length === 14) {
      const padrao = obterPadraoCnpj(cnpjLimpo);
      if (padrao) {
        setForm((prev) => ({
          ...prev,
          cnpj: formatarCnpj(cnpjLimpo),
          clienteOuServico:
            prev.clienteOuServico && !prev.clienteOuServico.startsWith('EMITENTE')
              ? prev.clienteOuServico
              : (padrao.nome || prev.clienteOuServico),
          produtoRelacionado: prev.produtoRelacionado || padrao.produtoRelacionado || '',
          tipoConta: padrao.tipoConta || prev.tipoConta,
        }));
        setLookupMsg({
          text: `✨ Padrão memorizado para "${padrao.nome}" (CNPJ ${padrao.cnpj}) carregado!`,
          tipo: 'sucesso',
        });
      } else {
        obterPadraoCnpjAsync(cnpjLimpo).then((res) => {
          if (res) {
            setForm((prev) => ({
              ...prev,
              cnpj: formatarCnpj(cnpjLimpo),
              clienteOuServico:
                prev.clienteOuServico && !prev.clienteOuServico.startsWith('EMITENTE')
                  ? prev.clienteOuServico
                  : (res.nome || prev.clienteOuServico),
              produtoRelacionado: prev.produtoRelacionado || res.produtoRelacionado || '',
              tipoConta: res.tipoConta || prev.tipoConta,
            }));
            setLookupMsg({
              text: `✨ Fornecedor "${res.nome}" carregado do banco de dados!`,
              tipo: 'sucesso',
            });
          }
        }).catch(() => {});
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
    if (!Number.isFinite(val) || val < 0) return;

    // Salva ou atualiza permanentemente a memória de padrão para este CNPJ
    if (form.cnpj || form.chavedeacesso) {
      salvarPadraoCnpj(form.cnpj || form.chavedeacesso, {
        nome: form.clienteOuServico,
        produtoRelacionado: form.produtoRelacionado,
        tipoConta: form.tipoConta || 'Receber',
        tipo: form.tipo || 'NFe',
      });
    }

    const payload = {
      ...form,
      filial: form.filial || userFilial,
      origem: form.clienteOuServico,
      valor: val,
      tipoConta: form.tipoConta || 'Receber',
      status: form.status || 'Adicionada',
    };

    if (!payload.id) delete payload.id;

    onSave(payload);
  };

  if (!isOpen) return null;


  const chaveLimpa = limparChave(form.chavedeacesso);
  const podeConsultar = chaveLimpa.length === 44 && !consultando;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        alignItems: 'flex-start',
        paddingTop: '16px',
        paddingBottom: '16px',
        zIndex: 99999,
      }}
    >
      <div
        className="modal-card modal-lg"
        onClick={(e) => e.stopPropagation()}
        aria-label={form.id ? 'Editar Nota Fiscal' : 'Inserir Nota Fiscal'}
        style={{
          maxWidth: '720px',
          width: '95%',
          margin: '0 auto',
          padding: '12px 18px',
          backgroundColor: '#18181c',
          border: '1px solid #2e2e38',
          borderRadius: '12px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'visible',
        }}
      >
        {/* Cabeçalho Compacto */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', color: '#f8fafc' }}>
            <span>📄</span> {form.id ? 'Editar Nota Fiscal' : 'Inserir Nota Fiscal'}
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

        {/* Faixa Superior: Importar XML + Seletor Receber/Pagar Lado a Lado */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
          {/* Zona Compacta de XML */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastandoXml(true);
            }}
            onDragLeave={() => setArrastandoXml(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastandoXml(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processarArquivoXml(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `1.5px dashed ${arrastandoXml ? '#38bdf8' : '#3b82f6'}`,
              borderRadius: '8px',
              backgroundColor: arrastandoXml ? 'rgba(56, 189, 248, 0.15)' : 'rgba(37, 99, 235, 0.08)',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minHeight: '36px',
              boxSizing: 'border-box',
            }}
            title="Clique ou arraste um arquivo XML de NF-e para preenchimento instantâneo"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,text/xml"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processarArquivoXml(e.target.files[0]);
                }
              }}
            />
            <span style={{ fontSize: '15px' }}>📥</span>
            <span style={{ color: '#60a5fa', fontSize: '0.8rem', fontWeight: 700 }}>
              Importar XML (.xml)
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>• Preenche itens/DANFE</span>
          </div>

          {/* Seletor Segmentado Receber / Pagar */}
          <div style={{ display: 'flex', gap: '6px', minHeight: '36px' }}>
            <button
              type="button"
              onClick={() => change('tipoConta', 'Receber')}
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: '8px',
                border: `1.5px solid ${form.tipoConta === 'Receber' ? '#10b981' : '#27272a'}`,
                backgroundColor: form.tipoConta === 'Receber' ? 'rgba(16, 185, 129, 0.2)' : '#18181b',
                color: form.tipoConta === 'Receber' ? '#34d399' : '#a1a1aa',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              <span>🟢</span> A RECEBER
            </button>

            <button
              type="button"
              onClick={() => change('tipoConta', 'Pagar')}
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: '8px',
                border: `1.5px solid ${form.tipoConta === 'Pagar' ? '#ef4444' : '#27272a'}`,
                backgroundColor: form.tipoConta === 'Pagar' ? 'rgba(239, 68, 68, 0.2)' : '#18181b',
                color: form.tipoConta === 'Pagar' ? '#f87171' : '#a1a1aa',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              <span>🔴</span> A PAGAR
            </button>
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {/* Chave de Acesso e Botão Validar Meu DANFE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc' }}>
                Chave de Acesso (44 dígitos) / Nº da Nota:
              </label>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {chaveLimpa.length > 0 ? `${chaveLimpa.length}/44 dígitos` : 'Cole ou digite a chave'}
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
                placeholder="Cole a chave de 44 dígitos ou digite o número..."
                value={form.chavedeacesso}
                onChange={handleChaveChange}
                disabled={consultando}
              />
              <button
                type="button"
                onClick={() => executarConsultaChave(form.chavedeacesso)}
                disabled={!podeConsultar}
                style={{
                  height: '34px',
                  padding: '0 12px',
                  background: podeConsultar ? '#0284c7' : '#334155',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: podeConsultar ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s',
                }}
                title="Consultar e validar dados no portal Meu DANFE / Base Nacional"
              >
                {consultando ? '🔄 Validando...' : '🔍 Validar NOTA'}
              </button>
            </div>

            {lookupMsg.text && (
              <div
                style={{
                  padding: '3px 8px',
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

          {/* Linha 1: Nome / Razão Social (60%) e CNPJ (40%) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc' }}>
                Nome / Razão Social / Emitente:
              </label>
              <input
                type="text"
                placeholder="Ex: AUTO POSTO TROPICAL LTDA..."
                value={form.clienteOuServico}
                onChange={(e) => change('clienteOuServico', e.target.value.toUpperCase())}
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
                CNPJ do Emitente / Fornecedor:
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

          {/* Linha 2: Produto Relacionado (60%) e Tipo de Nota (40%) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc' }}>
                Produto / Serviço Relacionado:
              </label>
              <input
                type="text"
                placeholder="Ex: Combustíveis e Lubrificantes, Peças, TI..."
                value={form.produtoRelacionado}
                onChange={(e) => change('produtoRelacionado', e.target.value)}
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
                Tipo de Documento:
              </label>
              <select
                value={form.tipo}
                onChange={(e) => change('tipo', e.target.value)}
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
              >
                <option value="NFe">NF-e (Mod. 55)</option>
                <option value="NFCe">NFC-e (Mod. 65)</option>
                <option value="CTe">CT-e (Mod. 57)</option>
                <option value="NFSe">NFS-e (Serviço)</option>
              </select>
            </div>
          </div>

          {/* Linha 3: Número da NF (30%), Data de Emissão (35%) e Valor Total (35%) */}
          <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr 1.1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc' }}>
                Nº da Nota Fiscal:
              </label>
              <input
                type="text"
                placeholder="Ex: 123456"
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
                Valor Total (R$):
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

          {/* Rodapé com Botões de Ação */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={consultando}
              style={{
                height: '36px',
                padding: '0 16px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: consultando ? 'not-allowed' : 'pointer',
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
              onClick={() => {
                const dadosCompletos = {
                  ...form,
                  origem: form.clienteOuServico,
                  valor: converterMoedaParaNumero(form.valor) || 0,
                };
                if (onOpenDanfe) {
                  onOpenDanfe(dadosCompletos);
                } else {
                  gerarDanfePDF(dadosCompletos);
                }
              }}
              style={{
                height: '36px',
                padding: '0 14px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s',
              }}
              title="Visualizar e imprimir Nota Fiscal em modal do sistema com todas as informações validadas"
            >
              🖨️ Imprimir NOTA
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={consultando}
              style={{
                height: '36px',
                padding: '0 14px',
                background: '#27272a',
                color: '#e4e4e7',
                border: '1px solid #3f3f46',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: consultando ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}