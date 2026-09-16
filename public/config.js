const BRANDS = [
  { id: 'ghelplus', label: 'GhelPlus', accent: '#0f9d78' },
  { id: 'debacco', label: 'De Bacco', accent: '#7a2048' }
];

// Colunas do "conteúdo em destaque" de cada canal (posts/páginas/matérias/produtos cadastrados
// individualmente) — usadas para gerar o modelo de planilha de cadastro em massa, a importação
// dessa planilha e o relatório completo em Excel. Cada entrada é { field, label, kind, required }.
// kind: 'text' | 'num' | 'percent' | 'currency' | 'link' | 'bool'. Mês/Ano entram à parte (como
// no modelo de lançamento mensal), não precisam estar aqui.
const DEFAULT_CONTENT_COLUMNS = [
  { field: 'title', label: 'Título', kind: 'text', required: true },
  { field: 'format', label: 'Formato', kind: 'text' },
  { field: 'reach', label: 'Alcance', kind: 'num' },
  { field: 'engagement', label: 'Engajamento', kind: 'num' },
  { field: 'url', label: 'Link', kind: 'link' }
];

const CHANNELS = [
  { id: 'instagram', label: 'Instagram', group: 'Redes sociais', color: '#c1327a',
    metrics: ['followers', 'views', 'reach', 'contentInteractions', 'followersGained', 'followersLost', 'posts'],
    tableMetrics: ['followers', 'followersGained', 'followersLost', 'posts', 'views', 'reach', 'contentInteractions'],
    formExtraFields: ['viewsOrganic', 'viewsAds', 'interactionsReels', 'interactionsStatic'],
    growth: ['views', 'reach'],
    tableGrowthIndicators: true,
    evolutionFields: ['followersGained', 'contentInteractions'],
    evolutionTitle: 'Aumento de seguidores x engajamento (mensal)',
    viewsBreakdownChart: { fields: ['views', 'viewsOrganic', 'viewsAds'], title: 'Análise de visualizações' },
    engagementCompareChart: { field: 'contentInteractions', title: 'Interações de postagem — mês anterior x atual' },
    mediaTypeChart: { fields: ['interactionsReels', 'interactionsStatic'], labels: ['Reels', 'Estático'], title: 'Interações por tipo de mídia' },
    contentColumns: [
      { field: 'title', label: 'Título', kind: 'text', required: true },
      { field: 'url', label: 'Link', kind: 'link', required: true },
      { field: 'format', label: 'Formato', kind: 'text' },
      { field: 'trafficType', label: 'Orgânico ou Tráfego', kind: 'text', required: true },
      { field: 'reach', label: 'Alcance', kind: 'num' },
      { field: 'views', label: 'Visualizações', kind: 'num' },
      { field: 'engagement', label: 'Interações', kind: 'num' },
      { field: 'likes', label: 'Curtidas e reações', kind: 'num' },
      { field: 'comments', label: 'Comentários', kind: 'num' },
      { field: 'shares', label: 'Ações (compartilhamentos)', kind: 'num' },
      { field: 'savedCount', label: 'Salvos', kind: 'num' },
      { field: 'postNewFollowers', label: 'Seguidores vindo da publicação', kind: 'num' }
    ],
    instagramPost: true },
  { id: 'facebook', label: 'Facebook', group: 'Redes sociais', color: '#1877f2',
    metrics: ['views', 'contentInteractions', 'followers', 'followersLost', 'followersGained', 'posts', 'viewers'],
    tableMetrics: ['followers', 'followersGained', 'followersLost', 'posts', 'views', 'reach', 'contentInteractions', 'viewers'],
    formExtraFields: ['viewsOrganic', 'viewsAds', 'interactionsReels', 'interactionsStatic', 'interactionsCarousel'],
    growth: ['views', 'reach'],
    tableGrowthIndicators: true,
    evolutionFields: ['followers', 'contentInteractions'],
    evolutionTitle: 'Seguidores x interações (mensal)',
    viewsBreakdownChart: { fields: ['views', 'viewsOrganic', 'viewsAds'], title: 'Análise de visualizações' },
    engagementCompareChart: { field: 'contentInteractions', title: 'Interações de postagens por período' },
    mediaTypeChart: { fields: ['interactionsReels', 'interactionsStatic', 'interactionsCarousel'], labels: ['Reels', 'Estático', 'Carrossel'], title: 'Interações da publicação por tipo de mídia' },
    contentColumns: [
      { field: 'title', label: 'Título', kind: 'text', required: true },
      { field: 'url', label: 'Link', kind: 'link', required: true },
      { field: 'format', label: 'Formato', kind: 'text' },
      { field: 'trafficType', label: 'Orgânico ou Tráfego', kind: 'text', required: true },
      { field: 'reach', label: 'Alcance', kind: 'num' },
      { field: 'views', label: 'Visualizações', kind: 'num' },
      { field: 'engagement', label: 'Interações', kind: 'num' },
      { field: 'likes', label: 'Curtidas e reações', kind: 'num' },
      { field: 'comments', label: 'Comentários', kind: 'num' },
      { field: 'shares', label: 'Ações (compartilhamentos)', kind: 'num' },
      { field: 'savedCount', label: 'Salvos', kind: 'num' },
      { field: 'postNewFollowers', label: 'Seguidores vindo da publicação', kind: 'num' }
    ],
    instagramPost: true },
  { id: 'tiktok', label: 'TikTok', group: 'Redes sociais', color: '#111318',
    metrics: ['followers', 'totalViewers', 'newViewers', 'followersGained', 'followersLost', 'likesTotal', 'sharesTotal'],
    tableMetrics: ['followers', 'followersGained', 'followersLost', 'totalViewers', 'newViewers', 'likesTotal', 'sharesTotal'],
    growth: ['totalViewers', 'newViewers'],
    contentColumns: [
      { field: 'title', label: 'Título', kind: 'text', required: true },
      { field: 'url', label: 'Link', kind: 'link' },
      { field: 'format', label: 'Formato', kind: 'text' },
      { field: 'views', label: 'Visualizações', kind: 'num' },
      { field: 'avgWatchTime', label: 'Tempo médio de visualização (segundos)', kind: 'num' },
      { field: 'completionRate', label: 'Assistiu o vídeo completo (%)', kind: 'percent' },
      { field: 'videoNewFollowers', label: 'Novos seguidores (a partir deste vídeo)', kind: 'num' },
      { field: 'sponsored', label: 'Patrocinado (conteúdo pago)', kind: 'bool' }
    ],
    videoMetrics: true },
  { id: 'youtube', label: 'YouTube', group: 'Redes sociais', color: '#cc0000',
    metrics: ['followers', 'followersGained', 'followersLost', 'reach', 'impressions', 'engagement', 'posts', 'ctr', 'retention', 'watchTime', 'newViewers', 'returningViewers'],
    textFields: ['trafficSources'],
    growth: ['followers', 'reach'],
    viewersChart: ['newViewers', 'returningViewers'],
    viewersChartTitle: 'Espectadores: recorrentes x novos' },
  { id: 'pinterest', label: 'Pinterest', group: 'Redes sociais', color: '#c8232c',
    metrics: ['followers', 'views', 'impressions', 'engagement', 'posts', 'totalAudience', 'outboundClicks', 'savedPins', 'engagedAudience'],
    tableMetrics: ['followers', 'views', 'impressions', 'engagement', 'posts', 'totalAudience', 'outboundClicks', 'savedPins', 'engagedAudience'],
    formExtraFields: ['pinClicks'],
    growth: ['views'],
    pinterestPost: true,
    contentColumns: [
      { field: 'title', label: 'Título', kind: 'text', required: true },
      { field: 'url', label: 'Link', kind: 'link', required: true },
      { field: 'format', label: 'Formato', kind: 'text', required: true },
      { field: 'impressions', label: 'Impressões', kind: 'num', required: true },
      { field: 'pinClicks', label: 'Cliques no Pin', kind: 'num', required: true },
      { field: 'savedCount', label: 'Pins salvos', kind: 'num', required: true },
      { field: 'outboundClicks', label: 'Cliques de saída', kind: 'num', required: true },
      { field: 'comments', label: 'Comentários', kind: 'num', required: true },
      { field: 'likes', label: 'Reações', kind: 'num', required: true }
    ],
    performanceSection: {
      title: 'Desempenho',
      charts: [
        { title: 'Taxa de cliques no Pin x Taxa de cliques de saída', type: 'rate', series: [
            { field: 'pinClicks', label: 'Taxa de cliques no Pin', defKey: 'pinClickRate' },
            { field: 'outboundClicks', label: 'Taxa de cliques de saída', defKey: 'outboundClickRate' }
          ] },
        { title: 'Taxa de engajamento x Taxa de pins salvos', type: 'rate', series: [
            { field: 'engagement', label: 'Taxa de engajamento', defKey: 'engagementRate' },
            { field: 'savedPins', label: 'Taxa de pins salvos', defKey: 'savedRate' }
          ] },
        { title: 'Público engajado x Público total', type: 'raw', series: [
            { field: 'engagedAudience', label: 'Público engajado', defKey: 'engagedAudience' },
            { field: 'totalAudience', label: 'Público total', defKey: 'totalAudience' }
          ] }
      ]
    },
    excludeBrands: ['ghelplus'] },
  { id: 'linkedin', label: 'LinkedIn', group: 'Redes sociais', color: '#0a66c2',
    metrics: ['followers', 'organicFollowers', 'sponsoredFollowers', 'posts', 'pageViews', 'uniqueVisitors', 'searchAppearances'],
    tableMetrics: ['followers', 'organicFollowers', 'sponsoredFollowers', 'posts', 'pageViews', 'uniqueVisitors', 'searchAppearances'],
    growth: ['uniqueVisitors', 'followers'],
    evolutionFields: ['uniqueVisitors', 'followers'],
    evolutionTitle: 'Visitantes x Seguidores (mensal)',
    linkedinPost: true,
    postTypeOptions: ['Estático', 'Vídeo', 'Carrossel'],
    trafficTypeOptions: ['Orgânico', 'Patrocinado'],
    contentColumns: [
      { field: 'title', label: 'Título', kind: 'text', required: true },
      { field: 'url', label: 'Link', kind: 'link' },
      { field: 'postType', label: 'Tipo de publicação', kind: 'text' },
      { field: 'trafficType', label: 'Patrocinado ou orgânico', kind: 'text' },
      { field: 'audience', label: 'Público', kind: 'num' },
      { field: 'impressions', label: 'Impressões', kind: 'num' },
      { field: 'views', label: 'Visualizações', kind: 'num' },
      { field: 'clicks', label: 'Cliques', kind: 'num' },
      { field: 'ctr', label: 'CTR (%)', kind: 'percent' },
      { field: 'engagementRate', label: 'Taxa de engajamento (%)', kind: 'percent' },
      { field: 'postNewFollowers', label: 'Seguidores vindo da publicação', kind: 'num' }
    ],
    excludeBrands: ['debacco'] },
  { id: 'site', label: 'SITE', group: 'Web', color: '#4b5eaa',
    metrics: ['totalUsers', 'activeUsers', 'newUsers', 'returningUsers', 'sessions', 'avgEngagementTime', 'eventCount'],
    textFields: ['trafficSources', 'city', 'country'],
    growth: ['activeUsers', 'sessions'],
    topPagesChart: true,
    topItemsLabel: 'Páginas mais acessadas',
    addItemLabel: '+ Cadastrar página',
    viewersChart: ['newUsers', 'returningUsers'],
    viewersChartTitle: 'Usuários: recorrentes x novos',
    contentColumns: [
      { field: 'title', label: 'Título / URL da página', kind: 'text', required: true },
      { field: 'url', label: 'Link', kind: 'link' },
      { field: 'pageTrafficSource', label: 'Origem do tráfego (desta página)', kind: 'text' },
      { field: 'region', label: 'Região', kind: 'text' },
      { field: 'views', label: 'Visualizações da página', kind: 'num' },
      { field: 'buttonClicks', label: 'Cliques em botões (desta página)', kind: 'num' },
      { field: 'buttonName', label: 'Nome do botão clicado', kind: 'text' },
      { field: 'pageActiveUsers', label: 'Usuários ativos (desta página)', kind: 'num' },
      { field: 'pageEventCount', label: 'Contagem de eventos (desta página)', kind: 'num' },
      { field: 'pageBounceRate', label: 'Taxa de rejeição (desta página, %)', kind: 'percent' }
    ] },
  { id: 'siteSeo', label: 'SEO SITE', group: 'Web', color: '#2f8f6b',
    metrics: ['seoClicks', 'seoImpressions', 'seoCtr', 'avgPosition'],
    tableMetrics: ['seoClicks', 'seoImpressions', 'seoCtr', 'avgPosition'],
    growth: ['seoClicks'],
    evolutionTitle: 'Evolução no ano — Cliques de busca',
    contentColumns: [
      { field: 'title', label: 'Palavra-chave ou URL da página', kind: 'text', required: true },
      { field: 'entryType', label: 'Tipo (keyword ou page)', kind: 'text', required: true },
      { field: 'clicks', label: 'Cliques', kind: 'num' },
      { field: 'impressions', label: 'Impressões', kind: 'num' },
      { field: 'ctr', label: 'CTR (%)', kind: 'percent' },
      { field: 'avgPosition', label: 'Posição média no Google', kind: 'num' }
    ],
    seoAnalysis: true },
  { id: 'ecommerce', label: 'E-commerce', group: 'Web', color: '#c2703d',
    metrics: ['activeUsers', 'transactions', 'revenue', 'avgTicket', 'viewedProduct', 'addedToCart', 'startedCheckout', 'purchased', 'cartAbandonmentRate'],
    tableMetrics: ['activeUsers', 'transactions', 'revenue', 'avgTicket', 'viewedProduct', 'addedToCart', 'startedCheckout', 'purchased', 'cartAbandonmentRate'],
    growth: ['revenue', 'transactions'],
    evolutionFields: ['revenue', 'transactions'],
    evolutionTitle: 'Evolução no ano — Receita total x Transações',
    // Ticket médio = Receita total ÷ Transações (não é digitado, é sempre calculado).
    computed: { avgTicket: { op: 'divide', numerator: 'revenue', denominator: 'transactions' } },
    topItemsLabel: 'Produtos em destaque',
    addItemLabel: '+ Cadastrar produto',
    contentColumns: [
      { field: 'title', label: 'Nome do produto', kind: 'text', required: true },
      { field: 'url', label: 'URL do produto', kind: 'link' },
      { field: 'pageTrafficSource', label: 'Origem do tráfego (deste produto)', kind: 'text' },
      { field: 'itemsViewed', label: 'Itens vistos', kind: 'num' },
      { field: 'itemsAddedToCart', label: 'Itens adicionados ao carrinho', kind: 'num' },
      { field: 'itemsPurchased', label: 'Itens comprados', kind: 'num' },
      { field: 'itemRevenue', label: 'Receita do item', kind: 'currency' }
    ],
    ecommerceCatalog: true,
    // Só a De Bacco tem loja/e-commerce — a GhelPlus não usa este canal.
    excludeBrands: ['ghelplus'] },
  { id: 'blog', label: 'BLOG', group: 'Web', color: '#7c5cbf',
    metrics: ['visits', 'pageviews', 'posts', 'engagementRate', 'newUsers', 'returningUsers', 'conversions'],
    tableMetrics: ['visits', 'pageviews', 'posts', 'engagementRate', 'newUsers', 'returningUsers', 'conversions'],
    formExtraFields: ['convProductClicks', 'convWhatsappClicks', 'convNewsletterSignups'],
    growth: ['visits'],
    evolutionFields: ['visits', 'conversions'],
    evolutionTitle: 'Evolução no ano — Visitas x Conversões',
    viewersChart: ['newUsers', 'returningUsers'],
    viewersChartTitle: 'Usuários do blog: novos x recorrentes',
    computed: { conversions: ['convProductClicks', 'convWhatsappClicks', 'convNewsletterSignups'] },
    contentColumns: [
      { field: 'title', label: 'Título / URL da página', kind: 'text', required: true },
      { field: 'url', label: 'Link', kind: 'link' },
      { field: 'pageTrafficSource', label: 'Origem do tráfego (desta página)', kind: 'text' },
      { field: 'views', label: 'Visualizações', kind: 'num' },
      { field: 'impressions', label: 'Impressões (busca orgânica)', kind: 'num' },
      { field: 'clicks', label: 'Cliques (busca orgânica)', kind: 'num' },
      { field: 'avgPosition', label: 'Posição média no Google', kind: 'num' },
      { field: 'engagementRate', label: 'Taxa de engajamento do post (%)', kind: 'percent' },
      { field: 'convProductClicks', label: 'Cliques em produto', kind: 'num' },
      { field: 'convWhatsappClicks', label: 'Cliques no WhatsApp', kind: 'num' },
      { field: 'convNewsletterSignups', label: 'Assinaturas de newsletter', kind: 'num' }
    ],
    blogPost: true },
  { id: 'newsletter', label: 'Newsletter', group: 'Newsletter', color: '#1e8a6e',
    metrics: ['subscribers', 'newLeads', 'campaignsSent', 'openRate', 'churnRate', 'clicks'],
    growth: ['subscribers'] },
  { id: 'assessoria', label: 'Assessoria de Imprensa', group: 'Assessoria', color: '#b5772e',
    metrics: ['pressCost', 'mentions', 'prReach', 'prPageViews', 'clippingValue'],
    growth: ['mentions'],
    pressReport: true,
    totalsFields: ['pressCost', 'clippingValue'],
    contentColumns: [
      { field: 'title', label: 'Título / manchete', kind: 'text', required: true },
      { field: 'url', label: 'Link da matéria', kind: 'link' },
      { field: 'vehicle', label: 'Veículo', kind: 'text' },
      { field: 'mediaType', label: 'Tipo de veículo', kind: 'text' },
      { field: 'uf', label: 'Estado (UF)', kind: 'text' },
      { field: 'publishDate', label: 'Data de publicação (AAAA-MM-DD)', kind: 'text' },
      { field: 'value', label: 'Centimetragem (R$)', kind: 'currency' }
    ] },
  { id: 'casoca', label: 'Casoca', group: 'Redes sociais', color: '#4c2a85',
    metrics: ['visits', 'productVisits', 'channelVisits', 'downloads', 'uniqueVisitors', 'newUsers', 'returningUsers',
      'downloaders', 'contacts', 'whatsappContacts', 'siteContacts', 'planCost', 'rankLousasMetais', 'rankEletros'],
    textFields: ['topProfessions', 'topStates', 'downloadFormats', 'competitiveNotes'],
    growth: ['visits', 'downloads'],
    viewersChart: ['newUsers', 'returningUsers'],
    viewersChartTitle: 'Usuários: recorrentes x novos',
    topPagesChart: true,
    topItemsLabel: 'Produtos mais visitados',
    addItemLabel: '+ Cadastrar produto',
    isProductCatalog: true,
    contentColumns: [
      { field: 'title', label: 'Título / nome do produto', kind: 'text', required: true },
      { field: 'url', label: 'Link', kind: 'link' },
      { field: 'format', label: 'Tipo de produto', kind: 'text' },
      { field: 'uf', label: 'Estado', kind: 'text' },
      { field: 'views', label: 'Visitas do produto', kind: 'num' },
      { field: 'downloads', label: 'Downloads', kind: 'num' }
    ],
    excludeBrands: ['ghelplus'] },
  // Mesma estrutura de dados da Casoca (catálogo de produtos) — a pessoa pediu uma página nova,
  // Promob, logo abaixo de Casoca na navegação, com os mesmos campos.
  { id: 'promob', label: 'Promob', group: 'Redes sociais', color: '#2e7d8a',
    metrics: ['visits', 'productVisits', 'channelVisits', 'downloads', 'uniqueVisitors', 'newUsers', 'returningUsers',
      'downloaders', 'contacts', 'whatsappContacts', 'siteContacts', 'planCost', 'rankLousasMetais', 'rankEletros'],
    textFields: ['topProfessions', 'topStates', 'downloadFormats', 'competitiveNotes'],
    growth: ['visits', 'downloads'],
    viewersChart: ['newUsers', 'returningUsers'],
    viewersChartTitle: 'Usuários: recorrentes x novos',
    topPagesChart: true,
    topItemsLabel: 'Produtos mais visitados',
    addItemLabel: '+ Cadastrar produto',
    isProductCatalog: true,
    contentColumns: [
      { field: 'title', label: 'Título / nome do produto', kind: 'text', required: true },
      { field: 'url', label: 'Link', kind: 'link' },
      { field: 'format', label: 'Tipo de produto', kind: 'text' },
      { field: 'uf', label: 'Estado', kind: 'text' },
      { field: 'views', label: 'Visitas do produto', kind: 'num' },
      { field: 'downloads', label: 'Downloads', kind: 'num' }
    ],
    excludeBrands: ['ghelplus'] }
];

