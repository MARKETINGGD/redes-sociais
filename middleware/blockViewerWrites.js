const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth');

// Bloqueia escrita (tudo que não é GET/HEAD/OPTIONS) pra quem entrou pelo
// link externo do Gerenciamento de Mídias (28ª rodada, Plataforma de
// Gestão de Marketing) — esse visitante recebe um token com role 'none'.
// Não existia NENHUM bloqueio por role antes disso (só requireAdmin), então
// sem esse middleware um link "somente leitura" continuaria permitindo
// escrever via chamada direta à API, mesmo escondendo os botões na tela.
function blockViewerWrites(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload.role === 'none') {
        return res.status(403).json({ error: 'Link de visitante: somente leitura.' });
      }
    } catch (e) {
      // token inválido — deixa o requireAuth de cada rota barrar normalmente
    }
  }
  next();
}

module.exports = blockViewerWrites;
