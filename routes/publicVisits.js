const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Lista de acessos ao link público (somente admin) — quantas vezes o link foi visto, com dia e
// hora de cada acesso. O registro em si (POST) é feito sem login em routes/public.js.
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const { brand } = req.query;
  let items = db.get('publicVisits').value() || [];
  if (brand) items = items.filter(v => v.brand === brand);
  const total = items.length;
  // Mostra os acessos mais recentes primeiro; limita a lista para não pesar a tela mesmo que o
  // total de acessos cresça muito — o total acima sempre reflete a contagem completa.
  const recent = items.slice().sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 500);
  res.json({ total, items: recent });
});

module.exports = router;
