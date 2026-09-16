const pState = {
  brand: new URLSearchParams(window.location.search).get('brand') || 'ghelplus',
  year: null,
  years: [],
  tab: 'overview',
  charts: {},
  // Paginação de listas/tabelas longas (reseta a cada entrada no canal/página) — mesmo padrão
  // em toda a tela: 5 itens por vez, com botões ‹ Anterior / Próxima ›.
  seoKeywordsPage: 1,
  seoPagesPage: 1,
  channelContentPage: 1,
  globalContentPage: 1
};

const app = document.getElementById('app');

async function papi(path) {
  const res = await fetch('/api/public' + path);
  if (!res.ok) throw new Error('Erro ao carregar dados');
  return res.json();
}

function toast(msg) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// Baixa o relatório completo do canal em Excel (.xlsx), com gráficos nativos do Excel — versão
// pública (link somente leitura), sem exigir login.
async function pDownloadChannelExcelReport(ch, btnEl) {
  const originalLabel = btnEl ? btnEl.textContent : '';
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Gerando...'; }
  try {
    const res = await fetch(`/api/public/reports/excel/${ch.id}?brand=${pState.brand}&year=${pState.year}`);
    if (!res.ok) {
      let msg = 'Não foi possível gerar o relatório em Excel.';
      try { const data = await res.json(); if (data.error) msg = data.error; } catch (e) { /* sem corpo */ }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${ch.id}-${pState.brand}-${pState.year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast(err.message);
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = originalLabel; }
  }
}

async function pboot() {
  if (!BRANDS.some(b => b.id === pState.brand)) pState.brand = 'ghelplus';
  pState.years = await papi(`/years?brand=${pState.brand}`);
  if (!pState.years.length) pState.years = [new Date().getFullYear()];
  pState.year = pState.years[0];
  renderPublicShell();
  await pNavigate('overview');
  // Registra o acesso ao link público (para o admin acompanhar quantas vezes foi visto, e quando) —
  // silencioso, não deve travar/atrapalhar a navegação se falhar.
  fetch('/api/public/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand: pState.brand })
  }).catch(() => {});
}

