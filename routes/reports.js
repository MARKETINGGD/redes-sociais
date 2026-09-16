const express = require('express');
const db = require('../db');
const cfg = require('../public/config.js');
const { requireAuth } = require('../middleware/auth');
const { buildChannelExcelReport, buildOverviewExcelReport, buildContentExcelReport } = require('../utils/xlsxReport');

const router = express.Router();

// Gera o relatório completo do canal em Excel (.xlsx), com gráficos nativos (editáveis no
// Excel, não imagens), reunindo indicadores, lançamentos mensais e conteúdos em destaque —
// os mesmos dados exibidos no dashboard.
async function handleExcelReport(req, res) {
  try {
    const { channel } = req.params;
    const { brand, year } = req.query;
    const ch = cfg.channelById(channel);
    if (!ch) return res.status(404).json({ error: 'Canal não encontrado' });
    const brandObj = brand ? cfg.brandById(brand) : null;
    const yearNum = year ? Number(year) : new Date().getFullYear();

    let metrics = db.get('metrics').filter({ channel }).value();
    let content = db.get('content').filter({ channel }).value();
    if (brand) {
      metrics = metrics.filter(m => m.brand === brand);
      content = content.filter(c => c.brand === brand);
    }
    metrics = metrics.filter(m => Number(m.year) === yearNum);
    // Conteúdos em destaque não têm necessariamente "year" preenchido em todos os canais —
    // quando têm, respeita o filtro de ano; quando não, mantém (evita esconder cadastros antigos).
    content = content.filter(c => c.year === undefined || c.year === null || Number(c.year) === yearNum);

    const buf = await buildChannelExcelReport({
      ch,
      metrics,
      content,
      brandLabel: brandObj ? brandObj.label : (brand || ''),
      year: yearNum
    });

    const fileSafeName = (ch.label || ch.id).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${fileSafeName}-${yearNum}.xlsx"`);
    res.send(buf);
  } catch (err) {
    console.error('Erro ao gerar relatório Excel:', err);
    res.status(500).json({ error: 'Não foi possível gerar o relatório em Excel' });
  }
}

// Gera o relatório "Visão geral" em Excel: panorama por canal, evolução de alcance (gráfico
// nativo) e os conteúdos com melhor desempenho — os mesmos dados exibidos na página de Visão geral.
async function handleOverviewExcelReport(req, res) {
  try {
    const { brand, year } = req.query;
    const brandObj = brand ? cfg.brandById(brand) : null;
    if (!brandObj) return res.status(404).json({ error: 'Marca não encontrada' });
    const yearNum = year ? Number(year) : new Date().getFullYear();
    const channels = cfg.channelsForBrand(brand);

    const metrics = db.get('metrics').filter(m => m.brand === brand && Number(m.year) === yearNum).value();
    const allContent = db.get('content').filter(c => c.brand === brand).value();
    // Mesmo recorte usado na tela e no PDF: só conteúdos com alcance/engajamento, ordenados por
    // alcance, limitados aos 6 melhores.
    const topContent = allContent
      .filter(c => (c.reach || 0) > 0 || (c.engagement || 0) > 0)
      .sort((a, b) => (b.reach || 0) - (a.reach || 0))
      .slice(0, 6);

    const buf = await buildOverviewExcelReport({
      brandLabel: brandObj.label,
      year: yearNum,
      channels,
      metrics,
      content: topContent
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-visao-geral-${brand}-${yearNum}.xlsx"`);
    res.send(buf);
  } catch (err) {
    console.error('Erro ao gerar relatório Excel da visão geral:', err);
    res.status(500).json({ error: 'Não foi possível gerar o relatório em Excel' });
  }
}

// Gera o relatório "Conteúdos em destaque" (todos os canais) em Excel.
async function handleContentExcelReport(req, res) {
  try {
    const { brand, channel } = req.query;
    let items = db.get('content').value();
    if (brand) items = items.filter(c => c.brand === brand);
    if (channel && channel !== 'all') items = items.filter(c => c.channel === channel);
    items = items.slice().sort((a, b) => (b.reach || 0) - (a.reach || 0));

    const buf = await buildContentExcelReport({ items });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-conteudos-${brand || 'todos'}.xlsx"`);
    res.send(buf);
  } catch (err) {
    console.error('Erro ao gerar relatório Excel de conteúdos:', err);
    res.status(500).json({ error: 'Não foi possível gerar o relatório em Excel' });
  }
}

// As rotas específicas ("overview", "content-list") precisam vir ANTES de "/excel/:channel",
// senão o Express trataria "overview"/"content-list" como se fossem um id de canal.
router.get('/excel/overview', requireAuth, handleOverviewExcelReport);
router.get('/excel/content-list', requireAuth, handleContentExcelReport);
router.get('/excel/:channel', requireAuth, handleExcelReport);

module.exports = router;
module.exports.handleExcelReport = handleExcelReport;
module.exports.handleOverviewExcelReport = handleOverviewExcelReport;
module.exports.handleContentExcelReport = handleContentExcelReport;
