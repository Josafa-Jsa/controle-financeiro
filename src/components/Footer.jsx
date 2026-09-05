import React from 'react';

const Footer = () => {
  const anoAtual = new Date().getFullYear();

  return (
    <footer
      style={{
        marginTop: 'auto',
        textAlign: 'left',
        fontSize: '0.85rem',
        color: '#71717a',
        borderTop: '1px solid #27272a',
        padding: '18px 24px',
        background: '#121214',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      Copyright © {anoAtual || 2026}{' '}
      <strong style={{ color: '#ff5252' }}>
        JSA Soluções Tecnológicas
      </strong>
      . All rights reserved.
    </footer>
  );
};

export default Footer;
