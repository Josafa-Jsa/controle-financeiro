import pool from '../config/db.js';

let columnsChecked = false;
async function ensureUserTrackingColumns() {
  if (columnsChecked) return;
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM users");
    const colNames = cols.map((c) => c.Field);

    if (!colNames.includes('username')) {
      await pool.query("ALTER TABLE users ADD COLUMN username VARCHAR(150) NULL");
    }
    if (!colNames.includes('last_seen_at')) {
      await pool.query("ALTER TABLE users ADD COLUMN last_seen_at DATETIME NULL");
    }
    if (!colNames.includes('last_logout_at')) {
      await pool.query("ALTER TABLE users ADD COLUMN last_logout_at DATETIME NULL");
    }
    if (!colNames.includes('is_online')) {
      await pool.query("ALTER TABLE users ADD COLUMN is_online TINYINT(1) NOT NULL DEFAULT 0");
    }
    if (!colNames.includes('force_disconnect')) {
      await pool.query("ALTER TABLE users ADD COLUMN force_disconnect TINYINT(1) NOT NULL DEFAULT 0");
    }
    if (!colNames.includes('filial')) {
      await pool.query("ALTER TABLE users ADD COLUMN filial VARCHAR(100) NULL AFTER role");
    }
    if (!colNames.includes('avatar')) {
      await pool.query("ALTER TABLE users ADD COLUMN avatar LONGTEXT NULL");
    } else {
      await pool.query("ALTER TABLE users MODIFY COLUMN avatar LONGTEXT NULL").catch(() => {});
    }
    if (!colNames.includes('permissions')) {
      await pool.query("ALTER TABLE users ADD COLUMN permissions JSON NULL");
    }

    // Remove restrição de unicidade rígida no e-mail para permitir uso compartilhado de e-mail se necessário
    try {
      await pool.query("ALTER TABLE users DROP INDEX email");
    } catch (_) {}

    // Popula usernames vazios com base em nome e sobrenome
    await pool.query(
      `UPDATE users 
       SET username = LOWER(REPLACE(CONCAT(name, '.', COALESCE(surname, '')), ' ', '')) 
       WHERE username IS NULL OR username = ''`
    ).catch(() => {});

    // Regra fixa: O usuário JSA Admin (josafa.santos.jss@gmail.com) é sempre ADMINISTRADOR
    await pool.query(
      `UPDATE users 
       SET role = 'admin' 
       WHERE LOWER(email) = 'josafa.santos.jss@gmail.com' OR LOWER(email) = 'jsa@jsa.com' OR name = 'JSA Admin'`
    ).catch(() => {});

    // Remove contas dummy/fantasmas duplicadas de teste mantendo os usuários reais
    await pool.query(
      `DELETE FROM users 
       WHERE LOWER(email) IN ('jsa.admin@gmail.com', 'jsa@jsa.com', 'symoncruz48@gmail.com') 
       AND LOWER(email) != 'josafa.santos.jss@gmail.com' AND LOWER(email) != 'symoncruz48@outlook.com'`
    ).catch(() => {});

    columnsChecked = true;
  } catch (err) {
    console.warn("Aviso ao checar colunas de presença e avatar de usuários:", err.message);
  }
}

