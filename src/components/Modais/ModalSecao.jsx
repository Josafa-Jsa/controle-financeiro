// // src/components/ModalSecao.jsx
// import React, { useEffect, useRef } from 'react';
// import './modal.css';

// const ModalSecao = ({ titulo, campos = [], dados = {}, onChange, onClose, onSalvar }) => {
//   // regra simples para virar textarea
//   const isTextarea = (campo) =>
//     campo?.type === 'textarea' ||
//     /descr|peç|pec|servi|obs|observa/i.test(String(campo?.label || campo?.nome || ''));

//   const firstInputRef = useRef(null);

//   // foco no primeiro campo ao abrir
//   useEffect(() => {
//     firstInputRef.current?.focus();
//   }, []);

//   // fechar com ESC
//   useEffect(() => {
//     const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
//     window.addEventListener('keydown', onKey);
//     return () => window.removeEventListener('keydown', onKey);
//   }, [onClose]);

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     onSalvar?.();
//   };

//   return (
//     <div className="modal-overlay" onClick={onClose}>
//       <div
//         className="modal-card"
//         role="dialog"
//         aria-modal="true"
//         aria-labelledby="modal-secao-title"
//         onClick={(e) => e.stopPropagation()}
//       >
//         <h2 id="modal-secao-title">{titulo}</h2>

//         <form className="modal-form" onSubmit={handleSubmit}>
//           {/* grade 2 colunas com responsividade (definida no modal.css) */}
//           <div className="form-grid">
//             {campos.map((campo, idx) => {
//               const id = `sec-${campo.nome}`;
//               const value = dados[campo.nome] ?? '';
//               const span2 = campo.fullWidth || campo.w === 2;

//               return (
//                 <div
//                   className="form-row"
//                   key={campo.nome}
//                   style={span2 ? { gridColumn: '1 / -1' } : undefined}
//                 >
//                   <label htmlFor={id}>{campo.label}</label>

//                   {isTextarea(campo) ? (
//                     <textarea
//                       id={id}
//                       rows={campo.rows || 8}
//                       value={value}
//                       placeholder={campo.label}
//                       onChange={(e) => onChange(campo.nome, e.target.value)}
//                       ref={idx === 0 ? firstInputRef : undefined}
//                     />
//                   ) : (
//                     <input
//                       id={id}
//                       type={campo.type || 'text'}
//                       value={value}
//                       placeholder={campo.label}
//                       onChange={(e) => onChange(campo.nome, e.target.value)}
//                       ref={idx === 0 ? firstInputRef : undefined}
//                     />
//                   )}
//                 </div>
//               );
//             })}
//           </div>

//           <div className="modal-buttons">
//             <button className="salve" type="submit">Salvar</button>
//             <button className="cancela" type="button" onClick={onClose}>Cancelar</button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default ModalSecao;



import React, { useEffect, useRef } from 'react';
import '../Visual/modal.css';

const ModalSecao = ({ titulo, campos = [], dados = {}, onChange, onClose, onSalvar }) => {
  // regra simples para virar textarea
  const isTextarea = (campo) =>
    campo?.type === 'textarea' ||
    /descr|peç|pec|servi|obs|observa/i.test(String(campo?.label || campo?.nome || ''));

  const firstInputRef = useRef(null);

  // foco no primeiro campo ao abrir
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // fechar com ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSalvar?.();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-secao-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-secao-title">{titulo}</h2>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* grade 2 colunas com responsividade */}
          <div className="form-grid">
            {campos.map((campo, idx) => {
              const id = `sec-${campo.nome}`;
              const value = dados[campo.nome] ?? '';
              const span2 = campo.fullWidth || campo.w === 2;

              return (
                <div
                  className="form-row"
                  key={campo.nome}
                  style={span2 ? { gridColumn: '1 / -1' } : undefined}
                >
                  <label htmlFor={id}>{campo.label}</label>

                  {isTextarea(campo) ? (
                    <textarea
                      id={id}
                      rows={campo.rows || 4}
                      value={value}
                      placeholder={campo.label}
                      onChange={(e) => onChange(campo.nome, e.target.value)}
                      ref={idx === 0 ? firstInputRef : undefined}
                    />
                  ) : (
                    <input
                      id={id}
                      type={campo.type || 'text'}
                      value={value}
                      placeholder={campo.label}
                      onChange={(e) => onChange(campo.nome, e.target.value)}
                      ref={idx === 0 ? firstInputRef : undefined}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="modal-buttons">
            <button className="salve" type="submit">
              Salvar
            </button>
            <button className="cancela" type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalSecao;