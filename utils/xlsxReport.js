// Gera o "relatório completo (Excel)" de um canal: indicadores, lançamentos mensais e
// conteúdos em destaque, com gráficos NATIVOS do Excel (não imagens estáticas) — os mesmos
// dados que aparecem no dashboard e no PDF, agora também abertos/editáveis no Excel.
//
// @office-kit/xlsx é um módulo ESM (import/export) e este projeto usa CommonJS (require) nos
// demais arquivos — por isso os submódulos são carregados com import() dinâmico e cacheados.
// Exige Node 22+ (ver "engines" no package.json).
'use strict';

const cfg = require('../public/config.js');

let _mods = null;
async function loadXlsx() {
  if (_mods) return _mods;
  const [workbook, worksheet, chart, drawing, io, node] = await Promise.all([
    import('@office-kit/xlsx/workbook'),
    import('@office-kit/xlsx/worksheet'),
    import('@office-kit/xlsx/chart'),
    import('@office-kit/xlsx/drawing'),
    import('@office-kit/xlsx/io'),
    import('@office-kit/xlsx/node')
  ]);
  _mods = { workbook, worksheet, chart, drawing, io, node };
  return _mods;
}

// Preenchimento sólido de uma cor hex — usado para colorir linhas/marcadores/fatias dos
// gráficos nativos com as mesmas cores do canal no dashboard.
function solidFill(mods, hex) {
  const { drawing } = mods;
  return drawing.makeSolidFill(drawing.makeColor(drawing.makeSrgbColor(hex)));
}
function lineOf(mods, hex, widthEmu) {
  return { fill: solidFill(mods, hex), w: widthEmu };
}

// Paleta usada nos gráficos — mesma lógica do dashboard: cor do canal na 1ª série, cinza nas seguintes.
const SECONDARY_COLOR = '9A9A9A';

function colHex(c) {
  return String(c || '#0f9d78').replace('#', '').toUpperCase();
}

