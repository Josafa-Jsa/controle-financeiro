// // src/components/ModalConta.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import "./modal.css";

// // Formata strings ou números para visualização BRL no input
// const formatarMoedaInput = (valor) => {
//   if (valor === "" || valor === null || valor === undefined) return "";
//   const apenasNumeros = String(valor).replace(/\D/g, "");
//   if (!apenasNumeros) return "";
//   const numero = Number(apenasNumeros) / 100;
//   return numero.toLocaleString("pt-BR", {
//     style: "currency",
//     currency: "BRL",
//   });
// };

// // Converte string BRL (ex: "R$ 1.250,50") ou número de volta para float puro
// const converterMoedaParaNumero = (valor) => {
//   if (typeof valor === "number") return valor;
//   if (!valor) return 0;
//   const limpo = String(valor)
//     .replace(/[^\d,-]/g, "")
//     .replace(",", ".");
//   return parseFloat(limpo) || 0;
// };

// const ModalConta = ({
//   isOpen,
//   onClose,
//   onSave,
//   contaParaEditar,
//   contasParaBaixa = [],
//   showStatusSelector = true,
// }) => {
//   const [form, setForm] = useState({
//     tipo: "Receber",
//     descricao: "",
//     observacao: "",
//     valor: "",
//     vencimento: "",
//     status: "Pendente",
//     applyBaixa: false,
//     baixaTargetId: "",
//     baixaObs: "",
//   });

//   const toBRL = (v) =>
//     Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

//   const calcularSaldoPendente = (c) => {
//     const baixas = (c?.baixas || []).reduce(
//       (acc, b) => acc + (Number(b.valor) || 0),
//       0
//     );
//     return (Number(c?.valor) || 0) - baixas;
//   };

//   const opcoesBaixa = useMemo(
//     () =>
//       (contasParaBaixa || [])
//         .filter((c) => String(c.tipo) === "Receber")
//         .filter((c) => String(c.status) !== "Pago")
//         .filter((c) => calcularSaldoPendente(c) > 0)
//         .sort((a, b) => (a.id ?? 0) - (b.id ?? 0)),
//     [contasParaBaixa]
//   );

//   const isCreate = !contaParaEditar;

//   useEffect(() => {
//     if (contaParaEditar) {
//       setForm({
//         tipo: contaParaEditar.tipo || "Receber",
//         descricao: contaParaEditar.descricao || "",
//         observacao: contaParaEditar.observacao || "",
//         valor:
//           contaParaEditar.valor !== undefined && contaParaEditar.valor !== null
//             ? formatarMoedaInput(
//                 Math.round(Number(contaParaEditar.valor) * 100)
//               )
//             : "",
//         vencimento: contaParaEditar.vencimento || "",
//         status: contaParaEditar.status || "Pendente",
//         applyBaixa: false,
//         baixaTargetId: "",
//         baixaObs: "",
//       });
//     } else {
//       setForm({
//         tipo: "Receber",
//         descricao: "",
//         observacao: "",
//         valor: "",
//         vencimento: new Date().toISOString().slice(0, 10),
//         status: "Pendente",
//         applyBaixa: false,
//         baixaTargetId: "",
//         baixaObs: "",
//       });
//     }
//   }, [contaParaEditar, isOpen]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm((p) => ({ ...p, [name]: value }));
//   };

//   const handleValorChange = (e) => {
//     const valorDigitado = e.target.value;
//     const valorFormatado = formatarMoedaInput(valorDigitado);
//     setForm((p) => ({ ...p, valor: valorFormatado }));
//   };

//   const toggleApplyBaixa = (checked) => {
//     setForm((p) => ({
//       ...p,
//       applyBaixa: checked,
//       status: checked ? "Pago" : p.status,
//     }));
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();

//     const valorNumerico = converterMoedaParaNumero(form.valor);
//     const valorFormatado = toBRL(valorNumerico);

//     const payload = {
//       tipo: form.tipo,
//       descricao: form.descricao,
//       observacao: form.observacao,
//       valor: valorNumerico,
//       vencimento: form.vencimento,
//       status: form.status,
//     };

//     if (isCreate && form.applyBaixa && form.baixaTargetId) {
//       payload.baixaTargetId = Number(form.baixaTargetId);
//       if (form.baixaObs?.trim()) payload.baixaObs = form.baixaObs.trim();
//     }

//     if (contaParaEditar?.id != null) payload.id = contaParaEditar.id;

//     const toastConfig = {
//       position: "top-right",
//       autoClose: 4000,
//     };

//     if (isCreate && form.applyBaixa) {
//       toast.success(
//         `Baixa adicionada com sucesso! Valor: ${valorFormatado}`,
//         toastConfig
//       );
//     } else if (form.tipo === "Receber") {
//       toast.success(
//         `Conta a receber salva com sucesso! Valor: ${valorFormatado}`,
//         toastConfig
//       );
//     } else if (form.tipo === "Pagar") {
//       toast.warn(
//         `Conta a pagar salva com sucesso! Valor: ${valorFormatado}`,
//         toastConfig
//       );
//     }

//     onSave(payload);
//     onClose();
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="modal-overlay" onClick={onClose}>
//       <ToastContainer autoClose={4000} />

//       <div className="modal-box" onClick={(e) => e.stopPropagation()}>
//         <h2>{contaParaEditar ? "Editar Conta" : "Nova Conta"}</h2>

//         <form className="modal-form" onSubmit={handleSubmit}>
//           <div className="form-grid">
//             <div className="form-row">
//               <label>Tipo:</label>
//               <select
//                 name="tipo"
//                 value={form.tipo}
//                 onChange={handleChange}
//                 required
//               >
//                 <option value="Receber">Receber</option>
//                 <option value="Pagar">Pagar</option>
//               </select>
//             </div>

//             <div className="form-row">
//               <label>Vencimento:</label>
//               <input
//                 type="date"
//                 name="vencimento"
//                 value={form.vencimento}
//                 onChange={handleChange}
//                 required
//               />
//             </div>
//           </div>

//           <div className="form-row">
//             <label>Origem da Conta:</label>
//             <input
//               type="text"
//               name="descricao"
//               placeholder="Ex.: Auto Posto, Internet, Cliente X…"
//               value={form.descricao}
//               onChange={handleChange}
//               required
//             />
//           </div>

//           <div className="form-grid">
//             <div className="form-row">
//               <label>Valor (R$):</label>
//               <input
//                 type="text"
//                 inputMode="numeric"
//                 name="valor"
//                 placeholder="R$ 0,00"
//                 value={form.valor}
//                 onChange={handleValorChange}
//                 required
//               />
//             </div>

//             {showStatusSelector && (
//               <div className="form-row">
//                 <label>Status da Conta:</label>
//                 <select
//                   name="status"
//                   value={form.status}
//                   onChange={handleChange}
//                 >
//                   <option value="Pendente">Pendente</option>
//                   <option value="Pago">Pago</option>
//                 </select>
//               </div>
//             )}
//           </div>

//           {/* ===== Baixa (opcional) ===== */}
//           {isCreate && (
//             <>
//               <hr className="modal-divider" />
//               <div className="form-row">
//                 <label className="checkbox-label">
//                   <input
//                     type="checkbox"
//                     checked={form.applyBaixa}
//                     onChange={(e) => toggleApplyBaixa(e.target.checked)}
//                   />
//                   Aplicar o valor desta criação como <b>baixa</b> em uma conta a receber
//                   (pendente)
//                 </label>
//                 <small className="modal-hint">
//                   Ao marcar, o status desta conta será definido como <b>Pago</b>.
//                 </small>
//               </div>

//               {form.applyBaixa && (
//                 <>
//                   <div className="form-row">
//                     <label>Selecionar conta para baixa:</label>
//                     <select
//                       name="baixaTargetId"
//                       value={form.baixaTargetId}
//                       onChange={handleChange}
//                     >
//                       <option value="">— selecione —</option>
//                       {opcoesBaixa.map((c) => {
//                         const saldo = calcularSaldoPendente(c);
//                         const venc = c.vencimento
//                           ? new Date(c.vencimento).toLocaleDateString("pt-BR")
//                           : "-";
//                         return (
//                           <option key={c.id} value={c.id}>
//                             {`#${c.id} • ${c.descricao || "-"} • Venc. ${venc} • Saldo ${toBRL(
//                               saldo
//                             )}`}
//                           </option>
//                         );
//                       })}
//                     </select>
//                     <small className="modal-hint">
//                       Apenas contas a <b>Receber</b> com saldo pendente aparecem aqui.
//                     </small>
//                   </div>

//                   <div className="form-row">
//                     <label>Observação (opcional):</label>
//                     <input
//                       type="text"
//                       name="baixaObs"
//                       placeholder="Ex.: PIX 12/09, ref. NF 123"
//                       value={form.baixaObs}
//                       onChange={handleChange}
//                     />
//                   </div>
//                 </>
//               )}
//             </>
//           )}

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
// };

// export default ModalConta;


// src/components/ModalConta.jsx
import React, { useEffect, useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { formatarMoedaInput, converterMoedaParaNumero, parseToBackendFloat } from "../../utils/numberUtils";
import "../Visual/modal.css";

const formatarDataSemFuso = (dataString) => {
  if (!dataString) return "-";
  const [ano, mes, dia] = String(dataString).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return dataString;
  return `${dia}/${mes}/${ano}`;
};

const obterDataHojeLocal = () => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

const ModalConta = ({
  isOpen,
  onClose,
  onSave,
  contaParaEditar,
  contasParaBaixa = [],
  showStatusSelector = true,
}) => {
  const [form, setForm] = useState({
    tipo: "Receber",
    descricao: "",
    observacao: "",
    valor: "",
    vencimento: "",
    status: "Pendente",
    applyBaixa: false,
    baixaTargetId: "",
    baixaObs: "",
  });

  const toBRL = (v) =>
    Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Regra de bloqueio exclusiva da conta SYS_Liberação e Manutenção
  const isSysRestrito = useMemo(() => {
    return (
      contaParaEditar?.descricao === "SYS_Liberação e Manutenção" &&
      contaParaEditar?.tipo === "Pagar"
    );
  }, [contaParaEditar]);

  // Calcula limite máximo da data de vencimento: dia 25 do próximo mês
  const maxVencimentoSys = useMemo(() => {
    const hoje = new Date();
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 25);
    const ano = proximoMes.getFullYear();
    const mes = String(proximoMes.getMonth() + 1).padStart(2, "0");
    const dia = String(proximoMes.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }, []);

  const calcularSaldoPendente = (c) => {
    const baixas = (c?.baixas || []).reduce(
      (acc, b) => acc + (Number(b.valor) || 0),
      0
    );
    return (Number(c?.valor) || 0) - baixas;
  };

  const opcoesBaixa = useMemo(
    () =>
      (contasParaBaixa || [])
        .filter((c) => String(c.tipo) === "Receber")
        .filter((c) => String(c.status) !== "Pago")
        .filter((c) => calcularSaldoPendente(c) > 0)
        .sort((a, b) => (a.id ?? 0) - (b.id ?? 0)),
    [contasParaBaixa]
  );

  const isCreate = !contaParaEditar;

  useEffect(() => {
    if (contaParaEditar) {
      setForm({
        tipo: contaParaEditar.tipo || "Receber",
        descricao: contaParaEditar.descricao || "",
        observacao: contaParaEditar.observacao || "",
        valor:
          contaParaEditar.valor !== undefined && contaParaEditar.valor !== null
            ? formatarMoedaInput(
                Math.round(Number(contaParaEditar.valor) * 100)
              )
            : "",
        vencimento: contaParaEditar.vencimento
          ? contaParaEditar.vencimento.slice(0, 10)
          : "",
        status: contaParaEditar.status || "Pendente",
        applyBaixa: false,
        baixaTargetId: "",
        baixaObs: "",
      });
    } else {
      setForm({
        tipo: "Receber",
        descricao: "",
        observacao: "",
        valor: "",
        vencimento: obterDataHojeLocal(),
        status: "Pendente",
        applyBaixa: false,
        baixaTargetId: "",
        baixaObs: "",
      });
    }
  }, [contaParaEditar, isOpen]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && isOpen) onClose?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleValorChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarMoedaInput(valorDigitado);
    setForm((p) => ({ ...p, valor: valorFormatado }));
  };

  const toggleApplyBaixa = (checked) => {
    setForm((p) => ({
      ...p,
      applyBaixa: checked,
      status: checked ? "Pago" : p.status,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const valorNumerico = converterMoedaParaNumero(form.valor);

    if (valorNumerico <= 0) {
      toast.error("Por favor, informe um valor maior que zero.", {
        position: "top-right",
      });
      return;
    }

    if (isCreate && form.applyBaixa && !form.baixaTargetId) {
      toast.error("Selecione a conta a receber na qual deseja aplicar a baixa.", {
        position: "top-right",
      });
      return;
    }

    const valorFormatado = toBRL(valorNumerico);

    const payload = {
      tipo: form.tipo,
      descricao: form.descricao,
      observacao: form.observacao,
      valor: valorNumerico,
      vencimento: form.vencimento,
      status: form.status,
    };

    if (isCreate && form.applyBaixa && form.baixaTargetId) {
      payload.baixaTargetId = Number(form.baixaTargetId);
      if (form.baixaObs?.trim()) payload.baixaObs = form.baixaObs.trim();
    }

    if (isSysRestrito) {
      payload.editada = true;
      payload.valor = 10.00;
      if (form.vencimento) {
        const dia = parseInt(form.vencimento.split("-")[2], 10);
        if (!isNaN(dia) && dia >= 1 && dia <= 31) {
          localStorage.setItem("sys_fatura_dia_vencimento", String(dia));
        }
      }
    }

    if (contaParaEditar?.id != null) payload.id = contaParaEditar.id;

    const toastConfig = {
      position: "top-right",
      autoClose: 4000,
    };

    if (isCreate && form.applyBaixa) {
      toast.success(
        `Baixa adicionada com sucesso! Valor: ${valorFormatado}`,
        toastConfig
      );
    } else if (isSysRestrito) {
      toast.success(
        `Data de vencimento da fatura mensal atualizada com sucesso!`,
        toastConfig
      );
    } else if (form.tipo === "Receber") {
      toast.success(
        `Conta a receber salva com sucesso! Valor: ${valorFormatado}`,
        toastConfig
      );
    } else if (form.tipo === "Pagar") {
      toast.warn(
        `Conta a pagar salva com sucesso! Valor: ${valorFormatado}`,
        toastConfig
      );
    }

    onSave(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>
          {isSysRestrito
            ? "Alterar Vencimento da Fatura"
            : contaParaEditar
            ? "Editar Conta"
            : "Nova Conta"}
        </h2>

        {isSysRestrito && (
          <div
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              border: "1px solid #3b82f6",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "16px",
              color: "#93c5fd",
              fontSize: "0.85rem",
              lineHeight: "1.4",
            }}
          >
            ℹ️ <strong>Configuração do Vencimento Mensal:</strong> Selecione o dia de vencimento desejado para sua fatura mensal (R$ 10,00). As faturas dos próximos meses estarão disponíveis na tela a partir do dia 1º de cada mês com esta data de vencimento.
          </div>
        )}

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-row">
              <label>Tipo:</label>
              <select
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                disabled={isSysRestrito}
                required
              >
                <option value="Receber">Receber</option>
                <option value="Pagar">Pagar</option>
              </select>
            </div>

            <div className="form-row">
              <label>Vencimento:</label>
              <input
                type="date"
                name="vencimento"
                value={form.vencimento}
                onChange={handleChange}
                max={isSysRestrito ? maxVencimentoSys : undefined}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <label>Origem da Conta:</label>
            <input
              type="text"
              name="descricao"
              placeholder="Ex.: Auto Posto, Internet, Cliente X…"
              value={form.descricao}
              onChange={handleChange}
              disabled={isSysRestrito}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label>Valor (R$):</label>
              <input
                type="text"
                inputMode="numeric"
                name="valor"
                placeholder="R$ 0,00"
                value={form.valor}
                onChange={handleValorChange}
                disabled={isSysRestrito}
                required
              />
            </div>

            {showStatusSelector && (
              <div className="form-row">
                <label>Status da Conta:</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  disabled={isSysRestrito}
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Pago">Pago</option>
                </select>
              </div>
            )}
          </div>

          <div className="form-row">
            <label>Observação da Conta (opcional):</label>
            <input
              type="text"
              name="observacao"
              placeholder="Ex.: Referente a contrato de serviços"
              value={form.observacao}
              onChange={handleChange}
              disabled={isSysRestrito}
            />
          </div>

          {/* ===== Seção de Baixa (Disponível apenas na Criação) ===== */}
          {isCreate && (
            <>
              <hr className="modal-divider" />
              <div className="form-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.applyBaixa}
                    onChange={(e) => toggleApplyBaixa(e.target.checked)}
                  />
                  Aplicar o valor desta criação como <b>baixa</b> em uma conta a receber (pendente)
                </label>
                <small className="modal-hint">
                  Ao marcar, o status desta nova conta será definido como <b>Pago</b>.
                </small>
              </div>

              {form.applyBaixa && (
                <>
                  <div className="form-row">
                    <label>Selecionar conta para baixa:</label>
                    <select
                      name="baixaTargetId"
                      value={form.baixaTargetId}
                      onChange={handleChange}
                      required={form.applyBaixa}
                    >
                      <option value="">— selecione —</option>
                      {opcoesBaixa.map((c) => {
                        const saldo = calcularSaldoPendente(c);
                        const venc = formatarDataSemFuso(c.vencimento);
                        return (
                          <option key={c.id} value={c.id}>
                            {`#${c.id} • ${c.descricao || "-"} • Venc. ${venc} • Saldo ${toBRL(
                              saldo
                            )}`}
                          </option>
                        );
                      })}
                    </select>
                    <small className="modal-hint">
                      Apenas contas a <b>Receber</b> com saldo pendente aparecem aqui.
                    </small>
                  </div>

                  <div className="form-row">
                    <label>Observação da Baixa (opcional):</label>
                    <input
                      type="text"
                      name="baixaObs"
                      placeholder="Ex.: PIX ref. parcial NF 123"
                      value={form.baixaObs}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}
            </>
          )}

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

export default ModalConta;