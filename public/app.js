/* ==================== Estado global ==================== */
const state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  brand: localStorage.getItem('brand') || 'ghelplus',
  year: null,
  tab: 'overview',
  years: [],
  metricsCache: {},   // key `${brand}:${year}` -> array
  contentCache: {},   // key `${brand}` -> array (todas as safras)
  settingsCache: {},  // key brand -> settings
  users: [],
  audit: [],
  charts: {},
  sidebarOpen: false,
  // Paginação de listas/tabelas longas (reseta a cada entrada no canal/página) — mesmo padrão
  // em toda a tela: 5 itens por vez, com botões ‹ Anterior / Próxima ›.
  seoKeywordsPage: 1,
  seoPagesPage: 1,
  channelContentPage: 1,
  globalContentPage: 1
};

const app = document.getElementById('app');

// 26a rodada: quando a Plataforma de Gestao de Marketing (Papoi) embute
// esta pagina, ela manda na URL pra onde deve abrir direto -- em vez do
// iframe sempre cair na Visao geral com a barra lateral inteira deste
// painel (que duplicava a navegacao da propria Papoi), agora ele ja abre
// na marca/rede certa, com a barra lateral escondida (ver .embedded-in-
// platform no style.css) -- a Papoi passa a ser dona da navegacao, e este
// painel so mostra o conteudo daquela tela.
// Parametros aceitos: embedBrand=ghelplus|debacco, embedView=overview|
// channel|content|years|audit, embedChannel=<id> (junto com embedView=
// channel ou embedView=audit, pra filtrar o historico so daquela rede).
(function () {
  try {
    var p = new URLSearchParams(location.search);
    var brand = p.get('embedBrand');
    var view = p.get('embedView');
    var channel = p.get('embedChannel');
    if (brand) state.brand = brand;
    if (view === 'channel' && channel) state.tab = 'channel:' + channel;
    else if (view === 'audit') state.tab = channel ? 'audit:' + channel : 'audit';
    else if (view) state.tab = view;
  } catch (e) { /* ignora e segue com o padrao (Visao geral) */ }
})();

// Avisa a Papoi da altura real do conteudo (28a rodada) -- sem isso, o
// iframe fica com altura fixa e ganha um scroll interno proprio, o que
// denuncia que "isso e um iframe"; postando a altura, a Papoi ajusta o
// iframe pra caber tudo e quem rola a pagina e so o scroll normal dela,
// como se o conteudo fosse nativo da plataforma.
(function () {
  if (window.parent === window) return; // nao esta embutido, nada a fazer
  var lastHeight = 0;
  function reportHeight() {
    var h = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0
    );
    if (h !== lastHeight) {
      lastHeight = h;
      window.parent.postMessage({ type: 'papoi-embed-height', height: h }, '*');
    }
  }
  window.addEventListener('load', reportHeight);
  window.addEventListener('resize', reportHeight);
  if (window.ResizeObserver) new ResizeObserver(reportHeight).observe(document.documentElement);
  new MutationObserver(reportHeight).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  var tries = 0;
  var iv = setInterval(function () {
    reportHeight();
    if (++tries > 25) clearInterval(iv);
  }, 600);
  reportHeight();
})();

/* ==================== API helper ==================== */
async function api(path, opts = {}) {
  // Reforço no cliente (28ª rodada): quem entrou pelo link externo (role
  // 'none') não deveria nem tentar escrever -- o bloqueio de verdade é no
  // servidor (middleware/blockViewerWrites.js), isso aqui só dá feedback
  // na hora, sem esperar o round-trip.
  const method = (opts.method || 'GET').toUpperCase();
  if (method !== 'GET' && state.user && state.user.role === 'none') {
    toast('Link de visitante: somente leitura.', true);
    throw new Error('Link de visitante: somente leitura.');
  }
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const res = await fetch('/api' + path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });
  if (res.status === 401) {
    doLogout(false);
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  let data = {};
  try { data = await res.json(); } catch (e) { /* sem corpo */ }
  if (!res.ok) throw new Error(data.error || 'Ocorreu um erro na requisição');
  return data;
}

function toast(msg, isError) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  if (isError) el.style.background = '#8a2f22';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ==================== Modal helper ==================== */
function openModal(html, opts) {
  opts = opts || {};
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-overlay" id="modal-overlay"><div class="modal">${html}</div></div>`;
  root.querySelector('#modal-overlay').addEventListener('click', (e) => {
    // Formulários de cadastro (lançamento mensal, conteúdo) não fecham ao clicar fora —
    // evita perder dados já preenchidos por um clique acidental fora do quadro.
    if (opts.preventBackdropClose) return;
    if (e.target.id === 'modal-overlay') closeModal();
  });
}
function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

/* ==================== Boot ==================== */
async function boot() {
  if (state.token) {
    try {
      const { user } = await api('/auth/me');
      state.user = user;
      localStorage.setItem('user', JSON.stringify(user));
      await initDashboard();
      return;
    } catch (e) {
      state.token = null;
      localStorage.removeItem('token');
    }
  }
  renderAuthGate();
}

async function renderAuthGate() {
  let needsSetup = false;
  try {
    const r = await api('/auth/needs-setup');
    needsSetup = r.needsSetup;
  } catch (e) { /* ignora */ }
  renderAuth(needsSetup ? 'setup' : 'login');
}

/* ==================== Telas de autenticação ==================== */
function renderAuth(mode) {
  app.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="auth-mark">Dashboard de Resultados Grupo GhelPlus</div>
        <h1>${mode === 'setup' ? 'Criar administrador' : 'Entrar'}</h1>
        <p class="sub">${mode === 'setup'
          ? 'Este é o primeiro acesso. Crie a conta administradora do painel.'
          : 'GhelPlus & De Bacco · redes sociais, site, blog, newsletter e assessoria'}</p>
        <div id="auth-msg"></div>
        <form id="auth-form">
          <div class="field">
            <label>Usuário</label>
            <input type="text" id="f-username" autocomplete="username" required>
          </div>
          <div class="field">
            <label>Senha</label>
            <input type="password" id="f-password" autocomplete="${mode === 'setup' ? 'new-password' : 'current-password'}" required minlength="6">
          </div>
          <button class="btn btn-accent btn-block" type="submit">${mode === 'setup' ? 'Criar administrador' : 'Entrar'}</button>
        </form>
        <div class="auth-switch">
          Quer só ver os resultados sem editar? <button id="go-public">Abrir link público</button>
        </div>
      </div>
    </div>`;

  document.getElementById('go-public').addEventListener('click', () => { window.location.href = '/public'; });

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('f-username').value.trim();
    const password = document.getElementById('f-password').value;
    const msgBox = document.getElementById('auth-msg');
    msgBox.innerHTML = '';
    try {
      const endpoint = mode === 'setup' ? '/auth/setup' : '/auth/login';
      const { token, user } = await api(endpoint, { method: 'POST', body: { username, password } });
      state.token = token;
      state.user = user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      await initDashboard();
    } catch (err) {
      msgBox.innerHTML = `<div class="error-msg">${escapeHtml(err.message)}</div>`;
    }
  });
}

function doLogout(redraw = true) {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (redraw) renderAuthGate();
}

/* ==================== Inicializar dashboard ==================== */
async function initDashboard() {
  await loadYears(state.brand);
  if (!state.years.length) state.years = [new Date().getFullYear()];
  if (!state.year || !state.years.includes(state.year)) state.year = state.years[0];
  // 26b rodada: respeita o tab/canal que veio no deep-link de incorporacao
  // (embedView/embedChannel, resolvidos no topo deste arquivo) em vez de
  // sempre cair na Visao geral -- e' assim que a Papoi abre direto na tela
  // certa (canal especifico ou historico daquela rede) dentro do iframe.
  if (state.tab.startsWith('channel:') || state.tab.startsWith('audit:')) {
    const chId = state.tab.split(':')[1];
    if (!channelsForBrand(state.brand).some(c => c.id === chId)) state.tab = 'overview';
  }
  renderShell();
  await navigateTab(state.tab);
}

async function loadYears(brand) {
  try {
    const years = await api(`/public/years?brand=${brand}`);
    state.years = years.length ? years : [new Date().getFullYear()];
  } catch (e) {
    state.years = [new Date().getFullYear()];
  }
}

async function loadMetrics(brand, year) {
  const key = `${brand}:${year}`;
  if (!state.metricsCache[key]) {
    state.metricsCache[key] = await api(`/metrics?brand=${brand}&year=${year}`);
  }
  return state.metricsCache[key];
}

async function loadAllMetricsForBrand(brand) {
  // usado nas comparações de anos anteriores
  const all = [];
  for (const y of state.years) {
    all.push(...await loadMetrics(brand, y));
  }
  return all;
}

async function loadContent(brand) {
  if (!state.contentCache[brand]) {
    state.contentCache[brand] = await api(`/content?brand=${brand}`);
  }
  return state.contentCache[brand];
}

async function loadSettings(brand) {
  if (!state.settingsCache[brand]) {
    state.settingsCache[brand] = await api(`/settings/${brand}`);
  }
  return state.settingsCache[brand];
}

function invalidateBrandCache(brand) {
  Object.keys(state.metricsCache).forEach(k => { if (k.startsWith(brand + ':')) delete state.metricsCache[k]; });
  delete state.contentCache[brand];
}

/* ==================== Layout: sidebar + topbar ==================== */
function renderShell() {
  const brand = brandById(state.brand);
  document.documentElement.style.setProperty('--current-accent', brand.accent);

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar ${state.sidebarOpen ? 'open' : ''}" id="sidebar">
        <div class="brand-mark">Dashboard de Resultados Grupo GhelPlus</div>
        <div class="brand-switch" id="brand-switch">
          ${BRANDS.map(b => `<button data-brand="${b.id}" class="${b.id === state.brand ? 'active' : ''}" style="${b.id === state.brand ? `background:${b.accent}` : ''}">${escapeHtml(b.label)}</button>`).join('')}
        </div>
        <nav id="nav-tree"></nav>
        <div class="sidebar-footer">
          <div class="user-chip">
            <span>${escapeHtml(state.user.username)} · ${state.user.role === 'admin' ? 'admin' : (state.user.role === 'none' ? 'visitante' : 'editor')}</span>
            <button class="logout-link" id="logout-btn">Sair</button>
          </div>
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

  buildNavTree();
  buildYearSelect();

  document.getElementById('logout-btn').addEventListener('click', () => doLogout());
  document.getElementById('menu-toggle').addEventListener('click', () => {
    state.sidebarOpen = !state.sidebarOpen;
    document.getElementById('sidebar').classList.toggle('open', state.sidebarOpen);
  });
  document.querySelectorAll('#brand-switch button').forEach(btn => {
    btn.addEventListener('click', async () => {
      state.brand = btn.dataset.brand;
      localStorage.setItem('brand', state.brand);
      await loadYears(state.brand);
      if (!state.years.includes(state.year)) state.year = state.years[0];
      if (state.tab.startsWith('channel:')) {
        const chId = state.tab.split(':')[1];
        if (!channelsForBrand(state.brand).some(c => c.id === chId)) state.tab = 'overview';
      }
      renderShell();
      await navigateTab(state.tab);
    });
  });
}

function buildYearSelect() {
  const sel = document.getElementById('year-select');
  sel.innerHTML = state.years.map(y => `<option value="${y}" ${y === state.year ? 'selected' : ''}>${y}</option>`).join('');
  sel.addEventListener('change', async () => {
    state.year = Number(sel.value);
    await navigateTab(state.tab);
  });
}

function buildNavTree() {
  const nav = document.getElementById('nav-tree');
  const groups = {};
  channelsForBrand(state.brand).forEach(c => { (groups[c.group] = groups[c.group] || []).push(c); });

  let html = `
    <div class="nav-group">
      <button class="nav-item ${state.tab === 'overview' ? 'active' : ''}" data-tab="overview">▤ Visão geral</button>
    </div>`;

  Object.keys(groups).forEach(groupName => {
    html += `<div class="nav-group"><div class="nav-label">${escapeHtml(groupName)}</div>`;
    groups[groupName].forEach(c => {
      html += `<button class="nav-item ${state.tab === 'channel:' + c.id ? 'active' : ''}" data-tab="channel:${c.id}">
        <span class="nav-dot" style="background:${c.color}"></span>${escapeHtml(c.label)}
      </button>`;
    });
    html += `</div>`;
  });

  html += `
    <div class="nav-group">
      <div class="nav-label">Análise</div>
      <button class="nav-item ${state.tab === 'content' ? 'active' : ''}" data-tab="content">★ Conteúdos em destaque</button>
      <button class="nav-item ${state.tab === 'years' ? 'active' : ''}" data-tab="years">◷ Anos anteriores</button>
      <button class="nav-item ${state.tab === 'audit' ? 'active' : ''}" data-tab="audit">≡ Histórico de alterações</button>
    </div>
    <div class="nav-group">
      <div class="nav-label">Configurações</div>
      ${state.user.role === 'admin' ? `<button class="nav-item ${state.tab === 'users' ? 'active' : ''}" data-tab="users">◍ Usuários</button>` : ''}
      <button class="nav-item ${state.tab === 'settings' ? 'active' : ''}" data-tab="settings">⚭ Link público</button>
    </div>`;

  nav.innerHTML = html;
  nav.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      state.sidebarOpen = false;
      document.getElementById('sidebar').classList.remove('open');
      await navigateTab(btn.dataset.tab);
    });
  });
}

async function navigateTab(tab) {
  state.tab = tab;
  buildNavTree();
  const content = document.getElementById('content');
  content.innerHTML = `<div class="spinner-wrap">Carregando…</div>`;
  Object.values(state.charts).forEach(c => c && c.destroy && c.destroy());
  state.charts = {};

  try {
    if (tab === 'overview') return renderOverview();
    if (tab.startsWith('channel:')) return renderChannelPage(tab.split(':')[1]);
    if (tab === 'content') return renderContentPage();
    if (tab === 'years') return renderYearsPage();
    if (tab === 'audit') return renderAuditPage();
    if (tab.startsWith('audit:')) return renderAuditPage(tab.split(':')[1]);
    if (tab === 'users') return renderUsersPage();
    if (tab === 'settings') return renderSettingsPage();
  } catch (e) {
    content.innerHTML = `<div class="error-msg">${escapeHtml(e.message)}</div>`;
  }
}

function setTopbar(title, sub) {
  document.getElementById('topbar-title').textContent = title;
  document.getElementById('topbar-sub').textContent = sub || '';
}

/* ==================== Visão geral ==================== */
async function renderOverview() {
  setTopbar('Visão geral', `${brandById(state.brand).label} · ${state.year}`);
  const metrics = await loadMetrics(state.brand, state.year);
  const content = await loadContent(state.brand);
  const contentEl = document.getElementById('content');

  const cards = channelsForBrand(state.brand).map(ch => {
    const rows = metrics.filter(m => m.channel === ch.id).sort((a, b) => a.month - b.month);
    const last = rows[rows.length - 1];
    const prev = rows[rows.length - 2];
    const primaryField = ch.growth[0];
    const value = last ? last[primaryField] : null;
    const prevValue = prev ? prev[primaryField] : null;
    const delta = pctChange(prevValue, value);
    return `
      <div class="card channel-card" style="--ch-color:${ch.color}" data-open-channel="${ch.id}">
        <div class="card-title">${escapeHtml(ch.label)}</div>
        <div class="stat-value">${value !== null && value !== undefined ? fmtCompact(value) : '—'}</div>
        <div class="stat-delta ${delta === null ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}">
          ${delta === null ? 'Sem dado anterior' : fmtPct(delta) + ' vs. mês anterior'}
        </div>
        <div style="font-size:11.5px;color:var(--text-mute);margin-top:6px;">${escapeHtml(METRIC_LABELS[primaryField])}</div>
      </div>`;
  }).join('');

  const topContent = content
    .filter(c => (c.reach || 0) > 0 || (c.engagement || 0) > 0)
    .sort((a, b) => (b.reach || 0) - (a.reach || 0))
    .slice(0, 6);

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
    <div class="card"><div class="chart-wrap"><canvas id="chart-overview-reach"></canvas></div></div>

    <div class="section-head"><h3>Conteúdos com melhor desempenho (todas as marcas/anos)</h3></div>
    <div class="card">${renderContentList(topContent, true)}</div>
  `;

  contentEl.querySelectorAll('[data-open-channel]').forEach(el => {
    el.addEventListener('click', () => navigateTab('channel:' + el.dataset.openChannel));
  });

  document.getElementById('download-overview-pdf-btn').addEventListener('click', () => {
    downloadOverviewPdf(metrics, topContent);
  });

  document.getElementById('download-overview-excel-btn').addEventListener('click', (e) => {
    downloadOverviewExcelReport(e.target);
  });

  const labels = Array.from({ length: 12 }, (_, i) => MONTH_NAMES[i]);

  // gráfico combinado de seguidores no ano — todos os canais que têm a métrica "Seguidores"
  // (followers), independentemente do grupo — Casoca/Promob, por exemplo, não têm esse indicador.
  const withFollowers = channelsForBrand(state.brand).filter(c => c.metrics.includes('followers'));
  const followersDatasets = withFollowers.map(ch => {
    const rows = metrics.filter(m => m.channel === ch.id);
    const dataByMonth = Array(12).fill(null);
    rows.forEach(r => { dataByMonth[r.month - 1] = r.followers; });
    return {
      label: ch.label,
      data: dataByMonth,
      borderColor: ch.color,
      backgroundColor: ch.color,
      tension: 0.35,
      spanGaps: true,
      pointRadius: 2
    };
  });
  try {
    state.charts.overviewFollowers = new Chart(document.getElementById('chart-overview-followers'), {
      type: 'line',
      data: { labels, datasets: followersDatasets },
      options: baseChartOptions()
    });
  } catch (e) {
    console.error('Não foi possível desenhar o gráfico:', e);
    document.getElementById('chart-overview-followers').closest('.chart-wrap').innerHTML = '<div class="empty-state">Não foi possível carregar o gráfico.</div>';
  }

  // gráfico combinado de alcance das redes sociais no ano — só entram canais que realmente têm
  // a métrica "Alcance" (reach); Pinterest, TikTok, Facebook, LinkedIn e Casoca/Promob não têm esse
  // indicador, então ficavam aparecendo na legenda sem nenhuma linha (dados sempre vazios).
  const social = channelsForBrand(state.brand).filter(c => c.group === 'Redes sociais' && c.metrics.includes('reach'));
  const datasets = social.map(ch => {
    const rows = metrics.filter(m => m.channel === ch.id);
    const dataByMonth = Array(12).fill(null);
    rows.forEach(r => { dataByMonth[r.month - 1] = r.reach; });
    return {
      label: ch.label,
      data: dataByMonth,
      borderColor: ch.color,
      backgroundColor: ch.color,
      tension: 0.35,
      spanGaps: true,
      pointRadius: 2
    };
  });
  try {
    state.charts.overviewReach = new Chart(document.getElementById('chart-overview-reach'), {
      type: 'line',
      data: { labels, datasets },
      options: baseChartOptions()
    });
  } catch (e) {
    console.error('Não foi possível desenhar o gráfico:', e);
    document.getElementById('chart-overview-reach').closest('.chart-wrap').innerHTML = '<div class="empty-state">Não foi possível carregar o gráfico.</div>';
  }
}