function colLetter(n) {
  // 1 -> A, 2 -> B, ... 27 -> AA
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function cellValueForKind(kind, raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (kind === 'bool') return raw ? 'Sim' : 'Não';
  if (kind === 'num' || kind === 'percent' || kind === 'currency') {
    const n = Number(raw);
    return isNaN(n) ? null : n;
  }
  return String(raw);
}

// Constrói um gráfico de linha nativo a partir de um pequeno bloco de dados já escrito na
// planilha (categorias em `catCol`, uma coluna por série a partir de `firstSeriesCol`).
function buildLineChart(mods, opts) {
  const { chart } = mods;
  const { sheetName, title, catRow, catCol, firstDataRow, lastDataRow, series, legend, distinctColors } = opts;
  const catRef = `'${sheetName}'!$${colLetter(catCol)}$${firstDataRow}:$${colLetter(catCol)}$${lastDataRow}`;
  const headerRow = firstDataRow - 1;
  const axIdA = 100000000 + Math.floor(Math.random() * 900000);
  const axIdB = axIdA + 1;
  const chartSeries = series.map((s, i) => {
    const base = chart.makeBarSeries({
      idx: i,
      order: i,
      val: { ref: `'${sheetName}'!$${colLetter(s.col)}$${firstDataRow}:$${colLetter(s.col)}$${lastDataRow}`, cache: s.values },
      cat: { ref: catRef, cacheKind: 'str', cache: opts.categories }
    });
    // Quando `distinctColors` está ligado (ex.: gráfico com uma série por canal), cada série mantém
    // a própria cor; caso contrário (várias métricas do mesmo canal), só a 1ª fica colorida e as
    // demais ficam em cinza — comportamento original, mantido para não alterar os relatórios por canal.
    const hex = colHex(distinctColors || i === 0 ? s.color : SECONDARY_COLOR);
    return {
      ...base,
      // Nome da série via referência à célula do cabeçalho (não "literal") — testado e é o único
      // modo que o Excel/LibreOffice realmente exibe no lugar de "Column K/L" na legenda.
      tx: { kind: 'ref', ref: `'${sheetName}'!$${colLetter(s.col)}$${headerRow}` },
      smooth: false,
      marker: { symbol: 'circle', size: 5, spPr: mods.drawing.makeShapeProperties({ fill: solidFill(mods, hex), ln: lineOf(mods, hex) }) },
      spPr: mods.drawing.makeShapeProperties({ ln: lineOf(mods, hex, 19050) })
    };
  });
  const lineChart = chart.makeLineChart({ grouping: 'standard', series: chartSeries, axIds: [axIdA, axIdB] });
  return chart.makeChartSpace({
    title,
    plotArea: {
      chart: lineChart,
      catAx: { axId: axIdA, crossAx: axIdB, position: 'b' },
      valAx: { axId: axIdB, crossAx: axIdA, position: 'l' }
    },
    legend: legend === false ? undefined : { position: 'b' }
  });
}

function buildBarChart(mods, opts) {
  const { chart } = mods;
  const { sheetName, title, catCol, firstDataRow, lastDataRow, series } = opts;
  const catRef = `'${sheetName}'!$${colLetter(catCol)}$${firstDataRow}:$${colLetter(catCol)}$${lastDataRow}`;
  const headerRow = firstDataRow - 1;
  const axIdA = 200000000 + Math.floor(Math.random() * 900000);
  const axIdB = axIdA + 1;
  const chartSeries = series.map((s, i) => {
    const hex = colHex(i === 0 ? s.color : SECONDARY_COLOR);
    const base = chart.makeBarSeries({
      idx: i,
      order: i,
      val: { ref: `'${sheetName}'!$${colLetter(s.col)}$${firstDataRow}:$${colLetter(s.col)}$${lastDataRow}`, cache: s.values },
      cat: { ref: catRef, cacheKind: 'str', cache: opts.categories }
    });
    return {
      ...base,
      tx: { kind: 'ref', ref: `'${sheetName}'!$${colLetter(s.col)}$${headerRow}` },
      spPr: mods.drawing.makeShapeProperties({ fill: solidFill(mods, hex) })
    };
  });
  const barChart = chart.makeBarChart({ barDir: 'col', grouping: 'clustered', series: chartSeries, axIds: [axIdA, axIdB] });
  return chart.makeChartSpace({
    title,
    plotArea: {
      chart: barChart,
      catAx: { axId: axIdA, crossAx: axIdB, position: 'b' },
      valAx: { axId: axIdB, crossAx: axIdA, position: 'l' }
    },
    legend: { position: 'b' }
  });
}

function buildDoughnutChart(mods, opts) {
  const { chart } = mods;
  const { sheetName, title, catCol, firstDataRow, lastDataRow, valCol, values, categories, baseColor } = opts;
  const catRef = `'${sheetName}'!$${colLetter(catCol)}$${firstDataRow}:$${colLetter(catCol)}$${lastDataRow}`;
  const valRef = `'${sheetName}'!$${colLetter(valCol)}$${firstDataRow}:$${colLetter(valCol)}$${lastDataRow}`;
  const palette = [baseColor, SECONDARY_COLOR, '1E8A6E', 'B5772E'].map(colHex);
  const ser = chart.makeBarSeries({ idx: 0, order: 0, val: { ref: valRef, cache: values }, cat: { ref: catRef, cacheKind: 'str', cache: categories } });
  ser.dPt = values.map((v, i) => ({ idx: i, spPr: mods.drawing.makeShapeProperties({ fill: solidFill(mods, palette[i % palette.length]) }) }));
  const doughnutChart = chart.makeDoughnutChart({ series: [ser], varyColors: true, holeSize: 55 });
  return chart.makeChartSpace({ title, plotArea: { chart: doughnutChart }, legend: { position: 'b' } });
}

// Escreve o cabeçalho + linhas de uma tabela simples a partir da célula `startRef` ("A1").
function writeTable(mods, ws, startRow, startCol, headers, rows) {
  const { worksheet } = mods;
  const startRef = `${colLetter(startCol)}${startRow}`;
  worksheet.writeRange(ws, startRef, [headers, ...rows]);
  return { firstDataRow: startRow + 1, lastDataRow: startRow + rows.length, endCol: startCol + headers.length - 1 };
}

async function buildChannelExcelReport({ ch, metrics, content, brandLabel, year }) {
  const mods = await loadXlsx();
  const { workbook, worksheet, drawing, node, io } = mods;
  const wb = workbook.createWorkbook();

  const sortedMetrics = metrics.slice().sort((a, b) => a.month - b.month);
  const last = sortedMetrics[sortedMetrics.length - 1];
  const first = sortedMetrics[0];

  // --- Sheet 1: Indicadores ---
  const wsInd = workbook.addWorksheet(wb, 'Indicadores');
  const indHeaders = ['Indicador', `Último mês (${year})`, 'Variação no ano'];
  const indRows = ch.metrics.map(f => {
    const lastVal = last ? cfg.chFieldValue(ch, last, f) : null;
    const firstVal = first ? cfg.chFieldValue(ch, first, f) : null;
    const delta = ch.growth.includes(f) ? cfg.pctChange(firstVal, lastVal) : null;
    return [cfg.METRIC_LABELS[f] || f, lastVal === null || lastVal === undefined ? null : Number(lastVal), delta === null ? null : Number(delta.toFixed(1))];
  });
  writeTable(mods, wsInd, 1, 1, indHeaders, indRows);

  // --- Sheet 2: Lançamentos mensais (+ gráfico nativo de evolução) ---
  const wsMon = workbook.addWorksheet(wb, 'Lançamentos mensais');
  const tableFields = ch.tableMetrics || ch.metrics;
  const monHeaders = ['Mês', ...tableFields.map(f => cfg.METRIC_LABELS[f] || f)];
  const monRows = sortedMetrics.map(m => [
    cfg.MONTH_NAMES_FULL[m.month - 1],
    ...tableFields.map(f => { const v = cfg.chFieldValue(ch, m, f); return v === null || v === undefined ? null : Number(v); })
  ]);
  const monTable = writeTable(mods, wsMon, 1, 1, monHeaders, monRows);

  if (sortedMetrics.length) {
    const evoFields = ch.evolutionFields || ch.growth;
    // Escreve um pequeno bloco de dados dedicado ao gráfico (categorias + série calculada via
    // chFieldValue) logo à direita da tabela, para não depender da ordem das colunas da tabela.
    const chartDataStartCol = monTable.endCol + 2;
    const chartHeaders = ['Mês', ...evoFields.map(f => cfg.METRIC_LABELS[f] || f)];
    const chartRows = sortedMetrics.map(m => [cfg.MONTH_NAMES_FULL[m.month - 1], ...evoFields.map(f => { const v = cfg.chFieldValue(ch, m, f); return v === null || v === undefined ? null : Number(v); })]);
    const chartTable = writeTable(mods, wsMon, 1, chartDataStartCol, chartHeaders, chartRows);
    const categories = sortedMetrics.map(m => cfg.MONTH_NAMES_FULL[m.month - 1]);
    const series = evoFields.map((f, i) => ({
      col: chartDataStartCol + 1 + i,
      label: cfg.METRIC_LABELS[f] || f,
      color: ch.color,
      values: sortedMetrics.map(m => { const v = cfg.chFieldValue(ch, m, f); return v === null || v === undefined ? 0 : Number(v); })
    }));
    const space = buildLineChart(mods, {
      sheetName: 'Lançamentos mensais',
      title: ch.evolutionTitle || 'Evolução no ano',
      catCol: chartDataStartCol,
      firstDataRow: chartTable.firstDataRow,
      lastDataRow: chartTable.lastDataRow,
      categories,
      series
    });
    drawing.addChartAt(wsMon, `A${monTable.lastDataRow + 3}`, { space }, { widthPx: 620, heightPx: 320 });

    // Recorrentes x novos (barras) — quando o canal tem esse indicador, igual ao dashboard.
    if (ch.viewersChart) {
      const [fieldA, fieldB] = ch.viewersChart;
      // As colunas aqui têm que bater exatamente com onde `writeTable` escreve este bloco logo
      // abaixo (mesma coluna inicial `chartDataStartCol` do gráfico de evolução, só que em outras
      // linhas) — por isso são chartDataStartCol+1/+2, e não deslocadas por evoFields.length.
      const vSeries = [
        { col: chartDataStartCol + 1, label: cfg.METRIC_LABELS[fieldA] || fieldA, color: ch.color, values: sortedMetrics.map(m => Number(m[fieldA] || 0)) },
        { col: chartDataStartCol + 2, label: cfg.METRIC_LABELS[fieldB] || fieldB, color: ch.color, values: sortedMetrics.map(m => Number(m[fieldB] || 0)) }
      ];
      const vHeaders = ['Mês', vSeries[0].label, vSeries[1].label];
      const vRows = sortedMetrics.map((m, i) => [cfg.MONTH_NAMES_FULL[m.month - 1], vSeries[0].values[i], vSeries[1].values[i]]);
      writeTable(mods, wsMon, chartTable.lastDataRow + 3, chartDataStartCol, vHeaders, vRows);
      const vSpace = buildBarChart(mods, {
        sheetName: 'Lançamentos mensais',
        title: ch.viewersChartTitle || 'Recorrentes x novos',
        catCol: chartDataStartCol,
        firstDataRow: chartTable.lastDataRow + 4,
        lastDataRow: chartTable.lastDataRow + 3 + sortedMetrics.length,
        categories,
        series: vSeries
      });
      drawing.addChartAt(wsMon, `A${monTable.lastDataRow + 21}`, { space: vSpace }, { widthPx: 620, heightPx: 320 });
    }

    // Interações por tipo de mídia (rosca) — Instagram/Facebook, só com o último mês (igual ao dashboard).
    if (ch.mediaTypeChart && last) {
      const mtFields = ch.mediaTypeChart.fields;
      const mtLabels = ch.mediaTypeChart.labels;
      const mtValues = mtFields.map(f => Number(last[f] || 0));
      writeTable(mods, wsMon, chartTable.lastDataRow + 26, chartDataStartCol, ['Tipo', 'Interações'], mtLabels.map((l, i) => [l, mtValues[i]]));
      const dSpace = buildDoughnutChart(mods, {
        sheetName: 'Lançamentos mensais',
        title: ch.mediaTypeChart.title,
        catCol: chartDataStartCol,
        valCol: chartDataStartCol + 1,
        firstDataRow: chartTable.lastDataRow + 27,
        lastDataRow: chartTable.lastDataRow + 26 + mtLabels.length,
        categories: mtLabels,
        values: mtValues,
        baseColor: ch.color
      });
      drawing.addChartAt(wsMon, `A${monTable.lastDataRow + 39}`, { space: dSpace }, { widthPx: 480, heightPx: 320 });
    }
  }

  // --- Sheet(s) de conteúdo ---
  if (ch.seoAnalysis) {
    const cols = cfg.chContentColumns(ch);
    const toRow = c => cols.map(col => cellValueForKind(col.kind, c[col.field]));
    const keywords = content.filter(c => c.entryType !== 'page').slice().sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    const pages = content.filter(c => c.entryType === 'page').slice().sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    const wsKw = workbook.addWorksheet(wb, 'Ranking de palavras-chave');
    writeTable(mods, wsKw, 1, 1, cols.map(c => c.label), keywords.map(toRow));
    const wsPg = workbook.addWorksheet(wb, 'Ranking de páginas');
    writeTable(mods, wsPg, 1, 1, cols.map(c => c.label), pages.map(toRow));
  } else {
    const cols = cfg.chContentColumns(ch);
    const sortField = ch.topPagesChart ? 'views' : ch.ecommerceCatalog ? 'itemRevenue' : 'reach';
    const sortedContent = ch.pressReport
      ? content.slice().sort((a, b) => {
          const dateA = a.publishDate || `${a.year}-${String(a.month || 1).padStart(2, '0')}-01`;
          const dateB = b.publishDate || `${b.year}-${String(b.month || 1).padStart(2, '0')}-01`;
          return dateA.localeCompare(dateB);
        })
      : content.slice().sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));
    const sheetTitle = (ch.pressReport ? 'Matérias veiculadas' : (ch.topItemsLabel || 'Conteúdos')).slice(0, 31);
    const wsContent = workbook.addWorksheet(wb, sheetTitle);
    const rows = sortedContent.map(c => cols.map(col => cellValueForKind(col.kind, c[col.field])));
    writeTable(mods, wsContent, 1, 1, cols.map(c => c.label), rows);
  }

  const buf = await node.workbookToBuffer(wb);
  return buf;
}