function channelsForBrand(brandId) {
  return CHANNELS.filter(c => !(c.excludeBrands || []).includes(brandId));
}

const METRIC_LABELS = {
  followers: 'Seguidores',
  followersGained: 'Seguidores ganhos no mês',
  followersLost: 'Seguidores perdidos no mês',
  reach: 'Alcance',
  impressions: 'Impressões',
  engagement: 'Engajamento',
  posts: 'Publicações',
  visits: 'Visitas',
  pageviews: 'Pageviews',
  subscribers: 'Inscritos',
  campaignsSent: 'Campanhas enviadas',
  opens: 'Aberturas',
  clicks: 'Cliques',
  mentions: 'Nº de matérias',
  prReach: 'Audiência (leitores em potencial)',
  outboundClicks: 'Cliques de saída',
  ctr: 'CTR (%)',
  retention: 'Retenção média (%)',
  watchTime: 'Watch time (horas)',
  newViewers: 'Espectadores novos',
  totalViewers: 'Total de espectadores',
  likesTotal: 'Curtidas',
  sharesTotal: 'Compartilhamentos',
  avgWatchTime: 'Tempo médio de visualização (segundos)',
  completionRate: 'Assistiu o vídeo completo (%)',
  videoNewFollowers: 'Novos seguidores (a partir deste vídeo)',
  sponsored: 'Patrocinado (conteúdo pago)',
  views: 'Visualizações',
  contentInteractions: 'Interações de conteúdo',
  viewsOrganic: 'Visualizações — origem orgânica',
  viewsAds: 'Visualizações — anúncios',
  interactionsReels: 'Interações em Reels',
  interactionsStatic: 'Interações em conteúdo estático',
  interactionsCarousel: 'Interações em Carrossel',
  totalAudience: 'Público total',
  savedPins: 'Pins salvos',
  engagedAudience: 'Público engajado',
  pinClicks: 'Cliques no Pin',
  organicFollowers: 'Seguidores orgânicos',
  sponsoredFollowers: 'Seguidores patrocinados',
  pageViews: 'Visualizações da página',
  searchAppearances: 'Ocorrência em pesquisas',
  audience: 'Público',
  postType: 'Tipo de publicação',
  viewers: 'Espectadores',
  savedCount: 'Salvos',
  linkClicks: 'Cliques no link',
  postNewFollowers: 'Seguidores vindo da publicação',
  postWatchTime: 'Tempo de visualização',
  trafficType: 'Orgânico ou Tráfego',
  returningViewers: 'Espectadores recorrentes',
  trafficSources: 'Origem do tráfego dos usuários ativos',
  mailingLink: 'Mailing do mês (link ou planilha)',
  prPageViews: 'Page views',
  clippingValue: 'Centimetragem (R$)',
  retentionTime: 'Tempo de retenção médio (segundos)',
  engagementRate: 'Taxa de engajamento (%)',
  seoClicks: 'Cliques (busca orgânica)',
  seoImpressions: 'Impressões (busca orgânica)',
  seoCtr: 'CTR de busca (%)',
  avgPosition: 'Posição média no Google',
  buttonClicksTotal: 'Cliques em botões (total)',
  keywords: 'Palavras-chave',
  demographics: 'Dados demográficos (país, cidade, idioma, idade, gênero)',
  pageTrafficSource: 'Origem do tráfego (desta página)',
  scrollDepth: 'Rolagem da página (%)',
  buttonClicks: 'Cliques em botões (desta página)',
  region: 'Região',
  activeUsers: 'Usuários ativos',
  newUsers: 'Novos usuários',
  returningUsers: 'Usuários recorrentes',
  sessions: 'Sessões',
  avgEngagementTime: 'Tempo médio de engajamento (segundos)',
  eventCount: 'Contagem de eventos',
  retentionRate: 'Retenção de usuários (%)',
  city: 'Cidade (principais)',
  country: 'País (principais)',
  pageActiveUsers: 'Usuários ativos (desta página)',
  pageEventCount: 'Contagem de eventos (desta página)',
  pageBounceRate: 'Taxa de rejeição (desta página, %)',
  productVisits: 'Visitas a páginas de produto',
  channelVisits: 'Visitas à página do canal',
  downloads: 'Downloads',
  uniqueVisitors: 'Visitantes únicos',
  downloaders: 'Usuários que fizeram download',
  contacts: 'Contatos e conexões (total)',
  whatsappContacts: 'Contatos via WhatsApp',
  siteContacts: 'Contatos via site',
  planCost: 'Custo do plano (R$/mês)',
  rankLousasMetais: 'Posição no ranking — Louças e Metais',
  rankEletros: 'Posição no ranking — Eletros',
  topProfessions: 'Perfil de audiência por profissão',
  topStates: 'Distribuição por estado',
  downloadFormats: 'Formatos de download mais usados',
  competitiveNotes: 'Observações sobre ranking/concorrência',
  totalUsers: 'Total de usuários',
  newLeads: 'Novos leads',
  openRate: 'Taxa de abertura (%)',
  churnRate: 'Churn (%)',
  pressCost: 'Valor investido em assessoria (R$)',
  buttonName: 'Nome do botão clicado',
  convProductClicks: 'Cliques em produto',
  convWhatsappClicks: 'Cliques no WhatsApp',
  convNewsletterSignups: 'Assinaturas de newsletter',
  conversions: 'Conversões (produto + WhatsApp + newsletter)',
  transactions: 'Transações',
  revenue: 'Receita total',
  avgTicket: 'Ticket médio',
  viewedProduct: 'Visualizou produto',
  addedToCart: 'Adicionou ao carrinho',
  startedCheckout: 'Iniciou checkout',
  purchased: 'Comprou',
  cartAbandonmentRate: 'Taxa de abandono de carrinho (%)',
  itemsViewed: 'Itens vistos',
  itemsAddedToCart: 'Itens adicionados ao carrinho',
  itemsPurchased: 'Itens comprados',
  itemRevenue: 'Receita do item'
};