function baseChartOptions(compact) {
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

function downloadOverviewPdf(metrics, topContent) {
  const doc = new jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  const brand = brandById(state.brand);
  let y = pdfHeader(doc, `Visão geral — ${brand.label}`, `Relatório de ${state.year} · gerado em ${new Date().toLocaleDateString('pt-BR')}`);

  const cards = channelsForBrand(state.brand).map(ch => {
    const rows = metrics.filter(m => m.channel === ch.id).sort((a, b) => a.month - b.month);
    const last = rows[rows.length - 1];
    const field = ch.growth[0];
    return { label: `${ch.label} · ${METRIC_LABELS[field]}`, value: last && last[field] !== null && last[field] !== undefined ? fmtValue(field, last[field]) : '—' };
  });
  y = pdfCardsGrid(doc, y, cards);
  y = pdfChartImage(doc, y, 'chart-overview-followers');
  y = pdfChartImage(doc, y, 'chart-overview-reach');

  const contentBody = topContent.map(c => [c.title, channelById(c.channel).label, fmtNum(c.reach), fmtNum(c.engagement), c.url ? 'Abrir' : '—']);
  const links = topContent.map(c => c.url || null);
  pdfTable(doc, y, 'Conteúdos com melhor desempenho', ['Título', 'Canal', 'Alcance', 'Engajamento', 'Link'], contentBody, { linkColIndex: 4, links });

  pdfFooterAndSave(doc, `relatorio-visao-geral-${state.brand}-${state.year}.pdf`);
}

// Baixa o relatório "Visão geral" em Excel (.xlsx), com o gráfico de evolução de alcance como
// gráfico nativo do Excel (editável, não imagem estática) — gerado no servidor.
async function downloadOverviewExcelReport(btnEl) {
  const originalLabel = btnEl ? btnEl.textContent : '';
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Gerando...'; }
  try {
    const res = await fetch(`/api/reports/excel/overview?brand=${state.brand}&year=${state.year}`, {
      headers: { Authorization: 'Bearer ' + state.token }
    });
    if (res.status === 401) {
      doLogout(false);
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (!res.ok) {
      let msg = 'Não foi possível gerar o relatório em Excel.';
      try { const data = await res.json(); if (data.error) msg = data.error; } catch (e) { /* sem corpo */ }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-visao-geral-${state.brand}-${state.year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast(err.message, true);
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = originalLabel; }
  }
}

/* ==================== Página de canal ==================== */
async function renderChannelPage(channelId) {
  const ch = channelById(channelId);
  // Reseta a paginação das listas/tabelas longas sempre que a pessoa entra/troca de canal.
  state.seoKeywordsPage = 1;
  state.seoPagesPage = 1;
  state.channelContentPage = 1;
  setTopbar(ch.label, `${brandById(state.brand).label} · ${state.year}`);
  const metrics = (await loadMetrics(state.brand, state.year)).filter(m => m.channel === channelId).sort((a, b) => a.month - b.month);
  const content = (await loadContent(state.brand)).filter(c => c.channel === channelId);
  const contentEl = document.getElementById('content');

  const last = metrics[metrics.length - 1];
  // Indicador compara sempre com o mês imediatamente anterior lançado — mesmo critério usado
  // nos cards da Visão geral ("Panorama por canal"), em vez da variação acumulada no ano.
  const prev = metrics[metrics.length - 2];

  const statCards = ch.metrics.map(field => {
    const lastVal = last ? chFieldValue(ch, last, field) : null;
    const prevVal = prev ? chFieldValue(ch, prev, field) : null;
    const delta = pctChange(prevVal, lastVal);
    const badge = qualityBadge(field, lastVal);
    return `
      <div class="card">
        <div class="card-title">${escapeHtml(METRIC_LABELS[field])}${badge ? ` <span class="tag-pill" style="margin-left:4px;color:${badge.className === 'up' ? '#17805f' : badge.className === 'down' ? '#b8452f' : '#8a6d1f'}">${badge.label}</span>` : ''}</div>
        <div class="stat-value">${lastVal !== null && lastVal !== undefined ? fmtValue(field, lastVal) : '—'}</div>
        <div class="stat-delta ${delta === null ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}">${delta === null ? 'Sem dado anterior' : fmtPct(delta) + ' vs. mês anterior'}</div>
      </div>`;
  }).join('');

  const insights = computeInsights(ch, metrics);
  const sortField = ch.topPagesChart ? 'views' : ch.ecommerceCatalog ? 'itemRevenue' : 'reach';
  const sortedContent = ch.pressReport
    ? content.slice().sort((a, b) => {
        const dateA = a.publishDate || `${a.year}-${String(a.month || 1).padStart(2, '0')}-01`;
        const dateB = b.publishDate || `${b.year}-${String(b.month || 1).padStart(2, '0')}-01`;
        return dateA.localeCompare(dateB);
      })
    : content.slice().sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));
  // Mostra todos os conteúdos cadastrados neste canal/marca — antes só os 8 primeiros apareciam aqui.
  const topContent = sortedContent;
  const contentSectionTitle = ch.pressReport ? 'Matérias veiculadas' : ((ch.topPagesChart || ch.ecommerceCatalog) ? (ch.topItemsLabel || 'Páginas mais acessadas') : 'Conteúdos que mais tiveram resultado neste canal');
  const addContentLabel = ch.pressReport ? '+ Cadastrar matéria' : ((ch.topPagesChart || ch.ecommerceCatalog) ? (ch.addItemLabel || '+ Cadastrar página') : '+ Adicionar conteúdo');
  // Análise SEO do Site tem 2 rankings separados (palavras-chave e páginas) em vez da lista única de conteúdos.
  // Ranking de palavras-chave: ordem crescente de mês (para acompanhar a evolução), em vez de
  // por cliques como os demais rankings — pedido específico para esta tabela.
  const seoKeywords = ch.seoAnalysis ? content.filter(c => c.entryType !== 'page').slice().sort((a, b) => (a.year - b.year) || ((a.month || 0) - (b.month || 0)) || ((b.clicks || 0) - (a.clicks || 0))) : [];
  const seoPages = ch.seoAnalysis ? content.filter(c => c.entryType === 'page').slice().sort((a, b) => (b.clicks || 0) - (a.clicks || 0)) : [];

  contentEl.innerHTML = `
    <div class="section-head" style="flex-wrap:wrap;gap:10px;">
      <h3>Indicadores — ${state.year}</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" id="download-template-btn">⭳ Baixar modelo (Excel)</button>
        <button class="btn btn-ghost btn-sm" id="import-template-btn">⭱ Importar planilha</button>
        <input type="file" id="import-file-input" accept=".xlsx,.xls" style="display:none;">
        <button class="btn btn-ghost btn-sm" id="download-pdf-btn">⭳ Baixar relatório (PDF)</button>
        <button class="btn btn-ghost btn-sm" id="download-excel-report-btn">⭳ Baixar relatório (Excel)</button>
        <button class="btn btn-ghost btn-sm" id="channel-audit-btn">≡ Histórico desta rede</button>
        <button class="btn btn-accent btn-sm" id="add-metric-btn">+ Lançar mês</button>
      </div>
    </div>
    <div class="grid grid-cols-4">${statCards}</div>

    <div class="section-head"><h3>Insights</h3></div>
    <div class="card">
      ${insights.length ? `<ul class="insight-list">${insights.map(i => `<li><span class="dot"></span><span>${i}</span></li>`).join('')}</ul>` : `<div class="empty-state">Ainda não há dados suficientes neste canal/ano para gerar insights.</div>`}
    </div>

    ${ch.viewsBreakdownChart ? `
    <div class="section-head"><h3>${escapeHtml(ch.viewsBreakdownChart.title)}</h3></div>
    <div class="card"><div class="chart-wrap"><canvas id="chart-views-breakdown"></canvas></div></div>` : ''}

    ${ch.engagementCompareChart || ch.mediaTypeChart ? `
    <div class="section-head"><h3>Engajamento</h3></div>
    <div class="grid grid-cols-2">
      ${ch.engagementCompareChart ? `<div class="card"><div class="card-title">${escapeHtml(ch.engagementCompareChart.title)}</div><div class="chart-wrap small"><canvas id="chart-engagement-compare"></canvas></div></div>` : ''}
      ${ch.mediaTypeChart ? `<div class="card"><div class="card-title">${escapeHtml(ch.mediaTypeChart.title)}</div><div class="chart-wrap small"><canvas id="chart-media-type"></canvas></div></div>` : ''}
    </div>` : ''}

    ${ch.performanceSection ? `
    <div class="section-head"><h3>${escapeHtml(ch.performanceSection.title)}</h3></div>
    <div class="grid grid-cols-3">
      ${ch.performanceSection.charts.map((c, i) => `<div class="card"><div class="card-title">${escapeHtml(c.title)}</div><div class="chart-wrap small"><canvas id="chart-performance-${i}"></canvas></div></div>`).join('')}
    </div>` : ''}

    <div class="section-head"><h3>${escapeHtml(ch.evolutionTitle || 'Evolução no ano')}</h3></div>
    <div class="card"><div class="chart-wrap"><canvas id="chart-channel"></canvas></div></div>

    ${ch.viewersChart ? `
    <div class="section-head"><h3>${escapeHtml(ch.viewersChartTitle || 'Recorrentes x novos')}</h3></div>
    <div class="card"><div class="chart-wrap small"><canvas id="chart-viewers"></canvas></div></div>` : ''}

    ${ch.pressReport ? `
    <div class="grid grid-cols-2">
      <div class="card">
        <div class="section-head" style="margin:0 0 12px;"><h3>Matérias por tipo de veículo</h3></div>
        <div class="chart-wrap small"><canvas id="chart-press-type"></canvas></div>
      </div>
      <div class="card">
        <div class="section-head" style="margin:0 0 12px;"><h3>Matérias por estado</h3></div>
        <div class="chart-wrap small"><canvas id="chart-press-uf"></canvas></div>
      </div>
    </div>` : ''}

    <div class="section-head">
      <h3>Lançamentos mensais</h3>
    </div>
    <div class="card">${renderMetricsTable(ch, metrics)}</div>

    ${ch.seoAnalysis ? `
    <div class="section-head"><h3>Top 10 palavras-chave x posição média</h3></div>
    <div class="card"><div class="chart-wrap small"><canvas id="chart-seo-top-keywords"></canvas></div></div>

    <div class="section-head" style="flex-wrap:wrap;gap:8px;">
      <h3>Ranking de palavras-chave</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" id="download-content-template-btn">⭳ Baixar modelo (Excel)</button>
        <button class="btn btn-ghost btn-sm" id="import-content-template-btn">⭱ Importar planilha</button>
        <input type="file" id="import-content-file-input" accept=".xlsx,.xls" style="display:none;">
        <button class="btn btn-ghost btn-sm" id="add-seo-keyword-btn">+ Cadastrar palavra-chave</button>
      </div>
    </div>
    <div class="card"><div id="seo-keywords-table-wrap"></div></div>

    <div class="section-head">
      <h3>Ranking de páginas</h3>
      <button class="btn btn-ghost btn-sm" id="add-seo-page-btn">+ Cadastrar página</button>
    </div>
    <div class="card"><div id="seo-pages-table-wrap"></div></div>
    ` : `
    <div class="section-head" style="flex-wrap:wrap;gap:8px;">
      <h3>${escapeHtml(contentSectionTitle)}</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" id="download-content-template-btn">⭳ Baixar modelo (Excel)</button>
        <button class="btn btn-ghost btn-sm" id="import-content-template-btn">⭱ Importar planilha</button>
        <input type="file" id="import-content-file-input" accept=".xlsx,.xls" style="display:none;">
        <button class="btn btn-ghost btn-sm" id="add-content-btn">${escapeHtml(addContentLabel)}</button>
      </div>
    </div>
    ${ch.topPagesChart ? `<div class="card"><div class="chart-wrap"><canvas id="chart-top-pages"></canvas></div></div>` : ''}
    <div class="card"><div id="channel-content-list-wrap"></div></div>
    `}
  `;

  // gráfico do canal
  const evoFields = ch.evolutionFields || ch.growth;
  const labels = metrics.map(m => `${MONTH_NAMES[m.month - 1]}`);
  const datasets = evoFields.map((field, i) => ({
    label: METRIC_LABELS[field],
    data: metrics.map(m => chFieldValue(ch, m, field)),
    borderColor: i === 0 ? ch.color : '#9a9a9a',
    backgroundColor: i === 0 ? ch.color : '#9a9a9a',
    tension: 0.35,
    yAxisID: i === 0 ? 'y' : 'y1',
    pointRadius: 3
  }));
  const opts = baseChartOptions();
  opts.scales.y.title = { display: true, text: METRIC_LABELS[evoFields[0]], font: { size: 11.5, weight: '600' }, color: ch.color };
  if (evoFields.length > 1) {
    opts.scales.y1 = { position: 'right', grid: { display: false }, ticks: { callback: (v) => fmtCompact(v) }, title: { display: true, text: METRIC_LABELS[evoFields[1]], font: { size: 11.5, weight: '600' }, color: '#8a8d99' } };
  }
  try {
    state.charts.channel = new Chart(document.getElementById('chart-channel'), { type: 'line', data: { labels, datasets }, options: opts });
  } catch (e) {
    console.error('Não foi possível desenhar o gráfico:', e);
    document.getElementById('chart-channel').closest('.chart-wrap').innerHTML = '<div class="empty-state">Não foi possível carregar o gráfico.</div>';
  }

  // gráfico de análise de visualizações (total / orgânico / anúncios) — Instagram
  if (ch.viewsBreakdownChart) {
    try {
      const bd = ch.viewsBreakdownChart;
      const colors = [ch.color, '#1e8a6e', '#b5772e'];
      const bdDatasets = bd.fields.map((field, i) => ({
        label: METRIC_LABELS[field],
        data: metrics.map(m => m[field]),
        borderColor: colors[i % colors.length],
        backgroundColor: colors[i % colors.length],
        tension: 0.35,
        pointRadius: 3
      }));
      const bdOpts = baseChartOptions();
      bdOpts.scales.y.title = { display: true, text: 'Visualizações', font: { size: 11.5, weight: '600' }, color: ch.color };
      state.charts.viewsBreakdown = new Chart(document.getElementById('chart-views-breakdown'), { type: 'line', data: { labels, datasets: bdDatasets }, options: bdOpts });
    } catch (e) {
      console.error('Não foi possível desenhar o gráfico:', e);
      document.getElementById('chart-views-breakdown').closest('.chart-wrap').innerHTML = '<div class="empty-state">Não foi possível carregar o gráfico.</div>';
    }
  }

  // gráfico de interações — mês anterior x mês atual — Instagram
  if (ch.engagementCompareChart) {
    try {
      const field = ch.engagementCompareChart.field;
      const last = metrics[metrics.length - 1];
      const prev = metrics[metrics.length - 2];
      const ecOpts = baseChartOptions();
      ecOpts.scales.y.title = { display: true, text: METRIC_LABELS[field], font: { size: 11.5, weight: '600' }, color: ch.color };
      state.charts.engagementCompare = new Chart(document.getElementById('chart-engagement-compare'), {
        type: 'bar',
        data: {
          labels: [prev ? MONTH_NAMES_FULL[prev.month - 1] : 'Mês anterior', last ? MONTH_NAMES_FULL[last.month - 1] : 'Mês atual'],
          datasets: [{ label: METRIC_LABELS[field], data: [prev ? prev[field] : null, last ? last[field] : null], backgroundColor: ['#c9c9c9', ch.color] }]
        },
        options: ecOpts
      });
    } catch (e) {
      console.error('Não foi possível desenhar o gráfico:', e);
      document.getElementById('chart-engagement-compare').closest('.chart-wrap').innerHTML = '<div class="empty-state">Não foi possível carregar o gráfico.</div>';
    }
  }

  // gráfico de interações por tipo de mídia (reels x estático) — Instagram, mês de referência
  if (ch.mediaTypeChart) {
    try {
      const mt = ch.mediaTypeChart;
      const last = metrics[metrics.length - 1];
      const palette = [ch.color, '#8a8d99', '#1e8a6e', '#b5772e'];
      state.charts.mediaType = new Chart(document.getElementById('chart-media-type'), {
        type: 'doughnut',
        data: {
          labels: mt.labels,
          datasets: [{ data: mt.fields.map(f => last ? last[f] : null), backgroundColor: mt.fields.map((f, i) => palette[i % palette.length]) }]
        },
        options: doughnutChartOptions()
      });
    } catch (e) {
      console.error('Não foi possível desenhar o gráfico:', e);
      document.getElementById('chart-media-type').closest('.chart-wrap').innerHTML = '<div class="empty-state">Não foi possível carregar o gráfico.</div>';
    }
  }

  // seção de Desempenho — taxas calculadas com explicação no tooltip (Pinterest)
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
        state.charts['performance' + idx] = new Chart(document.getElementById('chart-performance-' + idx), { type: 'line', data: { labels, datasets }, options: pOpts });
      } catch (e) {
        console.error('Não foi possível desenhar o gráfico:', e);
        const el = document.getElementById('chart-performance-' + idx);
        if (el) el.closest('.chart-wrap').innerHTML = '<div class="empty-state">Não foi possível carregar o gráfico.</div>';
      }
    });
  }

  // gráfico de espectadores recorrentes x novos (YouTube)
  if (ch.viewersChart) {
    try {
      state.charts.viewers = new Chart(document.getElementById('chart-viewers'), {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: METRIC_LABELS[ch.viewersChart[1]], data: metrics.map(m => m[ch.viewersChart[1]]), backgroundColor: '#9a9a9a' },
            { label: METRIC_LABELS[ch.viewersChart[0]], data: metrics.map(m => m[ch.viewersChart[0]]), backgroundColor: ch.color }
          ]
        },
        options: baseChartOptions()
      });
    } catch (e) {
      console.error('Não foi possível desenhar o gráfico:', e);
      document.getElementById('chart-viewers').closest('.chart-wrap').innerHTML = '<div class="empty-state">Não foi possível carregar o gráfico.</div>';
    }
  }

  // gráfico de páginas/produtos mais acessados (Site, Casoca) — mês em um eixo, quantidade no outro
  if (ch.topPagesChart) {
    try {
      const { labels, datasets } = buildTopItemsChartData(content, ch.color);
      const opts = baseChartOptions();
      opts.scales.y.title = { display: true, text: 'Visualizações', font: { size: 11.5, weight: '600' }, color: ch.color };
      opts.interaction = { mode: 'point', intersect: true };
      state.charts.topPages = new Chart(document.getElementById('chart-top-pages'), {
        type: 'bar',
        data: { labels, datasets },
        options: opts
      });
    } catch (e) {
      console.error('Não foi possível desenhar o gráfico:', e);
      document.getElementById('chart-top-pages').closest('.chart-wrap').innerHTML = '<div class="empty-state">Não foi possível carregar o gráfico.</div>';
    }
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
      // Posição média é sempre mostrada com o número exato (1 casa decimal, ex.: 5,6) — tanto no
      // rótulo em cima da barra quanto na dica ao passar o mouse — em vez do valor arredondado
      // que `fmtNum`/o eixo Y usariam por padrão.
      opts.scales.y.grace = '12%';
      opts.plugins.tooltip.callbacks.label = (ctx) => `${ctx.dataset.label}: ${fmtDecimal1(ctx.parsed.y)}`;
      state.charts.seoTopKeywords = new Chart(document.getElementById('chart-seo-top-keywords'), {
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
    } catch (e) {
      console.error('Não foi possível desenhar o gráfico:', e);
      const el = document.getElementById('chart-seo-top-keywords');
      if (el) el.closest('.chart-wrap').innerHTML = '<div class="empty-state">Não foi possível carregar o gráfico.</div>';
    }
  }

  // Ranking de palavras-chave e Ranking de páginas (Análise SEO do Site), ou a lista de conteúdos
  // do canal nos demais casos: todos paginados de 5 em 5, só a tabela/lista troca de página.
  if (ch.seoAnalysis) {
    renderSeoRankingPage('seo-keywords-table-wrap', 'seo-keywords', seoKeywords, 'Palavra-chave', true, 'seoKeywordsPage');
    renderSeoRankingPage('seo-pages-table-wrap', 'seo-pages', seoPages, 'Página', true, 'seoPagesPage');
  } else {
    renderPaginatedList('channel-content-list-wrap', 'channel-content', topContent, 'channelContentPage', (items, offset) => renderContentList(items, false, offset), wireContentRowActions);
  }

  // gráficos de assessoria: por tipo de veículo e por estado
  if (ch.pressReport) {
    const byType = {};
    const byUf = {};
    content.forEach(c => {
      const t = c.mediaType || 'Não informado';
      byType[t] = (byType[t] || 0) + 1;
      const uf = c.uf || '—';
      byUf[uf] = (byUf[uf] || 0) + 1;
    });
    const typeColors = { Online: '#c8a94a', Revista: '#b5395f', Social: '#d98c2b', Site: '#4b5eaa', 'Não informado': '#5a5d6b' };
    try {
      state.charts.pressType = new Chart(document.getElementById('chart-press-type'), {
        type: 'doughnut',
        data: {
          labels: Object.keys(byType),
          datasets: [{ data: Object.values(byType), backgroundColor: Object.keys(byType).map(k => typeColors[k] || '#8a8d99') }]
        },
        options: doughnutChartOptions()
      });
    } catch (e) { console.error(e); }
    const ufEntries = Object.entries(byUf).sort((a, b) => b[1] - a[1]);
    try {
      state.charts.pressUf = new Chart(document.getElementById('chart-press-uf'), {
        type: 'bar',
        data: { labels: ufEntries.map(e => e[0]), datasets: [{ label: 'Matérias', data: ufEntries.map(e => e[1]), backgroundColor: ch.color }] },
        options: horizontalBarChartOptions()
      });
    } catch (e) { console.error(e); }
  }

  document.getElementById('add-metric-btn').addEventListener('click', () => openMetricModal(ch));
  if (ch.seoAnalysis) {
    document.getElementById('add-seo-keyword-btn').addEventListener('click', () => openContentModal(ch, null, { seoEntryType: 'keyword' }));
    document.getElementById('add-seo-page-btn').addEventListener('click', () => openContentModal(ch, null, { seoEntryType: 'page' }));
  } else {
    document.getElementById('add-content-btn').addEventListener('click', () => openContentModal(ch));
  }
  wireMetricsTableActions(ch, metrics);

  document.getElementById('download-template-btn').addEventListener('click', () => {
    downloadChannelTemplate(ch, brandById(state.brand).label, state.year);
  });

  document.getElementById('channel-audit-btn').addEventListener('click', () => navigateTab('audit:' + ch.id));

  document.getElementById('import-template-btn').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });

  document.getElementById('import-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const rows = await parseImportedTemplate(file, ch);
      if (!rows.length) {
        toast('Nenhuma linha preenchida foi encontrada na planilha.', true);
        return;
      }
      let created = 0, updated = 0, failed = 0;
      for (const row of rows) {
        const existingRow = metrics.find(m => m.month === row.month && m.year === row.year);
        const body = { brand: state.brand, channel: ch.id, month: row.month, year: row.year };
        editableFields(ch, ch.metrics).forEach(f => { body[f] = row[f] !== undefined ? row[f] : ''; });
        (ch.textFields || []).forEach(f => { body[f] = row[f] !== undefined ? row[f] : ''; });
        body.notes = row.notes || '';
        try {
          if (existingRow) {
            await api(`/metrics/${existingRow.id}`, { method: 'PUT', body });
            updated++;
          } else {
            await api('/metrics', { method: 'POST', body });
            created++;
          }
        } catch (err) {
          failed++;
        }
      }
      invalidateBrandCache(state.brand);
      toast(`Planilha importada: ${created} criado(s), ${updated} atualizado(s)${failed ? `, ${failed} com erro` : ''}.`);
      navigateTab(state.tab);
    } catch (err) {
      toast('Erro ao ler a planilha: ' + err.message, true);
    }
    e.target.value = '';
  });

  document.getElementById('download-pdf-btn').addEventListener('click', () => {
    downloadChannelPdf(ch, metrics, content);
  });

  document.getElementById('download-excel-report-btn').addEventListener('click', (e) => {
    downloadChannelExcelReport(ch, e.target);
  });

  // Cadastro em massa dos conteúdos em destaque (posts/páginas/matérias/produtos) por planilha —
  // mesma ideia do modelo de lançamentos mensais, só que dirigida pelas colunas de conteúdo do canal.
  const downloadContentBtn = document.getElementById('download-content-template-btn');
  const importContentBtn = document.getElementById('import-content-template-btn');
  const importContentInput = document.getElementById('import-content-file-input');
  if (downloadContentBtn) {
    downloadContentBtn.addEventListener('click', () => {
      downloadContentTemplate(ch, brandById(state.brand).label, state.year);
    });
  }
  if (importContentBtn && importContentInput) {
    importContentBtn.addEventListener('click', () => importContentInput.click());
    importContentInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const rows = await parseImportedContentTemplate(file, ch);
        if (!rows.length) {
          toast('Nenhuma linha válida foi encontrada na planilha (confira os campos obrigatórios).', true);
          return;
        }
        let created = 0, failed = 0;
        for (const row of rows) {
          const body = { brand: state.brand, channel: ch.id, ...row };
          try {
            await api('/content', { method: 'POST', body });
            created++;
          } catch (err) {
            failed++;
          }
        }
        invalidateBrandCache(state.brand);
        toast(`Planilha importada: ${created} conteúdo(s) cadastrado(s)${failed ? `, ${failed} com erro` : ''}.`);
        navigateTab(state.tab);
      } catch (err) {
        toast('Erro ao ler a planilha: ' + err.message, true);
      }
      e.target.value = '';
    });
  }
}

