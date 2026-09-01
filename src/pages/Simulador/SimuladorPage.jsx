// src/pages/Simulador/SimuladorPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  listarSimulacoes,
  salvarSimulacao,
  excluirSimulacao,
  aprovarSimulacao,
  cancelarSimulacao,
  sincronizarSimulacoesDoServidor,
} from '../../services/simulacoesService';
import { getUser } from '../../auth/auth';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import { logEvent } from '../../utils/logger';
import { sendTelegramEvent, formatCurrencyBRL, formatDateBR } from '../../utils/telegram';
import { formatarMoedaInput, converterMoedaParaNumero, parseToBackendFloat } from '../../utils/numberUtils';
import Maquininha from './Maquininha';
import '../../components/Visual/simulador.css';

// Margens de lucro parametrizadas 1,5%
// const tabelaJuros = {
//   1: 11.9200,
//   2: 11.5675,
//   3: 9.4150,
//   4: 8.1367,
//   5: 7.2937,
//   6: 7.4116,
//   7: 6.8684,
//   8: 6.4492,
//   9: 7.3223,
//   10: 6.8950,
//   11: 8.6344,
//   12: 10.2816,
// };

// Margens de lucros baixas 48%
// const tabelaJuros = {
//   1: 15.6700,
//   2: 17.0400,
//   3: 13.3500,
//   4: 11.1600,
//   5: 9.7100,
//   6: 11.9300,
//   7: 10.9700,
//   8: 10.2300,
//   9: 11.9400,
//   10: 11.2200,
//   11: 15.6900,
//   12: 16.7600,
// };

// // Margens de lucros 125%
// const tabelaJuros = {
//   1: 17.8342,
//   2: 23.1128,
//   3: 25.7466,
//   4: 23.3898,
//   5: 22.2364,
//   6: 22.6160,
//   7: 23.1388,
//   8: 22.5116,
//   9: 23.2580,
//   10: 30.6957,
//   11: 45.0537,
//   12: 70.7260,
// };

// // Margens de lucros 130%
// const tabelaJuros = {
//   1: 18.5473,
//   2: 24.0379,
//   3: 26.7765,
//   4: 24.3865,
//   5: 23.1345,
//   6: 23.5193,
//   7: 24.0036,
//   8: 23.4051,
//   9: 24.1581,
//   10: 31.9239,
//   11: 46.8322,
//   12: 73.6047,
// };

// // Margens de lucros 145%
const tabelaJuros = {
  1: 19.7569,
  2: 25.6056,
  3: 28.5228,
  4: 25.9769,
  5: 24.6433,
  6: 25.0537,
  7: 25.5699,
  8: 24.9320,
  9: 25.7336,
  10: 34.0059,
  11: 49.8865,
  12: 78.4050,
};

// // Margens de lucros 150%
// const tabelaJuros = {
//   1: 20.1601,
//   2: 26.1281,
//   3: 29.1049,
//   4: 26.5071,
//   5: 25.1462,
//   6: 25.5644,
//   7: 26.0909,
//   8: 25.4403,
//   9: 26.2588,
//   10: 34.6999,
//   11: 50.9046,
//   12: 80.0051,
// };

// // Margens de lucros 155%
// const tabelaJuros = {
//   1: 20.5633,
//   2: 26.6507,
//   3: 29.6870,
//   4: 27.0372,
//   5: 25.6491,
//   6: 26.0752,
//   7: 26.6118,
//   8: 25.9486,
//   9: 26.7840,
//   10: 35.3939,
//   11: 51.9226,
//   12: 81.6052,
// };

// // Margens de lucros 165%
// const tabelaJuros = {
//   1: 23.5411,
//   2: 30.5089,
//   3: 33.9855,
//   4: 30.8745,
//   5: 29.3535,
//   6: 29.8531,
//   7: 30.5432,
//   8: 29.7153,
//   9: 30.7006,
//   10: 40.5183,
//   11: 59.4709,
//   12: 93.3583,
// };