// Monta uma aba "Evolução de X" (uma linha por mês, uma coluna por canal) + gráfico de linha
// nativo com uma série por canal, cada uma com sua própria cor — usada tanto para a evolução de
// seguidores quanto para a evolução de alcance da Visão geral (mesma estrutura, campo diferente).
function buildEvolutionSheet(mods, workbook, drawing, wb, { sheetName, title, channels, metrics, field }) {
  if (!channels.length) return;
  const ws = workbook.addWorksheet(wb, sheetName);
  const categories = cfg.MONTH_NAMES_FULL;
  const headers = ['Mês', ...channels.map(ch => ch.label)];
  const rows = categories.map((label, i) => {
    const month = i + 1;
    return [label, ...channels.map(ch => {
      const row = metrics.find(m => m.channel === ch.id && m.month === month);
      return row && row[field] !== null && row[field] !== undefined ? Number(row[field]) : null;
    })];
  });
  const table = writeTable(mods, ws, 1, 1, headers, rows);
  const series = channels.map((ch, i) => ({
    col: 2 + i,
    label: ch.label,
    color: ch.color,
    values: rows.map(r => r[1 + i] === null ? 0 : r[1 + i])
  }));
  const space = buildLineChart(mods, {
    sheetName,
    title,
    catCol: 1,
    firstDataRow: table.firstDataRow,
    lastDataRow: table.lastDataRow,
    categories,
    series,
    distinctColors: true
  });
  drawing.addChartAt(ws, `A${table.lastDataRow + 3}`, { space }, { widthPx: 620, heightPx: 320 });
}