const CURRENCY_FIELDS = ['clippingValue', 'value', 'planCost', 'pressCost', 'revenue', 'avgTicket', 'itemRevenue'];
const MEDIA_TYPES = ['Online', 'Revista', 'Social', 'Site'];
const TRAFFIC_TYPES = ['Orgânico', 'Tráfego pago'];

// Definições exibidas no tooltip dos gráficos de Desempenho do Pinterest
const METRIC_DEFINITIONS = {
  engagedAudience: 'Número de pessoas que se engajaram com os Pins.',
  totalAudience: 'Número total de pessoas que viram os Pins ou se engajaram com eles.',
  outboundClickRate: 'Número total de cliques para a URL de destino associada ao Pin, dividido pelo número total de vezes que os Pins foram vistos.',
  pinClickRate: 'Número de cliques no Pin para acessar dentro ou fora do Pinterest, dividido pelo número total de vezes que o Pin foi visto.',
  engagementRate: 'Total de engajamentos com seus Pins dividido pelo número total de vezes que seus Pins foram vistos. Os engajamentos incluem cliques e Pins salvos.',
  savedRate: 'Total de salvamentos dos seus Pins dividido pelo número total de vezes que seus Pins foram vistos.'
};

// Faixas de qualidade exibidas como selo ao lado do indicador (ex.: Taxa de abertura da newsletter)
const QUALITY_THRESHOLDS = {
  openRate: { great: 35, good: 25, greatLabel: 'Excelente', goodLabel: 'Ideal', badLabel: 'Ruim' }
};

