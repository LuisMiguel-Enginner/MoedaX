import { getCurrentUser, signOut } from './session-user.js';

const favorites = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 'R$ 612.340,12',
    change: '+3,21%',
    direction: 'up',
    icon: '₿',
    color: 'btc',
    points: 'M0,28 C12,26 18,18 28,20 S42,12 52,14 S68,8 80,6 S88,4 94,2',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    price: 'R$ 23.487,56',
    change: '+2,15%',
    direction: 'up',
    icon: '◆',
    color: 'eth',
    points: 'M0,24 C14,22 20,16 30,18 S46,10 58,12 S72,6 84,4 S90,3 94,2',
  },
  {
    symbol: 'USD',
    name: 'Dólar Americano',
    price: 'R$ 5,32',
    change: '+0,45%',
    direction: 'up',
    icon: '$',
    color: 'usd',
    points: 'M0,8 C12,10 20,14 32,12 S48,18 60,16 S76,22 88,20 S92,21 94,22',
  },
  {
    symbol: 'EUR',
    name: 'Euro',
    price: 'R$ 6,14',
    change: '+0,28%',
    direction: 'up',
    icon: '€',
    color: 'eur',
    points: 'M0,22 C10,20 18,16 28,18 S44,12 58,14 S72,8 86,6 S91,5 94,4',
  },
];

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

function applyUserToPage(user) {
  const map = {
    '#welcomeUserName': user.firstName,
    '#topbarUserName': user.fullName,
    '#sidebarUserName': user.fullName,
    '#sidebarUserRole': user.accountLabel,
  };
  Object.entries(map).forEach(([selector, text]) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  });
  document.querySelectorAll('[data-user-initials]').forEach((el) => {
    el.textContent = user.initials;
  });
}

function renderFavorites(list = favorites) {
  const grid = document.querySelector('#favoriteCards');
  if (!grid) return;

  grid.innerHTML = list
    .map(
      (coin) => `
    <article class="fav-card" data-symbol="${coin.symbol}" data-name="${coin.name.toLowerCase()}">
      <div class="fav-card-top">
        <div class="fav-asset">
          <span class="fav-icon ${coin.color}">${coin.icon}</span>
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
          <i data-lucide="trending-up"></i> ${coin.change}
        </span>
        <svg class="fav-sparkline ${coin.direction === 'down' ? 'down' : ''}" viewBox="0 0 94 30" preserveAspectRatio="none" aria-hidden="true">
          <path d="${coin.points}" />
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
    const filtered = favorites.filter(
      (c) => c.symbol.toLowerCase().includes(query) || c.name.toLowerCase().includes(query)
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
  document.querySelector('#menuToggle')?.addEventListener('click', () => {
    document.querySelector('#sidebar')?.classList.toggle('open');
  });
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => document.querySelector('#sidebar')?.classList.remove('open'));
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
  renderFavorites();
  bindSearch();
  bindUserMenu();
  bindSidebar();
  window.lucide?.createIcons();
}
