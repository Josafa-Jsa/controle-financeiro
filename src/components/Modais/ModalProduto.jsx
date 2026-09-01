import React, { useEffect, useState } from 'react';
import '../Visual/modal.css';

const VAZIO = {
  codigo: '',
  nome: '',
  descricao: '',
  quantidade: '',
  valorUnitario: '',
  estoqueMinimo: '',
};

export default function ModalProduto({
  isOpen = false,
  onClose = () => {},
  onSave = () => {},
  produtoParaEditar = null,
}) {
  const [produto, setProduto] = useState(VAZIO);

  useEffect(() => {
    if (!isOpen) return;

    setProduto(
      produtoParaEditar
        ? {
            codigo: produtoParaEditar.codigo || '',
            nome: produtoParaEditar.nome || '',
            descricao: produtoParaEditar.descricao || '',
            quantidade:
              produtoParaEditar.quantidade !== undefined &&
              produtoParaEditar.quantidade !== null
                ? String(produtoParaEditar.quantidade)
                : '',
            valorUnitario:
              produtoParaEditar.valorUnitario !== undefined &&
              produtoParaEditar.valorUnitario !== null
                ? String(produtoParaEditar.valorUnitario)
                : '',
            estoqueMinimo:
              produtoParaEditar.estoqueMinimo !== undefined &&
              produtoParaEditar.estoqueMinimo !== null
                ? String(produtoParaEditar.estoqueMinimo)
                : '',
          }
        : VAZIO
    );
  }, [isOpen, produtoParaEditar]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);

    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setProduto((s) => ({
      ...s,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!produto.codigo.trim()) return;
    if (!produto.nome.trim()) return;

    const payload = {
      ...produto,
      quantidade: Number(produto.quantidade) || 0,
      estoqueMinimo: Number(produto.estoqueMinimo) || 0,
      valorUnitario: Number(produto.valorUnitario) || 0,
    };

    onSave(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        aria-label={
          produtoParaEditar ? 'Editar Produto' : 'Novo Produto'
        }
      >
        <h2>
          {produtoParaEditar ? 'Editar Produto' : 'Novo Produto'}
        </h2>


        <form className="modal-form" onSubmit={handleSubmit}>


<div className="form-row">
  <label className="required">📦 Nome do Produto:</label>
  <input
    type="text"
    name="nome"
    value={produto.nome}
    onChange={handleChange}
    placeholder="Ex.: Câmera IP, Switch 8p, Cabo UTP..."
    required
  />
</div>

          <div className="form-row">
  <label className="required">🏷️ Código do Produto:</label>
  <input
    type="text"
    name="codigo"
    value={produto.codigo}
    onChange={handleChange}
    placeholder="Ex.: PROD-001"
    required
  />
</div>

<div className="form-row">
  <label>📝 Descrição do Produto:</label>
  <input
    type="text"
    name="descricao"
    value={produto.descricao}
    onChange={handleChange}
    placeholder="Detalhes, modelo, observações..."
  />
</div>

<div className="form-grid">
  <div className="form-row">
    <label className="required">📊 Quantidade:</label>
    <input
      type="number"
      name="quantidade"
      min="0"
      step="1"
      value={produto.quantidade}
      onChange={handleChange}
      placeholder="0"
      required
    />
  </div>

  <div className="form-row">
    <label className="required">⚠️ Estoque Mínimo:</label>
    <input
      type="number"
      name="estoqueMinimo"
      min="0"
      step="1"
      value={produto.estoqueMinimo}
      onChange={handleChange}
      placeholder="0"
      required
    />
  </div>
</div>

<div className="form-row">
  <label className="required">💰 Valor Unitário (R$):</label>
  <input
    type="number"
    name="valorUnitario"
    min="0"
    step="0.01"
    value={produto.valorUnitario}
    onChange={handleChange}
    placeholder="R$ 0,00"
    required
  />
</div>

          <div className="modal-buttons">
            <button className="salve" type="submit">
              Salvar
            </button>

            <button
              className="cancela"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// // src/components/ModalProduto.jsx
// import React, { useEffect, useState } from 'react';
// import './modal.css';

// const VAZIO = {
//   nome: '',
//   descricao: '',
//   quantidade: '',
//   valorUnitario: '',
//   estoqueMinimo: '',
// };

// export default function ModalProduto({
//   isOpen = false,
//   onClose = () => {},
//   onSave = () => {},
//   produtoParaEditar = null,
// }) {
//   const [produto, setProduto] = useState(VAZIO);

//   useEffect(() => {
//     if (!isOpen) return;
//     setProduto(
//       produtoParaEditar
//         ? {
//             nome: produtoParaEditar.nome || '',
//             descricao: produtoParaEditar.descricao || '',
//             quantidade:
//               produtoParaEditar.quantidade !== undefined &&
//               produtoParaEditar.quantidade !== null
//                 ? String(produtoParaEditar.quantidade)
//                 : '',
//             valorUnitario:
//               produtoParaEditar.valorUnitario !== undefined &&
//               produtoParaEditar.valorUnitario !== null
//                 ? String(produtoParaEditar.valorUnitario)
//                 : '',
//             estoqueMinimo:
//               produtoParaEditar.estoqueMinimo !== undefined &&
//               produtoParaEditar.estoqueMinimo !== null
//                 ? String(produtoParaEditar.estoqueMinimo)
//                 : '',
//           }
//         : VAZIO
//     );
//   }, [isOpen, produtoParaEditar]);

//   useEffect(() => {
//     const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
//     window.addEventListener('keydown', onEsc);
//     return () => window.removeEventListener('keydown', onEsc);
//   }, [isOpen, onClose]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setProduto((s) => ({ ...s, [name]: value }));
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();

//     if (!produto.nome.trim()) return;

//     const payload = {
//       ...produto,
//       quantidade: Number(produto.quantidade) || 0,
//       estoqueMinimo: Number(produto.estoqueMinimo) || 0,
//       valorUnitario: Number(produto.valorUnitario) || 0,
//     };

//     onSave(payload);
//     onClose();
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
//       <div
//         className="modal-card"
//         onClick={(e) => e.stopPropagation()}
//         aria-label={produtoParaEditar ? 'Editar Produto' : 'Novo Produto'}
//       >
//         <h2>{produtoParaEditar ? 'Editar Produto' : 'Novo Produto'}</h2>

//         <form className="modal-form" onSubmit={handleSubmit}>
//           <div className="form-row">
//             <label className="required">Nome do Produto:</label>
//             <input
//               type="text"
//               name="nome"
//               value={produto.nome}
//               onChange={handleChange}
//               placeholder="Ex.: Câmera IP, Switch 8p, Cabo UTP..."
//               required
//             />
//           </div>

//           <div className="form-row">
//             <label>Descrição do Produto:</label>
//             <input
//               type="text"
//               name="descricao"
//               value={produto.descricao}
//               onChange={handleChange}
//               placeholder="Detalhes, modelo, observações…"
//             />
//           </div>

//           <div className="form-grid">
//             <div className="form-row">
//               <label className="required">Quantidade:</label>
//               <input
//                 type="number"
//                 name="quantidade"
//                 min="0"
//                 step="1"
//                 value={produto.quantidade}
//                 onChange={handleChange}
//                 placeholder="0"
//                 required
//               />
//             </div>

//             <div className="form-row">
//               <label className="required">Estoque Mínimo:</label>
//               <input
//                 type="number"
//                 name="estoqueMinimo"
//                 min="0"
//                 step="1"
//                 value={produto.estoqueMinimo}
//                 onChange={handleChange}
//                 placeholder="0"
//                 required
//               />
//             </div>
//           </div>

//           <div className="form-row">
//             <label className="required">Valor Unitário:</label>
//             <input
//               type="number"
//               name="valorUnitario"
//               min="0"
//               step="0.01"
//               value={produto.valorUnitario}
//               onChange={handleChange}
//               placeholder="0,00"
//               required
//             />
//           </div>

//           <div className="modal-buttons">
//             <button className="salve" type="submit">
//               Salvar
//             </button>
//             <button className="cancela" type="button" onClick={onClose}>
//               Cancelar
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }


