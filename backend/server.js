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

const assets = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 'R$ 621.480,20', change: '+3,84%', direction: 'up', icon: '₿', color: 'btc', points: 'M0,23 C12,24 20,10 31,17 S50,7 62,14 S79,4 94,2' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', price: 'R$ 18.942,70', change: '+2,19%', direction: 'up', icon: '◆', color: 'eth', points: 'M0,25 C15,21 19,22 30,14 S48,18 59,10 S76,12 94,3' },
  { symbol: 'USD', name: 'Dólar americano', type: 'fiat', price: 'R$ 5,2841', change: '-0,42%', direction: 'down', icon: '$', color: 'usd', points: 'M0,5 C14,7 21,4 32,13 S48,8 60,16 S78,11 94,25' },
  { symbol: 'EUR', name: 'Euro', type: 'fiat', price: 'R$ 6,1087', change: '+0,16%', direction: 'up', icon: '€', color: 'eur', points: 'M0,21 C10,17 20,22 30,16 S46,18 60,12 S78,15 94,9' }
];

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
    return sendJson(response, 200, { success: true, updated_at: new Date().toISOString(), assets });
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
