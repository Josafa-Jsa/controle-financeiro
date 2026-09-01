// src/components/BannerLicenca.jsx
import React from 'react';

const BannerLicenca = ({ usuarioBloqueado, onAbrirPagamento }) => {
  if (!usuarioBloqueado) return null;

  return (
    <div
      style={{
        backgroundColor: '#dc3545',
        color: '#ffffff',
        padding: '10px 16px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '0.88rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        zIndex: 10000,
        position: 'relative',
        width: '100%',
      }}
    >
      <span>
        ⚠️ Licenciamento pendente. Regularize o pagamento para manter o acesso completo às funcionalidades do sistema.
      </span>
      <button
        type="button"
        onClick={onAbrirPagamento}
        style={{
          backgroundColor: '#ffffff',
          color: '#dc3545',
          border: 'none',
          padding: '4px 12px',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '0.8rem',
          textTransform: 'uppercase',
        }}
      >
        Regularizar Agora
      </button>
    </div>
  );
};

export default BannerLicenca;