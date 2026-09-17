const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { brand, channel } = req.query;
  let items = db.get('auditLog').value();
  if (brand) items = items.filter(a => a.brand === brand || a.brand === 'geral');
  // 26a rodada: filtro opcional por rede -- so encontra registros gravados
  // depois dessa rodada (tem o campo `channel`); registros antigos ficam de
  // fora do filtro por rede mas continuam aparecendo normalmente na visao
  // sem filtro -- nada foi apagado.
  if (channel) items = items.filter(a => a.channel === channel);
  items = items.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(items);
});

module.exports = router;
