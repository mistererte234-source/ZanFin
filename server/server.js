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
  role TEXT NOT NULL,
  avatar TEXT,
  pass TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  perm_rev INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS roles(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tag TEXT,
  icon TEXT,
  badge_class TEXT,
  description TEXT,
  perms TEXT,
  system INTEGER NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS audit_logs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  role TEXT,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  device_info TEXT,
  gps_lat REAL,
  gps_lng REAL,
  gps_acc REAL,
  metadata TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
`);

try {
  db.exec("ALTER TABLE users ADD COLUMN avatar TEXT;");
} catch (e) {}

// Migrate users table if it has restrictive CHECK constraint
try {
  const usersSqlRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
  const usersSql = usersSqlRow ? usersSqlRow.sql : '';
  if (usersSql && usersSql.includes("CHECK(role IN")) {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      BEGIN TRANSACTION;
      CREATE TABLE users_new(
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        avatar TEXT,
        pass TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        perm_rev INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );
      INSERT INTO users_new (id, username, name, role, pass, active, perm_rev, created_at)
        SELECT id, username, name, role, pass, active, perm_rev, created_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
      COMMIT;
      PRAGMA foreign_keys=ON;
    `);
    console.log('[ZanFin] Migrasi schema users berhasil: batas CHECK constraint role telah dihapus.');
  }
} catch (e) {
  console.error('[ZanFin] Error migrasi schema users:', e.message);
}

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

// Ensure default role accounts exist (Superadmin, Admin Operasional, Ketua, Bendahara, Peneliti)
const defaultSeedUsers = [
  { username: 'superadmin', name: 'Zandev Superadmin (Master)', role: 'superadmin', pass: 'superadmin123' },
  { username: 'admin', name: 'Administrator Operasional', role: 'admin', pass: 'admin123' },
  { username: 'ketua', name: 'Dr. Siti Rahayu Nadhiroh, S.KM., M.Kes.', role: 'ketua', pass: 'ketua123' },
  { username: 'bendahara', name: 'Siti Rahmawati, S.E. (Bendahara)', role: 'bendahara', pass: 'bendahara123' },
  { username: 'peneliti', name: 'Allisa Nadhira, S.Gz.', role: 'peneliti', pass: 'peneliti123' }
];

