// src/pages/Auth/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import emailjs from '@emailjs/browser';
import 'react-toastify/dist/ReactToastify.css';
import '../../components/Visual/styles.css';
import bg from '../../assets/JSA.png';
import { sendTelegramEvent } from '../../utils/telegram';

// CONFIGURAÇÕES DO EMAILJS
// Dica: Para produção, armazene esses valores no seu arquivo .env
const EMAILJS_SERVICE_ID = "jsasolucoestecnologicas";
const EMAILJS_TEMPLATE_ID = "template_vrnfmrt";
const EMAILJS_PUBLIC_KEY = "YUEhSf74n7z0_XT30";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const bgStyle = {
    backgroundImage: `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.65)), url(${bg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
  };

  // Gera uma senha temporária aleatória de 8 caracteres
  const generateTempPassword = () => {
    return Math.random().toString(36).slice(-8).toUpperCase();
  };

  const handleResetRequest = (mail) => {
    try {
      const raw = localStorage.getItem('users');
      const arr = raw ? JSON.parse(raw) : [];
      const idx = arr.findIndex((u) => String(u.email || '').toLowerCase() === String(mail).toLowerCase());

      const tempPassword = generateTempPassword();

      if (idx !== -1) {
        // Atualiza usuário existente marcando a flag para trocar no login
        arr[idx] = { 
          ...arr[idx], 
          password: tempPassword, 
          mustChangePassword: true 
        };
        localStorage.setItem('users', JSON.stringify(arr));
      } else {
        // Caso o usuário não exista no array de mock, cria a entrada temporária
        arr.push({
          email: mail,
          password: tempPassword,
          mustChangePassword: true
        });
        localStorage.setItem('users', JSON.stringify(arr));
      }

      return tempPassword;
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetEmail = email.trim();

    if (!targetEmail) {
      toast.warn('Informe seu e-mail.');
      return;
    }

    setLoading(true);
    try {
      const tempPassword = handleResetRequest(targetEmail);

      if (!tempPassword) {
        toast.error('Erro ao gerar senha provisória.');
        setLoading(false);
        return;
      }

// 1. Envio do e-mail real via EmailJS (usando jsa.tech.jsa@gmail.com)
      const templateParams = {
        to_email: targetEmail,
        temp_password: tempPassword,
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      // 2. Envia notificação de controle/log para o Telegram
      try {
        await sendTelegramEvent({
          title: 'Senha Provisória Enviada por E-mail',
          emoji: '📧',
          lines: [
            `E-mail: ${targetEmail}`,
            `Senha Provisória: ${tempPassword}`,
            `Remetente: jsa.tech.jsa@gmail.com`,
            `Data/Hora: ${new Date().toLocaleString('pt-BR')}`
          ],
        });
      } catch {
        /* Notificação silenciosa caso falhe */
      }

      toast.success('Senha provisória enviada com sucesso para o seu e-mail!');

      // Redireciona para o login
      setTimeout(() => {
        navigate('/login');
      }, 2500);

    } catch (err) {
      console.error('[ForgotPassword] Erro ao enviar e-mail:', err);
      // toast.error('Não foi possível enviar o e-mail de recuperação. Tente novamente.');
      toast.error('Função ainda em desenvolvimento, FUNÇÃO EM TESTE.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap fade-in-page" style={bgStyle}>
      <div className="auth-card auth-card--wide">
        <h1 className="auth-title" style={{ color: '#ff5b5b' }}>Recuperar Senha</h1>
        <p className="auth-subtitle">
          Informe seu e-mail para receber uma senha provisória.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="label required">E-mail</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              placeholder="nome@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button className="btn btn--primary" type="submit" disabled={loading} style={{ background: '#ff5b5b', color: '#111' }}>
            {loading ? 'Enviando…' : 'Enviar senha provisória'}
          </button>

          <div className="auth-foot" style={{ marginTop: 16 }}>
            <Link className="link" to="/login">
              Voltar ao login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}


// import React, { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { toast } from 'react-toastify';
// import emailjs from '@emailjs/browser';
// import 'react-toastify/dist/ReactToastify.css';
// import '../../styles.css';
// import bg from '../../assets/JSA.png';
// import { sendTelegramEvent } from '../../utils/telegram';

// // Configurações do EmailJS
// const EMAILJS_SERVICE_ID = 'jsasolucoestecnologicas';
// const EMAILJS_TEMPLATE_ID = 'template_vrnfmrt';
// const EMAILJS_PUBLIC_KEY = 'YUEhSf74n7z0_XT30';

// export default function ForgotPassword() {
//   const navigate = useNavigate();
//   const [email, setEmail] = useState('');
//   const [loading, setLoading] = useState(false);

//   const bgStyle = {
//     backgroundImage: `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.65)), url(${bg})`,
//     backgroundSize: 'cover',
//     backgroundPosition: 'center center',
//   };

//   const generateTempPassword = () => {
//     return Math.random().toString(36).slice(-8).toUpperCase();
//   };

//   const handleResetRequest = (mail) => {
//     try {
//       const raw = localStorage.getItem('users');
//       const arr = raw ? JSON.parse(raw) : [];
//       const idx = arr.findIndex((u) => String(u.email || '').toLowerCase() === String(mail).toLowerCase());

//       const tempPassword = generateTempPassword();

//       if (idx !== -1) {
//         arr[idx] = { 
//           ...arr[idx], 
//           password: tempPassword, 
//           mustChangePassword: true 
//         };
//         localStorage.setItem('users', JSON.stringify(arr));
//       } else {
//         arr.push({
//           email: mail,
//           password: tempPassword,
//           mustChangePassword: true
//         });
//         localStorage.setItem('users', JSON.stringify(arr));
//       }

//       return tempPassword;
//     } catch {
//       return null;
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const targetEmail = email.trim();

//     if (!targetEmail) {
//       toast.warn('Informe seu e-mail.');
//       return;
//     }

//     setLoading(true);
//     try {
//       const tempPassword = handleResetRequest(targetEmail);

//       if (!tempPassword) {
//         toast.error('Erro ao gerar senha provisória.');
//         setLoading(false);
//         return;
//       }

//       // Envio do e-mail via EmailJS (usando chave 'email' para bater com {{email}} do template)
//       const templateParams = {
//         email: targetEmail,
//         temp_password: tempPassword,
//       };

//       await emailjs.send(
//         EMAILJS_SERVICE_ID,
//         EMAILJS_TEMPLATE_ID,
//         templateParams,
//         EMAILJS_PUBLIC_KEY
//       );

//       // Notificação secundária para o Telegram
//       try {
//         await sendTelegramEvent({
//           title: 'Senha Provisória Enviada por E-mail',
//           emoji: '📧',
//           lines: [
//             `E-mail: ${targetEmail}`,
//             `Senha Provisória: ${tempPassword}`,
//             `Remetente: jsa.tech.jsa@gmail.com`,
//             `Data/Hora: ${new Date().toLocaleString('pt-BR')}`
//           ],
//         });
//       } catch {
//         /* silencioso */
//       }

//       toast.success('Senha provisória enviada para seu e-mail!');

//       setTimeout(() => {
//         navigate('/login');
//       }, 2500);

//     } catch (err) {
//       console.error('[ForgotPassword] Erro ao enviar e-mail:', err);
//       toast.error('Não foi possível enviar o e-mail de recuperação.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="auth-wrap" style={bgStyle}>
//       <div className="auth-card auth-card--wide">
//         <h1 className="auth-title" style={{ color: '#ff5b5b' }}>Recuperar Senha</h1>
//         <p className="auth-subtitle">
//           Informe seu e-mail para receber uma senha provisória.
//         </p>

//         <form onSubmit={handleSubmit}>
//           <div className="form-group" style={{ marginBottom: 16 }}>
//             <label className="label required">E-mail</label>
//             <input
//               className="input"
//               type="email"
//               autoComplete="email"
//               placeholder="nome@empresa.com"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//             />
//           </div>

//           <button className="btn btn--primary" type="submit" disabled={loading} style={{ background: '#ff5b5b', color: '#111' }}>
//             {loading ? 'Enviando…' : 'Enviar senha provisória'}
//           </button>

//           <div className="auth-foot" style={{ marginTop: 16 }}>
//             <Link className="link" to="/login">
//               Voltar ao login
//             </Link>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }