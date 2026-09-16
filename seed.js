const db = require('./db');
const { nanoid } = require('./utils/id');

const BRANDS = ['ghelplus', 'debacco'];
const SOCIAL = ['instagram', 'facebook', 'tiktok', 'youtube', 'pinterest', 'linkedin'];
const YEARS = [2025, 2026];
const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function monthsFor(year) {
  if (year === CURRENT_YEAR) {
    return Array.from({ length: CURRENT_MONTH }, (_, i) => i + 1);
  }
  return Array.from({ length: 12 }, (_, i) => i + 1);
}

const TRAFFIC_SOURCE_SAMPLES = [
  'Pesquisa 38%, Sugeridos 32%, Externo 14%, Notificações 9%, Outros 7%',
  'Sugeridos 45%, Pesquisa 25%, Externo 18%, Notificações 7%, Outros 5%',
  'Pesquisa 30%, Sugeridos 40%, Externo 20%, Notificações 5%, Outros 5%'
];

console.log('Limpando dados de exemplo anteriores...');
db.set('metrics', []).write();
db.set('content', []).write();
db.set('auditLog', []).write();

let seedCounter = 1;

BRANDS.forEach((brand, brandIdx) => {
  const brandFactor = brand === 'ghelplus' ? 1 : 0.7;

  YEARS.forEach((year) => {
    const months = monthsFor(year);
    const yearFactor = year === 2025 ? 0.6 : 1;

    SOCIAL.forEach((channel) => {
      if (channel === 'pinterest' && brand === 'ghelplus') return;
      if (channel === 'linkedin' && brand === 'debacco') return;
      const baseFollowers = Math.round(3000 * brandFactor * (channel === 'instagram' ? 3 : channel === 'tiktok' ? 2 : 1));
      months.forEach((month) => {
        seedCounter++;
        const growthIdx = (year - 2025) * 12 + month;
        const r = seededRandom(seedCounter);
        const followersGained = Math.round((80 + r * 220) * brandFactor);
        const followersLost = Math.round((20 + r * 70) * brandFactor);
        const followers = baseFollowers + growthIdx * followersGained;
        const reach = Math.round(followers * (1.8 + r) * yearFactor);
        const impressions = Math.round(reach * (1.3 + r * 0.6));
        const engagement = Math.round(reach * (0.03 + r * 0.05));
        const posts = Math.round(8 + r * 14);

        const record = {
          id: nanoid(), brand, channel, year, month,
          followers, followersGained, followersLost, reach, impressions, engagement, posts,
          visits: null, pageviews: null, subscribers: null, opens: null, clicks: null,
          campaignsSent: null, mentions: null, prReach: null,
          outboundClicks: null, ctr: null, retention: null, watchTime: null,
          newViewers: null, returningViewers: null, prPageViews: null, clippingValue: null,
          totalViewers: null, likesTotal: null, sharesTotal: null,
          views: null, contentInteractions: null, viewsOrganic: null, viewsAds: null,
          interactionsReels: null, interactionsStatic: null, interactionsCarousel: null, viewers: null,
          totalAudience: null, savedPins: null, engagedAudience: null, pinClicks: null,
          organicFollowers: null, sponsoredFollowers: null, pageViews: null, searchAppearances: null,
          uniqueVisitors: null,
          trafficSources: '', mailingLink: '',
          notes: '', updatedAt: new Date().toISOString(), updatedBy: 'seed'
        };

        if (channel === 'pinterest') {
          record.views = Math.round(reach * (1.3 + r * 0.5));
          record.outboundClicks = Math.round(record.views * (0.02 + r * 0.02));
          record.pinClicks = Math.round(record.views * (0.03 + r * 0.025));
          record.savedPins = Math.round(record.views * (0.015 + r * 0.015));
          record.totalAudience = Math.round(record.views * (0.6 + r * 0.15));
          record.engagedAudience = Math.round(record.totalAudience * (0.12 + r * 0.08));
        }
        if (channel === 'youtube') {
          record.ctr = Number((3.5 + r * 4).toFixed(1));
          record.retention = Number((35 + r * 25).toFixed(1));
          record.watchTime = Math.round((80 + r * 220) * brandFactor);
          record.newViewers = Math.round(reach * (0.55 + r * 0.15));
          record.returningViewers = Math.round(reach * (0.15 + r * 0.15));
          record.trafficSources = TRAFFIC_SOURCE_SAMPLES[month % TRAFFIC_SOURCE_SAMPLES.length];
        }
        if (channel === 'tiktok') {
          record.totalViewers = Math.round(reach * (1.4 + r * 0.6));
          record.newViewers = Math.round(reach * (0.5 + r * 0.2));
          record.likesTotal = Math.round(reach * (0.08 + r * 0.05));
          record.sharesTotal = Math.round(reach * (0.01 + r * 0.015));
        }
        if (channel === 'instagram') {
          record.views = Math.round(reach * (1.2 + r * 0.5));
          record.viewsOrganic = Math.round(record.views * (0.65 + r * 0.15));
          record.viewsAds = record.views - record.viewsOrganic;
          record.contentInteractions = Math.round(reach * (0.06 + r * 0.04));
          record.interactionsReels = Math.round(record.contentInteractions * (0.6 + r * 0.15));
          record.interactionsStatic = record.contentInteractions - record.interactionsReels;
        }
        if (channel === 'facebook') {
          record.views = Math.round(reach * (1.1 + r * 0.4));
          record.viewsOrganic = Math.round(record.views * (0.55 + r * 0.15));
          record.viewsAds = record.views - record.viewsOrganic;
          record.contentInteractions = Math.round(reach * (0.05 + r * 0.03));
          record.interactionsReels = Math.round(record.contentInteractions * (0.4 + r * 0.1));
          record.interactionsCarousel = Math.round(record.contentInteractions * (0.25 + r * 0.1));
          record.interactionsStatic = record.contentInteractions - record.interactionsReels - record.interactionsCarousel;
          record.viewers = Math.round(record.views * (0.7 + r * 0.15));
        }
        if (channel === 'linkedin') {
          record.organicFollowers = Math.round(record.followers * (0.75 + r * 0.1));
          record.sponsoredFollowers = record.followers - record.organicFollowers;
          record.pageViews = Math.round(reach * (0.9 + r * 0.4));
          record.uniqueVisitors = Math.round(record.pageViews * (0.55 + r * 0.15));
          record.searchAppearances = Math.round(record.pageViews * (0.2 + r * 0.15));
        }

        db.get('metrics').push(record).write();
      });
    });

    // Site
    months.forEach((month) => {
      seedCounter++;
      const r = seededRandom(seedCounter);
      const growthIdx = (year - 2025) * 12 + month;
      const sessions = Math.round((2500 + growthIdx * 90) * brandFactor * yearFactor * (0.9 + r * 0.3));
      const activeUsers = Math.round(sessions * (0.7 + r * 0.15));
      const newUsers = Math.round(activeUsers * (0.55 + r * 0.2));
      db.get('metrics').push({
        id: nanoid(), brand, channel: 'site', year, month,
        followers: null, followersGained: null, reach: null, impressions: null, engagement: null, posts: null,
        visits: sessions, pageviews: Math.round(sessions * (1.6 + r)), subscribers: null, opens: null, clicks: null,
        campaignsSent: null, mentions: null, prReach: null,
        outboundClicks: null, ctr: null, retention: null, watchTime: null,
        newViewers: null, returningViewers: null, prPageViews: null, clippingValue: null,
        retentionTime: null, engagementRate: null, seoClicks: null, seoImpressions: null,
        seoCtr: null, avgPosition: null, keywords: '', demographics: '',
        totalUsers: Math.round(activeUsers * (1.05 + r * 0.1)),
        activeUsers, newUsers, returningUsers: activeUsers - newUsers, sessions,
        avgEngagementTime: Math.round(45 + r * 90),
        eventCount: Math.round(sessions * (2.5 + r * 2)),
        buttonClicksTotal: Math.round(sessions * (0.05 + r * 0.04)),
        retentionRate: null,
        trafficSources: 'Busca orgânica 42%, Redes sociais 24%, Direto 20%, Anúncios 14%',
        mailingLink: '',
        city: 'São Paulo, Rio de Janeiro, Curitiba',
        country: 'Brasil (96%), Portugal (2%), outros (2%)',
        notes: '', updatedAt: new Date().toISOString(), updatedBy: 'seed'
      }).write();
    });

    // Blog
    months.forEach((month) => {
      seedCounter++;
      const r = seededRandom(seedCounter);
      const growthIdx = (year - 2025) * 12 + month;
      const visits = Math.round((900 + growthIdx * 45) * brandFactor * yearFactor * (0.9 + r * 0.3));
      db.get('metrics').push({
        id: nanoid(), brand, channel: 'blog', year, month,
        followers: null, followersGained: null, reach: null, impressions: null, engagement: null,
        posts: Math.round(2 + r * 4),
        visits, pageviews: Math.round(visits * (1.3 + r)), subscribers: null, opens: null, clicks: null,
        campaignsSent: null, mentions: null, prReach: null,
        outboundClicks: null, ctr: null, retention: null, watchTime: null,
        newViewers: null, returningViewers: null, prPageViews: null, clippingValue: null,
        trafficSources: '', mailingLink: '',
        notes: '', updatedAt: new Date().toISOString(), updatedBy: 'seed'
      }).write();
    });

    // Newsletter
    const baseSubs = Math.round(1200 * brandFactor);
    months.forEach((month) => {
      seedCounter++;
      const r = seededRandom(seedCounter);
      const growthIdx = (year - 2025) * 12 + month;
      const subscribers = baseSubs + growthIdx * Math.round(30 * brandFactor);
      const campaignsSent = Math.round(1 + r * 3);
      const openRate = Number((14 + r * 20).toFixed(1));
      const clicks = Math.round(subscribers * (openRate / 100) * (0.15 + r * 0.1));
      const churnRate = Number((1 + r * 4).toFixed(1));
      const newLeads = Math.round(40 + r * 90 * brandFactor);
      db.get('metrics').push({
        id: nanoid(), brand, channel: 'newsletter', year, month,
        followers: null, followersGained: null, reach: null, impressions: null, engagement: null, posts: null,
        visits: null, pageviews: null, subscribers, opens: null, clicks, campaignsSent,
        mentions: null, prReach: null,
        outboundClicks: null, ctr: null, retention: null, watchTime: null,
        newViewers: null, returningViewers: null, prPageViews: null, clippingValue: null,
        trafficSources: '', mailingLink: '',
        openRate, churnRate, newLeads,
        notes: '', updatedAt: new Date().toISOString(), updatedBy: 'seed'
      }).write();
    });

    // Assessoria de imprensa
    months.forEach((month) => {
      seedCounter++;
      const r = seededRandom(seedCounter);
      const mentions = Math.round((1 + r * 5) * brandFactor);
      const prReach = Math.round(mentions * (15000 + r * 40000) * yearFactor);
      const prPageViews = Math.round(prReach * (0.08 + r * 0.05));
      const clippingValue = Math.round(mentions * (2000 + r * 8000) * brandFactor);
      const pressCost = Math.round(3500 * brandFactor);
      db.get('metrics').push({
        id: nanoid(), brand, channel: 'assessoria', year, month,
        followers: null, followersGained: null, reach: null, impressions: null, engagement: null, posts: null,
        visits: null, pageviews: null, subscribers: null, opens: null, clicks: null, campaignsSent: null,
        mentions, prReach,
        outboundClicks: null, ctr: null, retention: null, watchTime: null,
        newViewers: null, returningViewers: null,
        prPageViews, clippingValue, pressCost,
        trafficSources: '', mailingLink: '',
        notes: '', updatedAt: new Date().toISOString(), updatedBy: 'seed'
      }).write();
    });
    // Casoca (catálogo B2B) — exclusivo De Bacco
    if (brand === 'debacco') {
      months.forEach((month) => {
        seedCounter++;
        const r = seededRandom(seedCounter);
        const growthIdx = (year - 2025) * 12 + month;
        const productVisits = Math.round((4200 + growthIdx * 420) * yearFactor * (0.9 + r * 0.3));
        const channelVisits = Math.round(300 + r * 400);
        const visits = productVisits + channelVisits;
        const downloads = Math.round(4400 + r * 1200);
        const uniqueVisitors = Math.round(visits * (0.75 + r * 0.15));
        const newUsers = Math.round(uniqueVisitors * (0.55 + r * 0.15));
        const downloaders = Math.round(uniqueVisitors * (0.35 + r * 0.1));
        const siteContacts = Math.round(10 + r * 20);
        db.get('metrics').push({
          id: nanoid(), brand, channel: 'casoca', year, month,
          followers: null, followersGained: null, reach: null, impressions: null, engagement: null, posts: null,
          visits, pageviews: null, subscribers: null, opens: null, clicks: null, campaignsSent: null,
          mentions: null, prReach: null, outboundClicks: null, ctr: null, retention: null, watchTime: null,
          prPageViews: null, clippingValue: null, retentionTime: null, engagementRate: null,
          seoClicks: null, seoImpressions: null, seoCtr: null, avgPosition: null, buttonClicksTotal: null,
          keywords: '', demographics: '', activeUsers: null, sessions: null, avgEngagementTime: null,
          eventCount: null, retentionRate: null, trafficSources: '', mailingLink: '', city: '', country: '',
          productVisits, channelVisits, downloads, uniqueVisitors,
          newUsers, returningUsers: uniqueVisitors - newUsers, downloaders,
          contacts: siteContacts, whatsappContacts: 0, siteContacts,
          planCost: 970,
          rankLousasMetais: [1, 3, 5, 5][month % 4], rankEletros: [7, 6, 7, 7][month % 4],
          topProfessions: 'Arquiteto 55% visitas / 48% downloads · Est. de Arquitetura 20% / 27% · Designer de Interiores 10% / 14%',
          topStates: 'São Paulo, Minas Gerais, Paraná, Santa Catarina, Rio Grande do Sul',
          downloadFormats: 'Sketchup (99,5%), Catálogo PDF (0,5%)',
          competitiveNotes: 'Louças e Metais: 4º de 30 marcas (caiu do 1º em jan). Eletros: 7º de 16 marcas.',
          notes: '', updatedAt: new Date().toISOString(), updatedBy: 'seed'
        }).write();
      });
    }
  });


  const contentExamples = [
    { channel: 'youtube', title: 'Tutorial completo - episódio especial', format: 'Vídeo longo', reach: 22000, engagement: 3100, likes: 1800, comments: 210, shares: 90, views: 26500 },
    { channel: 'blog', title: 'Guia definitivo do tema principal da marca', format: 'Artigo de blog', reach: 5400, engagement: 410, likes: 0, comments: 32, shares: 0, views: 6100 },
    { channel: 'newsletter', title: 'Edição especial de aniversário', format: 'Campanha', reach: 1400, engagement: 520, likes: 0, comments: 0, shares: 0 }
  ];

  contentExamples.forEach((c) => {
    db.get('content').push({
      id: nanoid(),
      brand,
      channel: c.channel,
      year: CURRENT_YEAR,
      month: CURRENT_MONTH,
      title: c.title,
      url: '',
      format: c.format,
      reach: Math.round((c.reach || 0) * brandFactor),
      engagement: Math.round((c.engagement || 0) * brandFactor),
      likes: Math.round((c.likes || 0) * brandFactor),
      comments: Math.round((c.comments || 0) * brandFactor),
      shares: Math.round((c.shares || 0) * brandFactor),
      views: c.views ? Math.round(c.views * brandFactor) : null,
      vehicle: '', mediaType: '', uf: '', value: null, publishDate: '',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedBy: 'seed'
    }).write();
  });

  // Vídeos em destaque do TikTok (campos próprios: tempo de visualização, % que assistiu completo, novos seguidores, patrocinado)
  const tiktokVideos = [
    { title: 'Vídeo tendência com trilha viral', format: 'Vídeo curto', views: 210000, watch: 14, completion: 62.5, newFollowers: 1850, sponsored: false },
    { title: 'Parceria com influenciador da categoria', format: 'Vídeo curto', views: 95000, watch: 11, completion: 48.2, newFollowers: 620, sponsored: true },
    { title: 'Bastidores da produção', format: 'Vídeo curto', views: 41000, watch: 9, completion: 55.7, newFollowers: 210, sponsored: false }
  ];
  tiktokVideos.forEach((v) => {
    db.get('content').push({
      id: nanoid(), brand, channel: 'tiktok', year: CURRENT_YEAR, month: CURRENT_MONTH,
      title: v.title, url: '', format: v.format,
      reach: null, engagement: null, likes: null, comments: null, shares: null,
      views: Math.round(v.views * brandFactor),
      vehicle: '', mediaType: '', uf: '', value: null, publishDate: '',
      avgWatchTime: v.watch, completionRate: v.completion,
      videoNewFollowers: Math.round(v.newFollowers * brandFactor),
      sponsored: v.sponsored,
      notes: '', createdAt: new Date().toISOString(), updatedBy: 'seed'
    }).write();
  });

  // Posts em destaque do Instagram (campos próprios: espectadores, salvos, cliques no link,
  // seguidores vindos da publicação, tempo de visualização, e Orgânico x Tráfego pago)
  const instagramPosts = [
    { title: 'Reel dos bastidores da produção', format: 'Reel', reach: 48200, views: 61000, viewers: 44500, engagement: 5100, likes: 4200, comments: 310, shares: 590, saved: 780, linkClicks: 210, newFollowers: 340, watchTime: 9, traffic: 'Orgânico' },
    { title: 'Carrossel de antes/depois', format: 'Carrossel', reach: 31500, views: 35800, viewers: 29200, engagement: 3400, likes: 2900, comments: 180, shares: 320, saved: 610, linkClicks: 0, newFollowers: 120, watchTime: null, traffic: 'Orgânico' },
    { title: 'Campanha impulsionada — lançamento de linha', format: 'Reel', reach: 62000, views: 78000, viewers: 58000, engagement: 6800, likes: 5600, comments: 240, shares: 410, saved: 520, linkClicks: 890, newFollowers: 610, watchTime: 7, traffic: 'Tráfego pago' }
  ];
  instagramPosts.forEach((p) => {
    db.get('content').push({
      id: nanoid(), brand, channel: 'instagram', year: CURRENT_YEAR, month: CURRENT_MONTH,
      title: p.title, url: 'https://www.instagram.com/p/exemplo/', format: p.format,
      reach: Math.round(p.reach * brandFactor), engagement: Math.round(p.engagement * brandFactor),
      likes: Math.round(p.likes * brandFactor), comments: Math.round(p.comments * brandFactor), shares: Math.round(p.shares * brandFactor),
      views: Math.round(p.views * brandFactor),
      vehicle: '', mediaType: '', uf: '', value: null, publishDate: '',
      viewers: Math.round(p.viewers * brandFactor), savedCount: Math.round(p.saved * brandFactor),
      linkClicks: p.linkClicks ? Math.round(p.linkClicks * brandFactor) : 0,
      postNewFollowers: Math.round(p.newFollowers * brandFactor), postWatchTime: p.watchTime,
      trafficType: p.traffic,
      notes: '', createdAt: new Date().toISOString(), updatedBy: 'seed'
    }).write();
  });

  // Posts em destaque do Facebook (mesmos campos do Instagram: espectadores, salvos, cliques no link,
  // seguidores vindos da publicação, tempo de visualização, e Orgânico x Tráfego pago)
  const facebookPosts = [
    { title: 'Live de lançamento de produto', format: 'Live', reach: 18700, views: 22400, viewers: 16800, engagement: 2200, likes: 1500, comments: 260, shares: 140, saved: 190, linkClicks: 320, newFollowers: 95, watchTime: 12, traffic: 'Orgânico' },
    { title: 'Vídeo institucional da marca', format: 'Vídeo', reach: 14200, views: 17600, viewers: 12900, engagement: 1600, likes: 1150, comments: 90, shares: 210, saved: 140, linkClicks: 0, newFollowers: 60, watchTime: 8, traffic: 'Orgânico' },
    { title: 'Campanha patrocinada — linha nova', format: 'Carrossel', reach: 39500, views: 46000, viewers: 34000, engagement: 4100, likes: 3200, comments: 150, shares: 260, saved: 310, linkClicks: 720, newFollowers: 410, watchTime: null, traffic: 'Tráfego pago' }
  ];
  facebookPosts.forEach((p) => {
    db.get('content').push({
      id: nanoid(), brand, channel: 'facebook', year: CURRENT_YEAR, month: CURRENT_MONTH,
      title: p.title, url: 'https://www.facebook.com/exemplo/posts/123', format: p.format,
      reach: Math.round(p.reach * brandFactor), engagement: Math.round(p.engagement * brandFactor),
      likes: Math.round(p.likes * brandFactor), comments: Math.round(p.comments * brandFactor), shares: Math.round(p.shares * brandFactor),
      views: Math.round(p.views * brandFactor),
      vehicle: '', mediaType: '', uf: '', value: null, publishDate: '',
      viewers: Math.round(p.viewers * brandFactor), savedCount: Math.round(p.saved * brandFactor),
      linkClicks: p.linkClicks ? Math.round(p.linkClicks * brandFactor) : 0,
      postNewFollowers: Math.round(p.newFollowers * brandFactor), postWatchTime: p.watchTime,
      trafficType: p.traffic,
      notes: '', createdAt: new Date().toISOString(), updatedBy: 'seed'
    }).write();
  });

  // Pins em destaque do Pinterest — exclusivo De Bacco (Pinterest não aparece na GhelPlus)
  if (brand === 'debacco') {
    const pinterestPosts = [
      { title: 'Pin de inspiração — cozinha compacta', format: 'Pin estático', impressions: 38000, pinClicks: 1450, saved: 920, outbound: 610, comments: 24, reactions: 780 },
      { title: 'Vídeo Pin — instalação da cuba', format: 'Vídeo Pin', impressions: 26500, pinClicks: 1080, saved: 640, outbound: 430, comments: 15, reactions: 520 },
      { title: 'Pin de coleção — linha de torneiras', format: 'Pin estático', impressions: 19800, pinClicks: 720, saved: 410, outbound: 260, comments: 8, reactions: 340 }
    ];
    pinterestPosts.forEach((p) => {
      db.get('content').push({
        id: nanoid(), brand, channel: 'pinterest', year: CURRENT_YEAR, month: CURRENT_MONTH,
        title: p.title, url: 'https://www.pinterest.com/pin/exemplo/', format: p.format,
        reach: null, engagement: null, likes: Math.round(p.reactions * brandFactor),
        comments: Math.round(p.comments * brandFactor), shares: null, views: null,
        vehicle: '', mediaType: '', uf: '', value: null, publishDate: '',
        impressions: Math.round(p.impressions * brandFactor), pinClicks: Math.round(p.pinClicks * brandFactor),
        savedCount: Math.round(p.saved * brandFactor), outboundClicks: Math.round(p.outbound * brandFactor),
        notes: '', createdAt: new Date().toISOString(), updatedBy: 'seed'
      }).write();
    });
  }

  // Posts em destaque do LinkedIn — exclusivo GhelPlus (LinkedIn não aparece na De Bacco)
  if (brand === 'ghelplus') {
    const linkedinPosts = [
      { title: 'Bastidores da fábrica — case de qualidade', postType: 'Vídeo', traffic: 'Orgânico', audience: 22000, impressions: 18500, views: 9200, clicks: 410, ctr: 2.2, engagementRate: 4.8, likes: 620, comments: 34, shares: 58, newFollowers: 45 },
      { title: 'Anúncio de nova linha de produtos', postType: 'Carrossel', traffic: 'Patrocinado', audience: 41000, impressions: 35800, views: 15600, clicks: 980, ctr: 2.7, engagementRate: 5.6, likes: 890, comments: 52, shares: 96, newFollowers: 130 },
      { title: 'Artigo técnico sobre inovação no setor', postType: 'Estático', traffic: 'Orgânico', audience: 12500, impressions: 10200, views: 4100, clicks: 180, ctr: 1.8, engagementRate: 3.4, likes: 340, comments: 21, shares: 29, newFollowers: 18 }
    ];
    linkedinPosts.forEach((p) => {
      db.get('content').push({
        id: nanoid(), brand, channel: 'linkedin', year: CURRENT_YEAR, month: CURRENT_MONTH,
        title: p.title, url: 'https://www.linkedin.com/feed/update/exemplo/', format: '',
        reach: null, engagement: null,
        likes: Math.round(p.likes * brandFactor), comments: Math.round(p.comments * brandFactor), shares: Math.round(p.shares * brandFactor),
        views: Math.round(p.views * brandFactor),
        vehicle: '', mediaType: '', uf: '', value: null, publishDate: '',
        postType: p.postType, trafficType: p.traffic,
        audience: Math.round(p.audience * brandFactor), impressions: Math.round(p.impressions * brandFactor),
        clicks: Math.round(p.clicks * brandFactor), ctr: p.ctr, engagementRate: p.engagementRate,
        postNewFollowers: Math.round(p.newFollowers * brandFactor),
        notes: '', createdAt: new Date().toISOString(), updatedBy: 'seed'
      }).write();
    });
  }

  // Páginas mais acessadas do site (exemplo, em alguns meses diferentes, para o gráfico "Páginas mais acessadas")
  const sitePages = [
    { title: 'Página inicial', views: 42000, source: 'Direto', region: 'São Paulo, SP', clicks: 1800, bounce: 38.5, button: 'Fale conosco no WhatsApp' },
    { title: '/produtos/cubas-inox', views: 27500, source: 'Busca orgânica', region: 'Rio de Janeiro, RJ', clicks: 1200, bounce: 44.2, button: 'Onde comprar' },
    { title: '/blog/guia-cozinhas-pequenas', views: 18300, source: 'Redes sociais', region: 'Curitiba, PR', clicks: 640, bounce: 52.1, button: 'Baixar guia em PDF' },
    { title: '/onde-comprar', views: 12800, source: 'Anúncios', region: 'São Paulo, SP', clicks: 980, bounce: 35.7, button: 'Ver lojas próximas' },
    { title: '/produtos/torneiras', views: 9600, source: 'Busca orgânica', region: 'Belo Horizonte, MG', clicks: 410, bounce: 47.9, button: 'Onde comprar' }
  ];
  const pageMonths = [CURRENT_MONTH, Math.max(1, CURRENT_MONTH - 2), Math.max(1, CURRENT_MONTH - 4)];
  sitePages.forEach((p, pIdx) => {
    [...new Set(pageMonths)].forEach((m, mIdx) => {
      const variance = 0.75 + seededRandom(pIdx * 10 + mIdx) * 0.5;
      db.get('content').push({
        id: nanoid(), brand, channel: 'site', year: CURRENT_YEAR, month: m,
        title: p.title, url: '', format: 'Página',
        reach: null, engagement: null, likes: null, comments: null, shares: null,
        views: Math.round(p.views * brandFactor * variance),
        vehicle: '', mediaType: '', uf: '', value: null, publishDate: '',
        pageTrafficSource: p.source, region: p.region, scrollDepth: Math.round(55 + Math.random() * 30), buttonClicks: Math.round(p.clicks * brandFactor * variance),
        buttonName: p.button,
        pageActiveUsers: Math.round(p.views * brandFactor * variance * 0.72), pageEventCount: Math.round(p.views * brandFactor * variance * 2.3), pageBounceRate: p.bounce,
        notes: '', createdAt: new Date().toISOString(), updatedBy: 'seed'
      }).write();
    });
  });

  // Matérias de imprensa (exemplo, para os gráficos de tipo de veículo e estado)
  const pressExamples = [
    { title: 'Cozinhas compactas: pia e fogão em um só lugar', vehicle: 'Casa', mediaType: 'Online', uf: 'SP', value: 6377.8, publishDate: `${CURRENT_YEAR}-05-13` },
    { title: 'Metais para banheiros e cozinhas', vehicle: 'Revista Anamaco', mediaType: 'Revista', uf: 'SP', value: 2492.6, publishDate: `${CURRENT_YEAR}-05-01` },
    { title: 'Empresas paranaenses brilham em Milão', vehicle: 'Afina Menina', mediaType: 'Online', uf: 'SP', value: 5425.2, publishDate: `${CURRENT_YEAR}-04-24` },
    { title: 'Ranking Nacional das Lojas de Material de Construção', vehicle: 'Revista Anamaco', mediaType: 'Revista', uf: 'SP', value: 1899.12, publishDate: `${CURRENT_YEAR}-04-01` },
    { title: 'KAZA', vehicle: 'KAZA', mediaType: 'Social', uf: '', value: 0, publishDate: `${CURRENT_YEAR}-03-28` },
    { title: 'Como limpar cuba de inox: guia completo', vehicle: 'Casa', mediaType: 'Online', uf: 'SP', value: 9312.6, publishDate: `${CURRENT_YEAR}-03-18` },
    { title: 'É tempo de renovar', vehicle: 'Revista Revenda', mediaType: 'Revista', uf: 'SP', value: 28378.92, publishDate: `${CURRENT_YEAR}-03-01` },
    { title: 'Ranking 2026', vehicle: 'Revista Anamaco', mediaType: 'Online', uf: 'SP', value: 22140.8, publishDate: `${CURRENT_YEAR}-02-27` },
    { title: 'Nas cozinhas sofisticadas sempre falta alguma coisa', vehicle: 'Revista Móveis de Valor', mediaType: 'Revista', uf: 'PR', value: 1010.14, publishDate: `${CURRENT_YEAR}-05-01` },
    { title: 'Adega em dia: como armazenar vinhos do jeito certo', vehicle: 'Portal Metrópoles', mediaType: 'Online', uf: 'DF', value: 7101.6, publishDate: `${CURRENT_YEAR}-01-05` },
    { title: 'Republicação no blog institucional do grupo', vehicle: 'Site próprio', mediaType: 'Site', uf: 'SP', value: 0, publishDate: `${CURRENT_YEAR}-02-14` }
  ];
  pressExamples.forEach((p) => {
    db.get('content').push({
      id: nanoid(), brand, channel: 'assessoria',
      year: Number(p.publishDate.slice(0, 4)), month: Number(p.publishDate.slice(5, 7)),
      title: p.title, url: '', format: '',
      reach: null, engagement: null, likes: null, comments: null, shares: null, views: null,
      vehicle: p.vehicle, mediaType: p.mediaType, uf: p.uf, value: Math.round(p.value * brandFactor * 100) / 100, publishDate: p.publishDate,
      notes: '', createdAt: new Date().toISOString(), updatedBy: 'seed'
    }).write();
  });

  // Produtos em destaque do Casoca (exemplo, baseado no relatório real) — exclusivo De Bacco
  if (brand === 'debacco') {
    const casocaProducts = [
      { title: 'Cuba Quadratino 700', type: 'Cubas de Cozinha', uf: 'SP', views: 1300, downloads: 1024 },
      { title: 'Cuba Funzionale 235', type: 'Cubas de Cozinha', uf: 'SP', views: 900, downloads: 772 },
      { title: 'Cuba Funzionale 239', type: 'Cubas de Cozinha', uf: 'MG', views: 800, downloads: 611 },
      { title: 'Refrigerador Four Door', type: 'Eletrodomésticos', uf: 'SP', views: 700, downloads: 486 },
      { title: 'Cuba Quadratino 500', type: 'Cubas de Cozinha', uf: 'PR', views: 700, downloads: 571 },
      { title: 'Cuba Quadratino 600', type: 'Cubas de Cozinha', uf: 'SC', views: 600, downloads: 602 },
      { title: 'Canal Organizador Úmido', type: 'Acessórios De Cozinha', uf: 'SP', views: 600, downloads: 547 },
      { title: 'Adega 31 Garrafas', type: 'Adegas', uf: 'RS', views: 500, downloads: 340 }
    ];
    casocaProducts.forEach((p) => {
      db.get('content').push({
        id: nanoid(), brand, channel: 'casoca', year: CURRENT_YEAR, month: CURRENT_MONTH,
        title: p.title, url: '', format: p.type,
        reach: null, engagement: null, likes: null, comments: null, shares: null,
        views: p.views, downloads: p.downloads, uf: p.uf, value: null, publishDate: '',
        notes: '', createdAt: new Date().toISOString(), updatedBy: 'seed'
      }).write();
    });
  }

  db.get('settings').push({
    brand,
    tagline: brand === 'ghelplus' ? 'GHELPLUS · RESULTADOS DIGITAIS · ' + CURRENT_YEAR : 'DE BACCO · RESULTADOS DIGITAIS · ' + CURRENT_YEAR,
    updatedAt: new Date().toISOString(),
    updatedBy: 'seed'
  }).write();
});

console.log('Seed concluído! Marcas: ' + BRANDS.join(', ') + ' | Anos: ' + YEARS.join(', '));