for (const u of defaultSeedUsers) {
  const existing = db.prepare('SELECT id, role FROM users WHERE username = ? COLLATE NOCASE').get(u.username);
  if (!existing) {
    const hash = hashPass(u.pass);
    db.prepare(`
      INSERT INTO users (username, name, role, pass, active, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(u.username, u.name, u.role, hash, Date.now());
    console.log(`[ZanFin] Akun default dibuat: ${u.username} (${u.role}), pass: ${u.pass}`);
  } else if (u.username === 'admin' && existing.role === 'superadmin') {
    db.prepare("UPDATE users SET role = 'admin', name = 'Administrator Operasional' WHERE id = ?").run(existing.id);
    console.log(`[ZanFin] Akun admin dimigrasikan ke role 'admin' (Administrator Operasional)`);
  }
}

// Seed default system roles
const defaultRoles = [
  { id: 'superadmin', name: 'Super Admin', tag: 'Master', icon: '👑', badge_class: 'bad', description: 'Semua wewenang: pantau catatan mata-mata, backup database & atur sistem.', perms: JSON.stringify({ kas_in: true, kas_out: true, honor: true, approve: true, tax: true, users: true, spj: true, export: true, audit: true, backup: true }), system: 1 },
  { id: 'admin', name: 'Admin Operasional', tag: 'Admin', icon: '🛡️', badge_class: 'bad', description: 'Input, edit belanja, kelola tim & ekspor, tanpa akses catatan mata-mata.', perms: JSON.stringify({ kas_in: true, kas_out: true, honor: true, approve: true, tax: true, users: true, spj: true, export: true, audit: false, backup: false }), system: 1 },
  { id: 'ketua', name: 'Ketua Peneliti', tag: 'Ketua', icon: '🎓', badge_class: 'info', description: 'Pengesahan belanja, tanda tangan kuitansi LPJ & serapan anggaran.', perms: JSON.stringify({ kas_in: true, kas_out: false, honor: false, approve: true, tax: true, users: false, spj: true, export: true }), system: 1 },
  { id: 'bendahara', name: 'Bendahara Proyek', tag: 'Bendahara', icon: '💼', badge_class: 'ok', description: 'Input kas harian, penggajian honor, pemotongan pajak Coretax & SPJ.', perms: JSON.stringify({ kas_in: true, kas_out: true, honor: true, approve: false, tax: true, users: false, spj: true, export: true }), system: 1 },
  { id: 'peneliti', name: 'Anggota Peneliti', tag: 'Peneliti', icon: '🔬', badge_class: 'warning', description: 'Pantau progres pelaksanaan riset dan serapan anggaran.', perms: JSON.stringify({ kas_in: false, kas_out: false, honor: false, approve: false, tax: false, users: false, spj: true, export: true }), system: 0 },
  { id: 'asisten', name: 'Asisten Peneliti', tag: 'Asisten', icon: '📋', badge_class: 'info', description: 'Input draft belanja lapangan dan verifikasi kelengkapan nota SPJ.', perms: JSON.stringify({ kas_in: false, kas_out: true, honor: false, approve: false, tax: false, users: false, spj: true, export: false }), system: 0 }
];

for (const r of defaultRoles) {
  db.prepare(`
    INSERT INTO roles (id, name, tag, icon, badge_class, description, perms, system, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      tag = excluded.tag,
      icon = excluded.icon,
      badge_class = excluded.badge_class,
      description = excluded.description,
      perms = excluded.perms
  `).run(r.id, r.name, r.tag, r.icon, r.badge_class, r.description, r.perms, r.system, Date.now());
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
    SELECT u.id, u.username, u.name, u.role, u.avatar, u.active, s.expires
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires > ? AND u.active = 1
  `).get(token, Date.now());
  return row || null;
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) {
    const ips = fwd.split(',');
    return ips[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket.remoteAddress || '127.0.0.1';
}

function parseDeviceInfo(ua = '') {
  if (!ua) return 'Perangkat Tidak Dikenal';
  let os = 'OS Lain';
  let device = 'Desktop';
  let browser = 'Browser';

  if (/iPad/i.test(ua)) {
    device = 'iPad';
    os = 'iPadOS';
  } else if (/iPhone/i.test(ua)) {
    device = 'iPhone';
    const m = ua.match(/OS (\d+[_\d]*)/);
    os = m ? `iOS ${m[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/Android/i.test(ua)) {
    const m = ua.match(/Android\s+([0-9.]+)/);
    os = m ? `Android ${m[1]}` : 'Android';
    if (/Samsung|SM-|GT-/i.test(ua)) device = 'Samsung';
    else if (/Xiaomi|Redmi|POCO/i.test(ua)) device = 'Xiaomi';
    else if (/OPPO|CPH/i.test(ua)) device = 'OPPO';
    else if (/vivo/i.test(ua)) device = 'Vivo';
    else device = 'Ponsel Android';
  } else if (/Windows NT 10.0/i.test(ua)) {
    os = 'Windows 10/11';
    device = 'PC';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
    device = 'PC';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
    device = 'Mac';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    device = 'PC';
  }

  if (/Edg\//i.test(ua)) {
    browser = 'Edge';
  } else if (/Chrome\/([0-9]+)/i.test(ua) && !/Edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox\/([0-9]+)/i.test(ua)) {
    browser = 'Firefox';
  } else if (/OPR\//i.test(ua)) {
    browser = 'Opera';
  }

  const isMobile = (device === 'iPhone' || device === 'iPad' || device === 'Samsung' || device === 'Xiaomi' || device === 'OPPO' || device === 'Vivo' || device === 'Ponsel Android');
  const icon = isMobile ? '📱' : (device === 'Mac' ? '💻' : '🖥️');
  return `${icon} ${device} (${os}) · ${browser}`;
}

function recordAudit(req, user, action, category, description, extra = {}) {
  try {
    const ip = extra.ip || (req ? getClientIp(req) : '127.0.0.1');
    const ua = extra.ua || (req ? req.headers['user-agent'] : '');
    const deviceInfo = extra.deviceInfo || parseDeviceInfo(ua);
    const userId = user ? user.id : (extra.userId || null);
    const username = user ? user.username : (extra.username || 'anon');
    const role = user ? user.role : (extra.role || 'guest');
    const gpsLat = extra.lat != null && !isNaN(Number(extra.lat)) ? Number(extra.lat) : null;
    const gpsLng = extra.lng != null && !isNaN(Number(extra.lng)) ? Number(extra.lng) : null;
    const gpsAcc = extra.acc != null && !isNaN(Number(extra.acc)) ? Number(extra.acc) : null;
    const meta = extra.metadata ? (typeof extra.metadata === 'string' ? extra.metadata : JSON.stringify(extra.metadata)) : null;

    db.prepare(`
      INSERT INTO audit_logs (user_id, username, role, action, category, description, ip, user_agent, device_info, gps_lat, gps_lng, gps_acc, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, username, role, action, category, description,
      ip, ua, deviceInfo, gpsLat, gpsLng, gpsAcc, meta, Date.now()
    );
  } catch (err) {
    console.error('[Audit Error]', err);
  }
}

// ============================================================================
// BACKUP & RECOVERY ENGINE (Automatic Weekly + Manual Snapshots)
// ============================================================================
const BACKUP_DIR = path.join(DATA, 'backups');
fs.mkdirSync(BACKUP_DIR, { recursive: true });

function generateBackupData(trigger = 'manual', user = null) {
  const users = db.prepare('SELECT id, username, name, role, avatar, pass, active, perm_rev, created_at FROM users').all();
  const roles = db.prepare('SELECT id, name, tag, icon, badge_class, description, perms, system, created_at FROM roles').all();
  const records = db.prepare('SELECT coll, id, pid, data, deleted, rev, updated_at, updated_by FROM records').all();
  const counter = db.prepare('SELECT k, v FROM counter').all();
  const auditLogs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500').all();

  return {
    app: 'ZanFin',
    version: '2.0.0',
    type: 'full_database_snapshot',
    trigger,
    createdBy: user ? user.username : 'system',
    timestamp: Date.now(),
    date: new Date().toISOString(),
    stats: {
      users: users.length,
      roles: roles.length,
      records: records.length,
      auditLogs: auditLogs.length
    },
    data: {
      users,
      roles,
      records,
      counter,
      audit_logs: auditLogs
    }
  };
}

function pruneOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 10) {
      for (let i = 10; i < files.length; i++) {
        fs.unlinkSync(path.join(BACKUP_DIR, files[i].name));
      }
    }
  } catch (e) {}
}

