// src/pages/Auth/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { login } from "../../auth/auth";
import { api } from "../../api/client";
import { sendTelegramEvent } from "../../utils/telegram";
import bg from "../../assets/JSA.png";

/**
 * Máscara para WhatsApp: (00) 00000-0000
 */
const formatWhatsApp = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

/**
 * Máscara para CPF: 000.000.000-00
 */
const formatCPF = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

/**
 * Validação de CPF (dígitos verificadores)
 */
const validarCPF = (cpf) => {
  const clean = String(cpf || "").replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
};

/**
 * Gerador de Username (nome.sobrenome)
 */
const gerarUsername = (texto) => {
  if (!texto) return "";
  const semAcentos = String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const partes = semAcentos.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0];
  return `${partes[0]}.${partes[partes.length - 1]}`;
};

export default function Register() {
  const nav = useNavigate();
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [usuario, setUsuario] = useState("");
  const [usuarioCustomizado, setUsuarioCustomizado] = useState(false);
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [filial, setFilial] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [show, setShow] = useState(false);
  const [erroSenha, setErroSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleNomeCompletoChange = (e) => {
    const val = e.target.value;
    setNomeCompleto(val);
    if (!usuarioCustomizado) {
      setUsuario(gerarUsername(val));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validação de campos obrigatórios
    if (
      !nomeCompleto.trim() ||
      !cpf.trim() ||
      !dataNascimento.trim() ||
      !email.trim() ||
      !whatsapp.trim() ||
      !filial ||
      !senha ||
      !confirmarSenha
    ) {
      toast.warn("Por favor, preencha todos os campos obrigatórios e selecione a Filial.");
      return;
    }

    // 2. Validação de Nome Completo (pelo menos duas palavras)
    const partesNome = nomeCompleto.trim().split(/\s+/);
    if (partesNome.length < 2) {
      toast.warn("Por favor, informe seu Nome Completo (Nome e Sobrenome).");
      return;
    }

    // 3. Validação de CPF
    if (!validarCPF(cpf)) {
      toast.error("CPF informado é inválido. Verifique os números digitados.");
      return;
    }

    // 4. Validação de Data de Nascimento
    const anoNasc = new Date(dataNascimento).getFullYear();
    const anoAtual = new Date().getFullYear();
    if (isNaN(anoNasc) || anoNasc < 1920 || anoNasc > anoAtual) {
      toast.warn("Por favor, selecione uma Data de Nascimento válida.");
      return;
    }

    // 5. Validação de WhatsApp
    const digitsWhatsapp = whatsapp.replace(/\D/g, "");
    if (digitsWhatsapp.length < 10) {
      toast.warn("Por favor, insira um número de WhatsApp válido com DDD.");
      return;
    }

    // 6. Validação de Senha
    if (senha !== confirmarSenha) {
      setErroSenha("As senhas não coincidem. Verifique os caracteres digitados.");
      return;
    }

    if (senha.length < 3) {
      toast.warn("A senha deve conter no mínimo 3 caracteres.");
      return;
    }

    setErroSenha("");
    setCarregando(true);

    const targetEmail = email.trim().toLowerCase();
    const nomeFormatado = nomeCompleto.trim();
    const usuarioFinal = (usuario.trim() || gerarUsername(nomeFormatado)).toLowerCase().replace(/\s+/g, ".");
    const cpfFormatado = cpf.trim();
    const cpfLimpo = cpf.replace(/\D/g, "");
    const whatsappFormatado = whatsapp.trim();
    const filialEscolhida = filial || "Filial 1";

    try {
      // 1. Tenta salvar o usuário diretamente no Banco de Dados MySQL via API
      try {
        await api.post("/users", {
          name: nomeFormatado,
          username: usuarioFinal,
          email: targetEmail,
          password: senha,
          whatsapp: whatsappFormatado,
          telefone: cpfFormatado,
          role: "user",
          filial: filialEscolhida,
          permissions: ["chamados"],
        });
      } catch (apiErr) {
        if (apiErr.response && apiErr.response.status === 409) {
          toast.error(apiErr.response.data?.error || "Este usuário ou e-mail já está cadastrado!");
          setCarregando(false);
          return;
        }
        console.warn("Aviso ao sincronizar cadastro com API:", apiErr);
      }

      // 2. Resgata e atualiza a lista no localStorage
      const raw = localStorage.getItem("users");
      const users = raw ? JSON.parse(raw) : [];

      const newUser = {
        id: Date.now(),
        name: nomeFormatado,
        nome: nomeFormatado,
        nomeCompleto: nomeFormatado,
        username: usuarioFinal,
        cpf: cpfFormatado,
        cpfLimpo,
        documento: cpfFormatado,
        dataNascimento,
        email: targetEmail,
        whatsapp: whatsappFormatado,
        filial: filialEscolhida,
        password: senha,
        role: "USER",
        permissions: ["chamados"],
        createdAt: new Date().toISOString(),
      };

      const semEsse = users.filter((u) => {
        const uEmail = String(u.email || "").toLowerCase();
        const uUser = String(u.username || "").toLowerCase();
        return uEmail !== targetEmail && uUser !== usuarioFinal;
      });
      semEsse.push(newUser);
      localStorage.setItem("users", JSON.stringify(semEsse));

      // Salva também nas chaves de conveniência do sistema
      localStorage.setItem("usuario_nome", nomeFormatado);
      localStorage.setItem("usuario_login", usuarioFinal);
      localStorage.setItem("usuario_cpf", cpfFormatado);
      localStorage.setItem("usuario_nascimento", dataNascimento);
      localStorage.setItem("usuario_email", targetEmail);
      localStorage.setItem("usuario_whatsapp", whatsappFormatado);

      // 5. Notifica no Telegram
      try {
        await sendTelegramEvent({
          title: "Novo Usuário Cadastrado",
          emoji: "👤",
          screen: "Registro / Cadastro",
          lines: [
            `Nome Completo: ${nomeFormatado}`,
            `Usuário de Login: ${usuarioFinal}`,
            `CPF: ${cpfFormatado}`,
            `Nascimento: ${dataNascimento.split("-").reverse().join("/")}`,
            `E-mail: ${targetEmail}`,
            `WhatsApp: ${whatsappFormatado}`,
            `Data/Hora: ${new Date().toLocaleString("pt-BR")}`,
          ],
        });
      } catch (tgErr) {
        console.warn("Aviso ao notificar Telegram no cadastro:", tgErr);
      }

      // 6. Efetua a sessão ativa do novo usuário
      await login(newUser);

      sessionStorage.setItem("play_login_intro", "true");

      toast.success("Conta criada com sucesso!", {
        position: "top-right",
        autoClose: 1000,
      });

      // 7. Redireciona imediatamente para o Dashboard (acionando a animação de 3 segundos)
      nav("/dashboard", { replace: true });
    } catch (err) {
      console.error("Erro no cadastro:", err);
      toast.error("Erro ao criar conta. Tente novamente.");
      setCarregando(false);
    }
  };

  const senhasDiferentes =
    confirmarSenha.length > 0 && senha !== confirmarSenha;

  return (
    <div
      className="auth-wrap bg-jsa fade-in-page"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        padding: "24px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="auth-card auth-card--wide"
        style={{
          maxWidth: "540px",
          width: "100%",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
        }}
      >
        <h1 className="auth-title" style={{ color: "#00d2ff" }}>
          JSA Soluções Tecnológicas
        </h1>
        <div className="auth-subtitle">Criar Conta</div>

        <p
          style={{
            fontSize: "0.85rem",
            color: "#94a3b8",
            textAlign: "center",
            marginTop: "-8px",
            marginBottom: "16px",
          }}
        >
          Preencha seus dados para emissão automática de boletos e faturas.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Grid: Nome Completo e Usuário de Login */}
          <div className="auth-grid" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="label required">Nome Completo</label>
              <input
                className="input"
                type="text"
                placeholder="Nome e Sobrenome"
                value={nomeCompleto}
                onChange={handleNomeCompletoChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="label required">Login (nome.sobrenome)</label>
              <input
                className="input"
                type="text"
                placeholder="nome.sobrenome"
                value={usuario}
                onChange={(e) => {
                  setUsuario(e.target.value.toLowerCase().replace(/\s+/g, "."));
                  setUsuarioCustomizado(true);
                }}
                required
                style={{ fontFamily: "monospace", fontWeight: 600, color: "#38bdf8" }}
              />
            </div>
          </div>

          {/* Grid: CPF e Data de Nascimento */}
          <div className="auth-grid" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="label required">CPF</label>
              <input
                className="input"
                type="text"
                placeholder="000.000.000-00"
                maxLength={14}
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label className="label required">Data de Nascimento</label>
              <input
                className="input"
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                required
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>

          {/* Grid: E-mail e WhatsApp */}
          <div className="auth-grid" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="label required">E-mail</label>
              <input
                className="input"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="label required">WhatsApp (com DDD)</label>
              <input
                className="input"
                type="tel"
                placeholder="(00) 00000-0000"
                maxLength={15}
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Campo: Filial (Obrigatório) */}
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="label required">Filial de Atuação</label>
            <select
              className="input"
              value={filial}
              onChange={(e) => setFilial(e.target.value)}
              required
              style={{
                background: "#181d24",
                color: filial ? "#38bdf8" : "#94a3b8",
                fontWeight: filial ? "700" : "normal",
                cursor: "pointer",
              }}
            >
              <option value="" disabled>
                Selecione a sua Filial *
              </option>
              <option value="Filial 1">🏢 Filial 1</option>
              <option value="Filial 2">🏢 Filial 2</option>
              <option value="Filial 3">🏢 Filial 3</option>
              <option value="Filial 4">🏢 Filial 4</option>
              <option value="Filial 5">🏢 Filial 5</option>
              <option value="Filial 6">🏢 Filial 6</option>
              <option value="Filial 7">🏢 Filial 7</option>
            </select>
          </div>

          {/* Grid: Senha e Confirmar Senha */}
          <div className="auth-grid" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="label required">Senha</label>
              <div className="input-with-icon">
                <input
                  className="input"
                  type={show ? "text" : "password"}
                  placeholder="Crie uma senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="eye"
                  onClick={() => setShow((s) => !s)}
                  aria-label="Mostrar/ocultar senha"
                  title={show ? "Ocultar senha" : "Mostrar senha"}
                >
                  {show ? "🫣" : "👁️"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="label required">Confirmar Senha</label>
              <div className="input-with-icon">
                <input
                  className="input"
                  type={show ? "text" : "password"}
                  placeholder="Repita a senha"
                  value={confirmarSenha}
                  onChange={(e) => {
                    setConfirmarSenha(e.target.value);
                    if (erroSenha) setErroSenha("");
                  }}
                  required
                />
                <button
                  type="button"
                  className="eye"
                  onClick={() => setShow((s) => !s)}
                  aria-label="Mostrar/ocultar senha"
                  title={show ? "Ocultar senha" : "Mostrar senha"}
                >
                  {show ? "🫣" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          {senhasDiferentes && (
            <div
              style={{
                color: "#ff5b5b",
                fontSize: "12px",
                marginBottom: "12px",
                textAlign: "center",
              }}
            >
              ⚠️ As senhas não coincidem.
            </div>
          )}

          {erroSenha && (
            <div
              style={{
                color: "#ff5b5b",
                fontSize: "12px",
                marginBottom: "12px",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              {erroSenha}
            </div>
          )}

          <button
            className="btn"
            type="submit"
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #00a3be 100%)",
              color: "#fff",
              opacity: senhasDiferentes || carregando ? 0.6 : 1,
              cursor:
                senhasDiferentes || carregando ? "not-allowed" : "pointer",
              fontWeight: "700",
              fontSize: "1rem",
              padding: "12px",
              width: "100%",
              borderRadius: "6px",
              border: "none",
            }}
            disabled={senhasDiferentes || carregando}
          >
            {carregando ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <div className="auth-foot" style={{ marginTop: 16 }}>
          Já tem conta?{" "}
          <Link to="/login" className="link">
            Entrar
          </Link>
        </div>

        <div
          className="auth-foot"
          style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}
        >
          Copyright © 2026 <b>JSA, Soluções Tecnológicas</b>. All rights
          reserved.
        </div>
      </div>
    </div>
  );
}