const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const adapter = new FileSync(path.join(dataDir, 'db.json'));
const db = low(adapter);

db.defaults({
  users: [],
  metrics: [],
  content: [],
  auditLog: [],
  settings: [],
  // Registro de acessos ao link público (Dashboard de Resultados) — usado no painel admin para
  // mostrar quantas vezes o link foi visto, com o dia e a hora de cada acesso.
  publicVisits: []
}).write();

module.exports = db;
