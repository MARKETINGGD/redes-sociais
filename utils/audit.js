const db = require('../db');
const { nanoid } = require('./id');

// 26a rodada: campo `channel` opcional -- permite filtrar o historico de
// alteracoes por rede (Instagram, Facebook, etc.), pedido da Raquel pro
// Gerenciamento de Midias nativo na Papoi. Registros antigos (sem esse
// campo) continuam existindo normalmente, so nao aparecem num filtro por
// canal -- nenhum dado foi alterado ou perdido.
function logAudit({ user, brand, channel, entityType, entityId, entityLabel, action, details }) {
  db.get('auditLog')
    .push({
      id: nanoid(),
      userId: user ? user.id : null,
      username: user ? user.username : 'desconhecido',
      brand,
      channel: channel || null,
      entityType,
      entityId,
      entityLabel,
      action,
      details: details || '',
      createdAt: new Date().toISOString()
    })
    .write();
}

module.exports = { logAudit };