// Baixa o relatório completo do canal em Excel (.xlsx), com os mesmos gráficos do dashboard
// como gráficos nativos do Excel (editáveis, não imagens estáticas) — gerado no servidor.
async function downloadChannelExcelReport(ch, btnEl) {
  const originalLabel = btnEl ? btnEl.textContent : '';
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Gerando...'; }
  try {
    const res = await fetch(`/api/reports/excel/${ch.id}?brand=${state.brand}&year=${state.year}`, {
      headers: { Authorization: 'Bearer ' + state.token }
    });
    if (res.status === 401) {
      doLogout(false);
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (!res.ok) {
      let msg = 'Não foi possível gerar o relatório em Excel.';
      try { const data = await res.json(); if (data.error) msg = data.error; } catch (e) { /* sem corpo */ }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${ch.id}-${state.brand}-${state.year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast(err.message, true);
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = originalLabel; }
  }
}

function downloadChannelPdf(ch, metrics, content) {
  const doc = new jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  const brand = brandById(state.brand);
  let y = pdfHeader(doc, `${ch.label} — ${brand.label}`, `Relatório de ${state.year} · gerado em ${new Date().toLocaleDateString('pt-BR')}`);

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
    pdfFooterAndSave(doc, `relatorio-${ch.id}-${state.brand}-${state.year}.pdf`);
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

  pdfFooterAndSave(doc, `relatorio-${ch.id}-${state.brand}-${state.year}.pdf`);
}

function computeInsights(ch, metrics) {
  const insights = [];
  if (metrics.length >= 2) {
    const first = metrics[0];
    const last = metrics[metrics.length - 1];
    ch.growth.forEach(field => {
      const delta = pctChange(first[field], last[field]);
      if (delta !== null) {
        insights.push(`${escapeHtml(METRIC_LABELS[field])} ${delta >= 0 ? 'cresceu' : 'caiu'} <b>${fmtPct(Math.abs(delta) * (delta < 0 ? -1 : 1))}</b> de ${MONTH_NAMES[first.month - 1]} a ${MONTH_NAMES[last.month - 1]}/${state.year}.`);
      }
    });
  }
  if (metrics.length) {
    const bestMonth = metrics.slice().sort((a, b) => (b[ch.growth[0]] || 0) - (a[ch.growth[0]] || 0))[0];
    if (bestMonth && bestMonth[ch.growth[0]]) {
      insights.push(`O melhor mês do ano em ${escapeHtml(METRIC_LABELS[ch.growth[0]]).toLowerCase()} foi <b>${MONTH_NAMES_FULL[bestMonth.month - 1]}</b>, com ${fmtNum(bestMonth[ch.growth[0]])}.`);
    }
    if (ch.metrics.includes('engagement')) {
      const avgEng = average(metrics.map(m => m.engagement));
      if (avgEng !== null) insights.push(`Engajamento médio mensal em ${state.year}: <b>${fmtNum(avgEng)}</b>.`);
    }
    if (ch.metrics.includes('contentInteractions')) {
      const avgInt = average(metrics.map(m => m.contentInteractions));
      if (avgInt !== null) insights.push(`Interações de conteúdo médias mensais em ${state.year}: <b>${fmtNum(avgInt)}</b>.`);
    }
  }
  return insights;
}

function average(arr) {
  const nums = arr.filter(n => n !== null && n !== undefined);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function renderMetricsTable(ch, metrics) {
  if (!metrics.length) {
    return `<div class="empty-state">Nenhum lançamento em ${state.year} ainda.<br><button class="btn btn-accent btn-sm" onclick="document.getElementById('add-metric-btn').click()">Lançar primeiro mês</button></div>`;
  }
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
  return `
    <table>
      <thead><tr>
        <th>Mês</th>
        ${tableFields.map(f => `<th class="num">${escapeHtml(METRIC_LABELS[f])}</th>`).join('')}
        ${textFields.map(f => `<th>${escapeHtml(METRIC_LABELS[f])}</th>`).join('')}
        <th></th>
      </tr></thead>
      <tbody>
        ${metrics.map((m, idx) => `
          <tr data-id="${m.id}">
            <td>${MONTH_NAMES_FULL[m.month - 1]}</td>
            ${tableFields.map(f => `<td class="num">${cellHtml(m, idx, f)}</td>`).join('')}
            ${textFields.map(f => `<td>${m[f] ? (f === 'mailingLink' ? `<a href="${escapeHtml(m[f])}" target="_blank" rel="noopener">Abrir</a>` : escapeHtml(m[f])) : '—'}</td>`).join('')}
            <td class="table-actions">
              <button class="icon-btn" data-edit="${m.id}">Editar</button>
              <button class="icon-btn danger" data-del="${m.id}">Excluir</button>
            </td>
          </tr>`).join('')}
      </tbody>
      ${ch.totalsFields && ch.totalsFields.length ? `
      <tfoot>
        <tr style="font-weight:700;border-top:2px solid var(--line);">
          <td>Total no ano</td>
          ${tableFields.map(f => `<td class="num">${ch.totalsFields.includes(f) ? fmtValue(f, metrics.reduce((sum, m) => sum + (m[f] || 0), 0)) : ''}</td>`).join('')}
          ${textFields.map(() => `<td></td>`).join('')}
          <td></td>
        </tr>
      </tfoot>` : ''}
    </table>`;
}

function wireMetricsTableActions(ch, metrics) {
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = metrics.find(m => m.id === btn.dataset.edit);
      openMetricModal(ch, item);
    });
  });
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir este lançamento mensal? Essa ação não pode ser desfeita.')) return;
      try {
        await api(`/metrics/${btn.dataset.del}`, { method: 'DELETE' });
        invalidateBrandCache(state.brand);
        toast('Lançamento excluído.');
        navigateTab(state.tab);
      } catch (e) { toast(e.message, true); }
    });
  });
}

function openMetricModal(ch, existing) {
  // Campos calculados (ex.: "Conversões" do blog = soma de outros 3 campos) não entram
  // no formulário como algo a digitar — só os campos que a pessoa realmente preenche.
  const formFields = (ch.tableMetrics || ch.metrics).filter(f => !(ch.computed && ch.computed[f]));
  const fields = formFields.map(f => `
    <div class="field">
      <label>${escapeHtml(METRIC_LABELS[f])}</label>
      <input type="number" min="0" step="1" id="m-${f}" value="${existing && existing[f] !== null && existing[f] !== undefined ? existing[f] : ''}">
    </div>`).join('');

  const extraFields = (ch.formExtraFields || []).map(f => `
    <div class="field">
      <label>${escapeHtml(METRIC_LABELS[f])}</label>
      <input type="number" min="0" step="1" id="m-${f}" value="${existing && existing[f] !== null && existing[f] !== undefined ? existing[f] : ''}">
    </div>`).join('');

  const textFields = (ch.textFields || []).map(f => `
    <div class="field full">
      <label>${escapeHtml(METRIC_LABELS[f])}</label>
      <input type="text" id="m-${f}" value="${existing ? escapeHtml(existing[f] || '') : ''}" placeholder="${f === 'mailingLink' ? 'https://... ou link do Google Drive/Excel' : 'Ex.: Pesquisa 40%, Sugeridos 30%, Externo 15%...'}">
    </div>`).join('');

  openModal(`
    <h3>${existing ? 'Editar lançamento' : 'Lançar mês'} — ${escapeHtml(ch.label)}</h3>
    <p class="sub">${brandById(state.brand).label}${existing ? ' · ' + MONTH_NAMES_FULL[existing.month - 1] + '/' + existing.year : ''}</p>
    <div id="modal-msg"></div>
    <div class="form-grid">
      ${!existing ? `
      <div class="field">
        <label>Mês</label>
        <select id="m-month">
          ${MONTH_NAMES_FULL.map((mn, i) => `<option value="${i + 1}">${mn}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Ano</label>
        <input type="number" id="m-year" value="${state.year}">
      </div>` : ''}
      ${fields}
    </div>
    ${extraFields ? `<p class="sub" style="margin:16px 0 6px;">Detalhamento (usado nos gráficos)</p><div class="form-grid">${extraFields}</div>` : ''}
    ${textFields ? `<div class="form-grid">${textFields}</div>` : ''}
    <div class="field full">
      <label>Observações</label>
      <textarea id="m-notes" rows="2">${existing ? escapeHtml(existing.notes || '') : ''}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="modal-cancel">Cancelar</button>
      <button class="btn btn-accent" id="modal-save">Salvar</button>
    </div>
  `, { preventBackdropClose: true });

  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', async () => {
    const body = { brand: state.brand, channel: ch.id };
    formFields.forEach(f => { body[f] = document.getElementById(`m-${f}`).value; });
    (ch.formExtraFields || []).forEach(f => { body[f] = document.getElementById(`m-${f}`).value; });
    (ch.textFields || []).forEach(f => { body[f] = document.getElementById(`m-${f}`).value; });
    body.notes = document.getElementById('m-notes').value;
    try {
      if (existing) {
        await api(`/metrics/${existing.id}`, { method: 'PUT', body });
      } else {
        body.month = document.getElementById('m-month').value;
        body.year = document.getElementById('m-year').value;
        await api('/metrics', { method: 'POST', body });
      }
      invalidateBrandCache(state.brand);
      closeModal();
      toast('Lançamento salvo.');
      navigateTab(state.tab);
    } catch (e) {
      document.getElementById('modal-msg').innerHTML = `<div class="error-msg">${escapeHtml(e.message)}</div>`;
    }
  });
}

/* ==================== Conteúdos em destaque ==================== */
function downloadContentPdf(items) {
  const doc = new jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  const brand = brandById(state.brand);
  let y = pdfHeader(doc, `Conteúdos em destaque — ${brand.label}`, `Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${items.length} item(ns)`);
  const body = items.map(c => {
    const ch = channelById(c.channel);
    const isPress = c.channel === 'assessoria';
    const isVideo = !!(ch && ch.videoMetrics);
    const isBlog = c.channel === 'blog';
    const isSeo = c.channel === 'siteSeo';
    const isEcommerce = c.channel === 'ecommerce';
    const isPage = (c.channel === 'site' || c.channel === 'blog') && !isVideo;
    const stat1 = isPress ? fmtCurrency(c.value) : isSeo ? fmtNum(c.clicks) : isEcommerce ? fmtNum(c.itemsPurchased) : (isPage || isVideo) ? fmtNum(c.views) : fmtNum(c.reach);
    const stat2 = isPress ? (c.mediaType || '—') : isVideo ? fmtNum(c.videoNewFollowers) : isBlog ? fmtNum(contentConversions(c)) : isSeo ? fmtNum(c.impressions) : isEcommerce ? fmtCurrency(c.itemRevenue) : isPage ? fmtNum(c.buttonClicks) : fmtNum(c.engagement);
    return [c.title, ch.label, c.month ? MONTH_NAMES[c.month - 1] + '/' + c.year : '—', stat1, stat2, c.url ? 'Abrir' : '—'];
  });
  const links = items.map(c => c.url || null);
  pdfTable(doc, y, null, ['Título', 'Canal', 'Período', 'Principal', 'Secundária', 'Link'], body, { linkColIndex: 5, links });
  pdfFooterAndSave(doc, `relatorio-conteudos-${state.brand}.pdf`);
}

// Baixa o relatório "Conteúdos em destaque" em Excel (.xlsx) — mesma tabela do PDF, com dados
// nativos (não imagem), respeitando o filtro de canal selecionado na tela.
async function downloadContentExcelReport(channelFilter, btnEl) {
  const originalLabel = btnEl ? btnEl.textContent : '';
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Gerando...'; }
  try {
    const res = await fetch(`/api/reports/excel/content-list?brand=${state.brand}&channel=${channelFilter || 'all'}`, {
      headers: { Authorization: 'Bearer ' + state.token }
    });
    if (res.status === 401) {
      doLogout(false);
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (!res.ok) {
      let msg = 'Não foi possível gerar o relatório em Excel.';
      try { const data = await res.json(); if (data.error) msg = data.error; } catch (e) { /* sem corpo */ }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-conteudos-${state.brand}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast(err.message, true);
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = originalLabel; }
  }
}

// Tabela de ranking usada pela Análise SEO do Site (palavras-chave e páginas) —
// mesmas 4 colunas do relatório de Desempenho do Google Search Console (Consultas/Páginas).
function renderSeoRankingTable(items, colLabel, showMonth) {
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
        <th></th>
      </tr></thead>
      <tbody>
        ${items.map(c => `
          <tr data-id="${c.id}">
            ${showMonth ? `<td>${c.month ? escapeHtml(MONTH_NAMES[c.month - 1]) + (c.year ? '/' + c.year : '') : '—'}</td>` : ''}
            <td>${escapeHtml(c.title)}</td>
            <td class="num">${fmtNum(c.clicks)}</td>
            <td class="num">${fmtNum(c.impressions)}</td>
            <td class="num">${c.ctr !== null && c.ctr !== undefined && c.ctr !== '' ? c.ctr + '%' : '—'}</td>
            <td class="num">${c.avgPosition !== null && c.avgPosition !== undefined && c.avgPosition !== '' ? c.avgPosition : '—'}</td>
            <td class="table-actions">
              <button class="icon-btn" data-content-edit="${c.id}">Editar</button>
              <button class="icon-btn danger" data-content-del="${c.id}">Excluir</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// Paginação padrão de qualquer lista/tabela longa do painel (rankings da Análise SEO do Site,
// lista de conteúdos por canal, lista global de Conteúdos em destaque) — 5 itens por vez, com
// botões ‹ Anterior / Próxima ›. Só o wrap trocado é reescrito a cada clique; o resto da tela
// (scroll, cards, gráficos) fica parado.
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

// Religa só os botões Editar/Excluir de dentro do wrap informado (nunca o documento inteiro), para não
// duplicar os listeners de outra lista/tabela paginada que não foi tocada nesta repaginação.
function wireContentRowActions(wrapEl) {
  wrapEl.querySelectorAll('[data-content-edit]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const all = await loadContent(state.brand);
      const item = all.find(c => c.id === btn.dataset.contentEdit);
      if (item) openContentModal(channelById(item.channel), item);
    });
  });
  wrapEl.querySelectorAll('[data-content-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir este conteúdo em destaque?')) return;
      try {
        await api(`/content/${btn.dataset.contentDel}`, { method: 'DELETE' });
        invalidateBrandCache(state.brand);
        toast('Conteúdo excluído.');
        navigateTab(state.tab);
      } catch (e) { toast(e.message, true); }
    });
  });
}