function checkAndRunAutoBackup() {
  try {
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('zanfin-') && f.endsWith('.json'));
    let latestTime = 0;
    for (const f of files) {
      try {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        if (stat.mtimeMs > latestTime) latestTime = stat.mtimeMs;
      } catch (e) {}
    }

    const SEVEN_DAYS = 7 * 24 * 3600 * 1000;
    const now = Date.now();
    if (now - latestTime >= SEVEN_DAYS) {
      const d = new Date();
      const dateStr = d.toISOString().slice(0, 10);
      const filename = `zanfin-auto-${dateStr}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.json`;
      const fullPath = path.join(BACKUP_DIR, filename);
      const backupData = generateBackupData('auto_weekly', { username: 'SYSTEM_CRON' });
      fs.writeFileSync(fullPath, JSON.stringify(backupData, null, 2), 'utf-8');
      console.log(`[ZanFin Backup] Auto backup mingguan berhasil dibuat: ${filename}`);

      recordAudit(null, { id: 0, username: 'SYSTEM_CRON', role: 'system' }, 'AUTO_BACKUP', 'backup', `Sistem otomatis membuat file cadangan mingguan: ${filename}`);
      pruneOldBackups();
    }
  } catch (err) {
    console.error('[Auto Backup Error]', err);
  }
}

