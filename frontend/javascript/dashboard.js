import { getCurrentUser, signOut } from './session-user.js';

const DEFAULT_PORTFOLIO = {};
const DEFAULT_FAVORITE_SYMBOLS = ['BTC', 'ETH', 'USD', 'EUR'];
const FALLBACK_MARKET_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 'R$ 612.340,12', change: '+3,21%', direction: 'up', icon: '₿', color: 'btc', points: 'M0,23 C12,24 20,10 31,17 S50,7 62,14 S79,4 94,2' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', price: 'R$ 23.487,56', change: '+2,15%', direction: 'up', icon: '◆', color: 'eth', points: 'M0,25 C15,21 19,22 30,14 S48,18 59,10 S76,12 94,3' },
  { symbol: 'USD', name: 'Dólar Americano', type: 'fiat', price: 'R$ 5,32', change: '+0,45%', direction: 'up', icon: '$', color: 'usd', points: 'M0,5 C14,7 21,4 32,13 S48,8 60,16 S78,11 94,25' },
  { symbol: 'EUR', name: 'Euro', type: 'fiat', price: 'R$ 6,14', change: '+0,28%', direction: 'up', icon: '€', color: 'eur', points: 'M0,21 C10,17 20,22 30,16 S46,18 60,12 S78,15 94,9' },
];

let marketAssets = [];
let userFavorites = [];
let assetHistories = {};

function formatDate(date) {
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function updateDateTime() {
  const now = new Date();
  const dateEl = document.querySelector('#dashDate');
  const timeEl = document.querySelector('#dashTime');
  if (dateEl) dateEl.textContent = formatDate(now);
  if (timeEl) timeEl.textContent = formatTime(now);
}

function parseBRLPrice(price) {
  const cleaned = String(price).replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function parseChangePercent(change) {
  const normalized = String(change).trim();
  const num = parseFloat(normalized.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
  return normalized.startsWith('-') ? -Math.abs(num) : num;
}

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function coinIcon(asset) {
  const icons = {
    BTC: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#f7931a"/><text x="16" y="22" text-anchor="middle" fill="#fff" font-size="17" font-family="Arial, sans-serif" font-weight="700">₿</text></svg>',
    ETH: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#627eea"/><path d="M16 5 10 16l6 3.5 6-3.5L16 5Z" fill="#fff" opacity=".95"/><path d="m16 21-6-3 6 9 6-9-6 3Z" fill="#d7ddff"/><path d="m16 19.5 6-3.5-6-2.8-6 2.8 6 3.5Z" fill="#b8c4ff"/></svg>',
    USD: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#45ad72"/><text x="16" y="22" text-anchor="middle" fill="#fff" font-size="17" font-family="Arial, sans-serif" font-weight="700">$</text></svg>',
    EUR: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#2d91df"/><text x="16" y="22" text-anchor="middle" fill="#fff" font-size="17" font-family="Arial, sans-serif" font-weight="700">€</text></svg>',
  };
  return icons[asset.symbol] || `<span>${asset.icon || asset.symbol.slice(0, 1)}</span>`;
}

function getPortfolio(userId) {
  const key = `moedax_portfolio_${userId}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      /* fallback */
    }
  }
  localStorage.setItem(key, JSON.stringify(DEFAULT_PORTFOLIO));
  return { ...DEFAULT_PORTFOLIO };
}

function getUserFavoriteSymbols(userId, assets) {
  const key = `moedax_favorites_${userId}`;
  const availableSymbols = new Set(assets.map((asset) => asset.symbol));
  const defaults = DEFAULT_FAVORITE_SYMBOLS.filter((symbol) => availableSymbols.has(symbol));
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}

async function fetchMarketAssets() {
  const apiUrls = ['/api/assets', 'http://localhost:3000/api/assets'];
  for (const apiUrl of apiUrls) {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) continue;
      const data = await response.json();
      if (data.assets?.length) return data.assets;
    } catch {
      /* tenta a próxima fonte */
    }
  }
  return FALLBACK_MARKET_ASSETS;
}

async function fetchAssetHistories(assets) {
  const results = await Promise.all(assets.map(async (asset) => {
    for (const url of [`/api/history?symbol=${asset.symbol}&period=24h`, `http://localhost:3000/api/history?symbol=${asset.symbol}&period=24h`]) {
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.history?.length) return [asset.symbol, data.history];
      } catch { /* mantém a curva de fallback */ }
    }
    return [asset.symbol, []];
  }));
  assetHistories = Object.fromEntries(results);
}