// Renderiza (e repagina, sem refazer a página toda) uma lista/tabela longa qualquer. `renderItemsFn`
// recebe (itensDaPágina, offset) — offset é a posição do 1º item da página na lista completa, usado
// por exemplo pra numeração de ranking continuar certa entre páginas (6, 7, 8... na página 2, não
// 1, 2, 3 de novo). `wireFn`, se passado, religa as ações (Editar/Excluir) só dentro do wrap.
function renderPaginatedList(wrapId, idPrefix, allItems, pageStateKey, renderItemsFn, wireFn) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  const { pageItems, page, totalPages, offset } = paginateItems(allItems, state[pageStateKey] || 1, TABLE_PAGE_SIZE);
  state[pageStateKey] = page;
  wrap.innerHTML = renderItemsFn(pageItems, offset) + paginationControlsHtml(idPrefix, page, totalPages);
  if (wireFn) wireFn(wrap);
  const prevBtn = document.getElementById(`${idPrefix}-prev-btn`);
  const nextBtn = document.getElementById(`${idPrefix}-next-btn`);
  if (prevBtn) prevBtn.addEventListener('click', () => { state[pageStateKey] = page - 1; renderPaginatedList(wrapId, idPrefix, allItems, pageStateKey, renderItemsFn, wireFn); });
  if (nextBtn) nextBtn.addEventListener('click', () => { state[pageStateKey] = page + 1; renderPaginatedList(wrapId, idPrefix, allItems, pageStateKey, renderItemsFn, wireFn); });
}

// Renderiza (e repagina, sem refazer a página toda) uma das tabelas de ranking da Análise SEO do Site.
function renderSeoRankingPage(wrapId, idPrefix, allItems, colLabel, showMonth, pageStateKey) {
  renderPaginatedList(wrapId, idPrefix, allItems, pageStateKey, (items) => renderSeoRankingTable(items, colLabel, showMonth), wireContentRowActions);
}

function renderContentList(items, showChannel, rankOffset) {
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
    return `
      <div class="content-item">
        <div class="content-rank">${rankOffset + i + 1}</div>
        <div class="content-main">
          <div class="title">${escapeHtml(c.title)}</div>
          <div class="meta">${metaParts.filter(Boolean).join(' · ')}</div>
        </div>
        <div class="content-stats">
          ${statsHtml}
        </div>
        ${c.id ? `<div class="table-actions" style="margin-left:10px;">
          ${c.url ? `<a class="icon-btn" href="${escapeHtml(c.url)}" target="_blank" rel="noopener">Ver</a>` : ''}
          <button class="icon-btn" data-content-edit="${c.id}">Editar</button>
          <button class="icon-btn danger" data-content-del="${c.id}">Excluir</button>
        </div>` : ''}
      </div>`;
  }).join('');
}

async function renderContentPage() {
  // Reseta a paginação da lista sempre que a pessoa entra nesta página.
  state.globalContentPage = 1;
  setTopbar('Conteúdos em destaque', `${brandById(state.brand).label}`);
  const content = await loadContent(state.brand);
  const contentEl = document.getElementById('content');

  contentEl.innerHTML = `
    <div class="section-head" style="flex-wrap:wrap;gap:10px;">
      <h3>Conteúdos com melhor desempenho</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <select class="year-select" id="content-channel-filter">
          <option value="all">Todos os canais</option>
          ${channelsForBrand(state.brand).map(c => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm" id="download-content-pdf-btn">⭳ Baixar relatório (PDF)</button>
        <button class="btn btn-ghost btn-sm" id="download-content-excel-btn">⭳ Baixar relatório (Excel)</button>
        <button class="btn btn-accent btn-sm" id="add-content-btn-page">+ Adicionar conteúdo</button>
      </div>
    </div>
    <div class="card" id="content-list-wrap"></div>
  `;

  let currentItems = content;
  let currentChannelFilter = 'all';
  document.getElementById('download-content-pdf-btn').addEventListener('click', () => {
    downloadContentPdf(currentItems);
  });

  document.getElementById('download-content-excel-btn').addEventListener('click', (e) => {
    downloadContentExcelReport(currentChannelFilter, e.target);
  });

  function draw() {
    const filter = document.getElementById('content-channel-filter').value;
    currentChannelFilter = filter;
    const items = content
      .filter(c => filter === 'all' || c.channel === filter)
      .sort((a, b) => (b.reach || 0) - (a.reach || 0));
    currentItems = items;
    state.globalContentPage = 1;
    renderPaginatedList('content-list-wrap', 'global-content', items, 'globalContentPage', (its, offset) => renderContentList(its, true, offset), wireContentRowActions);
  }
  draw();
  document.getElementById('content-channel-filter').addEventListener('change', draw);
  document.getElementById('add-content-btn-page').addEventListener('click', () => openContentModal(CHANNELS[0]));
}

