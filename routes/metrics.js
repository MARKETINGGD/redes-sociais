const express = require('express');
const db = require('../db');
const { nanoid } = require('../utils/id');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

const CHANNEL_LABELS = {
  instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube',
  pinterest: 'Pinterest', linkedin: 'LinkedIn', site: 'Site', blog: 'Blog',
  newsletter: 'Newsletter', assessoria: 'Assessoria de Imprensa'
};

router.get('/', requireAuth, (req, res) => {
  const { brand, year, channel } = req.query;
  let items = db.get('metrics').value();
  if (brand) items = items.filter(m => m.brand === brand);
  if (year) items = items.filter(m => String(m.year) === String(year));
  if (channel) items = items.filter(m => m.channel === channel);
  res.json(items);
});

router.post('/', requireAuth, (req, res) => {
  const body = req.body;
  if (!body.brand || !body.channel || !body.year || !body.month) {
    return res.status(400).json({ error: 'brand, channel, year e month são obrigatórios' });
  }
  const yearNum = Number(body.year);
  const monthNum = Number(body.month);
  const existing = db.get('metrics').find({ brand: body.brand, channel: body.channel, year: yearNum, month: monthNum }).value();
  if (existing) {
    return res.status(400).json({ error: 'Já existe um registro para esse canal/mês/ano. Edite o existente.' });
  }
  const item = {
    id: nanoid(),
    brand: body.brand,
    channel: body.channel,
    year: Number(body.year),
    month: Number(body.month),
    followers: numOrNull(body.followers),
    followersGained: numOrNull(body.followersGained),
    followersLost: numOrNull(body.followersLost),
    totalViewers: numOrNull(body.totalViewers),
    likesTotal: numOrNull(body.likesTotal),
    sharesTotal: numOrNull(body.sharesTotal),
    views: numOrNull(body.views),
    contentInteractions: numOrNull(body.contentInteractions),
    viewsOrganic: numOrNull(body.viewsOrganic),
    viewsAds: numOrNull(body.viewsAds),
    interactionsReels: numOrNull(body.interactionsReels),
    interactionsStatic: numOrNull(body.interactionsStatic),
    interactionsCarousel: numOrNull(body.interactionsCarousel),
    viewers: numOrNull(body.viewers),
    totalAudience: numOrNull(body.totalAudience),
    savedPins: numOrNull(body.savedPins),
    engagedAudience: numOrNull(body.engagedAudience),
    pinClicks: numOrNull(body.pinClicks),
    organicFollowers: numOrNull(body.organicFollowers),
    sponsoredFollowers: numOrNull(body.sponsoredFollowers),
    pageViews: numOrNull(body.pageViews),
    searchAppearances: numOrNull(body.searchAppearances),
    reach: numOrNull(body.reach),
    impressions: numOrNull(body.impressions),
    engagement: numOrNull(body.engagement),
    posts: numOrNull(body.posts),
    visits: numOrNull(body.visits),
    pageviews: numOrNull(body.pageviews),
    subscribers: numOrNull(body.subscribers),
    opens: numOrNull(body.opens),
    clicks: numOrNull(body.clicks),
    campaignsSent: numOrNull(body.campaignsSent),
    mentions: numOrNull(body.mentions),
    prReach: numOrNull(body.prReach),
    outboundClicks: numOrNull(body.outboundClicks),
    ctr: numOrNull(body.ctr),
    retention: numOrNull(body.retention),
    watchTime: numOrNull(body.watchTime),
    newViewers: numOrNull(body.newViewers),
    returningViewers: numOrNull(body.returningViewers),
    prPageViews: numOrNull(body.prPageViews),
    clippingValue: numOrNull(body.clippingValue),
    retentionTime: numOrNull(body.retentionTime),
    engagementRate: numOrNull(body.engagementRate),
    seoClicks: numOrNull(body.seoClicks),
    seoImpressions: numOrNull(body.seoImpressions),
    seoCtr: numOrNull(body.seoCtr),
    avgPosition: numOrNull(body.avgPosition),
    buttonClicksTotal: numOrNull(body.buttonClicksTotal),
    activeUsers: numOrNull(body.activeUsers),
    newUsers: numOrNull(body.newUsers),
    returningUsers: numOrNull(body.returningUsers),
    sessions: numOrNull(body.sessions),
    avgEngagementTime: numOrNull(body.avgEngagementTime),
    eventCount: numOrNull(body.eventCount),
    retentionRate: numOrNull(body.retentionRate),
    trafficSources: body.trafficSources || '',
    mailingLink: body.mailingLink || '',
    keywords: body.keywords || '',
    demographics: body.demographics || '',
    city: body.city || '',
    country: body.country || '',
    productVisits: numOrNull(body.productVisits),
    channelVisits: numOrNull(body.channelVisits),
    downloads: numOrNull(body.downloads),
    uniqueVisitors: numOrNull(body.uniqueVisitors),
    downloaders: numOrNull(body.downloaders),
    contacts: numOrNull(body.contacts),
    whatsappContacts: numOrNull(body.whatsappContacts),
    siteContacts: numOrNull(body.siteContacts),
    planCost: numOrNull(body.planCost),
    rankLousasMetais: numOrNull(body.rankLousasMetais),
    rankEletros: numOrNull(body.rankEletros),
    topProfessions: body.topProfessions || '',
    topStates: body.topStates || '',
    downloadFormats: body.downloadFormats || '',
    competitiveNotes: body.competitiveNotes || '',
    totalUsers: numOrNull(body.totalUsers),
    newLeads: numOrNull(body.newLeads),
    openRate: numOrNull(body.openRate),
    churnRate: numOrNull(body.churnRate),
    pressCost: numOrNull(body.pressCost),
    convProductClicks: numOrNull(body.convProductClicks),
    convWhatsappClicks: numOrNull(body.convWhatsappClicks),
    convNewsletterSignups: numOrNull(body.convNewsletterSignups),
    transactions: numOrNull(body.transactions),
    revenue: numOrNull(body.revenue),
    viewedProduct: numOrNull(body.viewedProduct),
    addedToCart: numOrNull(body.addedToCart),
    startedCheckout: numOrNull(body.startedCheckout),
    purchased: numOrNull(body.purchased),
    cartAbandonmentRate: numOrNull(body.cartAbandonmentRate),
    notes: body.notes || '',
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.username
  };
  db.get('metrics').push(item).write();
  logAudit({
    user: req.user, brand: item.brand, entityType: 'metrica', entityId: item.id,
    entityLabel: `${CHANNEL_LABELS[item.channel] || item.channel} ${item.month}/${item.year}`,
    action: 'criou', details: 'Lançamento de métricas mensais'
  });
  res.json(item);
});