function qualityBadge(field, value) {
  const rule = QUALITY_THRESHOLDS[field];
  if (!rule || value === null || value === undefined || isNaN(value)) return null;
  if (value >= rule.great) return { label: rule.greatLabel, className: 'up' };
  if (value >= rule.good) return { label: rule.goodLabel, className: 'flat' };
  return { label: rule.badLabel, className: 'down' };
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function channelById(id) { return CHANNELS.find(c => c.id === id); }
function brandById(id) { return BRANDS.find(b => b.id === id); }

function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR').format(Math.round(n));
}

function fmtCompact(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function fmtPct(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return sign + n.toFixed(1) + '%';
}

// Mostra o número com exatamente 1 casa decimal (ex.: 5,6) — usado onde o valor arredondado
// (fmtNum, que arredonda pro inteiro mais próximo) perderia precisão que a pessoa quer ver
// exatamente, como a posição média de uma palavra-chave no Google.
function fmtDecimal1(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function fmtCurrency(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function fmtValue(field, n) {
  return CURRENCY_FIELDS.includes(field) ? fmtCurrency(n) : fmtNum(n);
}

// Alguns campos não são digitados diretamente — são calculados a partir de outros campos.
// ch.computed = { field: [sourceFields...] } soma os campos-fonte (ex.: "Conversões" do blog =
// cliques em produto + WhatsApp + newsletter). ch.computed = { field: { op: 'divide', numerator, denominator } }
// divide um campo pelo outro (ex.: "Ticket médio" do E-commerce = Receita total ÷ Transações).
// Esta função resolve o valor certo esteja ele armazenado ou calculado.
function chFieldValue(ch, m, field) {
  if (!m) return null;
  if (ch && ch.computed && ch.computed[field]) {
    const def = ch.computed[field];
    if (Array.isArray(def)) {
      let sum = 0, any = false;
      def.forEach(sf => {
        const v = m[sf];
        if (v !== null && v !== undefined && v !== '') { sum += Number(v) || 0; any = true; }
      });
      return any ? sum : null;
    }
    if (def && def.op === 'divide') {
      const num = m[def.numerator];
      const den = m[def.denominator];
      if (num === null || num === undefined || num === '' || den === null || den === undefined || den === '' || Number(den) === 0) return null;
      return Number(num) / Number(den);
    }
    return null;
  }
  return m[field];
}

// Mesma ideia, mas para itens de conteúdo (posts) — soma as 3 conversões cadastradas no post.
function contentConversions(c) {
  if (!c) return null;
  const sources = ['convProductClicks', 'convWhatsappClicks', 'convNewsletterSignups'];
  let sum = 0, any = false;
  sources.forEach(sf => {
    const v = c[sf];
    if (v !== null && v !== undefined && v !== '') { sum += Number(v) || 0; any = true; }
  });
  return any ? sum : null;
}

// Campos calculados (ex.: "Conversões" do blog) não devem virar coluna editável na
// planilha-modelo nem ser lidos na importação — quem preenche digita os campos-fonte.
function editableFields(ch, fields) {
  return (fields || []).filter(f => !(ch && ch.computed && ch.computed[f]));
}

// Colunas do conteúdo em destaque deste canal (planilha de cadastro em massa + relatório Excel).
function chContentColumns(ch) {
  return (ch && ch.contentColumns) || DEFAULT_CONTENT_COLUMNS;
}

function pctChange(from, to) {
  if (from === null || from === undefined || to === null || to === undefined) return null;
  if (from === 0) return to > 0 ? 100 : 0;
  return ((to - from) / Math.abs(from)) * 100;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

/* ==================== Planilhas (modelo + importação) ==================== */

const IMPORT_LABEL_TO_FIELD = {
  'Mês': 'month',
  'Ano': 'year',
  'Observações': 'notes'
};
Object.keys(METRIC_LABELS).forEach(field => { IMPORT_LABEL_TO_FIELD[METRIC_LABELS[field]] = field; });

function downloadChannelTemplate(ch, brandLabel, year) {
  const metricFields = editableFields(ch, ch.metrics);
  const headers = ['Mês', 'Ano', ...metricFields.map(f => METRIC_LABELS[f]), ...(ch.textFields || []).map(f => METRIC_LABELS[f]), 'Observações'];
  const rows = [headers];
  MONTH_NAMES_FULL.forEach(mn => {
    const row = [mn, year];
    metricFields.forEach(() => row.push(''));
    (ch.textFields || []).forEach(() => row.push(''));
    row.push('');
    rows.push(row);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(14, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, ch.label.slice(0, 31));
  XLSX.writeFile(wb, `modelo-${ch.id}-${(brandLabel || '').toLowerCase().replace(/\s+/g, '-')}-${year}.xlsx`);
}

function parseImportedTemplate(file, ch) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (!rawRows.length) return resolve([]);
        const headers = rawRows[0].map(h => String(h).trim());
        const fieldKeys = headers.map(h => IMPORT_LABEL_TO_FIELD[h] || null);
        const results = [];
        for (let i = 1; i < rawRows.length; i++) {
          const rawRow = rawRows[i];
          if (!rawRow || rawRow.every(v => v === '' || v === null || v === undefined)) continue;
          const obj = {};
          fieldKeys.forEach((key, idx) => {
            if (!key) return;
            obj[key] = rawRow[idx];
          });
          if (obj.month === undefined || obj.month === '') continue;
          if (typeof obj.month === 'string') {
            const idx = MONTH_NAMES_FULL.findIndex(mn => mn.toLowerCase() === obj.month.trim().toLowerCase());
            obj.month = idx >= 0 ? idx + 1 : Number(obj.month) || null;
          }
          obj.year = Number(obj.year) || null;
          if (!obj.month || !obj.year) continue;
          const hasAnyValue = ch.metrics.some(f => obj[f] !== undefined && obj[f] !== '') || (ch.textFields || []).some(f => obj[f] !== undefined && obj[f] !== '');
          if (!hasAnyValue) continue;
          results.push(obj);
        }
        resolve(results);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsArrayBuffer(file);
  });
}

/* ==================== Planilhas de conteúdos (modelo + importação) ====================
   Cadastro em massa dos "conteúdos em destaque" (posts, páginas, matérias, produtos) de
   cada canal — mesma ideia do modelo de lançamentos mensais acima, só que dirigida pelas
   colunas específicas de cada canal (`ch.contentColumns`) em vez de `ch.metrics`. */

function downloadContentTemplate(ch, brandLabel, year) {
  const cols = chContentColumns(ch);
  const headers = ['Mês', 'Ano', ...cols.map(c => c.label)];
  const rows = [headers];
  const blankLines = 15;
  for (let i = 0; i < blankLines; i++) {
    rows.push(['', year, ...cols.map(() => '')]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(16, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (ch.topItemsLabel || ch.label).slice(0, 31));
  XLSX.writeFile(wb, `modelo-conteudos-${ch.id}-${(brandLabel || '').toLowerCase().replace(/\s+/g, '-')}-${year}.xlsx`);
}

function parseImportedContentTemplate(file, ch) {
  const cols = chContentColumns(ch);
  const labelToField = { 'Mês': 'month', 'Ano': 'year' };
  cols.forEach(c => { labelToField[c.label] = c.field; });
  const colByField = {};
  cols.forEach(c => { colByField[c.field] = c; });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (!rawRows.length) return resolve([]);
        const headers = rawRows[0].map(h => String(h).trim());
        const fieldKeys = headers.map(h => labelToField[h] || null);
        const results = [];
        for (let i = 1; i < rawRows.length; i++) {
          const rawRow = rawRows[i];
          if (!rawRow || rawRow.every(v => v === '' || v === null || v === undefined)) continue;
          const obj = {};
          fieldKeys.forEach((key, idx) => {
            if (!key) return;
            let val = rawRow[idx];
            const colDef = colByField[key];
            if (colDef && val !== '' && val !== null && val !== undefined) {
              if (colDef.kind === 'num' || colDef.kind === 'percent' || colDef.kind === 'currency') {
                val = Number(val);
                if (isNaN(val)) val = '';
              } else if (colDef.kind === 'bool') {
                val = /^(sim|s|true|1|yes)$/i.test(String(val).trim());
              } else {
                val = String(val).trim();
              }
            }
            obj[key] = val;
          });
          if (typeof obj.month === 'string') {
            const idx = MONTH_NAMES_FULL.findIndex(mn => mn.toLowerCase() === obj.month.trim().toLowerCase());
            obj.month = idx >= 0 ? idx + 1 : (Number(obj.month) || null);
          }
          obj.year = Number(obj.year) || null;
          const missingRequired = cols.some(c => c.required && (obj[c.field] === undefined || obj[c.field] === '' || obj[c.field] === null));
          if (missingRequired) continue;
          results.push(obj);
        }
        resolve(results);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsArrayBuffer(file);
  });
}

/* ==================== Relatórios em PDF ==================== */

function pdfHeader(doc, title, subtitle) {
  doc.setFontSize(16);
  doc.setTextColor(20, 22, 31);
  doc.text(title, 40, 46);
  doc.setFontSize(10.5);
  doc.setTextColor(107, 111, 125);
  doc.text(subtitle, 40, 64);
  doc.setDrawColor(228, 226, 218);
  doc.line(40, 76, doc.internal.pageSize.getWidth() - 40, 76);
  return 96;
}

function pdfCardsGrid(doc, y, cards) {
  const marginX = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const colWidth = (pageWidth - marginX * 2) / 3;
  let x = marginX;
  let rowStartY = y;
  cards.forEach((c, i) => {
    if (i > 0 && i % 3 === 0) { rowStartY += 48; x = marginX; }
    doc.setFontSize(8.5);
    doc.setTextColor(107, 111, 125);
    doc.text(c.label.toUpperCase(), x, rowStartY);
    doc.setFontSize(13);
    doc.setTextColor(20, 22, 31);
    doc.text(String(c.value), x, rowStartY + 16);
    x += colWidth;
  });
  return rowStartY + 40;
}

function pdfChartImage(doc, y, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return y;
  try {
    const imgData = canvas.toDataURL('image/png', 1.0);
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 80;
    const imgHeight = imgWidth * (canvas.height / canvas.width);
    if (y + imgHeight > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 40; }
    doc.addImage(imgData, 'PNG', 40, y, imgWidth, imgHeight);
    return y + imgHeight + 24;
  } catch (e) {
    console.error('Não foi possível incluir o gráfico no PDF:', e);
    return y;
  }
}

function pdfTable(doc, y, title, head, body, opts) {
  opts = opts || {};
  if (!body.length) return y;
  if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 40; }
  if (title) {
    doc.setFontSize(11.5);
    doc.setTextColor(20, 22, 31);
    doc.text(title, 40, y);
    y += 14;
  }
  doc.autoTable({
    startY: y,
    head: [head],
    body,
    margin: { left: 40, right: 40 },
    styles: { fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [20, 22, 31], textColor: 255 },
    alternateRowStyles: { fillColor: [247, 247, 245] },
    didParseCell: (data) => {
      if (opts.linkColIndex !== undefined && data.column.index === opts.linkColIndex && data.section === 'body') {
        const url = opts.links && opts.links[data.row.index];
        if (url) { data.cell.styles.textColor = [15, 118, 189]; }
      }
    },
    didDrawCell: (data) => {
      if (opts.linkColIndex !== undefined && data.column.index === opts.linkColIndex && data.section === 'body') {
        const url = opts.links && opts.links[data.row.index];
        if (url) doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
      }
    }
  });
  return doc.lastAutoTable.finalY + 24;
}

function pdfFooterAndSave(doc, filename) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} · página ${i} de ${pageCount}`, 40, doc.internal.pageSize.getHeight() - 24);
    // Assinatura de criação, em tamanho pequeno, alinhada à direita.
    doc.setFontSize(7.5);
    doc.setTextColor(170, 170, 170);
    doc.text('Desenvolvido por Raquel Daltoé (Pixie Marketing)', pageWidth - 40, doc.internal.pageSize.getHeight() - 24, { align: 'right' });
  }
  doc.save(filename);
}

function horizontalBarChartOptions() {
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11.5 }, usePointStyle: true } },
      tooltip: {
        padding: 10,
        titleFont: { size: 12.5, weight: '700' },
        bodyFont: { size: 12 },
        callbacks: {
          title: (items) => items && items.length ? String(items[0].label) : '',
          label: (ctx) => `${ctx.dataset.label}: ${fmtNum(ctx.parsed.x)}`
        }
      }
    },
    scales: {
      x: { ticks: { callback: (v) => fmtCompact(v) }, grid: { color: '#eeece4' } },
      y: { grid: { display: false } }
    }
  };
}

// Plugin do Chart.js que escreve o valor exato em cima de cada barra — usado no gráfico "Top 10
// palavras-chave x posição média" (Análise SEO do Site), onde a pessoa pediu pra ver o número
// exato (ex.: 5,6) em vez de só descobrir arredondado passando o mouse por cima.
function barValueLabelPlugin(formatter) {
  return {
    id: 'barValueLabel',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (meta.hidden) return;
        meta.data.forEach((bar, index) => {
          const value = dataset.data[index];
          if (value === null || value === undefined) return;
          ctx.save();
          ctx.fillStyle = '#3d3f4d';
          ctx.font = "600 11px 'Inter', sans-serif";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(formatter(value), bar.x, bar.y - 4);
          ctx.restore();
        });
      });
    }
  };
}

function doughnutChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11.5 }, usePointStyle: true } },
      tooltip: {
        padding: 10,
        titleFont: { size: 12.5, weight: '700' },
        bodyFont: { size: 12 },
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
            return `${ctx.label}: ${fmtNum(ctx.parsed)} (${pct}%)`;
          }
        }
      }
    }
  };
}

// Monta um gráfico de barras com o MÊS num eixo e a QUANTIDADE no outro,
// identificando cada página/produto por cor (legenda) e no tooltip.
function buildTopItemsChartData(items, baseColor) {
  const filtered = items.filter(c => (c.views || 0) > 0 && c.month && c.year);
  const totals = {};
  filtered.forEach(c => { totals[c.title] = (totals[c.title] || 0) + (c.views || 0); });
  const topTitles = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);
  const monthKeys = [...new Set(filtered.filter(c => topTitles.includes(c.title)).map(c => `${c.year}-${String(c.month).padStart(2, '0')}`))].sort();
  const labels = monthKeys.map(k => { const [y, m] = k.split('-'); return MONTH_NAMES[Number(m) - 1] + '/' + y; });
  const palette = [baseColor, '#c1327a', '#1877f2', '#cc0000', '#7c5cbf', '#1e8a6e', '#b5772e'];
  const datasets = topTitles.map((title, i) => ({
    label: title.length > 22 ? title.slice(0, 22) + '…' : title,
    data: monthKeys.map(k => {
      const [y, m] = k.split('-');
      const match = filtered.find(c => c.title === title && c.year === Number(y) && c.month === Number(m));
      return match ? match.views : null;
    }),
    backgroundColor: palette[i % palette.length]
  }));
  return { labels, datasets };
}

// Este arquivo roda tanto no navegador (via <script>) quanto no servidor (via require), para
// que o backend gere relatórios em Excel usando exatamente a mesma configuração de canais —
// uma só fonte da verdade, sem duplicar a lista de campos/labels de cada canal.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BRANDS, CHANNELS, METRIC_LABELS, CURRENCY_FIELDS, MEDIA_TYPES, TRAFFIC_TYPES,
    MONTH_NAMES, MONTH_NAMES_FULL, DEFAULT_CONTENT_COLUMNS,
    channelsForBrand, channelById, brandById,
    chFieldValue, contentConversions, editableFields, chContentColumns,
    fmtNum, fmtCompact, fmtPct, fmtCurrency, fmtValue, escapeHtml, qualityBadge, pctChange,
    downloadChannelTemplate, parseImportedTemplate, downloadContentTemplate, parseImportedContentTemplate
  };
}
