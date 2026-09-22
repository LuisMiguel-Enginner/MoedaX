const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  /* dotenv opcional até npm install */
}

const port = process.env.PORT || 3000;
const frontendRoot = path.join(__dirname, '..', 'frontend');

function syncSupabaseConfigFile() {
  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) return;
  const target = path.join(frontendRoot, 'supabase-config.json');
  fs.writeFileSync(target, `${JSON.stringify({ url, anonKey }, null, 2)}\n`, 'utf8');
}

const fallbackAssets = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 'R$ 621.480,20', change: '+3,84%', direction: 'up', icon: '₿', color: 'btc', points: 'M0,23 C12,24 20,10 31,17 S50,7 62,14 S79,4 94,2' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', price: 'R$ 18.942,70', change: '+2,19%', direction: 'up', icon: '◆', color: 'eth', points: 'M0,25 C15,21 19,22 30,14 S48,18 59,10 S76,12 94,3' },
  { symbol: 'USD', name: 'Dólar americano', type: 'fiat', price: 'R$ 5,2841', change: '-0,42%', direction: 'down', icon: '$', color: 'usd', points: 'M0,5 C14,7 21,4 32,13 S48,8 60,16 S78,11 94,25' },
  { symbol: 'EUR', name: 'Euro', type: 'fiat', price: 'R$ 6,1087', change: '+0,16%', direction: 'up', icon: '€', color: 'eur', points: 'M0,21 C10,17 20,22 30,16 S46,18 60,12 S78,15 94,9' }
];

let marketCache = { assets: fallbackAssets, updatedAt: 0 };
const cryptoIds = { BTC: 'bitcoin', ETH: 'ethereum' };

function formatBRL(value, decimals = 2) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPercent(value) {
  const number = Number(value) || 0;
  return `${number >= 0 ? '+' : ''}${number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

async function fetchLiveAssets() {
  if (Date.now() - marketCache.updatedAt < 60_000) return marketCache.assets;

  try {
    const [cryptoResponse, ratesResponse] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true'),
      fetch('https://open.er-api.com/v6/latest/BRL'),
    ]);
    if (!cryptoResponse.ok || !ratesResponse.ok) throw new Error('Serviço de cotações indisponível');

    const crypto = await cryptoResponse.json();
    const rates = await ratesResponse.json();
    const usdRate = 1 / Number(rates.rates.USD);
    const eurRate = 1 / Number(rates.rates.EUR);
    const liveAssets = [
      { ...fallbackAssets[0], price: formatBRL(crypto.bitcoin.brl), change: formatPercent(crypto.bitcoin.brl_24h_change), direction: crypto.bitcoin.brl_24h_change >= 0 ? 'up' : 'down' },
      { ...fallbackAssets[1], price: formatBRL(crypto.ethereum.brl), change: formatPercent(crypto.ethereum.brl_24h_change), direction: crypto.ethereum.brl_24h_change >= 0 ? 'up' : 'down' },
      { ...fallbackAssets[2], price: formatBRL(usdRate, 4), change: '+0,00%', direction: 'up' },
      { ...fallbackAssets[3], price: formatBRL(eurRate, 4), change: '+0,00%', direction: 'up' },
    ];
    marketCache = { assets: liveAssets, updatedAt: Date.now() };
    return liveAssets;
  } catch (error) {
    console.warn(`Cotações ao vivo indisponíveis: ${error.message}`);
    return marketCache.assets;
  }
}

function fallbackHistory(asset, period) {
  const points = period === '1h' ? 12 : period === '24h' ? 24 : period === '3d' ? 36 : period === '15d' ? 45 : 60;
  const current = Number(String(asset.price).replace(/[^\d,]/g, '').replace(',', '.')) || 1;
  const change = Number(String(asset.change).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
  return Array.from({ length: points }, (_, index) => {
    const progress = index / (points - 1);
    const wave = Math.sin(index * 1.7) * Math.abs(change || 0.4) * 0.12;
    return { timestamp: Date.now() - (points - index) * 3_600_000, price: current / (1 + (change / 100) * (1 - progress)) * (1 + wave / 100) };
  });
}

async function fetchAssetHistory(symbol, period) {
  const asset = (await fetchLiveAssets()).find((item) => item.symbol === symbol) || fallbackAssets.find((item) => item.symbol === symbol);
  const days = { '1h': 1, '24h': 1, '3d': 3, '15d': 15, '30d': 30 }[period] || 7;

  try {
    if (cryptoIds[symbol]) {
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${cryptoIds[symbol]}/market_chart?vs_currency=brl&days=${days}`);
      if (!response.ok) throw new Error('Histórico cripto indisponível');
      const data = await response.json();
      const cutoff = Date.now() - (period === '1h' ? 3_600_000 : period === '24h' ? 86_400_000 : days * 86_400_000);
      return data.prices.filter(([timestamp]) => timestamp >= cutoff).map(([timestamp, price]) => ({ timestamp, price }));
    }

    const end = new Date();
    const start = new Date(end.getTime() - days * 86_400_000);
    const formatDate = (date) => date.toISOString().slice(0, 10);
    const response = await fetch(`https://api.frankfurter.app/${formatDate(start)}..${formatDate(end)}?from=BRL&to=${symbol}`);
    if (!response.ok) throw new Error('Histórico cambial indisponível');
    const data = await response.json();
    return Object.entries(data.rates || {}).map(([date, rates]) => ({ timestamp: new Date(date).getTime(), price: 1 / Number(rates[symbol]) }));
  } catch (error) {
    console.warn(`Histórico ${symbol}/${period} indisponível: ${error.message}`);
    return fallbackHistory(asset, period);
  }
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  response.end(JSON.stringify(payload));
}

function serveFile(response, requestPath) {
  const safePath = path.normalize(requestPath).replace(/^([.][.][/\\])+/, '');
  if (safePath === '/') {
    response.writeHead(302, { Location: '/login.html' });
    response.end();
    return;
  }
  let relativePath = safePath.replace(/^\//, '');
  const filePath = path.join(frontendRoot, relativePath);
  if (!filePath.startsWith(frontendRoot)) return sendJson(response, 403, { error: 'Acesso negado' });

  fs.readFile(filePath, (error, content) => {
    if (error) return sendJson(response, 404, { error: 'Arquivo não encontrado' });
    const contentType = contentTypes[path.extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(content);
  });
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname === '/api/assets') {
    return fetchLiveAssets().then((assets) => {
      sendJson(response, 200, { success: true, updated_at: new Date().toISOString(), assets });
    });
  }

  if (requestUrl.pathname === '/api/history') {
    const symbol = requestUrl.searchParams.get('symbol')?.toUpperCase();
    const period = requestUrl.searchParams.get('period') || '24h';
    if (!['BTC', 'ETH', 'USD', 'EUR'].includes(symbol)) return sendJson(response, 400, { error: 'Ativo inválido' });
    return fetchAssetHistory(symbol, period).then((history) => {
      sendJson(response, 200, { success: true, symbol, period, history });
    });
  }

  if (requestUrl.pathname === '/api/supabase-config') {
    const url = process.env.SUPABASE_URL || '';
    const anonKey = process.env.SUPABASE_ANON_KEY || '';
    return sendJson(response, 200, { url, anonKey, configured: Boolean(url && anonKey) });
  }

  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Método não permitido' });
  serveFile(response, requestUrl.pathname);
});

syncSupabaseConfigFile();

server.listen(port, () => {
  console.log(`MoedaX disponível em http://localhost:${port}/login.html`);
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.warn('Aviso: configure SUPABASE_URL e SUPABASE_ANON_KEY no arquivo .env para autenticação.');
  }
});