// Initial check & interval every 4 hours
checkAndRunAutoBackup();
setInterval(checkAndRunAutoBackup, 4 * 3600 * 1000);

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
        recordAudit(req, null, 'LOGIN_FAILED', 'auth', `Percobaan masuk gagal untuk username: "${body.username || ''}"`, {
          username: body.username || 'unknown',
          lat: body.lat,
          lng: body.lng,
          acc: body.acc
        });
        return sendJson(res, 401, { error: 'Username atau password salah' });
      }
      const token = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + SESSION_DAYS * 86400 * 1000;
      db.prepare('INSERT INTO sessions (token, user_id, expires, created_at) VALUES (?, ?, ?, ?)').run(token, user.id, expires, Date.now());
      const cookie = `zanfin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;

      recordAudit(req, user, 'LOGIN', 'auth', `Pengguna ${user.name} (${user.username}) berhasil masuk sebagai ${user.role}`, {
        lat: body.lat,
        lng: body.lng,
        acc: body.acc
      });

      return sendJson(res, 200, {
        user: { id: user.id, username: user.username, name: user.name, role: user.role, avatar: user.avatar }
      }, { 'Set-Cookie': cookie });
    }

    if (pathname === '/api/logout' && req.method === 'POST') {
      const user = getSessionUser(req);
      const cookies = parseCookies(req);
      if (cookies.zanfin_session) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(cookies.zanfin_session);
      }
      if (user) {
        recordAudit(req, user, 'LOGOUT', 'auth', `Pengguna ${user.name} (${user.username}) keluar dari sesi sistem`);
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

    if (pathname === '/api/me/profile' && req.method === 'POST') {
      const user = getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
      const body = JSON.parse(await readBody(req));
      const { name, avatar } = body;
      if (!name || !name.trim()) {
        return sendJson(res, 400, { error: 'Nama lengkap tidak boleh kosong' });
      }

      let avatarVal = user.avatar;
      if (avatar !== undefined) {
        avatarVal = avatar ? String(avatar) : null;
      }

      db.prepare('UPDATE users SET name = ?, avatar = ? WHERE id = ?').run(name.trim(), avatarVal, user.id);
      recordAudit(req, user, 'PROFILE_UPDATE', 'tim', `Pengguna "${name.trim()}" (@${user.username}) memperbarui foto profil & data`);

      const updatedUser = {
        id: user.id,
        username: user.username,
        name: name.trim(),
        role: user.role,
        avatar: avatarVal,
        active: user.active
      };
      return sendJson(res, 200, { ok: true, user: updatedUser });
    }

    if (pathname === '/api/me/password' && req.method === 'POST') {
      const user = getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
      const body = JSON.parse(await readBody(req));
      const { oldPassword, newPassword } = body;
      if (!oldPassword || !newPassword) {
        return sendJson(res, 400, { error: 'Password lama dan password baru wajib diisi' });
      }
      if (newPassword.length < 6) {
        return sendJson(res, 400, { error: 'Password baru minimal 6 karakter' });
      }

      const fullUser = db.prepare('SELECT pass FROM users WHERE id = ?').get(user.id);
      if (!fullUser || !verifyPass(oldPassword, fullUser.pass)) {
        return sendJson(res, 400, { error: 'Password lama tidak sesuai' });
      }

      const hash = hashPass(newPassword);
      db.prepare('UPDATE users SET pass = ? WHERE id = ?').run(hash, user.id);
      recordAudit(req, user, 'PASSWORD_CHANGE', 'auth', `Pengguna "${user.name}" (@${user.username}) berhasil mengubah kata sandi akun`);

      return sendJson(res, 200, { ok: true, message: 'Password berhasil diubah' });
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
        if (pushes.length > 0) {
          const collSet = [...new Set(pushes.map(p => p.coll))].join(', ');
          recordAudit(req, user, 'SYNC_SAVE', 'data', `Menyimpan ${pushes.length} pembaruan data (${collSet})`);
        }
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
      if (!user || (user.role !== 'superadmin' && user.role !== 'admin')) {
        return sendJson(res, 403, { error: 'Hanya Administrator yang bisa mengelola akun' });
      }
      
      if (req.method === 'GET') {
        const users = db.prepare('SELECT id, username, name, role, avatar, active, created_at FROM users ORDER BY id ASC').all();
        return sendJson(res, 200, { users });
      }

      if (req.method === 'POST') {
        const body = JSON.parse(await readBody(req));
        const { id, username, name, role, avatar, pass, active } = body;

        // Security restriction for operational admin:
        if (user.role === 'admin') {
          if (role === 'superadmin') {
            return sendJson(res, 403, { error: 'Admin Operasional tidak dapat memberikan wewenang Super Admin' });
          }
          if (id) {
            const target = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
            if (target && target.role === 'superadmin') {
              return sendJson(res, 403, { error: 'Admin Operasional tidak dapat mengubah akun Super Admin' });
            }
          }
        }

        const avatarVal = avatar !== undefined ? (avatar ? String(avatar) : null) : undefined;

        if (id) {
          if (pass && pass.trim()) {
            const hash = hashPass(pass.trim());
            if (avatarVal !== undefined) {
              db.prepare('UPDATE users SET name = ?, role = ?, pass = ?, active = ?, avatar = ? WHERE id = ?').run(
                name || username, role || 'peneliti', hash, active !== false ? 1 : 0, avatarVal, id
              );
            } else {
              db.prepare('UPDATE users SET name = ?, role = ?, pass = ?, active = ? WHERE id = ?').run(
                name || username, role || 'peneliti', hash, active !== false ? 1 : 0, id
              );
            }
          } else {
            if (avatarVal !== undefined) {
              db.prepare('UPDATE users SET name = ?, role = ?, active = ?, avatar = ? WHERE id = ?').run(
                name || username, role || 'peneliti', active !== false ? 1 : 0, avatarVal, id
              );
            } else {
              db.prepare('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?').run(
                name || username, role || 'peneliti', active !== false ? 1 : 0, id
              );
            }
          }
          recordAudit(req, user, 'USER_UPDATE', 'tim', `Memperbarui akun pengguna "${name || username}" (${role})`);
        } else {
          if (!username || !pass) {
            return sendJson(res, 400, { error: 'Username dan password wajib diisi' });
          }
          const hash = hashPass(pass.trim());
          try {
            db.prepare('INSERT INTO users (username, name, role, avatar, pass, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
              username.toLowerCase().trim(), name || username, role || 'peneliti', avatarVal || null, hash, active !== false ? 1 : 0, Date.now()
            );
            recordAudit(req, user, 'USER_CREATE', 'tim', `Membuat akun baru "${name || username}" (@${username.toLowerCase().trim()}) role: ${role}`);
          } catch (e) {
            if (e.message && e.message.includes('UNIQUE')) {
              return sendJson(res, 400, { error: 'Username sudah digunakan' });
            }
            throw e;
          }
        }
        const users = db.prepare('SELECT id, username, name, role, avatar, active, created_at FROM users ORDER BY id ASC').all();
        return sendJson(res, 200, { ok: true, users });
      }

      if (req.method === 'DELETE') {
        const body = JSON.parse(await readBody(req));
        const { id } = body;
        if (!id) return sendJson(res, 400, { error: 'ID user wajib diisi' });
        if (Number(id) === Number(user.id)) return sendJson(res, 400, { error: 'Tidak dapat menghapus akun Anda sendiri yang sedang aktif' });

        const target = db.prepare('SELECT username, name, role FROM users WHERE id = ?').get(id);
        if (!target) return sendJson(res, 404, { error: 'Akun tidak ditemukan' });

        if (user.role === 'admin' && (target.role === 'superadmin' || target.role === 'admin')) {
          return sendJson(res, 403, { error: 'Admin Operasional tidak dapat menghapus akun Super Admin atau sesama Admin' });
        }

        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        recordAudit(req, user, 'USER_DELETE', 'tim', `Menghapus akun pengguna "${target.name} (@${target.username})"`);
        const users = db.prepare('SELECT id, username, name, role, avatar, active, created_at FROM users ORDER BY id ASC').all();
        return sendJson(res, 200, { ok: true, users });
      }
    }

    if (pathname === '/api/roles') {
      if (req.method === 'GET') {
        const rows = db.prepare('SELECT * FROM roles ORDER BY system DESC, created_at ASC').all();
        const roles = rows.map(r => ({
          id: r.id,
          name: r.name,
          tag: r.tag,
          icon: r.icon,
          badgeClass: r.badge_class,
          desc: r.description,
          perms: JSON.parse(r.perms || '{}'),
          system: Boolean(r.system)
        }));
        return sendJson(res, 200, { roles });
      }

      if (req.method === 'POST') {
        const user = getSessionUser(req);
        if (!user || user.role !== 'superadmin') return sendJson(res, 403, { error: 'Hanya Super Admin yang bisa menambah / mengedit peran' });
        const body = JSON.parse(await readBody(req));
        const { id, name, tag, icon, badgeClass, desc, perms } = body;
        if (!id || !name) return sendJson(res, 400, { error: 'ID dan Nama Peran wajib diisi' });

        const cleanId = id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const existing = db.prepare('SELECT system FROM roles WHERE id = ?').get(cleanId);
        const isSystem = existing ? existing.system : 0;

        db.prepare(`
          INSERT INTO roles (id, name, tag, icon, badge_class, description, perms, system, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            tag = excluded.tag,
            icon = excluded.icon,
            badge_class = excluded.badge_class,
            description = excluded.description,
            perms = excluded.perms
        `).run(
          cleanId,
          name.trim(),
          (tag || name).trim(),
          icon || '📋',
          badgeClass || 'info',
          (desc || '').trim(),
          JSON.stringify(perms || {}),
          isSystem,
          Date.now()
        );

        recordAudit(req, user, 'ROLE_SAVE', 'sistem', `Menyimpan pengaturan peran "${name}" (${cleanId})`);

        const rows = db.prepare('SELECT * FROM roles ORDER BY system DESC, created_at ASC').all();
        const roles = rows.map(r => ({
          id: r.id,
          name: r.name,
          tag: r.tag,
          icon: r.icon,
          badgeClass: r.badge_class,
          desc: r.description,
          perms: JSON.parse(r.perms || '{}'),
          system: Boolean(r.system)
        }));
        return sendJson(res, 200, { ok: true, roles });
      }

      if (req.method === 'DELETE') {
        const user = getSessionUser(req);
        if (!user || user.role !== 'superadmin') return sendJson(res, 403, { error: 'Hanya Super Admin yang bisa menghapus peran' });
        const body = JSON.parse(await readBody(req));
        const { id } = body;
        const role = db.prepare('SELECT name, system FROM roles WHERE id = ?').get(id);
        if (!role) return sendJson(res, 404, { error: 'Peran tidak ditemukan' });
        if (role.system) return sendJson(res, 400, { error: 'Peran bawaan sistem tidak boleh dihapus' });

        db.prepare('DELETE FROM roles WHERE id = ?').run(id);
        recordAudit(req, user, 'ROLE_DELETE', 'sistem', `Menghapus peran kustom "${role.name}" (${id})`);

        const rows = db.prepare('SELECT * FROM roles ORDER BY system DESC, created_at ASC').all();
        const roles = rows.map(r => ({
          id: r.id,
          name: r.name,
          tag: r.tag,
          icon: r.icon,
          badgeClass: r.badge_class,
          desc: r.description,
          perms: JSON.parse(r.perms || '{}'),
          system: Boolean(r.system)
        }));
        return sendJson(res, 200, { ok: true, roles });
      }
    }

    // ========================================================================
    // AUDIT LOGS & SPY SYSTEM ENDPOINTS (SUPERADMIN ONLY)
    // ========================================================================
    if (pathname === '/api/audit-logs') {
      const user = getSessionUser(req);
      if (!user || user.role !== 'superadmin') return sendJson(res, 403, { error: 'Hanya Super Admin yang berhak melihat Catatan Mata-mata' });

      if (req.method === 'GET') {
        const search = (parsedUrl.searchParams.get('q') || '').trim();
        const category = (parsedUrl.searchParams.get('cat') || '').trim();
        const limit = Math.min(Number(parsedUrl.searchParams.get('limit')) || 100, 300);

        let sql = 'SELECT * FROM audit_logs WHERE 1=1';
        const params = [];

        if (category && category !== 'all') {
          sql += ' AND category = ?';
          params.push(category);
        }

        if (search) {
          sql += ' AND (username LIKE ? OR description LIKE ? OR ip LIKE ? OR device_info LIKE ? OR action LIKE ?)';
          const s = `%${search}%`;
          params.push(s, s, s, s, s);
        }

        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const logs = db.prepare(sql).all(...params);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayCount = db.prepare('SELECT COUNT(*) as c FROM audit_logs WHERE created_at >= ?').get(todayStart.getTime()).c;
        const failedCount = db.prepare("SELECT COUNT(*) as c FROM audit_logs WHERE action = 'LOGIN_FAILED' AND created_at >= ?").get(todayStart.getTime()).c;
        const totalCount = db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;

        return sendJson(res, 200, {
          ok: true,
          logs,
          stats: {
            today: todayCount,
            failedToday: failedCount,
            total: totalCount
          }
        });
      }

      if (req.method === 'DELETE') {
        const body = JSON.parse(await readBody(req));
        if (body.all) {
          db.exec('DELETE FROM audit_logs');
          recordAudit(req, user, 'LOGS_CLEARED', 'keamanan', 'Superadmin menghapus seluruh riwayat catatan audit');
        } else if (body.olderThanDays) {
          const cutoff = Date.now() - (Number(body.olderThanDays) * 86400 * 1000);
          db.prepare('DELETE FROM audit_logs WHERE created_at < ?').run(cutoff);
          recordAudit(req, user, 'LOGS_PURGED', 'keamanan', `Superadmin membersihkan log yang lebih lama dari ${body.olderThanDays} hari`);
        }
        return sendJson(res, 200, { ok: true });
      }
    }

    if (pathname === '/api/audit/ping' && req.method === 'POST') {
      const user = getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
      const body = JSON.parse(await readBody(req));
      if (body.lat != null && body.lng != null) {
        recordAudit(req, user, 'GPS_PING', 'lokasi', `Pembaruan lokasi GPS perangkat: ${Number(body.lat).toFixed(5)}, ${Number(body.lng).toFixed(5)} (±${body.acc || 0}m)`, {
          lat: body.lat,
          lng: body.lng,
          acc: body.acc
        });
      }
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/audit/log' && req.method === 'POST') {
      const user = getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
      const body = JSON.parse(await readBody(req));
      recordAudit(req, user, body.action || 'ACTIVITY', body.category || 'umum', body.description || 'Aktivitas pengguna', {
        lat: body.lat,
        lng: body.lng,
        acc: body.acc,
        metadata: body.metadata
      });
      return sendJson(res, 200, { ok: true });
    }

    // ========================================================================
    // BACKUP & RESTORE SYSTEM ENDPOINTS (SUPERADMIN ONLY)
    // ========================================================================
    if (pathname === '/api/backup/status' && req.method === 'GET') {
      const user = getSessionUser(req);
      if (!user || user.role !== 'superadmin') return sendJson(res, 403, { error: 'Forbidden' });

      let backupFiles = [];
      try {
        backupFiles = fs.readdirSync(BACKUP_DIR)
          .filter(f => f.endsWith('.json'))
          .map(f => {
            const st = fs.statSync(path.join(BACKUP_DIR, f));
            return {
              name: f,
              size: st.size,
              date: st.mtime.toISOString(),
              mtimeMs: st.mtimeMs,
              isAuto: f.includes('-auto-')
            };
          })
          .sort((a, b) => b.mtimeMs - a.mtimeMs);
      } catch (e) {}

      const latestBackup = backupFiles.length > 0 ? backupFiles[0] : null;
      const lastBackupTime = latestBackup ? latestBackup.mtimeMs : 0;
      const daysSinceLastBackup = latestBackup ? Math.floor((Date.now() - latestBackup.mtimeMs) / (24 * 3600 * 1000)) : 999;
      const needsBackup = daysSinceLastBackup >= 7;

      const totalRecords = db.prepare('SELECT COUNT(*) as c FROM records WHERE deleted = 0').get().c;
      const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
      const totalAuditLogs = db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;

      return sendJson(res, 200, {
        ok: true,
        lastBackupTime,
        daysSinceLastBackup,
        needsBackup,
        totalRecords,
        totalUsers,
        totalAuditLogs,
        backupFiles
      });
    }

    if (pathname === '/api/backup/download' && req.method === 'GET') {
      const user = getSessionUser(req);
      if (!user || user.role !== 'superadmin') return sendJson(res, 403, { error: 'Forbidden' });

      // Downloading specific file from backup history
      if (parsedUrl.searchParams.has('file')) {
        const reqFile = path.basename(parsedUrl.searchParams.get('file'));
        const targetPath = path.join(BACKUP_DIR, reqFile);
        if (fs.existsSync(targetPath)) {
          const content = fs.readFileSync(targetPath);
          recordAudit(req, user, 'BACKUP_DOWNLOAD', 'backup', `Superadmin mengunduh file cadangan historis: ${reqFile}`);
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${reqFile}"`,
            'Content-Length': content.length
          });
          return res.end(content);
        } else {
          return sendJson(res, 404, { error: 'File cadangan tidak ditemukan' });
        }
      }

      // Generate live on-demand snapshot
      const backupData = generateBackupData('manual_download', user);
      const d = new Date();
      const dateStr = d.toISOString().slice(0, 10);
      const filename = `zanfin-backup-${dateStr}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.json`;
      
      // Save local copy in backups directory
      fs.writeFileSync(path.join(BACKUP_DIR, filename), JSON.stringify(backupData, null, 2), 'utf-8');
      pruneOldBackups();

      recordAudit(req, user, 'BACKUP_DOWNLOAD', 'backup', `Superadmin mengunduh snapshot cadangan database: ${filename}`);

      const jsonStr = JSON.stringify(backupData, null, 2);
      const buf = Buffer.from(jsonStr, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buf.length
      });
      return res.end(buf);
    }

    if (pathname === '/api/backup/restore' && req.method === 'POST') {
      const user = getSessionUser(req);
      if (!user || user.role !== 'superadmin') return sendJson(res, 403, { error: 'Hanya Super Admin yang berhak memulihkan data' });

      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch (e) {
        return sendJson(res, 400, { error: 'Format file tidak valid (harus file JSON backup ZanFin)' });
      }

      if (!payload || payload.app !== 'ZanFin' || !payload.data) {
        return sendJson(res, 400, { error: 'File bukan cadangan data resmi ZanFin yang valid' });
      }

      const { users, roles, records, counter } = payload.data;
      if (!Array.isArray(records) || !Array.isArray(users)) {
        return sendJson(res, 400, { error: 'Struktur data cadangan rusak atau tidak lengkap' });
      }

      // Safety snapshot of current database state before restoration
      const safetyFile = `zanfin-pre-restore-${Date.now()}.json`;
      const safetyData = generateBackupData('safety_before_restore', user);
      fs.writeFileSync(path.join(BACKUP_DIR, safetyFile), JSON.stringify(safetyData, null, 2), 'utf-8');

      // Atomic restoration inside SQLite transaction
      db.exec('BEGIN IMMEDIATE');
      try {
        if (Array.isArray(roles) && roles.length > 0) {
          db.exec('DELETE FROM roles');
          const insRole = db.prepare(`
            INSERT INTO roles (id, name, tag, icon, badge_class, description, perms, system, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const r of roles) {
            insRole.run(
              r.id, r.name, r.tag || r.name, r.icon || '📋', r.badge_class || 'info',
              r.description || '', typeof r.perms === 'string' ? r.perms : JSON.stringify(r.perms || {}),
              r.system ? 1 : 0, r.created_at || Date.now()
            );
          }
        }

        db.exec('DELETE FROM records');
        const insRec = db.prepare(`
          INSERT INTO records (coll, id, pid, data, deleted, rev, updated_at, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of records) {
          insRec.run(
            r.coll, r.id, r.pid || null,
            typeof r.data === 'string' ? r.data : JSON.stringify(r.data || {}),
            r.deleted ? 1 : 0, r.rev || 1, r.updated_at || Date.now(), r.updated_by || user.id
          );
        }

        if (Array.isArray(users) && users.length > 0) {
          db.exec('DELETE FROM users');
          const insUser = db.prepare(`
            INSERT INTO users (id, username, name, role, avatar, pass, active, perm_rev, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const u of users) {
            insUser.run(u.id, u.username, u.name, u.role, u.avatar || null, u.pass, u.active !== 0 ? 1 : 0, u.perm_rev || 1, u.created_at || Date.now());
          }
        }

        if (Array.isArray(counter)) {
          for (const c of counter) {
            db.prepare(`
              INSERT INTO counter (k, v) VALUES (?, ?)
              ON CONFLICT(k) DO UPDATE SET v = excluded.v
            `).run(c.k, c.v);
          }
        }

        db.exec('COMMIT');

        recordAudit(req, user, 'RESTORE_SUCCESS', 'backup', `Database berhasil dipulihkan dari file cadangan tanggal ${payload.date || 'tidak diketahui'}. Berisi ${records.length} data, ${users.length} pengguna.`);

        return sendJson(res, 200, {
          ok: true,
          message: 'Database berhasil dipulihkan sepenuhnya!',
          restored: {
            records: records.length,
            users: users.length,
            roles: roles?.length || 0
          }
        });
      } catch (err) {
        db.exec('ROLLBACK');
        console.error('[Restore Error]', err);
        return sendJson(res, 500, { error: 'Gagal memulihkan database: ' + err.message });
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
