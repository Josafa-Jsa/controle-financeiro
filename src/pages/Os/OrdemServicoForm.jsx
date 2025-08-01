import React, { useState } from 'react';
import ModalSecao from '../../components/ModalSecao'; // Caminho corrigido
import { toast } from 'react-toastify';

const OrdemServicoForm = ({ onSalvar }) => {
  const [modal, setModal] = useState(null);
  const [dados, setDados] = useState({
    cliente: {},
    equipamento: {},
    servicos: '',
    pecas: '',
    custos: '',
    prazoInicio: '',
    prazoFim: '',
    pagamento: '',
    tecnico: '',
    numeroOS: `OS-${Date.now()}`
  });

  const campos = {
    cliente: [
      { nome: 'nome', label: 'Nome completo' },
      { nome: 'telefone', label: 'Telefone' },
      { nome: 'endereco', label: 'Endereço' },
      { nome: 'email', label: 'Email' },
      { nome: 'documento', label: 'CPF/CNPJ' },
    ],
    equipamento: [
      { nome: 'marca', label: 'Marca' },
      { nome: 'modelo', label: 'Modelo' },
      { nome: 'serie', label: 'Número de Série' },
      { nome: 'problema', label: 'Problema relatado pelo Cliente' },
    ]
  };

  const handleChange = (campo, valor) => {
    setDados(prev => ({ ...prev, [campo]: valor }));
  };

  const handleGroupedChange = (secao, campo, valor) => {
    setDados(prev => ({
      ...prev,
      [secao]: {
        ...prev[secao],
        [campo]: valor
      }
    }));
  };

  const abrirModal = (secao) => setModal(secao);
  const fecharModal = () => setModal(null);

  const salvarModal = () => {
    toast.success(`Seção ${modal} salva com sucesso!`);
    fecharModal();
  };

  const salvarOS = () => {
    try {
      onSalvar(dados);
      toast.success('Ordem de Serviço salva com sucesso!');
      setDados(prev => ({ ...prev, numeroOS: `OS-${Date.now()}` }));
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar Ordem de Serviço.');
    }
  };

  return (
    <div>
      <h2>Preencher Seções</h2>

      <div className="botoes-os">
        <button onClick={() => abrirModal('cliente')}>Cliente</button>
        <button onClick={() => abrirModal('equipamento')}>Equipamento</button>
        <button onClick={() => abrirModal('servicos')}>Serviços</button>
        <button onClick={() => abrirModal('pecas')}>Peças e Materiais</button>
        <button onClick={() => abrirModal('custos')}>Custos</button>
        <button onClick={() => abrirModal('prazos')}>Prazos</button>
        <button onClick={() => abrirModal('pagamento')}>Pagamento</button>
        <button onClick={() => abrirModal('tecnico')}>Técnico</button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button onClick={salvarOS}>Salvar Ordem de Serviço</button>
      </div>

      {/* === Modais === */}
      {modal === 'cliente' && (
        <ModalSecao
          titulo="Dados do Cliente"
          campos={campos.cliente}
          dados={dados.cliente}
          onChange={(campo, valor) => handleGroupedChange('cliente', campo, valor)}
          onClose={fecharModal}
          onSalvar={salvarModal}
        />
      )}
      {modal === 'equipamento' && (
        <ModalSecao
          titulo="Dados do Equipamento"
          campos={campos.equipamento}
          dados={dados.equipamento}
          onChange={(campo, valor) => handleGroupedChange('equipamento', campo, valor)}
          onClose={fecharModal}
          onSalvar={salvarModal}
        />
      )}
      {modal === 'servicos' && (
        <ModalSecao
          titulo="Serviços a Realizar"
          campos={[{ nome: 'servicos', label: 'Descreva os serviços' }]}
          dados={{ servicos: dados.servicos }}
          onChange={(campo, valor) => handleChange(campo, valor)}
          onClose={fecharModal}
          onSalvar={salvarModal}
        />
      )}
      {modal === 'pecas' && (
        <ModalSecao
          titulo="Peças e Materiais"
          campos={[{ nome: 'pecas', label: 'Descreva as peças e materiais utilizados' }]}
          dados={{ pecas: dados.pecas }}
          onChange={(campo, valor) => handleChange(campo, valor)}
          onClose={fecharModal}
          onSalvar={salvarModal}
        />
      )}
      {modal === 'custos' && (
        <ModalSecao
          titulo="Custos"
          campos={[{ nome: 'custos', label: 'Informe o custo estimado total' }]}
          dados={{ custos: dados.custos }}
          onChange={(campo, valor) => handleChange(campo, valor)}
          onClose={fecharModal}
          onSalvar={salvarModal}
        />
      )}
      {modal === 'prazos' && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>Prazos</h2>
            <input type="date" value={dados.prazoInicio} onChange={(e) => handleChange('prazoInicio', e.target.value)} />
            <input type="date" value={dados.prazoFim} onChange={(e) => handleChange('prazoFim', e.target.value)} />
            <div className="modal-buttons">
              <button className='salve' onClick={salvarModal}>Salvar</button>
              <button className='fecha' onClick={fecharModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {modal === 'pagamento' && (
        <ModalSecao
          titulo="Forma de Pagamento"
          campos={[{ nome: 'pagamento', label: 'Ex: Dinheiro, Cartão, Pix...' }]}
          dados={{ pagamento: dados.pagamento }}
          onChange={(campo, valor) => handleChange(campo, valor)}
          onClose={fecharModal}
          onSalvar={salvarModal}
        />
      )}
      {modal === 'tecnico' && (
        <ModalSecao
          titulo="Técnico Responsável"
          campos={[{ nome: 'tecnico', label: 'Josafá Santos' }]}
          dados={{ tecnico: dados.tecnico }}
          onChange={(campo, valor) => handleChange(campo, valor)}
          onClose={fecharModal}
          onSalvar={salvarModal}
        />
      )}
    </div>
  );
};

export default OrdemServicoForm;