// Gera o relatório "Visão geral" em Excel: panorama por canal, evolução de seguidores e de
// alcance (gráficos nativos) e os conteúdos com melhor desempenho — os mesmos dados exibidos na
// página de Visão geral.
async function buildOverviewExcelReport({ brandLabel, year, channels, metrics, content }) {
  const mods = await loadXlsx();
  const { workbook, drawing, node } = mods;
  const wb = workbook.createWorkbook();

  // --- Sheet 1: Panorama por canal ---
  const wsPan = workbook.addWorksheet(wb, 'Panorama');
  const panHeaders = ['Canal', 'Indicador', `Último mês (${year})`];
  const panRows = channels.map(ch => {
    const rows = metrics.filter(m => m.channel === ch.id).sort((a, b) => a.month - b.month);
    const last = rows[rows.length - 1];
    const field = ch.growth[0];
    const val = last ? cfg.chFieldValue(ch, last, field) : null;
    return [ch.label, cfg.METRIC_LABELS[field] || field, val === null || val === undefined ? null : Number(val)];
  });
  writeTable(mods, wsPan, 1, 1, panHeaders, panRows);

  // --- Sheet 2: Evolução de seguidores (gráfico nativo) ---
  const withFollowers = channels.filter(c => c.metrics.includes('followers'));
  buildEvolutionSheet(mods, workbook, drawing, wb, {
    sheetName: 'Evolução de seguidores', title: 'Evolução de seguidores',
    channels: withFollowers, metrics, field: 'followers'
  });

  // --- Sheet 3: Evolução de alcance (gráfico nativo) ---
  const social = channels.filter(c => c.group === 'Redes sociais' && c.metrics.includes('reach'));
  buildEvolutionSheet(mods, workbook, drawing, wb, {
    sheetName: 'Evolução de alcance', title: 'Evolução de alcance',
    channels: social, metrics, field: 'reach'
  });

  // --- Sheet 4: Conteúdos com melhor desempenho ---
  const wsContent = workbook.addWorksheet(wb, 'Conteúdos em destaque');
  const contentHeaders = ['Título', 'Canal', 'Alcance', 'Engajamento', 'Link'];
  const contentRows = content.map(c => [
    c.title || '',
    (cfg.channelById(c.channel) || {}).label || c.channel,
    c.reach === null || c.reach === undefined ? null : Number(c.reach),
    c.engagement === null || c.engagement === undefined ? null : Number(c.engagement),
    c.url || ''
  ]);
  writeTable(mods, wsContent, 1, 1, contentHeaders, contentRows);

  const buf = await node.workbookToBuffer(wb);
  return buf;
}