function renderPublicShell() {
  const brand = brandById(pState.brand);
  document.documentElement.style.setProperty('--current-accent', brand.accent);

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="brand-mark">Resultados (somente leitura)</div>
        <div class="brand-switch" id="brand-switch">
          ${BRANDS.map(b => `<button data-brand="${b.id}" class="${b.id === pState.brand ? 'active' : ''}" style="${b.id === pState.brand ? `background:${b.accent}` : ''}">${escapeHtml(b.label)}</button>`).join('')}
        </div>
        <nav id="nav-tree"></nav>
        <div class="sidebar-footer">
          <div class="dev-signature">Desenvolvido por Raquel Daltoé (Pixie Marketing)</div>
        </div>
      </aside>
      <div class="main">
        <div class="topbar">
          <div style="display:flex;align-items:center;">
            <button class="menu-toggle" id="menu-toggle">☰</button>
            <div>
              <h2 id="topbar-title">Visão geral</h2>
              <div class="sub" id="topbar-sub"></div>
            </div>
          </div>
          <select class="year-select" id="year-select"></select>
        </div>
        <div class="content" id="content"></div>
      </div>
    </div>`;

  buildPublicNav();
  const sel = document.getElementById('year-select');
  sel.innerHTML = pState.years.map(y => `<option value="${y}" ${y === pState.year ? 'selected' : ''}>${y}</option>`).join('');
  sel.addEventListener('change', async () => { pState.year = Number(sel.value); await pNavigate(pState.tab); });

  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
  document.querySelectorAll('#brand-switch button').forEach(btn => {
    btn.addEventListener('click', async () => {
      pState.brand = btn.dataset.brand;
      history.replaceState(null, '', `/public?brand=${pState.brand}`);
      pState.years = await papi(`/years?brand=${pState.brand}`);
      if (!pState.years.length) pState.years = [new Date().getFullYear()];
      pState.year = pState.years[0];
      renderPublicShell();
      await pNavigate('overview');
    });
  });
}

function buildPublicNav() {
  const nav = document.getElementById('nav-tree');
  const groups = {};
  channelsForBrand(pState.brand).forEach(c => { (groups[c.group] = groups[c.group] || []).push(c); });
  let html = `<div class="nav-group"><button class="nav-item ${pState.tab === 'overview' ? 'active' : ''}" data-tab="overview">▤ Visão geral</button></div>`;
  Object.keys(groups).forEach(g => {
    html += `<div class="nav-group"><div class="nav-label">${escapeHtml(g)}</div>`;
    groups[g].forEach(c => {
      html += `<button class="nav-item ${pState.tab === 'channel:' + c.id ? 'active' : ''}" data-tab="channel:${c.id}"><span class="nav-dot" style="background:${c.color}"></span>${escapeHtml(c.label)}</button>`;
    });
    html += `</div>`;
  });
  html += `<div class="nav-group"><div class="nav-label">Análise</div>
    <button class="nav-item ${pState.tab === 'content' ? 'active' : ''}" data-tab="content">★ Conteúdos em destaque</button>
    <button class="nav-item ${pState.tab === 'years' ? 'active' : ''}" data-tab="years">◷ Anos anteriores</button>
  </div>`;
  nav.innerHTML = html;
  nav.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => pNavigate(btn.dataset.tab)));
}

async function pNavigate(tab) {
  pState.tab = tab;
  buildPublicNav();
  const content = document.getElementById('content');
  content.innerHTML = `<div class="spinner-wrap">Carregando…</div>`;
  Object.values(pState.charts).forEach(c => c && c.destroy && c.destroy());
  pState.charts = {};
  try {
    if (tab === 'overview') return pRenderOverview();
    if (tab.startsWith('channel:')) return pRenderChannel(tab.split(':')[1]);
    if (tab === 'content') return pRenderContent();
    if (tab === 'years') return pRenderYears();
  } catch (e) {
    content.innerHTML = `<div class="error-msg">${escapeHtml(e.message)}</div>`;
  }
}

function setTopbar(title, sub) {
  document.getElementById('topbar-title').textContent = title;
  document.getElementById('topbar-sub').textContent = sub || '';
}

function baseChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11.5 }, usePointStyle: true } },
      tooltip: {
        padding: 10,
        titleFont: { size: 12.5, weight: '700' },
        bodyFont: { size: 12 },
        callbacks: {
          title: (items) => items && items.length ? String(items[0].label) : '',
          label: (ctx) => {
            const v = ctx.parsed && (ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed.x);
            return `${ctx.dataset.label}: ${fmtNum(v)}`;
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { ticks: { callback: (v) => fmtCompact(v) }, grid: { color: '#eeece4' } }
    }
  };
}

async function pRenderOverview() {
  setTopbar('Visão geral', `${brandById(pState.brand).label} · ${pState.year}`);
  const metrics = await papi(`/metrics?brand=${pState.brand}&year=${pState.year}`);
  const content = await papi(`/content?brand=${pState.brand}`);
  const contentEl = document.getElementById('content');

  const cards = channelsForBrand(pState.brand).map(ch => {
    const rows = metrics.filter(m => m.channel === ch.id).sort((a, b) => a.month - b.month);
    const last = rows[rows.length - 1];
    const prev = rows[rows.length - 2];
    const field = ch.growth[0];
    const value = last ? last[field] : null;
    const delta = pctChange(prev ? prev[field] : null, value);
    return `
      <div class="card channel-card" style="--ch-color:${ch.color}" data-open="${ch.id}">
        <div class="card-title">${escapeHtml(ch.label)}</div>
        <div class="stat-value">${value !== null && value !== undefined ? fmtCompact(value) : '—'}</div>
        <div class="stat-delta ${delta === null ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}">${delta === null ? 'Sem dado anterior' : fmtPct(delta) + ' vs. mês anterior'}</div>
        <div style="font-size:11.5px;color:var(--text-mute);margin-top:6px;">${escapeHtml(METRIC_LABELS[field])}</div>
      </div>`;
  }).join('');

  const topContent = content.filter(c => (c.reach || 0) > 0).sort((a, b) => (b.reach || 0) - (a.reach || 0)).slice(0, 6);

  contentEl.innerHTML = `
    <div class="section-head" style="flex-wrap:wrap;gap:10px;">
      <h3>Panorama por canal</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" id="download-overview-pdf-btn">⭳ Baixar relatório (PDF)</button>
        <button class="btn btn-ghost btn-sm" id="download-overview-excel-btn">⭳ Baixar relatório (Excel)</button>
      </div>
    </div>
    <div class="grid grid-cols-5">${cards}</div>
    <div class="section-head"><h3>Evolução de seguidores</h3></div>
    <div class="card"><div class="chart-wrap"><canvas id="chart-overview-followers"></canvas></div></div>
    <div class="section-head"><h3>Evolução de alcance</h3></div>
    <div class="card"><div class="chart-wrap"><canvas id="chart-overview"></canvas></div></div>
    <div class="section-head"><h3>Conteúdos com melhor desempenho</h3></div>
    <div class="card">${pRenderContentList(topContent, true)}</div>
  `;
  contentEl.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => pNavigate('channel:' + el.dataset.open)));
  document.getElementById('download-overview-pdf-btn').addEventListener('click', () => downloadOverviewPdf(metrics, topContent));
  document.getElementById('download-overview-excel-btn').addEventListener('click', (e) => downloadOverviewExcelReport(e.target));

  const labels = MONTH_NAMES;

  // gráfico combinado de seguidores no ano — todos os canais que têm a métrica "Seguidores"
  // (followers), independentemente do grupo — ver app.js para detalhes.
  const withFollowers = channelsForBrand(pState.brand).filter(c => c.metrics.includes('followers'));
  const followersDatasets = withFollowers.map(ch => {
    const rows = metrics.filter(m => m.channel === ch.id);
    const data = Array(12).fill(null);
    rows.forEach(r => { data[r.month - 1] = r.followers; });
    return { label: ch.label, data, borderColor: ch.color, backgroundColor: ch.color, tension: 0.35, spanGaps: true, pointRadius: 2 };
  });
  try {
    pState.charts.overviewFollowers = new Chart(document.getElementById('chart-overview-followers'), { type: 'line', data: { labels, datasets: followersDatasets }, options: baseChartOptions() });
  } catch (e) {
    console.error('Não foi possível desenhar o gráfico:', e);
    document.getElementById('chart-overview-followers').closest('.chart-wrap').innerHTML = '<div class="empty-state">Não foi possível carregar o gráfico.</div>';
  }

  // Só entram canais que realmente têm a métrica "Alcance" (reach) — ver app.js para detalhes.
  const social = channelsForBrand(pState.brand).filter(c => c.group === 'Redes sociais' && c.metrics.includes('reach'));
  const datasets = social.map(ch => {
    const rows = metrics.filter(m => m.channel === ch.id);
    const data = Array(12).fill(null);
    rows.forEach(r => { data[r.month - 1] = r.reach; });
    return { label: ch.label, data, borderColor: ch.color, backgroundColor: ch.color, tension: 0.35, spanGaps: true, pointRadius: 2 };
  });
  try {
    pState.charts.overview = new Chart(document.getElementById('chart-overview'), { type: 'line', data: { labels, datasets }, options: baseChartOptions() });
  } catch (e) {
    console.error('Não foi possível desenhar o gráfico:', e);
    document.getElementById('chart-overview').closest('.chart-wrap').innerHTML = '<div class="empty-state">Não foi possível carregar o gráfico.</div>';
  }
}

function downloadOverviewPdf(metrics, topContent) {
  const doc = new jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  const brand = brandById(pState.brand);
  let y = pdfHeader(doc, `Visão geral — ${brand.label}`, `Relatório de ${pState.year} · gerado em ${new Date().toLocaleDateString('pt-BR')}`);
  const cards = channelsForBrand(pState.brand).map(ch => {
    const rows = metrics.filter(m => m.channel === ch.id).sort((a, b) => a.month - b.month);
    const last = rows[rows.length - 1];
    const field = ch.growth[0];
    return { label: `${ch.label} · ${METRIC_LABELS[field]}`, value: last && last[field] !== null && last[field] !== undefined ? fmtValue(field, last[field]) : '—' };
  });
  y = pdfCardsGrid(doc, y, cards);
  y = pdfChartImage(doc, y, 'chart-overview-followers');
  y = pdfChartImage(doc, y, 'chart-overview');
  const contentBody = topContent.map(c => [c.title, channelById(c.channel).label, fmtNum(c.reach), fmtNum(c.engagement), c.url ? 'Abrir' : '—']);
  const links = topContent.map(c => c.url || null);
  pdfTable(doc, y, 'Conteúdos com melhor desempenho', ['Título', 'Canal', 'Alcance', 'Engajamento', 'Link'], contentBody, { linkColIndex: 4, links });
  pdfFooterAndSave(doc, `relatorio-visao-geral-${pState.brand}-${pState.year}.pdf`);
}

// Baixa o relatório "Visão geral" em Excel (.xlsx), sem exigir login — usado no link público.
async function downloadOverviewExcelReport(btnEl) {
  const originalLabel = btnEl ? btnEl.textContent : '';
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Gerando...'; }
  try {
    const res = await fetch(`/api/public/reports/excel/overview?brand=${pState.brand}&year=${pState.year}`);
    if (!res.ok) {
      let msg = 'Não foi possível gerar o relatório em Excel.';
      try { const data = await res.json(); if (data.error) msg = data.error; } catch (e) { /* sem corpo */ }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-visao-geral-${pState.brand}-${pState.year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast(err.message);
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = originalLabel; }
  }
}

async function pRenderChannel(channelId) {
  const ch = channelById(channelId);
  // Reseta a paginação das listas/tabelas longas sempre que a pessoa entra/troca de canal.
  pState.seoKeywordsPage = 1;
  pState.seoPagesPage = 1;
  pState.channelContentPage = 1;
  setTopbar(ch.label, `${brandById(pState.brand).label} · ${pState.year}`);
  const metrics = (await papi(`/metrics?brand=${pState.brand}&year=${pState.year}`)).filter(m => m.channel === channelId).sort((a, b) => a.month - b.month);
  const allContent = (await papi(`/content?brand=${pState.brand}`)).filter(c => c.channel === channelId);
  const sortField = ch.topPagesChart ? 'views' : ch.ecommerceCatalog ? 'itemRevenue' : 'reach';
  const sortedContent = ch.pressReport
    ? allContent.slice().sort((a, b) => {
        const dateA = a.publishDate || `${a.year}-${String(a.month || 1).padStart(2, '0')}-01`;
        const dateB = b.publishDate || `${b.year}-${String(b.month || 1).padStart(2, '0')}-01`;
        return dateA.localeCompare(dateB);
      })
    : allContent.slice().sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));
  // Mostra todos os conteúdos cadastrados neste canal/marca — antes só os 8 primeiros apareciam aqui.
  const content = sortedContent;
  const contentEl = document.getElementById('content');
  const last = metrics[metrics.length - 1];
  // Indicador compara sempre com o mês imediatamente anterior lançado — mesmo critério usado
  // nos cards da Visão geral ("Panorama por canal"), em vez da variação acumulada no ano.
  const prev = metrics[metrics.length - 2];
  const contentSectionTitle = ch.pressReport ? 'Matérias veiculadas' : ((ch.topPagesChart || ch.ecommerceCatalog) ? (ch.topItemsLabel || 'Páginas mais acessadas') : 'Conteúdos que mais tiveram resultado');
  // Análise SEO do Site tem 2 rankings separados (palavras-chave e páginas) em vez da lista única de conteúdos.
  // Ranking de palavras-chave: ordem crescente de mês (para acompanhar a evolução), em vez de
  // por cliques como os demais rankings — pedido específico para esta tabela.
  const seoKeywords = ch.seoAnalysis ? allContent.filter(c => c.entryType !== 'page').slice().sort((a, b) => (a.year - b.year) || ((a.month || 0) - (b.month || 0)) || ((b.clicks || 0) - (a.clicks || 0))) : [];
  const seoPages = ch.seoAnalysis ? allContent.filter(c => c.entryType === 'page').slice().sort((a, b) => (b.clicks || 0) - (a.clicks || 0)) : [];

  const statCards = ch.metrics.map(field => {
    const lastVal = last ? chFieldValue(ch, last, field) : null;
    const prevVal = prev ? chFieldValue(ch, prev, field) : null;
    const delta = pctChange(prevVal, lastVal);
    const badge = qualityBadge(field, lastVal);
    return `<div class="card">
      <div class="card-title">${escapeHtml(METRIC_LABELS[field])}${badge ? ` <span class="tag-pill" style="margin-left:4px;color:${badge.className === 'up' ? '#17805f' : badge.className === 'down' ? '#b8452f' : '#8a6d1f'}">${badge.label}</span>` : ''}</div>
      <div class="stat-value">${lastVal !== null && lastVal !== undefined ? fmtValue(field, lastVal) : '—'}</div>
      <div class="stat-delta ${delta === null ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}">${delta === null ? 'Sem dado anterior' : fmtPct(delta) + ' vs. mês anterior'}</div>
    </div>`;
  }).join('');

  contentEl.innerHTML = `
    <div class="section-head" style="flex-wrap:wrap;gap:10px;">
      <h3>Indicadores — ${pState.year}</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" id="download-channel-pdf-btn">⭳ Baixar relatório (PDF)</button>
        <button class="btn btn-ghost btn-sm" id="download-channel-excel-btn">⭳ Baixar relatório (Excel)</button>
      </div>
    </div>
    <div class="grid grid-cols-4">${statCards}</div>
    ${ch.viewsBreakdownChart ? `<div class="section-head"><h3>${escapeHtml(ch.viewsBreakdownChart.title)}</h3></div>
    <div class="card"><div class="chart-wrap"><canvas id="chart-views-breakdown"></canvas></div></div>` : ''}
    ${ch.engagementCompareChart || ch.mediaTypeChart ? `<div class="section-head"><h3>Engajamento</h3></div>
    <div class="grid grid-cols-2">
      ${ch.engagementCompareChart ? `<div class="card"><div class="card-title">${escapeHtml(ch.engagementCompareChart.title)}</div><div class="chart-wrap small"><canvas id="chart-engagement-compare"></canvas></div></div>` : ''}
      ${ch.mediaTypeChart ? `<div class="card"><div class="card-title">${escapeHtml(ch.mediaTypeChart.title)}</div><div class="chart-wrap small"><canvas id="chart-media-type"></canvas></div></div>` : ''}
    </div>` : ''}
    ${ch.performanceSection ? `<div class="section-head"><h3>${escapeHtml(ch.performanceSection.title)}</h3></div>
    <div class="grid grid-cols-3">
      ${ch.performanceSection.charts.map((c, i) => `<div class="card"><div class="card-title">${escapeHtml(c.title)}</div><div class="chart-wrap small"><canvas id="chart-performance-${i}"></canvas></div></div>`).join('')}
    </div>` : ''}
    <div class="section-head"><h3>${escapeHtml(ch.evolutionTitle || 'Evolução no ano')}</h3></div>
    <div class="card"><div class="chart-wrap"><canvas id="chart-channel"></canvas></div></div>
    ${ch.viewersChart ? `<div class="section-head"><h3>${escapeHtml(ch.viewersChartTitle || 'Recorrentes x novos')}</h3></div>
    <div class="card"><div class="chart-wrap small"><canvas id="chart-viewers"></canvas></div></div>` : ''}
    ${ch.pressReport ? `<div class="grid grid-cols-2">
      <div class="card"><div class="section-head" style="margin:0 0 12px;"><h3>Matérias por tipo</h3></div><div class="chart-wrap small"><canvas id="chart-press-type"></canvas></div></div>
      <div class="card"><div class="section-head" style="margin:0 0 12px;"><h3>Matérias por estado</h3></div><div class="chart-wrap small"><canvas id="chart-press-uf"></canvas></div></div>
    </div>` : ''}
    <div class="section-head"><h3>Lançamentos mensais</h3></div>
    <div class="card">${pRenderMetricsTable(ch, metrics)}</div>
    ${ch.seoAnalysis ? `
    <div class="section-head"><h3>Top 10 palavras-chave x posição média</h3></div>
    <div class="card"><div class="chart-wrap small"><canvas id="chart-seo-top-keywords"></canvas></div></div>
    <div class="section-head"><h3>Ranking de palavras-chave</h3></div>
    <div class="card"><div id="seo-keywords-table-wrap"></div></div>
    <div class="section-head"><h3>Ranking de páginas</h3></div>
    <div class="card"><div id="seo-pages-table-wrap"></div></div>
    ` : `
    <div class="section-head"><h3>${escapeHtml(contentSectionTitle)}</h3></div>
    ${ch.topPagesChart ? `<div class="card"><div class="chart-wrap"><canvas id="chart-top-pages"></canvas></div></div>` : ''}
    <div class="card"><div id="channel-content-list-wrap"></div></div>
    `}
  `;

  document.getElementById('download-channel-pdf-btn').addEventListener('click', () => {
    downloadChannelPdf(ch, metrics, allContent);
  });

  document.getElementById('download-channel-excel-btn').addEventListener('click', (e) => {
    pDownloadChannelExcelReport(ch, e.target);
  });

  const evoFields = ch.evolutionFields || ch.growth;
  const labels = metrics.map(m => MONTH_NAMES[m.month - 1]);
  const datasets = evoFields.map((field, i) => ({
    label: METRIC_LABELS[field], data: metrics.map(m => chFieldValue(ch, m, field)),
    borderColor: i === 0 ? ch.color : '#9a9a9a', backgroundColor: i === 0 ? ch.color : '#9a9a9a',
    tension: 0.35, yAxisID: i === 0 ? 'y' : 'y1', pointRadius: 3
  }));
  const opts = baseChartOptions();
  opts.scales.y.title = { display: true, text: METRIC_LABELS[evoFields[0]], font: { size: 11.5, weight: '600' }, color: ch.color };
  if (evoFields.length > 1) opts.scales.y1 = { position: 'right', grid: { display: false }, ticks: { callback: (v) => fmtCompact(v) }, title: { display: true, text: METRIC_LABELS[evoFields[1]], font: { size: 11.5, weight: '600' }, color: '#8a8d99' } };
  try {
    pState.charts.channel = new Chart(document.getElementById('chart-channel'), { type: 'line', data: { labels, datasets }, options: opts });
  } catch (e) {
    console.error('Não foi possível desenhar o gráfico:', e);
    document.getElementById('chart-channel').closest('.chart-wrap').innerHTML = '<div class="empty-state">Não foi possível carregar o gráfico.</div>';
  }

  if (ch.viewsBreakdownChart) {
    try {
      const bd = ch.viewsBreakdownChart;
      const colors = [ch.color, '#1e8a6e', '#b5772e'];
      const bdDatasets = bd.fields.map((field, i) => ({
        label: METRIC_LABELS[field], data: metrics.map(m => m[field]),
        borderColor: colors[i % colors.length], backgroundColor: colors[i % colors.length],
        tension: 0.35, pointRadius: 3
      }));
      const bdOpts = baseChartOptions();
      bdOpts.scales.y.title = { display: true, text: 'Visualizações', font: { size: 11.5, weight: '600' }, color: ch.color };
      pState.charts.viewsBreakdown = new Chart(document.getElementById('chart-views-breakdown'), { type: 'line', data: { labels, datasets: bdDatasets }, options: bdOpts });
    } catch (e) { console.error(e); }
  }

  if (ch.engagementCompareChart) {
    try {
      const field = ch.engagementCompareChart.field;
      const prevM = metrics[metrics.length - 2];
      const ecOpts = baseChartOptions();
      ecOpts.scales.y.title = { display: true, text: METRIC_LABELS[field], font: { size: 11.5, weight: '600' }, color: ch.color };
      pState.charts.engagementCompare = new Chart(document.getElementById('chart-engagement-compare'), {
        type: 'bar',
        data: {
          labels: [prevM ? MONTH_NAMES_FULL[prevM.month - 1] : 'Mês anterior', last ? MONTH_NAMES_FULL[last.month - 1] : 'Mês atual'],
          datasets: [{ label: METRIC_LABELS[field], data: [prevM ? prevM[field] : null, last ? last[field] : null], backgroundColor: ['#c9c9c9', ch.color] }]
        },
        options: ecOpts
      });
    } catch (e) { console.error(e); }
  }

  if (ch.mediaTypeChart) {
    try {
      const mt = ch.mediaTypeChart;
      const palette = [ch.color, '#8a8d99', '#1e8a6e', '#b5772e'];
      pState.charts.mediaType = new Chart(document.getElementById('chart-media-type'), {
        type: 'doughnut',
        data: { labels: mt.labels, datasets: [{ data: mt.fields.map(f => last ? last[f] : null), backgroundColor: mt.fields.map((f, i) => palette[i % palette.length]) }] },
        options: doughnutChartOptions()
      });
    } catch (e) { console.error(e); }
  }

  if (ch.performanceSection) {
    const palette2 = [ch.color, '#8a8d99'];
    ch.performanceSection.charts.forEach((chartDef, idx) => {
      try {
        const datasets = chartDef.series.map((s, i) => ({
          label: s.label,
          data: metrics.map(m => {
            if (chartDef.type === 'rate') {
              const v = m[s.field];
              const views = m.views;
              if (v === null || v === undefined || !views) return null;
              return Number(((v / views) * 100).toFixed(2));
            }
            return m[s.field];
          }),
          borderColor: palette2[i % palette2.length],
          backgroundColor: palette2[i % palette2.length],
          tension: 0.35,
          pointRadius: 3,
          _defKey: s.defKey
        }));
        const pOpts = baseChartOptions();
        pOpts.scales.y.title = { display: true, text: chartDef.type === 'rate' ? '%' : 'Pessoas', font: { size: 11.5, weight: '600' }, color: ch.color };
        pOpts.plugins.tooltip.callbacks.label = (ctx) => {
          const v = ctx.parsed.y;
          const suffix = chartDef.type === 'rate' ? '%' : '';
          return `${ctx.dataset.label}: ${fmtNum(v)}${suffix}`;
        };
        pOpts.plugins.tooltip.callbacks.afterLabel = (ctx) => {
          const def = METRIC_DEFINITIONS[ctx.dataset._defKey];
          if (!def) return '';
          const words = def.split(' ');
          const lines = [];
          let line = '';
          words.forEach(w => {
            if ((line + ' ' + w).trim().length > 42) { lines.push(line.trim()); line = w; }
            else line = (line + ' ' + w).trim();
          });
          if (line) lines.push(line.trim());
          return lines;
        };
        pState.charts['performance' + idx] = new Chart(document.getElementById('chart-performance-' + idx), { type: 'line', data: { labels, datasets }, options: pOpts });
      } catch (e) {
        console.error('Não foi possível desenhar o gráfico:', e);
        const el = document.getElementById('chart-performance-' + idx);
        if (el) el.closest('.chart-wrap').innerHTML = '<div class="empty-state">Não foi possível carregar o gráfico.</div>';
      }
    });
  }

  if (ch.viewersChart) {
    try {
      pState.charts.viewers = new Chart(document.getElementById('chart-viewers'), {
        type: 'bar',
        data: { labels, datasets: [
          { label: METRIC_LABELS[ch.viewersChart[1]], data: metrics.map(m => m[ch.viewersChart[1]]), backgroundColor: '#9a9a9a' },
          { label: METRIC_LABELS[ch.viewersChart[0]], data: metrics.map(m => m[ch.viewersChart[0]]), backgroundColor: ch.color }
        ] },
        options: baseChartOptions()
      });
    } catch (e) { console.error(e); }
  }

  if (ch.topPagesChart) {
    try {
      const { labels, datasets } = buildTopItemsChartData(allContent, ch.color);
      const opts = baseChartOptions();
      opts.scales.y.title = { display: true, text: 'Visualizações', font: { size: 11.5, weight: '600' }, color: ch.color };
      opts.interaction = { mode: 'point', intersect: true };
      pState.charts.topPages = new Chart(document.getElementById('chart-top-pages'), {
        type: 'bar',
        data: { labels, datasets },
        options: opts
      });
    } catch (e) { console.error(e); }
  }

  // Análise SEO do Site: as 10 palavras-chave que mais aparecem (mais vezes cadastradas, somando
  // todos os meses) x a posição média de cada uma — fica acima do ranking de palavras-chave.
  if (ch.seoAnalysis) {
    try {
      const byKeyword = {};
      seoKeywords.forEach(c => {
        const key = String(c.title || '').trim().toLowerCase();
        if (!key) return;
        if (!byKeyword[key]) byKeyword[key] = { label: String(c.title).trim(), count: 0, sum: 0, withPosition: 0 };
        byKeyword[key].count++;
        if (c.avgPosition !== null && c.avgPosition !== undefined && c.avgPosition !== '') {
          byKeyword[key].sum += Number(c.avgPosition);
          byKeyword[key].withPosition++;
        }
      });
      const top10 = Object.values(byKeyword).sort((a, b) => b.count - a.count).slice(0, 10);
      const opts = baseChartOptions();
      opts.scales.y.title = { display: true, text: 'Posição média', font: { size: 11.5, weight: '600' }, color: ch.color };
      // Posição média sempre com o número exato (1 casa decimal) — ver app.js para detalhes.
      opts.scales.y.grace = '12%';
      opts.plugins.tooltip.callbacks.label = (ctx) => `${ctx.dataset.label}: ${fmtDecimal1(ctx.parsed.y)}`;
      pState.charts.seoTopKeywords = new Chart(document.getElementById('chart-seo-top-keywords'), {
        type: 'bar',
        data: {
          labels: top10.map(k => k.label),
          datasets: [{
            label: 'Posição média',
            data: top10.map(k => k.withPosition ? Number((k.sum / k.withPosition).toFixed(1)) : null),
            backgroundColor: ch.color
          }]
        },
        options: opts,
        plugins: [barValueLabelPlugin(fmtDecimal1)]
      });
    } catch (e) { console.error(e); }
  }

  // Ranking de palavras-chave e Ranking de páginas (Análise SEO do Site), ou a lista de conteúdos
  // do canal nos demais casos: todos paginados de 5 em 5, só a tabela/lista troca de página.
  if (ch.seoAnalysis) {
    pRenderSeoRankingPage('seo-keywords-table-wrap', 'seo-keywords', seoKeywords, 'Palavra-chave', true, 'seoKeywordsPage');
    pRenderSeoRankingPage('seo-pages-table-wrap', 'seo-pages', seoPages, 'Página', true, 'seoPagesPage');
  } else {
    pRenderPaginatedList('channel-content-list-wrap', 'channel-content', content, 'channelContentPage', (items, offset) => pRenderContentList(items, false, offset));
  }

  if (ch.pressReport) {
    const byType = {}; const byUf = {};
    allContent.forEach(c => {
      const t = c.mediaType || 'Não informado';
      byType[t] = (byType[t] || 0) + 1;
      const uf = c.uf || '—';
      byUf[uf] = (byUf[uf] || 0) + 1;
    });
    const typeColors = { Online: '#c8a94a', Revista: '#b5395f', Social: '#d98c2b', Site: '#4b5eaa', 'Não informado': '#5a5d6b' };
    try {
      pState.charts.pressType = new Chart(document.getElementById('chart-press-type'), {
        type: 'doughnut',
        data: { labels: Object.keys(byType), datasets: [{ data: Object.values(byType), backgroundColor: Object.keys(byType).map(k => typeColors[k] || '#8a8d99') }] },
        options: doughnutChartOptions()
      });
    } catch (e) { console.error(e); }
    const ufEntries = Object.entries(byUf).sort((a, b) => b[1] - a[1]);
    try {
      pState.charts.pressUf = new Chart(document.getElementById('chart-press-uf'), {
        type: 'bar',
        data: { labels: ufEntries.map(e => e[0]), datasets: [{ label: 'Matérias', data: ufEntries.map(e => e[1]), backgroundColor: ch.color }] },
        options: horizontalBarChartOptions()
      });
    } catch (e) { console.error(e); }
  }
}

function downloadChannelPdf(ch, metrics, content) {
  const doc = new jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  const brand = brandById(pState.brand);
  let y = pdfHeader(doc, `${ch.label} — ${brand.label}`, `Relatório de ${pState.year} · gerado em ${new Date().toLocaleDateString('pt-BR')}`);

  const last = metrics[metrics.length - 1];
  const cards = ch.metrics.map(f => { const v = last ? chFieldValue(ch, last, f) : null; return { label: METRIC_LABELS[f], value: v !== null && v !== undefined ? fmtValue(f, v) : '—' }; });
  y = pdfCardsGrid(doc, y, cards);

  if (ch.viewsBreakdownChart) y = pdfChartImage(doc, y, 'chart-views-breakdown');
  if (ch.engagementCompareChart) y = pdfChartImage(doc, y, 'chart-engagement-compare');
  if (ch.mediaTypeChart) y = pdfChartImage(doc, y, 'chart-media-type');
  if (ch.performanceSection) ch.performanceSection.charts.forEach((c, i) => { y = pdfChartImage(doc, y, 'chart-performance-' + i); });
  y = pdfChartImage(doc, y, 'chart-channel');
  if (ch.viewersChart) y = pdfChartImage(doc, y, 'chart-viewers');
  if (ch.topPagesChart) y = pdfChartImage(doc, y, 'chart-top-pages');

  const tableFields = ch.tableMetrics || ch.metrics;
  const hasMailing = (ch.textFields || []).includes('mailingLink');
  const monthHead = ['Mês', ...tableFields.map(f => METRIC_LABELS[f]), ...(hasMailing ? ['Mailing'] : [])];
  const monthBody = metrics.map(m => [MONTH_NAMES_FULL[m.month - 1], ...tableFields.map(f => { const v = chFieldValue(ch, m, f); return v !== null && v !== undefined ? fmtValue(f, v) : '—'; }), ...(hasMailing ? [m.mailingLink ? 'Abrir' : '—'] : [])]);
  const mailingLinkColIndex = hasMailing ? monthHead.length - 1 : undefined;
  const mailingLinks = hasMailing ? metrics.map(m => m.mailingLink || null) : undefined;
  y = pdfTable(doc, y, 'Lançamentos mensais', monthHead, monthBody, { linkColIndex: mailingLinkColIndex, links: mailingLinks });

  if (ch.seoAnalysis) {
    const seoHead = ['Palavra-chave / Página', 'Cliques', 'Impressões', 'CTR', 'Posição média'];
    const toRow = c => [c.title, fmtNum(c.clicks), fmtNum(c.impressions), c.ctr !== null && c.ctr !== undefined && c.ctr !== '' ? c.ctr + '%' : '—', c.avgPosition !== null && c.avgPosition !== undefined && c.avgPosition !== '' ? c.avgPosition : '—'];
    const keywords = content.filter(c => c.entryType !== 'page').slice().sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    const pages = content.filter(c => c.entryType === 'page').slice().sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    y = pdfTable(doc, y, 'Ranking de palavras-chave', seoHead, keywords.map(toRow));
    y = pdfTable(doc, y, 'Ranking de páginas', seoHead, pages.map(toRow));
    pdfFooterAndSave(doc, `relatorio-${ch.id}-${pState.brand}-${pState.year}.pdf`);
    return;
  }

  const items = ch.pressReport ? content : content.slice(0, 40);
  if (items.length) {
    const isPress = ch.pressReport;
    const isProduct = ch.isProductCatalog;
    const isVideo = ch.videoMetrics;
    const isInstagram = ch.instagramPost;
    const isPinterest = ch.pinterestPost;
    const isLinkedin = ch.linkedinPost;
    const isEcommerce = ch.ecommerceCatalog;
    const isPage = ch.topPagesChart && !isProduct;
    const contentHead = isPress ? ['Título', 'Veículo', 'Tipo', 'UF', 'Data', 'Centimetragem', 'Link'] : isProduct ? ['Produto', 'Tipo', 'Estado', 'Visitas', 'Downloads', 'Link'] : isVideo ? ['Título', 'Formato', 'Visualizações', 'Assistiu completo', 'Novos seguidores', 'Link'] : isInstagram ? ['Título', 'Formato', 'Tipo', 'Alcance', 'Visualizações', 'Interações', 'Curtidas', 'Salvos', 'Novos seguidores', 'Link'] : isPinterest ? ['Título', 'Formato', 'Impressões', 'Cliques no Pin', 'Salvos', 'Cliques de saída', 'Comentários', 'Reações', 'Link'] : isLinkedin ? ['Título', 'Tipo de publicação', 'Tipo', 'Público', 'Impressões', 'Visualizações', 'Cliques', 'CTR', 'Engajamento', 'Link'] : isEcommerce ? ['Produto', 'Origem do tráfego', 'Itens vistos', 'Itens no carrinho', 'Itens comprados', 'Receita do item', 'Link'] : isPage ? ['Título', 'Origem', 'Região', 'Visualizações', 'Link'] : ['Título', 'Formato', 'Alcance', 'Engajamento', 'Link'];
    const contentBody = items.map(c => isPress
      ? [c.title, c.vehicle || '—', c.mediaType || '—', c.uf || '—', c.publishDate || '—', fmtCurrency(c.value), c.url ? 'Abrir' : '—']
      : isProduct
        ? [c.title, c.format || '—', c.uf || '—', fmtNum(c.views), fmtNum(c.downloads), c.url ? 'Abrir' : '—']
        : isVideo
          ? [c.title, c.format || '—', fmtNum(c.views), c.completionRate !== null && c.completionRate !== undefined ? c.completionRate + '%' : '—', fmtNum(c.videoNewFollowers), c.url ? 'Abrir' : '—']
          : isInstagram
            ? [c.title, c.format || '—', c.trafficType || '—', fmtNum(c.reach), fmtNum(c.views), fmtNum(c.engagement), fmtNum(c.likes), fmtNum(c.savedCount), fmtNum(c.postNewFollowers), c.url ? 'Abrir' : '—']
            : isPinterest
              ? [c.title, c.format || '—', fmtNum(c.impressions), fmtNum(c.pinClicks), fmtNum(c.savedCount), fmtNum(c.outboundClicks), fmtNum(c.comments), fmtNum(c.likes), c.url ? 'Abrir' : '—']
              : isLinkedin
                ? [c.title, c.postType || '—', c.trafficType || '—', fmtNum(c.audience), fmtNum(c.impressions), fmtNum(c.views), fmtNum(c.clicks), c.ctr !== null && c.ctr !== undefined ? c.ctr + '%' : '—', c.engagementRate !== null && c.engagementRate !== undefined ? c.engagementRate + '%' : '—', c.url ? 'Abrir' : '—']
                : isEcommerce
                  ? [c.title, c.pageTrafficSource || '—', fmtNum(c.itemsViewed), fmtNum(c.itemsAddedToCart), fmtNum(c.itemsPurchased), fmtCurrency(c.itemRevenue), c.url ? 'Abrir' : '—']
                  : isPage
                    ? [c.title, c.pageTrafficSource || '—', c.region || '—', fmtNum(c.views), c.url ? 'Abrir' : '—']
                    : [c.title, c.format || '—', fmtNum(c.reach), fmtNum(c.engagement), c.url ? 'Abrir' : '—']);
    const linkColIndex = contentHead.length - 1;
    const links = items.map(c => c.url || null);
    pdfTable(doc, y, ch.pressReport ? 'Matérias veiculadas' : (ch.topPagesChart || ch.ecommerceCatalog) ? (ch.topItemsLabel || 'Páginas mais acessadas') : 'Conteúdos em destaque', contentHead, contentBody, { linkColIndex, links });
  }

  pdfFooterAndSave(doc, `relatorio-${ch.id}-${pState.brand}-${pState.year}.pdf`);
}

function pRenderMetricsTable(ch, metrics) {
  if (!metrics.length) return `<div class="empty-state">Nenhum dado lançado neste ano ainda.</div>`;
  const tableFields = ch.tableMetrics || ch.metrics;
  const textFields = ch.textFields || [];
  const showIndicators = !!ch.tableGrowthIndicators;
  const cellHtml = (m, idx, f) => {
    const val = chFieldValue(ch, m, f);
    const display = val !== null && val !== undefined ? fmtValue(f, val) : '—';
    if (showIndicators && ch.growth.includes(f) && idx > 0) {
      const prevVal = chFieldValue(ch, metrics[idx - 1], f);
      if (val !== null && val !== undefined && prevVal !== null && prevVal !== undefined) {
        if (val > prevVal) return `<span style="color:#17805f;">▲ ${display}</span>`;
        if (val < prevVal) return `<span style="color:#b8452f;">▼ ${display}</span>`;
      }
    }
    return display;
  };
  return `<table>
    <thead><tr><th>Mês</th>${tableFields.map(f => `<th class="num">${escapeHtml(METRIC_LABELS[f])}</th>`).join('')}${textFields.map(f => `<th>${escapeHtml(METRIC_LABELS[f])}</th>`).join('')}</tr></thead>
    <tbody>${metrics.map((m, idx) => `<tr><td>${MONTH_NAMES_FULL[m.month - 1]}</td>${tableFields.map(f => `<td class="num">${cellHtml(m, idx, f)}</td>`).join('')}${textFields.map(f => `<td>${m[f] ? (f === 'mailingLink' ? `<a href="${escapeHtml(m[f])}" target="_blank" rel="noopener">Abrir</a>` : escapeHtml(m[f])) : '—'}</td>`).join('')}</tr>`).join('')}</tbody>
    ${ch.totalsFields && ch.totalsFields.length ? `<tfoot><tr style="font-weight:700;border-top:2px solid var(--line);">
      <td>Total no ano</td>
      ${tableFields.map(f => `<td class="num">${ch.totalsFields.includes(f) ? fmtValue(f, metrics.reduce((sum, m) => sum + (m[f] || 0), 0)) : ''}</td>`).join('')}
      ${textFields.map(() => `<td></td>`).join('')}
    </tr></tfoot>` : ''}
  </table>`;
}

// Versão somente-leitura da tabela de ranking da Análise SEO do Site (sem botões de editar/excluir).
function pRenderSeoRankingTable(items, colLabel, showMonth) {
  if (!items.length) return `<div class="empty-state">Nenhum item cadastrado ainda.</div>`;
  return `
    <table>
      <thead><tr>
        ${showMonth ? '<th>Mês</th>' : ''}
        <th>${escapeHtml(colLabel)}</th>
        <th class="num">Cliques</th>
        <th class="num">Impressões</th>
        <th class="num">CTR</th>
        <th class="num">Posição média</th>
      </tr></thead>
      <tbody>
        ${items.map(c => `
          <tr>
            ${showMonth ? `<td>${c.month ? escapeHtml(MONTH_NAMES[c.month - 1]) + (c.year ? '/' + c.year : '') : '—'}</td>` : ''}
            <td>${escapeHtml(c.title)}</td>
            <td class="num">${fmtNum(c.clicks)}</td>
            <td class="num">${fmtNum(c.impressions)}</td>
            <td class="num">${c.ctr !== null && c.ctr !== undefined && c.ctr !== '' ? c.ctr + '%' : '—'}</td>
            <td class="num">${c.avgPosition !== null && c.avgPosition !== undefined && c.avgPosition !== '' ? c.avgPosition : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// Paginação padrão (somente leitura) de qualquer lista/tabela longa do link público — 5 itens por
// vez, com botões ‹ Anterior / Próxima ›. Só o wrap trocado é reescrito a cada clique; o resto da
// tela (scroll, cards, gráficos) fica parado.
const TABLE_PAGE_SIZE = 5;

function paginateItems(items, page, perPage) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const clamped = Math.min(Math.max(1, page), totalPages);
  const start = (clamped - 1) * perPage;
  return { pageItems: items.slice(start, start + perPage), page: clamped, totalPages, offset: start };
}

function paginationControlsHtml(idPrefix, page, totalPages) {
  if (totalPages <= 1) return '';
  return `
    <div class="pagination-controls">
      <button class="btn btn-ghost btn-sm" id="${idPrefix}-prev-btn" ${page <= 1 ? 'disabled' : ''}>‹ Anterior</button>
      <span class="pagination-info">Página ${page} de ${totalPages}</span>
      <button class="btn btn-ghost btn-sm" id="${idPrefix}-next-btn" ${page >= totalPages ? 'disabled' : ''}>Próxima ›</button>
    </div>`;
}

// Renderiza (e repagina, sem refazer a página toda) uma lista/tabela longa qualquer. `renderItemsFn`
// recebe (itensDaPágina, offset) — offset é a posição do 1º item da página na lista completa, usado
// pra numeração de ranking continuar certa entre páginas (6, 7, 8... na página 2, não 1, 2, 3 de novo).
function pRenderPaginatedList(wrapId, idPrefix, allItems, pageStateKey, renderItemsFn) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  const { pageItems, page, totalPages, offset } = paginateItems(allItems, pState[pageStateKey] || 1, TABLE_PAGE_SIZE);
  pState[pageStateKey] = page;
  wrap.innerHTML = renderItemsFn(pageItems, offset) + paginationControlsHtml(idPrefix, page, totalPages);
  const prevBtn = document.getElementById(`${idPrefix}-prev-btn`);
  const nextBtn = document.getElementById(`${idPrefix}-next-btn`);
  if (prevBtn) prevBtn.addEventListener('click', () => { pState[pageStateKey] = page - 1; pRenderPaginatedList(wrapId, idPrefix, allItems, pageStateKey, renderItemsFn); });
  if (nextBtn) nextBtn.addEventListener('click', () => { pState[pageStateKey] = page + 1; pRenderPaginatedList(wrapId, idPrefix, allItems, pageStateKey, renderItemsFn); });
}

function pRenderSeoRankingPage(wrapId, idPrefix, allItems, colLabel, showMonth, pageStateKey) {
  pRenderPaginatedList(wrapId, idPrefix, allItems, pageStateKey, (items) => pRenderSeoRankingTable(items, colLabel, showMonth));
}

function pRenderContentList(items, showChannel, rankOffset) {
  if (!items.length) return `<div class="empty-state">Nenhum conteúdo cadastrado ainda.</div>`;
  rankOffset = rankOffset || 0;
  return items.map((c, i) => {
    const ch = channelById(c.channel);
    const isPress = c.channel === 'assessoria';
    const isProduct = !!(ch && ch.isProductCatalog);
    const isVideo = !!(ch && ch.videoMetrics);
    const isInstagram = !!(ch && ch.instagramPost);
    const isPinterest = !!(ch && ch.pinterestPost);
    const isLinkedin = !!(ch && ch.linkedinPost);
    const isBlog = c.channel === 'blog';
    const isSeo = c.channel === 'siteSeo';
    const isEcommerce = c.channel === 'ecommerce';
    const isPage = (c.channel === 'site' || c.channel === 'blog') && !isProduct;
    const metaParts = [];
    if (showChannel) metaParts.push(`<span class="tag-pill" style="color:${ch.color}">${escapeHtml(ch.label)}</span>`);
    if (isPress) {
      if (c.vehicle) metaParts.push(escapeHtml(c.vehicle));
      if (c.mediaType) metaParts.push(escapeHtml(c.mediaType));
      if (c.uf) metaParts.push(escapeHtml(c.uf));
      metaParts.push(c.publishDate ? new Date(c.publishDate + 'T00:00:00').toLocaleDateString('pt-BR') : (c.month ? MONTH_NAMES[c.month - 1] + '/' + c.year : ''));
    } else if (isProduct) {
      if (c.format) metaParts.push(escapeHtml(c.format));
      if (c.uf) metaParts.push(escapeHtml(c.uf));
      if (c.month) metaParts.push(MONTH_NAMES[c.month - 1] + '/' + c.year);
    } else if (isPage) {
      if (c.pageTrafficSource) metaParts.push(escapeHtml(c.pageTrafficSource));
      if (c.region) metaParts.push(escapeHtml(c.region));
      if (!isBlog && c.buttonName) metaParts.push(`Botão: ${escapeHtml(c.buttonName)}`);
      if (isBlog && c.engagementRate !== null && c.engagementRate !== undefined && c.engagementRate !== '') metaParts.push(`Engajamento: ${c.engagementRate}%`);
      if (c.month) metaParts.push(MONTH_NAMES[c.month - 1] + '/' + c.year);
    } else if (isVideo) {
      if (c.format) metaParts.push(escapeHtml(c.format));
      if (c.sponsored) metaParts.push(`<span class="tag-pill" style="color:#b5772e;">Patrocinado</span>`);
      if (c.completionRate !== null && c.completionRate !== undefined) metaParts.push(`Assistiu completo: ${c.completionRate}%`);
      if (c.month) metaParts.push(MONTH_NAMES[c.month - 1] + '/' + c.year);
    } else if (isInstagram) {
      if (c.format) metaParts.push(escapeHtml(c.format));
      if (c.trafficType) metaParts.push(`<span class="tag-pill" style="color:${c.trafficType === 'Orgânico' ? '#17805f' : '#1d4fa3'}">${escapeHtml(c.trafficType)}</span>`);
      if (c.month) metaParts.push(MONTH_NAMES[c.month - 1] + '/' + c.year);
    } else if (isSeo) {
      metaParts.push(c.entryType === 'page' ? 'Página' : 'Palavra-chave');
      if (c.month) metaParts.push(MONTH_NAMES[c.month - 1] + '/' + c.year);
    } else if (isEcommerce) {
      if (c.pageTrafficSource) metaParts.push(escapeHtml(c.pageTrafficSource));
      if (c.month) metaParts.push(MONTH_NAMES[c.month - 1] + '/' + c.year);
    } else if (isPinterest) {
      if (c.format) metaParts.push(escapeHtml(c.format));
      if (c.month) metaParts.push(MONTH_NAMES[c.month - 1] + '/' + c.year);
    } else if (isLinkedin) {
      if (c.postType) metaParts.push(escapeHtml(c.postType));
      if (c.trafficType) metaParts.push(`<span class="tag-pill" style="color:${c.trafficType === 'Orgânico' ? '#17805f' : '#1d4fa3'}">${escapeHtml(c.trafficType)}</span>`);
      if (c.month) metaParts.push(MONTH_NAMES[c.month - 1] + '/' + c.year);
    } else {
      if (c.format) metaParts.push(escapeHtml(c.format));
      if (c.month) metaParts.push(MONTH_NAMES[c.month - 1] + '/' + c.year);
    }
    const statsHtml = isPress
      ? `<div><span>Centimetragem</span>${fmtCurrency(c.value)}</div>`
      : isProduct
        ? `<div><span>Visitas</span>${fmtCompact(c.views)}</div><div><span>Downloads</span>${fmtCompact(c.downloads)}</div>`
        : isBlog
          ? `<div><span>Visualizações</span>${fmtCompact(c.views)}</div><div><span>Impressões</span>${fmtCompact(c.impressions)}</div><div><span>Cliques</span>${fmtCompact(c.clicks)}</div><div><span>Posição média</span>${c.avgPosition !== null && c.avgPosition !== undefined && c.avgPosition !== '' ? c.avgPosition : '—'}</div><div><span>Conversões</span>${fmtCompact(contentConversions(c))}</div>`
          : isSeo
            ? `<div><span>Cliques</span>${fmtCompact(c.clicks)}</div><div><span>Impressões</span>${fmtCompact(c.impressions)}</div><div><span>CTR</span>${c.ctr !== null && c.ctr !== undefined && c.ctr !== '' ? c.ctr + '%' : '—'}</div><div><span>Posição média</span>${c.avgPosition !== null && c.avgPosition !== undefined && c.avgPosition !== '' ? c.avgPosition : '—'}</div>`
            : isEcommerce
              ? `<div><span>Itens vistos</span>${fmtCompact(c.itemsViewed)}</div><div><span>Itens no carrinho</span>${fmtCompact(c.itemsAddedToCart)}</div><div><span>Itens comprados</span>${fmtCompact(c.itemsPurchased)}</div><div><span>Receita do item</span>${fmtCurrency(c.itemRevenue)}</div>`
              : isPage
                ? `<div><span>Visualizações</span>${fmtCompact(c.views)}</div><div><span>Cliques${c.buttonName ? ' · ' + escapeHtml(c.buttonName) : ''}</span>${fmtCompact(c.buttonClicks)}</div>`
                : isVideo
            ? `<div><span>Visualizações</span>${fmtCompact(c.views)}</div><div><span>Novos seguidores</span>${fmtCompact(c.videoNewFollowers)}</div>`
            : isInstagram
              ? `<div><span>Visualizações</span>${fmtCompact(c.views)}</div><div><span>Interações</span>${fmtCompact(c.engagement)}</div>`
              : isPinterest
                ? `<div><span>Impressões</span>${fmtCompact(c.impressions)}</div><div><span>Cliques no Pin</span>${fmtCompact(c.pinClicks)}</div>`
                : isLinkedin
                  ? `<div><span>Impressões</span>${fmtCompact(c.impressions)}</div><div><span>CTR</span>${c.ctr !== null && c.ctr !== undefined ? c.ctr + '%' : '—'}</div>`
                  : `<div><span>Alcance</span>${fmtCompact(c.reach)}</div><div><span>Engaj.</span>${fmtCompact(c.engagement)}</div>`;
    return `<div class="content-item">
      <div class="content-rank">${rankOffset + i + 1}</div>
      <div class="content-main">
        <div class="title">${escapeHtml(c.title)}</div>
        <div class="meta">${metaParts.filter(Boolean).join(' · ')}</div>
      </div>
      <div class="content-stats">${statsHtml}</div>
      ${c.url ? `<a class="icon-btn" href="${escapeHtml(c.url)}" target="_blank" rel="noopener" style="margin-left:10px;">Ver</a>` : ''}
    </div>`;
  }).join('');
}

async function pRenderContent() {
  // Reseta a paginação da lista sempre que a pessoa entra nesta página.
  pState.globalContentPage = 1;
  setTopbar('Conteúdos em destaque', brandById(pState.brand).label);
  const content = await papi(`/content?brand=${pState.brand}`);
  const contentEl = document.getElementById('content');
  contentEl.innerHTML = `
    <div class="section-head" style="flex-wrap:wrap;gap:10px;">
      <h3>Conteúdos com melhor desempenho</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <select class="year-select" id="content-filter">
          <option value="all">Todos os canais</option>
          ${channelsForBrand(pState.brand).map(c => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm" id="download-content-pdf-btn">⭳ Baixar relatório (PDF)</button>
        <button class="btn btn-ghost btn-sm" id="download-content-excel-btn">⭳ Baixar relatório (Excel)</button>
      </div>
    </div>
    <div class="card" id="list-wrap"></div>`;
  let currentItems = content;
  let currentChannelFilter = 'all';
  document.getElementById('download-content-pdf-btn').addEventListener('click', () => downloadContentPdf(currentItems));
  document.getElementById('download-content-excel-btn').addEventListener('click', (e) => downloadContentExcelReport(currentChannelFilter, e.target));
  function draw() {
    const filter = document.getElementById('content-filter').value;
    currentChannelFilter = filter;
    const items = content.filter(c => filter === 'all' || c.channel === filter).sort((a, b) => (b.reach || 0) - (a.reach || 0));
    currentItems = items;
    pState.globalContentPage = 1;
    pRenderPaginatedList('list-wrap', 'global-content', items, 'globalContentPage', (its, offset) => pRenderContentList(its, true, offset));
  }
  draw();
  document.getElementById('content-filter').addEventListener('change', draw);
}

function downloadContentPdf(items) {
  const doc = new jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  const brand = brandById(pState.brand);
  let y = pdfHeader(doc, `Conteúdos em destaque — ${brand.label}`, `Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${items.length} item(ns)`);
  const body = items.map(c => {
    const ch = channelById(c.channel);
    const isPress = c.channel === 'assessoria';
    const isBlog = c.channel === 'blog';
    const isSeo = c.channel === 'siteSeo';
    const isEcommerce = c.channel === 'ecommerce';
    const isPage = c.channel === 'site' || c.channel === 'blog';
    const stat1 = isPress ? fmtCurrency(c.value) : isSeo ? fmtNum(c.clicks) : isEcommerce ? fmtNum(c.itemsPurchased) : isPage ? fmtNum(c.views) : fmtNum(c.reach);
    const stat2 = isPress ? (c.mediaType || '—') : isBlog ? fmtNum(contentConversions(c)) : isSeo ? fmtNum(c.impressions) : isEcommerce ? fmtCurrency(c.itemRevenue) : isPage ? fmtNum(c.buttonClicks) : fmtNum(c.engagement);
    return [c.title, ch.label, c.month ? MONTH_NAMES[c.month - 1] + '/' + c.year : '—', stat1, stat2, c.url ? 'Abrir' : '—'];
  });
  const links = items.map(c => c.url || null);
  pdfTable(doc, y, null, ['Título', 'Canal', 'Período', 'Principal', 'Secundária', 'Link'], body, { linkColIndex: 5, links });
  pdfFooterAndSave(doc, `relatorio-conteudos-${pState.brand}.pdf`);
}

// Baixa o relatório "Conteúdos em destaque" em Excel (.xlsx), sem exigir login — usado no link público.
async function downloadContentExcelReport(channelFilter, btnEl) {
  const originalLabel = btnEl ? btnEl.textContent : '';
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Gerando...'; }
  try {
    const res = await fetch(`/api/public/reports/excel/content-list?brand=${pState.brand}&channel=${channelFilter || 'all'}`);
    if (!res.ok) {
      let msg = 'Não foi possível gerar o relatório em Excel.';
      try { const data = await res.json(); if (data.error) msg = data.error; } catch (e) { /* sem corpo */ }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-conteudos-${pState.brand}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast(err.message);
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = originalLabel; }
  }
}

async function pRenderYears() {
  setTopbar('Anos anteriores', `${brandById(pState.brand).label} · ${pState.years.join(', ')}`);
  const contentEl = document.getElementById('content');
  if (pState.years.length < 2) {
    contentEl.innerHTML = `<div class="card"><div class="empty-state">Ainda só existe um ano de dados publicado (${pState.years[0]}).</div></div>`;
    return;
  }
  const all = [];
  for (const y of pState.years) all.push(...await papi(`/metrics?brand=${pState.brand}&year=${y}`));
  const rows = channelsForBrand(pState.brand).map(ch => {
    const field = ch.growth[0];
    const cells = pState.years.map(y => {
      const rows = all.filter(m => m.channel === ch.id && m.year === y).sort((a, b) => a.month - b.month);
      const last = rows[rows.length - 1];
      return last ? last[field] : null;
    });
    return { ch, field, cells };
  });
  contentEl.innerHTML = `
    <div class="section-head"><h3>Comparação por ano</h3></div>
    <div class="card">
      <table>
        <thead><tr><th>Canal</th><th>Métrica</th>${pState.years.map(y => `<th class="num">${y}</th>`).join('')}<th class="num">Variação</th></tr></thead>
        <tbody>
          ${rows.map(r => {
            const delta = pctChange(r.cells[r.cells.length - 1], r.cells[0]);
            return `<tr>
              <td><span class="nav-dot" style="background:${r.ch.color};display:inline-block;margin-right:6px;"></span>${escapeHtml(r.ch.label)}</td>
              <td>${escapeHtml(METRIC_LABELS[r.field])}</td>
              ${r.cells.map(c => `<td class="num">${c !== null && c !== undefined ? fmtNum(c) : '—'}</td>`).join('')}
              <td class="num">${delta !== null ? `<span class="stat-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}" style="margin:0;">${fmtPct(delta)}</span>` : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

pboot();