router.put('/:id', requireAuth, (req, res) => {
  const item = db.get('metrics').find({ id: req.params.id }).value();
  if (!item) return res.status(404).json({ error: 'Registro não encontrado' });
  const body = req.body;
  const fields = ['followers', 'followersGained', 'followersLost', 'totalViewers', 'likesTotal', 'sharesTotal', 'reach', 'impressions', 'engagement', 'posts',
    'visits', 'pageviews', 'subscribers', 'opens', 'clicks', 'campaignsSent', 'mentions', 'prReach',
    'outboundClicks', 'ctr', 'retention', 'watchTime', 'newViewers', 'returningViewers',
    'prPageViews', 'clippingValue', 'retentionTime', 'engagementRate', 'seoClicks', 'seoImpressions',
    'seoCtr', 'avgPosition', 'buttonClicksTotal', 'activeUsers', 'newUsers', 'returningUsers',
    'sessions', 'avgEngagementTime', 'eventCount', 'retentionRate',
    'productVisits', 'channelVisits', 'downloads', 'uniqueVisitors', 'downloaders', 'contacts',
    'whatsappContacts', 'siteContacts', 'planCost', 'rankLousasMetais', 'rankEletros',
    'totalUsers', 'newLeads', 'openRate', 'churnRate', 'pressCost',
    'views', 'contentInteractions', 'viewsOrganic', 'viewsAds', 'interactionsReels', 'interactionsStatic',
    'interactionsCarousel', 'viewers', 'totalAudience', 'savedPins', 'engagedAudience', 'pinClicks',
    'organicFollowers', 'sponsoredFollowers', 'pageViews', 'searchAppearances',
    'convProductClicks', 'convWhatsappClicks', 'convNewsletterSignups',
    'transactions', 'revenue', 'viewedProduct', 'addedToCart', 'startedCheckout', 'purchased', 'cartAbandonmentRate'];
  const textFields = ['trafficSources', 'mailingLink', 'keywords', 'demographics', 'city', 'country',
    'topProfessions', 'topStates', 'downloadFormats', 'competitiveNotes'];
  const updates = { updatedAt: new Date().toISOString(), updatedBy: req.user.username };
  fields.forEach(f => {
    if (body[f] !== undefined) updates[f] = numOrNull(body[f]);
  });
  textFields.forEach(f => {
    if (body[f] !== undefined) updates[f] = body[f];
  });
  if (body.notes !== undefined) updates.notes = body.notes;
  db.get('metrics').find({ id: req.params.id }).assign(updates).write();
  logAudit({
    user: req.user, brand: item.brand, entityType: 'metrica', entityId: item.id,
    entityLabel: `${CHANNEL_LABELS[item.channel] || item.channel} ${item.month}/${item.year}`,
    action: 'editou', details: 'Atualização de métricas mensais'
  });
  res.json(db.get('metrics').find({ id: req.params.id }).value());
});

