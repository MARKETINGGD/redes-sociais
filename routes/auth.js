const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { nanoid } = require('../utils/id');
const { requireAuth, requireAdmin, JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

// Só funciona se ainda não existir nenhum usuário
router.post('/setup', (req, res) => {
  const existing = db.get('users').value();
  if (existing.length > 0) {
    return res.status(400).json({ error: 'O primeiro administrador já foi criado. Use a tela de login.' });
  }
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Usuário e senha (mínimo 6 caracteres) são obrigatórios' });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const user = {
    id: nanoid(),
    username,
    passwordHash,
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  db.get('users').push(user).write();
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

router.get('/needs-setup', (req, res) => {
  const existing = db.get('users').value();
  res.json({ needsSetup: existing.length === 0 });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.get('users').find({ username }).value();
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Gestão de usuários (apenas admin)
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const users = db.get('users').value().map(u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt }));
  res.json(users);
});

router.post('/users', requireAuth, requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Usuário e senha (mínimo 6 caracteres) são obrigatórios' });
  }
  if (db.get('users').find({ username }).value()) {
    return res.status(400).json({ error: 'Já existe um usuário com esse nome' });
  }
  const user = {
    id: nanoid(),
    username,
    passwordHash: bcrypt.hashSync(password, 10),
    role: role === 'admin' ? 'admin' : 'editor',
    createdAt: new Date().toISOString()
  };
  db.get('users').push(user).write();
  logAudit({ user: req.user, brand: 'geral', entityType: 'usuario', entityId: user.id, entityLabel: user.username, action: 'criou', details: `papel: ${user.role}` });
  res.json({ id: user.id, username: user.username, role: user.role, createdAt: user.createdAt });
});

router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const user = db.get('users').find({ id: req.params.id }).value();
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'Você não pode remover sua própria conta' });
  db.get('users').remove({ id: req.params.id }).write();
  logAudit({ user: req.user, brand: 'geral', entityType: 'usuario', entityId: user.id, entityLabel: user.username, action: 'removeu' });
  res.json({ ok: true });
});

module.exports = router;