// Gera o relatório "Conteúdos em destaque" (todos os canais) em Excel — mesma tabela genérica
// (Título/Canal/Período/Principal/Secundária/Link) exibida no PDF dessa página.
async function buildContentExcelReport({ items }) {
  const mods = await loadXlsx();
  const { workbook, node } = mods;
  const wb = workbook.createWorkbook();
  const ws = workbook.addWorksheet(wb, 'Conteúdos');

  const headers = ['Título', 'Canal', 'Período', 'Principal', 'Secundária', 'Link'];
  const rows = items.map(c => {
    const ch = cfg.channelById(c.channel);
    const isPress = c.channel === 'assessoria';
    const isVideo = !!(ch && ch.videoMetrics);
    const isBlog = c.channel === 'blog';
    const isSeo = c.channel === 'siteSeo';
    const isEcommerce = c.channel === 'ecommerce';
    const isPage = (c.channel === 'site' || c.channel === 'blog') && !isVideo;
    const stat1 = isPress ? (c.value === null || c.value === undefined ? null : Number(c.value)) : isSeo ? (c.clicks === null || c.clicks === undefined ? null : Number(c.clicks)) : isEcommerce ? (c.itemsPurchased === null || c.itemsPurchased === undefined ? null : Number(c.itemsPurchased)) : (isPage || isVideo) ? (c.views === null || c.views === undefined ? null : Number(c.views)) : (c.reach === null || c.reach === undefined ? null : Number(c.reach));
    const stat2 = isPress ? (c.mediaType || null) : isVideo ? (c.videoNewFollowers === null || c.videoNewFollowers === undefined ? null : Number(c.videoNewFollowers)) : isBlog ? (Number(cfg.contentConversions(c)) || null) : isSeo ? (c.impressions === null || c.impressions === undefined ? null : Number(c.impressions)) : isEcommerce ? (c.itemRevenue === null || c.itemRevenue === undefined ? null : Number(c.itemRevenue)) : isPage ? (c.buttonClicks === null || c.buttonClicks === undefined ? null : Number(c.buttonClicks)) : (c.engagement === null || c.engagement === undefined ? null : Number(c.engagement));
    const periodo = c.month ? `${cfg.MONTH_NAMES[c.month - 1]}/${c.year}` : '';
    return [c.title || '', ch ? ch.label : c.channel, periodo, stat1, stat2, c.url || ''];
  });
  writeTable(mods, ws, 1, 1, headers, rows);

  const buf = await node.workbookToBuffer(wb);
  return buf;
}

module.exports = { buildChannelExcelReport, buildOverviewExcelReport, buildContentExcelReport };
