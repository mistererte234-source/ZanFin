const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.join(__dirname, '..', 'data', 'zanfin.db');
const db = new DatabaseSync(dbPath);

db.prepare("UPDATE users SET name = 'Allisa Nadhira, S.Gz.' WHERE username = 'peneliti'").run();
db.prepare("UPDATE users SET name = 'Dr. Siti Rahayu Nadhiroh, S.KM., M.Kes.' WHERE username = 'ketua'").run();

console.log('Current DB Users:');
const users = db.prepare('SELECT id, username, role, name FROM users').all();
console.log(users);