router.delete('/:id', requireAuth, (req, res) => {
  const item = db.get('metrics').find({ id: req.params.id }).value();
  if (!item) return res.status(404).json({ error: 'Registro não encontrado' });
  db.get('metrics').remove({ id: req.params.id }).write();
  logAudit({
    user: req.user, brand: item.brand, entityType: 'metrica', entityId: item.id,
    entityLabel: `${CHANNEL_LABELS[item.channel] || item.channel} ${item.month}/${item.year}`,
    action: 'removeu'
  });
  res.json({ ok: true });
});

// Manutenção: encontra lançamentos duplicados (mesma marca/canal/ano/mês),
// mescla os campos preenchidos em um único registro e remove os demais.
// Corrige dados criados antes da correção do bug de duplicidade.
router.post('/dedupe', requireAuth, requireAdmin, (req, res) => {
  const all = db.get('metrics').value();
  const groups = {};
  all.forEach(m => {
    const key = `${m.brand}|${m.channel}|${m.year}|${m.month}`;
    (groups[key] = groups[key] || []).push(m);
  });

  const ignoredFields = ['id', 'updatedAt', 'updatedBy', 'brand', 'channel', 'year', 'month'];
  let mergedCount = 0;
  let removedCount = 0;
  const details = [];

  Object.values(groups).forEach(records => {
    if (records.length < 2) return;
    const sorted = records.slice().sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
    const keeper = sorted[sorted.length - 1];
    const merged = {};
    sorted.forEach(rec => {
      Object.keys(rec).forEach(field => {
        if (ignoredFields.includes(field)) return;
        const val = rec[field];
        if (val !== null && val !== undefined && val !== '') merged[field] = val;
      });
    });
    db.get('metrics').find({ id: keeper.id }).assign({ ...merged, updatedAt: new Date().toISOString(), updatedBy: req.user.username }).write();
    sorted.filter(r => r.id !== keeper.id).forEach(r => {
      db.get('metrics').remove({ id: r.id }).write();
      removedCount++;
    });
    mergedCount++;
    details.push(`${CHANNEL_LABELS[keeper.channel] || keeper.channel} ${keeper.month}/${keeper.year} (${keeper.brand})`);
  });

  if (mergedCount > 0) {
    logAudit({
      user: req.user, brand: 'geral', entityType: 'manutencao', entityId: 'dedupe',
      entityLabel: 'Limpeza de lançamentos duplicados',
      action: 'editou', details: `${mergedCount} mês(es) mesclado(s), ${removedCount} registro(s) duplicado(s) removido(s): ${details.join('; ')}`
    });
  }

  res.json({ mergedCount, removedCount, details });
});

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

module.exports = router;