function historyPath(symbol, fallback) {
  const points = assetHistories[symbol];
  if (!points?.length) return fallback;
  const values = points.map((point) => point.price);
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  return points.map((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * 94;
    const y = 26 - ((point.price - min) / range) * 22;
    return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function applyUserToPage(user) {
  const map = {
    '#welcomeUserName': user.firstName,
    '#topbarUserName': user.fullName,
    '#sidebarUserName': user.fullName,
    '#sidebarUserRole': user.accountLabel,
    '#userMenuName': user.fullName,
    '#userMenuEmail': user.email || '—',
  };
  Object.entries(map).forEach(([selector, text]) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  });
  document.querySelectorAll('[data-user-initials]').forEach((el) => {
    el.textContent = user.initials;
  });
  document.title = `MoedaX | Olá, ${user.firstName}`;
}

function computeBalance(assets, portfolio) {
  return assets.reduce((total, asset) => {
    const qty = portfolio[asset.symbol] || 0;
    return total + parseBRLPrice(asset.price) * qty;
  }, 0);
}

function computePortfolioChange(assets, portfolio) {
  let weightedSum = 0;
  let totalWeight = 0;
  assets.forEach((asset) => {
    const qty = portfolio[asset.symbol] || 0;
    const weight = parseBRLPrice(asset.price) * qty;
    if (weight <= 0) return;
    weightedSum += parseChangePercent(asset.change) * weight;
    totalWeight += weight;
  });
  return totalWeight ? weightedSum / totalWeight : 0;
}

function computeAverageChange(assets) {
  if (!assets.length) return 0;
  const sum = assets.reduce((acc, asset) => acc + parseChangePercent(asset.change), 0);
  return sum / assets.length;
}

function updateStats(assets, favorites, portfolio) {
  const balanceEl = document.querySelector('#statBalance');
  const balanceMetaEl = document.querySelector('#statBalanceMeta');
  const trackedEl = document.querySelector('#statTracked');
  const variationEl = document.querySelector('#statVariation');
  const navCountEl = document.querySelector('#navMarketsCount');

  const balance = computeBalance(favorites, portfolio);
  const portfolioChange = computePortfolioChange(favorites, portfolio);
  const avgChange = computeAverageChange(favorites);

  if (balanceEl) balanceEl.textContent = formatBRL(balance);
  if (trackedEl) trackedEl.textContent = String(favorites.length);
  if (navCountEl) navCountEl.textContent = String(assets.length);

  if (balanceMetaEl) {
    const isUp = portfolioChange >= 0;
    balanceMetaEl.className = `dash-stat-meta${isUp ? '' : ' negative'}`;
    balanceMetaEl.innerHTML = `<i data-lucide="trending-${isUp ? 'up' : 'down'}"></i> ${formatPercent(portfolioChange)} hoje`;
  }

  if (variationEl) {
    const isUp = avgChange >= 0;
    variationEl.textContent = formatPercent(avgChange);
    variationEl.classList.toggle('positive', isUp);
    variationEl.classList.toggle('negative', !isUp);
  }
}

function renderFavorites(list = userFavorites) {
  const grid = document.querySelector('#favoriteCards');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = '<p class="dash-empty">Nenhuma moeda favorita encontrada.</p>';
    return;
  }

  grid.innerHTML = list
    .map(
      (coin) => `
    <article class="fav-card" data-symbol="${coin.symbol}" data-name="${coin.name.toLowerCase()}">
      <div class="fav-card-top">
        <div class="fav-asset">
          <span class="fav-icon ${coin.color}">${coinIcon(coin)}</span>
          <div>
            <strong>${coin.name}</strong>
            <span>${coin.symbol}</span>
          </div>
        </div>
        <button type="button" class="fav-star is-active" aria-label="Remover ${coin.name} dos favoritos">
          <i data-lucide="star"></i>
        </button>
      </div>
      <p class="fav-price">${coin.price}</p>
      <div class="fav-foot">
        <span class="fav-change ${coin.direction === 'up' ? 'up' : 'down'}">
          <i data-lucide="trending-${coin.direction === 'up' ? 'up' : 'down'}"></i> ${coin.change}
        </span>
        <svg class="fav-sparkline ${coin.direction === 'down' ? 'down' : ''}" viewBox="0 0 94 30" preserveAspectRatio="none" aria-hidden="true">
          <path d="${historyPath(coin.symbol, coin.points)}" />
        </svg>
      </div>
    </article>
  `
    )
    .join('');

  window.lucide?.createIcons({ nodes: [grid] });
}

function bindSearch() {
  const input = document.querySelector('#dashSearch');
  if (!input) return;
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    const filtered = userFavorites.filter(
      (coin) => coin.symbol.toLowerCase().includes(query) || coin.name.toLowerCase().includes(query)
    );
    renderFavorites(filtered);
  });
}

function bindUserMenu() {
  const toggle = document.querySelector('#userMenuToggle');
  const menu = document.querySelector('#userMenu');
  const logoutBtn = document.querySelector('#logoutBtn');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    toggle.setAttribute('aria-expanded', String(!menu.hidden));
  });

  document.addEventListener('click', () => {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  });

  logoutBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    signOut();
  });
}

function bindSidebar() {
  const shell = document.querySelector('.app-shell');
  const sidebar = document.querySelector('#sidebar');
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

  if (localStorage.getItem('moedax_sidebar_collapsed') === '1' && !isMobile()) {
    shell?.classList.add('sidebar-collapsed');
  }

  document.querySelector('#sidebarBrandToggle')?.addEventListener('click', () => {
    if (isMobile()) {
      sidebar?.classList.toggle('open');
      return;
    }
    shell?.classList.toggle('sidebar-collapsed');
    localStorage.setItem(
      'moedax_sidebar_collapsed',
      shell?.classList.contains('sidebar-collapsed') ? '1' : '0'
    );
  });

  document.querySelector('#sidebarExpandToggle')?.addEventListener('click', () => {
    shell?.classList.remove('sidebar-collapsed');
    localStorage.setItem('moedax_sidebar_collapsed', '0');
  });

  document.querySelector('#menuToggle')?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
  });

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => sidebar?.classList.remove('open'));
  });
}

export async function initDashboard() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.replace('login.html');
    return;
  }

  applyUserToPage(user);
  updateDateTime();
  setInterval(updateDateTime, 30_000);

  marketAssets = await fetchMarketAssets();
  await fetchAssetHistories(marketAssets);
  const favoriteSymbols = getUserFavoriteSymbols(user.id, marketAssets);
  userFavorites = marketAssets.filter((asset) => favoriteSymbols.includes(asset.symbol));
  const portfolio = getPortfolio(user.id);

  updateStats(marketAssets, userFavorites, portfolio);
  renderFavorites();
  bindSearch();
  bindUserMenu();
  bindSidebar();
  window.lucide?.createIcons();
}
