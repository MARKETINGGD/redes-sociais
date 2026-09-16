const express = require('express');
const db = require('../db');
const { handleExcelReport, handleOverviewExcelReport, handleContentExcelReport } = require('./reports');

const router = express.Router();

// Somente GET, sem autenticação, sem dados sensíveis (sem usuários/senhas).

router.get('/metrics', (req, res) => {
  const { brand, year, channel } = req.query;
  let items = db.get('metrics').value();
  if (brand) items = items.filter(m => m.brand === brand);
  if (year) items = items.filter(m => String(m.year) === String(year));
  if (channel) items = items.filter(m => m.channel === channel);
  // remove quem editou, mantém apenas dados de resultado
  items = items.map(({ updatedBy, ...rest }) => rest);
  res.json(items);
});

router.get('/content', (req, res) => {
  const { brand, year, channel } = req.query;
  let items = db.get('content').value();
  if (brand) items = items.filter(c => c.brand === brand);
  if (year) items = items.filter(c => String(c.year) === String(year));
  if (channel) items = items.filter(c => c.channel === channel);
  items = items.map(({ updatedBy, ...rest }) => rest);
  res.json(items);
});

router.get('/settings/:brand', (req, res) => {
  const settings = db.get('settings').find({ brand: req.params.brand }).value();
  if (!settings) return res.json({ brand: req.params.brand, tagline: '' });
  const { updatedBy, ...rest } = settings;
  res.json(rest);
});

router.get('/years', (req, res) => {
  const { brand } = req.query;
  let items = db.get('metrics').value();
  if (brand) items = items.filter(m => m.brand === brand);
  const years = [...new Set(items.map(m => m.year))].sort((a, b) => b - a);
  res.json(years);
});

// Mesmos relatórios em Excel, sem exigir login — usados no link público (somente leitura).
// As rotas específicas precisam vir ANTES de "/reports/excel/:channel" (mesmo motivo de routes/reports.js).
router.get('/reports/excel/overview', handleOverviewExcelReport);
router.get('/reports/excel/content-list', handleContentExcelReport);
router.get('/reports/excel/:channel', handleExcelReport);

// Registra um acesso ao link público (sem autenticação, sem dados sensíveis — só marca/data/hora) —
// usado para o admin acompanhar, no painel logado, quantas vezes o link foi visto e quando.
router.post('/visit', (req, res) => {
  const brand = (req.body && req.body.brand) || null;
  db.get('publicVisits').push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    brand,
    at: new Date().toISOString()
  }).write();
  res.json({ ok: true });
});

module.exports = router;
