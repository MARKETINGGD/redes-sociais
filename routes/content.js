const express = require('express');
const db = require('../db');
const { nanoid } = require('../utils/id');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { brand, year, channel } = req.query;
  let items = db.get('content').value();
  if (brand) items = items.filter(c => c.brand === brand);
  if (year) items = items.filter(c => String(c.year) === String(year));
  if (channel) items = items.filter(c => c.channel === channel);
  res.json(items);
});

router.post('/', requireAuth, (req, res) => {
  const body = req.body;
  if (!body.brand || !body.channel || !body.title) {
    return res.status(400).json({ error: 'brand, channel e title são obrigatórios' });
  }
  const item = {
    id: nanoid(),
    brand: body.brand,
    channel: body.channel,
    year: Number(body.year) || new Date().getFullYear(),
    month: Number(body.month) || null,
    title: body.title,
    url: body.url || '',
    format: body.format || '',
    reach: numOrNull(body.reach),
    engagement: numOrNull(body.engagement),
    likes: numOrNull(body.likes),
    comments: numOrNull(body.comments),
    shares: numOrNull(body.shares),
    views: numOrNull(body.views),
    vehicle: body.vehicle || '',
    mediaType: body.mediaType || '',
    uf: body.uf || '',
    value: numOrNull(body.value),
    publishDate: body.publishDate || '',
    pageTrafficSource: body.pageTrafficSource || '',
    scrollDepth: numOrNull(body.scrollDepth),
    buttonClicks: numOrNull(body.buttonClicks),
    region: body.region || '',
    pageActiveUsers: numOrNull(body.pageActiveUsers),
    pageEventCount: numOrNull(body.pageEventCount),
    pageBounceRate: numOrNull(body.pageBounceRate),
    downloads: numOrNull(body.downloads),
    buttonName: body.buttonName || '',
    avgWatchTime: numOrNull(body.avgWatchTime),
    completionRate: numOrNull(body.completionRate),
    videoNewFollowers: numOrNull(body.videoNewFollowers),
    sponsored: !!body.sponsored,
    viewers: numOrNull(body.viewers),
    savedCount: numOrNull(body.savedCount),
    linkClicks: numOrNull(body.linkClicks),
    postNewFollowers: numOrNull(body.postNewFollowers),
    postWatchTime: numOrNull(body.postWatchTime),
    trafficType: body.trafficType || '',
    impressions: numOrNull(body.impressions),
    pinClicks: numOrNull(body.pinClicks),
    outboundClicks: numOrNull(body.outboundClicks),
    audience: numOrNull(body.audience),
    clicks: numOrNull(body.clicks),
    ctr: numOrNull(body.ctr),
    engagementRate: numOrNull(body.engagementRate),
    postType: body.postType || '',
    entryType: body.entryType || '',
    avgPosition: numOrNull(body.avgPosition),
    convProductClicks: numOrNull(body.convProductClicks),
    convWhatsappClicks: numOrNull(body.convWhatsappClicks),
    convNewsletterSignups: numOrNull(body.convNewsletterSignups),
    itemsViewed: numOrNull(body.itemsViewed),
    itemsAddedToCart: numOrNull(body.itemsAddedToCart),
    itemsPurchased: numOrNull(body.itemsPurchased),
    itemRevenue: numOrNull(body.itemRevenue),
    notes: body.notes || '',
    createdAt: new Date().toISOString(),
    updatedBy: req.user.username
  };
  db.get('content').push(item).write();
  logAudit({ user: req.user, brand: item.brand, entityType: 'conteudo', entityId: item.id, entityLabel: item.title, action: 'criou' });
  res.json(item);
});

router.put('/:id', requireAuth, (req, res) => {
  const item = db.get('content').find({ id: req.params.id }).value();
  if (!item) return res.status(404).json({ error: 'Conteúdo não encontrado' });
  const body = req.body;
  const fields = ['title', 'url', 'format', 'notes', 'vehicle', 'mediaType', 'uf', 'publishDate', 'pageTrafficSource', 'region', 'buttonName', 'trafficType', 'postType', 'entryType'];
  const numFields = ['reach', 'engagement', 'likes', 'comments', 'shares', 'views', 'year', 'month', 'value', 'scrollDepth', 'buttonClicks', 'pageActiveUsers', 'pageEventCount', 'pageBounceRate', 'downloads', 'avgWatchTime', 'completionRate', 'videoNewFollowers', 'viewers', 'savedCount', 'linkClicks', 'postNewFollowers', 'postWatchTime', 'impressions', 'pinClicks', 'outboundClicks', 'audience', 'clicks', 'ctr', 'engagementRate', 'avgPosition', 'convProductClicks', 'convWhatsappClicks', 'convNewsletterSignups', 'itemsViewed', 'itemsAddedToCart', 'itemsPurchased', 'itemRevenue'];
  const updates = { updatedBy: req.user.username };
  fields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
  numFields.forEach(f => { if (body[f] !== undefined) updates[f] = numOrNull(body[f]); });
  if (body.sponsored !== undefined) updates.sponsored = !!body.sponsored;
  db.get('content').find({ id: req.params.id }).assign(updates).write();
  logAudit({ user: req.user, brand: item.brand, entityType: 'conteudo', entityId: item.id, entityLabel: item.title, action: 'editou' });
  res.json(db.get('content').find({ id: req.params.id }).value());
});

router.delete('/:id', requireAuth, (req, res) => {
  const item = db.get('content').find({ id: req.params.id }).value();
  if (!item) return res.status(404).json({ error: 'Conteúdo não encontrado' });
  db.get('content').remove({ id: req.params.id }).write();
  logAudit({ user: req.user, brand: item.brand, entityType: 'conteudo', entityId: item.id, entityLabel: item.title, action: 'removeu' });
  res.json({ ok: true });
});

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

module.exports = router;
