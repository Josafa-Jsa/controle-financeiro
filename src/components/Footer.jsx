import React from 'react';
import { getUser } from '../auth/auth';

const Footer = () => {
  const anoAtual = new Date().getFullYear();
  const u = getUser() || {};
  const perms = Array.isArray(u.permissions || u.permissoes)
    ? (u.permissions || u.permissoes)
    : [];
  const isBigMaster = perms.includes('prevencao') || perms.includes('uniformes');

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
      Copyright © {anoAtual}{' '}
      <strong style={{ color: isBigMaster ? '#00d2ff' : '#ff5252' }}>
        {isBigMaster ? '🛒 Big Master Supermercados' : 'JSA Soluções Tecnológicas'}
      </strong>
      . All rights reserved.
    </footer>
  );
};

export default Footer;
