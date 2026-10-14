'use strict';
/*
 * ZanFin Server — Sistem Kontrol Keuangan & Pajak Proyek Penelitian.
 * Zero npm dependency: node:http + node:sqlite + node:crypto (Node 22.13+ / Node 24+).
 * Build n Code by zandev.id
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT) || 8085;
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const PUB = path.join(__dirname, '..', 'public');
const SESSION_DAYS = 30;
const MAX_BODY = 25 * 1024 * 1024;
const PULL_BUDGET = 6 * 1024 * 1024;
const COLLS = new Set(['projects', 'inflows', 'expenses', 'team', 'payroll', 'taxes', 'audit', 'reports', 'logs']);

fs.mkdirSync(DATA, { recursive: true });
const db = new DatabaseSync(path.join(DATA, 'zanfin.db'));

db.exec(`
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
PRAGMA busy_timeout=5000;

CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('superadmin','ketua','bendahara','peneliti','asisten')),
  pass TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  perm_rev INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_projects(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pid TEXT NOT NULL,
  PRIMARY KEY(user_id, pid)
);

CREATE TABLE IF NOT EXISTS records(
  coll TEXT NOT NULL,
  id TEXT NOT NULL,
  pid TEXT,
  data TEXT,
  deleted INTEGER NOT NULL DEFAULT 0,
  rev INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by INTEGER,
  PRIMARY KEY(coll, id)
);

CREATE INDEX IF NOT EXISTS records_rev ON records(rev);
CREATE INDEX IF NOT EXISTS records_pid ON records(pid);

CREATE TABLE IF NOT EXISTS counter(k TEXT PRIMARY KEY, v INTEGER NOT NULL);
INSERT OR IGNORE INTO counter(k, v) VALUES ('rev', 0);
`);

function nextRev() {
  db.exec("UPDATE counter SET v = v + 1 WHERE k = 'rev'");
  const row = db.prepare("SELECT v FROM counter WHERE k = 'rev'").get();
  return row ? row.v : 1;
}

function hashPass(pwd) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = crypto.scryptSync(pwd, salt, 64);
  return `${salt}:${buf.toString('hex')}`;
}

function verifyPass(pwd, stored) {
  const [salt, key] = (stored || '').split(':');
  if (!salt || !key) return false;
  const buf = crypto.scryptSync(pwd, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), buf);
}

// Ensure default superadmin if no users exist
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const hash = hashPass('admin123');
  db.prepare(`
    INSERT INTO users (username, name, role, pass, active, created_at)
    VALUES ('admin', 'Astro Administrator', 'superadmin', ?, 1, ?)
  `).run(hash, Date.now());
  console.log('[ZanFin] Akun superadmin default dibuat: username "admin", password "admin123"');
}

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(c => {
      const parts = c.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
}

function getSessionUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.zanfin_session;
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.id, u.username, u.name, u.role, u.active, s.expires
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires > ? AND u.active = 1
  `).get(token, Date.now());
  return row || null;
}

function sendJson(res, status, data, headers = {}) {
  const buf = Buffer.from(JSON.stringify(data));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': buf.length,
    ...headers
  });
  res.end(buf);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks = [];
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > MAX_BODY) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Healthcheck endpoint for Docker / uptime monitors
  if (pathname === '/healthz' || pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, app: 'ZanFin', version: '1.0.0' });
  }

  // Static files handling
  if (!pathname.startsWith('/api/')) {
    let filePath = path.join(PUB, pathname === '/' ? 'index.html' : pathname);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(PUB, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    try {
      const data = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': data.length,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
      });
      res.end(data);
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
    return;
  }

  // API Endpoints
  try {
    if (pathname === '/api/login' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(body.username || '');
      if (!user || !user.active || !verifyPass(body.password || '', user.pass)) {
        return sendJson(res, 401, { error: 'Username atau password salah' });
      }
      const token = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + SESSION_DAYS * 86400 * 1000;
      db.prepare('INSERT INTO sessions (token, user_id, expires, created_at) VALUES (?, ?, ?, ?)').run(token, user.id, expires, Date.now());
      const cookie = `zanfin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
      return sendJson(res, 200, {
        user: { id: user.id, username: user.username, name: user.name, role: user.role }
      }, { 'Set-Cookie': cookie });
    }

    if (pathname === '/api/logout' && req.method === 'POST') {
      const cookies = parseCookies(req);
      if (cookies.zanfin_session) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(cookies.zanfin_session);
      }
      return sendJson(res, 200, { ok: true }, {
        'Set-Cookie': 'zanfin_session=; Path=/; HttpOnly; Max-Age=0'
      });
    }

    if (pathname === '/api/me' && req.method === 'GET') {
      const user = getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
      return sendJson(res, 200, { user });
    }

    if (pathname === '/api/sync' && req.method === 'POST') {
      const user = getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
      const payload = JSON.parse(await readBody(req));
      const clientRev = Number(payload.lastRev) || 0;
      const pushes = Array.isArray(payload.pushes) ? payload.pushes : [];

      // Save pushes inside transaction
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const item of pushes) {
          if (!COLLS.has(item.coll)) continue;
          const rev = nextRev();
          db.prepare(`
            INSERT INTO records (coll, id, pid, data, deleted, rev, updated_at, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(coll, id) DO UPDATE SET
              pid = excluded.pid,
              data = excluded.data,
              deleted = excluded.deleted,
              rev = excluded.rev,
              updated_at = excluded.updated_at,
              updated_by = excluded.updated_by
          `).run(
            item.coll,
            item.id,
            item.pid || null,
            JSON.stringify(item.data || {}),
            item.deleted ? 1 : 0,
            rev,
            Date.now(),
            user.id
          );
        }
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }

      // Fetch server changes newer than clientRev
      const rows = db.prepare(`
        SELECT coll, id, pid, data, deleted, rev, updated_at
        FROM records
        WHERE rev > ?
        ORDER BY rev ASC
        LIMIT 1000
      `).all(clientRev);

      const pulls = rows.map(r => ({
        coll: r.coll,
        id: r.id,
        pid: r.pid,
        data: JSON.parse(r.data || '{}'),
        deleted: Boolean(r.deleted),
        rev: r.rev,
        updated_at: r.updated_at
      }));

      const latestRevRow = db.prepare("SELECT v FROM counter WHERE k = 'rev'").get();
      return sendJson(res, 200, {
        latestRev: latestRevRow ? latestRevRow.v : 0,
        pulls
      });
    }

    if (pathname === '/api/users') {
      const user = getSessionUser(req);
      if (!user || user.role !== 'superadmin') return sendJson(res, 403, { error: 'Hanya Super Admin yang bisa mengelola akun' });
      
      if (req.method === 'GET') {
        const users = db.prepare('SELECT id, username, name, role, active, created_at FROM users ORDER BY id ASC').all();
        return sendJson(res, 200, { users });
      }

      if (req.method === 'POST') {
        const body = JSON.parse(await readBody(req));
        const { id, username, name, role, pass, active } = body;
        if (id) {
          if (pass && pass.trim()) {
            const hash = hashPass(pass.trim());
            db.prepare('UPDATE users SET name = ?, role = ?, pass = ?, active = ? WHERE id = ?').run(
              name || username, role || 'peneliti', hash, active !== false ? 1 : 0, id
            );
          } else {
            db.prepare('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?').run(
              name || username, role || 'peneliti', active !== false ? 1 : 0, id
            );
          }
        } else {
          if (!username || !pass) {
            return sendJson(res, 400, { error: 'Username dan password wajib diisi' });
          }
          const hash = hashPass(pass.trim());
          try {
            db.prepare('INSERT INTO users (username, name, role, pass, active, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
              username.toLowerCase().trim(), name || username, role || 'peneliti', hash, active !== false ? 1 : 0, Date.now()
            );
          } catch (e) {
            if (e.message && e.message.includes('UNIQUE')) {
              return sendJson(res, 400, { error: 'Username sudah digunakan' });
            }
            throw e;
          }
        }
        const users = db.prepare('SELECT id, username, name, role, active, created_at FROM users ORDER BY id ASC').all();
        return sendJson(res, 200, { ok: true, users });
      }
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('[ZanFin API Error]', err);
    return sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
});

// CLI command mode
const args = process.argv.slice(2);
if (args.length > 0) {
  const cmd = args[0];
  if (cmd === 'create-superadmin' || cmd === 'create-user') {
    const [_, username, pass, name, role] = args;
    if (!username || !pass) {
      console.log('Usage: node server.js create-superadmin <username> <pass> [name]');
      process.exit(1);
    }
    const userRole = cmd === 'create-superadmin' ? 'superadmin' : (role || 'bendahara');
    const hash = hashPass(pass);
    db.prepare(`
      INSERT INTO users (username, name, role, pass, active, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
      ON CONFLICT(username) DO UPDATE SET pass = excluded.pass, role = excluded.role, name = excluded.name
    `).run(username, name || username, userRole, hash, Date.now());
    console.log(`[ZanFin] Akun ${username} (${userRole}) berhasil disimpan.`);
    process.exit(0);
  } else if (cmd === 'users') {
    const users = db.prepare('SELECT id, username, name, role, active FROM users').all();
    console.table(users);
    process.exit(0);
  }
}

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 ZanFin Server berjalan di http://localhost:${PORT}`);
  console.log(`🏛️ Sistem Kontrol Keuangan & Pajak Penelitian (Coretax)`);
  console.log(`✨ Build n Code by zandev.id`);
  console.log(`======================================================\n`);
});
