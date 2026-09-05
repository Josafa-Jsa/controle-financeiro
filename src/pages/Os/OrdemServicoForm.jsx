// src/pages/Os/OrdemServicoForm.jsx
import React, { useState } from 'react';
import ModalSecao from '../../components/Modais/ModalSecao';
import ModalClienteOS from '../../components/Modais/ModalClienteOS';
import ModalProdutoOS from '../../components/Modais/ModalProdutoOS';
import ModalServicosOS from '../../components/Modais/ModalServicosOS';
import ModalCustosPagamentoOS from '../../components/Modais/ModalCustosPagamentoOS';
import ModalFiltroOS from '../../components/Modais/ModalFiltroOS';
import ModalSelecionarTermo from '../../components/Modais/ModalSelecionarTermo';
import { MODELOS_TERMOS } from '../../data/termosCondicoes';
import { toast } from 'react-toastify';
import { logEvent } from '../../utils/logger';
import { sendTelegramEvent } from '../../utils/telegram';
import { salvarContrato } from '../../services/contratosService';
import { salvarClienteNaBase } from '../../services/clientesService';
import { salvarEquipamentoNaBase } from '../../services/produtosOSService';
import { gerarContratoDaOS } from '../../utils/gerarContratoOS';
import { gerarContratoPDF } from '../../utils/gerarContratoPDF';
import '../../components/Visual/OrdemServicoForm.css';

