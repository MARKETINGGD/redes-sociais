const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

router.get('/:brand', requireAuth, (req, res) => {
  const settings = db.get('settings').find({ brand: req.params.brand }).value();
  res.json(settings || { brand: req.params.brand, tagline: '' });
});

router.put('/:brand', requireAuth, (req, res) => {
  const { tagline } = req.body;
  const existing = db.get('settings').find({ brand: req.params.brand }).value();
  const updates = { brand: req.params.brand, tagline: tagline || '', updatedAt: new Date().toISOString(), updatedBy: req.user.username };
  if (existing) {
    db.get('settings').find({ brand: req.params.brand }).assign(updates).write();
  } else {
    db.get('settings').push(updates).write();
  }
  logAudit({ user: req.user, brand: req.params.brand, entityType: 'configuracao', entityId: req.params.brand, entityLabel: 'Título/tagline', action: 'editou' });
  res.json(updates);
});

module.exports = router;