function openContentModal(defaultChannel, existing, opts) {
  opts = opts || {};
  const currentChannel = existing ? existing.channel : defaultChannel.id;
  const isPress = currentChannel === 'assessoria';
  const label = defaultChannel.pressReport || isPress ? { title: 'Cadastrar matéria', desc: 'Título / manchete' } : (defaultChannel.topPagesChart ? { title: 'Cadastrar página', desc: 'Título / URL da página' } : { title: existing ? 'Editar conteúdo' : 'Adicionar conteúdo em destaque', desc: 'Título / descrição' });

  openModal(`
    <h3>${existing ? 'Editar' : (defaultChannel.pressReport ? 'Cadastrar matéria' : defaultChannel.topPagesChart ? 'Cadastrar página' : 'Adicionar conteúdo em destaque')}</h3>
    <p class="sub">${brandById(state.brand).label}</p>
    <div id="modal-msg"></div>
    <div class="form-grid">
      <div class="field full">
        <label id="c-title-label">${label.desc}</label>
        <input type="text" id="c-title" value="${existing ? escapeHtml(existing.title) : ''}" placeholder="Ex.: Reel dos bastidores">
      </div>
      <div class="field">
        <label>Canal</label>
        <select id="c-channel">
          ${channelsForBrand(state.brand).map(c => `<option value="${c.id}" ${currentChannel === c.id ? 'selected' : ''}>${escapeHtml(c.label)}</option>`).join('')}
        </select>
      </div>
      <div class="field" id="c-format-wrap">
        <label id="c-format-label">Formato</label>
        <input type="text" id="c-format" value="${existing ? escapeHtml(existing.format || '') : ''}" placeholder="Reel, Post, Vídeo...">
      </div>
      <div class="field" id="c-postType-wrap" style="display:none;">
        <label>${escapeHtml(METRIC_LABELS.postType)}</label>
        <select id="c-postType">
          <option value="">Selecione</option>
          ${(channelById(currentChannel) && channelById(currentChannel).postTypeOptions || []).map(t => `<option value="${t}" ${existing && existing.postType === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="field" id="c-trafficType-wrap" style="display:none;">
        <label id="c-trafficType-label">${escapeHtml(METRIC_LABELS.trafficType)} *</label>
        <select id="c-trafficType">
          <option value="">Selecione</option>
          ${((channelById(currentChannel) && channelById(currentChannel).trafficTypeOptions) || TRAFFIC_TYPES).map(t => `<option value="${t}" ${existing && existing.trafficType === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Mês</label>
        <select id="c-month">
          ${MONTH_NAMES_FULL.map((mn, i) => `<option value="${i + 1}" ${(existing ? existing.month : new Date().getMonth() + 1) === i + 1 ? 'selected' : ''}>${mn}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Ano</label>
        <input type="number" id="c-year" value="${existing ? existing.year : state.year}">
      </div>
      <div class="field full">
        <label id="c-url-label">Link (opcional)</label>
        <input type="text" id="c-url" value="${existing ? escapeHtml(existing.url || '') : ''}" placeholder="https://...">
      </div>
    </div>

    <div class="form-grid" id="press-fields">
      <div class="field"><label>Veículo</label><input type="text" id="c-vehicle" value="${existing ? escapeHtml(existing.vehicle || '') : ''}" placeholder="Ex.: Revista Anamaco"></div>
      <div class="field"><label>Tipo de veículo</label>
        <select id="c-mediaType">
          <option value="">Selecione</option>
          ${MEDIA_TYPES.map(t => `<option value="${t}" ${existing && existing.mediaType === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Estado (UF)</label><input type="text" id="c-uf" maxlength="2" style="text-transform:uppercase" value="${existing ? escapeHtml(existing.uf || '') : ''}" placeholder="SP"></div>
      <div class="field"><label>Data de publicação</label><input type="date" id="c-publishDate" value="${existing ? escapeHtml(existing.publishDate || '') : ''}"></div>
      <div class="field full"><label>Centimetragem (R$)</label><input type="number" step="0.01" id="c-value" value="${existing && existing.value !== null && existing.value !== undefined ? existing.value : ''}"></div>
    </div>

    <div class="form-grid" id="page-fields">
      <div class="field"><label>${escapeHtml(METRIC_LABELS.pageTrafficSource)}</label>
        <select id="c-pageTrafficSource">
          <option value="">Selecione</option>
          <option value="Busca orgânica" ${existing && existing.pageTrafficSource === 'Busca orgânica' ? 'selected' : ''}>Busca orgânica</option>
          <option value="Redes sociais" ${existing && existing.pageTrafficSource === 'Redes sociais' ? 'selected' : ''}>Redes sociais</option>
          <option value="Anúncios" ${existing && existing.pageTrafficSource === 'Anúncios' ? 'selected' : ''}>Anúncios</option>
          <option value="Direto" ${existing && existing.pageTrafficSource === 'Direto' ? 'selected' : ''}>Direto (digitaram o link)</option>
          <option value="Outro" ${existing && existing.pageTrafficSource === 'Outro' ? 'selected' : ''}>Outro</option>
        </select>
      </div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.region)}</label><input type="text" id="c-region" value="${existing ? escapeHtml(existing.region || '') : ''}" placeholder="Ex.: São Paulo, Sudeste, Brasil"></div>
      <div class="field" id="c-scrollDepth-wrap"><label>${escapeHtml(METRIC_LABELS.scrollDepth)}</label><input type="number" step="0.1" id="c-scrollDepth" value="${existing && existing.scrollDepth !== null && existing.scrollDepth !== undefined ? existing.scrollDepth : ''}"></div>
      <div class="field" id="c-buttonClicks-wrap"><label>${escapeHtml(METRIC_LABELS.buttonClicks)}</label><input type="number" id="c-buttonClicks" value="${existing && existing.buttonClicks !== null && existing.buttonClicks !== undefined ? existing.buttonClicks : ''}"></div>
      <div class="field" id="c-buttonName-wrap"><label>${escapeHtml(METRIC_LABELS.buttonName)}</label><input type="text" id="c-buttonName" value="${existing ? escapeHtml(existing.buttonName || '') : ''}" placeholder="Ex.: Fale conosco no WhatsApp, Baixar catálogo..."></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.pageActiveUsers)}</label><input type="number" id="c-pageActiveUsers" value="${existing && existing.pageActiveUsers !== null && existing.pageActiveUsers !== undefined ? existing.pageActiveUsers : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.pageEventCount)}</label><input type="number" id="c-pageEventCount" value="${existing && existing.pageEventCount !== null && existing.pageEventCount !== undefined ? existing.pageEventCount : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.pageBounceRate)}</label><input type="number" step="0.1" id="c-pageBounceRate" value="${existing && existing.pageBounceRate !== null && existing.pageBounceRate !== undefined ? existing.pageBounceRate : ''}"></div>
    </div>

    <div class="form-grid" id="product-fields">
      <div class="field"><label>Estado</label><input type="text" id="c-productUf" maxlength="2" style="text-transform:uppercase" value="${existing ? escapeHtml(existing.uf || '') : ''}" placeholder="SP"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.downloads)}</label><input type="number" id="c-downloads" value="${existing && existing.downloads !== null && existing.downloads !== undefined ? existing.downloads : ''}"></div>
    </div>

    <div class="form-grid" id="video-fields">
      <div class="field"><label>${escapeHtml(METRIC_LABELS.avgWatchTime)}</label><input type="number" id="c-avgWatchTime" value="${existing && existing.avgWatchTime !== null && existing.avgWatchTime !== undefined ? existing.avgWatchTime : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.completionRate)}</label><input type="number" step="0.1" id="c-completionRate" value="${existing && existing.completionRate !== null && existing.completionRate !== undefined ? existing.completionRate : ''}"></div>
      <div class="field full"><label>${escapeHtml(METRIC_LABELS.videoNewFollowers)}</label><input type="number" id="c-videoNewFollowers" value="${existing && existing.videoNewFollowers !== null && existing.videoNewFollowers !== undefined ? existing.videoNewFollowers : ''}"></div>
      <div class="field full">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="c-sponsored" style="width:16px;height:16px;" ${existing && existing.sponsored ? 'checked' : ''}>
          ${escapeHtml(METRIC_LABELS.sponsored)}
        </label>
      </div>
    </div>

    <div class="form-grid" id="generic-fields">
      <div class="field" id="social-stats-fields-1"><label>Alcance</label><input type="number" id="c-reach" value="${existing && existing.reach !== null ? existing.reach : ''}"></div>
      <div class="field" id="social-stats-fields-2"><label id="c-engagement-label">Engajamento</label><input type="number" id="c-engagement" value="${existing && existing.engagement !== null ? existing.engagement : ''}"></div>
      <div class="field" id="social-stats-fields-3"><label id="c-likes-label">Curtidas</label><input type="number" id="c-likes" value="${existing && existing.likes !== null ? existing.likes : ''}"></div>
      <div class="field" id="social-stats-fields-4"><label>Comentários</label><input type="number" id="c-comments" value="${existing && existing.comments !== null ? existing.comments : ''}"></div>
      <div class="field" id="social-stats-fields-5"><label id="c-shares-label">Compartilhamentos</label><input type="number" id="c-shares" value="${existing && existing.shares !== null ? existing.shares : ''}"></div>
      <div class="field" id="c-views-wrap"><label id="c-views-label">Visualizações</label><input type="number" id="c-views" value="${existing && existing.views !== null ? existing.views : ''}"></div>
    </div>

    <div class="form-grid" id="instagram-fields">
      <div class="field"><label>${escapeHtml(METRIC_LABELS.viewers)}</label><input type="number" id="c-viewers" value="${existing && existing.viewers !== null && existing.viewers !== undefined ? existing.viewers : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.savedCount)}</label><input type="number" id="c-savedCount" value="${existing && existing.savedCount !== null && existing.savedCount !== undefined ? existing.savedCount : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.postNewFollowers)}</label><input type="number" id="c-postNewFollowers" value="${existing && existing.postNewFollowers !== null && existing.postNewFollowers !== undefined ? existing.postNewFollowers : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.linkClicks)} (opcional)</label><input type="number" id="c-linkClicks" value="${existing && existing.linkClicks !== null && existing.linkClicks !== undefined ? existing.linkClicks : ''}"></div>
      <div class="field full"><label>${escapeHtml(METRIC_LABELS.postWatchTime)} (opcional)</label><input type="number" id="c-postWatchTime" value="${existing && existing.postWatchTime !== null && existing.postWatchTime !== undefined ? existing.postWatchTime : ''}"></div>
    </div>

    <div class="form-grid" id="pinterest-fields">
      <div class="field"><label>${escapeHtml(METRIC_LABELS.impressions)} *</label><input type="number" id="c-impressions" value="${existing && existing.impressions !== null && existing.impressions !== undefined ? existing.impressions : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.pinClicks)} *</label><input type="number" id="c-pinClicks" value="${existing && existing.pinClicks !== null && existing.pinClicks !== undefined ? existing.pinClicks : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.savedCount)} *</label><input type="number" id="c-pinSavedCount" value="${existing && existing.savedCount !== null && existing.savedCount !== undefined ? existing.savedCount : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.outboundClicks)} *</label><input type="number" id="c-outboundClicks" value="${existing && existing.outboundClicks !== null && existing.outboundClicks !== undefined ? existing.outboundClicks : ''}"></div>
    </div>

    <div class="form-grid" id="linkedin-fields">
      <div class="field"><label>${escapeHtml(METRIC_LABELS.audience)}</label><input type="number" id="c-audience" value="${existing && existing.audience !== null && existing.audience !== undefined ? existing.audience : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.impressions)}</label><input type="number" id="c-liImpressions" value="${existing && existing.impressions !== null && existing.impressions !== undefined ? existing.impressions : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.clicks)}</label><input type="number" id="c-clicks" value="${existing && existing.clicks !== null && existing.clicks !== undefined ? existing.clicks : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.ctr)}</label><input type="number" step="0.1" id="c-ctr" value="${existing && existing.ctr !== null && existing.ctr !== undefined ? existing.ctr : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.engagementRate)}</label><input type="number" step="0.1" id="c-engagementRate" value="${existing && existing.engagementRate !== null && existing.engagementRate !== undefined ? existing.engagementRate : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.postNewFollowers)}</label><input type="number" id="c-liPostNewFollowers" value="${existing && existing.postNewFollowers !== null && existing.postNewFollowers !== undefined ? existing.postNewFollowers : ''}"></div>
    </div>

    <div class="form-grid" id="blog-fields">
      <div class="field"><label>${escapeHtml(METRIC_LABELS.seoImpressions)}</label><input type="number" id="c-blogImpressions" value="${existing && existing.impressions !== null && existing.impressions !== undefined ? existing.impressions : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.clicks)} (busca orgânica)</label><input type="number" id="c-blogClicks" value="${existing && existing.clicks !== null && existing.clicks !== undefined ? existing.clicks : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.avgPosition)}</label><input type="number" step="0.1" id="c-avgPosition" value="${existing && existing.avgPosition !== null && existing.avgPosition !== undefined ? existing.avgPosition : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.engagementRate)} do post</label><input type="number" step="0.1" id="c-blogEngagementRate" value="${existing && existing.engagementRate !== null && existing.engagementRate !== undefined ? existing.engagementRate : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.convProductClicks)}</label><input type="number" id="c-convProductClicks" value="${existing && existing.convProductClicks !== null && existing.convProductClicks !== undefined ? existing.convProductClicks : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.convWhatsappClicks)}</label><input type="number" id="c-convWhatsappClicks" value="${existing && existing.convWhatsappClicks !== null && existing.convWhatsappClicks !== undefined ? existing.convWhatsappClicks : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.convNewsletterSignups)}</label><input type="number" id="c-convNewsletterSignups" value="${existing && existing.convNewsletterSignups !== null && existing.convNewsletterSignups !== undefined ? existing.convNewsletterSignups : ''}"></div>
    </div>

    <div class="form-grid" id="seo-fields">
      <div class="field"><label>Tipo</label>
        <select id="c-seoEntryType">
          <option value="keyword" ${existing && existing.entryType === 'keyword' ? 'selected' : ''}>Palavra-chave</option>
          <option value="page" ${existing && existing.entryType === 'page' ? 'selected' : ''}>Página</option>
        </select>
      </div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.clicks)}</label><input type="number" id="c-seoClicks" value="${existing && existing.clicks !== null && existing.clicks !== undefined ? existing.clicks : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.impressions)}</label><input type="number" id="c-seoImpressions" value="${existing && existing.impressions !== null && existing.impressions !== undefined ? existing.impressions : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.ctr)}</label><input type="number" step="0.1" id="c-seoCtr" value="${existing && existing.ctr !== null && existing.ctr !== undefined ? existing.ctr : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.avgPosition)}</label><input type="number" step="0.1" id="c-seoAvgPosition" value="${existing && existing.avgPosition !== null && existing.avgPosition !== undefined ? existing.avgPosition : ''}"></div>
    </div>

    <div class="form-grid" id="ecommerce-fields">
      <div class="field"><label>${escapeHtml(METRIC_LABELS.itemsViewed)}</label><input type="number" id="c-itemsViewed" value="${existing && existing.itemsViewed !== null && existing.itemsViewed !== undefined ? existing.itemsViewed : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.itemsAddedToCart)}</label><input type="number" id="c-itemsAddedToCart" value="${existing && existing.itemsAddedToCart !== null && existing.itemsAddedToCart !== undefined ? existing.itemsAddedToCart : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.itemsPurchased)}</label><input type="number" id="c-itemsPurchased" value="${existing && existing.itemsPurchased !== null && existing.itemsPurchased !== undefined ? existing.itemsPurchased : ''}"></div>
      <div class="field"><label>${escapeHtml(METRIC_LABELS.itemRevenue)}</label><input type="number" step="0.01" id="c-itemRevenue" value="${existing && existing.itemRevenue !== null && existing.itemRevenue !== undefined ? existing.itemRevenue : ''}"></div>
      <div class="field full"><label>${escapeHtml(METRIC_LABELS.pageTrafficSource)} (deste produto)</label>
        <select id="c-ecommTrafficSource">
          <option value="">Selecione</option>
          <option value="Busca orgânica" ${existing && existing.pageTrafficSource === 'Busca orgânica' ? 'selected' : ''}>Busca orgânica</option>
          <option value="Redes sociais" ${existing && existing.pageTrafficSource === 'Redes sociais' ? 'selected' : ''}>Redes sociais</option>
          <option value="Anúncios" ${existing && existing.pageTrafficSource === 'Anúncios' ? 'selected' : ''}>Anúncios</option>
          <option value="Direto" ${existing && existing.pageTrafficSource === 'Direto' ? 'selected' : ''}>Direto (digitaram o link)</option>
          <option value="Outro" ${existing && existing.pageTrafficSource === 'Outro' ? 'selected' : ''}>Outro</option>
        </select>
      </div>
    </div>

    <div class="field full">
      <label>Observações</label>
      <textarea id="c-notes" rows="2">${existing ? escapeHtml(existing.notes || '') : ''}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="modal-cancel">Cancelar</button>
      <button class="btn btn-accent" id="modal-save">Salvar</button>
    </div>
  `, { preventBackdropClose: true });

  function updateFieldsVisibility() {
    const channel = document.getElementById('c-channel').value;
    const press = channel === 'assessoria';
    const isProduct = !!(channelById(channel) && channelById(channel).isProductCatalog);
    const isVideo = !!(channelById(channel) && channelById(channel).videoMetrics);
    const isInstagram = !!(channelById(channel) && channelById(channel).instagramPost);
    const isPinterest = !!(channelById(channel) && channelById(channel).pinterestPost);
    const isLinkedin = !!(channelById(channel) && channelById(channel).linkedinPost);
    const isBlog = channel === 'blog';
    const isSeo = channel === 'siteSeo';
    const isEcommerce = channel === 'ecommerce';
    const isPage = (channel === 'site' || channel === 'blog') && !isProduct;
    document.getElementById('press-fields').style.display = press ? 'grid' : 'none';
    document.getElementById('page-fields').style.display = isPage ? 'grid' : 'none';
    // No Blog, esses 3 campos não são mais usados (só continuam existindo para o Site).
    // Campo "Rolagem da página" saiu do cadastro (Site e Blog) — mantido oculto no DOM só por
    // segurança/compatibilidade, mas nunca mais exibido nem enviado.
    document.getElementById('c-scrollDepth-wrap').style.display = 'none';
    document.getElementById('c-buttonClicks-wrap').style.display = (isPage && !isBlog) ? 'block' : 'none';
    document.getElementById('c-buttonName-wrap').style.display = (isPage && !isBlog) ? 'block' : 'none';
    document.getElementById('product-fields').style.display = isProduct ? 'grid' : 'none';
    document.getElementById('video-fields').style.display = isVideo ? 'grid' : 'none';
    document.getElementById('instagram-fields').style.display = isInstagram ? 'grid' : 'none';
    document.getElementById('pinterest-fields').style.display = isPinterest ? 'grid' : 'none';
    document.getElementById('linkedin-fields').style.display = isLinkedin ? 'grid' : 'none';
    document.getElementById('blog-fields').style.display = isBlog ? 'grid' : 'none';
    document.getElementById('seo-fields').style.display = isSeo ? 'grid' : 'none';
    document.getElementById('ecommerce-fields').style.display = isEcommerce ? 'grid' : 'none';
    document.getElementById('c-postType-wrap').style.display = isLinkedin ? 'block' : 'none';
    document.getElementById('c-trafficType-wrap').style.display = (isInstagram || isLinkedin) ? 'block' : 'none';
    document.getElementById('c-trafficType-label').textContent = isLinkedin ? 'Patrocinado ou orgânico' : `${METRIC_LABELS.trafficType} *`;
    document.getElementById('generic-fields').style.display = (press || isSeo || isEcommerce) ? 'none' : 'grid';
    document.getElementById('c-format-wrap').style.display = (press || isPage || isLinkedin || isSeo || isEcommerce) ? 'none' : 'block';
    document.getElementById('c-format-label').textContent = isProduct ? 'Tipo de produto' : 'Formato';
    document.getElementById('c-title-label').textContent = press ? 'Título / manchete' : (isSeo ? 'Palavra-chave ou URL da página' : isEcommerce ? 'Nome do produto' : isPage ? 'Título / URL da página' : isProduct ? 'Título / nome do produto' : 'Título / descrição');
    document.getElementById('c-url-label').textContent = press ? 'Link da matéria' : (isVideo ? 'Link do vídeo' : (isInstagram || isPinterest) ? 'Link *' : isEcommerce ? 'URL do produto (opcional)' : 'Link (opcional)');
    document.getElementById('c-views-wrap').style.display = (isPinterest || isSeo || isEcommerce) ? 'none' : 'block';
    document.getElementById('c-views-label').textContent = isPage ? 'Visualizações da página' : isProduct ? 'Visitas do produto' : isVideo ? 'Visualizações do vídeo' : 'Visualizações';
    document.getElementById('c-engagement-label').textContent = isInstagram ? 'Interações' : 'Engajamento';
    document.getElementById('c-likes-label').textContent = (isInstagram) ? 'Curtidas e reações' : (isPinterest ? 'Reações *' : isLinkedin ? 'Reações' : 'Curtidas');
    document.getElementById('c-shares-label').textContent = isInstagram ? 'Ações (compartilhamentos)' : 'Compartilhamentos';
    document.getElementById('social-stats-fields-1').style.display = (isPage || isProduct || isVideo || isPinterest || isLinkedin || isSeo || isEcommerce) ? 'none' : 'block';
    document.getElementById('social-stats-fields-2').style.display = (isPage || isProduct || isVideo || isPinterest || isLinkedin || isSeo || isEcommerce) ? 'none' : 'block';
    document.getElementById('social-stats-fields-3').style.display = (isPage || isProduct || isVideo || isSeo || isEcommerce) ? 'none' : 'block';
    document.getElementById('social-stats-fields-4').style.display = (isPage || isProduct || isVideo || isSeo || isEcommerce) ? 'none' : 'block';
    document.getElementById('social-stats-fields-5').style.display = (isPage || isProduct || isVideo || isPinterest || isSeo || isEcommerce) ? 'none' : 'block';
    if (isPinterest) document.getElementById('social-stats-fields-4').querySelector('label').textContent = 'Comentários *';
    else document.getElementById('social-stats-fields-4').querySelector('label').textContent = 'Comentários';
  }
  updateFieldsVisibility();
  if (!existing && opts.seoEntryType) document.getElementById('c-seoEntryType').value = opts.seoEntryType;
  document.getElementById('c-channel').addEventListener('change', updateFieldsVisibility);

  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', async () => {
    const selChannel = document.getElementById('c-channel').value;
    const body = {
      brand: state.brand,
      channel: selChannel,
      title: document.getElementById('c-title').value.trim(),
      format: document.getElementById('c-format').value,
      month: document.getElementById('c-month').value,
      year: document.getElementById('c-year').value,
      url: document.getElementById('c-url').value,
      reach: document.getElementById('c-reach').value,
      engagement: document.getElementById('c-engagement').value,
      likes: document.getElementById('c-likes').value,
      comments: document.getElementById('c-comments').value,
      shares: document.getElementById('c-shares').value,
      views: document.getElementById('c-views').value,
      vehicle: document.getElementById('c-vehicle').value,
      mediaType: document.getElementById('c-mediaType').value,
      uf: ((channelById(document.getElementById('c-channel').value) || {}).isProductCatalog ? document.getElementById('c-productUf').value : document.getElementById('c-uf').value).toUpperCase(),
      value: document.getElementById('c-value').value,
      publishDate: document.getElementById('c-publishDate').value,
      downloads: document.getElementById('c-downloads').value,
      pageTrafficSource: (selChannel === 'ecommerce' ? document.getElementById('c-ecommTrafficSource').value : document.getElementById('c-pageTrafficSource').value),
      region: document.getElementById('c-region').value,
      // Não usamos mais Rolagem/Cliques em botões/Nome do botão no Blog — não envia esses campos pra esse canal.
      scrollDepth: '',
      buttonClicks: document.getElementById('c-channel').value === 'blog' ? '' : document.getElementById('c-buttonClicks').value,
      buttonName: document.getElementById('c-channel').value === 'blog' ? '' : document.getElementById('c-buttonName').value,
      avgWatchTime: document.getElementById('c-avgWatchTime').value,
      completionRate: document.getElementById('c-completionRate').value,
      videoNewFollowers: document.getElementById('c-videoNewFollowers').value,
      sponsored: document.getElementById('c-sponsored').checked,
      pageActiveUsers: document.getElementById('c-pageActiveUsers').value,
      pageEventCount: document.getElementById('c-pageEventCount').value,
      pageBounceRate: document.getElementById('c-pageBounceRate').value,
      viewers: document.getElementById('c-viewers').value,
      savedCount: (document.getElementById('c-channel').value === 'pinterest' ? document.getElementById('c-pinSavedCount').value : document.getElementById('c-savedCount').value),
      linkClicks: document.getElementById('c-linkClicks').value,
      postNewFollowers: (document.getElementById('c-channel').value === 'linkedin' ? document.getElementById('c-liPostNewFollowers').value : document.getElementById('c-postNewFollowers').value),
      postWatchTime: document.getElementById('c-postWatchTime').value,
      trafficType: document.getElementById('c-trafficType').value,
      impressions: (selChannel === 'linkedin' ? document.getElementById('c-liImpressions').value : selChannel === 'blog' ? document.getElementById('c-blogImpressions').value : selChannel === 'siteSeo' ? document.getElementById('c-seoImpressions').value : document.getElementById('c-impressions').value),
      pinClicks: document.getElementById('c-pinClicks').value,
      outboundClicks: document.getElementById('c-outboundClicks').value,
      postType: document.getElementById('c-postType').value,
      entryType: document.getElementById('c-seoEntryType').value,
      audience: document.getElementById('c-audience').value,
      clicks: (selChannel === 'blog' ? document.getElementById('c-blogClicks').value : selChannel === 'siteSeo' ? document.getElementById('c-seoClicks').value : document.getElementById('c-clicks').value),
      ctr: (selChannel === 'siteSeo' ? document.getElementById('c-seoCtr').value : document.getElementById('c-ctr').value),
      engagementRate: (selChannel === 'blog' ? document.getElementById('c-blogEngagementRate').value : document.getElementById('c-engagementRate').value),
      avgPosition: (selChannel === 'siteSeo' ? document.getElementById('c-seoAvgPosition').value : document.getElementById('c-avgPosition').value),
      convProductClicks: document.getElementById('c-convProductClicks').value,
      convWhatsappClicks: document.getElementById('c-convWhatsappClicks').value,
      convNewsletterSignups: document.getElementById('c-convNewsletterSignups').value,
      itemsViewed: document.getElementById('c-itemsViewed').value,
      itemsAddedToCart: document.getElementById('c-itemsAddedToCart').value,
      itemsPurchased: document.getElementById('c-itemsPurchased').value,
      itemRevenue: document.getElementById('c-itemRevenue').value,
      notes: document.getElementById('c-notes').value
    };
    if (!body.title) {
      document.getElementById('modal-msg').innerHTML = `<div class="error-msg">Dê um título para o conteúdo.</div>`;
      return;
    }
    const chConfig = channelById(body.channel);
    if (chConfig && chConfig.instagramPost) {
      if (!body.url) {
        document.getElementById('modal-msg').innerHTML = `<div class="error-msg">O link é obrigatório para conteúdos do Instagram.</div>`;
        return;
      }
      if (!body.trafficType) {
        document.getElementById('modal-msg').innerHTML = `<div class="error-msg">Selecione se o conteúdo é Orgânico ou Tráfego pago.</div>`;
        return;
      }
    }
    if (chConfig && chConfig.pinterestPost) {
      const required = [
        ['format', 'Formato'], ['url', 'Link'], ['impressions', 'Impressões'],
        ['pinClicks', 'Cliques no Pin'], ['savedCount', 'Pins salvos'], ['outboundClicks', 'Cliques de saída'],
        ['comments', 'Comentários'], ['likes', 'Reações']
      ];
      const missing = required.find(([field]) => body[field] === '' || body[field] === null || body[field] === undefined);
      if (missing) {
        document.getElementById('modal-msg').innerHTML = `<div class="error-msg">O campo "${missing[1]}" é obrigatório para conteúdos do Pinterest.</div>`;
        return;
      }
    }
    try {
      if (existing) await api(`/content/${existing.id}`, { method: 'PUT', body });
      else await api('/content', { method: 'POST', body });
      invalidateBrandCache(state.brand);
      closeModal();
      toast('Conteúdo salvo.');
      navigateTab(state.tab);
    } catch (e) {
      document.getElementById('modal-msg').innerHTML = `<div class="error-msg">${escapeHtml(e.message)}</div>`;
    }
  });
}

/* ==================== Anos anteriores ==================== */
async function renderYearsPage() {
  setTopbar('Anos anteriores', `${brandById(state.brand).label} · comparação entre ${state.years.join(', ')}`);
  const contentEl = document.getElementById('content');
  if (state.years.length < 2) {
    contentEl.innerHTML = `<div class="card"><div class="empty-state">Ainda só existe um ano de dados (${state.years[0]}). Assim que você lançar métricas de um novo ano, a comparação aparece aqui automaticamente.</div></div>`;
    return;
  }
  contentEl.innerHTML = `<div class="spinner-wrap">Carregando anos…</div>`;
  const all = await loadAllMetricsForBrand(state.brand);

  const rows = channelsForBrand(state.brand).map(ch => {
    const field = ch.growth[0];
    const cells = state.years.map(y => {
      const rows = all.filter(m => m.channel === ch.id && m.year === y).sort((a, b) => a.month - b.month);
      const last = rows[rows.length - 1];
      return last ? last[field] : null;
    });
    return { ch, field, cells };
  });

  contentEl.innerHTML = `
    <div class="section-head"><h3>Comparação por ano (último mês lançado de cada ano)</h3></div>
    <div class="card">
      <table>
        <thead><tr>
          <th>Canal</th>
          <th>Métrica</th>
          ${state.years.map(y => `<th class="num">${y}</th>`).join('')}
          <th class="num">Variação</th>
        </tr></thead>
        <tbody>
          ${rows.map(r => {
            const firstVal = r.cells[r.cells.length - 1];
            const lastVal = r.cells[0];
            const delta = pctChange(firstVal, lastVal);
            return `<tr>
              <td><span class="nav-dot" style="background:${r.ch.color};display:inline-block;margin-right:6px;"></span>${escapeHtml(r.ch.label)}</td>
              <td>${escapeHtml(METRIC_LABELS[r.field])}</td>
              ${r.cells.map(c => `<td class="num">${c !== null && c !== undefined ? fmtNum(c) : '—'}</td>`).join('')}
              <td class="num">${delta !== null ? `<span class="stat-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}" style="margin:0;">${fmtPct(delta)}</span>` : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="section-head"><h3>Ver o painel completo de um ano específico</h3></div>
    <div class="card" style="display:flex;gap:10px;flex-wrap:wrap;">
      ${state.years.map(y => `<button class="btn btn-ghost btn-sm" data-goto-year="${y}">Abrir ${y}</button>`).join('')}
    </div>
  `;

  contentEl.querySelectorAll('[data-goto-year]').forEach(btn => {
    btn.addEventListener('click', async () => {
      state.year = Number(btn.dataset.gotoYear);
      document.getElementById('year-select').value = state.year;
      await navigateTab('overview');
    });
  });
}

/* ==================== Histórico de alterações ==================== */
async function renderAuditPage(channelId) {
  const ch = channelId ? channelById(channelId) : null;
  setTopbar('Histórico de alterações', ch ? `${ch.label} · ${brandById(state.brand).label}` : `${brandById(state.brand).label}`);
  const logs = await api(`/audit?brand=${state.brand}${ch ? `&channel=${channelId}` : ''}`);
  const contentEl = document.getElementById('content');
  // 26a rodada: quando o historico foi aberto de dentro de uma rede
  // especifica (botao "Historico desta rede"), mostra um link pra voltar
  // pra tela daquela rede -- sem isso, so dava pra sair pelo menu lateral
  // (que fica escondido quando este painel esta embutido na Papoi).
  const backLink = ch ? `<button class="btn-ghost btn btn-sm" id="audit-back-btn" style="margin-bottom:14px;">◀ Voltar para ${escapeHtml(ch.label)}</button>` : '';
  if (!logs.length) {
    contentEl.innerHTML = `${backLink}<div class="card"><div class="empty-state">${ch ? `Nenhuma alteração registrada ainda para ${escapeHtml(ch.label)}.` : 'Nenhuma alteração registrada ainda para esta marca.'}</div></div>`;
    if (ch) document.getElementById('audit-back-btn').addEventListener('click', () => navigateTab('channel:' + ch.id));
    return;
  }
  contentEl.innerHTML = `
    ${backLink}
    <div class="section-head"><h3>Últimas alterações</h3></div>
    <div class="card">
      <table>
        <thead><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Item</th><th>Detalhes</th></tr></thead>
        <tbody>
          ${logs.slice(0, 200).map(l => `
            <tr>
              <td>${new Date(l.createdAt).toLocaleString('pt-BR')}</td>
              <td>${escapeHtml(l.username)}</td>
              <td><span class="badge ${l.action === 'criou' ? 'create' : l.action === 'removeu' ? 'remove' : 'edit'}">${escapeHtml(l.action)}</span></td>
              <td>${escapeHtml(l.entityLabel || '')}</td>
              <td style="color:var(--text-mute)">${escapeHtml(l.details || '')}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  if (ch) document.getElementById('audit-back-btn').addEventListener('click', () => navigateTab('channel:' + ch.id));
}

/* ==================== Usuários ==================== */
async function renderUsersPage() {
  setTopbar('Usuários', 'Gestão de acesso ao painel');
  if (state.user.role !== 'admin') {
    document.getElementById('content').innerHTML = `<div class="card"><div class="empty-state">Apenas administradores podem gerenciar usuários.</div></div>`;
    return;
  }
  const users = await api('/auth/users');
  const contentEl = document.getElementById('content');
  contentEl.innerHTML = `
    <div class="section-head">
      <h3>Contas com acesso ao painel</h3>
      <button class="btn btn-accent btn-sm" id="add-user-btn">+ Novo usuário</button>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Usuário</th><th>Papel</th><th>Criado em</th><th></th></tr></thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td>${escapeHtml(u.username)}</td>
              <td><span class="tag-pill">${u.role === 'admin' ? 'Administrador' : 'Editor'}</span></td>
              <td>${new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
              <td class="table-actions">
                ${u.id !== state.user.id ? `<button class="icon-btn danger" data-user-del="${u.id}">Remover</button>` : '<span style="color:var(--text-mute);font-size:12px;">você</span>'}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p style="color:var(--text-mute);font-size:12.5px;margin-top:10px;">Editores podem lançar métricas e conteúdos de qualquer marca. Apenas administradores gerenciam usuários.</p>

    <div class="section-head"><h3>Manutenção</h3></div>
    <div class="card">
      <p style="color:var(--text-mute);font-size:13.5px;margin-top:0;">
        Um bug já corrigido permitia, em alguns casos, criar dois lançamentos para o mesmo mês em vez de um só
        (por exemplo, um mês aparecendo duas vezes no gráfico de evolução). Esta ferramenta encontra esses casos
        em todas as marcas e canais, junta os campos preenchidos em um único lançamento e remove a duplicata —
        sem perder nenhum dado. Pode rodar quantas vezes quiser; se não houver duplicidade, não faz nada.
      </p>
      <button class="btn btn-accent btn-sm" id="dedupe-btn">Verificar e corrigir duplicidades</button>
      <div id="dedupe-result" style="margin-top:12px;"></div>
    </div>
  `;

  document.getElementById('dedupe-btn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Verificando...';
    try {
      const result = await api('/metrics/dedupe', { method: 'POST' });
      const resultEl = document.getElementById('dedupe-result');
      if (result.mergedCount === 0) {
        resultEl.innerHTML = `<div class="hint-msg" style="margin:0;">Nenhuma duplicidade encontrada. Tudo certo!</div>`;
      } else {
        resultEl.innerHTML = `<div class="hint-msg" style="margin:0;">${result.mergedCount} mês(es) corrigido(s), ${result.removedCount} registro(s) duplicado(s) removido(s):<br>${result.details.map(d => escapeHtml(d)).join('<br>')}</div>`;
        Object.keys(state.metricsCache).forEach(k => delete state.metricsCache[k]);
        toast('Duplicidades corrigidas. Os gráficos já devem refletir os dados certos.');
      }
    } catch (err) {
      toast(err.message, true);
    }
    btn.disabled = false;
    btn.textContent = 'Verificar e corrigir duplicidades';
  });

  document.getElementById('add-user-btn').addEventListener('click', () => {
    openModal(`
      <h3>Novo usuário</h3>
      <p class="sub">Ele poderá acessar as duas marcas para lançar dados.</p>
      <div id="modal-msg"></div>
      <div class="field"><label>Usuário</label><input type="text" id="u-username"></div>
      <div class="field"><label>Senha (mínimo 6 caracteres)</label><input type="password" id="u-password"></div>
      <div class="field"><label>Papel</label>
        <select id="u-role"><option value="editor">Editor</option><option value="admin">Administrador</option></select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn btn-accent" id="modal-save">Criar usuário</button>
      </div>
    `);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-save').addEventListener('click', async () => {
      try {
        await api('/auth/users', { method: 'POST', body: {
          username: document.getElementById('u-username').value.trim(),
          password: document.getElementById('u-password').value,
          role: document.getElementById('u-role').value
        }});
        closeModal();
        toast('Usuário criado.');
        navigateTab('users');
      } catch (e) {
        document.getElementById('modal-msg').innerHTML = `<div class="error-msg">${escapeHtml(e.message)}</div>`;
      }
    });
  });

  contentEl.querySelectorAll('[data-user-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remover o acesso deste usuário?')) return;
      try {
        await api(`/auth/users/${btn.dataset.userDel}`, { method: 'DELETE' });
        toast('Usuário removido.');
        navigateTab('users');
      } catch (e) { toast(e.message, true); }
    });
  });
}

/* ==================== Configurações / link público ==================== */
async function renderSettingsPage() {
  setTopbar('Link público', 'Compartilhe os resultados sem dar acesso de edição');
  const settings = await loadSettings(state.brand);
  const contentEl = document.getElementById('content');
  const publicUrl = `${window.location.origin}/public?brand=${state.brand}`;
  const isAdmin = state.user.role === 'admin';

  contentEl.innerHTML = `
    <div class="section-head"><h3>Link público (somente leitura)</h3></div>
    <div class="card">
      <p style="color:var(--text-mute);font-size:13.5px;margin-top:0;">Qualquer pessoa com este link vê os gráficos e métricas de <b>${escapeHtml(brandById(state.brand).label)}</b>, sem poder editar nada e sem precisar de login.</p>
      <div class="copy-row">
        <input type="text" id="public-link-input" readonly value="${publicUrl}">
        <button class="btn btn-accent" id="copy-link-btn">Copiar link</button>
      </div>
    </div>

    <div class="section-head"><h3>Título exibido no topo do painel</h3></div>
    <div class="card">
      <div class="field">
        <label>Texto (aparece acima do nome da marca)</label>
        <input type="text" id="tagline-input" value="${escapeHtml(settings.tagline || '')}" placeholder="Ex.: GHELPLUS · RESULTADOS DIGITAIS · 2026">
      </div>
      <button class="btn btn-accent btn-sm" id="save-tagline-btn">Salvar</button>
    </div>

    ${isAdmin ? `
    <div class="section-head"><h3>Acessos ao link público — ${escapeHtml(brandById(state.brand).label)}</h3></div>
    <div class="card" id="public-visits-wrap"><div class="spinner-wrap">Carregando…</div></div>
    ` : ''}
  `;

  document.getElementById('copy-link-btn').addEventListener('click', () => {
    const input = document.getElementById('public-link-input');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => toast('Link copiado!')).catch(() => document.execCommand('copy'));
  });

  document.getElementById('save-tagline-btn').addEventListener('click', async () => {
    try {
      await api(`/settings/${state.brand}`, { method: 'PUT', body: { tagline: document.getElementById('tagline-input').value } });
      delete state.settingsCache[state.brand];
      toast('Salvo.');
    } catch (e) { toast(e.message, true); }
  });

  // Quantas vezes o link público foi visto (com dia e hora de cada acesso) — só para admin.
  if (isAdmin) {
    try {
      const data = await api(`/public-visits?brand=${state.brand}`);
      const wrap = document.getElementById('public-visits-wrap');
      if (wrap) {
        wrap.innerHTML = `
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:12px;">
            <div class="stat-value" style="font-size:26px;">${fmtNum(data.total)}</div>
            <div style="color:var(--text-mute);font-size:13px;">acesso(s) registrado(s)</div>
          </div>
          ${data.items.length ? `
          <table>
            <thead><tr><th>Dia</th><th>Hora</th></tr></thead>
            <tbody>
              ${data.items.map(v => {
                const d = new Date(v.at);
                return `<tr><td>${d.toLocaleDateString('pt-BR')}</td><td>${d.toLocaleTimeString('pt-BR')}</td></tr>`;
              }).join('')}
            </tbody>
          </table>` : `<div class="empty-state">Nenhum acesso registrado ainda.</div>`}
        `;
      }
    } catch (e) {
      const wrap = document.getElementById('public-visits-wrap');
      if (wrap) wrap.innerHTML = `<div class="error-msg">${escapeHtml(e.message)}</div>`;
    }
  }
}

/* ==================== Start ==================== */
boot();
