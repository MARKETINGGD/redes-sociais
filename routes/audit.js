const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { brand } = req.query;
  let items = db.get('auditLog').value();
  if (brand) items = items.filter(a => a.brand === brand || a.brand === 'geral');
  items = items.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(items);
});

module.exports = router;