const OrdemServicoForm = ({ onSalvar = () => { }, ordens = [] }) => {
  const [modal, setModal] = useState(null);
  const [modalFiltroAberto, setModalFiltroAberto] = useState(false);
  const [modalTermoAberto, setModalTermoAberto] = useState(false);
  const [acaoAoConfirmarTermo, setAcaoAoConfirmarTermo] = useState('salvar');
  const [dados, setDados] = useState({
    cliente: {},
    equipamento: {},
    servicos: '',
    pecas: '',
    custos: '',
    prazoInicio: '',
    prazoFim: '',
    formaPagamento: '',
    valorPagamento: '',
    tecnico: '',
    tipoTermo: 'conscientizacao',
    tituloTermo: 'Declaração de Conscientização / Testes',
    termoCondicoes: MODELOS_TERMOS[0].texto,
    numeroOS: 'OS-' + Date.now(),
  });

  const abrirModal = (secao) => setModal(secao);
  const fecharModal = () => setModal(null);

  const handleSelectCliente = (clienteEncontrado, equipamentoEncontrado) => {
    setDados((prev) => ({
      ...prev,
      cliente: {
        nome: clienteEncontrado?.nome || '',
        documento: clienteEncontrado?.documento || '',
        telefone: clienteEncontrado?.telefone || '',
        endereco: clienteEncontrado?.endereco || '',
        email: clienteEncontrado?.email || '',
      },
      equipamento: equipamentoEncontrado ? {
        ...prev.equipamento,
        marca: equipamentoEncontrado.marca || prev.equipamento.marca || '',
        modelo: equipamentoEncontrado.modelo || prev.equipamento.modelo || '',
        serie: equipamentoEncontrado.serie || prev.equipamento.serie || '',
        problema: equipamentoEncontrado.problema || prev.equipamento.problema || '',
      } : prev.equipamento,
    }));
  };

  const osLinhas = (os) => [
    `Número: ${os.numeroOS || '-'}`,
    `Cliente: ${os.cliente?.nome || '-'}`,
    `Telefone: ${os.cliente?.telefone || '-'}`,
    `Equipamento: ${[os.equipamento?.marca, os.equipamento?.modelo]
      .filter(Boolean)
      .join(' ') || '-'
    }`,
    `Série: ${os.equipamento?.serie || '-'}`,
    `Problema: ${os.equipamento?.problema || '-'}`,
    `Serviços: ${os.servicos || '-'}`,
    `Peças: ${os.pecas || '-'}`,
    `Custos: ${os.custos || 'R$ 0,00'}`,
    `Prazos: ${os.prazoInicio || '-'} → ${os.prazoFim || '-'}`,
    `Forma de Pagamento: ${os.formaPagamento || '-'}`,
    `Valor do Pagamento: ${os.valorPagamento || 'R$ 0,00'}`,
    `Técnico: ${os.tecnico || '-'}`,
    `Garantia / Termo: ${os.tituloTermo || 'Padrão'}`,
  ];

  const notificarTelegram = async (os, textoAlternativo) => {
    try {
      await sendTelegramEvent({
        title: textoAlternativo ? 'Ordem de Serviço' : 'Nova Ordem de Serviço',
        emoji: '🛠️',
        lines: textoAlternativo
          ? [textoAlternativo, ...osLinhas(os)]
          : osLinhas(os),
      });

      logEvent({
        type: 'os',
        title: 'OS notificada no Telegram',
        details: {
          numeroOS: os.numeroOS,
          cliente: os.cliente?.nome || '',
          tecnico: os.tecnico || '',
        },
      });

      toast.info(`Notificação enviada no Telegram (${os.numeroOS || 'OS'}).`);
    } catch (err) {
      console.error('[TG] Falha ao notificar:', err);
      toast.warn('OS salva, mas não foi possível notificar no Telegram.');
    }
  };

  const salvarOS = () => {
    // Ao clicar em Salvar, abre o modal para selecionar o termo desejado
    setAcaoAoConfirmarTermo('salvar');
    setModalTermoAberto(true);
  };

  const handleConfirmarTermo = async (modeloEscolhido) => {
    const dadosAtualizados = {
      ...dados,
      tipoTermo: modeloEscolhido.id,
      tituloTermo: modeloEscolhido.titulo,
      termoCondicoes: modeloEscolhido.texto,
    };
    setDados(dadosAtualizados);
    setModalTermoAberto(false);

    if (acaoAoConfirmarTermo === 'salvar') {
      await executarSalvarOS(dadosAtualizados);
    } else {
      toast.success(`Termo "${modeloEscolhido.titulo}" selecionado.`);
    }
  };

  const executarSalvarOS = async (dadosParaSalvar) => {
    try {
      // Salva na base de clientes permanente para reutilização futura
      if (dadosParaSalvar.cliente?.nome || dadosParaSalvar.cliente?.documento) {
        salvarClienteNaBase(dadosParaSalvar.cliente);
      }

      // Salva na base de equipamentos/produtos para reutilização futura
      if (dadosParaSalvar.equipamento?.marca || dadosParaSalvar.equipamento?.modelo || dadosParaSalvar.equipamento?.serie) {
        salvarEquipamentoNaBase(dadosParaSalvar.equipamento);
      }

      onSalvar(dadosParaSalvar);

      const contrato = gerarContratoDaOS(dadosParaSalvar);
      salvarContrato(contrato);

      logEvent({
        type: 'contratos',
        title: 'Contrato gerado automaticamente pela OS',
        details: {
          numeroOS: dadosParaSalvar.numeroOS,
          cliente: dadosParaSalvar.cliente?.nome,
        },
      });

      toast.success('Ordem de Serviço salva com termo vinculado e contrato gerado.');
      await notificarTelegram(dadosParaSalvar);

      setDados({
        cliente: {},
        equipamento: {},
        servicos: '',
        pecas: '',
        custos: '',
        prazoInicio: '',
        prazoFim: '',
        formaPagamento: '',
        valorPagamento: '',
        tecnico: '',
        tipoTermo: 'conscientizacao',
        tituloTermo: 'Declaração de Conscientização / Testes',
        termoCondicoes: MODELOS_TERMOS[0].texto,
        numeroOS: 'OS-' + Date.now(),
      });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar Ordem de Serviço.');
    }
  };

  const visualizarContrato = () => {
    if (!dados.cliente?.nome) {
      toast.warn('Preencha os dados do cliente primeiro.');
      return;
    }
    gerarContratoPDF(dados);
  };

  const testarTelegram = async () => {
    const teste = { ...dados, numeroOS: 'JSA-' + Date.now() };
    await sendTelegramEvent({
      title: 'Teste de notificação',
      emoji: '✅',
      lines: [
        'JSA, Soluções Tecnológicas — teste realizado com sucesso.',
        ...osLinhas(teste),
      ],
    });
    logEvent({
      type: 'os',
      title: 'Teste Telegram (OS)',
      details: { numeroOS: teste.numeroOS },
    });
  };

  return (
    <div className="os-form-container">
      <div className="os-form-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h2 className="os-title">
            <span>🛠️</span> Nova Ordem de Serviço
          </h2>
          <span className="os-badge-numero">
            {dados.numeroOS}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setModalFiltroAberto(true)}
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)',
            transition: 'transform 0.2s',
          }}
          title="Pesquisar por Nome, CPF, Telefone ou Nº da O.S."
        >
          <span>🔍</span> Buscar Cliente / O.S.
        </button>
      </div>

      {/* Grid Simplificado com 5 Botões */}
      <div className="botoes-grid">
        {/* 1. Cadastrar Cliente */}
        <button
          type="button"
          className={`btn-secao ${dados.cliente?.nome ? 'filled' : ''}`}
          onClick={() => abrirModal('cliente')}
        >
          <div className="btn-secao-left">
            <span className="btn-secao-icon">👤</span>
            <div className="btn-secao-text">
              <span className="btn-secao-name">Cadastrar Cliente</span>
              <span className="btn-secao-hint">
                {dados.cliente?.nome || 'Nome, CPF, telefone...'}
              </span>
            </div>
          </div>
          <span className={`btn-secao-tag ${dados.cliente?.nome ? 'done' : 'pending'}`}>
            {dados.cliente?.nome ? '✓ Ok' : ''}
          </span>
        </button>

        {/* 2. Cadastrar Produto */}
        <button
          type="button"
          className={`btn-secao ${dados.equipamento?.marca || dados.equipamento?.modelo || dados.equipamento?.serie ? 'filled' : ''}`}
          onClick={() => abrirModal('produto')}
        >
          <div className="btn-secao-left">
            <span className="btn-secao-icon">📦</span>
            <div className="btn-secao-text">
              <span className="btn-secao-name">Cadastrar Produto</span>
              <span className="btn-secao-hint">
                {[dados.equipamento?.marca, dados.equipamento?.modelo].filter(Boolean).join(' ') || dados.equipamento?.serie || 'Série, marca, modelo...'}
              </span>
            </div>
          </div>
          <span className={`btn-secao-tag ${dados.equipamento?.marca || dados.equipamento?.modelo || dados.equipamento?.serie ? 'done' : 'pending'}`}>
            {dados.equipamento?.marca || dados.equipamento?.modelo || dados.equipamento?.serie ? '✓ Ok' : ''}
          </span>
        </button>

        {/* 3. Serviços (Serviços + Peças e Materiais) */}
        <button
          type="button"
          className={`btn-secao ${dados.servicos || dados.pecas ? 'filled' : ''}`}
          onClick={() => abrirModal('servicos')}
        >
          <div className="btn-secao-left">
            <span className="btn-secao-icon">🛠️</span>
            <div className="btn-secao-text">
              <span className="btn-secao-name">Serviços</span>
              <span className="btn-secao-hint">
                {dados.servicos || dados.pecas ? 'Serviços e peças preenchidos' : 'Serviços, peças e materiais'}
              </span>
            </div>
          </div>
          <span className={`btn-secao-tag ${dados.servicos || dados.pecas ? 'done' : 'pending'}`}>
            {dados.servicos || dados.pecas ? '✓ Ok' : ''}
          </span>
        </button>

        {/* 4. Custos / Pagamento (Custos + Pagamento + Prazos) */}
        <button
          type="button"
          className={`btn-secao ${dados.custos || dados.valorPagamento || dados.prazoInicio || dados.prazoFim ? 'filled' : ''}`}
          onClick={() => abrirModal('custos_pagamento')}
        >
          <div className="btn-secao-left">
            <span className="btn-secao-icon">💰</span>
            <div className="btn-secao-text">
              <span className="btn-secao-name">Custos / Pagamento</span>
              <span className="btn-secao-hint">
                {dados.custos || dados.valorPagamento ? `${dados.custos || ''} | ${dados.formaPagamento || 'Pgto'}` : 'Custos, forma, valor e prazos'}
              </span>
            </div>
          </div>
          <span className={`btn-secao-tag ${dados.custos || dados.valorPagamento || dados.prazoInicio || dados.prazoFim ? 'done' : 'pending'}`}>
            {dados.custos || dados.valorPagamento ? '✓ ' + (dados.custos || dados.valorPagamento) : (dados.prazoInicio ? '✓ Prazos' : '')}
          </span>
        </button>

        {/* 5. Técnico Responsável */}
        <button
          type="button"
          className={`btn-secao ${dados.tecnico ? 'filled' : ''}`}
          onClick={() => abrirModal('tecnico')}
        >
          <div className="btn-secao-left">
            <span className="btn-secao-icon">👨‍💻</span>
            <div className="btn-secao-text">
              <span className="btn-secao-name">Técnico</span>
              <span className="btn-secao-hint">
                {dados.tecnico || 'Técnico responsável'}
              </span>
            </div>
          </div>
          <span className={`btn-secao-tag ${dados.tecnico ? 'done' : 'pending'}`}>
            {dados.tecnico ? '✓ Ok' : ''}
          </span>
        </button>

        {/* 6. Termo de Garantia / Condições */}
        <button
          type="button"
          className={`btn-secao ${dados.tipoTermo ? 'filled' : ''}`}
          onClick={() => {
            setAcaoAoConfirmarTermo('selecionar');
            setModalTermoAberto(true);
          }}
          title="Clique para selecionar o termo de garantia ou conscientização"
        >
          <div className="btn-secao-left">
            <span className="btn-secao-icon">📜</span>
            <div className="btn-secao-text">
              <span className="btn-secao-name">Termo de Garantia</span>
              <span className="btn-secao-hint">
                {dados.tituloTermo || 'Garantia / Conscientização'}
              </span>
            </div>
          </div>
          <span className={`btn-secao-tag ${dados.tipoTermo ? 'done' : 'pending'}`}>
            {dados.tipoTermo ? '✓ Ok' : ''}
          </span>
        </button>
      </div>

      {/* Ações Finais */}
      <div className="acoes-os">
        <button className="btn-acao btn-primary" onClick={salvarOS}>
          <span>💾</span> Salvar Ordem de Serviço
        </button>
        <button className="btn-acao btn-secondary" onClick={visualizarContrato}>
          <span>📄</span> Visualizar Contrato
        </button>
        {/* <button className="btn-acao btn-info" onClick={testarTelegram}>
          <span>✈️</span> Testar Telegram
        </button> */}
      </div>

      {/* Modais */}

      {/* 1. Modal Cadastrar Cliente com Auto-busca por CPF */}
      {modal === 'cliente' && (
        <ModalClienteOS
          isOpen={true}
          dadosCliente={dados.cliente}
          ordens={ordens}
          onSalvar={(cli) => {
            setDados((prev) => ({ ...prev, cliente: cli }));
            fecharModal();
          }}
          onClose={fecharModal}
        />
      )}

      {/* 2. Modal Cadastrar Produto com Auto-busca por Nº de Série */}
      {modal === 'produto' && (
        <ModalProdutoOS
          isOpen={true}
          dadosEquipamento={dados.equipamento}
          ordens={ordens}
          onSalvar={(equip) => {
            setDados((prev) => ({ ...prev, equipamento: equip }));
            fecharModal();
          }}
          onClose={fecharModal}
        />
      )}

      {/* 3. Modal Serviços (Unificado: Serviços a Realizar + Peças e Materiais) */}
      {modal === 'servicos' && (
        <ModalServicosOS
          isOpen={true}
          servicosIniciais={dados.servicos}
          pecasIniciais={dados.pecas}
          onSalvar={({ servicos, pecas }) => {
            setDados((prev) => ({ ...prev, servicos, pecas }));
            fecharModal();
          }}
          onClose={fecharModal}
        />
      )}

      {/* 4. Modal Custos / Pagamento (Unificado: Custos + Forma/Valor Pagamento + Prazos Início/Fim) */}
      {modal === 'custos_pagamento' && (
        <ModalCustosPagamentoOS
          isOpen={true}
          dadosIniciais={{
            custos: dados.custos,
            formaPagamento: dados.formaPagamento,
            valorPagamento: dados.valorPagamento,
            prazoInicio: dados.prazoInicio,
            prazoFim: dados.prazoFim,
          }}
          onSalvar={({ custos, formaPagamento, valorPagamento, prazoInicio, prazoFim }) => {
            setDados((prev) => ({
              ...prev,
              custos,
              formaPagamento,
              valorPagamento,
              prazoInicio,
              prazoFim,
            }));
            fecharModal();
          }}
          onClose={fecharModal}
        />
      )}

      {/* 5. Modal Técnico Responsável */}
      {modal === 'tecnico' && (
        <ModalSecao
          titulo="Técnico Responsável"
          campos={[{ nome: 'tecnico', label: 'Nome do Técnico Responsável' }]}
          dados={{ tecnico: dados.tecnico }}
          onChange={(campo, valor) => setDados((prev) => ({ ...prev, [campo]: valor }))}
          onClose={fecharModal}
          onSalvar={fecharModal}
        />
      )}

      {/* Modal de Busca Geral / Filtro de Clientes e OS */}
      {modalFiltroAberto && (
        <ModalFiltroOS
          isOpen={true}
          onClose={() => setModalFiltroAberto(false)}
          ordens={ordens}
          onSelectCliente={(cli, equip) => {
            handleSelectCliente(cli, equip);
            setModalFiltroAberto(false);
          }}
        />
      )}

      {/* Modal para Selecionar Termo de Garantia / Condições */}
      {modalTermoAberto && (
        <ModalSelecionarTermo
          isOpen={true}
          onClose={() => setModalTermoAberto(false)}
          termoSelecionadoId={dados.tipoTermo}
          textoBotaoConfirmar={acaoAoConfirmarTermo === 'salvar' ? '💾 Confirmar e Salvar OS' : '✓ Aplicar Termo'}
          onConfirmar={handleConfirmarTermo}
        />
      )}
    </div>
  );
};

export default OrdemServicoForm;