export default function SimuladorPage() {
  const [valor, setValor] = useState('');
  const [juros, setJuros] = useState('');
  const [parcelas, setParcelas] = useState('');

  const [resultado, setResultado] = useState(null);
  const [simulacoesSalvas, setSimulacoesSalvas] = useState([]);

  // Modais
  const [showResumo, setShowResumo] = useState(false);
  const [showRelatorio, setShowRelatorio] = useState(false);

  useEffect(() => {
    carregarSimulacoes();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowResumo(false);
        setShowRelatorio(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const carregarSimulacoes = async () => {
    try {
      const currentUser = getUser();
      await sincronizarSimulacoesDoServidor(currentUser);
      const lista = listarSimulacoes(currentUser);
      setSimulacoesSalvas(lista);
      logEvent({
        type: 'simulador',
        title: 'Lista de simulações carregada',
        details: { qtd: (lista || []).length },
        user: currentUser,
      });
    } catch (e) {
      console.error('Falha ao carregar simulações:', e);
    }
  };

  // Fechar modais no ESC
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setShowResumo(false);
        setShowRelatorio(false);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  const formatarBRL = (v) =>
    Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleValorChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarMoedaInput(valorDigitado);
    setValor(valorFormatado);
  };

  const handleParcelasChange = (e) => {
    const quantidade = e.target.value;
    setParcelas(quantidade);

    if (tabelaJuros[quantidade]) {
      setJuros(tabelaJuros[quantidade]);
      logEvent({
        type: 'simulador',
        title: 'Parcelas alteradas (taxa preenchida automaticamente)',
        details: { parcelas: Number(quantidade), jurosPct: Number(tabelaJuros[quantidade]) },
      });
    } else {
      setJuros('');
    }
  };

  // Digitação pelo teclado físico da Maquininha
  const handleDigitoClick = (digito) => {
    const apenasNumeros = String(valor).replace(/\D/g, '');
    const novoNumero = `${apenasNumeros}${digito}`;
    setValor(formatarMoedaInput(novoNumero));
  };

  // Preview em tempo real da simulação
  const previewCalculo = useMemo(() => {
    const P = converterMoedaParaNumero(valor);
    const i = parseFloat(juros) / 100;
    const n = parseInt(parcelas, 10);

    if (P > 0 && i > 0 && n > 0) {
      const parcela = (P * i) / (1 - Math.pow(1 + i, -n));
      const totalPago = parcela * n;
      const totalJuros = totalPago - P;
      return {
        valido: true,
        parcela,
        totalPago,
        totalJuros,
      };
    }
    return { valido: false };
  }, [valor, juros, parcelas]);

  /* =========================================================
     BOTÕES DA MAQUININHA MODERNINHA
  ========================================================= */

  // 1. BOTÃO VERMELHO (Cancela / Limpa formulário)
  const handleBotaoVermelhoCancela = () => {
    setValor('');
    setParcelas('');
    setJuros('');
    setResultado(null);
    toast.info('Simulação cancelada/limpa.');
  };

  // 2. BOTÃO AMARELO (Apaga / Backspace)
  const handleBotaoAmareloApaga = () => {
    const apenasNumeros = String(valor).replace(/\D/g, '');
    if (apenasNumeros.length > 0) {
      const reduzido = apenasNumeros.slice(0, -1);
      setValor(formatarMoedaInput(reduzido));
    } else if (parcelas) {
      setParcelas('');
      setJuros('');
    }
  };

  // 3. BOTÃO VERDE (Confirma / Calcula e Salva)
  const handleBotaoVerdeConfirma = async () => {
    await calcularParcelas();
  };

  // 4. BOTÃO MENU (Gera Relatório de Simulações do Mês Vigente)
  const handleBotaoMenuRelatorio = () => {
    setShowRelatorio(true);
    toast.info('Abrindo Relatório de Simulações do Mês Vigente...');
  };

  // Cálculo e Salvamento da Simulação
  const calcularParcelas = async () => {
    try {
      const P = converterMoedaParaNumero(valor);
      const i = parseFloat(juros) / 100;
      const n = parseInt(parcelas, 10);

      if (!(P > 0) || !(i > 0) || !(n > 0)) {
        toast.warn('Preencha o valor e selecione as parcelas na maquininha.');
        return;
      }

      // Fórmula de prestação de financiamento (Price)
      const parcela = (P * i) / (1 - Math.pow(1 + i, -n));
      const totalPago = parcela * n;
      const totalJuros = totalPago - P;

      const tabela = Array.from({ length: n }, (_, idx) => ({
        numero: idx + 1,
        valor: parcela,
      }));

      const res = { P, i, n, parcela, totalPago, totalJuros, tabela };
      setResultado(res);

      const currentUser = getUser() || {};
      const userEmail = (currentUser.email || currentUser.user_email || "").trim();
      const rawName = (currentUser.name || currentUser.nome || "").trim();
      const rawSurname = (currentUser.surname || currentUser.sobrenome || "").trim();
      let userName = [rawName, rawSurname].filter(Boolean).join(" ");
      if (!userName || userName.toLowerCase() === "usuario") {
        userName = userEmail ? userEmail.split("@")[0] : "Operador";
      }

      let userLogin = (currentUser.username || currentUser.user_login || "").trim();
      if (!userLogin || userLogin.toLowerCase() === "usuario") {
        if (rawName) {
          const p1 = rawName.split(" ")[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
          const p2 = (rawSurname || rawName.split(" ")[1] || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
          userLogin = p2 ? `${p1}.${p2}` : p1;
        } else if (userEmail) {
          userLogin = userEmail.split("@")[0];
        } else {
          userLogin = "operador";
        }
      }
      const userId = currentUser.id || null;

      // Salva automaticamente a simulação no histórico vinculada ao usuário
      const novaSimulacao = {
        valor: Number(P),
        juros: Number((i * 100).toFixed(4)),
        parcelas: Number(n),
        total: Number(totalPago),
        jurosTotal: Number(totalJuros),
        userId,
        userEmail,
        userName,
        userLogin,
        data: new Date().toLocaleString('pt-BR'),
        createdAt: new Date().toISOString(),
      };

      await salvarSimulacao(novaSimulacao, currentUser);
      await carregarSimulacoes();

      logEvent({
        type: 'simulador',
        title: 'Simulação calculada e salva',
        screen: 'Simulador',
        details: {
          valor: P,
          jurosPct: parseFloat(juros),
          parcelas: n,
          parcela: Number(parcela.toFixed(2)),
          totalPago: Number(totalPago.toFixed(2)),
          totalJuros: Number(totalJuros.toFixed(2)),
        },
        user: currentUser,
      });

      toast.success(`Simulação concluída: ${n}x de ${formatarBRL(parcela)}. Total: ${formatarBRL(totalPago)}`);

      try {
        await sendTelegramEvent({
          title: 'Nova Simulação de Crédito (Moderninha)',
          emoji: '💳',
          screen: 'Simulador de Crédito',
          lines: [
            `👤 Operador: ${userName} (${userLogin || userEmail})`,
            `Valor solicitado: ${formatarBRL(P)}`,
            `Juros mensal: ${(i * 100).toFixed(4)}%`,
            `Parcelas: ${n}x`,
            `Parcela mensal: ${formatarBRL(parcela)}`,
            `Total a pagar: ${formatarBRL(totalPago)}`,
            `Juros totais: ${formatarBRL(totalJuros)}`,
            `Data/Hora: ${new Date().toLocaleString('pt-BR')}`,
          ],
        });
        logEvent({
          type: 'simulador',
          title: 'Simulação notificada no Telegram',
          screen: 'Simulador',
          details: { valor: P, parcelas: n },
          user: currentUser,
        });
      } catch (err) {
        console.warn('[TG] Não enviado (simulação):', err);
      }
    } catch (error) {
      console.error('Erro ao calcular simulação:', error);
      toast.error('Erro na simulação.');
      logEvent({ type: 'simulador', title: 'Erro ao simular', details: { erro: String(error?.message || error) } });
    }
  };

  const currentUser = useMemo(() => getUser() || {}, []);
  const userEmail = (currentUser.email || '').toLowerCase();
  const rawCurName = (currentUser.name || currentUser.nome || '').trim();
  const rawCurSurname = (currentUser.surname || currentUser.sobrenome || '').trim();
  const userName = [rawCurName, rawCurSurname].filter(Boolean).join(' ') || (userEmail ? userEmail.split('@')[0] : 'Operador');
  const userLogin = currentUser.username || (userEmail ? userEmail.split('@')[0] : 'operador');
  const role = (currentUser.role || '').toLowerCase();
  const isAdmin =
    role === 'admin' ||
    userEmail === 'jsa@jsa.com' ||
    userEmail === 'josafa.santos.jss@gmail.com' ||
    userName === 'JSA Admin' ||
    userLogin === 'jsa.admin';

  const formatarIdentificadorSimulacao = (sim) => {
    const rawName = (sim?.userName || '').trim();
    const rawLogin = (sim?.userLogin || '').trim();
    const rawEmail = (sim?.userEmail || '').trim();

    let nomeExibicao = '';
    if (rawName && rawName.toLowerCase() !== 'usuario' && rawName.toLowerCase() !== 'operador') {
      nomeExibicao = rawName;
    } else if (rawLogin && rawLogin.toLowerCase() !== 'usuario' && rawLogin.toLowerCase() !== 'operador') {
      nomeExibicao = rawLogin;
    } else if (rawEmail) {
      nomeExibicao = rawEmail.split('@')[0];
    } else {
      nomeExibicao = userName || 'Operador';
    }

    const numFormatado = String(sim?.id || 1).padStart(3, '0');
    return `#${nomeExibicao}_SM-${numFormatado}`;
  };

  const handleAprovarSimulacao = async (sim) => {
    try {
      setSimulacoesSalvas((prev) =>
        prev.map((s) => (String(s.id) === String(sim.id) ? { ...s, status: 'APROVADA' } : s))
      );
      await aprovarSimulacao(sim.id, currentUser);
      const listaAtualizada = await sincronizarSimulacoesDoServidor(currentUser);
      setSimulacoesSalvas(listaAtualizada || []);

      toast.success('Simulação de crédito APROVADA com sucesso!');

      try {
        const simIdLabel = formatarIdentificadorSimulacao(sim);
        await sendTelegramEvent({
          title: 'Simulação de Crédito APROVADA ✅',
          emoji: '✅',
          screen: 'Simulador de Crédito',
          lines: [
            `🆔 Identificador: ${simIdLabel}`,
            `👤 Operador Solicitante: ${sim.userName || 'Operador'} (${sim.userLogin || sim.userEmail || ''})`,
            `🛡️ Aprovado por: ${userName} (${userLogin || userEmail})`,
            `💰 Valor: ${formatarBRL(sim.valor)} (${sim.parcelas}x de ${formatarBRL(sim.total / sim.parcelas)})`,
            `💳 Total: ${formatarBRL(sim.total)}`,
            `📈 Juros: ${sim.juros}% a.m. (Total: ${formatarBRL(sim.jurosTotal)})`,
            `📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`,
          ],
        });
      } catch (err) {
        console.warn('[TG] Erro ao notificar aprovação:', err);
      }
    } catch (e) {
      console.error('Erro ao aprovar simulação:', e);
      toast.error('Erro ao aprovar simulação.');
    }
  };

  const handleCancelarSimulacao = async (sim) => {
    try {
      setSimulacoesSalvas((prev) => prev.filter((s) => String(s.id) !== String(sim.id)));
      await cancelarSimulacao(sim.id, currentUser);
      const listaAtualizada = await sincronizarSimulacoesDoServidor(currentUser);
      setSimulacoesSalvas(listaAtualizada || []);

      toast.warn('Simulação de crédito cancelada e removida com sucesso!');

      try {
        const simIdLabel = formatarIdentificadorSimulacao(sim);
        await sendTelegramEvent({
          title: 'Simulação de Crédito CANCELADA ❌',
          emoji: '❌',
          screen: 'Simulador de Crédito',
          lines: [
            `🆔 Identificador: ${simIdLabel}`,
            `👤 Operador: ${sim.userName || 'Operador'} (${sim.userLogin || sim.userEmail || ''})`,
            `🚫 Cancelado por: ${userName} (${userLogin || userEmail})`,
            `💰 Valor: ${formatarBRL(sim.valor)} (${sim.parcelas}x)`,
            `💳 Total: ${formatarBRL(sim.total)}`,
            `📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`,
          ],
        });
      } catch (err) {
        console.warn('[TG] Erro ao notificar cancelamento:', err);
      }
    } catch (e) {
      console.error('Erro ao cancelar simulação:', e);
      toast.error('Erro ao cancelar simulação.');
    }
  };

  /* =========================================================
     FILTRAGEM DE SIMULAÇÕES
  ========================================================= */

  // 1. Simulações VISÍVEIS NA TELA (Últimas 24 horas / 1 dia)
  const simulacoesVisiveisHoje = useMemo(() => {
    const agora = Date.now();
    const umDiaMs = 24 * 60 * 60 * 1000;

    return simulacoesSalvas.filter((s) => {
      const ts = s.createdAt ? new Date(s.createdAt).getTime() : 0;
      if (!ts) return true;
      return agora - ts <= umDiaMs;
    });
  }, [simulacoesSalvas]);

  // 2. Simulações DO MÊS VIGENTE (Para o Relatório de Simulações)
  const simulacoesMesVigente = useMemo(() => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1; // 1 a 12

    return simulacoesSalvas.filter((s) => {
      if (!s.createdAt) return true;
      const dataItem = new Date(s.createdAt);
      return dataItem.getFullYear() === anoAtual && dataItem.getMonth() + 1 === mesAtual;
    });
  }, [simulacoesSalvas]);

  // Resumo Financeiro das Simulações do Mês Vigente
  const kpisMes = useMemo(() => {
    const totalSimulacoes = simulacoesMesVigente.length;
    const somaValorSolicitado = simulacoesMesVigente.reduce((acc, s) => acc + (s.valor || 0), 0);
    const somaTotalComJuros = simulacoesMesVigente.reduce((acc, s) => acc + (s.total || 0), 0);
    const somaJurosTotais = simulacoesMesVigente.reduce((acc, s) => acc + (s.jurosTotal || 0), 0);
    const mediaJurosPercentual =
      totalSimulacoes > 0
        ? (simulacoesMesVigente.reduce((acc, s) => acc + (s.juros || 0), 0) / totalSimulacoes).toFixed(2)
        : '0.00';

    return {
      totalSimulacoes,
      somaValorSolicitado,
      somaTotalComJuros,
      somaJurosTotais,
      mediaJurosPercentual,
    };
  }, [simulacoesMesVigente]);

  /* =========================================================
     EXPORTAÇÃO DE RELATÓRIO EM PDF PROFISSIONAL
  ========================================================= */
  const handleExportarPDF = () => {
    try {
      const doc = new jsPDF();
      const hoje = new Date();
      const mesNome = hoje.toLocaleString('pt-BR', { month: 'long' });
      const ano = hoje.getFullYear();

      // Cabeçalho
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 38, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(0, 210, 255);
      doc.text('JSA GESTÃO FINANCEIRA', 14, 16);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      doc.text(`Relatório Consolidado de Simulações - Moderninha Pro (${mesNome.toUpperCase()} / ${ano})`, 14, 25);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 32);

      // Resumo Executivo / KPIs
      let y = 48;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text('1. RESUMO EXECUTIVO DO MÊS', 14, y);

      y += 6;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, y, 182, 30, 3, 3, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('QTD. SIMULAÇÕES:', 20, y + 10);
      doc.text('TOTAL SOLICITADO:', 70, y + 10);
      doc.text('TOTAL C/ JUROS:', 130, y + 10);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(String(kpisMes.totalSimulacoes), 20, y + 20);
      doc.text(formatarBRL(kpisMes.somaValorSolicitado), 70, y + 20);
      doc.setTextColor(2, 132, 199);
      doc.text(formatarBRL(kpisMes.somaTotalComJuros), 130, y + 20);

      // Tabela de Simulações
      y += 42;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text('2. DETALHAMENTO DAS SIMULAÇÕES REGISTRADAS', 14, y);

      y += 6;
      doc.setFillColor(30, 41, 59);
      doc.rect(14, y, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('ID / OPERADOR', 18, y + 5.5);
      doc.text('DATA', 65, y + 5.5);
      doc.text('VALOR', 95, y + 5.5);
      doc.text('PARCELAS', 125, y + 5.5);
      doc.text('JUROS', 150, y + 5.5);
      doc.text('TOTAL FINAL', 170, y + 5.5);

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      simulacoesMesVigente.forEach((sim, idx) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }

        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 182, 7, 'F');
        }

        doc.setTextColor(51, 65, 85);
        const simIdLabel = `#${sim.userLogin || 'Usuario'}_SM-${String(sim.id).padStart(3, '0')}`;
        doc.text(simIdLabel, 18, y + 5);
        doc.text(String(sim.data || '').slice(0, 16), 65, y + 5);
        doc.text(formatarBRL(sim.valor), 95, y + 5);
        doc.text(`${sim.parcelas}x de ${formatarBRL(sim.total / sim.parcelas)}`, 125, y + 5);
        doc.text(`${sim.juros}%`, 150, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 132, 199);
        doc.text(formatarBRL(sim.total), 170, y + 5);
        doc.setFont('helvetica', 'normal');

        y += 7;
      });

      // Rodapé
      const pageCount = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`JSA Tecnologia & Soluções Financeiras - Página ${p} de ${pageCount}`, 14, 290);
      }

      doc.save(`Relatorio_Simulacoes_${mesNome}_${ano}.pdf`);
      toast.success('Relatório em PDF gerado com sucesso!');
      logEvent({
        type: 'simulador',
        title: 'Relatório mensal em PDF gerado',
        details: { mes: mesNome, ano, qtd: simulacoesMesVigente.length },
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar relatório em PDF.');
    }
  };

  return (
    <div className="simulador-page-container">
      {/* Header Superior da Página */}
      <div className="simulador-top-header">
        <div className="header-titles">
          <h1>💳 Simulador de Crédito</h1>
          <p>
            Preencha os valores diretamente no visor da maquininha ou utilize o teclado interativo.
          </p>
        </div>

        <button
          type="button"
          className="btn-relatorio-top"
          onClick={handleBotaoMenuRelatorio}
          title="Gerar Relatório de Simulações do Mês Vigente"
        >
          📑 Gerar Relatório de Simulações
        </button>
      </div>

      {/* Grid Principal */}
      <div className="simulador-main-grid">
        {/* COMPONENTE EXCLUSIVO DA MAQUININHA */}
        <Maquininha
          valor={valor}
          onValorChange={handleValorChange}
          parcelas={parcelas}
          onParcelasChange={handleParcelasChange}
          juros={juros}
          tabelaJuros={tabelaJuros}
          previewCalculo={previewCalculo}
          onCancela={handleBotaoVermelhoCancela}
          onApaga={handleBotaoAmareloApaga}
          onConfirma={handleBotaoVerdeConfirma}
          onMenu={handleBotaoMenuRelatorio}
          onDigitoClick={handleDigitoClick}
        />

        {/* CONTAINERS DAS SIMULAÇÕES GERADAS (VISÍVEIS POR 1 DIA) */}
        <div className="simulacoes-cards-section">
          <div className="simulacoes-section-header">
            <h2>
              📊 Simulações Recentes
              <span className="badge-recente">Visíveis por 1 dia ({simulacoesVisiveisHoje.length})</span>
              {isAdmin && <span className="admin-badge-indicator">👑 Visão Geral Admin (Todos os Usuários)</span>}
            </h2>
            <span className="badge-total-mes">Total no Mês: {simulacoesMesVigente.length}</span>
          </div>

          {simulacoesVisiveisHoje.length === 0 ? (
            <div className="no-simulacoes-box">
              <p>Nenhuma simulação gerada nas últimas 24 horas.</p>
              <small>Preencha os dados na Maquininha e pressione <strong>ENTRA (Verde)</strong> para simular.</small>
            </div>
          ) : (
            <div className="simulacoes-cards-grid">
              {simulacoesVisiveisHoje.map((sim, index) => {
                const simIdLabel = formatarIdentificadorSimulacao(sim);
                const nomeExibicao =
                  (sim.userName && sim.userName.toLowerCase() !== 'usuario' && sim.userName.toLowerCase() !== 'operador')
                    ? sim.userName
                    : (sim.userLogin && sim.userLogin.toLowerCase() !== 'usuario' && sim.userLogin.toLowerCase() !== 'operador')
                    ? sim.userLogin
                    : (sim.userEmail ? sim.userEmail.split('@')[0] : (userName || 'Operador'));

                return (
                  <div
                    key={sim.id}
                    className="simulacao-card card-slide-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="simulacao-card-header">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="simulacao-card-id">{simIdLabel}</span>
                        <span className="badge-operador-sim">
                          👤 {nomeExibicao}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span className="simulacao-card-date">📅 {sim.data}</span>
                        <span className={`badge-status-sim ${sim.status === 'APROVADA' ? 'badge-status-aprovada' : 'badge-status-pendente'}`}>
                          {sim.status === 'APROVADA' ? '✅ Aprovada' : '⏳ Pendente'}
                        </span>
                      </div>
                    </div>

                    <div className="simulacao-card-highlight">
                      <div className="card-highlight-label">Parcelamento ({sim.parcelas}X)</div>
                      <div className="card-highlight-value">
                        {formatarBRL(sim.total / sim.parcelas)}
                      </div>
                    </div>

                    <div className="simulacao-card-details">
                      <div className="card-detail-item">
                        <span className="card-detail-label">Valor Solicitado</span>
                        <strong className="card-detail-value">{formatarBRL(sim.valor)}</strong>
                      </div>

                      <div className="card-detail-item">
                        <span className="card-detail-label">Taxa de Juros</span>
                        <strong className="card-detail-value">{sim.juros}% a.m.</strong>
                      </div>

                      <div className="card-detail-item">
                        <span className="card-detail-label">Total a Pagar</span>
                        <strong className="card-detail-value" style={{ color: '#00d2ff' }}>
                          {formatarBRL(sim.total)}
                        </strong>
                      </div>

                      <div className="card-detail-item">
                        <span className="card-detail-label">Juros Totais</span>
                        <strong className="card-detail-value text-danger">
                          {formatarBRL(sim.jurosTotal)}
                        </strong>
                      </div>
                    </div>

                    <div className="simulacao-card-actions">
                      <button
                        type="button"
                        className="btn-card-detalhes"
                        onClick={() => {
                          const P = sim.valor;
                          const i = sim.juros / 100;
                          const n = sim.parcelas;
                          const parcela = sim.total / n;
                          const tabela = Array.from({ length: n }, (_, idx) => ({
                            numero: idx + 1,
                            valor: parcela,
                          }));
                          setResultado({ P, i, n, parcela, totalPago: sim.total, totalJuros: sim.jurosTotal, tabela });
                          setShowResumo(true);
                        }}
                        title="Ver resumo detalhado das parcelas"
                      >
                        👁️ Detalhes
                      </button>

                      {sim.status !== 'APROVADA' && (
                        <button
                          type="button"
                          className="btn-card-aprovar"
                          onClick={() => handleAprovarSimulacao(sim)}
                          title="Aprovar simulação de crédito"
                        >
                          ✅ Aprovar Simulação
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-card-cancelar"
                        onClick={() => handleCancelarSimulacao(sim)}
                        title="Cancelar simulação de crédito"
                      >
                        ❌ Cancelar Simulação
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE RESUMO DA SIMULAÇÃO */}
      {showResumo && resultado && (
        <div className="modal-overlay" onClick={() => setShowResumo(false)} role="dialog" aria-modal="true">
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '520px',
              padding: '24px',
              borderRadius: '12px',
              backgroundColor: '#1e1e24',
              border: '1px solid #2d2d35',
              boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            }}
          >
            <h2 style={{ marginBottom: '16px', fontSize: '1.3rem', color: '#00d2ff', fontWeight: '700' }}>
              📊 Resumo Detalhado da Simulação
            </h2>

            <div className="modal-form">
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 163, 190, 0.15) 0%, rgba(2, 132, 199, 0.1) 100%)',
                  border: '1px solid rgba(0, 210, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                  marginBottom: '18px',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
                  VALOR DA PARCELA MENSAL ({resultado.n}X)
                </span>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#00d2ff', marginTop: '4px' }}>
                  {formatarBRL(resultado.parcela)}
                </div>
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-row">
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Valor Solicitado</label>
                  <input value={formatarBRL(resultado.P)} readOnly style={{ ...inputDarkStyle, backgroundColor: '#27272a' }} />
                </div>

                <div className="form-row">
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total de Parcelas</label>
                  <input value={`${resultado.n}x`} readOnly style={{ ...inputDarkStyle, backgroundColor: '#27272a' }} />
                </div>
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-row">
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Taxa Mensal</label>
                  <input value={`${(resultado.i * 100).toFixed(4)}%`} readOnly style={{ ...inputDarkStyle, backgroundColor: '#27272a' }} />
                </div>

                <div className="form-row">
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Juros Totais</label>
                  <input value={formatarBRL(resultado.totalJuros)} readOnly style={{ ...inputDarkStyle, backgroundColor: '#27272a', color: '#f87171' }} />
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Montante Total a Pagar</label>
                <input value={formatarBRL(resultado.totalPago)} readOnly style={{ ...inputDarkStyle, backgroundColor: '#27272a', color: '#00d2ff', fontWeight: '700' }} />
              </div>

              <div className="modal-buttons" style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowResumo(false)}
                  style={{
                    flex: 1,
                    height: '42px',
                    fontWeight: '700',
                    backgroundColor: '#00a3be',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RELATÓRIO DE SIMULAÇÕES DO MÊS VIGENTE */}
      {showRelatorio && (
        <div className="modal-overlay" onClick={() => setShowRelatorio(false)}>
          <div
            className="modal-content modal-relatorio-simulacoes"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relatorio-sim-header">
              <h2>
                📑 Relatório de Simulações • {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
              </h2>
              <button
                type="button"
                className="btn-fechar-modal"
                onClick={() => setShowRelatorio(false)}
                style={{ width: 'auto', padding: '6px 14px' }}
              >
                ✕
              </button>
            </div>

            {/* KPIs do Mês */}
            <div className="relatorio-kpis-grid">
              <div className="kpi-card">
                <span className="kpi-title">Total de Simulações</span>
                <div className="kpi-value kpi-cyan">{kpisMes.totalQtd}</div>
              </div>

              <div className="kpi-card">
                <span className="kpi-title">Volume Solicitado</span>
                <div className="kpi-value kpi-green">{formatarBRL(kpisMes.volumeTotal)}</div>
              </div>

              <div className="kpi-card">
                <span className="kpi-title">Juros Projetados</span>
                <div className="kpi-value kpi-red">{formatarBRL(kpisMes.jurosTotal)}</div>
              </div>

              <div className="kpi-card">
                <span className="kpi-title">Média de Parcelas</span>
                <div className="kpi-value">{kpisMes.mediaParcelas}x</div>
              </div>
            </div>

            {/* Tabela de Todas as Simulações do Mês */}
            <div className="relatorio-table-wrapper">
              <table className="relatorio-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Data / Hora</th>
                    <th>Valor Solicitado</th>
                    <th>Taxa (% a.m.)</th>
                    <th>Parcelas</th>
                    <th>Total a Pagar</th>
                    <th>Juros Totais</th>
                  </tr>
                </thead>
                <tbody>
                  {simulacoesMesVigente.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                        Nenhuma simulação registrada no mês vigente.
                      </td>
                    </tr>
                  ) : (
                    simulacoesMesVigente.map((s) => (
                      <tr key={s.id}>
                        <td style={{ color: '#00d2ff', fontWeight: '700' }}>#{s.id}</td>
                        <td style={{ color: '#94a3b8' }}>{s.data}</td>
                        <td style={{ fontWeight: '600' }}>{formatarBRL(s.valor)}</td>
                        <td>{s.juros}%</td>
                        <td>{s.parcelas}x</td>
                        <td style={{ color: '#00d2ff', fontWeight: '700' }}>{formatarBRL(s.total)}</td>
                        <td style={{ color: '#f87171' }}>{formatarBRL(s.jurosTotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Ações do Relatório */}
            <div className="relatorio-modal-actions">
              <button
                type="button"
                className="btn-exportar-pdf"
                onClick={exportarRelatorioPDF}
              >
                📥 Baixar Relatório em PDF
              </button>

              <button
                type="button"
                className="btn-fechar-modal"
                onClick={() => setShowRelatorio(false)}
                style={{ width: 'auto', padding: '10px 18px' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputDarkStyle = {
  width: '100%',
  height: '38px',
  padding: '0 10px',
  borderRadius: '6px',
  border: '1px solid #3f3f46',
  boxSizing: 'border-box',
  fontSize: '0.9rem',
  outline: 'none',
  color: '#f8fafc',
  backgroundColor: '#18181b',
};