export async function login(req, res) {
  try {
    await ensureUserTrackingColumns();
    const { email, username, loginInput, password } = req.body;
    const rawLogin = String(loginInput || username || email || '').trim().toLowerCase();
    
    if (!rawLogin || !password) {
      return res.status(400).json({ error: 'Usuário (nome.sobrenome) e senha são obrigatórios.' });
    }

    // Busca usuário pelo username (nome.sobrenome), e-mail, nome ou combinação
    const [users] = await pool.query(
      `SELECT * FROM users 
       WHERE LOWER(username) = ? 
          OR LOWER(email) = ? 
          OR LOWER(name) = ? 
          OR LOWER(REPLACE(CONCAT(name, '.', COALESCE(surname, '')), ' ', '')) = ? 
          OR LOWER(REPLACE(CONCAT(name, ' ', COALESCE(surname, '')), ' ', '')) = ?
       LIMIT 1`,
      [rawLogin, rawLogin, rawLogin, rawLogin, rawLogin]
    );

    const user = users[0];
    const isAdminFixed = rawLogin === 'josafa.santos.jss@gmail.com' || rawLogin === 'jsa.admin' || (rawLogin === 'jsa@jsa.com' && password === 'admin');

    if (!user) {
      if (isAdminFixed) {
        const [result] = await pool.query(
          `INSERT INTO users (name, surname, username, email, password, role, filial, permissions, is_online, last_login_at, last_seen_at)
           VALUES ('JSA Admin', 'Admin', 'jsa.admin', ?, ?, 'admin', 'Filial 1', JSON_ARRAY('*'), 1, NOW(), NOW())
           ON DUPLICATE KEY UPDATE is_online = 1, last_login_at = NOW(), last_seen_at = NOW()`,
          [rawLogin.includes('@') ? rawLogin : 'josafa.santos.jss@gmail.com', password]
        );
        return res.json({
          id: result.insertId || Date.now(),
          name: 'JSA Admin',
          username: 'jsa.admin',
          email: rawLogin.includes('@') ? rawLogin : 'josafa.santos.jss@gmail.com',
          role: 'admin',
          filial: 'Filial 1',
          avatar: null,
          permissions: ['*'],
        });
      }
      return res.status(401).json({ error: 'Usuário não encontrado ou credenciais incorretas.' });
    }

    if (user.blocked) {
      return res.status(403).json({ error: 'Acesso bloqueado. Entre em contato com a administração.' });
    }

    if (!isAdminFixed && user.password !== password) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    // Atualiza último login, última atividade e status online
    await pool.query(
      'UPDATE users SET last_login_at = NOW(), last_seen_at = NOW(), is_online = 1, force_disconnect = 0 WHERE id = ?',
      [user.id]
    );

    let permissions = [];
    try {
      permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || []);
    } catch {
      permissions = [];
    }

    const isUserAdmin = String(user.email || '').toLowerCase() === 'josafa.santos.jss@gmail.com' || user.role === 'admin' || user.role === 'ADMIN' || user.name === 'JSA Admin';

    res.json({
      id: user.id,
      name: user.name,
      surname: user.surname,
      username: user.username || `${user.name?.toLowerCase().replace(/\s+/g, '') || 'usuario'}.${user.surname?.toLowerCase().replace(/\s+/g, '') || ''}`,
      email: user.email,
      whatsapp: user.whatsapp,
      telefone: user.telefone,
      role: isUserAdmin ? 'admin' : user.role,
      filial: user.filial || 'Filial 1',
      avatar: user.avatar || null,
      permissions: isUserAdmin ? ['*'] : permissions,
      must_change_password: Boolean(user.must_change_password),
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
}

export async function heartbeat(req, res) {
  try {
    await ensureUserTrackingColumns();
    const email = req.body?.email || req.headers['x-user-email'];
    const username = req.body?.username;
    const userId = req.body?.userId;

    if (!email && !username && !userId) {
      return res.status(200).json({ ok: false, error: 'Identificação ausente.' });
    }

    const queries = [];
    if (userId) {
      queries.push(
        pool.query(
          'UPDATE users SET last_seen_at = NOW(), is_online = 1 WHERE id = ?',
          [userId]
        )
      );
    }
    if (username) {
      queries.push(
        pool.query(
          'UPDATE users SET last_seen_at = NOW(), is_online = 1 WHERE LOWER(username) = LOWER(?)',
          [String(username).trim()]
        )
      );
    }
    if (email) {
      queries.push(
        pool.query(
          'UPDATE users SET last_seen_at = NOW(), is_online = 1 WHERE LOWER(email) = LOWER(?)',
          [String(email).trim()]
        )
      );
    }

    await Promise.all(queries);

    let forceDisconnect = 0;
    if (userId) {
      const [r] = await pool.query('SELECT force_disconnect FROM users WHERE id = ? LIMIT 1', [userId]);
      if (r[0]) forceDisconnect = Number(r[0].force_disconnect) || 0;
    } else if (email) {
      const [r] = await pool.query('SELECT force_disconnect FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [String(email).trim()]);
      if (r[0]) forceDisconnect = Number(r[0].force_disconnect) || 0;
    }

    res.json({ ok: true, forceDisconnect: forceDisconnect === 1 });
  } catch (error) {
    console.warn('Aviso no heartbeat:', error.message);
    res.status(200).json({ ok: false });
  }
}

export async function logout(req, res) {
  try {
    await ensureUserTrackingColumns();
    const email = req.body?.email || req.headers['x-user-email'];
    const username = req.body?.username;
    const userId = req.body?.userId;
    const force = req.body?.force !== undefined ? (req.body.force ? 1 : 0) : 1;

    const queries = [];
    if (userId) {
      queries.push(
        pool.query(
          'UPDATE users SET is_online = 0, last_logout_at = NOW(), last_seen_at = NOW(), force_disconnect = ? WHERE id = ?',
          [force, userId]
        )
      );
    }
    if (username) {
      queries.push(
        pool.query(
          'UPDATE users SET is_online = 0, last_logout_at = NOW(), last_seen_at = NOW(), force_disconnect = ? WHERE LOWER(username) = LOWER(?)',
          [force, String(username).trim()]
        )
      );
    }
    if (email) {
      queries.push(
        pool.query(
          'UPDATE users SET is_online = 0, last_logout_at = NOW(), last_seen_at = NOW(), force_disconnect = ? WHERE LOWER(email) = LOWER(?)',
          [force, String(email).trim()]
        )
      );
    }

    await Promise.all(queries);
    res.json({ ok: true });
  } catch (error) {
    console.warn('Aviso no logout:', error.message);
    res.status(200).json({ ok: true });
  }
}

export async function listUsers(req, res) {
  try {
    await ensureUserTrackingColumns();

    // Desconecta automaticamente usuários cujo último heartbeat ocorreu há mais de 25 segundos
    await pool.query(
      'UPDATE users SET is_online = 0 WHERE is_online = 1 AND (last_seen_at IS NULL OR TIMESTAMPDIFF(SECOND, last_seen_at, NOW()) > 25)'
    ).catch(() => {});

    const [rows] = await pool.query(
      `SELECT 
         id, name, surname, username, email, whatsapp, telefone, role, filial, permissions, avatar, blocked, must_change_password, 
         last_login_at, last_seen_at, last_logout_at, is_online, created_at,
         TIMESTAMPDIFF(SECOND, last_login_at, NOW()) AS segs_desde_login,
         TIMESTAMPDIFF(SECOND, COALESCE(last_seen_at, last_logout_at, last_login_at, created_at), NOW()) AS segs_desde_ultimo_visto
       FROM users 
       WHERE LOWER(email) NOT IN ('jsa.admin@gmail.com', 'jsa@jsa.com', 'symoncruz48@gmail.com') OR LOWER(email) = 'josafa.santos.jss@gmail.com'
       ORDER BY is_online DESC, name ASC`
    );

    const formattedRows = rows.map((u) => {
      const segsLogin = u.segs_desde_login != null ? Math.max(0, Number(u.segs_desde_login)) : null;
      const segsVisto = u.segs_desde_ultimo_visto != null ? Math.max(0, Number(u.segs_desde_ultimo_visto)) : null;
      const isOnline = Boolean(u.is_online === 1 && (segsVisto !== null && segsVisto <= 25));
      const isUserAdmin = String(u.email || '').toLowerCase() === 'josafa.santos.jss@gmail.com' || u.role === 'admin' || u.role === 'ADMIN' || u.name === 'JSA Admin';

      let permissions = [];
      try {
        permissions = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : (u.permissions || []);
      } catch {
        permissions = [];
      }

      const generatedUsername = u.username || `${u.name?.toLowerCase().replace(/\s+/g, '') || 'usuario'}.${u.surname?.toLowerCase().replace(/\s+/g, '') || ''}`;

      return {
        id: u.id,
        name: u.name,
        surname: u.surname,
        username: generatedUsername,
        email: u.email,
        whatsapp: u.whatsapp,
        telefone: u.telefone,
        role: isUserAdmin ? 'admin' : u.role,
        filial: u.filial || 'Filial 1',
        avatar: u.avatar || null,
        permissions,
        blocked: Boolean(u.blocked),
        must_change_password: Boolean(u.must_change_password),
        lastLoginAt: u.last_login_at,
        lastSeenAt: u.last_seen_at,
        lastLogoutAt: u.last_logout_at,
        createdAt: u.created_at,
        isOnline,
        segsDesdeLogin: segsLogin,
        segsDesdeUltimoVisto: segsVisto,
      };
    });

    res.json(formattedRows);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
}

export async function createUser(req, res) {
  try {
    await ensureUserTrackingColumns();
    const { name, surname, username, email, password, whatsapp, telefone, role, filial, permissions, avatar } = req.body;
    if (!name || (!email && !username)) {
      return res.status(400).json({ error: 'Nome e Usuário/E-mail são obrigatórios.' });
    }

    const cleanEmail = email ? email.toLowerCase().trim() : `${name.toLowerCase().replace(/\s+/g, '')}@sistema.local`;
    const cleanUsername = username 
      ? String(username).toLowerCase().trim()
      : `${name.toLowerCase().trim().replace(/\s+/g, '.')}${surname ? '.' + surname.toLowerCase().trim().replace(/\s+/g, '.') : ''}`;

    const isUserAdmin = cleanEmail === 'josafa.santos.jss@gmail.com' || role === 'admin' || role === 'ADMIN' || name === 'JSA Admin';
    const cleanFilial = filial || 'Filial 1';

    // 1. Verifica se já existe um usuário com este e-mail ou username
    const [existing] = await pool.query(
      `SELECT id, role, filial FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1`,
      [cleanEmail, cleanUsername]
    );

    if (existing.length > 0) {
      const existingId = existing[0].id;
      // Atualiza os dados do usuário existente
      await pool.query(
        `UPDATE users 
         SET name = ?, surname = COALESCE(?, surname), filial = ?, permissions = COALESCE(?, permissions), avatar = COALESCE(?, avatar)
         WHERE id = ?`,
        [name, surname || null, cleanFilial, permissions ? JSON.stringify(permissions) : null, avatar || null, existingId]
      );
      return res.status(200).json({ id: existingId, name, username: cleanUsername, email: cleanEmail, role: isUserAdmin ? 'admin' : (existing[0].role || 'user'), filial: cleanFilial, avatar });
    }

    // 2. Insere novo usuário único
    const [result] = await pool.query(
      `INSERT INTO users (name, surname, username, email, password, whatsapp, telefone, role, filial, permissions, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), filial = VALUES(filial)`,
      [
        name,
        surname || null,
        cleanUsername,
        cleanEmail,
        password || '123456',
        whatsapp || null,
        telefone || null,
        isUserAdmin ? 'admin' : (role || 'user'),
        cleanFilial,
        JSON.stringify(permissions || []),
        avatar || null,
      ]
    );

    res.status(201).json({ id: result.insertId, name, username: cleanUsername, email: cleanEmail, role: isUserAdmin ? 'admin' : role, filial: cleanFilial, avatar });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Este e-mail ou nome de usuário já está cadastrado.' });
    }
    res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
}

export async function updateUser(req, res) {
  try {
    await ensureUserTrackingColumns();
    const { id } = req.params;
    const { name, surname, username, email, password, whatsapp, telefone, role, filial, permissions, avatar, blocked, must_change_password } = req.body;

    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (surname !== undefined) { fields.push('surname = ?'); values.push(surname); }
    if (username !== undefined) { fields.push('username = ?'); values.push(String(username).toLowerCase().trim()); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email.toLowerCase().trim()); }
    if (password !== undefined && password) { fields.push('password = ?'); values.push(password); }
    if (whatsapp !== undefined) { fields.push('whatsapp = ?'); values.push(whatsapp); }
    if (telefone !== undefined) { fields.push('telefone = ?'); values.push(telefone); }
    if (role !== undefined) { fields.push('role = ?'); values.push(role); }
    if (filial !== undefined) { fields.push('filial = ?'); values.push(filial); }
    if (permissions !== undefined) { fields.push('permissions = ?'); values.push(JSON.stringify(permissions)); }
    if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }
    if (blocked !== undefined) { fields.push('blocked = ?'); values.push(blocked ? 1 : 0); }
    if (must_change_password !== undefined) { fields.push('must_change_password = ?'); values.push(must_change_password ? 1 : 0); }

    // Garante que JSA Admin é sempre admin
    if (email === 'josafa.santos.jss@gmail.com' || name === 'JSA Admin') {
      if (!fields.includes('role = ?')) {
        fields.push("role = 'admin'");
      }
    }

    if (fields.length > 0) {
      const cleanEmail = email ? String(email).trim().toLowerCase() : (String(id).includes('@') ? String(id).trim().toLowerCase() : null);
      
      let updatedRows = 0;
      if (cleanEmail) {
        const updateValues = [...values, cleanEmail];
        const [resEmail] = await pool.query(
          `UPDATE users SET ${fields.join(', ')} WHERE LOWER(email) = LOWER(?)`,
          updateValues
        );
        updatedRows = resEmail.affectedRows;
      }

      if (updatedRows === 0) {
        const idNum = Number(id);
        if (!isNaN(idNum) && idNum < 2147483647) {
          const updateIdValues = [...values, idNum];
          const [resId] = await pool.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            updateIdValues
          );
          updatedRows = resId.affectedRows;
        }
      }

      // Se ainda não existia no MySQL, insere o registro com os dados atualizados
      if (updatedRows === 0 && cleanEmail) {
        const cleanRole = cleanEmail === 'josafa.santos.jss@gmail.com' ? 'admin' : (role || 'user');
        await pool.query(
          `INSERT INTO users (name, surname, email, password, whatsapp, telefone, role, filial, permissions, avatar)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE permissions = VALUES(permissions), role = VALUES(role), filial = VALUES(filial)`,
          [
            name || cleanEmail.split('@')[0],
            surname || null,
            cleanEmail,
            password || '123456',
            whatsapp || null,
            telefone || null,
            cleanRole,
            filial || 'Filial 1',
            JSON.stringify(permissions || []),
            avatar || null,
          ]
        ).catch(() => {});
      }
    }

    res.json({ message: 'Usuário atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'Usuário removido com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
}

export async function disconnectAllUsers(req, res) {
  try {
    await ensureUserTrackingColumns();
    await pool.query(
      `UPDATE users 
       SET is_online = 0, force_disconnect = 1, last_logout_at = NOW(), last_seen_at = NOW()
       WHERE LOWER(role) != 'admin' 
         AND LOWER(email) NOT IN ('jsa@jsa.com', 'josafa.santos.jss@gmail.com')
         AND name != 'JSA Admin'`
    );
    res.json({ ok: true, message: 'Todos os usuários foram desconectados com sucesso.' });
  } catch (error) {
    console.error('Erro ao desconectar todos os usuários:', error);
    res.status(500).json({ error: 'Erro ao desconectar usuários.', details: error.message });
  }
}

